package com.example.brainify.Config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Добавляет заголовок Permissions-Policy для разрешения камеры, микрофона
 * и демонстрации экрана. Решает проблему с Яндекс Браузером на Windows,
 * который не показывает запрос разрешений без этого заголовка.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class PermissionsPolicyFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        response.setHeader("Permissions-Policy", "camera=*, microphone=*, display-capture=*");
        response.setHeader("Feature-Policy", "camera *; microphone *; display-capture *");
        filterChain.doFilter(request, response);
    }
}
