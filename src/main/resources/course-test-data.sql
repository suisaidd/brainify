-- Тестовые данные для курса
-- Этот файл можно выполнить для добавления тестового курса

-- Убедимся, что есть предмет "Информатика" (или создадим новый для теста)
INSERT INTO subjects (name, description, is_active, created_at) 
VALUES ('SQL для начинающих', 'Изучите основы SQL и работу с базами данных', true, NOW())
ON CONFLICT (name) DO NOTHING;

-- Получим ID предмета
-- Предполагаем, что ID будет присвоен автоматически

-- Модуль 1: Введение в SQL
INSERT INTO course_modules (subject_id, title, description, sort_order)
SELECT id, 'Введение в SQL', 'Познакомьтесь с основами SQL и реляционными базами данных', 0
FROM subjects WHERE name = 'SQL для начинающих' AND is_active = true
ON CONFLICT DO NOTHING;

-- Модуль 2: Основные запросы
INSERT INTO course_modules (subject_id, title, description, sort_order)
SELECT id, 'Основные запросы', 'Изучите операторы SELECT, WHERE, ORDER BY и другие базовые конструкции', 1
FROM subjects WHERE name = 'SQL для начинающих' AND is_active = true
ON CONFLICT DO NOTHING;

-- Модуль 3: Работа с несколькими таблицами
INSERT INTO course_modules (subject_id, title, description, sort_order)
SELECT id, 'Работа с несколькими таблицами', 'Освойте JOIN-ы и агрегатные функции', 2
FROM subjects WHERE name = 'SQL для начинающих' AND is_active = true
ON CONFLICT DO NOTHING;

-- Главы для Модуля 1
INSERT INTO course_chapters (module_id, title, sort_order)
SELECT id, 'Что такое SQL?', 0
FROM course_modules WHERE title = 'Введение в SQL'
ON CONFLICT DO NOTHING;

INSERT INTO course_chapters (module_id, title, sort_order)
SELECT id, 'Реляционные базы данных', 1
FROM course_modules WHERE title = 'Введение в SQL'
ON CONFLICT DO NOTHING;

-- Главы для Модуля 2
INSERT INTO course_chapters (module_id, title, sort_order)
SELECT id, 'Оператор SELECT', 0
FROM course_modules WHERE title = 'Основные запросы'
ON CONFLICT DO NOTHING;

INSERT INTO course_chapters (module_id, title, sort_order)
SELECT id, 'Фильтрация данных: WHERE', 1
FROM course_modules WHERE title = 'Основные запросы'
ON CONFLICT DO NOTHING;

INSERT INTO course_chapters (module_id, title, sort_order)
SELECT id, 'Сортировка: ORDER BY', 2
FROM course_modules WHERE title = 'Основные запросы'
ON CONFLICT DO NOTHING;

-- Главы для Модуля 3
INSERT INTO course_chapters (module_id, title, sort_order)
SELECT id, 'INNER JOIN', 0
FROM course_modules WHERE title = 'Работа с несколькими таблицами'
ON CONFLICT DO NOTHING;

INSERT INTO course_chapters (module_id, title, sort_order)
SELECT id, 'LEFT и RIGHT JOIN', 1
FROM course_modules WHERE title = 'Работа с несколькими таблицами'
ON CONFLICT DO NOTHING;

-- Разделы для "Что такое SQL?"
INSERT INTO course_sections (chapter_id, title, content, sort_order)
SELECT id, 'Введение в SQL', '<p>SQL (Structured Query Language) — это язык структурированных запросов для работы с реляционными базами данных.</p>', 0
FROM course_chapters WHERE title = 'Что такое SQL?'
ON CONFLICT DO NOTHING;

INSERT INTO course_sections (chapter_id, title, content, sort_order)
SELECT id, 'Где используется SQL', '<p>SQL используется везде: от веб-приложений до больших корпоративных систем. Это стандарт индустрии для работы с данными.</p>', 1
FROM course_chapters WHERE title = 'Что такое SQL?'
ON CONFLICT DO NOTHING;

-- Разделы для "Реляционные базы данных"
INSERT INTO course_sections (chapter_id, title, content, sort_order)
SELECT id, 'Что такое реляционная БД', '<p>Реляционная база данных хранит данные в виде таблиц, связанных между собой.</p>', 0
FROM course_chapters WHERE title = 'Реляционные базы данных'
ON CONFLICT DO NOTHING;

-- Разделы для "Оператор SELECT"
INSERT INTO course_sections (chapter_id, title, content, sort_order)
SELECT id, 'Базовый SELECT', '<p>Оператор SELECT используется для выборки данных из таблиц.</p><h4>Синтаксис:</h4><pre><code>SELECT column1, column2 FROM table_name;</code></pre>', 0
FROM course_chapters WHERE title = 'Оператор SELECT'
ON CONFLICT DO NOTHING;

INSERT INTO course_sections (chapter_id, title, content, sort_order)
SELECT id, 'SELECT все колонки', '<p>Для выбора всех колонок используйте символ *:</p><pre><code>SELECT * FROM users;</code></pre>', 1
FROM course_chapters WHERE title = 'Оператор SELECT'
ON CONFLICT DO NOTHING;

-- Разделы для "Фильтрация данных: WHERE"
INSERT INTO course_sections (chapter_id, title, content, sort_order)
SELECT id, 'Оператор WHERE', '<p>WHERE позволяет фильтровать строки по условию.</p><pre><code>SELECT * FROM users WHERE age > 18;</code></pre>', 0
FROM course_chapters WHERE title = 'Фильтрация данных: WHERE'
ON CONFLICT DO NOTHING;

-- Разделы для "Сортировка: ORDER BY"
INSERT INTO course_sections (chapter_id, title, content, sort_order)
SELECT id, 'Сортировка результатов', '<p>ORDER BY сортирует результаты запроса.</p><pre><code>SELECT * FROM users ORDER BY name ASC;</code></pre>', 0
FROM course_chapters WHERE title = 'Сортировка: ORDER BY'
ON CONFLICT DO NOTHING;

-- Разделы для "INNER JOIN"
INSERT INTO course_sections (chapter_id, title, content, sort_order)
SELECT id, 'Что такое JOIN', '<p>JOIN объединяет данные из нескольких таблиц.</p>', 0
FROM course_chapters WHERE title = 'INNER JOIN'
ON CONFLICT DO NOTHING;

INSERT INTO course_sections (chapter_id, title, content, sort_order)
SELECT id, 'INNER JOIN на практике', '<p>INNER JOIN возвращает только совпадающие строки.</p><pre><code>SELECT users.name, orders.total
FROM users
INNER JOIN orders ON users.id = orders.user_id;</code></pre>', 1
FROM course_chapters WHERE title = 'INNER JOIN'
ON CONFLICT DO NOTHING;

-- Разделы для "LEFT и RIGHT JOIN"
INSERT INTO course_sections (chapter_id, title, content, sort_order)
SELECT id, 'LEFT JOIN', '<p>LEFT JOIN возвращает все строки из левой таблицы и совпадающие из правой.</p>', 0
FROM course_chapters WHERE title = 'LEFT и RIGHT JOIN'
ON CONFLICT DO NOTHING;

COMMIT;

