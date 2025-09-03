# Устранение проблем с онлайн доской - Brainify

## Ошибка: "The connection has not been established yet"

### Причина
WebSocket соединение еще не установлено, когда мы пытаемся отправить сообщение.

### Решение
1. **Проверьте состояние подключения**:
   ```javascript
   // В консоли браузера
   checkWebSocketConnection()
   ```

2. **Принудительное переподключение**:
   ```javascript
   // В консоли браузера
   forceReconnect()
   ```

3. **Проверьте логи WebSocket**:
   - Откройте `http://localhost:8082/test-websocket.html`
   - Нажмите "Подключиться"
   - Проверьте логи на ошибки

### Исправления в коде

#### 1. Проверка состояния подключения
```javascript
// Перед отправкой сообщения
if (!isConnected || !stompClient || !stompClient.connected) {
    console.log('WebSocket не подключен');
    return;
}
```

#### 2. Обработка ошибок
```javascript
try {
    stompClient.send("/app/board/" + lessonId + "/draw", {}, JSON.stringify(data));
} catch (error) {
    console.error('Ошибка отправки:', error);
    // Fallback на REST API
}
```

#### 3. Увеличение задержки подключения
```javascript
// Увеличиваем задержку для стабильности
setTimeout(() => {
    requestBoardState();
}, 500); // было 200
```

## Частые проблемы

### 1. Точки не отрисовываются после перезагрузки

**Симптомы**: После перезагрузки страницы доска пустая, хотя точки есть в БД.

**Решение**:
1. Проверьте REST API: `http://localhost:8082/api/board/state/1`
2. Используйте функцию восстановления: `restoreBoardState()`
3. Проверьте логи в консоли браузера

### 2. Синхронизация не работает в реальном времени

**Симптомы**: Рисование не синхронизируется между пользователями.

**Решение**:
1. Проверьте WebSocket подключение: `checkWebSocketConnection()`
2. Откройте тестовую страницу: `http://localhost:8082/test-websocket.html`
3. Проверьте, что оба пользователя подключены к одному уроку

### 3. Ошибки в консоли браузера

**Симптомы**: Красные ошибки в консоли браузера.

**Решение**:
1. Проверьте, что сервер запущен: `mvn spring-boot:run`
2. Проверьте порт: `http://localhost:8082`
3. Очистите кэш браузера
4. Проверьте WebSocket endpoint: `/ws`

## Тестирование

### 1. Страница отладки (рекомендуется)
```
http://localhost:8082/debug-board.html
```

### 2. Тест WebSocket
```
http://localhost:8082/test-websocket.html
```

### 3. Тест REST API
```
http://localhost:8082/test-board-api.html
```

### 4. Тест онлайн урока
```
http://localhost:8082/online-lesson?lessonId=1
```

## Отладочные функции

### Быстрые функции (всегда доступны)
В консоли браузера доступны функции:

```javascript
// Простая отладка WebSocket
debugWebSocket()

// Быстрое переподключение
reconnectWebSocket()

// Тест REST API
testBoardAPI()
```

### Полные функции (требуют загрузки страницы урока)
```javascript
// Проверка состояния WebSocket
checkWebSocketConnection()

// Принудительное переподключение
forceReconnect()

// Восстановление состояния доски
restoreBoardState()

// Загрузка состояния через REST API
loadBoardStateViaRestAPI()

// Принудительная синхронизация
forceBoardSync()

// Тест восстановления
testBoardRestore()
```

### Если функции не найдены
1. **Перезагрузите страницу** (Ctrl+F5 или Cmd+Shift+R)
2. **Очистите кэш браузера**
3. **Откройте страницу отладки**: `http://localhost:8082/debug-board.html`
4. **Проверьте консоль на ошибки JavaScript**

## Логирование

### Включение debug логов
```javascript
// В консоли браузера
stompClient.debug = function(str) {
    console.log('STOMP Debug:', str);
};
```

### Проверка логов сервера
```bash
# В терминале
tail -f brainify/logs/application.log
```

## Конфигурация

### WebSocket настройки
```java
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    
    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic");
        config.setApplicationDestinationPrefixes("/app");
    }
    
    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }
}
```

### Проверка CORS
```java
@Configuration
public class CorsConfig {
    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList("*"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
```

## Мониторинг

### Проверка состояния сервера
```bash
# Проверка процесса
ps aux | grep java

# Проверка порта
netstat -tulpn | grep 8082

# Проверка логов
tail -f brainify/logs/application.log
```

### Проверка базы данных
```sql
-- Проверка операций доски
SELECT * FROM board_operations WHERE lesson_id = 1 ORDER BY sequence_number;

-- Проверка состояний доски
SELECT * FROM board_states WHERE lesson_id = 1 AND is_active = true;
```

## Производительность

### Оптимизации
1. **Throttling**: 60 FPS для операций рисования
2. **Batch операции**: Группировка операций для снижения нагрузки
3. **Fallback механизм**: REST API при недоступности WebSocket
4. **Кэширование**: Локальное кэширование состояния

### Ограничения
- Максимум 1000 операций на урок
- Размер canvas: 10000x10000 пикселей
- Максимальный размер кисти: 20 пикселей

## Контакты

При возникновении проблем:
1. Проверьте логи сервера
2. Изучите консоль браузера
3. Протестируйте на тестовых страницах
4. Создайте issue с подробным описанием проблемы
