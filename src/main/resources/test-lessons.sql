-- Тестовые уроки для проверки работы расписания
-- Предполагаем, что у нас есть пользователи с ID 1 (ученик) и 2 (преподаватель)

-- Уроки на текущую неделю
INSERT INTO lessons (student_id, teacher_id, subject_id, lesson_date, status, description) VALUES
-- Понедельник
(1, 2, 1, NOW() + INTERVAL '1 day' + INTERVAL '10 hours', 'SCHEDULED', 'Русский язык - подготовка к ЕГЭ'),
(1, 2, 2, NOW() + INTERVAL '1 day' + INTERVAL '14 hours', 'SCHEDULED', 'Математика - квадратные уравнения'),

-- Вторник
(1, 2, 4, NOW() + INTERVAL '2 days' + INTERVAL '9 hours', 'SCHEDULED', 'Физика - законы Ньютона'),
(1, 2, 5, NOW() + INTERVAL '2 days' + INTERVAL '16 hours', 'SCHEDULED', 'Химия - химические реакции'),

-- Среда
(1, 2, 1, NOW() + INTERVAL '3 days' + INTERVAL '11 hours', 'SCHEDULED', 'Русский язык - сочинение'),
(1, 2, 2, NOW() + INTERVAL '3 days' + INTERVAL '15 hours', 'SCHEDULED', 'Математика - логарифмы'),

-- Четверг
(1, 2, 4, NOW() + INTERVAL '4 days' + INTERVAL '10 hours', 'SCHEDULED', 'Физика - электричество'),
(1, 2, 5, NOW() + INTERVAL '4 days' + INTERVAL '17 hours', 'SCHEDULED', 'Химия - периодическая таблица'),

-- Пятница
(1, 2, 1, NOW() + INTERVAL '5 days' + INTERVAL '12 hours', 'SCHEDULED', 'Русский язык - грамматика'),
(1, 2, 2, NOW() + INTERVAL '5 days' + INTERVAL '16 hours', 'SCHEDULED', 'Математика - тригонометрия'),

-- Суббота
(1, 2, 4, NOW() + INTERVAL '6 days' + INTERVAL '9 hours', 'SCHEDULED', 'Физика - механика'),
(1, 2, 5, NOW() + INTERVAL '6 days' + INTERVAL '14 hours', 'SCHEDULED', 'Химия - органическая химия'),

-- Воскресенье
(1, 2, 1, NOW() + INTERVAL '7 days' + INTERVAL '11 hours', 'SCHEDULED', 'Русский язык - повторение'),
(1, 2, 2, NOW() + INTERVAL '7 days' + INTERVAL '15 hours', 'SCHEDULED', 'Математика - итоговое повторение');

-- Уроки на следующую неделю
INSERT INTO lessons (student_id, teacher_id, subject_id, lesson_date, status, description) VALUES
-- Понедельник следующей недели
(1, 2, 1, NOW() + INTERVAL '8 days' + INTERVAL '10 hours', 'SCHEDULED', 'Русский язык - новая тема'),
(1, 2, 2, NOW() + INTERVAL '8 days' + INTERVAL '14 hours', 'SCHEDULED', 'Математика - новая тема'),

-- Вторник следующей недели
(1, 2, 4, NOW() + INTERVAL '9 days' + INTERVAL '9 hours', 'SCHEDULED', 'Физика - новая тема'),
(1, 2, 5, NOW() + INTERVAL '9 days' + INTERVAL '16 hours', 'SCHEDULED', 'Химия - новая тема');

-- Завершенные уроки (прошлая неделя)
INSERT INTO lessons (student_id, teacher_id, subject_id, lesson_date, status, description) VALUES
(1, 2, 1, NOW() - INTERVAL '7 days' + INTERVAL '10 hours', 'COMPLETED', 'Русский язык - завершен'),
(1, 2, 2, NOW() - INTERVAL '7 days' + INTERVAL '14 hours', 'COMPLETED', 'Математика - завершен'),
(1, 2, 4, NOW() - INTERVAL '6 days' + INTERVAL '9 hours', 'COMPLETED', 'Физика - завершен'),
(1, 2, 5, NOW() - INTERVAL '6 days' + INTERVAL '16 hours', 'COMPLETED', 'Химия - завершен');

-- Отмененные уроки
INSERT INTO lessons (student_id, teacher_id, subject_id, lesson_date, status, description) VALUES
(1, 2, 1, NOW() - INTERVAL '3 days' + INTERVAL '10 hours', 'CANCELLED', 'Русский язык - отменен'),
(1, 2, 2, NOW() - INTERVAL '2 days' + INTERVAL '14 hours', 'CANCELLED', 'Математика - отменен'); 