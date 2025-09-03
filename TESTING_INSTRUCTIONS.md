# Инструкция по тестированию загрузки состояния доски

## Быстрое тестирование

### 1. Простой тест (без WebSocket)
Откройте `test-board-load-simple.html` в браузере:
1. Инициализируйте Canvas
2. Установите ID урока (например, 1)
3. Нажмите "Загрузить состояние доски"
4. Проверьте, что точки отобразились на canvas

### 2. Полный тест (с WebSocket)
Откройте `test-board-state-load.html` в браузере:
1. Установите ID урока
2. Нажмите "Тест загрузки состояния доски"
3. Проверьте результаты в консоли

### 3. Тест в консоли браузера
На странице онлайн-урока откройте консоль и выполните:
```javascript
// Принудительная загрузка состояния
forceLoadBoardState();

// Тестирование загрузки
testBoardStateLoad();

// Диагностика
debugWebSocket();
debugCanvas();
```

## Проверка в базе данных

```sql
-- Проверить операции для урока
SELECT * FROM board_operations 
WHERE lesson_id = 1 
ORDER BY sequence_number ASC;

-- Подсчитать операции
SELECT COUNT(*) FROM board_operations WHERE lesson_id = 1;

-- Проверить последние операции
SELECT * FROM board_operations 
WHERE lesson_id = 1 
ORDER BY sequence_number DESC 
LIMIT 10;
```

## Ожидаемые результаты

### Успешная загрузка
- В консоли: "Состояние доски загружено немедленно: X операций"
- На доске: отображаются все точки рисования
- Уведомление: "Загружено X операций рисования"

### Проблемы
- **Нет операций**: "Нет сохраненных операций для урока"
- **Ошибка API**: "Ошибка загрузки состояния доски"
- **Canvas не готов**: "Canvas не инициализирован"

## Отладка проблем

### 1. Точки не отображаются
```javascript
// Проверить данные урока
console.log('lessonData:', lessonData);

// Проверить canvas
console.log('canvas:', canvas);
console.log('ctx:', ctx);

// Принудительная загрузка
forceLoadBoardState();
```

### 2. WebSocket не подключается
```javascript
// Проверить статус WebSocket
debugWebSocket();

// Принудительное переподключение
reconnectWebSocket();
```

### 3. Ошибки в консоли
- Проверить сетевые запросы в DevTools
- Проверить ошибки JavaScript
- Проверить логи сервера

## Тестовые данные

Для создания тестовых данных используйте:
```javascript
// Создать тестовую операцию
fetch('/api/board/test-save-operation/1', {
    method: 'POST'
}).then(response => response.json())
  .then(data => console.log(data));
```
