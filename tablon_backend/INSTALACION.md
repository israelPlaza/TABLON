# Guía de instalación — Tablón Backend

## 1. Preparar MySQL

Conectarse a MySQL y crear la base de datos y el usuario:

```sql
CREATE DATABASE tablon_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'tablon_user'@'localhost' IDENTIFIED BY 'TU_PASSWORD_AQUI';
GRANT ALL PRIVILEGES ON tablon_db.* TO 'tablon_user'@'localhost';
FLUSH PRIVILEGES;
```

---

## 2. Instalar Python y dependencias

```bash
# En Ubuntu/Debian
sudo apt update
sudo apt install python3.11 python3.11-venv python3-pip -y

# Copiar el proyecto al servidor
sudo cp -r tablon_backend /opt/tablon_backend
cd /opt/tablon_backend

# Crear entorno virtual e instalar dependencias
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install pydantic-settings  # necesario para config
```

---

## 3. Configurar variables de entorno

```bash
cp .env.example .env
nano .env
```

Editar los valores:
- `DB_PASSWORD` — la contraseña que pusiste en MySQL
- `SECRET_KEY` — generar una segura con: `openssl rand -hex 32`

---

## 4. Inicializar la base de datos y datos iniciales

```bash
source venv/bin/activate
python scripts/seed.py
```

Esto crea las tablas, los canales/subcanales y el usuario admin.
**Cambia la contraseña del admin** en `scripts/seed.py` antes de ejecutar.

---

## 5. Probar que funciona

```bash
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Abrir en el navegador: `http://IP_DEL_SERVIDOR:8000/docs`
Deberías ver la documentación interactiva de la API.

---

## 6. Configurar como servicio del sistema (producción)

```bash
# Copiar el archivo de servicio
sudo cp tablon.service /etc/systemd/system/

# Activar y arrancar
sudo systemctl daemon-reload
sudo systemctl enable tablon
sudo systemctl start tablon

# Verificar estado
sudo systemctl status tablon
```

---

## 7. Abrir el puerto en el firewall

```bash
sudo ufw allow 8000/tcp
sudo ufw reload
```

---

## Resumen de endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Login, devuelve JWT |
| GET | `/api/auth/me` | Usuario actual |
| GET | `/api/channels` | Lista canales y subcanales |
| GET | `/api/subchannels/{id}/messages` | Historial de mensajes |
| POST | `/api/subchannels/{id}/messages` | Enviar mensaje |
| DELETE | `/api/messages/{id}` | Borrar mensaje |
| POST | `/api/messages/{id}/reactions?emoji=👍` | Añadir/quitar reacción |
| WS | `/api/ws/{subchannel_id}?token=JWT` | WebSocket tiempo real |
| POST | `/api/users` | Crear usuario (solo admin) |
| GET | `/api/users` | Listar usuarios (solo admin) |

---

## Credenciales iniciales

- Email: `admin@empresa.com`
- Password: el que hayas puesto en `scripts/seed.py`

**Cambia la contraseña tras el primer login.**
