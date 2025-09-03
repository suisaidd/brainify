package com.example.brainify.Service;

import com.example.brainify.Model.BoardOperation;
import com.example.brainify.Model.BoardState;
import com.example.brainify.Model.Lesson;
import com.example.brainify.Repository.BoardOperationRepository;
import com.example.brainify.Repository.BoardStateRepository;
import com.example.brainify.Repository.LessonRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class BoardService {
    
    @Autowired
    private BoardStateRepository boardStateRepository;
    
    @Autowired
    private BoardOperationRepository boardOperationRepository;
    
    @Autowired
    private LessonRepository lessonRepository;
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    

    
    /**
     * Сохранить операцию рисования в реальном времени
     */
    @Transactional(rollbackFor = Exception.class)
    public BoardOperation saveDrawOperation(Long lessonId, String operationType, Double x, Double y, 
                                          String color, Integer brushSize, Long userId, String userName) {
        System.out.println("=== BoardService.saveDrawOperation НАЧАЛО ===");
        System.out.println("lessonId: " + lessonId);
        System.out.println("operationType: " + operationType);
        System.out.println("x: " + x);
        System.out.println("y: " + y);
        System.out.println("color: " + color);
        System.out.println("brushSize: " + brushSize);
        System.out.println("userId: " + userId);
        System.out.println("userName: " + userName);
        
        try {
            // Валидация входных данных
            if (lessonId == null) {
                throw new IllegalArgumentException("lessonId не может быть null");
            }
            if (operationType == null || operationType.trim().isEmpty()) {
                throw new IllegalArgumentException("operationType не может быть пустым");
            }
            if (userName == null || userName.trim().isEmpty()) {
                throw new IllegalArgumentException("userName не может быть пустым");
            }
            if (userId == null) {
                System.err.println("userId is null, using default value 1L");
                userId = 1L; // Значение по умолчанию
            }
            
            // Валидация координат для операций draw
            if ("draw".equals(operationType) && (x == null || y == null)) {
                System.err.println("WARNING: draw operation with null coordinates, skipping");
                throw new IllegalArgumentException("Координаты не могут быть null для операции draw");
            }
            
            System.out.println("Валидация пройдена успешно");
            
            // Получаем урок
            Optional<Lesson> lessonOpt = lessonRepository.findById(lessonId);
            if (!lessonOpt.isPresent()) {
                throw new RuntimeException("Урок не найден: " + lessonId);
            }
            
            Lesson lesson = lessonOpt.get();
            System.out.println("Урок найден: " + lesson.getId());
            
            // Получаем следующий номер последовательности
            Long nextSequence = boardOperationRepository.getNextSequenceNumber(lessonId);
            if (nextSequence == null) {
                nextSequence = 1L; // Если это первая операция
            }
            System.out.println("Next sequence number: " + nextSequence);
            
            // Дополнительная проверка
            if (nextSequence <= 0) {
                nextSequence = 1L;
                System.out.println("Corrected sequence number to: " + nextSequence);
            }
            
            // Создаем операцию
            BoardOperation operation = new BoardOperation(
                lesson, operationType, x, y, color, brushSize, userId, userName
            );
            operation.setSequenceNumber(nextSequence);
            System.out.println("Created operation with sequence number: " + nextSequence);
            
            // Проверяем, что операция создана корректно
            if (operation.getLesson() == null) {
                throw new RuntimeException("Операция не связана с уроком");
            }
            
            // Сохраняем в БД
            System.out.println("Saving operation to database...");
            
            BoardOperation savedOperation = boardOperationRepository.save(operation);
            System.out.println("Operation saved successfully with ID: " + savedOperation.getId());
            
            // Принудительно сбрасываем изменения в БД
            boardOperationRepository.flush();
            System.out.println("Database changes flushed");
            
            // Проверяем, что операция действительно сохранена
            Optional<BoardOperation> checkOperation = boardOperationRepository.findById(savedOperation.getId());
            if (!checkOperation.isPresent()) {
                System.err.println("ERROR: Операция не была сохранена в базу данных");
                System.err.println("Saved operation ID: " + savedOperation.getId());
                throw new RuntimeException("Операция не была сохранена в базу данных");
            }
            System.out.println("Operation verified in database: " + checkOperation.get().getId());
            
            // Проверяем количество операций для урока
            Long operationCount = boardOperationRepository.countByLessonId(lessonId);
            System.out.println("Total operations for lesson " + lessonId + ": " + operationCount);
            
            // ЛОГИРОВАНИЕ СОХРАНЕНИЯ ТОЧКИ
            if ("draw".equals(operationType) && x != null && y != null) {
                System.out.println("✅ ТОЧКА с координатами X=" + x + " Y=" + y + " СОХРАНЕНА в базу данных!");
                System.out.println("📊 Статистика: Всего операций для урока " + lessonId + ": " + operationCount);
            } else if ("start".equals(operationType) && x != null && y != null) {
                System.out.println("🎯 НАЧАЛЬНАЯ ТОЧКА с координатами X=" + x + " Y=" + y + " СОХРАНЕНА в базу данных!");
            } else if ("end".equals(operationType)) {
                System.out.println("🏁 ЗАВЕРШЕНИЕ РИСОВАНИЯ СОХРАНЕНО в базу данных!");
            }
            
            // Отправляем операцию всем участникам в реальном времени
            Map<String, Object> message = new HashMap<>();
            message.put("type", "draw_operation");
            message.put("operationType", operationType);
            message.put("x", x);
            message.put("y", y);
            message.put("color", color);
            message.put("brushSize", brushSize);
            message.put("userId", userId);
            message.put("userName", userName);
            message.put("sequenceNumber", nextSequence);
            message.put("timestamp", LocalDateTime.now());
            
            messagingTemplate.convertAndSend("/topic/board/" + lessonId, message);
            
            System.out.println("Draw operation saved: " + operationType + " at (" + x + ", " + y + ") for lesson " + lessonId);
            System.out.println("Operation ID: " + savedOperation.getId());
            System.out.println("Sequence Number: " + savedOperation.getSequenceNumber());
            System.out.println("=== BoardService.saveDrawOperation завершен ===");
            
            return savedOperation;
            
        } catch (Exception e) {
            System.err.println("=== ОШИБКА СОХРАНЕНИЯ ОПЕРАЦИИ РИСОВАНИЯ ===");
            System.err.println("Error message: " + e.getMessage());
            System.err.println("Error type: " + e.getClass().getSimpleName());
            System.err.println("Input parameters:");
            System.err.println("  lessonId: " + lessonId);
            System.err.println("  operationType: " + operationType);
            System.err.println("  x: " + x);
            System.err.println("  y: " + y);
            System.err.println("  color: " + color);
            System.err.println("  brushSize: " + brushSize);
            System.err.println("  userId: " + userId);
            System.err.println("  userName: " + userName);
            e.printStackTrace();
            throw new RuntimeException("Ошибка сохранения операции рисования: " + e.getMessage(), e);
        }
    }
    
    /**
     * Получить все операции рисования для урока
     */
    public List<BoardOperation> getDrawOperations(Long lessonId) {
        return boardOperationRepository.findByLessonIdOrderBySequenceNumberAsc(lessonId);
    }
    
    /**
     * Очистить все операции рисования для урока (после завершения)
     */
    @Transactional
    public void clearDrawOperations(Long lessonId) {
        try {
            boardOperationRepository.deleteByLessonId(lessonId);
            System.out.println("Draw operations cleared for lesson: " + lessonId);
        } catch (Exception e) {
            System.err.println("Error clearing draw operations: " + e.getMessage());
            throw new RuntimeException("Ошибка очистки операций рисования", e);
        }
    }
    
    /**
     * Деактивировать все состояния доски для урока
     */
    @Transactional
    public void deactivateBoardStates(Long lessonId) {
        try {
            boardStateRepository.deactivateAllByLessonId(lessonId);
            System.out.println("Board states deactivated for lesson: " + lessonId);
        } catch (Exception e) {
            System.err.println("Error deactivating board states: " + e.getMessage());
            throw new RuntimeException("Ошибка деактивации состояний доски", e);
        }
    }
    
    /**
     * Сохранить состояние доски (для полного состояния)
     */
    @Transactional
    public BoardState saveBoardState(Long lessonId, String boardContent) {
        System.out.println("=== BoardService.saveBoardState НАЧАЛО ===");
        System.out.println("lessonId: " + lessonId);
        System.out.println("boardContent length: " + (boardContent != null ? boardContent.length() : "null"));
        try {
            // Деактивируем предыдущие состояния
            boardStateRepository.deactivateAllByLessonId(lessonId);
            
            // Создаем новое состояние
            BoardState boardState = new BoardState(lessonId, boardContent);
            System.out.println("Saving board state to database...");
            boardState = boardStateRepository.save(boardState);
            System.out.println("Board state saved successfully with ID: " + boardState.getId());
            
            // Отправляем уведомление о сохранении всем участникам
            Map<String, Object> message = new HashMap<>();
            message.put("type", "board_saved");
            message.put("lessonId", lessonId);
            message.put("content", boardContent);
            message.put("timestamp", LocalDateTime.now());
            
            messagingTemplate.convertAndSend("/topic/board/" + lessonId, message);
            
            System.out.println("Board state saved for lesson " + lessonId + ", content size: " + boardContent.length());
            
            return boardState;
            
        } catch (Exception e) {
            System.err.println("Error saving board state: " + e.getMessage());
            throw new RuntimeException("Ошибка сохранения состояния доски", e);
        }
    }
    
    /**
     * Загрузить состояние доски
     */
    public Optional<BoardState> loadBoardState(Long lessonId) {
        return boardStateRepository.findActiveByLessonId(lessonId);
    }
    
    /**
     * Отправить обновление доски всем участникам
     */
    public void broadcastBoardUpdate(Long lessonId, String boardContent, String userId) {
        try {
            Map<String, Object> message = new HashMap<>();
            message.put("type", "board_update");
            message.put("lessonId", lessonId);
            message.put("content", boardContent);
            message.put("userId", userId);
            message.put("timestamp", LocalDateTime.now());
            
            messagingTemplate.convertAndSend("/topic/board/" + lessonId, message);
            
        } catch (Exception e) {
            throw new RuntimeException("Ошибка отправки обновления доски", e);
        }
    }
    
    /**
     * Отправить позицию курсора
     */
    public void broadcastCursorPosition(Long lessonId, double x, double y, String userId, String userName) {
        try {
            Map<String, Object> message = new HashMap<>();
            message.put("type", "cursor_position");
            message.put("lessonId", lessonId);
            message.put("x", x);
            message.put("y", y);
            message.put("userId", userId);
            message.put("userName", userName);
            message.put("timestamp", LocalDateTime.now());
            
            messagingTemplate.convertAndSend("/topic/board/" + lessonId + "/cursors", message);
            
        } catch (Exception e) {
            throw new RuntimeException("Ошибка отправки позиции курсора", e);
        }
    }
    
    /**
     * Отправить уведомление о присоединении пользователя
     */
    public void broadcastUserJoined(Long lessonId, String userId, String userName) {
        try {
            Map<String, Object> message = new HashMap<>();
            message.put("type", "user_joined");
            message.put("lessonId", lessonId.toString());
            message.put("userId", userId);
            message.put("userName", userName);
            message.put("timestamp", LocalDateTime.now());
            
            messagingTemplate.convertAndSend("/topic/board/" + lessonId, message);
            
            System.out.println("BoardService: Отправлено уведомление о присоединении пользователя " + userName + " к уроку " + lessonId);
            
        } catch (Exception e) {
            System.err.println("BoardService: Ошибка отправки уведомления о присоединении: " + e.getMessage());
            throw new RuntimeException("Ошибка отправки уведомления о присоединении", e);
        }
    }
    
    /**
     * Отправить уведомление о выходе пользователя
     */
    public void broadcastUserLeft(Long lessonId, String userId, String userName) {
        try {
            Map<String, Object> message = new HashMap<>();
            message.put("type", "user_left");
            message.put("lessonId", lessonId.toString());
            message.put("userId", userId);
            message.put("userName", userName);
            message.put("timestamp", LocalDateTime.now());
            
            messagingTemplate.convertAndSend("/topic/board/" + lessonId, message);
            
        } catch (Exception e) {
            throw new RuntimeException("Ошибка отправки уведомления о выходе", e);
        }
    }
    
    /**
     * Отправить состояние доски конкретному пользователю
     */
    public void sendBoardStateToUser(Long lessonId, String userId) {
        try {
            // Получаем все операции рисования
            List<BoardOperation> operations = getDrawOperations(lessonId);
            
            Map<String, Object> message = new HashMap<>();
            message.put("type", "board_state");
            message.put("lessonId", lessonId.toString());
            message.put("operations", operations);
            message.put("timestamp", LocalDateTime.now());
            
            messagingTemplate.convertAndSendToUser(userId, "/topic/board/" + lessonId + "/state", message);
            
        } catch (Exception e) {
            System.err.println("Error sending board state to user: " + e.getMessage());
        }
    }
    
    /**
     * Очистить доску
     */
    public void clearBoard(Long lessonId, String userId) {
        try {
            // Очищаем все операции рисования
            clearDrawOperations(lessonId);
            
            // Отправляем уведомление об очистке
            Map<String, Object> message = new HashMap<>();
            message.put("type", "board_cleared");
            message.put("lessonId", lessonId);
            message.put("userId", userId);
            message.put("timestamp", LocalDateTime.now());
            
            messagingTemplate.convertAndSend("/topic/board/" + lessonId, message);
            
            System.out.println("Board cleared for lesson: " + lessonId);
            
        } catch (Exception e) {
            System.err.println("Error clearing board: " + e.getMessage());
            throw new RuntimeException("Ошибка очистки доски", e);
        }
    }
    
    /**
     * Сохранить весь рисунок целиком (все точки одного рисунка)
     */
    @Transactional
    public void saveCompleteDrawing(Long lessonId, List<Map<String, Object>> drawingPoints, Long userId, String userName) {
        try {
            // Получаем урок
            Optional<Lesson> lessonOpt = lessonRepository.findById(lessonId);
            if (!lessonOpt.isPresent()) {
                throw new RuntimeException("Урок не найден: " + lessonId);
            }
            
            // Получаем следующий номер последовательности
            Long nextSequence = boardOperationRepository.getNextSequenceNumber(lessonId);
            if (nextSequence == null) {
                nextSequence = 1L; // Если это первая операция
            }
            System.out.println("Next sequence number for complete drawing: " + nextSequence);
            
            // Сохраняем все точки рисунка
            for (Map<String, Object> point : drawingPoints) {
                String operationType = (String) point.get("type");
                
                // Безопасное преобразование координат
                Object xObj = point.get("x");
                Object yObj = point.get("y");
                Object brushSizeObj = point.get("brushSize");
                
                Double x = xObj != null ? (xObj instanceof Number ? ((Number) xObj).doubleValue() : null) : null;
                Double y = yObj != null ? (yObj instanceof Number ? ((Number) yObj).doubleValue() : null) : null;
                Integer brushSize = brushSizeObj != null ? (brushSizeObj instanceof Number ? ((Number) brushSizeObj).intValue() : null) : null;
                
                String color = (String) point.get("color");
                
                BoardOperation operation = new BoardOperation(
                    lessonOpt.get(), operationType, x, y, color, brushSize, userId, userName
                );
                operation.setSequenceNumber(nextSequence++);
                System.out.println("Created complete drawing operation with sequence number: " + (nextSequence - 1));
                
                boardOperationRepository.save(operation);
            }
            
            // Отправляем весь рисунок всем участникам
            Map<String, Object> message = new HashMap<>();
            message.put("type", "complete_drawing");
            message.put("lessonId", lessonId);
            message.put("drawingPoints", drawingPoints);
            message.put("userId", userId);
            message.put("userName", userName);
            message.put("timestamp", LocalDateTime.now());
            
            messagingTemplate.convertAndSend("/topic/board/" + lessonId, message);
            
            System.out.println("Complete drawing saved: " + drawingPoints.size() + " points for lesson " + lessonId);
            
        } catch (Exception e) {
            System.err.println("Error saving complete drawing: " + e.getMessage());
            throw new RuntimeException("Ошибка сохранения рисунка", e);
        }
    }
}
