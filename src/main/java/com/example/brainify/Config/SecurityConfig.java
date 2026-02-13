package com.example.brainify.Config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.csrf.CsrfTokenRequestHandler;
import org.springframework.security.web.csrf.XorCsrfTokenRequestAttributeHandler;
import org.springframework.util.StringUtils;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.function.Supplier;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private SessionManager sessionManager;

    @Bean
    public CustomAuthenticationFilter customAuthenticationFilter() {
        return new CustomAuthenticationFilter(sessionManager);
    }

    // ========================= CORS =========================

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList(
            // Локальная разработка
            "http://localhost:*",
            "https://localhost:*",
            "http://127.0.0.1:*",
            "https://127.0.0.1:*",
            "http://*.brainify.local:*",
            "https://*.brainify.local:*",
            // Railway.app (продакшн)
            "https://*.up.railway.app"
        ));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setExposedHeaders(Arrays.asList(
            "Authorization", "Content-Type", "X-Requested-With", "Accept", "X-XSRF-TOKEN"
        ));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    // ========================= Security Filter Chain =========================

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // ---- CSRF: включён, токен в cookie (доступен JS) ----
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .csrfTokenRequestHandler(new SpaCsrfTokenRequestHandler())
                // Исключаем WebSocket-хендшейк из CSRF-проверки
                .ignoringRequestMatchers("/ws/**")
            )

            .headers(headers -> headers.frameOptions(frame -> frame.disable()))

            .sessionManagement(session -> session
                .sessionFixation().none()
                .maximumSessions(-1)
                .maxSessionsPreventsLogin(false)
                .sessionRegistry(null)
            )

            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                        "/", "/main", "/private-lessons", "/trainers", "/trainers/**", "/test", "/test/**",
                        "/auth/**",
                        "/css/**", "/js/**", "/images/**", "/static/**",
                        "/tests/media/**",
                        "/api/auth/status", "/api/trainers/**", "/api/tasks/**", "/api/test/**",
                        "/admin/payroll/test",
                        "/ws/**", "/topic/**", "/app/**",
                        "/equipment-check/**",
                        "/api/tasks/check-answer", "/api/tasks/image/**", "/api/blocks/*/data",
                        // CSRF-эндпоинт — доступен всем для получения токена
                        "/api/csrf"
                ).permitAll()
                .requestMatchers("/admin/**").hasAnyAuthority("ADMIN")
                .requestMatchers("/api/admin/**").hasAnyAuthority("ADMIN")
                .requestMatchers("/admin-role/**").hasAnyAuthority("ADMIN", "MANAGER")
                .requestMatchers("/dashboard", "/dashboard-student").authenticated()
                .requestMatchers("/study-map", "/course/**", "/api/student/my-courses").authenticated()
                .anyRequest().authenticated()
            )

            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) -> {
                    // Если запрос ожидает JSON (AJAX) — возвращаем 401
                    String accept = request.getHeader("Accept");
                    String xhrHeader = request.getHeader("X-Requested-With");
                    if ((accept != null && accept.contains("application/json"))
                            || "XMLHttpRequest".equals(xhrHeader)) {
                        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                        response.setContentType("application/json");
                        response.getWriter().write("{\"error\":\"Unauthorized\",\"message\":\"Необходима аутентификация\"}");
                    } else {
                        // Обычный переход — перенаправляем на главную
                        response.sendRedirect("/?authRequired=true");
                    }
                })
            )

            .logout(logout -> logout
                .logoutUrl("/api/logout")
                .logoutSuccessHandler((request, response, authentication) -> {
                    sessionManager.invalidateSession(request.getSession(false));
                    response.setStatus(200);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"success\": true, \"message\": \"Выход выполнен успешно\"}");
                })
                .clearAuthentication(true)
                .invalidateHttpSession(true)
                .deleteCookies("JSESSIONID")
            )

            // Фильтр аутентификации на основе сессии
            .addFilterBefore(customAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class)
            // Фильтр для принудительной загрузки CSRF-токена в cookie на каждом запросе
            .addFilterAfter(new CsrfCookieFilter(), BasicAuthenticationFilter.class)
        ;
        return http.build();
    }

    // ========================= SPA CSRF Handler =========================
    // Обрабатывает CSRF-токен для SPA: принимает как XOR (из форм), так и plain (из заголовка)

    static final class SpaCsrfTokenRequestHandler extends CsrfTokenRequestAttributeHandler {
        private final CsrfTokenRequestHandler delegate = new XorCsrfTokenRequestAttributeHandler();

        @Override
        public void handle(HttpServletRequest request, HttpServletResponse response,
                           Supplier<CsrfToken> csrfToken) {
            // Делегируем XorHandler — он записывает токен в атрибут запроса и cookie
            this.delegate.handle(request, response, csrfToken);
        }

        @Override
        public String resolveCsrfTokenValue(HttpServletRequest request, CsrfToken csrfToken) {
            // Если токен пришёл в заголовке — используем plain (не XOR) значение
            if (StringUtils.hasText(request.getHeader(csrfToken.getHeaderName()))) {
                return super.resolveCsrfTokenValue(request, csrfToken);
            }
            // Иначе (из формы / параметра) — используем XOR-декодирование
            return this.delegate.resolveCsrfTokenValue(request, csrfToken);
        }
    }

    // ========================= CSRF Cookie Filter =========================
    // Принудительно загружает CSRF-токен, чтобы cookie XSRF-TOKEN выставлялся на каждом ответе

    static final class CsrfCookieFilter extends OncePerRequestFilter {
        @Override
        protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                        FilterChain filterChain) throws ServletException, IOException {
            CsrfToken csrfToken = (CsrfToken) request.getAttribute("_csrf");
            if (csrfToken != null) {
                // Принудительно вычисляем токен — это триггерит запись cookie
                csrfToken.getToken();
            }
            filterChain.doFilter(request, response);
        }
    }
}
