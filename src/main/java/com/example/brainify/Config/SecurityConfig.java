package com.example.brainify.Config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

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
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .headers(headers -> headers.frameOptions(frame -> frame.disable()))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(
                        "/", "/main", "/private-lessons", "/test",
                        "/auth/**", 
                        "/css/**", "/js/**", "/images/**", "/static/**"
                ).permitAll()
                .requestMatchers("/admin-role/**").hasAnyAuthority("ADMIN", "MANAGER")
                .requestMatchers("/dashboard", "/student-dashboard").authenticated()
                .anyRequest().authenticated()
            )
            .sessionManagement(session -> session
                .maximumSessions(-1) // Неограниченное количество сессий
                .maxSessionsPreventsLogin(false)
                .sessionRegistry(null)
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