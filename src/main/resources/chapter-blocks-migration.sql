-- Создание таблицы для блоков контента глав
-- Аналогично section_blocks, но для глав

CREATE TABLE IF NOT EXISTS chapter_blocks (
    id BIGSERIAL PRIMARY KEY,
    chapter_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'TEXT',
    title VARCHAR(500),
    text_content TEXT,
    image_url VARCHAR(1000),
    initial_sql TEXT,
    expected_result TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT fk_chapter_blocks_chapter FOREIGN KEY (chapter_id) REFERENCES course_chapters(id) ON DELETE CASCADE
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_chapter_blocks_chapter_id ON chapter_blocks(chapter_id);
CREATE INDEX IF NOT EXISTS idx_chapter_blocks_sort_order ON chapter_blocks(chapter_id, sort_order);

-- Комментарии
COMMENT ON TABLE chapter_blocks IS 'Блоки контента для глав курса';
COMMENT ON COLUMN chapter_blocks.type IS 'Тип блока: TEXT, IMAGE, SQL_TASK';
COMMENT ON COLUMN chapter_blocks.text_content IS 'HTML контент для TEXT блоков или описание задания';
COMMENT ON COLUMN chapter_blocks.expected_result IS 'Ожидаемый результат для проверки заданий';

-- Проверка
SELECT COUNT(*) as total_chapter_blocks FROM chapter_blocks;

