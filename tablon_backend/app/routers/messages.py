from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.ws_manager import manager
from app.core.config import settings
from jose import JWTError, jwt

from app.models.user import User
from app.models.message import Message, Reaction
from app.models.channel import Subchannel
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["messages"])


class MessageCreate(BaseModel):
    text: str = ""
    file_url: Optional[str] = None
    file_name: Optional[str] = None
    file_size: Optional[int] = None


async def _get_message_out(msg: Message, db: AsyncSession) -> dict:
    result = await db.execute(
        select(Reaction.emoji, func.count(Reaction.id).label("count"))
        .where(Reaction.message_id == msg.id)
        .group_by(Reaction.emoji)
    )
    reactions = [{"emoji": r.emoji, "count": r.count} for r in result.all()]
    return {
        "id": msg.id,
        "text": msg.text,
        "file_url": msg.file_url,
        "file_name": msg.file_name,
        "file_size": msg.file_size,
        "created_at": msg.created_at.isoformat(),
        "edited_at": msg.edited_at.isoformat() if msg.edited_at else None,
        "author": {
            "id": msg.author.id,
            "name": msg.author.name,
            "email": msg.author.email,
            "avatar_initials": msg.author.avatar_initials,
            "is_admin": msg.author.is_admin,
        },
        "reactions": reactions,
    }


async def _load_message(msg_id: int, db: AsyncSession) -> Message:
    result = await db.execute(
        select(Message)
        .options(selectinload(Message.author))
        .where(Message.id == msg_id, Message.is_deleted == False)
    )
    msg = result.scalar_one_or_none()
    if not msg:
        raise HTTPException(404, "Mensaje no encontrado")
    return msg


@router.get("/subchannels/{subchannel_id}/messages")
async def get_messages(
    subchannel_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sub = await db.get(Subchannel, subchannel_id)
    if not sub:
        raise HTTPException(404, "Subcanal no encontrado")

    total_result = await db.execute(
        select(func.count(Message.id))
        .where(Message.subchannel_id == subchannel_id, Message.is_deleted == False)
    )
    total = total_result.scalar()

    offset = (page - 1) * page_size
    result = await db.execute(
        select(Message)
        .options(selectinload(Message.author))
        .where(Message.subchannel_id == subchannel_id, Message.is_deleted == False)
        .order_by(Message.created_at.asc())
        .offset(offset)
        .limit(page_size)
    )
    messages = result.scalars().all()
    messages_out = [await _get_message_out(m, db) for m in messages]
    return {"messages": messages_out, "total": total, "page": page, "page_size": page_size}


@router.post("/subchannels/{subchannel_id}/messages")
async def post_message(
    subchannel_id: int,
    data: MessageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not data.text.strip() and not data.file_url:
        raise HTTPException(400, "El mensaje no puede estar vacío")

    sub = await db.get(Subchannel, subchannel_id)
    if not sub:
        raise HTTPException(404, "Subcanal no encontrado")

    msg = Message(
        subchannel_id=subchannel_id,
        author_id=current_user.id,
        text=data.text.strip(),
        file_url=data.file_url,
        file_name=data.file_name,
        file_size=data.file_size,
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    msg = await _load_message(msg.id, db)
    msg_out = await _get_message_out(msg, db)
    await manager.broadcast(subchannel_id, {"type": "new_message", "subchannel_id": subchannel_id, "payload": msg_out})
    return msg_out


@router.delete("/messages/{message_id}", status_code=204)
async def delete_message(
    message_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg = await _load_message(message_id, db)
    if msg.author_id != current_user.id and not current_user.is_admin:
        raise HTTPException(403, "Sin permiso para borrar este mensaje")
    msg.is_deleted = True
    await db.commit()
    await manager.broadcast(msg.subchannel_id, {"type": "delete", "subchannel_id": msg.subchannel_id, "payload": {"id": message_id}})


@router.post("/messages/{message_id}/reactions")
async def toggle_reaction(
    message_id: int,
    emoji: str = Query(..., max_length=10),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg = await _load_message(message_id, db)
    existing = await db.execute(
        select(Reaction).where(
            Reaction.message_id == message_id,
            Reaction.user_id == current_user.id,
            Reaction.emoji == emoji,
        )
    )
    reaction = existing.scalar_one_or_none()
    if reaction:
        await db.delete(reaction)
    else:
        db.add(Reaction(message_id=message_id, user_id=current_user.id, emoji=emoji))
    await db.commit()

    msg_out = await _get_message_out(msg, db)
    await manager.broadcast(msg.subchannel_id, {"type": "reaction", "subchannel_id": msg.subchannel_id, "payload": msg_out})
    return {"ok": True}

@router.websocket("/ws/global")
async def websocket_global(
    websocket: WebSocket,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """WebSocket que recibe eventos de TODOS los subcanales — para contadores de no leídos."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = int(payload.get("sub"))
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user or not user.is_active:
            await websocket.close(code=4001)
            return
    except (JWTError, Exception):
        await websocket.close(code=4001)
        return

    await manager.connect_global(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect_global(websocket)

@router.websocket("/ws/{subchannel_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    subchannel_id: int,
    token: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = int(payload.get("sub"))
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user or not user.is_active:
            await websocket.close(code=4001)
            return
    except (JWTError, Exception):
        await websocket.close(code=4001)
        return

    await manager.connect(websocket, subchannel_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, subchannel_id)



