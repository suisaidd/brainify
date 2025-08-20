-- Тестовые данные для отмен уроков
-- Предполагаем, что у нас есть пользователи с ID 1 (ученик) и 2 (преподаватель)

-- Отмененные уроки (для тестирования системы штрафов)
INSERT INTO lesson_cancellations (lesson_id, cancelled_by, cancellation_reason, cancellation_date, hours_before_lesson, penalty_amount, penalty_reason, is_penalty_paid) VALUES
-- Первая отмена (бесплатная)
(1, 2, 'Болезнь преподавателя', NOW() - INTERVAL '5 days', 48, 0.0, NULL, false),

-- Вторая отмена (бесплатная)
(2, 2, 'Технические проблемы', NOW() - INTERVAL '4 days', 24, 0.0, NULL, false),

-- Третья отмена (бесплатная)
(3, 2, 'Семейные обстоятельства', NOW() - INTERVAL '3 days', 36, 0.0, NULL, false),

-- Четвертая отмена (бесплатная)
(4, 2, 'Внезапная командировка', NOW() - INTERVAL '2 days', 12, 0.0, NULL, false),

-- Пятая отмена (бесплатная)
(5, 2, 'Проблемы со здоровьем', NOW() - INTERVAL '1 day', 6, 0.0, NULL, false),

-- Шестая отмена (штраф 120р за превышение лимита)
(6, 2, 'Неожиданные обстоятельства', NOW() - INTERVAL '12 hours', 2, 120.0, 'Превышен лимит бесплатных отмен в месяц', false),

-- Седьмая отмена (штраф 300р за позднюю отмену)
(7, 2, 'Экстренная ситуация', NOW() - INTERVAL '6 hours', 1, 300.0, 'Отмена менее чем за 12 часов до урока', false);

-- Обновляем статусы уроков на CANCELLED
UPDATE lessons SET status = 'CANCELLED' WHERE id IN (1, 2, 3, 4, 5, 6, 7);
