package com.example.brainify.Config;

import com.example.brainify.Model.User;
import com.example.brainify.Model.UserRole;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class WebSocketAuthInterceptor implements ChannelInterceptor {

    @Autowired
    private SessionManager sessionManager;

    // Хранилище аутентифицированных пользователей по sessionId
    private final Map<String, User> authenticatedUsers = new ConcurrentHashMap<>();

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        
        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String sessionId = accessor.getSessionId();
            
            // Получаем пользователя из сессии по sessionId
            User user = getUserFromSession(sessionId);
            
            if (user != null) {
                authenticatedUsers.put(sessionId, user);
                // Сохраняем пользователя в атрибутах сообщения
                accessor.setUser(() -> user.getName());
                System.out.println("WebSocket: Пользователь " + user.getName() + " подключен (sessionId: " + sessionId + ")");
            } else {
                System.out.println("WebSocket: Не удалось найти пользователя для sessionId: " + sessionId);
                // Создаем временного пользователя для отладки
                User tempUser = createTemporaryUser(sessionId);
                authenticatedUsers.put(sessionId, tempUser);
                accessor.setUser(() -> tempUser.getName());
            }
        }
        
        return message;
    }

    /**
     * Получение пользователя из сессии по sessionId
     */
    private User getUserFromSession(String sessionId) {
        try {
            // Используем SessionManager для получения пользователя
            // TODO: Реализовать получение пользователя по sessionId через SessionManager
            return sessionManager.getUserBySessionId(sessionId);
        } catch (Exception e) {
            System.out.println("Ошибка получения пользователя из сессии: " + e.getMessage());
            return null;
        }
    }

    /**
     * Получение пользователя по sessionId
     */
    public User getUserBySessionId(String sessionId) {
        return authenticatedUsers.get(sessionId);
    }

    /**
     * Удаление пользователя при отключении
     */
    public void removeUser(String sessionId) {
        User user = authenticatedUsers.remove(sessionId);
        if (user != null) {
            System.out.println("WebSocket: Пользователь " + user.getName() + " отключен (sessionId: " + sessionId + ")");
        }
    }

    /**
     * Создание временного пользователя для отладки
     */
    private User createTemporaryUser(String sessionId) {
        User user = new User();
        
        // Создаем разных пользователей для разных сессий для тестирования
        int userNumber = Math.abs(sessionId.hashCode() % 3);
        
        switch (userNumber) {
            case 0:
                user.setId(1L);
                user.setName("Преподаватель " + sessionId.substring(0, 4));
                user.setRole(UserRole.TEACHER);
                break;
            case 1:
                user.setId(2L);
                user.setName("Ученик " + sessionId.substring(0, 4));
                user.setRole(UserRole.STUDENT);
                break;
            case 2:
                user.setId(3L);
                user.setName("Администратор " + sessionId.substring(0, 4));
                user.setRole(UserRole.ADMIN);
                break;
        }
        
        return user;
    }
}
