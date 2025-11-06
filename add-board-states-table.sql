-- Миграция для создания таблицы board_states
-- Выполните этот скрипт для создания таблицы состояний доски

-- Создаем таблицу состояний доски
CREATE TABLE IF NOT EXISTS board_states (
    id BIGSERIAL PRIMARY KEY,
    lesson_id BIGINT NOT NULL,
    board_data TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT DEFAULT 1,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

-- Создаем индекс для быстрого поиска по lesson_id
CREATE INDEX IF NOT EXISTS idx_board_states_lesson_id ON board_states(lesson_id);

-- Комментарии к таблице и полям
COMMENT ON TABLE board_states IS 'Хранит состояние доски для каждого урока';
COMMENT ON COLUMN board_states.lesson_id IS 'ID урока, к которому относится состояние доски';
COMMENT ON COLUMN board_states.board_data IS 'JSON данные состояния доски (элементы, настройки)';
COMMENT ON COLUMN board_states.version IS 'Версия состояния для оптимистичной блокировки';

