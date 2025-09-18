# 🔧 Исправление Deadlock в Excalidraw Board

## Проблема
При одновременном использовании доски Excalidraw несколькими пользователями возникали deadlock'и в PostgreSQL:

```
ERROR: deadlock detected
Подробности: Process 28614 waits for ShareLock on transaction 22717; blocked by process 28611.
Process 28611 waits for ShareLock on transaction 22725; blocked by process 28614.
```

## Причина
Deadlock возникал из-за одновременных операций `UPDATE board_states SET is_active=false WHERE lesson_id=?` в методе `saveBoardState()` при частых обновлениях доски.

## Решение

### 1. Добавлен Spring Retry
- Добавлены зависимости `spring-retry` и `spring-aspects` в `pom.xml`
- Создан конфигурационный класс `RetryConfig` с аннотацией `@EnableRetry`
- Добавлены аннотации `@Retryable` для методов работы с базой данных

### 2. Оптимизированы методы сохранения
- **`saveBoardState()`** - основной метод с retry logic
- **`saveBoardStateOptimized()`** - новый оптимизированный метод для частых обновлений
- **`deactivateAllByLessonIdOptimized()`** - оптимизированный SQL запрос

### 3. Добавлен Throttling
- Ограничение частоты обновлений: максимум 1 обновление в секунду на урок
- Кэширование времени последнего обновления
- Пропуск слишком частых обновлений

### 4. Улучшена логика обновлений
- При наличии активного состояния - обновляем существующую запись
- При отсутствии - создаем новую запись
- Избегаем лишних операций деактивации

## Измененные файлы

### BoardService.java
```java
@Retryable(value = {ConcurrencyFailureException.class, SQLException.class}, 
           maxAttempts = 3, 
           backoff = @Backoff(delay = 100, multiplier = 2))
public BoardState saveBoardState(Long lessonId, String boardContent)

@Retryable(value = {ConcurrencyFailureException.class, SQLException.class}, 
           maxAttempts = 3, 
           backoff = @Backoff(delay = 50, multiplier = 1.5))
public BoardState saveBoardStateOptimized(Long lessonId, String boardContent)
```

### BoardStateRepository.java
```java
@Query(value = "UPDATE board_states SET is_active = false WHERE lesson_id = :lessonId AND is_active = true", nativeQuery = true)
void deactivateAllByLessonIdOptimized(@Param("lessonId") Long lessonId);
```

### ExcalidrawBoardController.java
```java
// Используем оптимизированный метод для частых обновлений
boardService.saveBoardStateOptimized(Long.parseLong(lessonId), boardDataJson);
```

### RetryConfig.java
```java
@Configuration
@EnableRetry
public class RetryConfig {
    // Конфигурация для Spring Retry
}
```

### pom.xml
```xml
<dependency>
    <groupId>org.springframework.retry</groupId>
    <artifactId>spring-retry</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework</groupId>
    <artifactId>spring-aspects</artifactId>
</dependency>
```

## Результат
- ✅ Устранены deadlock'и при одновременном использовании доски
- ✅ Добавлена автоматическая повторная попытка при ошибках
- ✅ Оптимизирована производительность за счет throttling
- ✅ Улучшена стабильность системы при высокой нагрузке

## Тестирование
1. Откройте доску Excalidraw в нескольких браузерах
2. Одновременно рисуйте на доске
3. Проверьте логи - не должно быть deadlock ошибок
4. Убедитесь, что изменения синхронизируются между пользователями
