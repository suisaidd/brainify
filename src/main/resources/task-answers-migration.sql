-- Таблица для хранения правильных ответов и картинок заданий
-- Ответы и картинки не будут в HTML, а в БД

CREATE TABLE IF NOT EXISTS block_task_answers (
    id BIGSERIAL PRIMARY KEY,
    block_id BIGINT NOT NULL,
    block_type VARCHAR(20) NOT NULL, -- 'CHAPTER' или 'SECTION'
    correct_answer TEXT,
    task_image BYTEA, -- Сжатое изображение
    image_type VARCHAR(50), -- jpg, png, etc
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_block_answer UNIQUE (block_id, block_type)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_block_task_answers_block ON block_task_answers(block_id, block_type);

-- Комментарии
COMMENT ON TABLE block_task_answers IS 'Правильные ответы и картинки заданий (скрыты от учеников)';
COMMENT ON COLUMN block_task_answers.block_id IS 'ID блока (ChapterBlock или SectionBlock)';
COMMENT ON COLUMN block_task_answers.block_type IS 'Тип блока: CHAPTER или SECTION';
COMMENT ON COLUMN block_task_answers.correct_answer IS 'Правильный ответ (скрыт от ученика)';
COMMENT ON COLUMN block_task_answers.task_image IS 'Картинка задания в сжатом виде';

-- Проверка
SELECT COUNT(*) as total_task_answers FROM block_task_answers;

