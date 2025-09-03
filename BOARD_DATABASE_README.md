# Система хранения операций доски в базе данных

## Обзор

Система теперь хранит все операции рисования на доске в базе данных PostgreSQL, что обеспечивает надежную синхронизацию и восстановление состояния доски при переподключении пользователей.

## Архитектура

### Модель данных

#### BoardOperation
- `id` - уникальный идентификатор операции
- `lesson_id` - ID урока
- `operation_type` - тип операции (start, draw, end, clear)
- `x_coordinate`, `y_coordinate` - координаты рисования
- `color` - цвет в HEX формате
- `brush_size` - размер кисти
- `user_id`, `user_name` - информация о пользователе
- `timestamp` - время выполнения операции
- `sequence_number` - порядковый номер операции

### Компоненты системы

1. **BoardOperation** - модель JPA для операций доски
2. **BoardOperationRepository** - репозиторий для работы с БД
3. **BoardService** - сервис для управления операциями
4. **OnlineLessonController** - обновленный контроллер с поддержкой БД

## Настройка

### 1. Выполнение миграции

Запустите SQL скрипт в вашей базе данных PostgreSQL:

```sql
-- Выполните содержимое файла board-operations-migration.sql
```

Или выполните команду:

```bash
psql -U suicaide -d brainify -f src/main/resources/board-operations-migration.sql
```

### 2. Проверка таблицы

```sql
-- Проверьте, что таблица создана
\d board_operations

-- Проверьте индексы
\di board_operations*
```

### 3. Тестовые данные (опционально)

```sql
-- Вставка тестовых операций
INSERT INTO board_operations (lesson_id, operation_type, x_coordinate, y_coordinate, color, brush_size, user_id, user_name, sequence_number)
VALUES 
    (1, 'start', 100.0, 100.0, '#000000', 3, 1, 'Тестовый пользователь', 1),
    (1, 'draw', 110.0, 110.0, '#000000', 3, 1, 'Тестовый пользователь', 2),
    (1, 'end', NULL, NULL, '#000000', 3, 1, 'Тестовый пользователь', 3);
```

## Использование

### Тестирование

1. **Запустите приложение:**
   ```bash
   cd brainify
   ./mvnw spring-boot:run
   ```

2. **Откройте тестовую страницу:**
   ```
   http://localhost:8082/test-simple-board
   ```

3. **Протестируйте синхронизацию:**
   - Откройте несколько вкладок
   - Введите одинаковый ID урока
   - Подключитесь и рисуйте
   - Проверьте синхронизацию в реальном времени

### Проверка данных в БД

```sql
-- Посмотреть все операции для урока
SELECT * FROM board_operations WHERE lesson_id = 1 ORDER BY sequence_number;

-- Статистика по урокам
SELECT * FROM board_statistics;

-- Последние операции
SELECT * FROM board_operations ORDER BY timestamp DESC LIMIT 10;
```

## Преимущества новой системы

### ✅ Надежность
- Все операции сохраняются в БД
- Восстановление состояния при переподключении
- Транзакционность операций

### ✅ Масштабируемость
- Поддержка множественных уроков
- Оптимизированные индексы
- Автоматическая очистка старых данных

### ✅ Мониторинг
- Статистика по операциям
- Отслеживание активности пользователей
- Аудит действий на доске

### ✅ Производительность
- Индексы для быстрого поиска
- Пакетная обработка операций
- Кэширование состояния

## API Endpoints

### WebSocket Endpoints

```java
// Сохранение операции рисования
@MessageMapping("/board/{lessonId}/draw")
@SendTo("/topic/board/{lessonId}")

// Запрос состояния доски
@MessageMapping("/board/{lessonId}/request-state")
@SendToUser("/topic/board/{lessonId}/state")

// Очистка доски
@MessageMapping("/board/{lessonId}/clear")
@SendTo("/topic/board/{lessonId}")
```

### REST API

```java
// Завершение урока с очисткой данных доски
@PostMapping("/api/lessons/{lessonId}/end")
```

## Управление данными

### Автоматическая очистка

Данные доски автоматически очищаются при:
- Завершении урока
- Удалении урока
- Истечении срока хранения (настраивается)

### Ручная очистка

```sql
-- Очистить данные для конкретного урока
DELETE FROM board_operations WHERE lesson_id = 1;

-- Очистить старые данные (старше 7 дней)
SELECT cleanup_old_board_operations(7);
```

## Мониторинг и отладка

### Логирование

Система логирует:
- Сохранение операций в БД
- Ошибки при сохранении
- Очистку данных
- Статистику операций

### Проверка состояния

```sql
-- Количество операций по урокам
SELECT lesson_id, COUNT(*) as operations_count 
FROM board_operations 
GROUP BY lesson_id;

-- Активность пользователей
SELECT user_name, COUNT(*) as operations_count 
FROM board_operations 
GROUP BY user_name 
ORDER BY operations_count DESC;
```

## Производительность

### Оптимизации

1. **Индексы:**
   - `lesson_id` - для быстрого поиска по уроку
   - `sequence_number` - для правильного порядка операций
   - `timestamp` - для временных запросов

2. **Ограничения:**
   - Уникальный индекс по `(lesson_id, sequence_number)`
   - Каскадное удаление при удалении урока

3. **Представления:**
   - `board_statistics` - для быстрого получения статистики

### Рекомендации

1. **Мониторинг размера таблицы:**
   ```sql
   SELECT pg_size_pretty(pg_total_relation_size('board_operations'));
   ```

2. **Регулярная очистка:**
   ```sql
   -- Настройте cron для автоматической очистки
   SELECT cleanup_old_board_operations(7);
   ```

3. **Анализ производительности:**
   ```sql
   EXPLAIN ANALYZE SELECT * FROM board_operations WHERE lesson_id = 1 ORDER BY sequence_number;
   ```

## Устранение неполадок

### Частые проблемы

1. **Ошибка "Урок не найден"**
   - Проверьте существование урока в таблице `lessons`
   - Убедитесь в правильности ID урока

2. **Медленная синхронизация**
   - Проверьте индексы в БД
   - Убедитесь в оптимальности запросов
   - Проверьте нагрузку на сервер

3. **Ошибки сохранения**
   - Проверьте права доступа к БД
   - Убедитесь в корректности данных
   - Проверьте логи приложения

### Отладка

```sql
-- Проверка последних операций
SELECT * FROM board_operations ORDER BY timestamp DESC LIMIT 20;

-- Проверка ошибок в последовательности
SELECT lesson_id, sequence_number, COUNT(*) 
FROM board_operations 
GROUP BY lesson_id, sequence_number 
HAVING COUNT(*) > 1;

-- Проверка целостности данных
SELECT lesson_id, MIN(sequence_number), MAX(sequence_number), COUNT(*) 
FROM board_operations 
GROUP BY lesson_id;
```

---

**Версия**: 2.0  
**Дата**: 2024  
**Автор**: Brainify Development Team
