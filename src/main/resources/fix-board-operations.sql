-- Скрипт для исправления проблем с таблицей board_operations
-- Выполните этот скрипт в вашей базе данных PostgreSQL

-- 1. Проверяем существование таблицы
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'board_operations') THEN
        RAISE EXCEPTION 'Таблица board_operations не существует!';
    END IF;
END $$;

-- 2. Проверяем структуру таблицы
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'board_operations' 
ORDER BY ordinal_position;

-- 3. Исправляем типы данных если необходимо
-- Проверяем и исправляем sequence_number
DO $$
BEGIN
    -- Проверяем, есть ли записи с null sequence_number
    IF EXISTS (SELECT 1 FROM board_operations WHERE sequence_number IS NULL) THEN
        -- Обновляем записи с null sequence_number
        UPDATE board_operations 
        SET sequence_number = COALESCE(
            (SELECT MAX(sequence_number) FROM board_operations WHERE lesson_id = bo.lesson_id), 
            0
        ) + ROW_NUMBER() OVER (PARTITION BY lesson_id ORDER BY timestamp, id)
        FROM board_operations bo
        WHERE board_operations.id = bo.id AND board_operations.sequence_number IS NULL;
        
        RAISE NOTICE 'Обновлены записи с null sequence_number';
    END IF;
END $$;

-- 4. Создаем недостающие индексы
CREATE INDEX IF NOT EXISTS idx_board_operations_lesson_sequence 
ON board_operations(lesson_id, sequence_number);

CREATE INDEX IF NOT EXISTS idx_board_operations_timestamp 
ON board_operations(timestamp);

CREATE INDEX IF NOT EXISTS idx_board_operations_user_id 
ON board_operations(user_id);

-- 5. Проверяем внешние ключи
DO $$
BEGIN
    -- Проверяем, есть ли записи с несуществующими lesson_id
    IF EXISTS (
        SELECT 1 FROM board_operations bo 
        LEFT JOIN lessons l ON bo.lesson_id = l.id 
        WHERE l.id IS NULL
    ) THEN
        RAISE NOTICE 'Найдены записи с несуществующими lesson_id';
        
        -- Удаляем записи с несуществующими lesson_id
        DELETE FROM board_operations 
        WHERE lesson_id NOT IN (SELECT id FROM lessons);
        
        RAISE NOTICE 'Удалены записи с несуществующими lesson_id';
    END IF;
END $$;

-- 6. Проверяем целостность данных
SELECT 
    'Проверка целостности данных' as check_type,
    COUNT(*) as total_operations,
    COUNT(DISTINCT lesson_id) as unique_lessons,
    COUNT(CASE WHEN sequence_number IS NULL THEN 1 END) as null_sequence_numbers,
    COUNT(CASE WHEN operation_type IS NULL OR operation_type = '' THEN 1 END) as null_operation_types,
    COUNT(CASE WHEN timestamp IS NULL THEN 1 END) as null_timestamps
FROM board_operations;

-- 7. Проверяем последовательность sequence_number для каждого урока
SELECT 
    lesson_id,
    COUNT(*) as total_operations,
    MIN(sequence_number) as min_sequence,
    MAX(sequence_number) as max_sequence,
    COUNT(DISTINCT sequence_number) as unique_sequences
FROM board_operations 
GROUP BY lesson_id 
HAVING COUNT(*) != COUNT(DISTINCT sequence_number)
ORDER BY lesson_id;

-- 8. Исправляем дублирующиеся sequence_number если есть
DO $$
DECLARE
    lesson_record RECORD;
    new_sequence BIGINT;
BEGIN
    FOR lesson_record IN 
        SELECT DISTINCT lesson_id 
        FROM board_operations 
        WHERE lesson_id IN (
            SELECT lesson_id 
            FROM board_operations 
            GROUP BY lesson_id 
            HAVING COUNT(*) != COUNT(DISTINCT sequence_number)
        )
    LOOP
        -- Обновляем sequence_number для каждого урока
        new_sequence := 1;
        UPDATE board_operations 
        SET sequence_number = new_sequence
        FROM (
            SELECT id, ROW_NUMBER() OVER (ORDER BY timestamp, id) as rn
            FROM board_operations 
            WHERE lesson_id = lesson_record.lesson_id
        ) ranked
        WHERE board_operations.id = ranked.id
        AND board_operations.lesson_id = lesson_record.lesson_id;
        
        RAISE NOTICE 'Исправлены sequence_number для урока %', lesson_record.lesson_id;
    END LOOP;
END $$;

-- 9. Проверяем результат исправлений
SELECT 
    'После исправлений' as check_type,
    COUNT(*) as total_operations,
    COUNT(DISTINCT lesson_id) as unique_lessons,
    COUNT(CASE WHEN sequence_number IS NULL THEN 1 END) as null_sequence_numbers,
    COUNT(CASE WHEN operation_type IS NULL OR operation_type = '' THEN 1 END) as null_operation_types,
    COUNT(CASE WHEN timestamp IS NULL THEN 1 END) as null_timestamps
FROM board_operations;

-- 10. Создаем представление для мониторинга
CREATE OR REPLACE VIEW board_operations_summary AS
SELECT 
    lesson_id,
    COUNT(*) as total_operations,
    COUNT(CASE WHEN operation_type = 'start' THEN 1 END) as start_operations,
    COUNT(CASE WHEN operation_type = 'draw' THEN 1 END) as draw_operations,
    COUNT(CASE WHEN operation_type = 'end' THEN 1 END) as end_operations,
    COUNT(DISTINCT user_id) as unique_users,
    MIN(timestamp) as first_operation,
    MAX(timestamp) as last_operation,
    MIN(sequence_number) as min_sequence,
    MAX(sequence_number) as max_sequence
FROM board_operations 
GROUP BY lesson_id
ORDER BY lesson_id;

-- 11. Показываем итоговую статистику
SELECT * FROM board_operations_summary;

-- 12. Проверяем последние операции
SELECT 
    id,
    lesson_id,
    operation_type,
    x_coordinate,
    y_coordinate,
    user_name,
    sequence_number,
    timestamp
FROM board_operations 
ORDER BY timestamp DESC 
LIMIT 10;

RAISE NOTICE 'Проверка и исправление таблицы board_operations завершена!';
