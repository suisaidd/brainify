package com.example.brainify.Controllers;

import com.example.brainify.Model.Lesson;
import com.example.brainify.Service.ExcalidrawService;
import com.example.brainify.Repository.LessonRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Controller
@RequestMapping("/excalidraw")
public class ExcalidrawController {
    
    private static final Logger logger = LoggerFactory.getLogger(ExcalidrawController.class);
    
    @Autowired
    private ExcalidrawService excalidrawService;
    
    @Autowired
    private LessonRepository lessonRepository;
    
    /**
     * Отображает страницу с доской Excalidraw для урока
     * @param lessonId ID урока
     * @param model модель для передачи данных в шаблон
     * @return страница с доской
     */
    @GetMapping("/board/{lessonId}")
    public String showBoard(@PathVariable Long lessonId, Model model) {
        logger.info("Запрос доски Excalidraw для урока ID: {}", lessonId);
        
        try {
            // Проверяем, что lessonId не null
            if (lessonId == null) {
                logger.error("ID урока не может быть null");
                model.addAttribute("error", "ID урока не указан");
                return "error";
            }
            
            logger.info("Поиск урока с ID: {}", lessonId);
            Optional<Lesson> lessonOpt = lessonRepository.findById(lessonId);
            
            if (lessonOpt.isEmpty()) {
                logger.error("Урок с ID {} не найден в базе данных", lessonId);
                model.addAttribute("error", "Урок с ID " + lessonId + " не найден");
                return "error";
            }
            
            Lesson lesson = lessonOpt.get();
            logger.info("Урок найден: ID={}, Студент={}, Преподаватель={}, Предмет={}", 
                       lesson.getId(), 
                       lesson.getStudent() != null ? lesson.getStudent().getName() : "null",
                       lesson.getTeacher() != null ? lesson.getTeacher().getName() : "null",
                       lesson.getSubject() != null ? lesson.getSubject().getName() : "null");
            
            // Генерируем ключи если их нет
            logger.info("Генерация ключей Excalidraw для урока ID: {}", lessonId);
            lesson = excalidrawService.generateExcalidrawKeys(lesson);
            logger.info("Ключи сгенерированы: RoomID={}, SecretKey={}", 
                       lesson.getExcalidrawRoomId(), 
                       lesson.getExcalidrawSecretKey() != null ? "***" : "null");
            
            // Получаем URL для iframe
            logger.info("Генерация URL для iframe Excalidraw");
            String excalidrawUrl = excalidrawService.getExcalidrawUrl(lesson);
            logger.info("URL сгенерирован: {}", excalidrawUrl);
            
            model.addAttribute("lesson", lesson);
            model.addAttribute("excalidrawUrl", excalidrawUrl);
            model.addAttribute("timestamp", System.currentTimeMillis());
            
            logger.info("Успешно подготовлена страница доски для урока ID: {}", lessonId);
            return "excalidraw-board";
            
        } catch (Exception e) {
            logger.error("Ошибка при загрузке доски для урока ID {}: {}", lessonId, e.getMessage(), e);
            model.addAttribute("error", "Ошибка при загрузке доски: " + e.getMessage());
            return "error";
        }
    }
    
    /**
     * API endpoint для получения URL доски Excalidraw
     * @param lessonId ID урока
     * @return JSON с URL доски
     */
    @GetMapping("/api/board-url/{lessonId}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getBoardUrl(@PathVariable Long lessonId) {
        Map<String, Object> response = new HashMap<>();
        
        Optional<Lesson> lessonOpt = lessonRepository.findById(lessonId);
        
        if (lessonOpt.isEmpty()) {
            response.put("success", false);
            response.put("message", "Урок не найден");
            return ResponseEntity.badRequest().body(response);
        }
        
        Lesson lesson = lessonOpt.get();
        
        // Генерируем ключи если их нет
        lesson = excalidrawService.generateExcalidrawKeys(lesson);
        
        // Получаем URL для iframe
        String excalidrawUrl = excalidrawService.getExcalidrawUrl(lesson);
        
        response.put("success", true);
        response.put("url", excalidrawUrl);
        response.put("roomId", lesson.getExcalidrawRoomId());
        response.put("secretKey", lesson.getExcalidrawSecretKey());
        
        return ResponseEntity.ok(response);
    }
    
    /**
     * API endpoint для генерации новых ключей для урока
     * @param lessonId ID урока
     * @return JSON с новыми ключами
     */
    @PostMapping("/api/generate-keys/{lessonId}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> generateKeys(@PathVariable Long lessonId) {
        Map<String, Object> response = new HashMap<>();
        
        Optional<Lesson> lessonOpt = lessonRepository.findById(lessonId);
        
        if (lessonOpt.isEmpty()) {
            response.put("success", false);
            response.put("message", "Урок не найден");
            return ResponseEntity.badRequest().body(response);
        }
        
        Lesson lesson = lessonOpt.get();
        
        // Принудительно генерируем новые ключи
        lesson = excalidrawService.forceGenerateNewKeys(lesson);
        
        response.put("success", true);
        response.put("roomId", lesson.getExcalidrawRoomId());
        response.put("secretKey", lesson.getExcalidrawSecretKey());
        response.put("url", excalidrawService.getExcalidrawUrl(lesson));
        response.put("message", "Новые ключи сгенерированы успешно");
        
        return ResponseEntity.ok(response);
    }
}
