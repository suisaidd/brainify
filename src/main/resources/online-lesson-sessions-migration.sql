-- Миграция для обновления таблицы online_lesson_sessions
-- Удаляем старые колонки и добавляем новые

-- Создаем временную таблицу с новой структурой
CREATE TABLE online_lesson_sessions_new (
    id BIGSERIAL PRIMARY KEY,
    lesson_id BIGINT NOT NULL,
    room_id VARCHAR(255) NOT NULL,
    room_key VARCHAR(255) NOT NULL,
    teacher_joined_at TIMESTAMP,
    student_joined_at TIMESTAMP,
    session_started_at TIMESTAMP NOT NULL,
    session_ended_at TIMESTAMP,
    status VARCHAR(50) NOT NULL,
    board_content TEXT,
    lesson_notes TEXT,
    FOREIGN KEY (lesson_id) REFERENCES lessons(id)
);

-- Копируем данные из старой таблицы (если есть)
INSERT INTO online_lesson_sessions_new (
    id, lesson_id, room_id, room_key, teacher_joined_at, student_joined_at,
    session_started_at, session_ended_at, status, board_content, lesson_notes
)
SELECT 
    id, lesson_id, 
    COALESCE(jitsi_room_name, 'migrated-room-' || id) as room_id,
    COALESCE(excalidraw_room_key, 'migrated-key-' || id) as room_key,
    teacher_joined_at, student_joined_at, session_started_at, session_ended_at,
    status, board_content, lesson_notes
FROM online_lesson_sessions;

-- Удаляем старую таблицу
DROP TABLE online_lesson_sessions;

-- Переименовываем новую таблицу
ALTER TABLE online_lesson_sessions_new RENAME TO online_lesson_sessions;

-- Создаем индексы
CREATE INDEX idx_online_lesson_sessions_lesson_id ON online_lesson_sessions(lesson_id);
CREATE INDEX idx_online_lesson_sessions_status ON online_lesson_sessions(status);
CREATE INDEX idx_online_lesson_sessions_room_id ON online_lesson_sessions(room_id);
CREATE INDEX idx_online_lesson_sessions_session_started_at ON online_lesson_sessions(session_started_at);
