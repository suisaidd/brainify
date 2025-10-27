-- Добавление поля content для глав
-- Выполните этот скрипт для добавления возможности хранить контент в главах

-- Добавляем колонку content в таблицу course_chapters
ALTER TABLE course_chapters 
ADD COLUMN IF NOT EXISTS content TEXT;

-- Добавляем комментарий
COMMENT ON COLUMN course_chapters.content IS 'HTML контент главы (введение, описание)';

-- Проверка
SELECT COUNT(*) as chapters_with_content 
FROM course_chapters 
WHERE content IS NOT NULL AND content != '';

