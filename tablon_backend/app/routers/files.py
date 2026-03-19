import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/files", tags=["files"])

# Carpeta donde se guardan los archivos subidos
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Tamaño máximo: 20MB
MAX_SIZE = 20 * 1024 * 1024


@router.post("")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Validar tamaño
    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(400, "El archivo supera el límite de 20MB")

    # Generar nombre único conservando la extensión original
    ext = Path(file.filename).suffix.lower()
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = UPLOAD_DIR / filename

    with open(filepath, "wb") as f:
        f.write(contents)

    return {
        "filename": filename,
        "original_name": file.filename,
        "size": len(contents),
        "content_type": file.content_type,
        "url": f"/api/files/{filename}",
    }


@router.get("/{filename}")
async def download_file(
    filename: str,
    current_user: User = Depends(get_current_user),
):
    # Evitar path traversal
    filepath = UPLOAD_DIR / Path(filename).name
    if not filepath.exists():
        raise HTTPException(404, "Archivo no encontrado")

    return FileResponse(
        path=filepath,
        filename=filename,
        media_type="application/octet-stream",
    )
