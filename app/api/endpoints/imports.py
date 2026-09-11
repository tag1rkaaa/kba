import io

import pandas as pd
from fastapi import APIRouter, BackgroundTasks, File, HTTPException, UploadFile, status

router = APIRouter(prefix="/imports", tags=["Imports"])


def process_excel_background(file_content: bytes, filename: str) -> None:
    """Фоновая обработка табличных данных без блокировки основного потока API."""
    try:
        # Чтение таблицы напрямую из оперативной памяти
        df = pd.read_excel(io.BytesIO(file_content))
        df = df.where(
            pd.notnull(df), None
        )  # Очистка NaN значений для совместимости с SQL

        lower_name = filename.lower()

        if "район" in lower_name:
            records = df.to_dict(orient="records")
            print(f"[IMPORT] Районы успешно обработаны. Строк: {len(records)}")

        elif "отпуск" in lower_name:
            records = df.to_dict(orient="records")
            print(f"[IMPORT] График отпусков успешно обработан. Строк: {len(records)}")

        else:
            print(f"[IMPORT] Неизвестный формат файла: {filename}")

    except Exception as e:  # noqa: BLE001
        print(f"[ERROR] Ошибка фонового парсинга файла {filename}: {e}")


@router.post("/excel", status_code=status.HTTP_202_ACCEPTED)
async def upload_excel_file(
    background_tasks: BackgroundTasks, file: UploadFile = File(...)
):
    """
    Принимает файл .xlsx/.xls, валидирует расширение
    и отправляет задачу парсинга в BackgroundTasks.
    """
    # Добавили проверку: если имени нет, выдаем ошибку
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Файл не имеет имени"
        )

    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Некорректный формат файла. Разрешены только .xlsx и .xls",
        )

    file_bytes = await file.read()
    background_tasks.add_task(process_excel_background, file_bytes, file.filename)

    return {
        "status": "accepted",
        "filename": file.filename,
        "message": "Файл принят в обработку.",
    }
