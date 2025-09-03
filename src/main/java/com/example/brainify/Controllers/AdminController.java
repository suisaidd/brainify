package com.example.brainify.Controllers;

import com.example.brainify.Model.User;
import com.example.brainify.Model.UserRole;
import com.example.brainify.Model.Subject;
import com.example.brainify.Service.UserService;
import com.example.brainify.Config.SessionManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpSession;
import java.util.HashMap;
import java.util.Map;
import java.util.List;
import com.example.brainify.Model.OnlineLessonSession;
import com.example.brainify.Model.Lesson;
import com.example.brainify.Service.OnlineLessonService;
import java.util.ArrayList;

@Controller
@RequestMapping("/admin-role")
public class AdminController {

    @Autowired
    private UserService userService;
    
    @Autowired
    private SessionManager sessionManager;

    @Autowired
    private OnlineLessonService onlineLessonService;

    // Отображение админ панели
    @GetMapping
    public String adminPanel(Model model, HttpSession session) {
        // Проверяем роль пользователя
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || 
            (!currentUser.getRole().equals(UserRole.ADMIN) && !currentUser.getRole().equals(UserRole.MANAGER))) {
            return "redirect:/auth/login";
        }

        model.addAttribute("pageTitle", "Админ панель - Brainify");
        model.addAttribute("currentUser", currentUser);
        return "admin/panel";
    }

    // API для получения пользователей с поиском, фильтрацией и пагинацией
    @GetMapping("/api/users")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            HttpSession session) {
        
        // Проверяем роль пользователя
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || 
            (!currentUser.getRole().equals(UserRole.ADMIN) && !currentUser.getRole().equals(UserRole.MANAGER))) {
            return ResponseEntity.status(403).build();
        }

        try {
            Pageable pageable = PageRequest.of(page, size);
            Page<User> usersPage;
            
            // Определяем роль для фильтрации
            UserRole roleFilter = null;
            if (role != null && !role.trim().isEmpty()) {
                try {
                    roleFilter = UserRole.valueOf(role.trim().toUpperCase());
                } catch (IllegalArgumentException e) {
                    // Игнорируем некорректные роли
                }
            }
            
            // Применяем фильтры
            if (roleFilter != null && search != null && !search.trim().isEmpty()) {
                // Фильтр по роли и поиск по телефону
                usersPage = userService.searchUsersByRoleAndPhone(roleFilter, search.trim(), pageable);
            } else if (roleFilter != null) {
                // Только фильтр по роли
                usersPage = userService.getUsersByRole(roleFilter, pageable);
            } else if (search != null && !search.trim().isEmpty()) {
                // Только поиск по номеру телефона
                usersPage = userService.searchUsersByPhone(search.trim(), pageable);
            } else {
                // Все пользователи
                usersPage = userService.getAllUsers(pageable);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("users", usersPage.getContent());
            response.put("totalPages", usersPage.getTotalPages());
            response.put("totalElements", usersPage.getTotalElements());
            response.put("currentPage", page);
            response.put("size", size);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }

    // API для обновления роли пользователя
    @PostMapping("/api/users/{userId}/role")
    @ResponseBody
    public ResponseEntity<Map<String, String>> updateUserRole(
            @PathVariable Long userId,
            @RequestParam UserRole role,
            HttpSession session) {
        
        // Проверяем роль пользователя
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || 
            (!currentUser.getRole().equals(UserRole.ADMIN) && !currentUser.getRole().equals(UserRole.MANAGER))) {
            return ResponseEntity.status(403).build();
        }

        // Дополнительные проверки прав доступа
        Map<String, String> response = new HashMap<>();
        
        // Запрещаем назначение роли администратора
        if (role.equals(UserRole.ADMIN)) {
            response.put("message", "Роль администратора может быть назначена только через базу данных");
            response.put("status", "error");
            return ResponseEntity.status(403).body(response);
        }
        
        // Только администратор может назначать роль менеджера
        if (role.equals(UserRole.MANAGER) && !currentUser.getRole().equals(UserRole.ADMIN)) {
            response.put("message", "Только администратор может назначать роль менеджера");
            response.put("status", "error");
            return ResponseEntity.status(403).body(response);
        }

        try {
            userService.updateUserRole(userId, role);
            
            response.put("message", "Роль пользователя успешно обновлена");
            response.put("status", "success");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("message", "Ошибка при обновлении роли: " + e.getMessage());
            response.put("status", "error");
            
            return ResponseEntity.status(500).body(response);
        }
    }
    
    // API для получения списка всех предметов
    @GetMapping("/api/subjects")
    @ResponseBody
    public ResponseEntity<List<Subject>> getAllSubjects(HttpSession session) {
        // Проверяем роль пользователя
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || 
            (!currentUser.getRole().equals(UserRole.ADMIN) && !currentUser.getRole().equals(UserRole.MANAGER))) {
            return ResponseEntity.status(403).build();
        }
        
        try {
            List<Subject> subjects = userService.getAllActiveSubjects();
            System.out.println("API /api/subjects вызван. Найдено предметов: " + subjects.size());
            return ResponseEntity.ok(subjects);
        } catch (Exception e) {
            System.err.println("Ошибка в API /api/subjects: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }
    
    // API для получения предметов пользователя (преподавателя или ученика)
    @GetMapping("/api/users/{userId}/subjects")
    @ResponseBody
    public ResponseEntity<List<Subject>> getUserSubjects(
            @PathVariable Long userId,
            HttpSession session) {
        
        // Проверяем роль пользователя
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || 
            (!currentUser.getRole().equals(UserRole.ADMIN) && !currentUser.getRole().equals(UserRole.MANAGER))) {
            return ResponseEntity.status(403).build();
        }
        
        try {
            List<Subject> subjects = userService.getUserSubjects(userId);
            return ResponseEntity.ok(subjects);
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }
    
    // API для назначения предметов пользователю (преподавателю или ученику)
    @PostMapping("/api/users/{userId}/subjects")
    @ResponseBody
    public ResponseEntity<Map<String, String>> assignSubjectsToUser(
            @PathVariable Long userId,
            @RequestParam List<Long> subjectIds,
            HttpSession session) {
        
        // Проверяем роль пользователя
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || 
            (!currentUser.getRole().equals(UserRole.ADMIN) && !currentUser.getRole().equals(UserRole.MANAGER))) {
            return ResponseEntity.status(403).build();
        }
        
        Map<String, String> response = new HashMap<>();
        
        try {
            userService.assignSubjectsToUser(userId, subjectIds);
            
            response.put("message", "Предметы успешно назначены пользователю");
            response.put("status", "success");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("message", "Ошибка при назначении предметов: " + e.getMessage());
            response.put("status", "error");
            
            return ResponseEntity.status(500).body(response);
        }
    }
    
    // API для обновления количества занятий у ученика
    @PostMapping("/api/users/{userId}/lessons")
    @ResponseBody
    public ResponseEntity<Map<String, String>> updateStudentLessons(
            @PathVariable Long userId,
            @RequestParam Integer remainingLessons,
            HttpSession session) {
        
        // Проверяем роль пользователя - только администратор может изменять количество занятий
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || !currentUser.getRole().equals(UserRole.ADMIN)) {
            Map<String, String> response = new HashMap<>();
            response.put("message", "Только администратор может изменять количество занятий");
            response.put("status", "error");
            return ResponseEntity.status(403).body(response);
        }
        
        Map<String, String> response = new HashMap<>();
        
        try {
            userService.updateStudentLessons(userId, remainingLessons);
            
            response.put("message", "Количество занятий успешно обновлено");
            response.put("status", "success");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("message", "Ошибка при обновлении количества занятий: " + e.getMessage());
            response.put("status", "error");
            
            return ResponseEntity.status(500).body(response);
        }
    }

    /**
     * Страница активных онлайн-уроков для администратора
     */
    @GetMapping("/active-lessons")
    public String adminActiveLessonsPage(Model model, HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return "redirect:/login";
        }

        // Проверяем, что пользователь является администратором
        if (!currentUser.getRole().equals(UserRole.ADMIN)) {
            return "redirect:/dashboard?error=access_denied";
        }

        model.addAttribute("currentUser", currentUser);
        return "admin/active-lessons";
    }

    /**
     * API для получения активных онлайн-уроков
     */
    @GetMapping("/api/active-lessons")
    public ResponseEntity<?> getActiveLessons(HttpSession session) {
        try {
            User currentUser = sessionManager.getCurrentUser(session);
            if (currentUser == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Пользователь не авторизован"));
            }

            if (!currentUser.getRole().equals(UserRole.ADMIN)) {
                return ResponseEntity.status(403).body(Map.of("error", "Доступ запрещен"));
            }

            // Получаем все активные онлайн-уроки
            List<OnlineLessonSession> activeSessions = onlineLessonService.getActiveSessions();
            
            List<Map<String, Object>> sessionsData = new ArrayList<>();
            for (OnlineLessonSession sessionData : activeSessions) {
                Lesson lesson = sessionData.getLesson();
                
                Map<String, Object> sessionInfo = new HashMap<>();
                sessionInfo.put("sessionId", sessionData.getId());
                sessionInfo.put("roomId", sessionData.getRoomId());
                sessionInfo.put("roomKey", sessionData.getRoomKey());
                sessionInfo.put("status", sessionData.getStatus());
                sessionInfo.put("sessionStartedAt", sessionData.getSessionStartedAt());
                sessionInfo.put("teacherJoinedAt", sessionData.getTeacherJoinedAt());
                sessionInfo.put("studentJoinedAt", sessionData.getStudentJoinedAt());
                
                // Данные урока
                Map<String, Object> lessonInfo = new HashMap<>();
                lessonInfo.put("id", lesson.getId());
                lessonInfo.put("lessonDate", lesson.getLessonDate());
                lessonInfo.put("subject", lesson.getSubject().getName());
                lessonInfo.put("teacher", lesson.getTeacher().getName());
                lessonInfo.put("student", lesson.getStudent().getName());
                sessionInfo.put("lesson", lessonInfo);
                
                sessionsData.add(sessionInfo);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("sessions", sessionsData);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Ошибка при получении активных уроков: " + e.getMessage()));
        }
    }

    /**
     * Ручной запуск автоматического завершения уроков (для тестирования)
     */
    @PostMapping("/api/complete-expired-lessons")
    public ResponseEntity<?> completeExpiredLessons(HttpSession session) {
        try {
            User currentUser = sessionManager.getCurrentUser(session);
            if (currentUser == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Пользователь не авторизован"));
            }

            if (!currentUser.getRole().equals(UserRole.ADMIN)) {
                return ResponseEntity.status(403).body(Map.of("error", "Доступ запрещен"));
            }

            // Запускаем автоматическое завершение
            onlineLessonService.autoCompleteExpiredLessons();
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Автоматическое завершение уроков выполнено");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Ошибка при завершении уроков: " + e.getMessage()));
        }
    }
} 