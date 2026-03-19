from sqlalchemy import String, Integer, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Channel(Base):
    __tablename__ = "channels"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100))
    icon: Mapped[str] = mapped_column(String(10), default="📁")
    color: Mapped[str] = mapped_column(String(20), default="#3A86FF")
    order: Mapped[int] = mapped_column(Integer, default=0)

    subchannels: Mapped[list["Subchannel"]] = relationship(
    back_populates="channel",
    cascade="all, delete-orphan",
    passive_deletes=True,
    )


class Subchannel(Base):
    __tablename__ = "subchannels"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    channel_id: Mapped[int] = mapped_column(ForeignKey("channels.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(100))
    icon: Mapped[str] = mapped_column(String(10), default="💬")
    order: Mapped[int] = mapped_column(Integer, default=0)

    channel: Mapped["Channel"] = relationship(back_populates="subchannels")
    messages: Mapped[list["Message"]] = relationship(back_populates="subchannel")  # noqa: F821
