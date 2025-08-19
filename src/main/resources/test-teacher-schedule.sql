-- Тестовые данные расписания преподавателя
-- Предполагаем, что у нас есть преподаватель с ID 2

-- Расписание на понедельник
INSERT INTO teacher_schedules (teacher_id, day_of_week, start_time, end_time, is_available) VALUES
(2, 'MONDAY', '09:00:00', '12:00:00', true),
(2, 'MONDAY', '14:00:00', '18:00:00', true);

-- Расписание на вторник
INSERT INTO teacher_schedules (teacher_id, day_of_week, start_time, end_time, is_available) VALUES
(2, 'TUESDAY', '10:00:00', '13:00:00', true),
(2, 'TUESDAY', '15:00:00', '19:00:00', true);

-- Расписание на среду
INSERT INTO teacher_schedules (teacher_id, day_of_week, start_time, end_time, is_available) VALUES
(2, 'WEDNESDAY', '09:00:00', '11:00:00', true),
(2, 'WEDNESDAY', '13:00:00', '17:00:00', true);

-- Расписание на четверг
INSERT INTO teacher_schedules (teacher_id, day_of_week, start_time, end_time, is_available) VALUES
(2, 'THURSDAY', '10:00:00', '14:00:00', true),
(2, 'THURSDAY', '16:00:00', '20:00:00', true);

-- Расписание на пятницу
INSERT INTO teacher_schedules (teacher_id, day_of_week, start_time, end_time, is_available) VALUES
(2, 'FRIDAY', '09:00:00', '12:00:00', true),
(2, 'FRIDAY', '14:00:00', '18:00:00', true);

-- Расписание на субботу
INSERT INTO teacher_schedules (teacher_id, day_of_week, start_time, end_time, is_available) VALUES
(2, 'SATURDAY', '10:00:00', '15:00:00', true);

-- Расписание на воскресенье (выходной)
INSERT INTO teacher_schedules (teacher_id, day_of_week, start_time, end_time, is_available) VALUES
(2, 'SUNDAY', '00:00:00', '23:59:59', false); 