# Исправление проблемы с сохранением операций доски

## Описание проблемы

В логах наблюдались ошибки при сохранении зарисовок на доске. Основная проблема заключалась в неправильной обработке типов данных `lessonId` - он приходил как строка `"92"` вместо числа `92`, что вызывало ошибки при сохранении в базу данных.

## Внесенные исправления

### 1. Исправление BoardWebSocketController

**Проблема:** Все методы контроллера преобразовывали `lessonId` в строку, а затем обратно в `Long`, что могло вызывать ошибки.

**Решение:** Добавлена безопасная обработка типов данных:

```java
// Безопасное преобразование lessonId в Long
Long lessonIdLong = null;
if (lessonId != null) {
    if (lessonId instanceof Number) {
        lessonIdLong = ((Number) lessonId).longValue();
    } else {
        lessonIdLong = Long.valueOf(lessonId.toString());
    }
}
```

**Исправленные методы:**
- `handleBoardUpdate()` - обновление доски
- `handleDrawData()` - данные рисования
- `handleUserJoin()` - присоединение пользователя
- `handleUserLeave()` - выход пользователя
- `handleCursorPosition()` - позиция курсора
- `handleRequestState()` - запрос состояния
- `handleEndLesson()` - завершение урока
- `handleCompleteDrawing()` - завершенный рисунок

### 2. Улучшение BoardService

**Добавлена валидация входных данных:**
- Проверка на null для `lessonId`
- Проверка на пустые строки для `operationType` и `userName`
- Обработка случая, когда `nextSequence` возвращает null

**Исправлена отправка сообщений:**
- Все `lessonId` в сообщениях теперь отправляются как строки для совместимости с фронтендом

### 3. Улучшение модели BoardOperation

**Добавлена инициализация sequenceNumber:**
```java
// Устанавливаем sequenceNumber в 0, он будет обновлен в сервисе
this.sequenceNumber = 0L;
```

### 4. SQL скрипт для проверки базы данных

Создан файл `fix-board-operations.sql` для:
- Проверки существования таблиц
- Исправления типов данных
- Создания недостающих индексов
- Проверки внешних ключей

## Инструкции по применению исправлений

### 1. Выполните SQL скрипт

```bash
# Подключитесь к базе данных PostgreSQL
psql -U suicaide -d brainify -f src/main/resources/fix-board-operations.sql
```

### 2. Перезапустите приложение

```bash
# Остановите приложение
# Пересоберите проект
mvn clean compile

# Запустите приложение
mvn spring-boot:run
```

### 3. Проверьте логи

После запуска проверьте, что в логах больше нет ошибок типа:
```
Error saving draw operation: ...
```

## Структура таблиц

### board_operations
```sql
CREATE TABLE board_operations (
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
    sequence_number BIGINT NOT NULL DEFAULT 0,
    
    CONSTRAINT fk_board_operations_lesson 
        FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);
```

### board_states
```sql
CREATE TABLE board_states (
    id BIGSERIAL PRIMARY KEY,
    lesson_id BIGINT NOT NULL,
    board_content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE
);
```

## Мониторинг

Для мониторинга работы доски добавлены логи:
- Сохранение операций рисования
- Присоединение/выход пользователей
- Ошибки обработки данных

## Тестирование

После применения исправлений протестируйте:
1. Рисование на доске
2. Сохранение операций
3. Синхронизацию между пользователями
4. Загрузку состояния доски при подключении

## Дополнительные рекомендации

1. **Мониторинг производительности:** Следите за размером таблицы `board_operations` и при необходимости настройте очистку старых данных.

2. **Индексы:** Убедитесь, что все необходимые индексы созданы для оптимальной производительности.

3. **Валидация:** Всегда валидируйте входные данные перед сохранением в базу данных.

4. **Логирование:** Используйте структурированное логирование для лучшего отслеживания проблем.
