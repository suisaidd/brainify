package com.example.brainify.Controllers;

import com.example.brainify.Model.User;
import com.example.brainify.Service.LessonAutoCompletionService;
import com.example.brainify.Config.SessionManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpSession;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/lessons")
public class LessonController {

    @Autowired
    private LessonAutoCompletionService lessonAutoCompletionService;
    
    @Autowired
    private SessionManager sessionManager;

    /**
     * Войти в урок (для преподавателя)
     */
    @PostMapping("/{lessonId}/join")
    public ResponseEntity<?> joinLesson(@PathVariable Long lessonId, HttpSession session) {
        try {
            User currentUser = sessionManager.getCurrentUser(session);
            if (currentUser == null) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Пользователь не авторизован");
                return ResponseEntity.status(401).body(error);
            }

            boolean success = lessonAutoCompletionService.joinLesson(lessonId, currentUser.getId());
            
            if (success) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("message", "Успешно вошли в урок");
                return ResponseEntity.ok(response);
            } else {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Не удалось войти в урок. Проверьте время урока и права доступа.");
                return ResponseEntity.badRequest().body(response);
            }
            
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Ошибка при входе в урок: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    /**
     * Получить статус урока
     */
    @GetMapping("/{lessonId}/status")
    public ResponseEntity<?> getLessonStatus(@PathVariable Long lessonId, HttpSession session) {
        try {
            User currentUser = sessionManager.getCurrentUser(session);
            if (currentUser == null) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Пользователь не авторизован");
                return ResponseEntity.status(401).body(error);
            }

            LessonAutoCompletionService.LessonStatusResponse status = 
                lessonAutoCompletionService.getLessonStatus(lessonId, currentUser.getId());
            
            if (status != null) {
                return ResponseEntity.ok(status);
            } else {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Урок не найден или нет прав доступа");
                return ResponseEntity.notFound().build();
            }
            
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Ошибка при получении статуса урока: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}
