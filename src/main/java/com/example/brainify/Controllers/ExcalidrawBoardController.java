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
            
            System.out.println("📋 Обновление доски от пользователя: " + userName + " (ID: " + userId + ")");
            
            // Автоматически сохраняем состояние доски
            if (boardData != null) {
                try {
                    boardService.saveBoardState(Long.parseLong(lessonId), boardData.toString());
                } catch (Exception e) {
                    System.err.println("Ошибка автосохранения доски: " + e.getMessage());
                }
            }
            
            // Возвращаем сообщение для рассылки всем участникам
            Map<String, Object> response = new HashMap<>();
            response.put("type", "board_update");
            response.put("userId", userId);
            response.put("userName", userName);
            response.put("boardData", boardData);
            response.put("timestamp", LocalDateTime.now());
            
            return response;
            
        } catch (Exception e) {
            System.err.println("Ошибка при обновлении доски: " + e.getMessage());
            e.printStackTrace();
            
            return Map.of(
                "type", "error",
                "message", "Ошибка обновления доски"
            );
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
                    Map<String, Object> stateMessage = Map.of(
                        "type", "board_state",
                        "boardData", boardContent,
                        "timestamp", LocalDateTime.now()
                    );
                    
                    // Отправляем состояние только запросившему пользователю
                    messagingTemplate.convertAndSendToUser(
                        headerAccessor.getSessionId(), 
                        "/queue/board/state", 
                        stateMessage
                    );
                    
                    System.out.println("📋 Состояние доски отправлено пользователю: " + userId);
                } else {
                    System.out.println("📋 Сохраненное состояние доски не найдено для урока: " + lessonId);
                }
                
            } catch (Exception e) {
                System.err.println("Ошибка загрузки состояния доски: " + e.getMessage());
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
                    lessonId = Long.parseLong(lessonIdObj.toString());
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
     * REST API: Загрузка доски
     */
    @GetMapping("/api/excalidraw/load/{lessonId}")
    public ResponseEntity<?> loadBoard(@PathVariable Long lessonId, HttpSession session) {
        try {
            User currentUser = sessionManager.getCurrentUser(session);
            if (currentUser == null) {
                return ResponseEntity.status(401).body(Map.of("error", "Пользователь не авторизован"));
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
            
            // Загружаем состояние доски
            String content = boardService.loadBoardStateAsString(lessonId);
            
            if (content != null && !content.trim().isEmpty()) {
                System.out.println("📋 Состояние доски загружено для урока: " + lessonId);
                
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
            System.err.println("Ошибка загрузки доски: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Ошибка загрузки доски: " + e.getMessage()));
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
}
