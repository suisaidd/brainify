-- Миграция для добавления полей Excalidraw в таблицу lessons
-- Выполните этот скрипт для обновления существующей базы данных

-- Добавляем новые поля в таблицу lessons
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS excalidraw_room_id VARCHAR(255) UNIQUE,
ADD COLUMN IF NOT EXISTS excalidraw_secret_key VARCHAR(22);

-- Создаем индекс для быстрого поиска по room_id
CREATE INDEX IF NOT EXISTS idx_lessons_excalidraw_room_id ON lessons(excalidraw_room_id);

-- Комментарии к новым полям
COMMENT ON COLUMN lessons.excalidraw_room_id IS 'Уникальный ID комнаты Excalidraw для урока';
COMMENT ON COLUMN lessons.excalidraw_secret_key IS '22-значный секретный ключ для доступа к комнате Excalidraw';
