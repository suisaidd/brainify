package com.example.brainify.Controllers;

import com.example.brainify.Config.SessionManager;
import com.example.brainify.Model.*;
import com.example.brainify.Service.TestManagementService;
import com.example.brainify.Repository.StudentTestRepository;
import com.example.brainify.Repository.SubjectRepository;
import com.example.brainify.Repository.TestTemplateRepository;
import com.example.brainify.Service.TestAssignmentService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.Optional;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.io.IOException;

@Controller
@RequestMapping("/admin/tests")
public class AdminTestController {

    @Autowired
    private SessionManager sessionManager;

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private TestTemplateRepository testTemplateRepository;

    @Autowired
    private TestAssignmentService testAssignmentService;

    @Autowired
    private StudentTestRepository studentTestRepository;

    @Autowired
    private TestManagementService testManagementService;

    private static final Path TEST_IMAGE_DIR = Paths.get("uploads", "tests");

    @GetMapping
    public String testsPage(Model model, HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || currentUser.getRole() != UserRole.ADMIN) {
            return "redirect:/auth/login";
        }

        model.addAttribute("pageTitle", "Управление тестами - Brainify");
        model.addAttribute("currentUser", currentUser);
        model.addAttribute("subjects", subjectRepository.findByIsActiveTrueOrderByNameAsc());

        return "admin/tests";
    }

    @GetMapping("/api/basic")
    @Transactional(readOnly = true)
    @ResponseBody
    public ResponseEntity<List<Map<String, Object>>> loadBasicTests(HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || currentUser.getRole() != UserRole.ADMIN) {
            return ResponseEntity.status(403).build();
        }

        List<TestTemplate> templates = testTemplateRepository.findByCategoryOrderByCreatedAtDesc(TestTemplateCategory.BASIC);
        List<Map<String, Object>> response = templates.stream()
                .map(template -> Map.<String, Object>of(
                        "id", template.getId(),
                        "title", template.getTitle(),
                        "subjectId", template.getSubject().getId(),
                        "subjectName", template.getSubject().getName(),
                        "difficultyLevel", template.getDifficultyLevel(),
                        "createdAt", template.getCreatedAt(),
                        "assignedCount", studentTestRepository.countByTemplate(template)
                ))
                .toList();

        return ResponseEntity.ok(response);
    }

    @PostMapping("/api/basic")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> createBasicTest(@RequestBody Map<String, Object> payload,
                                                               HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || currentUser.getRole() != UserRole.ADMIN) {
            return ResponseEntity.status(403).body(Map.of("error", "Доступ запрещён"));
        }

        try {
            Long subjectId = Long.valueOf(payload.get("subjectId").toString());
            Integer difficultyLevel = Integer.valueOf(payload.get("difficultyLevel").toString());
            String title = payload.get("title") != null ? payload.get("title").toString() : null;
            String description = payload.get("description") != null ? payload.get("description").toString() : null;

            TestTemplate template = testAssignmentService.createBasicTest(
                    currentUser,
                    subjectId,
                    difficultyLevel,
                    title,
                    description
            );

            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("templateId", template.getId());
            response.put("title", template.getTitle());
            response.put("subjectId", template.getSubject().getId());
            response.put("difficultyLevel", template.getDifficultyLevel());
            response.put("createdAt", template.getCreatedAt());

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(500).body(Map.of("error", "Не удалось создать тест: " + ex.getMessage()));
        }
    }

    @GetMapping("/api/template/{templateId}")
    @Transactional(readOnly = true)
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getTemplateDetail(@PathVariable Long templateId, HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        try {
            TestTemplate template = testManagementService.getTemplateForAdmin(currentUser, templateId);
            List<Map<String, Object>> questions = testManagementService.getQuestions(template).stream()
                    .map(this::mapQuestion)
                    .collect(Collectors.toList());

            Map<String, Object> response = new HashMap<>();
            response.put("template", mapTemplate(template));
            response.put("questions", questions);

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @PostMapping(value = "/api/template/{templateId}/questions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseBody
    public ResponseEntity<Map<String, Object>> createQuestion(@PathVariable Long templateId,
                                                              @RequestParam("questionNumber") String questionNumber,
                                                              @RequestParam("questionText") String questionText,
                                                              @RequestParam("correctAnswer") String correctAnswer,
                                                              @RequestParam(value = "image", required = false) MultipartFile image,
                                                              HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);

        try {
            String imagePath = image != null && !image.isEmpty() ? saveQuestionImage(image) : null;
            TestQuestion question = testManagementService.addQuestion(currentUser, templateId, questionNumber, questionText, correctAnswer, imagePath);
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "question", mapQuestion(question)
            ));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (IOException io) {
            return ResponseEntity.status(500).body(Map.of("error", "Не удалось сохранить изображение: " + io.getMessage()));
        }
    }

    @PutMapping(value = "/api/questions/{questionId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseBody
    public ResponseEntity<Map<String, Object>> updateQuestion(@PathVariable Long questionId,
                                                              @RequestParam(value = "questionNumber", required = false) String questionNumber,
                                                              @RequestParam(value = "questionText", required = false) String questionText,
                                                              @RequestParam(value = "correctAnswer", required = false) String correctAnswer,
                                                              @RequestParam(value = "image", required = false) MultipartFile image,
                                                              @RequestParam(value = "removeImage", defaultValue = "false") boolean removeImage,
                                                              HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);

        try {
            TestQuestion existing = testManagementService.getQuestionForCreator(currentUser, questionId);
            String newImagePath = existing.getImagePath();
            if (removeImage) {
                deleteQuestionImage(existing.getImagePath());
                newImagePath = null;
            }
            if (image != null && !image.isEmpty()) {
                deleteQuestionImage(existing.getImagePath());
                newImagePath = saveQuestionImage(image);
            }

            TestQuestion updated = testManagementService.updateQuestion(
                    currentUser,
                    questionId,
                    questionNumber,
                    questionText,
                    correctAnswer,
                    newImagePath,
                    removeImage && (image == null || image.isEmpty())
            );

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "question", mapQuestion(updated)
            ));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (IOException io) {
            return ResponseEntity.status(500).body(Map.of("error", "Не удалось сохранить изображение: " + io.getMessage()));
        }
    }

    @DeleteMapping("/api/questions/{questionId}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> deleteQuestion(@PathVariable Long questionId, HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        try {
            TestQuestion existing = testManagementService.getQuestionForCreator(currentUser, questionId);
            deleteQuestionImage(existing.getImagePath());
            testManagementService.deleteQuestion(currentUser, questionId);
            return ResponseEntity.ok(Map.of("status", "success"));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (IOException io) {
            return ResponseEntity.status(500).body(Map.of("error", "Не удалось удалить изображение: " + io.getMessage()));
        }
    }

    private Map<String, Object> mapTemplate(TestTemplate template) {
        Map<String, Object> data = new HashMap<>();
        data.put("id", template.getId());
        data.put("title", template.getTitle());
        data.put("category", template.getCategory().name());
        data.put("subjectId", template.getSubject().getId());
        data.put("subjectName", template.getSubject().getName());
        data.put("difficultyLevel", template.getDifficultyLevel());
        data.put("createdAt", template.getCreatedAt());
        return data;
    }

    private Map<String, Object> mapQuestion(TestQuestion question) {
        Map<String, Object> data = new HashMap<>();
        data.put("id", question.getId());
        data.put("questionNumber", question.getQuestionNumber());
        data.put("questionText", question.getQuestionText());
        data.put("correctAnswer", question.getCorrectAnswer());
        data.put("displayOrder", question.getDisplayOrder());
        data.put("imageUrl", question.getImagePath() != null ? "/tests/media/" + question.getImagePath() : null);
        data.put("imagePath", question.getImagePath());
        return data;
    }

    private String saveQuestionImage(MultipartFile image) throws IOException {
        if (image == null || image.isEmpty()) {
            return null;
        }

        Files.createDirectories(TEST_IMAGE_DIR);

        String extension = Optional.ofNullable(image.getOriginalFilename())
                .filter(name -> name.contains("."))
                .map(name -> name.substring(name.lastIndexOf('.')))
                .orElse(".png");

        String fileName = UUID.randomUUID() + extension;
        Path target = TEST_IMAGE_DIR.resolve(fileName);
        Files.copy(image.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        return fileName;
    }

    private void deleteQuestionImage(String imagePath) throws IOException {
        if (imagePath == null || imagePath.isBlank()) {
            return;
        }

        Path target = TEST_IMAGE_DIR.resolve(imagePath);
        if (Files.exists(target)) {
            Files.delete(target);
        }
    }
}

