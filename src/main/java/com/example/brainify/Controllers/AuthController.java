package com.example.brainify.Controllers;

import com.example.brainify.DTO.LoginRequest;
import com.example.brainify.DTO.RegistrationRequest;
import com.example.brainify.DTO.VerificationRequest;
import com.example.brainify.Model.User;
import com.example.brainify.Model.VerificationCode;
import com.example.brainify.Service.AuthService;
import com.example.brainify.Config.SessionManager;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@Controller
@RequestMapping("/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    private AuthService authService;
    
    @Autowired
    private SessionManager sessionManager;

    // Страница регистрации
    @GetMapping("/register")
    public String showRegisterPage(Model model) {
        model.addAttribute("pageTitle", "Регистрация - Brainify");
        return "auth/register";
    }

    // Страница входа
    @GetMapping("/login")
    public String showLoginPage(Model model, @RequestParam(value = "role", required = false) String role) {
        model.addAttribute("pageTitle", "Вход - Brainify");
        model.addAttribute("selectedRole", role);
        return "auth/login";
    }

    // API: Регистрация
    @PostMapping("/api/register")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody RegistrationRequest request, BindingResult bindingResult, HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        try {
            if (bindingResult.hasErrors()) {
                response.put("success", false);
                response.put("message", bindingResult.getAllErrors().get(0).getDefaultMessage());
                return ResponseEntity.badRequest().body(response);
            }
            // Нормализуем email к нижнему регистру
            String normalizedEmail = request.getEmail().toLowerCase().trim();
            String result = authService.registerUser(request.getName(), normalizedEmail, request.getPhone());
            
            // ВРЕМЕННО: если email верификация отключена — сразу создаём сессию
            if ("SKIP_VERIFICATION".equals(result)) {
                User user = authService.findUserByEmail(normalizedEmail);
                if (user != null) {
                    user.setLastLoginAt(java.time.LocalDateTime.now());
                    sessionManager.createSession(session, user);
                    String redirectUrl = authService.getRedirectUrlByRole(user.getRole());
                    response.put("success", true);
                    response.put("skipVerification", true);
                    response.put("message", "Регистрация завершена успешно!");
                    response.put("redirectUrl", redirectUrl);
                    response.put("user", Map.of("id", user.getId(), "name", user.getName(), "role", user.getRole().name()));
                    logger.info("Регистрация без верификации: {} (роль: {})", normalizedEmail, user.getRole());
                    return ResponseEntity.ok(response);
                }
            }
            
            response.put("success", true);
            response.put("message", result);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Ошибка регистрации: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    // API: Вход
    @PostMapping("/api/login")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody LoginRequest request, BindingResult bindingResult, HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        try {
            if (bindingResult.hasErrors()) {
                response.put("success", false);
                response.put("message", bindingResult.getAllErrors().get(0).getDefaultMessage());
                return ResponseEntity.badRequest().body(response);
            }
            // Нормализуем email к нижнему регистру
            String normalizedEmail = request.getEmail().toLowerCase().trim();
            String result = authService.loginUser(normalizedEmail);
            
            // ВРЕМЕННО: если email верификация отключена — сразу создаём сессию
            if ("SKIP_VERIFICATION".equals(result)) {
                User user = authService.findUserByEmail(normalizedEmail);
                if (user != null) {
                    user.setLastLoginAt(java.time.LocalDateTime.now());
                    sessionManager.createSession(session, user);
                    String redirectUrl = authService.getRedirectUrlByRole(user.getRole());
                    response.put("success", true);
                    response.put("skipVerification", true);
                    response.put("message", "Вход выполнен успешно!");
                    response.put("redirectUrl", redirectUrl);
                    response.put("user", Map.of("id", user.getId(), "name", user.getName(), "role", user.getRole().name()));
                    logger.info("Вход без верификации: {} (роль: {})", normalizedEmail, user.getRole());
                    return ResponseEntity.ok(response);
                }
            }
            
            response.put("success", true);
            response.put("message", result);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Ошибка входа: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    // API: Подтверждение кода
    @PostMapping("/api/verify")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> verifyCode(@Valid @RequestBody VerificationRequest request, BindingResult bindingResult, HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        try {
            logger.info("Получен запрос верификации: email={}, code={}, type={}", 
                       request.getEmail(), request.getCode(), request.getType());
            
            if (bindingResult.hasErrors()) {
                logger.error("Ошибки валидации: {}", bindingResult.getAllErrors());
                response.put("success", false);
                response.put("message", bindingResult.getAllErrors().get(0).getDefaultMessage());
                return ResponseEntity.badRequest().body(response);
            }
            
            // Преобразуем String в CodeType
            VerificationCode.CodeType codeType;
            try {
                codeType = VerificationCode.CodeType.valueOf(request.getType());
            } catch (IllegalArgumentException e) {
                response.put("success", false);
                response.put("message", "Неверный тип кода");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Нормализуем email к нижнему регистру
            String normalizedEmail = request.getEmail().toLowerCase().trim();
            
            // Верифицируем код и получаем пользователя
            User user = authService.verifyCode(normalizedEmail, request.getCode(), codeType);
            
            // Создаем сессию через SessionManager
            if (session != null) {
                sessionManager.createSession(session, user);
                logger.info("Сессия создана для пользователя: {}", user.getEmail());
            } else {
                logger.error("Не удалось создать сессию: session is null");
                response.put("success", false);
                response.put("message", "Ошибка создания сессии");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Определяем URL для перенаправления
            String redirectUrl = authService.getRedirectUrlByRole(user.getRole());
            
            response.put("success", true);
            response.put("message", codeType == VerificationCode.CodeType.REGISTRATION ? "Регистрация завершена успешно!" : "Вход выполнен успешно!");
            response.put("redirectUrl", redirectUrl);
            response.put("user", Map.of("id", user.getId(), "name", user.getName(), "role", user.getRole().name()));
            
            logger.info("Верификация успешна для пользователя: {} (роль: {})", user.getEmail(), user.getRole());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Verification failed for email: {}", request.getEmail(), e);
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    // API: Повторная отправка кода
    @PostMapping("/api/resend")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> resendCode(@RequestParam String email, @RequestParam String type) {
        Map<String, Object> response = new HashMap<>();
        try {
            logger.info("Получен запрос повторной отправки кода: email={}, type={}", email, type);
            
            // Преобразуем String в CodeType
            VerificationCode.CodeType codeType;
            try {
                codeType = VerificationCode.CodeType.valueOf(type);
            } catch (IllegalArgumentException e) {
                response.put("success", false);
                response.put("message", "Неверный тип кода");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Нормализуем email к нижнему регистру
            String normalizedEmail = email.toLowerCase().trim();
            String result = authService.resendCode(normalizedEmail, codeType);
            response.put("success", true);
            response.put("message", result);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Resend code failed for email: {}", email, e);
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }



    // API: Проверка статуса аутентификации
    @GetMapping("/api/status")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getAuthStatus(HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            User user = sessionManager.getCurrentUser(session);
            boolean authenticated = user != null;
            
            response.put("authenticated", authenticated);
            response.put("sessionId", session != null ? session.getId() : null);
            response.put("activeSessionsCount", sessionManager.getActiveSessionsCount());
            
            if (user != null) {
                response.put("user", Map.of(
                    "id", user.getId(), 
                    "name", user.getName(), 
                    "email", user.getEmail(),
                    "role", user.getRole().name(),
                    "isVerified", user.getIsVerified(),
                    "isActive", user.getIsActive()
                ));
                logger.info("Проверка статуса: пользователь аутентифицирован - {}", user.getEmail());
            } else {
                logger.info("Проверка статуса: пользователь не аутентифицирован");
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Ошибка при проверке статуса аутентификации", e);
            response.put("authenticated", false);
            response.put("error", "Ошибка проверки статуса");
            return ResponseEntity.ok(response);
        }
    }

    // API: Автоматический вход для разработки
    @PostMapping("/api/dev-login")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> devLogin(@RequestBody Map<String, String> request, HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        try {
            String email = request.get("email");
            
            // Разрешенные email для автоматического входа в режиме разработки
            String[] allowedEmails = {
                "9873262692@mail.ru",    // Админ
                "hristovamarina51@gmail.com", // Ученик
                "89873262692@mail.ru"   // Преподаватель
            };
            
            boolean isAllowedEmail = false;
            for (String allowedEmail : allowedEmails) {
                if (allowedEmail.equals(email)) {
                    isAllowedEmail = true;
                    break;
                }
            }
            
            if (!isAllowedEmail) {
                response.put("success", false);
                response.put("message", "Неверный email для автоматического входа");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Находим пользователя по email
            User user = authService.findUserByEmail(email);
            if (user == null) {
                response.put("success", false);
                response.put("message", "Пользователь не найден");
                return ResponseEntity.badRequest().body(response);
            }
            
            // Создаем сессию через SessionManager
            sessionManager.createSession(session, user);
            
            // Определяем URL для перенаправления
            String redirectUrl = authService.getRedirectUrlByRole(user.getRole());
            
            response.put("success", true);
            response.put("message", "Автоматический вход выполнен успешно!");
            response.put("redirectUrl", redirectUrl);
            response.put("user", Map.of("id", user.getId(), "name", user.getName(), "role", user.getRole().name()));
            
            logger.info("Автоматический вход: email={}, role={}", email, user.getRole());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Ошибка автоматического входа", e);
            response.put("success", false);
            response.put("message", "Ошибка автоматического входа: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    // API: Выход из системы
    @PostMapping("/api/logout")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> logout(HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            if (session != null) {
                User user = sessionManager.getCurrentUser(session);
                sessionManager.invalidateSession(session);
                logger.info("Пользователь вышел из системы: {}", user != null ? user.getEmail() : "неизвестный");
            }
            
            response.put("success", true);
            response.put("message", "Выход выполнен успешно");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Ошибка при выходе из системы", e);
            response.put("success", false);
            response.put("message", "Ошибка при выходе из системы");
            return ResponseEntity.badRequest().body(response);
        }
    }

    // Глобальная обработка ошибок
    @ExceptionHandler(Exception.class)
    @ResponseBody
    public ResponseEntity<Map<String, Object>> handleException(Exception e) {
        Map<String, Object> response = new HashMap<>();
        response.put("success", false);
        response.put("message", "Произошла ошибка: " + e.getMessage());
        logger.error("Exception in AuthController", e);
        return ResponseEntity.badRequest().body(response);
    }
} 