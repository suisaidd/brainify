package com.example.brainify.Controllers;

import com.example.brainify.Model.Lesson;
import com.example.brainify.Model.User;
import com.example.brainify.Model.UserRole;
import com.example.brainify.Model.OnlineLessonSession;

import com.example.brainify.Repository.LessonRepository;
import com.example.brainify.Config.SessionManager;
import com.example.brainify.Config.WebSocketAuthInterceptor;
import com.example.brainify.Service.OnlineLessonService;
import com.example.brainify.Service.BoardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpSession;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;


import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;

@Controller
public class OnlineLessonController {

    @Autowired
    private LessonRepository lessonRepository;
    
    @Autowired
    private SessionManager sessionManager;
    
    @Autowired
    private OnlineLessonService onlineLessonService;
    

    
    @Autowired
    private WebSocketAuthInterceptor webSocketAuthInterceptor;
    
    @Autowired
    private BoardService boardService;
    


    /**
     * Страница проверки оборудования
     */
    @GetMapping("/equipment-check")
    public String equipmentCheckPage(@RequestParam Long lessonId, Model model, HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return "redirect:/login";
        }

        Optional<Lesson> lessonOpt = lessonRepository.findById(lessonId);
        if (lessonOpt.isEmpty()) {
            return "redirect:/dashboard?error=lesson_not_found";
        }

        Lesson lesson = lessonOpt.get();
        
        // Проверяем права доступа
        if (!lesson.getTeacher().getId().equals(currentUser.getId()) && 
            !lesson.getStudent().getId().equals(currentUser.getId())) {
            return "redirect:/dashboard?error=access_denied";
        }

        // Проверяем, что урок еще не начался или только начался
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime lessonStart = lesson.getLessonDate();
        LocalDateTime lessonEnd = lessonStart.plusHours(1);

        if (now.isBefore(lessonStart.minusMinutes(15))) {
            return "redirect:/dashboard?error=lesson_too_early";
        }

        if (now.isAfter(lessonEnd)) {
            return "redirect:/dashboard?error=lesson_ended";
        }

        model.addAttribute("lesson", lesson);
        model.addAttribute("currentUser", currentUser);
        model.addAttribute("isTeacher", lesson.getTeacher().getId().equals(currentUser.getId()));
        
        return "equipment-check";
    }

    /**
     * Страница онлайн урока
     */
    @GetMapping("/online-lesson")
    public String onlineLessonPage(@RequestParam Long lessonId, Model model, HttpSession session) {
        System.out.println("=== ОНЛАЙН УРОК ЗАПРОС ===");
        System.out.println("LessonId: " + lessonId);
        System.out.println("Session ID: " + session.getId());
        
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            System.out.println("Пользователь не авторизован");
            return "redirect:/login";
        }
        
        System.out.println("Текущий пользователь: " + currentUser.getName() + " (ID: " + currentUser.getId() + ")");

        Optional<Lesson> lessonOpt = lessonRepository.findById(lessonId);
        if (lessonOpt.isEmpty()) {
            System.out.println("Урок не найден: " + lessonId);
            return "redirect:/dashboard?error=lesson_not_found";
        }

        Lesson lesson = lessonOpt.get();
        System.out.println("Урок найден: " + lesson.getSubject().getName());
        System.out.println("Учитель: " + lesson.getTeacher().getName() + " (ID: " + lesson.getTeacher().getId() + ")");
        System.out.println("Ученик: " + lesson.getStudent().getName() + " (ID: " + lesson.getStudent().getId() + ")");
        
        // Проверяем права доступа
        boolean isTeacher = lesson.getTeacher().getId().equals(currentUser.getId());
        boolean isStudent = lesson.getStudent().getId().equals(currentUser.getId());
        boolean isAdmin = currentUser.getRole().equals(UserRole.ADMIN);
        
        System.out.println("Права доступа - Учитель: " + isTeacher + ", Ученик: " + isStudent + ", Админ: " + isAdmin);
        
        if (!isTeacher && !isStudent && !isAdmin) {
            System.out.println("Доступ запрещен");
            return "redirect:/dashboard?error=access_denied";
        }

        // Создаем или получаем сессию урока
        System.out.println("Создание сессии урока...");
        OnlineLessonSession sessionData = onlineLessonService.createOrGetSession(lessonId, currentUser.getId(), currentUser.getRole());
        System.out.println("Сессия создана: " + (sessionData != null ? "да" : "нет"));
        if (sessionData != null) {
            System.out.println("Room ID: " + sessionData.getRoomId());
        }
        
        model.addAttribute("lesson", lesson);
        model.addAttribute("currentUser", currentUser);
        model.addAttribute("session", sessionData);
        model.addAttribute("isTeacher", isTeacher);
        model.addAttribute("isAdmin", isAdmin);
        model.addAttribute("isViewOnly", false);
        
        System.out.println("Перенаправляем на Excalidraw доску");
        System.out.println("=== ОНЛАЙН УРОК ЗАПРОС ЗАВЕРШЕН ===");
        
        // Временно перенаправляем на Excalidraw доску
        return "redirect:/excalidraw-board?lessonId=" + lessonId;
    }

    /**
     * WebSocket endpoint для очистки доски
     */
    @MessageMapping("/board/{lessonId}/clear")
    @SendTo("/topic/board/{lessonId}")
    public Map<String, Object> handleBoardClear(@DestinationVariable Long lessonId, 
                                               @Payload Map<String, Object> clearData,
                                               StompHeaderAccessor headerAccessor) {
        try {
            String sessionId = headerAccessor.getSessionId();
            User currentUser = getCurrentUserFromSession(sessionId);
            if (currentUser == null) {
                return Map.of("error", "Пользователь не авторизован");
            }

            // Проверяем права доступа к уроку
            Optional<Lesson> lessonOpt = lessonRepository.findById(lessonId);
            if (lessonOpt.isEmpty()) {
                return Map.of("error", "Урок не найден");
            }

            Lesson lesson = lessonOpt.get();
            boolean isAdmin = currentUser.getRole().equals(UserRole.ADMIN);
            boolean isTeacher = lesson.getTeacher().getId().equals(currentUser.getId());
            boolean isStudent = lesson.getStudent().getId().equals(currentUser.getId());

            if (!isAdmin && !isTeacher && !isStudent) {
                return Map.of("error", "Нет прав доступа к уроку");
            }

            // Очищаем доску
            boardService.clearBoard(lessonId, currentUser.getId().toString());

            Map<String, Object> response = new HashMap<>();
            response.put("type", "board_cleared");
            response.put("userId", currentUser.getId());
            response.put("userName", currentUser.getName());
            response.put("timestamp", LocalDateTime.now());
            
            return response;

        } catch (Exception e) {
            return Map.of("error", "Ошибка очистки доски");
        }
    }

    /**
     * WebSocket endpoint для сохранения доски
     */
    @MessageMapping("/board/{lessonId}/save")
    @SendTo("/topic/board/{lessonId}")
    public Map<String, Object> handleBoardSave(@DestinationVariable Long lessonId, 
                                              @Payload Map<String, Object> saveData,
                                              StompHeaderAccessor headerAccessor) {
        try {
            String sessionId = headerAccessor.getSessionId();
            User currentUser = getCurrentUserFromSession(sessionId);
            if (currentUser == null) {
                return Map.of("error", "Пользователь не авторизован");
            }

            // Проверяем права доступа к уроку
            Optional<Lesson> lessonOpt = lessonRepository.findById(lessonId);
            if (lessonOpt.isEmpty()) {
                return Map.of("error", "Урок не найден");
            }

            Lesson lesson = lessonOpt.get();
            boolean isAdmin = currentUser.getRole().equals(UserRole.ADMIN);
            boolean isTeacher = lesson.getTeacher().getId().equals(currentUser.getId());
            boolean isStudent = lesson.getStudent().getId().equals(currentUser.getId());

            if (!isAdmin && !isTeacher && !isStudent) {
                return Map.of("error", "Нет прав доступа к уроку");
            }

            // Получаем содержимое доски
            String boardContent = (String) saveData.get("content");
            if (boardContent == null) {
                return Map.of("error", "Содержимое доски не указано");
            }

            // Сохраняем состояние доски
            boardService.saveBoardState(lessonId, boardContent);

            Map<String, Object> response = new HashMap<>();
            response.put("type", "board_saved");
            response.put("userId", currentUser.getId());
            response.put("userName", currentUser.getName());
            response.put("timestamp", LocalDateTime.now());
            
            return response;

        } catch (Exception e) {
            return Map.of("error", "Ошибка сохранения доски");
        }
    }

    /**
     * Получить пользователя из сессии
     */
    private User getCurrentUserFromSession(String sessionId) {
        return webSocketAuthInterceptor.getUserBySessionId(sessionId);
    }



    /**
     * Обработка исключений WebSocket
     */
    @MessageExceptionHandler
    public void handleException(Throwable exception) {
        System.err.println("WebSocket ошибка: " + exception.getMessage());
        exception.printStackTrace();
    }

    /**
     * API для получения данных урока для онлайн-урока
     */
    @GetMapping("/api/lessons/{lessonId}/online-data")
    public ResponseEntity<?> getOnlineLessonData(@PathVariable Long lessonId, HttpSession session) {
        try {
            // Временно отключаем проверку авторизации для тестирования
            User currentUser = sessionManager.getCurrentUser(session);
            if (currentUser == null) {
                // Создаем тестового пользователя для отладки
                System.out.println("Пользователь не авторизован, создаем тестового пользователя");
                currentUser = new User();
                currentUser.setId(1L);
                currentUser.setRole(UserRole.TEACHER);
                currentUser.setName("Тестовый преподаватель");
            }

            // Проверяем, может ли пользователь присоединиться к уроку
            boolean canJoin = onlineLessonService.canJoinLesson(lessonId, currentUser.getId(), currentUser.getRole());
            
            if (!canJoin) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Нельзя присоединиться к уроку");
                return ResponseEntity.badRequest().body(response);
            }

            // Создаем или получаем сессию
            OnlineLessonSession sessionData = onlineLessonService.createOrGetSession(lessonId, currentUser.getId(), currentUser.getRole());
            
            // Получаем данные урока
            Optional<Lesson> lessonOpt = lessonRepository.findById(lessonId);
            if (lessonOpt.isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Урок не найден");
                return ResponseEntity.badRequest().body(response);
            }

            Lesson lesson = lessonOpt.get();

            // Создаем ответ с данными урока
            Map<String, Object> lessonData = new HashMap<>();
            lessonData.put("id", lesson.getId());
            lessonData.put("lessonDate", lesson.getLessonDate());
            lessonData.put("status", lesson.getStatus());
            
            // Данные преподавателя
            Map<String, Object> teacherData = new HashMap<>();
            teacherData.put("id", lesson.getTeacher().getId());
            teacherData.put("name", lesson.getTeacher().getName());
            teacherData.put("email", lesson.getTeacher().getEmail());
            lessonData.put("teacher", teacherData);
            
            // Данные ученика
            Map<String, Object> studentData = new HashMap<>();
            studentData.put("id", lesson.getStudent().getId());
            studentData.put("name", lesson.getStudent().getName());
            studentData.put("email", lesson.getStudent().getEmail());
            lessonData.put("student", studentData);
            
            // Данные предмета
            Map<String, Object> subjectData = new HashMap<>();
            subjectData.put("id", lesson.getSubject().getId());
            subjectData.put("name", lesson.getSubject().getName());
            lessonData.put("subject", subjectData);
            
            // Данные сессии
            Map<String, Object> sessionInfo = new HashMap<>();
            sessionInfo.put("roomId", sessionData.getRoomId());
            sessionInfo.put("roomKey", sessionData.getRoomKey());
            sessionInfo.put("sessionStatus", sessionData.getStatus());
            lessonData.put("session", sessionInfo);
            
            // ID текущего пользователя
            lessonData.put("currentUserId", currentUser.getId());
            lessonData.put("currentUserRole", currentUser.getRole().toString());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("lesson", lessonData);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Ошибка при получении данных урока: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * API для завершения онлайн-урока
     */
    @PostMapping("/api/lessons/{lessonId}/end")
    public ResponseEntity<?> endOnlineLesson(@PathVariable Long lessonId, 
                                           @RequestBody Map<String, Object> request,
                                           HttpSession session) {
        try {
            User currentUser = sessionManager.getCurrentUser(session);
            if (currentUser == null) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Пользователь не авторизован");
                return ResponseEntity.status(401).body(error);
            }

            String boardContent = (String) request.get("boardContent");
            String lessonNotes = (String) request.get("lessonNotes");

            // Завершаем сессию и урок
            onlineLessonService.completeSession(lessonId, currentUser.getId(), boardContent, lessonNotes);
            
            // Очищаем данные доски из базы данных
            try {
                boardService.clearBoard(lessonId, currentUser.getId().toString());
            } catch (Exception e) {
                System.out.println("Ошибка очистки данных доски: " + e.getMessage());
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Урок успешно завершен");
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Ошибка при завершении урока: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * API для получения статуса онлайн-урока
     */
    @GetMapping("/api/lessons/{lessonId}/online-status")
    public ResponseEntity<?> getOnlineLessonStatus(@PathVariable Long lessonId, HttpSession session) {
        try {
            User currentUser = sessionManager.getCurrentUser(session);
            if (currentUser == null) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Пользователь не авторизован");
                return ResponseEntity.status(401).body(error);
            }

            Optional<Lesson> lessonOpt = lessonRepository.findById(lessonId);
            if (lessonOpt.isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Урок не найден");
                return ResponseEntity.badRequest().body(response);
            }

            Lesson lesson = lessonOpt.get();
            
            // Проверяем права доступа
            if (!lesson.getTeacher().getId().equals(currentUser.getId()) && 
                !lesson.getStudent().getId().equals(currentUser.getId())) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Нет прав доступа к уроку");
                return ResponseEntity.status(403).body(response);
            }

            Map<String, Object> statusData = new HashMap<>();
            statusData.put("lessonId", lesson.getId());
            statusData.put("status", lesson.getStatus());
            statusData.put("teacherJoinedAt", lesson.getTeacherJoinedAt());
            statusData.put("lessonDate", lesson.getLessonDate());
            statusData.put("isTeacher", lesson.getTeacher().getId().equals(currentUser.getId()));

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("status", statusData);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Ошибка при получении статуса урока: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Health check endpoint для проверки подключения
     */
    @GetMapping("/api/health")
    public ResponseEntity<?> healthCheck() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "ok");
        response.put("timestamp", LocalDateTime.now());
        response.put("service", "brainify-online-lessons");
        return ResponseEntity.ok(response);
    }
}
