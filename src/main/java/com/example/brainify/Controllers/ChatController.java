package com.example.brainify.Controllers;

import com.example.brainify.Config.SessionManager;
import com.example.brainify.Model.ChatMessage;
import com.example.brainify.Model.User;
import com.example.brainify.Service.ChatService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

    @Autowired
    private ChatService chatService;

    @Autowired
    private SessionManager sessionManager;

    /**
     * Получить список контактов для текущего пользователя
     */
    @GetMapping("/contacts")
    public ResponseEntity<?> getContacts(HttpServletRequest request) {
        User currentUser = sessionManager.getCurrentUser(request);
        if (currentUser == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Не авторизован"));
        }

        try {
            List<Map<String, Object>> contacts = chatService.getContacts(currentUser);
            return ResponseEntity.ok(contacts);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Ошибка загрузки контактов: " + e.getMessage()));
        }
    }

    /**
     * Получить историю сообщений с пользователем
     */
    @GetMapping("/messages/{userId}")
    public ResponseEntity<?> getMessages(@PathVariable Long userId, HttpServletRequest request) {
        User currentUser = sessionManager.getCurrentUser(request);
        if (currentUser == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Не авторизован"));
        }

        try {
            List<Map<String, Object>> messages = chatService.getMessages(currentUser.getId(), userId);
            // Помечаем сообщения от собеседника как прочитанные
            chatService.markAsRead(userId, currentUser.getId());
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Ошибка загрузки сообщений: " + e.getMessage()));
        }
    }

    /**
     * Получить новые сообщения (для polling)
     */
    @GetMapping("/messages/{userId}/new")
    public ResponseEntity<?> getNewMessages(@PathVariable Long userId,
                                             @RequestParam String after,
                                             HttpServletRequest request) {
        User currentUser = sessionManager.getCurrentUser(request);
        if (currentUser == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Не авторизован"));
        }

        try {
            LocalDateTime afterTime = LocalDateTime.parse(after);
            List<Map<String, Object>> messages = chatService.getNewMessages(currentUser.getId(), userId, afterTime);
            // Помечаем как прочитанные
            if (!messages.isEmpty()) {
                chatService.markAsRead(userId, currentUser.getId());
            }
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Ошибка: " + e.getMessage()));
        }
    }

    /**
     * Отправить текстовое сообщение
     */
    @PostMapping("/send/{receiverId}")
    public ResponseEntity<?> sendMessage(@PathVariable Long receiverId,
                                          @RequestBody Map<String, String> body,
                                          HttpServletRequest request) {
        User currentUser = sessionManager.getCurrentUser(request);
        if (currentUser == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Не авторизован"));
        }

        String content = body.get("content");
        if (content == null || content.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Сообщение не может быть пустым"));
        }

        try {
            Map<String, Object> message = chatService.sendMessage(currentUser, receiverId, content.trim());
            return ResponseEntity.ok(message);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Ошибка отправки: " + e.getMessage()));
        }
    }

    /**
     * Отправить сообщение с файлом
     */
    @PostMapping("/send/{receiverId}/file")
    public ResponseEntity<?> sendMessageWithFile(@PathVariable Long receiverId,
                                                   @RequestParam(value = "content", required = false, defaultValue = "") String content,
                                                   @RequestParam("file") MultipartFile file,
                                                   HttpServletRequest request) {
        User currentUser = sessionManager.getCurrentUser(request);
        if (currentUser == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Не авторизован"));
        }

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Файл пуст"));
        }

        try {
            Map<String, Object> message = chatService.sendMessageWithFile(currentUser, receiverId, content, file);
            return ResponseEntity.ok(message);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Ошибка отправки файла: " + e.getMessage()));
        }
    }

    /**
     * Скачать файл из сообщения
     */
    @GetMapping("/file/{messageId}")
    public ResponseEntity<?> downloadFile(@PathVariable Long messageId, HttpServletRequest request) {
        User currentUser = sessionManager.getCurrentUser(request);
        if (currentUser == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Не авторизован"));
        }

        try {
            ChatMessage msg = chatService.getMessageWithFile(messageId);

            // Проверяем, что пользователь — участник чата
            if (!msg.getSender().getId().equals(currentUser.getId()) &&
                !msg.getReceiver().getId().equals(currentUser.getId())) {
                return ResponseEntity.status(403).body(Map.of("error", "Нет доступа к файлу"));
            }

            if (!msg.hasFile()) {
                return ResponseEntity.notFound().build();
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(msg.getMimeType()));
            headers.setContentLength(msg.getFileSize());

            // Для изображений — inline, для документов — attachment
            if (msg.isImage()) {
                headers.setContentDisposition(ContentDisposition.inline().filename(msg.getFileName()).build());
            } else {
                headers.setContentDisposition(ContentDisposition.attachment().filename(msg.getFileName()).build());
            }

            return new ResponseEntity<>(msg.getFileData(), headers, HttpStatus.OK);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Ошибка загрузки файла: " + e.getMessage()));
        }
    }

    /**
     * Пометить сообщения как прочитанные
     */
    @PostMapping("/read/{senderId}")
    public ResponseEntity<?> markAsRead(@PathVariable Long senderId, HttpServletRequest request) {
        User currentUser = sessionManager.getCurrentUser(request);
        if (currentUser == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Не авторизован"));
        }

        try {
            chatService.markAsRead(senderId, currentUser.getId());
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * Общее количество непрочитанных сообщений
     */
    @GetMapping("/unread")
    public ResponseEntity<?> getUnreadCount(HttpServletRequest request) {
        User currentUser = sessionManager.getCurrentUser(request);
        if (currentUser == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Не авторизован"));
        }

        try {
            long count = chatService.getTotalUnread(currentUser.getId());
            return ResponseEntity.ok(Map.of("unread", count));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}
