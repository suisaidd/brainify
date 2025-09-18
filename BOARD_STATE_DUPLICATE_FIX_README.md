# Исправление ошибки дублирующихся состояний доски

## Проблема
Ошибка: `Query did not return a unique result: 3 results were returned`

Эта ошибка возникала в методе `loadBoardStateAsString` в `BoardService`, когда в базе данных было несколько активных записей (`is_active = true`) для одного урока в таблице `board_states`.

## Причина
1. **Race Condition**: При одновременном сохранении состояний доски несколькими пользователями
2. **Некорректная деактивация**: Метод `deactivateAllByLessonIdOptimized` не всегда корректно деактивировал предыдущие состояния
3. **Отсутствие LIMIT**: Запрос `findActiveByLessonId` не ограничивал количество результатов

## Исправления

### 1. Обновлен BoardStateRepository.java
- ✅ Добавлен `LIMIT 1` в запрос `findActiveByLessonId`
- ✅ Добавлен новый метод `cleanupDuplicateActiveStates` для очистки дублирующихся записей

### 2. Обновлен BoardService.java
- ✅ В методах `loadBoardState` и `loadBoardStateAsString` добавлена автоматическая очистка дублирующихся состояний
- ✅ Улучшена обработка ошибок

### 3. Обновлен ExcalidrawBoardController.java
- ✅ Улучшена обработка ошибок в WebSocket методе `handleStateRequest`
- ✅ Добавлена отправка пустого состояния и сообщений об ошибках

### 4. Создан SQL скрипт для очистки
- ✅ `fix-duplicate-board-states.sql` - скрипт для очистки существующих дублирующихся записей

## Инструкции по применению

### Шаг 1: Выполните SQL скрипт
```bash
# Подключитесь к вашей базе данных PostgreSQL и выполните:
psql -d your_database_name -f fix-duplicate-board-states.sql
```

### Шаг 2: Перезапустите приложение
```bash
cd /Users/suicaide/Documents/brainify/brainify
mvn clean compile
mvn spring-boot:run
```

### Шаг 3: Проверьте работу
1. Откройте доску Excalidraw для урока
2. Убедитесь, что состояние доски загружается без ошибок
3. Проверьте логи на отсутствие ошибок `NonUniqueResultException`

## Мониторинг

### Проверка состояния базы данных
```sql
-- Проверить дублирующиеся активные состояния
SELECT 
    lesson_id,
    COUNT(*) as active_states
FROM board_states 
WHERE is_active = true 
GROUP BY lesson_id 
HAVING COUNT(*) > 1;

-- Просмотр сводки по состояниям доски
SELECT * FROM board_states_summary;
```

### Логи приложения
Ищите в логах:
- ✅ `BoardState найден, размер контента: X`
- ❌ `NonUniqueResultException` (больше не должно появляться)

## Предотвращение в будущем

1. **Автоматическая очистка**: Теперь при каждом запросе состояния доски автоматически очищаются дублирующиеся записи
2. **LIMIT в запросах**: Все запросы для получения единственного результата теперь используют `LIMIT 1`
3. **Улучшенная обработка ошибок**: Контроллеры теперь корректно обрабатывают ошибки и отправляют соответствующие сообщения клиентам

## Тестирование

### Сценарии для проверки:
1. **Обычная загрузка**: Открытие доски с сохраненным состоянием
2. **Пустая доска**: Открытие доски без сохраненного состояния  
3. **Одновременное редактирование**: Несколько пользователей редактируют доску одновременно
4. **Восстановление после ошибки**: Повторное открытие доски после ошибки

### Ожидаемое поведение:
- ✅ Состояние доски загружается без ошибок
- ✅ При отсутствии состояния отправляется пустая доска `{}`
- ✅ При ошибках отправляется сообщение об ошибке
- ✅ В логах нет `NonUniqueResultException`

## Файлы изменены:
- `src/main/java/com/example/brainify/Repository/BoardStateRepository.java`
- `src/main/java/com/example/brainify/Service/BoardService.java`  
- `src/main/java/com/example/brainify/Controllers/ExcalidrawBoardController.java`
- `fix-duplicate-board-states.sql` (новый файл)

## Статус: ✅ ИСПРАВЛЕНО
Ошибка `Query did not return a unique result: 3 results were returned` должна быть полностью устранена.
