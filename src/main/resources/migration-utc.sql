-- ========================================
-- Миграция lesson_date из Europe/Moscow (UTC+3) в UTC
-- ========================================
-- ВАЖНО: выполнить ОДИН РАЗ перед деплоем версии с UTC.
-- После выполнения все lesson_date будут в UTC.
-- Сдвигаем на -3 часа (Москва = UTC+3).

-- 1. Основная таблица уроков
UPDATE lessons SET lesson_date = lesson_date - INTERVAL '3 hours';

-- 2. Также сдвигаем timestamps входа (если заполнены)
UPDATE lessons SET teacher_joined_at = teacher_joined_at - INTERVAL '3 hours'
  WHERE teacher_joined_at IS NOT NULL;

UPDATE lessons SET student_joined_at = student_joined_at - INTERVAL '3 hours'
  WHERE student_joined_at IS NOT NULL;

-- 3. Таблица переносов уроков (если есть)
UPDATE lesson_reschedules SET original_date = original_date - INTERVAL '3 hours'
  WHERE original_date IS NOT NULL;

UPDATE lesson_reschedules SET new_date = new_date - INTERVAL '3 hours'
  WHERE new_date IS NOT NULL;

-- Проверка: после выполнения проверьте несколько записей
-- SELECT id, lesson_date FROM lessons ORDER BY id DESC LIMIT 10;
