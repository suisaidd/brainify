-- Инициализация предметов ЕГЭ и ОГЭ
INSERT INTO subjects (name, description, is_active, created_at) VALUES
-- Обязательные предметы ЕГЭ
('Русский язык', 'Грамматика, орфография, пунктуация, сочинение. Обязательный предмет ЕГЭ', true, NOW()),
('Математика (базовая)', 'Базовый уровень математики для ЕГЭ. Основы алгебры и геометрии', true, NOW()),
('Математика (профильная)', 'Профильный уровень математики для ЕГЭ. Углубленная алгебра, геометрия, начала анализа', true, NOW()),

-- Предметы по выбору ЕГЭ (естественно-научные)
('Физика', 'Механика, молекулярная физика, электродинамика, квантовая физика, астрономия', true, NOW()),
('Химия', 'Общая, неорганическая и органическая химия. Химические реакции и расчетные задачи', true, NOW()),
('Биология', 'Общая биология, ботаника, зоология, анатомия человека, экология, генетика', true, NOW()),

-- Предметы по выбору ЕГЭ (гуманитарные)
('История', 'История России с древнейших времен до наших дней. Всеобщая история', true, NOW()),
('Обществознание', 'Человек и общество, право, экономика, политология, социальные отношения', true, NOW()),
('Литература', 'Русская классическая и современная литература. Анализ произведений, сочинения', true, NOW()),
('География', 'Физическая и социально-экономическая география России и мира', true, NOW()),

-- Иностранные языки ЕГЭ
('Английский язык', 'Грамматика, лексика, аудирование, чтение, письмо, говорение', true, NOW()),
('Немецкий язык', 'Грамматика, лексика, аудирование, чтение, письмо, говорение', true, NOW()),
('Французский язык', 'Грамматика, лексика, аудирование, чтение, письмо, говорение', true, NOW()),
('Испанский язык', 'Грамматика, лексика, аудирование, чтение, письмо, говорение', true, NOW()),
('Китайский язык', 'Иероглифы, грамматика, аудирование, чтение, письмо, говорение', true, NOW()),

-- Информатика и ИКТ
('Информатика и ИКТ', 'Алгоритмизация, программирование, информационные технологии, компьютерные сети', true, NOW()),

-- Дополнительные предметы для подготовки к ОГЭ
('Математика (ОГЭ)', 'Подготовка к ОГЭ по математике. Алгебра и геометрия для 9 класса', true, NOW()),
('Русский язык (ОГЭ)', 'Подготовка к ОГЭ по русскому языку. Изложение, сочинение, тесты', true, NOW()),

-- Творческие экзамены (для специализированных вузов)
('Рисунок', 'Академический рисунок для поступления в художественные вузы', true, NOW()),
('Живопись', 'Академическая живопись для поступления в художественные вузы', true, NOW()),
('Композиция', 'Композиция в изобразительном искусстве', true, NOW());

-- Создаем таблицу уроков
CREATE TABLE IF NOT EXISTS lessons (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL,
    teacher_id BIGINT NOT NULL,
    subject_id BIGINT NOT NULL,
    lesson_date TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    description TEXT,
    homework TEXT,
    is_recurring BOOLEAN DEFAULT false,
    recurrence_weeks INTEGER DEFAULT 0,
    original_lesson_id BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    FOREIGN KEY (original_lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

-- Создаем таблицу расписания преподавателей
CREATE TABLE IF NOT EXISTS teacher_schedules (
    id BIGSERIAL PRIMARY KEY,
    teacher_id BIGINT NOT NULL,
    day_of_week VARCHAR(10) NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Создаем таблицу связей студент-преподаватель
CREATE TABLE IF NOT EXISTS student_teachers (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL,
    teacher_id BIGINT NOT NULL,
    subject_id BIGINT NOT NULL,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT true,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
    UNIQUE(student_id, subject_id, is_active)
);

-- Создаем индексы для оптимизации
CREATE INDEX IF NOT EXISTS idx_lessons_student_id ON lessons(student_id);
CREATE INDEX IF NOT EXISTS idx_lessons_teacher_id ON lessons(teacher_id);
CREATE INDEX IF NOT EXISTS idx_lessons_subject_id ON lessons(subject_id);
CREATE INDEX IF NOT EXISTS idx_lessons_date ON lessons(lesson_date);
CREATE INDEX IF NOT EXISTS idx_lessons_status ON lessons(status);

CREATE INDEX IF NOT EXISTS idx_teacher_schedules_teacher_id ON teacher_schedules(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_schedules_day ON teacher_schedules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_teacher_schedules_available ON teacher_schedules(is_available);

CREATE INDEX IF NOT EXISTS idx_student_teachers_student_id ON student_teachers(student_id);
CREATE INDEX IF NOT EXISTS idx_student_teachers_teacher_id ON student_teachers(teacher_id);
CREATE INDEX IF NOT EXISTS idx_student_teachers_subject_id ON student_teachers(subject_id);
CREATE INDEX IF NOT EXISTS idx_student_teachers_active ON student_teachers(is_active);

-- Создаем таблицу отмен уроков
CREATE TABLE IF NOT EXISTS lesson_cancellations (
    id BIGSERIAL PRIMARY KEY,
    lesson_id BIGINT NOT NULL,
    cancelled_by BIGINT NOT NULL,
    cancellation_reason VARCHAR(500),
    cancellation_date TIMESTAMP NOT NULL,
    hours_before_lesson INTEGER,
    penalty_amount DECIMAL(10,2),
    penalty_reason VARCHAR(200),
    is_penalty_paid BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
    FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Создаем индексы для таблицы отмен уроков
CREATE INDEX IF NOT EXISTS idx_lesson_cancellations_lesson_id ON lesson_cancellations(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_cancellations_cancelled_by ON lesson_cancellations(cancelled_by);
CREATE INDEX IF NOT EXISTS idx_lesson_cancellations_date ON lesson_cancellations(cancellation_date);
CREATE INDEX IF NOT EXISTS idx_lesson_cancellations_penalty_paid ON lesson_cancellations(is_penalty_paid);

-- Создаем таблицу переносов уроков
CREATE TABLE IF NOT EXISTS lesson_reschedules (
    id BIGSERIAL PRIMARY KEY,
    lesson_id BIGINT NOT NULL,
    rescheduled_by BIGINT NOT NULL,
    original_date TIMESTAMP NOT NULL,
    new_date TIMESTAMP NOT NULL,
    reschedule_reason VARCHAR(500),
    reschedule_date TIMESTAMP NOT NULL,
    hours_before_lesson INTEGER,
    penalty_amount DECIMAL(10,2),
    penalty_reason VARCHAR(200),
    is_penalty_paid BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
    FOREIGN KEY (rescheduled_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Создаем индексы для таблицы переносов уроков
CREATE INDEX IF NOT EXISTS idx_lesson_reschedules_lesson_id ON lesson_reschedules(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_reschedules_rescheduled_by ON lesson_reschedules(rescheduled_by);
CREATE INDEX IF NOT EXISTS idx_lesson_reschedules_date ON lesson_reschedules(reschedule_date);
CREATE INDEX IF NOT EXISTS idx_lesson_reschedules_penalty_paid ON lesson_reschedules(is_penalty_paid); 

-- Создаем таблицу конспектов
CREATE TABLE IF NOT EXISTS notes (
    id BIGSERIAL PRIMARY KEY,
    teacher_id BIGINT NOT NULL,
    subject_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    content_type VARCHAR(20) NOT NULL DEFAULT 'TEXT', -- TEXT, DRAWING, FILE, MIXED
    text_content TEXT,
    drawing_data TEXT, -- JSON с данными рисунка
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- Создаем таблицу файлов конспектов
CREATE TABLE IF NOT EXISTS note_files (
    id BIGSERIAL PRIMARY KEY,
    note_id BIGINT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    file_data BYTEA NOT NULL, -- Бинарные данные файла
    mime_type VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);

-- Создаем индексы для таблиц конспектов
CREATE INDEX IF NOT EXISTS idx_notes_teacher_id ON notes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_notes_subject_id ON notes(subject_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);
CREATE INDEX IF NOT EXISTS idx_notes_active ON notes(is_active);

CREATE INDEX IF NOT EXISTS idx_note_files_note_id ON note_files(note_id);
CREATE INDEX IF NOT EXISTS idx_note_files_file_type ON note_files(file_type);

-- Тестовые данные для демонстрации смет
-- Добавляем тестовых пользователей (преподавателей, учеников и администратора)
INSERT INTO users (name, email, phone, role, is_verified, is_active, created_at, timezone) VALUES
('Администратор', 'admin@brainify.com', '+79000000000', 'ADMIN', true, true, NOW(), 'Europe/Moscow'),
('Иванов Иван Иванович', 'ivanov@test.com', '+79001234567', 'TEACHER', true, true, NOW(), 'Europe/Moscow'),
('Петров Петр Петрович', 'petrov@test.com', '+79001234568', 'STUDENT', true, true, NOW(), 'Europe/Moscow'),
('Сидоров Сидор Сидорович', 'sidorov@test.com', '+79001234569', 'STUDENT', true, true, NOW(), 'Europe/Moscow'),
('Козлов Козел Козлович', 'kozlov@test.com', '+79001234570', 'STUDENT', true, true, NOW(), 'Europe/Moscow'),
('Волков Волк Волкович', 'volkov@test.com', '+79001234571', 'STUDENT', true, true, NOW(), 'Europe/Moscow');

-- Добавляем предметы
INSERT INTO subjects (name, description) VALUES
('Математика', 'Математика для ЕГЭ и ОГЭ'),
('Физика', 'Физика для ЕГЭ'),
('Химия', 'Химия для ОГЭ'),
('Биология', 'Биология для ЕГЭ');

-- Связываем преподавателя с предметами
INSERT INTO user_subjects (user_id, subject_id) VALUES
(2, 1), -- Иванов преподает математику
(2, 2), -- Иванов преподает физику
(2, 3), -- Иванов преподает химию
(2, 4); -- Иванов преподает биологию

-- Добавляем тестовые уроки для января 2025
INSERT INTO lessons (student_id, teacher_id, subject_id, lesson_date, status, description, homework, is_recurring, recurrence_weeks, original_lesson_id) VALUES
-- 1-16 января (прошлая смета)
(3, 2, 1, '2025-01-15 14:00:00', 'COMPLETED', 'Решение задач по алгебре', 'Решить задачи 1-10', false, 0, NULL),
(4, 2, 2, '2025-01-14 15:00:00', 'MISSED', 'Механика', 'Изучить законы Ньютона', false, 0, NULL),
(5, 2, 3, '2025-01-13 16:00:00', 'CANCELLED', 'Органическая химия', 'Подготовить доклад', false, 0, NULL),
(6, 2, 1, '2025-01-12 17:00:00', 'COMPLETED', 'Геометрия', 'Решить задачи по геометрии', false, 0, NULL),
(3, 2, 4, '2025-01-11 18:00:00', 'COMPLETED', 'Биология клетки', 'Изучить строение клетки', false, 0, NULL),
(4, 2, 1, '2025-01-10 14:00:00', 'COMPLETED', 'Тригонометрия', 'Решить уравнения', false, 0, NULL),
(5, 2, 2, '2025-01-09 15:00:00', 'COMPLETED', 'Электричество', 'Решить задачи по электричеству', false, 0, NULL),
(6, 2, 3, '2025-01-08 16:00:00', 'COMPLETED', 'Неорганическая химия', 'Изучить периодическую таблицу', false, 0, NULL),
(3, 2, 1, '2025-01-07 17:00:00', 'COMPLETED', 'Алгебра', 'Решить квадратные уравнения', false, 0, NULL),
(4, 2, 4, '2025-01-06 18:00:00', 'COMPLETED', 'Экология', 'Подготовить презентацию', false, 0, NULL),
(5, 2, 1, '2025-01-05 14:00:00', 'COMPLETED', 'Математический анализ', 'Изучить производные', false, 0, NULL),
(6, 2, 2, '2025-01-04 15:00:00', 'COMPLETED', 'Оптика', 'Решить задачи по оптике', false, 0, NULL),
(3, 2, 3, '2025-01-03 16:00:00', 'COMPLETED', 'Биохимия', 'Изучить белки', false, 0, NULL),
(4, 2, 1, '2025-01-02 17:00:00', 'COMPLETED', 'Вероятность', 'Решить задачи по теории вероятностей', false, 0, NULL),
(5, 2, 4, '2025-01-01 18:00:00', 'COMPLETED', 'Генетика', 'Изучить законы Менделя', false, 0, NULL),

-- 17-31 января (текущая смета)
(6, 2, 1, '2025-01-30 14:00:00', 'COMPLETED', 'Стереометрия', 'Решить задачи по стереометрии', false, 0, NULL),
(3, 2, 2, '2025-01-29 15:00:00', 'COMPLETED', 'Термодинамика', 'Изучить законы термодинамики', false, 0, NULL),
(4, 2, 3, '2025-01-28 16:00:00', 'MISSED', 'Аналитическая химия', 'Подготовить лабораторную работу', false, 0, NULL),
(5, 2, 1, '2025-01-27 17:00:00', 'COMPLETED', 'Комбинаторика', 'Решить задачи по комбинаторике', false, 0, NULL),
(6, 2, 4, '2025-01-26 18:00:00', 'CANCELLED', 'Эволюция', 'Изучить теорию эволюции', false, 0, NULL),
(3, 2, 1, '2025-01-25 14:00:00', 'COMPLETED', 'Логарифмы', 'Решить логарифмические уравнения', false, 0, NULL),
(4, 2, 2, '2025-01-24 15:00:00', 'COMPLETED', 'Квантовая физика', 'Изучить принципы квантовой физики', false, 0, NULL),
(5, 2, 3, '2025-01-23 16:00:00', 'COMPLETED', 'Электрохимия', 'Решить задачи по электрохимии', false, 0, NULL),
(6, 2, 1, '2025-01-22 17:00:00', 'COMPLETED', 'Интегралы', 'Изучить методы интегрирования', false, 0, NULL),
(3, 2, 4, '2025-01-21 18:00:00', 'COMPLETED', 'Анатомия', 'Изучить строение человека', false, 0, NULL),
(4, 2, 1, '2025-01-20 14:00:00', 'COMPLETED', 'Комплексные числа', 'Решить задачи с комплексными числами', false, 0, NULL),
(5, 2, 2, '2025-01-19 15:00:00', 'COMPLETED', 'Ядерная физика', 'Изучить радиоактивность', false, 0, NULL),
(6, 2, 3, '2025-01-18 16:00:00', 'COMPLETED', 'Полимеры', 'Изучить синтетические полимеры', false, 0, NULL),
(3, 2, 1, '2025-01-17 17:00:00', 'COMPLETED', 'Дифференциальные уравнения', 'Решить простые дифференциальные уравнения', false, 0, NULL);

-- Добавляем уроки для февраля 2025
INSERT INTO lessons (student_id, teacher_id, subject_id, lesson_date, status, description, homework, is_recurring, recurrence_weeks, original_lesson_id) VALUES
-- 1-16 февраля (прошлая смета)
(4, 2, 1, '2025-02-15 14:00:00', 'COMPLETED', 'Математическая индукция', 'Доказать формулы', false, 0, NULL),
(5, 2, 2, '2025-02-14 15:00:00', 'COMPLETED', 'Акустика', 'Изучить звуковые волны', false, 0, NULL),
(6, 2, 3, '2025-02-13 16:00:00', 'COMPLETED', 'Катализ', 'Изучить катализаторы', false, 0, NULL),
(3, 2, 1, '2025-02-12 17:00:00', 'COMPLETED', 'Теория чисел', 'Решить задачи по теории чисел', false, 0, NULL),
(4, 2, 4, '2025-02-11 18:00:00', 'COMPLETED', 'Физиология', 'Изучить системы органов', false, 0, NULL),

-- 17-28 февраля (текущая смета)
(5, 2, 1, '2025-02-28 14:00:00', 'COMPLETED', 'Теория графов', 'Решить задачи по графам', false, 0, NULL),
(6, 2, 2, '2025-02-27 15:00:00', 'COMPLETED', 'Релятивистская физика', 'Изучить теорию относительности', false, 0, NULL),
(3, 2, 3, '2025-02-26 16:00:00', 'COMPLETED', 'Химическая кинетика', 'Изучить скорость реакций', false, 0, NULL),
(4, 2, 1, '2025-02-25 17:00:00', 'COMPLETED', 'Теория вероятностей', 'Решить задачи по вероятности', false, 0, NULL),
(5, 2, 4, '2025-02-24 18:00:00', 'COMPLETED', 'Микробиология', 'Изучить микроорганизмы', false, 0, NULL);

 
