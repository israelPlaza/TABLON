from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


# ─── Auth ────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ─── Users ───────────────────────────────────────────────────

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    avatar_initials: str
    is_admin: bool

    class Config:
        from_attributes = True


# ─── Channels ────────────────────────────────────────────────

class SubchannelOut(BaseModel):
    id: int
    name: str
    icon: str
    order: int

    class Config:
        from_attributes = True

class ChannelOut(BaseModel):
    id: int
    name: str
    icon: str
    color: str
    order: int
    subchannels: list[SubchannelOut] = []

    class Config:
        from_attributes = True


# ─── Messages ────────────────────────────────────────────────

class MessageCreate(BaseModel):
    text: str

class ReactionOut(BaseModel):
    emoji: str
    count: int

class MessageOut(BaseModel):
    id: int
    text: str
    created_at: datetime
    edited_at: Optional[datetime]
    author: UserOut
    reactions: list[ReactionOut] = []

    class Config:
        from_attributes = True

class MessagePage(BaseModel):
    messages: list[MessageOut]
    total: int
    page: int
    page_size: int


# ─── WebSocket events ────────────────────────────────────────

class WsEvent(BaseModel):
    type: str          # new_message | reaction | delete
    subchannel_id: int
    payload: dict
