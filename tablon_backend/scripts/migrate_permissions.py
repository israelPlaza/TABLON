"""
Migración: añade tablas de permisos de canales y subcanales.
Ejecutar UNA SOLA VEZ:
    python scripts/migrate_permissions.py
"""
import asyncio, sys, os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.core.database import engine

SQL = [
    """
    CREATE TABLE IF NOT EXISTS channel_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        channel_id INT NOT NULL,
        UNIQUE KEY uq_ch_perm (user_id, channel_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,
    """
    CREATE TABLE IF NOT EXISTS subchannel_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        subchannel_id INT NOT NULL,
        UNIQUE KEY uq_sub_perm (user_id, subchannel_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (subchannel_id) REFERENCES subchannels(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    """,
]

async def migrate():
    async with engine.begin() as conn:
        for sql in SQL:
            await conn.exec_driver_sql(sql.strip())
    print("✅ Tablas de permisos creadas")

if __name__ == "__main__":
    asyncio.run(migrate())
