-- Создание таблицы test_sessions
CREATE TABLE IF NOT EXISTS test_sessions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT,
    subject_id BIGINT NOT NULL,
    exam_type VARCHAR(50) NOT NULL,
    test_type VARCHAR(50) NOT NULL,
    task_numbers TEXT,
    total_questions INTEGER NOT NULL,
    correct_answers INTEGER NOT NULL DEFAULT 0,
    score_percentage DECIMAL(5,2),
    time_spent_minutes INTEGER,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    completed_at TIMESTAMP WITHOUT TIME ZONE,
    CONSTRAINT fk_test_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_test_session_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
);

-- Создание таблицы test_answers
CREATE TABLE IF NOT EXISTS test_answers (
    id BIGSERIAL PRIMARY KEY,
    test_session_id BIGINT NOT NULL,
    task_id BIGINT NOT NULL,
    user_answer TEXT,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    points_earned INTEGER DEFAULT 0,
    time_spent_seconds INTEGER,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_test_answer_session FOREIGN KEY (test_session_id) REFERENCES test_sessions(id) ON DELETE CASCADE,
    CONSTRAINT fk_test_answer_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_test_sessions_user ON test_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_subject ON test_sessions (subject_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_completed ON test_sessions (is_completed);
CREATE INDEX IF NOT EXISTS idx_test_sessions_created ON test_sessions (created_at);
CREATE INDEX IF NOT EXISTS idx_test_answers_session ON test_answers (test_session_id);
CREATE INDEX IF NOT EXISTS idx_test_answers_task ON test_answers (task_id);
CREATE INDEX IF NOT EXISTS idx_test_answers_correct ON test_answers (is_correct);

-- Комментарии для таблиц и столбцов
COMMENT ON TABLE test_sessions IS 'Сессии тестирования пользователей';
COMMENT ON COLUMN test_sessions.user_id IS 'ID пользователя (может быть NULL для неавторизованных)';
COMMENT ON COLUMN test_sessions.subject_id IS 'ID предмета';
COMMENT ON COLUMN test_sessions.exam_type IS 'Тип экзамена (ОГЭ, ЕГЭ)';
COMMENT ON COLUMN test_sessions.test_type IS 'Тип теста (random, specific, marathon)';
COMMENT ON COLUMN test_sessions.task_numbers IS 'JSON строка с номерами заданий';
COMMENT ON COLUMN test_sessions.total_questions IS 'Общее количество вопросов';
COMMENT ON COLUMN test_sessions.correct_answers IS 'Количество правильных ответов';
COMMENT ON COLUMN test_sessions.score_percentage IS 'Процент правильных ответов';
COMMENT ON COLUMN test_sessions.time_spent_minutes IS 'Время прохождения в минутах';
COMMENT ON COLUMN test_sessions.is_completed IS 'Завершен ли тест';

COMMENT ON TABLE test_answers IS 'Ответы пользователей на задания тестов';
COMMENT ON COLUMN test_answers.test_session_id IS 'ID сессии теста';
COMMENT ON COLUMN test_answers.task_id IS 'ID задания';
COMMENT ON COLUMN test_answers.user_answer IS 'Ответ пользователя';
COMMENT ON COLUMN test_answers.is_correct IS 'Правильность ответа';
COMMENT ON COLUMN test_answers.points_earned IS 'Заработанные баллы';
COMMENT ON COLUMN test_answers.time_spent_seconds IS 'Время на ответ в секундах';

