-- Миграция для добавления полей автоматического завершения уроков
-- Добавляем поля для отслеживания входа преподавателя и автоматических штрафов

ALTER TABLE lessons 
ADD COLUMN teacher_joined_at TIMESTAMP NULL,
ADD COLUMN auto_penalty_applied BOOLEAN DEFAULT FALSE;

-- Создаем индекс для оптимизации поиска уроков для автоматического завершения
CREATE INDEX idx_lessons_auto_completion 
ON lessons(status, lesson_date, auto_penalty_applied) 
WHERE status = 'SCHEDULED' AND auto_penalty_applied = FALSE;

-- Комментарии к новым полям
COMMENT ON COLUMN lessons.teacher_joined_at IS 'Время входа преподавателя в урок';
COMMENT ON COLUMN lessons.auto_penalty_applied IS 'Применен ли автоматический штраф за неявку';
