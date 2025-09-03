-- Тестовый скрипт для проверки операций доски
-- Выполните этот скрипт для диагностики проблем

-- 1. Проверяем структуру таблиц
SELECT '=== СТРУКТУРА ТАБЛИЦ ===' as info;

\d board_operations;
\d board_states;

-- 2. Проверяем количество записей
SELECT '=== КОЛИЧЕСТВО ЗАПИСЕЙ ===' as info;

SELECT 
    'board_operations' as table_name,
    COUNT(*) as record_count
FROM board_operations
UNION ALL
SELECT 
    'board_states' as table_name,
    COUNT(*) as record_count
FROM board_states;

-- 3. Проверяем уроки, которые используются в логах
SELECT '=== УРОКИ ИЗ ЛОГОВ ===' as info;

SELECT 
    id,
    description,
    lesson_date,
    status,
    student_id,
    teacher_id
FROM lessons 
WHERE id IN (92, 103)
ORDER BY id;

-- 4. Проверяем пользователей
SELECT '=== ПОЛЬЗОВАТЕЛИ ===' as info;

SELECT 
    id,
    name,
    email,
    role
FROM users 
WHERE id IN (1, 2, 3)
ORDER BY id;

-- 5. Пробуем вставить тестовую операцию
SELECT '=== ТЕСТОВАЯ ВСТАВКА ===' as info;

-- Проверяем, есть ли урок с ID 92
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM lessons WHERE id = 92) 
        THEN 'Урок 92 существует'
        ELSE 'Урок 92 НЕ существует'
    END as lesson_check;

-- Пробуем вставить тестовую операцию
INSERT INTO board_operations (
    lesson_id, 
    operation_type, 
    x_coordinate, 
    y_coordinate, 
    color, 
    brush_size, 
    user_id, 
    user_name, 
    sequence_number
) VALUES (
    92, 
    'test', 
    100.0, 
    100.0, 
    '#000000', 
    3, 
    1, 
    'Test User', 
    1
) ON CONFLICT (lesson_id, sequence_number) DO NOTHING;

-- Проверяем результат вставки
SELECT 
    'Тестовая операция' as operation,
    COUNT(*) as inserted_count
FROM board_operations 
WHERE lesson_id = 92 AND operation_type = 'test';

-- 6. Проверяем последовательности
SELECT '=== ПОСЛЕДОВАТЕЛЬНОСТИ ===' as info;

SELECT 
    lesson_id,
    COUNT(*) as total_operations,
    COALESCE(MAX(sequence_number), 0) as max_sequence,
    COALESCE(MAX(sequence_number), 0) + 1 as next_sequence
FROM board_operations 
GROUP BY lesson_id
ORDER BY lesson_id;

-- 7. Проверяем индексы
SELECT '=== ИНДЕКСЫ ===' as info;

SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('board_operations', 'board_states')
ORDER BY tablename, indexname;

-- 8. Проверяем ограничения
SELECT '=== ОГРАНИЧЕНИЯ ===' as info;

SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name IN ('board_operations', 'board_states')
ORDER BY tc.table_name, tc.constraint_type;

-- 9. Очищаем тестовые данные
SELECT '=== ОЧИСТКА ТЕСТОВЫХ ДАННЫХ ===' as info;

DELETE FROM board_operations WHERE operation_type = 'test';

SELECT 
    'Тестовые данные удалены' as cleanup_result,
    COUNT(*) as remaining_test_records
FROM board_operations 
WHERE operation_type = 'test';

