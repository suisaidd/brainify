-- Миграция для добавления новых полей в таблицы

-- Добавляем поле remaining_lessons в таблицу users
ALTER TABLE users ADD COLUMN remaining_lessons INT DEFAULT 0;

-- Добавляем поля для повторения занятий в таблицу lessons
ALTER TABLE lessons ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE;
ALTER TABLE lessons ADD COLUMN recurrence_weeks INT DEFAULT 0;
ALTER TABLE lessons ADD COLUMN original_lesson_id BIGINT;

-- Добавляем внешний ключ для original_lesson_id
ALTER TABLE lessons ADD CONSTRAINT fk_original_lesson 
    FOREIGN KEY (original_lesson_id) REFERENCES lessons(id) ON DELETE SET NULL;

-- Обновляем существующих студентов, устанавливая им начальный баланс занятий
-- Можно изменить значение по умолчанию в зависимости от потребностей
UPDATE users SET remaining_lessons = 10 WHERE role = 'STUDENT' AND remaining_lessons IS NULL; 