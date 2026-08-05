from fastapi import APIRouter, Depends, HTTPException

from app.core.deps import get_current_user
from app.models.models import User
from app.schemas.file import AttachmentOut, UploadUrlRequest, UploadUrlResponse
from app.services.storage_service import storage_service

router = APIRouter()


@router.post("/upload-url", response_model=UploadUrlResponse)
async def get_upload_url(
    payload: UploadUrlRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Возвращает presigned URL для загрузки файла.
    Клиент делает PUT запрос напрямую в MinIO по этому URL.
    """
    ALLOWED_TYPES = {
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "application/pdf",
        "text/plain",
        "text/markdown",
        "application/zip",
    }
    if payload.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400, detail=f"Тип файла не разрешён: {payload.content_type}"
        )

    return storage_service.get_upload_url(payload.filename, payload.content_type)


@router.get("/download-url/{object_name:path}", response_model=AttachmentOut)
async def get_download_url(
    object_name: str,
    current_user: User = Depends(get_current_user),
):
    """Возвращает временную ссылку для скачивания файла."""
    download_url = storage_service.get_download_url(object_name)
    return AttachmentOut(
        object_name=object_name,
        filename=object_name.split("/")[-1],
        download_url=download_url,
    )


@router.delete("/{object_name:path}", status_code=204)
async def delete_file(
    object_name: str,
    current_user: User = Depends(get_current_user),
):
    """Удаляет файл из MinIO."""
    storage_service.delete_file(object_name)
