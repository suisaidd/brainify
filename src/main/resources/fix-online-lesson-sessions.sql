-- Исправление таблицы online_lesson_sessions
-- Выполнить этот скрипт в базе данных

-- 1. Сначала добавляем колонки как nullable
ALTER TABLE online_lesson_sessions 
ADD COLUMN IF NOT EXISTS room_id VARCHAR(255);

ALTER TABLE online_lesson_sessions 
ADD COLUMN IF NOT EXISTS room_key VARCHAR(255);

-- 2. Заполняем существующие записи значениями по умолчанию
UPDATE online_lesson_sessions 
SET room_id = 'migrated-room-' || id::text
WHERE room_id IS NULL;

UPDATE online_lesson_sessions 
SET room_key = 'migrated-key-' || id::text
WHERE room_key IS NULL;

-- 3. Делаем колонки NOT NULL
ALTER TABLE online_lesson_sessions 
ALTER COLUMN room_id SET NOT NULL;

ALTER TABLE online_lesson_sessions 
ALTER COLUMN room_key SET NOT NULL;

-- 4. Удаляем старые колонки если они существуют
ALTER TABLE online_lesson_sessions 
DROP COLUMN IF EXISTS jitsi_room_name;

ALTER TABLE online_lesson_sessions 
DROP COLUMN IF EXISTS excalidraw_room_id;

ALTER TABLE online_lesson_sessions 
DROP COLUMN IF EXISTS excalidraw_room_key;

ALTER TABLE online_lesson_sessions 
DROP COLUMN IF EXISTS google_meet_link;

ALTER TABLE online_lesson_sessions 
DROP COLUMN IF EXISTS google_meet_code;

-- 5. Создаем индексы
CREATE INDEX IF NOT EXISTS idx_online_lesson_sessions_room_id ON online_lesson_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_online_lesson_sessions_status ON online_lesson_sessions(status);
CREATE INDEX IF NOT EXISTS idx_online_lesson_sessions_session_started_at ON online_lesson_sessions(session_started_at);
