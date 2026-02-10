package com.example.brainify.Config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private SessionManager sessionManager;

    @Bean
    public CustomAuthenticationFilter customAuthenticationFilter() {
        return new CustomAuthenticationFilter(sessionManager);
    }


    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(Arrays.asList(
            "http://localhost:*",
            "https://localhost:*", 
            "http://127.0.0.1:*",
            "https://127.0.0.1:*",
            "http://*.brainify.local:*",
            "https://*.brainify.local:*"
        ));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setExposedHeaders(Arrays.asList("Authorization", "Content-Type", "X-Requested-With", "Accept"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .headers(headers -> headers.frameOptions(frame -> frame.disable()))
            .sessionManagement(session -> session
                .sessionFixation().none() // Отключаем смену ID сессии
                .maximumSessions(-1) // Неограниченное количество сессий
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
                        "/study-map", "/course/**", "/course/section/**", "/course/chapter/**", "/course/sql/execute",
                        "/api/tasks/check-answer", "/api/tasks/image/**", "/api/blocks/*/data"
                ).permitAll()
                .requestMatchers("/admin/**").hasAnyAuthority("ADMIN")
                .requestMatchers("/api/admin/**").hasAnyAuthority("ADMIN")
                .requestMatchers("/admin-role/**").hasAnyAuthority("ADMIN", "MANAGER")
                .requestMatchers("/dashboard", "/dashboard-student").authenticated()
                .anyRequest().authenticated()
            )
            .logout(logout -> logout
                .logoutUrl("/api/logout")
                .logoutSuccessHandler((request, response, authentication) -> {
                    // Очищаем сессию через SessionManager
                    sessionManager.invalidateSession(request.getSession(false));
                    response.setStatus(200);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"success\": true, \"message\": \"Выход выполнен успешно\"}");
                })
                .clearAuthentication(true)
                .invalidateHttpSession(true)
                .deleteCookies("JSESSIONID")
            )
            .addFilterBefore(customAuthenticationFilter(), UsernamePasswordAuthenticationFilter.class)
        ;
        return http.build();
    }
} 