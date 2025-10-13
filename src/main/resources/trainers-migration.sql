-- Миграция для создания таблиц тренажёров

-- Создание таблицы номеров заданий
CREATE TABLE IF NOT EXISTS task_numbers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    number INTEGER NOT NULL,
    subject_id BIGINT NOT NULL,
    exam_type VARCHAR(10) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    UNIQUE(subject_id, exam_type, number)
);

-- Создание таблицы подтем
CREATE TABLE IF NOT EXISTS subtopics (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    task_number_id BIGINT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_number_id) REFERENCES task_numbers(id),
    UNIQUE(task_number_id, name)
);

-- Создание таблицы заданий
CREATE TABLE IF NOT EXISTS tasks (
    id BIGSERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT,
    solution TEXT,
    image_data BYTEA,
    image_type VARCHAR(50),
    image_size BIGINT,
    subtopic_id BIGINT NOT NULL,
    difficulty_level INTEGER DEFAULT 1,
    points INTEGER DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (subtopic_id) REFERENCES subtopics(id)
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_task_numbers_subject_exam ON task_numbers(subject_id, exam_type);
CREATE INDEX IF NOT EXISTS idx_task_numbers_active ON task_numbers(is_active);
CREATE INDEX IF NOT EXISTS idx_subtopics_task_number ON subtopics(task_number_id);
CREATE INDEX IF NOT EXISTS idx_subtopics_active ON subtopics(is_active);
CREATE INDEX IF NOT EXISTS idx_subtopics_sort_order ON subtopics(sort_order);
CREATE INDEX IF NOT EXISTS idx_tasks_subtopic ON tasks(subtopic_id);
CREATE INDEX IF NOT EXISTS idx_tasks_active ON tasks(is_active);
CREATE INDEX IF NOT EXISTS idx_tasks_difficulty ON tasks(difficulty_level);

-- Добавление комментариев к таблицам
COMMENT ON TABLE task_numbers IS 'Номера заданий для предметов (1, 2, 3...)';
COMMENT ON TABLE subtopics IS 'Подтемы для номеров заданий';
COMMENT ON TABLE tasks IS 'Конкретные задания с текстом и изображениями';

-- Добавление комментариев к колонкам
COMMENT ON COLUMN task_numbers.exam_type IS 'Тип экзамена: OGE или EGE';
COMMENT ON COLUMN task_numbers.number IS 'Номер задания (1, 2, 3...)';
COMMENT ON COLUMN subtopics.sort_order IS 'Порядок сортировки подтем';
COMMENT ON COLUMN tasks.difficulty_level IS 'Уровень сложности от 1 до 5';
COMMENT ON COLUMN tasks.points IS 'Количество баллов за задание';
COMMENT ON COLUMN tasks.image_data IS 'Сжатое изображение задания';
COMMENT ON COLUMN tasks.image_type IS 'Тип изображения (jpg, png, etc.)';
COMMENT ON COLUMN tasks.image_size IS 'Размер изображения в байтах';
