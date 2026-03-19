from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, text
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/permissions", tags=["permissions"])


def require_admin(user: User):
    if not user.is_admin:
        raise HTTPException(403, "Solo administradores")


# ── Obtener permisos de un usuario ────────────────────────────
@router.get("/{user_id}")
async def get_user_permissions(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(current_user)

    ch_result = await db.execute(
        text("SELECT channel_id FROM channel_permissions WHERE user_id = :uid"),
        {"uid": user_id}
    )
    sub_result = await db.execute(
        text("SELECT subchannel_id FROM subchannel_permissions WHERE user_id = :uid"),
        {"uid": user_id}
    )
    return {
        "channel_ids": [r[0] for r in ch_result.fetchall()],
        "subchannel_ids": [r[0] for r in sub_result.fetchall()],
    }


# ── Dar acceso a canal ────────────────────────────────────────
@router.post("/{user_id}/channels/{channel_id}", status_code=201)
async def grant_channel(
    user_id: int,
    channel_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(current_user)
    await db.execute(
        text("INSERT IGNORE INTO channel_permissions (user_id, channel_id) VALUES (:uid, :cid)"),
        {"uid": user_id, "cid": channel_id}
    )
    await db.commit()
    return {"ok": True}


# ── Quitar acceso a canal ─────────────────────────────────────
@router.delete("/{user_id}/channels/{channel_id}", status_code=204)
async def revoke_channel(
    user_id: int,
    channel_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(current_user)
    await db.execute(
        text("DELETE FROM channel_permissions WHERE user_id = :uid AND channel_id = :cid"),
        {"uid": user_id, "cid": channel_id}
    )
    # Al quitar el canal, quitar también sus subcanales
    await db.execute(
        text("""DELETE FROM subchannel_permissions
                WHERE user_id = :uid
                AND subchannel_id IN (SELECT id FROM subchannels WHERE channel_id = :cid)"""),
        {"uid": user_id, "cid": channel_id}
    )
    await db.commit()


# ── Dar acceso a subcanal ─────────────────────────────────────
@router.post("/{user_id}/subchannels/{subchannel_id}", status_code=201)
async def grant_subchannel(
    user_id: int,
    subchannel_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(current_user)
    await db.execute(
        text("INSERT IGNORE INTO subchannel_permissions (user_id, subchannel_id) VALUES (:uid, :sid)"),
        {"uid": user_id, "sid": subchannel_id}
    )
    await db.commit()
    return {"ok": True}


# ── Quitar acceso a subcanal ──────────────────────────────────
@router.delete("/{user_id}/subchannels/{subchannel_id}", status_code=204)
async def revoke_subchannel(
    user_id: int,
    subchannel_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(current_user)
    await db.execute(
        text("DELETE FROM subchannel_permissions WHERE user_id = :uid AND subchannel_id = :sid"),
        {"uid": user_id, "sid": subchannel_id}
    )
    await db.commit()
