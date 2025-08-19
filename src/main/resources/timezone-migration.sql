-- Миграция для добавления колонки timezone в таблицу users
-- Выполняется в несколько этапов для безопасности

-- 1. Добавляем колонку как nullable
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(255);

-- 2. Обновляем существующие записи значением по умолчанию
UPDATE users SET timezone = 'Europe/Moscow' WHERE timezone IS NULL;

-- 3. Делаем колонку NOT NULL (опционально, можно оставить nullable)
-- ALTER TABLE users ALTER COLUMN timezone SET NOT NULL;
