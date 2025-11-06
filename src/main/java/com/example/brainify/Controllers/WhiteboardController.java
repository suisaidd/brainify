package com.example.brainify.Controllers;

import com.example.brainify.Model.Lesson;
import com.example.brainify.Service.WhiteboardService;
import com.example.brainify.Repository.LessonRepository;
import com.example.brainify.Config.SessionManager;
import com.example.brainify.Model.User;
import com.example.brainify.Model.UserRole;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import jakarta.servlet.http.HttpSession;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Controller
@RequestMapping("/whiteboard")
public class WhiteboardController {
    
    private static final Logger logger = LoggerFactory.getLogger(WhiteboardController.class);
    
    @Autowired
    private WhiteboardService whiteboardService;
    
    @Autowired
    private LessonRepository lessonRepository;
    
    @Autowired
    private SessionManager sessionManager;
    
    /**
     * Отображает страницу с доской для урока
     */
    @GetMapping("/board/{lessonId}")
    public String showBoard(@PathVariable Long lessonId, Model model, HttpSession session) {
        logger.info("Запрос доски для урока ID: {}", lessonId);
        
        try {
            // Проверяем авторизацию
            User currentUser = sessionManager.getCurrentUser(session);
            if (currentUser == null) {
                return "redirect:/auth/login";
            }
            
            // Проверяем, что lessonId не null
            if (lessonId == null) {
                logger.error("ID урока не может быть null");
                model.addAttribute("error", "ID урока не указан");
                return "error";
            }
            
            // Находим урок
            Optional<Lesson> lessonOpt = lessonRepository.findById(lessonId);
            if (lessonOpt.isEmpty()) {
                logger.error("Урок с ID {} не найден", lessonId);
                model.addAttribute("error", "Урок не найден");
                return "error";
            }
            
            Lesson lesson = lessonOpt.get();
            
            // Проверяем права доступа
            boolean hasAccess = false;
            if (currentUser.getRole().equals(UserRole.ADMIN) || currentUser.getRole().equals(UserRole.MANAGER)) {
                hasAccess = true;
            } else if (lesson.getStudent() != null && lesson.getStudent().getId().equals(currentUser.getId())) {
                hasAccess = true;
            } else if (lesson.getTeacher() != null && lesson.getTeacher().getId().equals(currentUser.getId())) {
                hasAccess = true;
            }
            
            if (!hasAccess) {
                logger.error("Пользователь {} не имеет доступа к уроку {}", currentUser.getId(), lessonId);
                model.addAttribute("error", "Нет доступа к этому уроку");
                return "error";
            }
            
            model.addAttribute("lesson", lesson);
            model.addAttribute("currentUser", currentUser);
            
            logger.info("Успешно подготовлена страница доски для урока ID: {}", lessonId);
            return "whiteboard-board";
            
        } catch (Exception e) {
            logger.error("Ошибка при загрузке доски для урока ID {}: {}", lessonId, e.getMessage(), e);
            model.addAttribute("error", "Ошибка при загрузке доски: " + e.getMessage());
            return "error";
        }
    }
    
    /**
     * API для получения состояния доски
     */
    @GetMapping("/api/state/{lessonId}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getBoardState(@PathVariable Long lessonId, HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            User currentUser = sessionManager.getCurrentUser(session);
            if (currentUser == null) {
                response.put("success", false);
                response.put("message", "Не авторизован");
                return ResponseEntity.status(401).body(response);
            }
            
            var boardState = whiteboardService.getBoardState(lessonId);
            if (boardState == null) {
                response.put("success", false);
                response.put("message", "Урок не найден");
                return ResponseEntity.badRequest().body(response);
            }
            
            String boardData = boardState.getBoardData();
            if (boardData == null || boardData.isEmpty()) {
                boardData = "{\"elements\":[],\"appState\":{}}";
            }
            
            response.put("success", true);
            response.put("boardData", boardData);
            response.put("version", boardState.getVersion() != null ? boardState.getVersion() : 1L);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Ошибка при получении состояния доски: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "Ошибка: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
    
    /**
     * API для сохранения состояния доски
     */
    @PostMapping("/api/state/{lessonId}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> saveBoardState(
            @PathVariable Long lessonId,
            @RequestBody Map<String, Object> request,
            HttpSession session) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            User currentUser = sessionManager.getCurrentUser(session);
            if (currentUser == null) {
                response.put("success", false);
                response.put("message", "Не авторизован");
                return ResponseEntity.status(401).body(response);
            }
            
            String boardData = (String) request.get("boardData");
            if (boardData == null) {
                response.put("success", false);
                response.put("message", "Данные доски не указаны");
                return ResponseEntity.badRequest().body(response);
            }
            
            var boardState = whiteboardService.saveBoardState(lessonId, boardData);
            
            response.put("success", true);
            response.put("version", boardState.getVersion());
            response.put("message", "Состояние доски сохранено");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Ошибка при сохранении состояния доски: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "Ошибка: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
    
    /**
     * API для очистки доски
     */
    @PostMapping("/api/clear/{lessonId}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> clearBoard(@PathVariable Long lessonId, HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        
        try {
            User currentUser = sessionManager.getCurrentUser(session);
            if (currentUser == null) {
                response.put("success", false);
                response.put("message", "Не авторизован");
                return ResponseEntity.status(401).body(response);
            }
            
            whiteboardService.clearBoard(lessonId);
            
            response.put("success", true);
            response.put("message", "Доска очищена");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Ошибка при очистке доски: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "Ошибка: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }
}

