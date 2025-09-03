-- Миграция для создания таблицы board_states (PostgreSQL)
CREATE TABLE IF NOT EXISTS board_states (
    id BIGSERIAL PRIMARY KEY,
    lesson_id BIGINT NOT NULL,
    board_content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE
);

-- Создание индексов
CREATE INDEX IF NOT EXISTS idx_board_states_lesson_id ON board_states(lesson_id);
CREATE INDEX IF NOT EXISTS idx_board_states_lesson_active ON board_states(lesson_id, is_active);
CREATE INDEX IF NOT EXISTS idx_board_states_updated_at ON board_states(updated_at);

-- Добавляем комментарии к таблице
COMMENT ON TABLE board_states IS 'Состояния досок для уроков';
