-- Миграция для добавления поля auto_completed в таблицу lessons
ALTER TABLE lessons ADD COLUMN auto_completed BOOLEAN DEFAULT FALSE;

-- Создаем индекс для оптимизации запросов по статусу и дате
CREATE INDEX idx_lessons_status_date ON lessons(status, lesson_date);

-- Комментарий к полю
COMMENT ON COLUMN lessons.auto_completed IS 'Флаг автоматического завершения урока';
