/**
 * csrf.js — Глобальный перехватчик CSRF-токена.
 *
 * Этот скрипт:
 * 1. При загрузке страницы запрашивает /api/csrf, чтобы выставить cookie XSRF-TOKEN.
 * 2. Перехватывает все вызовы fetch() и автоматически добавляет заголовок
 *    X-XSRF-TOKEN для запросов, изменяющих данные (POST, PUT, DELETE, PATCH).
 *
 * Подключать ПЕРЕД всеми остальными скриптами.
 */
(function () {
    'use strict';

    // ——— Утилита: чтение cookie по имени ———
    function getCookie(name) {
        const match = document.cookie.match(new RegExp('(^|;\\s*)' + name + '=([^;]*)'));
        return match ? decodeURIComponent(match[2]) : null;
    }

    // ——— При загрузке страницы запрашиваем токен (GET — CSRF не требуется) ———
    function ensureCsrfCookie() {
        // Если cookie уже есть — не запрашиваем повторно
        if (getCookie('XSRF-TOKEN')) return Promise.resolve();

        return fetch('/api/csrf', {
            method: 'GET',
            credentials: 'same-origin'
        }).catch(function () {
            // Молча игнорируем ошибку — cookie выставится при следующем ответе
        });
    }

    // ——— Перехват fetch: автоматическое добавление CSRF-заголовка ———
    var originalFetch = window.fetch;

    window.fetch = function (input, init) {
        init = init || {};

        // Определяем HTTP-метод
        var method = (init.method || 'GET').toUpperCase();

        // Для методов, изменяющих данные — добавляем CSRF-заголовок
        if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
            var token = getCookie('XSRF-TOKEN');
            if (token) {
                // Если headers — обычный объект
                if (!init.headers) {
                    init.headers = {};
                }

                if (init.headers instanceof Headers) {
                    if (!init.headers.has('X-XSRF-TOKEN')) {
                        init.headers.set('X-XSRF-TOKEN', token);
                    }
                } else if (Array.isArray(init.headers)) {
                    var hasToken = init.headers.some(function (h) {
                        return h[0] && h[0].toLowerCase() === 'x-xsrf-token';
                    });
                    if (!hasToken) {
                        init.headers.push(['X-XSRF-TOKEN', token]);
                    }
                } else {
                    // Простой объект
                    if (!init.headers['X-XSRF-TOKEN']) {
                        init.headers['X-XSRF-TOKEN'] = token;
                    }
                }
            }
        }

        // Всегда отправляем cookie
        if (!init.credentials) {
            init.credentials = 'same-origin';
        }

        return originalFetch.call(this, input, init);
    };

    // ——— Инициализация ———
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ensureCsrfCookie);
    } else {
        ensureCsrfCookie();
    }
})();
