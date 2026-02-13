package com.example.brainify.Controllers;

import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Эндпоинт для получения CSRF-токена.
 * Вызывается клиентским JS при загрузке страницы, чтобы гарантированно
 * установить cookie XSRF-TOKEN до первого POST/PUT/DELETE-запроса.
 */
@RestController
public class CsrfController {

    @GetMapping("/api/csrf")
    public CsrfToken csrf(CsrfToken token) {
        return token;
    }
}
