-- Тестовые данные для тренажёров

-- Добавляем номера заданий для математики ОГЭ
INSERT INTO task_numbers (name, number, subject_id, exam_type, is_active) VALUES
('Задание 1', 1, 1, 'OGE', true),
('Задание 2', 2, 1, 'OGE', true),
('Задание 3', 3, 1, 'OGE', true);

-- Добавляем номера заданий для математики ЕГЭ
INSERT INTO task_numbers (name, number, subject_id, exam_type, is_active) VALUES
('Задание 1', 1, 2, 'EGE', true),
('Задание 2', 2, 2, 'EGE', true);

-- Добавляем подтемы для задания 1 математики ОГЭ
INSERT INTO subtopics (name, description, task_number_id, is_active, sort_order) VALUES
('Линейные уравнения', 'Уравнения вида ax + b = 0', 1, true, 1),
('Квадратные уравнения', 'Уравнения вида ax² + bx + c = 0', 1, true, 2),
('Системы уравнений', 'Системы линейных и квадратных уравнений', 1, true, 3);

-- Добавляем подтемы для задания 2 математики ОГЭ
INSERT INTO subtopics (name, description, task_number_id, is_active, sort_order) VALUES
('Графики функций', 'Построение и анализ графиков', 2, true, 1),
('Свойства функций', 'Область определения, область значений', 2, true, 2);

-- Добавляем тестовые задания
INSERT INTO tasks (question, answer, solution, subtopic_id, difficulty_level, points, is_active) VALUES
('Решите уравнение: 2x + 5 = 13', 'x = 4', '2x + 5 = 13\n2x = 13 - 5\n2x = 8\nx = 4', 1, 1, 1, true),
('Решите уравнение: 3x - 7 = 2x + 1', 'x = 8', '3x - 7 = 2x + 1\n3x - 2x = 1 + 7\nx = 8', 1, 2, 1, true),
('Решите квадратное уравнение: x² - 5x + 6 = 0', 'x₁ = 2, x₂ = 3', 'x² - 5x + 6 = 0\nD = 25 - 24 = 1\nx₁ = (5 + 1)/2 = 3\nx₂ = (5 - 1)/2 = 2', 2, 2, 2, true),
('Постройте график функции y = 2x + 3', 'Прямая линия через точки (0,3) и (1,5)', 'y = 2x + 3 - линейная функция\nk = 2 > 0 - функция возрастает\nb = 3 - пересечение с осью OY в точке (0,3)', 3, 3, 2, true);


