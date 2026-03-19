"""
Script de inicialización: crea los canales, subcanales y el usuario admin.
Ejecutar una sola vez tras instalar:
    python scripts/seed.py
"""
import asyncio
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import AsyncSessionLocal, create_tables
from app.core.security import hash_password
from app.models.user import User
from app.models.channel import Channel, Subchannel
from sqlalchemy import select

CHANNELS_DATA = [
    {
        "name": "Contratación", "icon": "📋", "color": "#E85D04",
        "subs": [
            {"name": "Altas", "icon": "✅"},
            {"name": "Bajas", "icon": "🔴"},
            {"name": "Sustituciones", "icon": "🔄"},
            {"name": "Renovaciones", "icon": "🔁"},
        ]
    },
    {
        "name": "RRHH", "icon": "👥", "color": "#3A86FF",
        "subs": [
            {"name": "Vacaciones", "icon": "🏖️"},
            {"name": "Formación", "icon": "📚"},
            {"name": "Evaluaciones", "icon": "📊"},
        ]
    },
    {
        "name": "Operaciones", "icon": "⚙️", "color": "#8338EC",
        "subs": [
            {"name": "Incidencias", "icon": "⚠️"},
            {"name": "Mantenimiento", "icon": "🔧"},
            {"name": "Logística", "icon": "📦"},
        ]
    },
    {
        "name": "Comunicados", "icon": "📢", "color": "#06D6A0",
        "subs": [
            {"name": "General", "icon": "📣"},
            {"name": "Urgente", "icon": "🚨"},
            {"name": "Eventos", "icon": "🎉"},
        ]
    },
    {
        "name": "TI / Sistemas", "icon": "💻", "color": "#FB5607",
        "subs": [
            {"name": "Soporte", "icon": "🛠️"},
            {"name": "Accesos", "icon": "🔐"},
            {"name": "Proyectos", "icon": "🚀"},
        ]
    },
]

ADMIN_EMAIL = "admin@empresa.com"
ADMIN_PASSWORD = "Administrador"  # ← Cambia esto antes de ejecutar


async def seed():
    await create_tables()

    async with AsyncSessionLocal() as db:
        # Crear canales y subcanales
        for ch_order, ch_data in enumerate(CHANNELS_DATA):
            existing = await db.execute(select(Channel).where(Channel.name == ch_data["name"]))
            if existing.scalar_one_or_none():
                print(f"  Canal '{ch_data['name']}' ya existe, saltando.")
                continue

            channel = Channel(name=ch_data["name"], icon=ch_data["icon"], color=ch_data["color"], order=ch_order)
            db.add(channel)
            await db.flush()

            for sub_order, sub in enumerate(ch_data["subs"]):
                db.add(Subchannel(channel_id=channel.id, name=sub["name"], icon=sub["icon"], order=sub_order))

            print(f"  ✅ Canal '{ch_data['name']}' creado con {len(ch_data['subs'])} subcanales.")

        # Crear admin
        existing_admin = await db.execute(select(User).where(User.email == ADMIN_EMAIL))
        if not existing_admin.scalar_one_or_none():
            initials = "AD"
            admin = User(
                name="Administrador",
                email=ADMIN_EMAIL,
                hashed_password=hash_password(ADMIN_PASSWORD),
                avatar_initials=initials,
                is_admin=True,
            )
            db.add(admin)
            print(f"  ✅ Usuario admin creado: {ADMIN_EMAIL} / {ADMIN_PASSWORD}")
        else:
            print(f"  Usuario admin ya existe, saltando.")

        await db.commit()
    print("\n🎉 Seed completado.")


if __name__ == "__main__":
    asyncio.run(seed())
