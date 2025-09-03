package com.example.brainify.Controllers;

import com.example.brainify.Model.BoardOperation;
import com.example.brainify.Service.BoardService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.HashMap;
import java.util.Map;
import java.util.List;
import java.util.ArrayList;
import com.example.brainify.Repository.BoardOperationRepository;
import org.springframework.context.event.EventListener;

import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Controller
@Transactional
@RestController
public class BoardWebSocketController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private BoardService boardService;

    @Autowired
    private BoardOperationRepository boardOperationRepository;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Обработка обновления доски
     */
    @MessageMapping("/board/{lessonId}/update")
    @SendTo("/topic/board/{lessonId}")
    public Map<String, Object> handleBoardUpdate(@DestinationVariable Object lessonId,
                                                @Payload Map<String, Object> message, 
                                                SimpMessageHeaderAccessor headerAccessor) {
        try {
            // Безопасное преобразование lessonId в Long
            Long lessonIdLong = null;
            if (lessonId != null) {
                if (lessonId instanceof Number) {
                    lessonIdLong = ((Number) lessonId).longValue();
                } else {
                    lessonIdLong = Long.valueOf(lessonId.toString());
                }
            }
            
            if (lessonIdLong == null) {
                Map<String, Object> error = new HashMap<>();
                error.put("type", "error");
                error.put("message", "Неверный lessonId");
                return error;
            }
            
            Object userIdObj = message.get("userId");
            String userId = userIdObj != null ? userIdObj.toString() : null;
            String userName = (String) message.get("userName");
            Object content = message.get("content");
            String action = (String) message.get("action");

            // Сохраняем в базу данных как полное состояние доски
            if (lessonIdLong != null && content != null) {
                String contentJson = content instanceof String ? (String) content : 
                                   objectMapper.writeValueAsString(content);
                boardService.saveBoardState(lessonIdLong, contentJson);
            }

            // Добавляем информацию о пользователе
            Map<String, Object> response = new HashMap<>(message);
            response.put("timestamp", System.currentTimeMillis());
            response.put("userId", userId);
            response.put("userName", userName);

            System.out.println("Board update: " + action + " by " + userName + " for lesson " + lessonIdLong);

            return response;
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("type", "error");
            error.put("message", "Ошибка обработки обновления доски: " + e.getMessage());
            return error;
        }
    }

    /**
     * Обработка данных рисования - теперь сохраняем в board_operations
     */
    @MessageMapping("/board/{lessonId}/draw")
    @SendTo("/topic/board/{lessonId}")
    public Map<String, Object> handleDrawData(@DestinationVariable Object lessonId,
                                             @Payload Map<String, Object> message,
                                             SimpMessageHeaderAccessor headerAccessor) {
        try {
            // Безопасное преобразование lessonId в Long
            Long lessonIdLong = null;
            if (lessonId != null) {
                if (lessonId instanceof Number) {
                    lessonIdLong = ((Number) lessonId).longValue();
                } else {
                    lessonIdLong = Long.valueOf(lessonId.toString());
                }
            }
            
            if (lessonIdLong == null) {
                Map<String, Object> error = new HashMap<>();
                error.put("type", "error");
                error.put("message", "Неверный lessonId");
                return error;
            }
            
            // Извлекаем данные рисования
            String operationType = (String) message.get("type");
            Object xObj = message.get("x");
            Object yObj = message.get("y");
            String color = (String) message.get("color");
            Object brushSizeObj = message.get("brushSize");
            Object userIdObj = message.get("userId");
            String userName = (String) message.get("userName");
            
            System.out.println("Extracted data:");
            System.out.println("  type: " + operationType);
            System.out.println("  x: " + xObj + " (type: " + (xObj != null ? xObj.getClass().getSimpleName() : "null") + ")");
            System.out.println("  y: " + yObj + " (type: " + (yObj != null ? yObj.getClass().getSimpleName() : "null") + ")");
            System.out.println("  color: " + color);
            System.out.println("  brushSize: " + brushSizeObj);
            System.out.println("  userId: " + userIdObj);
            System.out.println("  userName: " + userName);
            
            // Проверяем, что тип операции не null
            if (operationType == null || operationType.trim().isEmpty()) {
                System.err.println("ERROR: operation type is null or empty");
                Map<String, Object> error = new HashMap<>();
                error.put("type", "error");
                error.put("message", "Тип операции не может быть пустым");
                return error;
            }
            
            // Безопасное преобразование координат с улучшенной обработкой
            Double x = null;
            Double y = null;
            
            if (xObj != null) {
                if (xObj instanceof Number) {
                    x = ((Number) xObj).doubleValue();
                } else if (xObj instanceof String) {
                    try {
                        x = Double.valueOf((String) xObj);
                    } catch (NumberFormatException e) {
                        System.err.println("Ошибка преобразования x координаты: " + xObj);
                    }
                }
            }
            
            if (yObj != null) {
                if (yObj instanceof Number) {
                    y = ((Number) yObj).doubleValue();
                } else if (yObj instanceof String) {
                    try {
                        y = Double.valueOf((String) yObj);
                    } catch (NumberFormatException e) {
                        System.err.println("Ошибка преобразования y координаты: " + yObj);
                    }
                }
            }
            
            Integer brushSize = null;
            if (brushSizeObj != null) {
                if (brushSizeObj instanceof Number) {
                    brushSize = ((Number) brushSizeObj).intValue();
                } else if (brushSizeObj instanceof String) {
                    try {
                        brushSize = Integer.valueOf((String) brushSizeObj);
                    } catch (NumberFormatException e) {
                        System.err.println("Ошибка преобразования brushSize: " + brushSizeObj);
                    }
                }
            }
            
            // Безопасное преобразование userId
            Long userId = null;
            if (userIdObj != null) {
                try {
                    if (userIdObj instanceof Number) {
                        userId = ((Number) userIdObj).longValue();
                    } else if (userIdObj instanceof String) {
                        userId = Long.valueOf((String) userIdObj);
                    }
                } catch (NumberFormatException e) {
                    System.err.println("Ошибка преобразования userId: " + userIdObj + " - " + e.getMessage());
                    userId = 1L; // Значение по умолчанию
                }
            }
            
            System.out.println("Converted data:");
            System.out.println("  x: " + x);
            System.out.println("  y: " + y);
            System.out.println("  brushSize: " + brushSize);
            System.out.println("  userId: " + userId);
            
            // Проверяем, что userName не null
            if (userName == null || userName.trim().isEmpty()) {
                System.err.println("ERROR: userName is null or empty");
                userName = "Пользователь"; // Значение по умолчанию
            }
            
            // Сохраняем операцию рисования в board_operations
            BoardOperation savedOperation = boardService.saveDrawOperation(
                lessonIdLong, 
                operationType, 
                x, 
                y, 
                color, 
                brushSize, 
                userId, 
                userName
            );
            
            // Создаем ответное сообщение
            Map<String, Object> response = new HashMap<>();
            response.put("type", "draw_operation");
            response.put("operationType", operationType);
            response.put("x", x);
            response.put("y", y);
            response.put("color", color);
            response.put("brushSize", brushSize);
            response.put("userId", userId);
            response.put("userName", userName);
            response.put("sequenceNumber", savedOperation.getSequenceNumber());
            response.put("timestamp", System.currentTimeMillis());
            
            System.out.println("Draw operation processed successfully: " + operationType + " at (" + x + ", " + y + ") for lesson " + lessonIdLong);
            System.out.println("Response message: " + response);
            System.out.println("=== ДАННЫЕ РИСОВАНИЯ ОБРАБОТАНЫ ===");
            
            return response;
            
        } catch (Exception e) {
            System.err.println("=== ОШИБКА ОБРАБОТКИ ДАННЫХ РИСОВАНИЯ ===");
            System.err.println("Error: " + e.getMessage());
            e.printStackTrace();
            Map<String, Object> error = new HashMap<>();
            error.put("type", "error");
            error.put("message", "Ошибка обработки данных рисования: " + e.getMessage());
            return error;
        }
    }

    /**
     * Обработка присоединения пользователя к доске
     */
    @MessageMapping("/board/{lessonId}/join")
    @SendTo("/topic/board/{lessonId}")
    public Map<String, Object> handleUserJoin(@DestinationVariable Object lessonId,
                                             @Payload Map<String, Object> message,
                                             SimpMessageHeaderAccessor headerAccessor) {
        System.out.println("=== WebSocket: ПОЛЬЗОВАТЕЛЬ ПРИСОЕДИНИЛСЯ ===");
        System.out.println("lessonId: " + lessonId);
        System.out.println("message: " + message);
        
        try {
            // Безопасное преобразование lessonId в Long
            Long lessonIdLong = null;
            if (lessonId != null) {
                if (lessonId instanceof Number) {
                    lessonIdLong = ((Number) lessonId).longValue();
                } else {
                    lessonIdLong = Long.valueOf(lessonId.toString());
                }
            }
            
            if (lessonIdLong == null) {
                Map<String, Object> error = new HashMap<>();
                error.put("type", "error");
                error.put("message", "Неверный lessonId");
                return error;
            }
            
            // Извлекаем данные пользователя
            Object userIdObj = message.get("userId");
            String userName = (String) message.get("userName");
            
            // Безопасное преобразование userId
            Long userId = null;
            if (userIdObj != null) {
                try {
                    if (userIdObj instanceof Number) {
                        userId = ((Number) userIdObj).longValue();
                    } else {
                        userId = Long.valueOf(userIdObj.toString());
                    }
                } catch (NumberFormatException e) {
                    userId = 1L;
                }
            }
            
            // Проверяем, что userName не null
            if (userName == null || userName.trim().isEmpty()) {
                userName = "Пользователь";
            }
            
            System.out.println("Пользователь присоединился: " + userName + " (ID: " + userId + ")");
            
            // Создаем ответное сообщение
            Map<String, Object> response = new HashMap<>();
            response.put("type", "user_joined");
            response.put("userId", userId);
            response.put("userName", userName);
            response.put("timestamp", System.currentTimeMillis());
            
            return response;
            
        } catch (Exception e) {
            System.err.println("Ошибка обработки присоединения пользователя: " + e.getMessage());
            Map<String, Object> error = new HashMap<>();
            error.put("type", "error");
            error.put("message", "Ошибка обработки присоединения: " + e.getMessage());
            return error;
        }
    }
    
    /**
     * Обработка выхода пользователя с доски
     */
    @MessageMapping("/board/{lessonId}/leave")
    @SendTo("/topic/board/{lessonId}")
    public Map<String, Object> handleUserLeave(@DestinationVariable Object lessonId,
                                              @Payload Map<String, Object> message,
                                              SimpMessageHeaderAccessor headerAccessor) {
        try {
            // Безопасное преобразование lessonId в Long
            Long lessonIdLong = null;
            if (lessonId != null) {
                if (lessonId instanceof Number) {
                    lessonIdLong = ((Number) lessonId).longValue();
                } else {
                    lessonIdLong = Long.valueOf(lessonId.toString());
                }
            }
            
            if (lessonIdLong == null) {
                Map<String, Object> error = new HashMap<>();
                error.put("type", "error");
                error.put("message", "Неверный lessonId");
                return error;
            }
            
            Object userIdObj = message.get("userId");
            String userId = userIdObj != null ? userIdObj.toString() : null;
            String userName = (String) message.get("userName");

            if (userId == null || userName == null) {
                Map<String, Object> error = new HashMap<>();
                error.put("type", "error");
                error.put("message", "Отсутствуют обязательные параметры userId или userName");
                return error;
            }

            // Отправляем уведомление о выходе
            boardService.broadcastUserLeft(lessonIdLong, userId, userName);

            Map<String, Object> response = new HashMap<>();
            response.put("type", "user_left");
            response.put("lessonId", lessonIdLong.toString());
            response.put("userId", userId);
            response.put("userName", userName);
            response.put("timestamp", System.currentTimeMillis());

            System.out.println("User left: " + userName + " from lesson " + lessonIdLong);

            return response;
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("type", "error");
            error.put("message", "Ошибка выхода: " + e.getMessage());
            return error;
        }
    }

    /**
     * Обработка отключения пользователя
     */
    @EventListener
    public void handleUserDisconnect(SessionDisconnectEvent event) {
        System.out.println("=== WebSocket: ПОЛЬЗОВАТЕЛЬ ОТКЛЮЧИЛСЯ ===");
        System.out.println("Session ID: " + event.getSessionId());
        
        try {
            // Получаем информацию о пользователе из сессии
            String sessionId = event.getSessionId();
            if (sessionId != null) {
                // Отправляем уведомление о выходе пользователя
                Map<String, Object> response = new HashMap<>();
                response.put("type", "user_left");
                response.put("sessionId", sessionId);
                response.put("timestamp", System.currentTimeMillis());
                
                // Отправляем всем пользователям (можно улучшить, сохраняя информацию о пользователях)
                messagingTemplate.convertAndSend("/topic/board/*", response);
                
                System.out.println("Уведомление о выходе пользователя отправлено");
            }
        } catch (Exception e) {
            System.err.println("Ошибка обработки отключения пользователя: " + e.getMessage());
        }
    }

    /**
     * Обработка позиции курсора
     */
    @MessageMapping("/board/{lessonId}/cursor")
    @SendTo("/topic/board/{lessonId}")
    public Map<String, Object> handleCursorPosition(@DestinationVariable Object lessonId,
                                                   @Payload Map<String, Object> message,
                                                   SimpMessageHeaderAccessor headerAccessor) {
        try {
            // Безопасное преобразование lessonId в Long
            Long lessonIdLong = null;
            if (lessonId != null) {
                if (lessonId instanceof Number) {
                    lessonIdLong = ((Number) lessonId).longValue();
                } else {
                    lessonIdLong = Long.valueOf(lessonId.toString());
                }
            }
            
            if (lessonIdLong == null) {
                Map<String, Object> error = new HashMap<>();
                error.put("type", "error");
                error.put("message", "Неверный lessonId");
                return error;
            }
            
            // Извлекаем данные курсора
            Object xObj = message.get("x");
            Object yObj = message.get("y");
            Object userIdObj = message.get("userId");
            String userName = (String) message.get("userName");
            
            // Безопасное преобразование координат
            Double x = xObj != null ? (xObj instanceof Number ? ((Number) xObj).doubleValue() : null) : null;
            Double y = yObj != null ? (yObj instanceof Number ? ((Number) yObj).doubleValue() : null) : null;
            
            // Безопасное преобразование userId
            Long userId = null;
            if (userIdObj != null) {
                try {
                    if (userIdObj instanceof Number) {
                        userId = ((Number) userIdObj).longValue();
                    } else {
                        userId = Long.valueOf(userIdObj.toString());
                    }
                } catch (NumberFormatException e) {
                    userId = 1L;
                }
            }
            
            // Создаем ответное сообщение
            Map<String, Object> response = new HashMap<>();
            response.put("type", "cursor_position");
            response.put("x", x);
            response.put("y", y);
            response.put("userId", userId);
            response.put("userName", userName);
            response.put("timestamp", System.currentTimeMillis());
            
            return response;
            
        } catch (Exception e) {
            System.err.println("Ошибка обработки позиции курсора: " + e.getMessage());
            Map<String, Object> error = new HashMap<>();
            error.put("type", "error");
            error.put("message", "Ошибка обработки позиции курсора: " + e.getMessage());
            return error;
        }
    }

    /**
     * Обработка запроса состояния доски при загрузке страницы
     */
    @MessageMapping("/board/{lessonId}/request-state")
    public void handleRequestBoardState(@DestinationVariable Object lessonId,
                                                      @Payload Map<String, Object> message,
                                                      SimpMessageHeaderAccessor headerAccessor) {
        System.out.println("=== WebSocket: ЗАПРОС СОСТОЯНИЯ ДОСКИ ===");
        System.out.println("lessonId: " + lessonId);
        System.out.println("message: " + message);
        System.out.println("Session ID: " + headerAccessor.getSessionId());
        
        try {
            // Безопасное преобразование lessonId в Long
            Long lessonIdLong = null;
            if (lessonId != null) {
                if (lessonId instanceof Number) {
                    lessonIdLong = ((Number) lessonId).longValue();
                } else {
                    lessonIdLong = Long.valueOf(lessonId.toString());
                }
            }
            
            if (lessonIdLong == null) {
                Map<String, Object> error = new HashMap<>();
                error.put("type", "error");
                error.put("message", "Неверный lessonId");
                messagingTemplate.convertAndSendToUser(headerAccessor.getSessionId(), 
                    "/topic/board/" + lessonIdLong + "/state", error);
                return;
            }
            
            // Получаем все операции для урока
            List<BoardOperation> operations = boardOperationRepository.findByLessonIdOrderBySequenceNumberAsc(lessonIdLong);
            System.out.println("Найдено операций для восстановления: " + operations.size());
            
            // Преобразуем операции в формат для фронтенда
            List<Map<String, Object>> operationsList = new ArrayList<>();
            for (BoardOperation operation : operations) {
                Map<String, Object> opMap = new HashMap<>();
                opMap.put("id", operation.getId());
                opMap.put("operationType", operation.getOperationType());
                opMap.put("x", operation.getX());
                opMap.put("y", operation.getY());
                opMap.put("color", operation.getColor());
                opMap.put("brushSize", operation.getBrushSize());
                opMap.put("userId", operation.getUserId());
                opMap.put("userName", operation.getUserName());
                opMap.put("timestamp", operation.getTimestamp());
                opMap.put("sequenceNumber", operation.getSequenceNumber());
                operationsList.add(opMap);
            }
            
            // Создаем ответное сообщение
            Map<String, Object> response = new HashMap<>();
            response.put("type", "board_state");
            response.put("lessonId", lessonIdLong);
            response.put("operations", operationsList);
            response.put("totalOperations", operations.size());
            response.put("timestamp", System.currentTimeMillis());
            response.put("hasDrawOperations", operations.size() > 0);
            
            // Отправляем состояние конкретному пользователю через личный канал
            messagingTemplate.convertAndSendToUser(headerAccessor.getSessionId(), 
                "/topic/board/" + lessonIdLong + "/state", response);
            
            System.out.println("✅ СОСТОЯНИЕ ДОСКИ ОТПРАВЛЕНО пользователю " + headerAccessor.getSessionId() + 
                ": " + operations.size() + " операций");
            
        } catch (Exception e) {
            System.err.println("=== ОШИБКА ПОЛУЧЕНИЯ СОСТОЯНИЯ ДОСКИ ===");
            System.err.println("Error: " + e.getMessage());
            e.printStackTrace();
            Map<String, Object> error = new HashMap<>();
            error.put("type", "error");
            error.put("message", "Ошибка получения состояния доски: " + e.getMessage());
            messagingTemplate.convertAndSendToUser(headerAccessor.getSessionId(), 
                "/topic/board/" + lessonId + "/state", error);
        }
    }

    /**
     * Обработка завершения урока - очистка операций
     */
    @MessageMapping("/board/{lessonId}/end-lesson")
    @SendTo("/topic/board/{lessonId}")
    public Map<String, Object> handleEndLesson(@DestinationVariable Object lessonId,
                                              @Payload Map<String, Object> message,
                                              SimpMessageHeaderAccessor headerAccessor) {
        try {
            // Безопасное преобразование lessonId в Long
            Long lessonIdLong = null;
            if (lessonId != null) {
                if (lessonId instanceof Number) {
                    lessonIdLong = ((Number) lessonId).longValue();
                } else {
                    lessonIdLong = Long.valueOf(lessonId.toString());
                }
            }
            
            if (lessonIdLong == null) {
                Map<String, Object> error = new HashMap<>();
                error.put("type", "error");
                error.put("message", "Неверный lessonId");
                return error;
            }
            
            Object userIdObj = message.get("userId");
            String userId = userIdObj != null ? userIdObj.toString() : null;
            String userName = (String) message.get("userName");

            // Очищаем все операции рисования для урока
            boardService.clearDrawOperations(lessonIdLong);

            Map<String, Object> response = new HashMap<>();
            response.put("type", "lesson_ended");
            response.put("lessonId", lessonIdLong.toString());
            response.put("userId", userId);
            response.put("userName", userName);
            response.put("timestamp", System.currentTimeMillis());
            response.put("message", "Урок завершен. Все операции рисования очищены.");

            System.out.println("Lesson ended: " + lessonIdLong + " by " + userName);

            return response;
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("type", "error");
            error.put("message", "Ошибка завершения урока: " + e.getMessage());
            return error;
        }
    }

    /**
     * Обработка завершенного рисунка (все точки одного рисунка)
     */
    @MessageMapping("/board/{lessonId}/complete-drawing")
    @SendTo("/topic/board/{lessonId}")
    public Map<String, Object> handleCompleteDrawing(@DestinationVariable Object lessonId,
                                                    @Payload Map<String, Object> message,
                                                    SimpMessageHeaderAccessor headerAccessor) {
        try {
            System.out.println("=== ПОЛУЧЕН ПОЛНЫЙ РИСУНОК ===");
            System.out.println("Raw lessonId: " + lessonId + " (type: " + (lessonId != null ? lessonId.getClass().getSimpleName() : "null") + ")");
            System.out.println("Raw message keys: " + (message != null ? message.keySet() : "null"));
            
            // Безопасное преобразование lessonId в Long
            Long lessonIdLong = null;
            if (lessonId != null) {
                if (lessonId instanceof Number) {
                    lessonIdLong = ((Number) lessonId).longValue();
                } else {
                    lessonIdLong = Long.valueOf(lessonId.toString());
                }
            }
            
            System.out.println("Converted lessonId: " + lessonIdLong);
            
            if (lessonIdLong == null) {
                Map<String, Object> error = new HashMap<>();
                error.put("type", "error");
                error.put("message", "Неверный lessonId");
                System.out.println("ERROR: lessonId is null");
                return error;
            }
            
            Object userIdObj = message.get("userId");
            String userName = (String) message.get("userName");
            Object drawingPointsObj = message.get("drawingPoints");
            
            System.out.println("Extracted data:");
            System.out.println("  userId: " + userIdObj);
            System.out.println("  userName: " + userName);
            System.out.println("  drawingPoints: " + (drawingPointsObj != null ? drawingPointsObj.getClass().getSimpleName() : "null"));
            
            Long userId = userIdObj != null ? Long.valueOf(userIdObj.toString()) : null;
            
            if (userId == null || userName == null || drawingPointsObj == null) {
                Map<String, Object> error = new HashMap<>();
                error.put("type", "error");
                error.put("message", "Отсутствуют обязательные параметры");
                System.out.println("ERROR: Missing required parameters");
                return error;
            }
            
            // Преобразуем drawingPoints в List<Map>
            List<Map<String, Object>> drawingPoints;
            if (drawingPointsObj instanceof List) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> tempDrawingPoints = (List<Map<String, Object>>) drawingPointsObj;
                drawingPoints = tempDrawingPoints;
                System.out.println("Drawing points count: " + drawingPoints.size());
            } else {
                Map<String, Object> error = new HashMap<>();
                error.put("type", "error");
                error.put("message", "Неверный формат drawingPoints");
                System.out.println("ERROR: drawingPoints is not a List");
                return error;
            }
            
            // Сохраняем весь рисунок целиком
            System.out.println("Calling boardService.saveCompleteDrawing...");
            boardService.saveCompleteDrawing(lessonIdLong, drawingPoints, userId, userName);
            System.out.println("boardService.saveCompleteDrawing completed successfully");
            
            Map<String, Object> response = new HashMap<>();
            response.put("type", "complete_drawing_saved");
            response.put("lessonId", lessonIdLong.toString());
            response.put("userId", userId);
            response.put("userName", userName);
            response.put("pointsCount", drawingPoints.size());
            response.put("timestamp", System.currentTimeMillis());
            
            System.out.println("Complete drawing processed successfully: " + drawingPoints.size() + " points for lesson " + lessonIdLong);
            System.out.println("=== ПОЛНЫЙ РИСУНОК ОБРАБОТАН ===");
            
            return response;
            
        } catch (Exception e) {
            System.err.println("=== ОШИБКА ОБРАБОТКИ ПОЛНОГО РИСУНКА ===");
            System.err.println("Error: " + e.getMessage());
            e.printStackTrace();
            Map<String, Object> error = new HashMap<>();
            error.put("type", "error");
            error.put("message", "Ошибка обработки полного рисунка: " + e.getMessage());
            return error;
        }
    }

    /**
     * REST endpoint для получения операций доски (для тестирования)
     */
    @GetMapping("/api/board/{lessonId}/operations")
    public ResponseEntity<List<Map<String, Object>>> getBoardOperations(@PathVariable Long lessonId) {
        try {
            System.out.println("=== REST API: Получение операций для урока " + lessonId + " ===");
            
            List<BoardOperation> operations = boardOperationRepository.findByLessonIdOrderBySequenceNumberAsc(lessonId);
            System.out.println("Найдено операций: " + operations.size());
            
            List<Map<String, Object>> result = new ArrayList<>();
            for (BoardOperation operation : operations) {
                Map<String, Object> opMap = new HashMap<>();
                opMap.put("id", operation.getId());
                opMap.put("operationType", operation.getOperationType());
                opMap.put("x", operation.getX());
                opMap.put("y", operation.getY());
                opMap.put("color", operation.getColor());
                opMap.put("brushSize", operation.getBrushSize());
                opMap.put("userId", operation.getUserId());
                opMap.put("userName", operation.getUserName());
                opMap.put("timestamp", operation.getTimestamp());
                opMap.put("sequenceNumber", operation.getSequenceNumber());
                result.add(opMap);
            }
            
            System.out.println("Операции успешно получены: " + result.size() + " записей");
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            System.err.println("Ошибка получения операций: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * REST endpoint для очистки операций доски (для тестирования)
     */
    @DeleteMapping("/api/board/{lessonId}/operations")
    public ResponseEntity<String> clearBoardOperations(@PathVariable Long lessonId) {
        try {
            System.out.println("=== REST API: Очистка операций для урока " + lessonId + " ===");
            
            Long count = boardOperationRepository.countByLessonId(lessonId);
            boardOperationRepository.deleteByLessonId(lessonId);
            
            System.out.println("Удалено операций: " + count);
            return ResponseEntity.ok("Удалено " + count + " операций");
            
        } catch (Exception e) {
            System.err.println("Ошибка очистки операций: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Ошибка: " + e.getMessage());
        }
    }
}
