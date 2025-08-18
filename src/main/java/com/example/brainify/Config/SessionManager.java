package com.example.brainify.Config;

import com.example.brainify.Model.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;
import java.util.Map;

@Component
public class SessionManager {
    
    // Хранилище активных сессий
    private final Map<String, User> activeSessions = new ConcurrentHashMap<>();
    
    // Константы
    private static final String USER_ATTRIBUTE = "user";
    private static final String SESSION_VALID_ATTRIBUTE = "session_valid";
    
    /**
     * Создать новую сессию для пользователя
     */
    public void createSession(HttpSession session, User user) {
        // Очищаем старые данные сессии если есть
        String sessionId = session.getId();
        activeSessions.remove(sessionId);
        
        // Создаем новую сессию
        session.setAttribute(USER_ATTRIBUTE, user);
        session.setAttribute(SESSION_VALID_ATTRIBUTE, true);
        session.setMaxInactiveInterval(86400); // 24 часа
        
        // Добавляем в активные сессии
        activeSessions.put(sessionId, user);
        
        System.out.println("SessionManager: Создана сессия для пользователя " + user.getName() + " (ID: " + sessionId + ")");
    }
    
    /**
     * Получить пользователя из сессии
     */
    public User getCurrentUser(HttpSession session) {
        if (session == null) {
            return null;
        }
        
        // Проверяем флаг валидности сессии
        Boolean isValid = (Boolean) session.getAttribute(SESSION_VALID_ATTRIBUTE);
        if (isValid == null || !isValid) {
            return null;
        }
        
        // Проверяем наличие в активных сессиях
        User user = activeSessions.get(session.getId());
        if (user == null) {
            // Если нет в активных сессиях, но есть в атрибутах - очищаем
            session.removeAttribute(USER_ATTRIBUTE);
            session.setAttribute(SESSION_VALID_ATTRIBUTE, false);
            return null;
        }
        
        return user;
    }
    
    /**
     * Проверить, авторизован ли пользователь
     */
    public boolean isAuthenticated(HttpSession session) {
        return getCurrentUser(session) != null;
    }
    
    /**
     * Инвалидировать сессию
     */
    public void invalidateSession(HttpSession session) {
        if (session == null) {
            return;
        }
        
        String sessionId = session.getId();
        User user = activeSessions.get(sessionId);
        
        try {
            // Удаляем из активных сессий
            activeSessions.remove(sessionId);
            
            // Очищаем атрибуты
            session.removeAttribute(USER_ATTRIBUTE);
            session.setAttribute(SESSION_VALID_ATTRIBUTE, false);
            
            System.out.println("SessionManager: Сессия инвалидирована" + 
                (user != null ? " для пользователя " + user.getName() : "") + 
                " (ID: " + sessionId + ")");
                
        } catch (Exception e) {
            System.err.println("SessionManager: Ошибка при инвалидации сессии: " + e.getMessage());
            // Даже если инвалидация не удалась, удаляем из активных сессий
            activeSessions.remove(sessionId);
        }
    }
    
    /**
     * Получить количество активных сессий
     */
    public int getActiveSessionsCount() {
        return activeSessions.size();
    }
    
    /**
     * Очистить все сессии (для администрирования)
     */
    public void clearAllSessions() {
        activeSessions.clear();
        System.out.println("SessionManager: Все сессии очищены");
    }
    
    /**
     * Получить пользователя из запроса
     */
    public User getCurrentUser(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        return getCurrentUser(session);
    }
    
    /**
     * Проверить авторизацию из запроса
     */
    public boolean isAuthenticated(HttpServletRequest request) {
        return getCurrentUser(request) != null;
    }
} 