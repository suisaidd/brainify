-- Скрипт для очистки дублирующихся состояний доски
-- Оставляет только самую новую запись для каждого урока

-- 1. Показываем статистику до очистки
SELECT 
    'До очистки' as status,
    COUNT(*) as total_records,
    COUNT(DISTINCT lesson_id) as unique_lessons,
    COUNT(*) - COUNT(DISTINCT lesson_id) as duplicate_records
FROM board_states;

-- 2. Показываем уроки с дубликатами
SELECT 
    lesson_id,
    COUNT(*) as count,
    MIN(updated_at) as oldest,
    MAX(updated_at) as newest
FROM board_states 
GROUP BY lesson_id 
HAVING COUNT(*) > 1
ORDER BY count DESC
LIMIT 20;

-- 3. Удаляем дубликаты, оставляя только самую новую запись для каждого урока
DELETE FROM board_states 
WHERE id NOT IN (
    SELECT DISTINCT ON (lesson_id) id
    FROM board_states
    ORDER BY lesson_id, updated_at DESC, version DESC, id DESC
);

-- 4. Показываем статистику после очистки
SELECT 
    'После очистки' as status,
    COUNT(*) as total_records,
    COUNT(DISTINCT lesson_id) as unique_lessons,
    COUNT(*) - COUNT(DISTINCT lesson_id) as duplicate_records
FROM board_states;

-- 5. Проверяем, что дубликатов больше нет
SELECT 
    lesson_id,
    COUNT(*) as count
FROM board_states 
GROUP BY lesson_id 
HAVING COUNT(*) > 1;

