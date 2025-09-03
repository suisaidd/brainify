-- Миграция для создания таблицы операций доски
-- Выполните этот скрипт в вашей базе данных PostgreSQL

-- Создание таблицы board_operations
CREATE TABLE IF NOT EXISTS board_operations (
    id BIGSERIAL PRIMARY KEY,
    lesson_id BIGINT NOT NULL,
    operation_type VARCHAR(50) NOT NULL,
    x_coordinate DOUBLE PRECISION,
    y_coordinate DOUBLE PRECISION,
    color VARCHAR(20),
    brush_size INTEGER,
    user_id BIGINT,
    user_name VARCHAR(255),
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sequence_number BIGINT NOT NULL,
    
    -- Индексы для оптимизации
    CONSTRAINT fk_board_operations_lesson 
        FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
    
    -- Индекс для быстрого поиска по уроку и порядку
    INDEX idx_board_operations_lesson_sequence (lesson_id, sequence_number)
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_board_operations_lesson_id ON board_operations(lesson_id);
CREATE INDEX IF NOT EXISTS idx_board_operations_timestamp ON board_operations(timestamp);
CREATE INDEX IF NOT EXISTS idx_board_operations_user_id ON board_operations(user_id);
CREATE INDEX IF NOT EXISTS idx_board_operations_sequence ON board_operations(sequence_number);

-- Комментарии к таблице и колонкам
COMMENT ON TABLE board_operations IS 'Операции рисования на интерактивной доске';
COMMENT ON COLUMN board_operations.id IS 'Уникальный идентификатор операции';
COMMENT ON COLUMN board_operations.lesson_id IS 'ID урока';
COMMENT ON COLUMN board_operations.operation_type IS 'Тип операции: start, draw, end, clear';
COMMENT ON COLUMN board_operations.x_coordinate IS 'X координата точки рисования';
COMMENT ON COLUMN board_operations.y_coordinate IS 'Y координата точки рисования';
COMMENT ON COLUMN board_operations.color IS 'Цвет рисования в HEX формате';
COMMENT ON COLUMN board_operations.brush_size IS 'Размер кисти';
COMMENT ON COLUMN board_operations.user_id IS 'ID пользователя, выполнившего операцию';
COMMENT ON COLUMN board_operations.user_name IS 'Имя пользователя';
COMMENT ON COLUMN board_operations.timestamp IS 'Время выполнения операции';
COMMENT ON COLUMN board_operations.sequence_number IS 'Порядковый номер операции в рамках урока';

-- Создание представления для статистики доски
CREATE OR REPLACE VIEW board_statistics AS
SELECT 
    lesson_id,
    COUNT(*) as total_operations,
    COUNT(CASE WHEN operation_type = 'draw' THEN 1 END) as draw_operations,
    COUNT(CASE WHEN operation_type = 'clear' THEN 1 END) as clear_operations,
    MAX(timestamp) as last_activity,
    MIN(timestamp) as first_activity
FROM board_operations 
GROUP BY lesson_id;

-- Функция для очистки старых операций (опционально)
CREATE OR REPLACE FUNCTION cleanup_old_board_operations(days_to_keep INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM board_operations 
    WHERE timestamp < CURRENT_TIMESTAMP - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Создание триггера для автоматической очистки при удалении урока
CREATE OR REPLACE FUNCTION cleanup_board_operations_on_lesson_delete()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM board_operations WHERE lesson_id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_board_operations
    BEFORE DELETE ON lessons
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_board_operations_on_lesson_delete();

-- Вставка тестовых данных (опционально)
-- INSERT INTO board_operations (lesson_id, operation_type, x_coordinate, y_coordinate, color, brush_size, user_id, user_name, sequence_number)
-- VALUES 
--     (1, 'start', 100.0, 100.0, '#000000', 3, 1, 'Тестовый пользователь', 1),
--     (1, 'draw', 110.0, 110.0, '#000000', 3, 1, 'Тестовый пользователь', 2),
--     (1, 'end', NULL, NULL, '#000000', 3, 1, 'Тестовый пользователь', 3);
