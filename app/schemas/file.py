from pydantic import BaseModel


class UploadUrlRequest(BaseModel):
    filename: str
    content_type: str


class UploadUrlResponse(BaseModel):
    upload_url: str
    object_name: str
    filename: str


class AttachmentOut(BaseModel):
    object_name: str
    filename: str
    download_url: str
