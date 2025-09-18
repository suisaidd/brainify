package com.example.brainify.Controllers;

import com.example.brainify.Model.Lesson;
import com.example.brainify.Model.User;
import com.example.brainify.Model.UserRole;
import com.example.brainify.Model.OnlineLessonSession;
import com.example.brainify.Repository.LessonRepository;
import com.example.brainify.Config.SessionManager;
import com.example.brainify.Service.OnlineLessonService;
import com.example.brainify.Service.BoardService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;

import jakarta.servlet.http.HttpSession;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.List;
import java.util.ArrayList;

@Controller
public class ExcalidrawBoardController {

    @Autowired
    private LessonRepository lessonRepository;
    
    @Autowired
    private SessionManager sessionManager;
    
    @Autowired
    private OnlineLessonService onlineLessonService;
    
    @Autowired
    private BoardService boardService;
    
    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    
    // Хранилище активных пользователей по урокам
    private final Map<String, Map<String, Map<String, Object>>> activeUsers = new ConcurrentHashMap<>();
    
    /**
     * Тестовая страница Excalidraw (без авторизации)
     */
    @GetMapping("/excalidraw-test")
    public String excalidrawTest() {
        return "excalidraw-test";
    }
    
    /**
     * Прямой доступ админа к любому уроку
     */
    @GetMapping("/admin/join-lesson/{lessonId}")
    public String adminJoinLesson(@PathVariable Long lessonId, Model model, HttpSession session) {
        System.out.println("=== АДМИН ПРИСОЕДИНЯЕТСЯ К УРОКУ ===");
        System.out.println("LessonId: " + lessonId);
        
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            System.out.println("Пользователь не авторизован");
            return "redirect:/login";
        }
        
        // Проверяем, что пользователь админ
        if (!currentUser.getRole().equals(UserRole.ADMIN)) {
            System.out.println("Доступ запрещен - пользователь не админ");
            return "redirect:/dashboard?error=admin_access_required";
        }
        
        System.out.println("Админ: " + currentUser.getName() + " присоединяется к уроку " + lessonId);
        
        // Перенаправляем на Excalidraw доску
        return "redirect:/excalidraw-board?lessonId=" + lessonId;
    }
    
    /**
     * Главная страница Excalidraw доски
     */
    @GetMapping("/excalidraw-board")
    public String excalidrawBoard(@RequestParam Long lessonId, Model model, HttpSession session) {
        System.out.println("=== EXCALIDRAW BOARD REQUEST ===");
        System.out.println("LessonId: " + lessonId);
        
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
        OnlineLessonSession sessionData = onlineLessonService.createOrGetSession(lessonId, currentUser.getId(), currentUser.getRole());
        
        model.addAttribute("lesson", lesson);
        model.addAttribute("currentUser", currentUser);
        model.addAttribute("session", sessionData);
        model.addAttribute("isTeacher", isTeacher);
        model.addAttribute("isAdmin", isAdmin);
        model.addAttribute("isViewOnly", false);
        
        System.out.println("Возвращаем шаблон: excalidraw-board");
        System.out.println("=== EXCALIDRAW BOARD REQUEST ЗАВЕРШЕН ===");
        
        return "excalidraw-board";
    }
    
    /**
     * WebSocket: Присоединение пользователя к доске
     */
    @MessageMapping("/excalidraw/{lessonId}/join")
    public void handleUserJoin(@DestinationVariable String lessonId, 
                              @Payload Map<String, Object> joinData,
                              StompHeaderAccessor headerAccessor) {
        try {
            // Безопасное получение userId (может быть Integer или String)
            Object userIdObj = joinData.get("userId");
            String userId = userIdObj != null ? userIdObj.toString() : "unknown";
            String userName = (String) joinData.getOrDefault("userName", "Unknown User");
            String userRole = (String) joinData.getOrDefault("userRole", "student");
            
            // Валидация обязательных полей
            if (userId.equals("unknown") || userName.equals("Unknown User")) {
                System.err.println("❌ Некорректные данные пользователя: userId=" + userId + ", userName=" + userName);
                return;
            }
            
            System.out.println("👤 Пользователь присоединился к доске: " + userName + " (ID: " + userId + ", Роль: " + userRole + ")");
            
            // Добавляем пользователя в активные
            activeUsers.computeIfAbsent(lessonId, k -> new ConcurrentHashMap<>())
                      .put(userId, Map.of(
                          "userId", userId,
                          "userName", userName,
                          "userRole", userRole,
                          "joinedAt", LocalDateTime.now()
                      ));
            
            // Уведомляем всех о присоединении
            Map<String, Object> joinMessage = Map.of(
                "type", "user_joined",
                "userId", userId,
                "userName", userName,
                "userRole", userRole,
                "timestamp", LocalDateTime.now()
            );
            
            messagingTemplate.convertAndSend("/topic/excalidraw/" + lessonId, joinMessage);
            
            // Отправляем обновленный список пользователей
            sendUsersUpdate(lessonId);
            
        } catch (Exception e) {
            System.err.println("Ошибка при присоединении пользователя: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * WebSocket: Покидание пользователем доски
     */
    @MessageMapping("/excalidraw/{lessonId}/leave")
    public void handleUserLeave(@DestinationVariable String lessonId, 
                               @Payload Map<String, Object> leaveData) {
        try {
            // Безопасное получение userId (может быть Integer или String)
            Object userIdObj = leaveData.get("userId");
            String userId = userIdObj != null ? userIdObj.toString() : null;
            String userName = (String) leaveData.get("userName");
            
            System.out.println("👤 Пользователь покинул доску: " + userName + " (ID: " + userId + ")");
            
            // Удаляем пользователя из активных
            Map<String, Map<String, Object>> lessonUsers = activeUsers.get(lessonId);
            if (lessonUsers != null) {
                lessonUsers.remove(userId);
                if (lessonUsers.isEmpty()) {
                    activeUsers.remove(lessonId);
                }
            }
            
            // Уведомляем всех об уходе
            Map<String, Object> leaveMessage = Map.of(
                "type", "user_left",
                "userId", userId,
                "userName", userName,
                "timestamp", LocalDateTime.now()
            );
            
            messagingTemplate.convertAndSend("/topic/excalidraw/" + lessonId, leaveMessage);
            
            // Отправляем обновленный список пользователей
            sendUsersUpdate(lessonId);
            
        } catch (Exception e) {
            System.err.println("Ошибка при выходе пользователя: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * WebSocket: Обновление состояния доски
     */
    @MessageMapping("/excalidraw/{lessonId}/update")
    @SendTo("/topic/excalidraw/{lessonId}")
    public Map<String, Object> handleBoardUpdate(@DestinationVariable String lessonId, 
                                               @Payload Map<String, Object> updateData) {
        try {
            // Безопасное получение userId (может быть Integer или String)
            Object userIdObj = updateData.get("userId");
            String userId = userIdObj != null ? userIdObj.toString() : null;
            String userName = (String) updateData.get("userName");
            Object boardData = updateData.get("boardData");
            
            // Валидация данных
            if (userId == null || userName == null) {
                System.err.println("❌ Некорректные данные обновления доски: userId=" + userId + ", userName=" + userName);
                return Map.of(
                    "type", "error",
                    "message", "Некорректные данные пользователя"
                );
            }
            
            System.out.println("📋 Обновление доски от пользователя: " + userName + " (ID: " + userId + ")");
            
            // Автоматически сохраняем состояние доски (только если данные не пустые)
            if (boardData != null && !boardData.toString().trim().isEmpty()) {
                try {
                    // Преобразуем boardData в JSON строку
                    String boardDataJson;
                    if (boardData instanceof String) {
                        boardDataJson = (String) boardData;
                    } else {
                        // Если это объект, преобразуем в JSON
                        boardDataJson = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(boardData);
                    }
                    
                    // Проверяем размер данных перед сохранением
                    if (boardDataJson.length() > 1024 * 1024) { // 1MB лимит
                        System.err.println("⚠️ Размер данных доски превышает лимит: " + boardDataJson.length() + " байт");
                    } else {
                        // Используем оптимизированный метод для частых обновлений
                        boardService.saveBoardStateOptimized(Long.parseLong(lessonId), boardDataJson);
                    }
                } catch (Exception e) {
                    System.err.println("Ошибка автосохранения доски: " + e.getMessage());
                }
            }
            
            // МГНОВЕННО рассылаем обновление всем подключенным пользователям
            Map<String, Object> broadcastMessage = new HashMap<>();
            broadcastMessage.put("type", "board_update");
            broadcastMessage.put("userId", userId);
            broadcastMessage.put("userName", userName);
            broadcastMessage.put("boardData", boardData);
            broadcastMessage.put("timestamp", LocalDateTime.now());
            broadcastMessage.put("sequenceId", updateData.get("sequenceId"));
            broadcastMessage.put("clientVersion", updateData.get("clientVersion"));
            
            // Отправляем всем подключенным пользователям (кроме отправителя)
            messagingTemplate.convertAndSend("/topic/excalidraw/" + lessonId, broadcastMessage);
            
            System.out.println("📡 Board update broadcasted to all users for lesson: " + lessonId);
            
            // Возвращаем подтверждение отправителю
            Map<String, Object> response = new HashMap<>();
            response.put("type", "board_update_confirmed");
            response.put("userId", userId);
            response.put("timestamp", LocalDateTime.now());
            response.put("sequenceId", updateData.get("sequenceId"));
            
            return response;
            
        } catch (Exception e) {
            System.err.println("Ошибка при обновлении доски: " + e.getMessage());
            e.printStackTrace();
            
            return Map.of(
                "type", "error",
                "message", "Ошибка обновления доски: " + e.getMessage()
            );
        }
    }
    
    /**
     * WebSocket: Ping для проверки соединения
     */
    @MessageMapping("/excalidraw/{lessonId}/ping")
    public void handlePing(@DestinationVariable String lessonId, 
                          @Payload Map<String, Object> pingData) {
        try {
            // Проверяем что pingData не null
            if (pingData == null) {
                System.out.println("📡 Ping received with null data for lesson: " + lessonId);
                return;
            }
            
            Object userIdObj = pingData.get("userId");
            String userId = userIdObj != null ? userIdObj.toString() : null;
            
            if (userId != null) {
                // Обновляем время последней активности пользователя
                Map<String, Map<String, Object>> lessonUsers = activeUsers.get(lessonId);
                if (lessonUsers != null && lessonUsers.containsKey(userId)) {
                    // Создаем новую изменяемую Map вместо изменения неизменяемой
                    Map<String, Object> userData = new HashMap<>(lessonUsers.get(userId));
                    userData.put("lastPing", LocalDateTime.now());
                    lessonUsers.put(userId, userData);
                    System.out.println("📡 Ping processed for user: " + userId + " in lesson: " + lessonId);
                } else {
                    System.out.println("📡 Ping received from unknown user: " + userId + " in lesson: " + lessonId);
                }
            } else {
                System.out.println("📡 Ping received without userId for lesson: " + lessonId);
            }
        } catch (Exception e) {
            System.err.println("Ошибка обработки ping: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    /**
     * WebSocket: Запрос состояния доски
     */
    @MessageMapping("/excalidraw/{lessonId}/state")
    public void handleStateRequest(@DestinationVariable String lessonId, 
                                  @Payload Map<String, Object> stateRequest,
                                  StompHeaderAccessor headerAccessor) {
        try {
            // Безопасное получение userId (может быть Integer или String)
            Object userIdObj = stateRequest.get("userId");
            String userId = userIdObj != null ? userIdObj.toString() : null;
            
            System.out.println("📋 Запрос состояния доски от пользователя: " + userId);
            
            // Загружаем сохраненное состояние доски
            try {
                String boardContent = boardService.loadBoardStateAsString(Long.parseLong(lessonId));
                
                if (boardContent != null && !boardContent.trim().isEmpty()) {
                    // Парсим JSON для валидации
                    try {
                        Object boardData = new com.fasterxml.jackson.databind.ObjectMapper().readValue(boardContent, Object.class);
                        
                        Map<String, Object> stateMessage = new HashMap<>();
                        stateMessage.put("type", "board_state");
                        stateMessage.put("boardData", boardData);
                        stateMessage.put("timestamp", LocalDateTime.now());
                        stateMessage.put("lessonId", lessonId);
                        stateMessage.put("isInitialLoad", true);
                        
                        // Отправляем состояние только запросившему пользователю
                        messagingTemplate.convertAndSendToUser(
                            headerAccessor.getSessionId(), 
                            "/queue/board/state", 
                            stateMessage
                        );
                        
                        System.out.println("📋 Актуальное состояние доски отправлено пользователю: " + userId + " (размер: " + boardContent.length() + " символов)");
                        
                    } catch (Exception parseError) {
                        System.err.println("❌ Ошибка парсинга состояния доски: " + parseError.getMessage());
                        
                        // Отправляем пустое состояние при ошибке парсинга
                        Map<String, Object> errorStateMessage = new HashMap<>();
                        errorStateMessage.put("type", "board_state");
                        errorStateMessage.put("boardData", "{}");
                        errorStateMessage.put("timestamp", LocalDateTime.now());
                        errorStateMessage.put("lessonId", lessonId);
                        errorStateMessage.put("message", "Ошибка загрузки состояния доски");
                        
                        messagingTemplate.convertAndSendToUser(
                            headerAccessor.getSessionId(), 
                            "/queue/board/state", 
                            errorStateMessage
                        );
                    }
                } else {
                    System.out.println("📋 Сохраненное состояние доски не найдено для урока: " + lessonId);
                    
                    // Отправляем пустое состояние
                    Map<String, Object> emptyStateMessage = new HashMap<>();
                    emptyStateMessage.put("type", "board_state");
                    emptyStateMessage.put("boardData", "{}");
                    emptyStateMessage.put("timestamp", LocalDateTime.now());
                    emptyStateMessage.put("lessonId", lessonId);
                    emptyStateMessage.put("message", "Доска пуста");
                    emptyStateMessage.put("isInitialLoad", true);
                    
                    messagingTemplate.convertAndSendToUser(
                        headerAccessor.getSessionId(), 
                        "/queue/board/state", 
                        emptyStateMessage
                    );
                }
                
            } catch (Exception e) {
                System.err.println("❌ Ошибка загрузки состояния доски: " + e.getMessage());
                e.printStackTrace();
                
                // Отправляем сообщение об ошибке
                Map<String, Object> errorMessage = Map.of(
                    "type", "board_error",
                    "message", "Ошибка загрузки состояния доски: " + e.getMessage(),
                    "timestamp", LocalDateTime.now()
                );
                
                messagingTemplate.convertAndSendToUser(
                    headerAccessor.getSessionId(), 
                    "/queue/board/state", 
                    errorMessage
                );
            }
            
        } catch (Exception e) {
            System.err.println("Ошибка при обработке запроса состояния: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    
    /**
     * REST API: Сохранение доски
     */
    @PostMapping("/api/excalidraw/save")
    @CrossOrigin(origins = {"http://localhost:8082", "https://localhost:8082", "http://127.0.0.1:8082", "https://127.0.0.1:8082"}, 
                 allowCredentials = "true",
                 methods = {RequestMethod.POST, RequestMethod.OPTIONS},
                 allowedHeaders = {"*"})
    public ResponseEntity<?> saveBoard(@RequestBody Map<String, Object> request, HttpSession session) {
        try {
            User currentUser = sessionManager.getCurrentUser(session);
            if (currentUser == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Пользователь не авторизован"));
            }
            
            // Безопасное получение lessonId (может быть Integer, Long или String)
            Object lessonIdObj = request.get("lessonId");
            String content = (String) request.get("content");
            
            if (lessonIdObj == null || content == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Отсутствуют обязательные параметры"));
            }
            
            Long lessonId;
            try {
                if (lessonIdObj instanceof Number) {
                    lessonId = ((Number) lessonIdObj).longValue();
                } else {
                    lessonId = Long.parseLong(String.valueOf(lessonIdObj));
                }
            } catch (NumberFormatException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Некорректный ID урока: " + lessonIdObj));
            }
            
            // Проверяем права доступа к уроку
            Optional<Lesson> lessonOpt = lessonRepository.findById(lessonId);
            if (lessonOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Урок не найден"));
            }
            
            Lesson lesson = lessonOpt.get();
            boolean hasAccess = lesson.getTeacher().getId().equals(currentUser.getId()) ||
                              lesson.getStudent().getId().equals(currentUser.getId()) ||
                              currentUser.getRole().equals(UserRole.ADMIN);
            
            if (!hasAccess) {
                return ResponseEntity.status(403).body(Map.of("error", "Нет прав доступа к уроку"));
            }
            
            // Сохраняем состояние доски
            boardService.saveBoardState(lessonId, content);
            
            System.out.println("💾 Доска сохранена для урока: " + lessonId + " пользователем: " + currentUser.getName());
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Доска успешно сохранена"
            ));
            
        } catch (Exception e) {
            System.err.println("Ошибка сохранения доски: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Ошибка сохранения доски: " + e.getMessage()));
        }
    }
    
    /**
     * CORS preflight для сохранения доски
     */
    @RequestMapping(value = "/api/excalidraw/save", method = RequestMethod.OPTIONS)
    @CrossOrigin(origins = {"http://localhost:8082", "https://localhost:8082", "http://127.0.0.1:8082", "https://127.0.0.1:8082"}, 
                 allowCredentials = "true",
                 methods = {RequestMethod.POST, RequestMethod.OPTIONS},
                 allowedHeaders = {"*"})
    public ResponseEntity<?> saveBoardOptions() {
        return ResponseEntity.ok().build();
    }
    
    
    /**
     * REST API: Загрузка доски
     */
    @GetMapping("/api/excalidraw/load/{lessonId}")
    @CrossOrigin(origins = {"http://localhost:8082", "https://localhost:8082", "http://127.0.0.1:8082", "https://127.0.0.1:8082"}, 
                 allowCredentials = "true",
                 methods = {RequestMethod.GET, RequestMethod.OPTIONS},
                 allowedHeaders = {"*"})
    public ResponseEntity<?> loadBoard(@PathVariable Long lessonId, HttpSession session) {
        System.out.println("=== EXCALIDRAW LOAD BOARD REQUEST ===");
        System.out.println("LessonId: " + lessonId);
        
        try {
            User currentUser = sessionManager.getCurrentUser(session);
            if (currentUser == null) {
                System.out.println("❌ Пользователь не авторизован");
                return ResponseEntity.status(401).body(Map.of("error", "Пользователь не авторизован"));
            }
            
            System.out.println("✅ Пользователь авторизован: " + currentUser.getName());
            
            // Проверяем права доступа к уроку
            Optional<Lesson> lessonOpt = lessonRepository.findById(lessonId);
            if (lessonOpt.isEmpty()) {
                System.out.println("❌ Урок не найден: " + lessonId);
                return ResponseEntity.badRequest().body(Map.of("error", "Урок не найден"));
            }
            
            Lesson lesson = lessonOpt.get();
            System.out.println("✅ Урок найден: " + lesson.getSubject().getName());
            
            boolean hasAccess = lesson.getTeacher().getId().equals(currentUser.getId()) ||
                              lesson.getStudent().getId().equals(currentUser.getId()) ||
                              currentUser.getRole().equals(UserRole.ADMIN);
            
            if (!hasAccess) {
                System.out.println("❌ Нет прав доступа к уроку");
                return ResponseEntity.status(403).body(Map.of("error", "Нет прав доступа к уроку"));
            }
            
            System.out.println("✅ Права доступа подтверждены");
            
            // Загружаем состояние доски с дополнительной обработкой ошибок
            String content = null;
            try {
                content = boardService.loadBoardStateAsString(lessonId);
                System.out.println("📋 BoardService.loadBoardStateAsString completed");
            } catch (Exception serviceError) {
                System.err.println("❌ Ошибка в BoardService: " + serviceError.getMessage());
                serviceError.printStackTrace();
                return ResponseEntity.status(500).body(Map.of("error", "Ошибка сервиса доски: " + serviceError.getMessage()));
            }
            
            if (content != null && !content.trim().isEmpty()) {
                System.out.println("📋 Состояние доски загружено для урока: " + lessonId + " (размер: " + content.length() + " символов)");
                
                return ResponseEntity.ok(Map.of(
                    "success", true,
                    "content", content
                ));
            } else {
                System.out.println("📋 Сохраненное состояние доски не найдено для урока: " + lessonId);
                
                return ResponseEntity.ok(Map.of(
                    "success", false,
                    "message", "Сохраненное состояние не найдено"
                ));
            }
            
        } catch (Exception e) {
            System.err.println("❌ Критическая ошибка загрузки доски: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Критическая ошибка загрузки доски: " + e.getMessage()));
        }
    }
    
    /**
     * REST API: Получение активных пользователей урока
     */
    @GetMapping("/api/excalidraw/users/{lessonId}")
    public ResponseEntity<?> getActiveUsers(@PathVariable String lessonId, HttpSession session) {
        try {
            User currentUser = sessionManager.getCurrentUser(session);
            if (currentUser == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Пользователь не авторизован"));
            }
            
            Map<String, Map<String, Object>> lessonUsers = activeUsers.get(lessonId);
            if (lessonUsers == null) {
                lessonUsers = new HashMap<>();
            }
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "users", lessonUsers.values()
            ));
            
        } catch (Exception e) {
            System.err.println("Ошибка получения пользователей: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", "Ошибка получения пользователей"));
        }
    }
    
    /**
     * REST API: Получение списка активных уроков для админа
     */
    @GetMapping("/api/admin/active-lessons")
    public ResponseEntity<?> getActiveLessons(HttpSession session) {
        try {
            User currentUser = sessionManager.getCurrentUser(session);
            if (currentUser == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Пользователь не авторизован"));
            }
            
            if (!currentUser.getRole().equals(UserRole.ADMIN)) {
                return ResponseEntity.status(403).body(Map.of("error", "Требуются права администратора"));
            }
            
            // Получаем все уроки со статусом ACTIVE или WAITING
            List<Map<String, Object>> activeLessons = new ArrayList<>();
            
            // Добавляем информацию об активных пользователях на досках
            for (Map.Entry<String, Map<String, Map<String, Object>>> entry : activeUsers.entrySet()) {
                String lessonId = entry.getKey();
                Map<String, Map<String, Object>> users = entry.getValue();
                
                try {
                    Long id = Long.parseLong(lessonId);
                    Optional<Lesson> lessonOpt = lessonRepository.findById(id);
                    
                    if (lessonOpt.isPresent()) {
                        Lesson lesson = lessonOpt.get();
                        
                        Map<String, Object> lessonInfo = new HashMap<>();
                        lessonInfo.put("id", lesson.getId());
                        lessonInfo.put("subject", lesson.getSubject().getName());
                        lessonInfo.put("teacher", lesson.getTeacher().getName());
                        lessonInfo.put("student", lesson.getStudent().getName());
                        lessonInfo.put("lessonDate", lesson.getLessonDate());
                        lessonInfo.put("activeUsers", users.values());
                        lessonInfo.put("userCount", users.size());
                        
                        activeLessons.add(lessonInfo);
                    }
                } catch (NumberFormatException e) {
                    // Игнорируем невалидные ID уроков
                }
            }
            
            return ResponseEntity.ok(Map.of(
                "success", true,
                "lessons", activeLessons
            ));
            
        } catch (Exception e) {
            System.err.println("Ошибка получения активных уроков: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of("error", "Ошибка сервера"));
        }
    }
    
    /**
     * Отправка обновленного списка пользователей
     */
    private void sendUsersUpdate(String lessonId) {
        try {
            Map<String, Map<String, Object>> lessonUsers = activeUsers.get(lessonId);
            if (lessonUsers == null) {
                lessonUsers = new HashMap<>();
            }
            
            Map<String, Object> usersMessage = Map.of(
                "type", "users_update",
                "users", lessonUsers.values(),
                "count", lessonUsers.size(),
                "timestamp", LocalDateTime.now()
            );
            
            messagingTemplate.convertAndSend("/topic/excalidraw/" + lessonId + "/users", usersMessage);
            
        } catch (Exception e) {
            System.err.println("Ошибка отправки обновления пользователей: " + e.getMessage());
        }
    }
    
    /**
     * WebSocket: Обработка движения мышки
     */
    @MessageMapping("/excalidraw/{lessonId}/mouse")
    @SendTo("/topic/excalidraw/{lessonId}")
    public Map<String, Object> handleMouseMove(@DestinationVariable String lessonId, 
                                             @Payload Map<String, Object> mouseData) {
        try {
            // Безопасное получение данных
            Object userIdObj = mouseData.get("userId");
            String userId = userIdObj != null ? userIdObj.toString() : null;
            String userName = (String) mouseData.get("userName");
            String userRole = (String) mouseData.get("userRole");
            Object xObj = mouseData.get("x");
            Object yObj = mouseData.get("y");
            
            // Валидация данных
            if (userId == null || userName == null || xObj == null || yObj == null) {
                System.err.println("❌ Некорректные данные движения мышки");
                return Map.of(
                    "type", "error",
                    "message", "Некорректные данные движения мышки"
                );
            }
            
            // Преобразование координат
            double x = 0, y = 0;
            try {
                x = xObj instanceof Number ? ((Number) xObj).doubleValue() : Double.parseDouble(xObj.toString());
                y = yObj instanceof Number ? ((Number) yObj).doubleValue() : Double.parseDouble(yObj.toString());
            } catch (NumberFormatException e) {
                System.err.println("❌ Некорректные координаты мышки: x=" + xObj + ", y=" + yObj);
                return Map.of(
                    "type", "error",
                    "message", "Некорректные координаты мышки"
                );
            }
            
            // Создаем сообщение для рассылки
            Map<String, Object> mouseMessage = new HashMap<>();
            mouseMessage.put("type", "mouse_move");
            mouseMessage.put("userId", userId);
            mouseMessage.put("userName", userName);
            mouseMessage.put("userRole", userRole);
            mouseMessage.put("x", x);
            mouseMessage.put("y", y);
            mouseMessage.put("timestamp", LocalDateTime.now());
            
            System.out.println("🖱️ Mouse move from " + userName + " (" + userRole + ") at (" + x + ", " + y + ")");
            
            return mouseMessage;
            
        } catch (Exception e) {
            System.err.println("Ошибка при обработке движения мышки: " + e.getMessage());
            e.printStackTrace();
            return Map.of(
                "type", "error",
                "message", "Ошибка обработки движения мышки: " + e.getMessage()
            );
        }
    }
}
