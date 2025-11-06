package com.example.brainify.Controllers;

import com.example.brainify.Config.SessionManager;
import com.example.brainify.Model.*;
import com.example.brainify.Repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.servlet.http.HttpSession;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.*;

@Controller
@RequestMapping("/api/tasks")
public class TaskAnswerController {

    @Autowired private SessionManager sessionManager;
    @Autowired private BlockTaskAnswerRepository taskAnswerRepository;

    // Загрузка картинки для задания
    @PostMapping("/upload-image")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> uploadTaskImage(
            @RequestParam("file") MultipartFile file,
            @RequestParam("blockId") Long blockId,
            @RequestParam("blockType") String blockType,
            HttpSession session) {
        
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || !currentUser.getRole().name().equals("ADMIN")) {
            return ResponseEntity.status(403).body(Map.of("success", false, "error", "Доступ запрещен"));
        }

        try {
            // Сжатие изображения
            BufferedImage originalImage = ImageIO.read(file.getInputStream());
            if (originalImage == null) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Неверный формат изображения"));
            }

            // Масштабируем до 800px по ширине
            int targetWidth = 800;
            int targetHeight = (int) ((double) originalImage.getHeight() / originalImage.getWidth() * targetWidth);
            
            BufferedImage resizedImage = new BufferedImage(targetWidth, targetHeight, BufferedImage.TYPE_INT_RGB);
            Graphics2D g = resizedImage.createGraphics();
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            g.drawImage(originalImage, 0, 0, targetWidth, targetHeight, null);
            g.dispose();

            // Конвертируем в JPEG с качеством 85%
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(resizedImage, "jpg", baos);
            byte[] imageBytes = baos.toByteArray();

            // Сохраняем или обновляем
            Optional<BlockTaskAnswer> existingOpt = taskAnswerRepository.findByBlockIdAndBlockType(blockId, blockType);
            BlockTaskAnswer answer;
            
            if (existingOpt.isPresent()) {
                answer = existingOpt.get();
            } else {
                answer = new BlockTaskAnswer();
                answer.setBlockId(blockId);
                answer.setBlockType(blockType);
            }
            
            answer.setTaskImage(imageBytes);
            answer.setImageType("image/jpeg");
            taskAnswerRepository.save(answer);

            return ResponseEntity.ok(Map.of(
                "success", true, 
                "imageId", answer.getId(),
                "size", imageBytes.length
            ));

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    // Сохранение правильного ответа
    @PostMapping("/save-answer")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> saveCorrectAnswer(
            @RequestBody Map<String, Object> req,
            HttpSession session) {
        
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || !currentUser.getRole().name().equals("ADMIN")) {
            return ResponseEntity.status(403).body(Map.of("success", false));
        }

        try {
            Long blockId = Long.valueOf(String.valueOf(req.get("blockId")));
            String blockType = String.valueOf(req.get("blockType"));
            String correctAnswer = String.valueOf(req.get("correctAnswer"));

            Optional<BlockTaskAnswer> existingOpt = taskAnswerRepository.findByBlockIdAndBlockType(blockId, blockType);
            BlockTaskAnswer answer;
            
            if (existingOpt.isPresent()) {
                answer = existingOpt.get();
            } else {
                answer = new BlockTaskAnswer();
                answer.setBlockId(blockId);
                answer.setBlockType(blockType);
            }
            
            answer.setCorrectAnswer(correctAnswer);
            taskAnswerRepository.save(answer);

            return ResponseEntity.ok(Map.of("success", true));

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    // Проверка ответа ученика
    @PostMapping("/check-answer")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> checkAnswer(@RequestBody Map<String, Object> req) {
        try {
            Long blockId = Long.valueOf(String.valueOf(req.get("blockId")));
            String blockType = String.valueOf(req.get("blockType"));
            String userAnswer = String.valueOf(req.get("answer")).trim();

            Optional<BlockTaskAnswer> answerOpt = taskAnswerRepository.findByBlockIdAndBlockType(blockId, blockType);
            
            if (answerOpt.isEmpty()) {
                // Нет правильного ответа в БД — считаем неверным, чтобы не принимать всё подряд
                return ResponseEntity.ok(Map.of("success", true, "correct", false, "message", "Неправильно, попробуй ещё раз"));
            }

            String correctAnswer = answerOpt.get().getCorrectAnswer();
            if (correctAnswer == null || correctAnswer.trim().isEmpty()) {
                return ResponseEntity.ok(Map.of("success", true, "correct", false, "message", "Неправильно, попробуй ещё раз"));
            }

            // Сравнение (можно улучшить)
            boolean isCorrect = userAnswer.equalsIgnoreCase(correctAnswer.trim());

            return ResponseEntity.ok(Map.of(
                "success", true,
                "correct", isCorrect,
                "message", isCorrect ? "Правильно! 🎉" : "Неправильно, попробуйте еще раз"
            ));

        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    // Получение картинки задания
    @GetMapping("/image/{blockId}/{blockType}")
    @ResponseBody
    public ResponseEntity<byte[]> getTaskImage(@PathVariable Long blockId, @PathVariable String blockType) {
        Optional<BlockTaskAnswer> answerOpt = taskAnswerRepository.findByBlockIdAndBlockType(blockId, blockType);
        
        if (answerOpt.isEmpty() || answerOpt.get().getTaskImage() == null) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok()
            .header("Content-Type", answerOpt.get().getImageType())
            .body(answerOpt.get().getTaskImage());
    }
}

