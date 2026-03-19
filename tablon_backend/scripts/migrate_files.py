"""
Script de migración: añade los campos de archivo a la tabla messages.
Ejecutar UNA SOLA VEZ después de actualizar el backend:
    python scripts/migrate_files.py
"""
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import engine

SQL = """
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS file_url VARCHAR(500) NULL,
  ADD COLUMN IF NOT EXISTS file_name VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS file_size INT NULL;
"""

async def migrate():
    async with engine.begin() as conn:
        await conn.exec_driver_sql(SQL)
    print("✅ Migración completada: campos de archivo añadidos a messages")

if __name__ == "__main__":
    asyncio.run(migrate())
