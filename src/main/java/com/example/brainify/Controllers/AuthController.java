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
    public ResponseEntity<Map<String, Object>> register(@Valid @RequestBody RegistrationRequest request, BindingResult bindingResult) {
        Map<String, Object> response = new HashMap<>();
        try {
            if (bindingResult.hasErrors()) {
                response.put("success", false);
                response.put("message", bindingResult.getAllErrors().get(0).getDefaultMessage());
                return ResponseEntity.badRequest().body(response);
            }
            authService.registerUser(request.getName(), request.getEmail(), request.getPhone());
            response.put("success", true);
            response.put("message", "Код подтверждения отправлен на указанный email");
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
    public ResponseEntity<Map<String, Object>> login(@Valid @RequestBody LoginRequest request, BindingResult bindingResult) {
        Map<String, Object> response = new HashMap<>();
        try {
            if (bindingResult.hasErrors()) {
                response.put("success", false);
                response.put("message", bindingResult.getAllErrors().get(0).getDefaultMessage());
                return ResponseEntity.badRequest().body(response);
            }
            authService.loginUser(request.getEmail());
            response.put("success", true);
            response.put("message", "Код подтверждения отправлен на указанный email");
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
            User user = authService.verifyCode(request.getEmail(), request.getCode(), codeType);
            // Создаем сессию через SessionManager
            sessionManager.createSession(session, user);
            // Определяем URL для перенаправления
            String redirectUrl = authService.getRedirectUrlByRole(user.getRole());
            response.put("success", true);
            response.put("message", codeType == VerificationCode.CodeType.REGISTRATION ? "Регистрация завершена успешно!" : "Вход выполнен успешно!");
            response.put("redirectUrl", redirectUrl);
            response.put("user", Map.of("id", user.getId(), "name", user.getName(), "role", user.getRole().name()));
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Verification failed for email: {}", request.getEmail(), e);
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
        User user = sessionManager.getCurrentUser(session);
        response.put("authenticated", user != null);
        if (user != null) {
            response.put("user", Map.of("id", user.getId(), "name", user.getName(), "role", user.getRole().name()));
        }
        return ResponseEntity.ok(response);
    }

    // API: Автоматический вход для разработки
    @PostMapping("/api/dev-login")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> devLogin(@RequestBody Map<String, String> request, HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        try {
            String email = request.get("email");
            String password = request.get("password");
            
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