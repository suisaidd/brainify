package com.example.brainify.Controllers;

import com.example.brainify.Model.BoardOperation;
import com.example.brainify.Model.Lesson;
import com.example.brainify.Repository.BoardOperationRepository;
import com.example.brainify.Repository.LessonRepository;
import com.example.brainify.Service.BoardService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/test")
public class TestController {
    
    @Autowired
    private BoardService boardService;
    
    @Autowired
    private BoardOperationRepository boardOperationRepository;
    
    @Autowired
    private LessonRepository lessonRepository;
    
    /**
     * Тестовый endpoint для создания операции рисования
     */
    @PostMapping("/board/{lessonId}/draw")
    public ResponseEntity<Map<String, Object>> testDrawOperation(
            @PathVariable Long lessonId,
            @RequestBody Map<String, Object> request) {
        
        System.out.println("=== ТЕСТОВЫЙ API: Создание операции рисования ===");
        System.out.println("lessonId: " + lessonId);
        System.out.println("request: " + request);
        
        try {
            String operationType = (String) request.get("type");
            Double x = request.get("x") != null ? Double.valueOf(request.get("x").toString()) : null;
            Double y = request.get("y") != null ? Double.valueOf(request.get("y").toString()) : null;
            String color = (String) request.get("color");
            Integer brushSize = request.get("brushSize") != null ? Integer.valueOf(request.get("brushSize").toString()) : null;
            Long userId = request.get("userId") != null ? Long.valueOf(request.get("userId").toString()) : 1L;
            String userName = (String) request.get("userName");
            
            System.out.println("Извлеченные данные:");
            System.out.println("  type: " + operationType);
            System.out.println("  x: " + x);
            System.out.println("  y: " + y);
            System.out.println("  color: " + color);
            System.out.println("  brushSize: " + brushSize);
            System.out.println("  userId: " + userId);
            System.out.println("  userName: " + userName);
            
            // Проверяем существование урока
            Optional<Lesson> lessonOpt = lessonRepository.findById(lessonId);
            if (!lessonOpt.isPresent()) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Урок не найден: " + lessonId);
                return ResponseEntity.badRequest().body(error);
            }
            
            // Создаем операцию через сервис
            BoardOperation savedOperation = boardService.saveDrawOperation(
                lessonId, operationType, x, y, color, brushSize, userId, userName
            );
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Операция создана успешно");
            response.put("operationId", savedOperation.getId());
            response.put("sequenceNumber", savedOperation.getSequenceNumber());
            
            System.out.println("✅ ТЕСТОВАЯ ОПЕРАЦИЯ СОЗДАНА: ID=" + savedOperation.getId());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("❌ ОШИБКА СОЗДАНИЯ ТЕСТОВОЙ ОПЕРАЦИИ: " + e.getMessage());
            e.printStackTrace();
            
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Ошибка создания операции: " + e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }
    
    /**
     * Тестовый endpoint для получения статистики операций
     */
    @GetMapping("/board/{lessonId}/stats")
    public ResponseEntity<Map<String, Object>> getBoardStats(@PathVariable Long lessonId) {
        System.out.println("=== ТЕСТОВЫЙ API: Получение статистики для урока " + lessonId + " ===");
        
        try {
            // Проверяем существование урока
            Optional<Lesson> lessonOpt = lessonRepository.findById(lessonId);
            if (!lessonOpt.isPresent()) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Урок не найден: " + lessonId);
                return ResponseEntity.badRequest().body(error);
            }
            
            // Получаем статистику
            Long totalOperations = boardOperationRepository.countByLessonId(lessonId);
            List<BoardOperation> operations = boardOperationRepository.findByLessonIdOrderBySequenceNumberAsc(lessonId);
            
            long startOperations = operations.stream().filter(op -> "start".equals(op.getOperationType())).count();
            long drawOperations = operations.stream().filter(op -> "draw".equals(op.getOperationType())).count();
            long endOperations = operations.stream().filter(op -> "end".equals(op.getOperationType())).count();
            
            Map<String, Object> stats = new HashMap<>();
            stats.put("lessonId", lessonId);
            stats.put("totalOperations", totalOperations);
            stats.put("startOperations", startOperations);
            stats.put("drawOperations", drawOperations);
            stats.put("endOperations", endOperations);
            stats.put("lastOperation", operations.isEmpty() ? null : operations.get(operations.size() - 1).getTimestamp());
            
            System.out.println("📊 СТАТИСТИКА: " + stats);
            
            return ResponseEntity.ok(stats);
            
        } catch (Exception e) {
            System.err.println("❌ ОШИБКА ПОЛУЧЕНИЯ СТАТИСТИКИ: " + e.getMessage());
            e.printStackTrace();
            
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Ошибка получения статистики: " + e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }
    
    /**
     * Тестовый endpoint для очистки операций
     */
    @DeleteMapping("/board/{lessonId}/clear")
    public ResponseEntity<Map<String, Object>> clearBoardOperations(@PathVariable Long lessonId) {
        System.out.println("=== ТЕСТОВЫЙ API: Очистка операций для урока " + lessonId + " ===");
        
        try {
            Long count = boardOperationRepository.countByLessonId(lessonId);
            boardOperationRepository.deleteByLessonId(lessonId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Операции очищены");
            response.put("deletedCount", count);
            
            System.out.println("🗑️ ОЧИЩЕНО ОПЕРАЦИЙ: " + count);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("❌ ОШИБКА ОЧИСТКИ ОПЕРАЦИЙ: " + e.getMessage());
            e.printStackTrace();
            
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Ошибка очистки операций: " + e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }
}
