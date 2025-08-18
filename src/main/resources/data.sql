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