-- Миграция для добавления полей Google Meet в таблицу online_lesson_sessions

-- Добавляем новые колонки для Google Meet
ALTER TABLE online_lesson_sessions 
ADD COLUMN google_meet_link VARCHAR(500) NULL COMMENT 'Ссылка на Google Meet встречу',
ADD COLUMN google_meet_code VARCHAR(50) NULL COMMENT 'Код Google Meet встречи';

-- Добавляем индекс для поиска по коду встречи
CREATE INDEX idx_google_meet_code ON online_lesson_sessions(google_meet_code);

-- Обновляем комментарий к таблице
ALTER TABLE online_lesson_sessions COMMENT = 'Сессии онлайн-уроков с Google Meet и Excalidraw';
