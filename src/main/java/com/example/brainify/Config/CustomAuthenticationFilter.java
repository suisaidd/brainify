package com.example.brainify.Config;

import com.example.brainify.Model.User;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

public class CustomAuthenticationFilter extends OncePerRequestFilter {

    private final SessionManager sessionManager;

    public CustomAuthenticationFilter(SessionManager sessionManager) {
        this.sessionManager = sessionManager;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        try {
            // Получаем пользователя из сессии
            User user = sessionManager.getCurrentUser(request.getSession(false));

            if (user != null) {
                // Проверяем, есть ли уже аутентификация в контексте
                if (SecurityContextHolder.getContext().getAuthentication() == null || 
                    !SecurityContextHolder.getContext().getAuthentication().isAuthenticated() ||
                    !user.getEmail().equals(SecurityContextHolder.getContext().getAuthentication().getName())) {
                    
                    // Создаем аутентификацию для Spring Security
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            user.getEmail(),
                            null,
                            Collections.singletonList(new SimpleGrantedAuthority(user.getRole().name()))
                    );
                    authToken.setDetails(user);
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    
                    System.out.println("CustomAuthenticationFilter: Восстановлена аутентификация для пользователя " + user.getEmail());
                }
            } else {
                // Если пользователя нет в сессии, очищаем контекст безопасности
                if (SecurityContextHolder.getContext().getAuthentication() != null) {
                    SecurityContextHolder.clearContext();
                    System.out.println("CustomAuthenticationFilter: Контекст безопасности очищен");
                }
            }
        } catch (Exception e) {
            System.err.println("CustomAuthenticationFilter: Ошибка при обработке аутентификации: " + e.getMessage());
            // В случае ошибки очищаем контекст
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }
} 