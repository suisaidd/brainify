-- Скрипт для исправления дублирующихся активных состояний доски
-- Выполните этот скрипт в вашей базе данных PostgreSQL

-- 1. Проверяем существование таблицы
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'board_states') THEN
        RAISE EXCEPTION 'Таблица board_states не существует!';
    END IF;
END $$;

-- 2. Показываем текущее состояние дублирующихся записей
SELECT 
    'Текущее состояние дублирующихся записей' as check_type,
    lesson_id,
    COUNT(*) as total_active_states,
    MIN(updated_at) as oldest_update,
    MAX(updated_at) as newest_update
FROM board_states 
WHERE is_active = true 
GROUP BY lesson_id 
HAVING COUNT(*) > 1
ORDER BY lesson_id;

-- 3. Исправляем дублирующиеся активные состояния
-- Оставляем только самое новое активное состояние для каждого урока
DO $$
DECLARE
    lesson_record RECORD;
    affected_rows INTEGER;
BEGIN
    FOR lesson_record IN 
        SELECT lesson_id 
        FROM board_states 
        WHERE is_active = true 
        GROUP BY lesson_id 
        HAVING COUNT(*) > 1
    LOOP
        -- Деактивируем все активные состояния кроме самого нового
        UPDATE board_states 
        SET is_active = false 
        WHERE lesson_id = lesson_record.lesson_id 
        AND is_active = true 
        AND id NOT IN (
            SELECT id FROM (
                SELECT id FROM board_states 
                WHERE lesson_id = lesson_record.lesson_id AND is_active = true 
                ORDER BY updated_at DESC 
                LIMIT 1
            ) latest
        );
        
        GET DIAGNOSTICS affected_rows = ROW_COUNT;
        RAISE NOTICE 'Исправлены дублирующиеся состояния для урока % (деактивировано % записей)', 
                     lesson_record.lesson_id, affected_rows;
    END LOOP;
END $$;

-- 4. Проверяем результат исправлений
SELECT 
    'После исправлений' as check_type,
    lesson_id,
    COUNT(*) as total_active_states,
    MIN(updated_at) as oldest_update,
    MAX(updated_at) as newest_update
FROM board_states 
WHERE is_active = true 
GROUP BY lesson_id 
HAVING COUNT(*) > 1
ORDER BY lesson_id;

-- 5. Показываем итоговую статистику
SELECT 
    'Итоговая статистика' as check_type,
    COUNT(*) as total_states,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_states,
    COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_states,
    COUNT(DISTINCT lesson_id) as unique_lessons,
    COUNT(DISTINCT CASE WHEN is_active = true THEN lesson_id END) as lessons_with_active_states
FROM board_states;

-- 6. Создаем представление для мониторинга состояний доски
CREATE OR REPLACE VIEW board_states_summary AS
SELECT 
    lesson_id,
    COUNT(*) as total_states,
    COUNT(CASE WHEN is_active = true THEN 1 END) as active_states,
    COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_states,
    MIN(created_at) as first_created,
    MAX(updated_at) as last_updated,
    MAX(CASE WHEN is_active = true THEN updated_at END) as active_state_updated
FROM board_states 
GROUP BY lesson_id
ORDER BY lesson_id;

-- 7. Показываем сводку по урокам
SELECT * FROM board_states_summary;

-- 8. Проверяем последние состояния доски
SELECT 
    id,
    lesson_id,
    is_active,
    created_at,
    updated_at,
    version,
    LENGTH(board_content) as content_length
FROM board_states 
ORDER BY updated_at DESC 
LIMIT 10;

RAISE NOTICE 'Исправление дублирующихся активных состояний доски завершено!';
