package com.example.brainify.Controllers;

import com.example.brainify.Model.Lesson;
import com.example.brainify.Service.WhiteboardService;
import com.example.brainify.Repository.LessonRepository;
import com.example.brainify.Config.SessionManager;
import com.example.brainify.Model.User;
import com.example.brainify.Model.UserRole;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.Base64;

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

    private static final String IMAGE_STORAGE_DIR = "uploads/whiteboard-images";
    
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
            
            // Получаем текущую версию из запроса (опционально)
            Long clientVersion = null;
            Object versionObj = request.get("version");
            if (versionObj != null) {
                if (versionObj instanceof Number) {
                    clientVersion = ((Number) versionObj).longValue();
                } else if (versionObj instanceof String) {
                    try {
                        clientVersion = Long.parseLong((String) versionObj);
                    } catch (NumberFormatException e) {
                        // Игнорируем ошибку парсинга
                    }
                }
            }
            
            var boardState = whiteboardService.saveBoardState(lessonId, boardData, clientVersion);
            
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
     * API для загрузки изображения доски в файловое хранилище.
     * Возвращает URL, который можно хранить в board_data вместо base64.
     */
    @PostMapping("/api/upload-image/{lessonId}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> uploadImage(
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

            Optional<Lesson> lessonOpt = lessonRepository.findById(lessonId);
            if (lessonOpt.isEmpty()) {
                response.put("success", false);
                response.put("message", "Урок не найден");
                return ResponseEntity.badRequest().body(response);
            }

            Lesson lesson = lessonOpt.get();
            boolean hasAccess = false;
            if (currentUser.getRole().equals(UserRole.ADMIN) || currentUser.getRole().equals(UserRole.MANAGER)) {
                hasAccess = true;
            } else if (lesson.getStudent() != null && lesson.getStudent().getId().equals(currentUser.getId())) {
                hasAccess = true;
            } else if (lesson.getTeacher() != null && lesson.getTeacher().getId().equals(currentUser.getId())) {
                hasAccess = true;
            }
            if (!hasAccess) {
                response.put("success", false);
                response.put("message", "Нет доступа к уроку");
                return ResponseEntity.status(403).body(response);
            }

            String dataUrl = (String) request.get("dataUrl");
            if (dataUrl == null || dataUrl.isBlank() || !dataUrl.startsWith("data:image/")) {
                response.put("success", false);
                response.put("message", "Некорректные данные изображения");
                return ResponseEntity.badRequest().body(response);
            }

            int commaIdx = dataUrl.indexOf(',');
            if (commaIdx < 0) {
                response.put("success", false);
                response.put("message", "Некорректный формат data URL");
                return ResponseEntity.badRequest().body(response);
            }

            String meta = dataUrl.substring(0, commaIdx);
            String base64Data = dataUrl.substring(commaIdx + 1);

            String ext = ".bin";
            if (meta.contains("image/png")) ext = ".png";
            else if (meta.contains("image/jpeg")) ext = ".jpg";
            else if (meta.contains("image/webp")) ext = ".webp";
            else if (meta.contains("image/gif")) ext = ".gif";

            byte[] bytes = Base64.getDecoder().decode(base64Data);
            if (bytes.length > 20 * 1024 * 1024) {
                response.put("success", false);
                response.put("message", "Изображение слишком большое");
                return ResponseEntity.badRequest().body(response);
            }

            Path lessonDir = Paths.get(IMAGE_STORAGE_DIR, String.valueOf(lessonId)).toAbsolutePath().normalize();
            Files.createDirectories(lessonDir);

            String fileName = UUID.randomUUID() + ext;
            Path filePath = lessonDir.resolve(fileName);
            Files.write(filePath, bytes);

            String imageUrl = "/whiteboard-images/" + lessonId + "/" + fileName;
            // Возвращаем URL через контроллер, чтобы исключить проблемы с относительными путями
            // и гарантировать доступ только участникам урока.
            imageUrl = "/whiteboard/api/image/" + lessonId + "/" + fileName;
            response.put("success", true);
            response.put("url", imageUrl);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException e) {
            response.put("success", false);
            response.put("message", "Некорректный base64 изображения");
            return ResponseEntity.badRequest().body(response);
        } catch (IOException e) {
            logger.error("Ошибка сохранения изображения доски: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "Ошибка сохранения изображения");
            return ResponseEntity.status(500).body(response);
        } catch (Exception e) {
            logger.error("Ошибка upload-image: {}", e.getMessage(), e);
            response.put("success", false);
            response.put("message", "Ошибка: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    @GetMapping("/api/image/{lessonId}/{fileName:.+}")
    @ResponseBody
    public ResponseEntity<Resource> getWhiteboardImage(
            @PathVariable Long lessonId,
            @PathVariable String fileName,
            HttpSession session) {
        try {
            User currentUser = sessionManager.getCurrentUser(session);
            if (currentUser == null) {
                return ResponseEntity.status(401).build();
            }

            Optional<Lesson> lessonOpt = lessonRepository.findById(lessonId);
            if (lessonOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }

            Lesson lesson = lessonOpt.get();
            boolean hasAccess = false;
            if (currentUser.getRole().equals(UserRole.ADMIN) || currentUser.getRole().equals(UserRole.MANAGER)) {
                hasAccess = true;
            } else if (lesson.getStudent() != null && lesson.getStudent().getId().equals(currentUser.getId())) {
                hasAccess = true;
            } else if (lesson.getTeacher() != null && lesson.getTeacher().getId().equals(currentUser.getId())) {
                hasAccess = true;
            }

            if (!hasAccess) {
                return ResponseEntity.status(403).build();
            }

            Path lessonDir = Paths.get(IMAGE_STORAGE_DIR, String.valueOf(lessonId)).toAbsolutePath().normalize();
            Path filePath = lessonDir.resolve(fileName).normalize();

            // Защита от path traversal
            if (!filePath.startsWith(lessonDir)) {
                return ResponseEntity.badRequest().build();
            }
            if (!Files.exists(filePath) || !Files.isRegularFile(filePath)) {
                return ResponseEntity.notFound().build();
            }

            Resource resource = new UrlResource(filePath.toUri());
            String contentType = Files.probeContentType(filePath);
            MediaType mediaType = MediaType.APPLICATION_OCTET_STREAM;
            if (contentType != null) {
                try {
                    mediaType = MediaType.parseMediaType(contentType);
                } catch (Exception ignored) {
                }
            }

            return ResponseEntity.ok()
                    .contentType(mediaType)
                    .header(HttpHeaders.CACHE_CONTROL, "public, max-age=31536000")
                    .body(resource);
        } catch (Exception e) {
            logger.error("Ошибка выдачи изображения доски: {}", e.getMessage(), e);
            return ResponseEntity.status(500).build();
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

