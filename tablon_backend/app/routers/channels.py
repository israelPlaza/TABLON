from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.channel import Channel, Subchannel
from app.schemas.schemas import ChannelOut

router = APIRouter(prefix="/api/channels", tags=["channels"])


class ChannelCreate(BaseModel):
    name: str
    icon: str = "📁"
    color: str = "#3A86FF"

class ChannelUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None
    color: Optional[str] = None

class SubchannelCreate(BaseModel):
    name: str
    icon: str = "💬"

class SubchannelUpdate(BaseModel):
    name: Optional[str] = None
    icon: Optional[str] = None


def require_admin(user: User):
    if not user.is_admin:
        raise HTTPException(403, "Solo los administradores pueden realizar esta acción")


async def get_channel_with_subs(db: AsyncSession, channel_id: int) -> Channel:
    result = await db.execute(
        select(Channel).options(selectinload(Channel.subchannels)).where(Channel.id == channel_id)
    )
    channel = result.scalar_one_or_none()
    if not channel:
        raise HTTPException(404, "Canal no encontrado")
    return channel


@router.get("", response_model=list[ChannelOut])
async def list_channels(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Channel).options(selectinload(Channel.subchannels)).order_by(Channel.order)
    )
    all_channels = result.scalars().all()

    # Los admins ven todo
    if current_user.is_admin:
        return all_channels

    # Obtener permisos del usuario
    ch_result = await db.execute(
        text("SELECT channel_id FROM channel_permissions WHERE user_id = :uid"),
        {"uid": current_user.id}
    )
    sub_result = await db.execute(
        text("SELECT subchannel_id FROM subchannel_permissions WHERE user_id = :uid"),
        {"uid": current_user.id}
    )
    allowed_channels = {r[0] for r in ch_result.fetchall()}
    allowed_subs = {r[0] for r in sub_result.fetchall()}

    # Filtrar canales y subcanales
    filtered = []
    for ch in all_channels:
        if ch.id in allowed_channels:
            # Tiene acceso al canal — filtrar subcanales
            visible_subs = [s for s in ch.subchannels if s.id in allowed_subs]
            if visible_subs:
                ch.subchannels = visible_subs
                filtered.append(ch)
    return filtered


@router.post("", response_model=ChannelOut, status_code=201)
async def create_channel(
    data: ChannelCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(current_user)
    result = await db.execute(select(Channel).order_by(Channel.order.desc()).limit(1))
    last = result.scalar_one_or_none()
    order = (last.order + 1) if last else 0
    channel = Channel(name=data.name, icon=data.icon, color=data.color, order=order)
    db.add(channel)
    await db.commit()
    return await get_channel_with_subs(db, channel.id)


@router.patch("/{channel_id}", response_model=ChannelOut)
async def update_channel(
    channel_id: int,
    data: ChannelUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(current_user)
    channel = await get_channel_with_subs(db, channel_id)
    if data.name is not None: channel.name = data.name
    if data.icon is not None: channel.icon = data.icon
    if data.color is not None: channel.color = data.color
    await db.commit()
    return await get_channel_with_subs(db, channel_id)


@router.delete("/{channel_id}", status_code=204)
async def delete_channel(
    channel_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(current_user)
    result = await db.execute(select(Channel).where(Channel.id == channel_id))
    if not result.scalar_one_or_none():
        raise HTTPException(404, "Canal no encontrado")
    await db.execute(text("DELETE FROM channels WHERE id = :id"), {"id": channel_id})
    await db.commit()


@router.post("/{channel_id}/subchannels", response_model=ChannelOut, status_code=201)
async def create_subchannel(
    channel_id: int,
    data: SubchannelCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(current_user)
    await get_channel_with_subs(db, channel_id)
    result = await db.execute(
        select(Subchannel).where(Subchannel.channel_id == channel_id).order_by(Subchannel.order.desc()).limit(1)
    )
    last = result.scalar_one_or_none()
    order = (last.order + 1) if last else 0
    sub = Subchannel(channel_id=channel_id, name=data.name, icon=data.icon, order=order)
    db.add(sub)
    await db.commit()
    return await get_channel_with_subs(db, channel_id)


@router.patch("/{channel_id}/subchannels/{sub_id}", response_model=ChannelOut)
async def update_subchannel(
    channel_id: int,
    sub_id: int,
    data: SubchannelUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(current_user)
    sub = await db.get(Subchannel, sub_id)
    if not sub or sub.channel_id != channel_id:
        raise HTTPException(404, "Subcanal no encontrado")
    if data.name is not None: sub.name = data.name
    if data.icon is not None: sub.icon = data.icon
    await db.commit()
    return await get_channel_with_subs(db, channel_id)


@router.delete("/{channel_id}/subchannels/{sub_id}", status_code=204)
async def delete_subchannel(
    channel_id: int,
    sub_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(current_user)
    result = await db.execute(
        select(Subchannel).where(Subchannel.id == sub_id, Subchannel.channel_id == channel_id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(404, "Subcanal no encontrado")
    await db.execute(text("DELETE FROM subchannels WHERE id = :id"), {"id": sub_id})
    await db.commit()
