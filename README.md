# 📚 ЦУР Знание (KBA - Knowledge Base App)

**ЦУР Знание** — это современное корпоративное веб-приложение для создания, хранения и удобного поиска статей и регламентов. Проект предоставляет интуитивно понятный интерфейс для управления базой знаний с поддержкой ролевой модели, категоризации и продвинутого поиска.

## ✨ Ключевые возможности

- **Управление статьями:** Создание, редактирование, сохранение в черновики и публикация материалов.
- **Структуризация:** Организация контента по категориям (источникам) и тегам.
- **Поиск и навигация:** Умная строка поиска и удобная фильтрация по темам (например, «Топливо», «Здравоохранение»).
- **Персонализация:** Добавление статей в «Избранное» для быстрого доступа. Палитра цветов для разных категорий.
- **Ролевая модель (RBAC):** Разграничение прав доступа (Администратор, Модератор, Читатель/Viewer).
- **Импорт данных:** Массовая загрузка материалов через панель администратора.
- **UI/UX:** Адаптивный дизайн с поддержкой **светлой и тёмной темы**.

---

## 🛠 Стек технологий

Проект разделен на клиентскую (Frontend) и серверную (Backend) части.

### Backend

- **Язык:** Python 3.14+
- **Фреймворк:** FastAPI
- **База данных:** PostgreSQL
- **ORM:** SQLAlchemy (асинхронный движок `asyncpg`)
- **Миграции:** Alembic
- **Кэширование:** Redis

### Frontend

- **Библиотека:** React + TypeScript
- **Стилизация:** Tailwind CSS
- **Роутинг:** React Router DOM
- **Работа с API:** React Query (TanStack Query)
- **Сборщик:** Vite

### DevOps & Деплой

- **Контейнеризация:** Docker, Docker Compose
- **Веб-сервер:** Nginx (для статики фронтенда)

---

## 📂 Структура проекта

```text
kba/
├── app/                  # Исходный код Backend (FastAPI)
│   ├── api/              # Маршруты и эндпоинты
│   ├── core/             # Конфигурация (config, database)
│   ├── models/           # SQLAlchemy модели базы данных
│   └── workers/          # Фоновые задачи
├── frontend/             # Исходный код Frontend (React)
│   ├── src/              # Компоненты, API-клиенты, провайдеры
│   ├── Dockerfile        # Docker-образ для фронтенда
│   └── nginx.conf        # Конфигурация Nginx для раздачи SPA
├── migrations/           # Миграции базы данных (Alembic)
├── Dockerfile            # Docker-образ для бэкенда
└── docker-compose.yml    # Конфигурация для запуска всех сервисов
```

Проект состоит из двух основных частей: Frontend (React + TypeScript) и Backend (FastAPI + Python), а также использует фоновые задачи (Celery).

Требования (Prerequisites)
Убедитесь, что у вас установлены:

Python 3.10+

Node.js 18+ и npm/yarn

PostgreSQL (база данных)

Redis (брокер сообщений для Celery)

⚙️ 1. Настройка Backend (FastAPI)
Клонируйте репозиторий и перейдите в папку бэкенда:

Bash
git clone <url_вашего_репозитория>
cd kba
Создайте и активируйте виртуальное окружение:

Windows:

Bash
python -m venv .venv
.venv\Scripts\activate
Linux/macOS:

Bash
python3 -m venv .venv
source .venv/bin/activate
Установите зависимости:

Bash
pip install -r requirements.txt
Настройте переменные окружения:
Создайте файл .env в корне проекта (рядом с app/) и добавьте необходимые настройки. Пример:  

Фрагмент кода
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/kba_db
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-super-secret-key
Примените миграции базы данных (если используется Alembic):

Bash
alembic upgrade head
Запустите сервер:

Bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
API будет доступно по адресу: http://localhost:8000
Документация Swagger: http://localhost:8000/docs

🔄 2. Запуск фоновых задач (Celery)
Для обработки векторов статей (поиск, AI) используется Celery. Откройте новый терминал, активируйте виртуальное окружение (.venv) и запустите воркер:

Windows:

Bash
celery -A app.workers.tasks worker --loglevel=info --pool=solo
Linux/macOS:

Bash
celery -A app.workers.tasks worker --loglevel=info
🎨 3. Настройка Frontend (React)
Откройте новый терминал и перейдите в папку фронтенда:

Bash
cd frontend
Установите зависимости:

Bash
npm install
# или yarn install
Настройте переменные окружения:
Создайте файл .env в папке frontend и укажите путь к вашему локальному API:

Фрагмент кода
VITE_API_URL=http://localhost:8000/api/v1
Запустите сервер для разработки:

Bash
npm run dev
# или yarn dev
Приложение будет доступно по адресу, указанному в терминале (обычно http://localhost:5173).

🐳 Использование Docker (Опционально)
(Если у тебя настроен docker-compose.yml, оставь этот блок. Если нет — можешь удалить)

Для быстрого запуска всех сервисов (DB, Redis, Backend, Celery, Frontend) одной командой используйте Docker Compose:

Bash
docker-compose up --build -d
После успешной сборки приложение будет полностью готово к работе!