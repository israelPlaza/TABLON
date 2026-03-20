from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr

from app.core.database import get_db
from app.core.security import hash_password, get_current_user
from app.models.user import User
from app.schemas.schemas import UserCreate, UserOut

router = APIRouter(prefix="/api/users", tags=["users"])


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    is_admin: Optional[bool] = None

class PasswordChange(BaseModel):
    new_password: str

class RegisterData(BaseModel):
    name: str
    email: EmailStr
    password: str


def _initials(name: str) -> str:
    parts = name.strip().split()
    return "".join(p[0].upper() for p in parts[:2])

def require_admin(user: User):
    if not user.is_admin:
        raise HTTPException(403, "Solo los administradores pueden realizar esta acción")


# ── Registro público ──────────────────────────────────────────
@router.post("/register", response_model=UserOut, status_code=201)
async def register(data: RegisterData, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Ya existe un usuario con ese email")
    user = User(
        name=data.name,
        email=data.email,
        hashed_password=hash_password(data.password),
        avatar_initials=_initials(data.name),
        is_active=False,  # El admin debe activarlo
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


# ── Admin: listar ─────────────────────────────────────────────
@router.get("", response_model=list[UserOut])
async def list_users(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(current_user)
    result = await db.execute(select(User).order_by(User.name))
    return result.scalars().all()


# ── Admin: crear ──────────────────────────────────────────────
@router.post("", response_model=UserOut, status_code=201)
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(current_user)
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Ya existe un usuario con ese email")
    user = User(
        name=data.name,
        email=data.email,
        hashed_password=hash_password(data.password),
        avatar_initials=_initials(data.name),
        is_active=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


# ── Admin: editar ─────────────────────────────────────────────
@router.patch("/{user_id}", response_model=UserOut)
async def update_user(
    user_id: int,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(current_user)
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    if data.name is not None:
        user.name = data.name
        user.avatar_initials = _initials(data.name)
    if data.email is not None:
        # Comprobar que no existe otro con ese email
        dup = await db.execute(select(User).where(User.email == data.email, User.id != user_id))
        if dup.scalar_one_or_none():
            raise HTTPException(400, "Ese email ya está en uso")
        user.email = data.email
    if data.is_admin is not None:
        user.is_admin = data.is_admin
    await db.commit()
    await db.refresh(user)
    return user


# ── Admin: cambiar contraseña ─────────────────────────────────
@router.patch("/{user_id}/password")
async def change_password(
    user_id: int,
    data: PasswordChange,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(current_user)
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    if len(data.new_password) < 6:
        raise HTTPException(400, "La contraseña debe tener al menos 6 caracteres")
    user.hashed_password = hash_password(data.new_password)
    await db.commit()
    return {"ok": True}


# ── Admin: activar / desactivar ───────────────────────────────
@router.patch("/{user_id}/toggle-active", response_model=UserOut)
async def toggle_active(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(current_user)
    if user_id == current_user.id:
        raise HTTPException(400, "No puedes desactivarte a ti mismo")
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    user.is_active = not user.is_active
    await db.commit()
    await db.refresh(user)
    return user


# ── Admin: eliminar ───────────────────────────────────────────
@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_admin(current_user)
    if user_id == current_user.id:
        raise HTTPException(400, "No puedes eliminarte a ti mismo")
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(404, "Usuario no encontrado")
    await db.delete(user)
    await db.commit()

#_____Publico: listar en menciones _______________________________
@router.get("/mentionables", response_model=list[UserOut])
async def list_mentionables(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Todos los usuarios activos — para el desplegable de menciones."""
    result = await db.execute(
        select(User).where(User.is_active == True).order_by(User.name)
    )
    return result.scalars().all()
