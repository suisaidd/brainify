package com.example.brainify.Config;

import jakarta.servlet.http.HttpSessionEvent;
import jakarta.servlet.http.HttpSessionListener;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Component
public class SessionListener implements HttpSessionListener {
    
    @Autowired
    private SessionManager sessionManager;
    
    @Override
    public void sessionCreated(HttpSessionEvent se) {
        System.out.println("SessionListener: Создана новая сессия: " + se.getSession().getId());
    }
    
    @Override
    public void sessionDestroyed(HttpSessionEvent se) {
        String sessionId = se.getSession().getId();
        System.out.println("SessionListener: Сессия уничтожена: " + sessionId);
        
        // Очищаем данные сессии из SessionManager
        sessionManager.invalidateSession(se.getSession());
    }
}
