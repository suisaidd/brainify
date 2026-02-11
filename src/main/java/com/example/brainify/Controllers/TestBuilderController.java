package com.example.brainify.Controllers;

import com.example.brainify.Config.SessionManager;
import com.example.brainify.Model.*;
import com.example.brainify.Repository.*;
import com.example.brainify.Service.TestAssignmentService;
import com.example.brainify.Service.TestManagementService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Контроллер «Конструктор теста» — отдельная страница для создания,
 * редактирования заданий, изменения порядка и публикации теста.
 */
@Controller
@RequestMapping("/test-builder")
public class TestBuilderController {

    @Autowired private SessionManager sessionManager;
    @Autowired private TestManagementService testManagementService;
    @Autowired private TestAssignmentService testAssignmentService;
    @Autowired private TestTemplateRepository testTemplateRepository;
    @Autowired private TestQuestionRepository testQuestionRepository;
    @Autowired private StudentTestAttemptRepository studentTestAttemptRepository;
    @Autowired private StudentTeacherRepository studentTeacherRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ObjectMapper objectMapper;

    private static final Path TEST_IMAGE_DIR = Paths.get("uploads", "tests");

    // ──────────── Страницы ────────────

    /** Страница создания нового теста (без templateId) */
    @GetMapping("/new")
    public String newTestPage(Model model, HttpSession session) {
        User user = requireCreator(session);
        model.addAttribute("currentUser", user);
        model.addAttribute("templateId", 0);
        model.addAttribute("pageTitle", "Создать тест — Brainify");
        return "test-builder";
    }

    /** Страница редактирования существующего теста */
    @GetMapping("/{templateId}")
    @Transactional(readOnly = true)
    public String editTestPage(@PathVariable Long templateId, Model model, HttpSession session) {
        User user = requireCreator(session);
        testManagementService.getTemplateForCreator(user, templateId);
        model.addAttribute("currentUser", user);
        model.addAttribute("templateId", templateId);
        model.addAttribute("pageTitle", "Редактор теста — Brainify");
        return "test-builder";
    }

    /** Страница просмотра результатов теста учеником или учителем */
    @GetMapping("/review/{attemptId}")
    @Transactional(readOnly = true)
    public String reviewPage(@PathVariable Long attemptId, Model model, HttpSession session) {
        User user = sessionManager.getCurrentUser(session);
        if (user == null) return "redirect:/auth/login";

        StudentTestAttempt attempt = studentTestAttemptRepository.findById(attemptId)
                .orElseThrow(() -> new IllegalArgumentException("Попытка не найдена"));

        StudentTest assignment = attempt.getStudentTest();
        // Ученик видит свои результаты, учитель/админ — результаты своих учеников
        boolean isStudent = user.getId().equals(assignment.getStudent().getId());
        boolean isCreator = user.getId().equals(assignment.getTemplate().getCreatedBy().getId());
        boolean isAdmin = user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.MANAGER;

        if (!isStudent && !isCreator && !isAdmin) {
            return "redirect:/dashboard";
        }

        model.addAttribute("currentUser", user);
        model.addAttribute("attemptId", attemptId);
        model.addAttribute("canGrade", isCreator || isAdmin);
        model.addAttribute("pageTitle", "Результаты теста — Brainify");
        return "test-review";
    }

    // ──────────── API: Тест ────────────

    /** Создать тест (вернуть id для перехода на страницу конструктора) */
    @PostMapping("/api/create")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> createTest(@RequestBody Map<String, Object> payload,
                                                          HttpSession session) {
        User user = requireCreator(session);
        try {
            Long subjectId = Long.valueOf(payload.get("subjectId").toString());
            String title = payload.getOrDefault("title", "").toString();
            String description = payload.getOrDefault("description", "").toString();
            String categoryStr = payload.getOrDefault("category", "INTERMEDIATE").toString();
            Integer difficulty = payload.get("difficultyLevel") != null
                    ? Integer.valueOf(payload.get("difficultyLevel").toString()) : 3;

            TestTemplate template;
            if ("BASIC".equals(categoryStr) && (user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.MANAGER)) {
                template = testAssignmentService.createBasicTest(user, subjectId, difficulty, title, description);
            } else {
                template = testAssignmentService.createIntermediateTest(user, subjectId, title, description, null);
            }

            return ResponseEntity.ok(Map.of("status", "success", "templateId", template.getId()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Получить данные теста */
    @GetMapping("/api/{templateId}")
    @ResponseBody
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getTest(@PathVariable Long templateId, HttpSession session) {
        User user = requireCreator(session);
        try {
            TestTemplate template = testManagementService.getTemplateForCreator(user, templateId);
            List<TestQuestion> questions = testManagementService.getQuestions(template);
            Map<String, Object> resp = new HashMap<>();
            resp.put("template", mapTemplate(template));
            resp.put("questions", questions.stream().map(this::mapQuestion).collect(Collectors.toList()));
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Обновить метаданные теста */
    @PutMapping("/api/{templateId}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> updateTest(@PathVariable Long templateId,
                                                          @RequestBody Map<String, Object> payload,
                                                          HttpSession session) {
        User user = requireCreator(session);
        try {
            TestTemplate template = testManagementService.getTemplateForCreator(user, templateId);
            if (payload.containsKey("title"))
                template.setTitle(payload.get("title").toString().trim());
            if (payload.containsKey("description"))
                template.setDescription(payload.get("description").toString().trim());
            testTemplateRepository.save(template);
            return ResponseEntity.ok(Map.of("status", "success"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ──────────── API: Задания ────────────

    @PostMapping(value = "/api/{templateId}/questions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseBody
    public ResponseEntity<Map<String, Object>> addQuestion(
            @PathVariable Long templateId,
            @RequestParam("questionNumber") String questionNumber,
            @RequestParam("questionText") String questionText,
            @RequestParam(value = "correctAnswer", defaultValue = "") String correctAnswer,
            @RequestParam(value = "isExtendedAnswer", defaultValue = "false") boolean isExtendedAnswer,
            @RequestParam(value = "image", required = false) MultipartFile image,
            HttpSession session) {
        User user = requireCreator(session);
        try {
            String imagePath = saveImage(image);
            TestQuestion q = testManagementService.addQuestion(
                    user, templateId, questionNumber, questionText, correctAnswer, imagePath, isExtendedAnswer);
            return ResponseEntity.ok(Map.of("status", "success", "question", mapQuestion(q)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping(value = "/api/questions/{questionId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseBody
    public ResponseEntity<Map<String, Object>> updateQuestion(
            @PathVariable Long questionId,
            @RequestParam(value = "questionNumber", required = false) String questionNumber,
            @RequestParam(value = "questionText", required = false) String questionText,
            @RequestParam(value = "correctAnswer", required = false) String correctAnswer,
            @RequestParam(value = "isExtendedAnswer", required = false) Boolean isExtendedAnswer,
            @RequestParam(value = "image", required = false) MultipartFile image,
            @RequestParam(value = "removeImage", defaultValue = "false") boolean removeImage,
            HttpSession session) {
        User user = requireCreator(session);
        try {
            TestQuestion existing = testManagementService.getQuestionForCreator(user, questionId);
            String newImagePath = existing.getImagePath();
            if (removeImage) { deleteImage(existing.getImagePath()); newImagePath = null; }
            if (image != null && !image.isEmpty()) { deleteImage(existing.getImagePath()); newImagePath = saveImage(image); }

            TestQuestion updated = testManagementService.updateQuestion(
                    user, questionId, questionNumber, questionText, correctAnswer, newImagePath,
                    removeImage && (image == null || image.isEmpty()));

            if (isExtendedAnswer != null) {
                updated.setIsExtendedAnswer(isExtendedAnswer);
                testQuestionRepository.save(updated);
            }

            return ResponseEntity.ok(Map.of("status", "success", "question", mapQuestion(updated)));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/api/questions/{questionId}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> deleteQuestion(@PathVariable Long questionId, HttpSession session) {
        User user = requireCreator(session);
        try {
            TestQuestion existing = testManagementService.getQuestionForCreator(user, questionId);
            deleteImage(existing.getImagePath());
            testManagementService.deleteQuestion(user, questionId);
            return ResponseEntity.ok(Map.of("status", "success"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Изменить порядок заданий */
    @PostMapping("/api/{templateId}/reorder")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> reorderQuestions(
            @PathVariable Long templateId,
            @RequestBody Map<String, Object> payload,
            HttpSession session) {
        User user = requireCreator(session);
        try {
            @SuppressWarnings("unchecked")
            List<Number> ids = (List<Number>) payload.get("questionIds");
            List<Long> questionIds = ids.stream().map(Number::longValue).collect(Collectors.toList());
            testManagementService.reorderQuestions(user, templateId, questionIds);
            return ResponseEntity.ok(Map.of("status", "success"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ──────────── API: Публикация ────────────

    /** Получить список учеников для назначения */
    @GetMapping("/api/{templateId}/students")
    @ResponseBody
    @Transactional(readOnly = true)
    public ResponseEntity<?> getStudentsForAssignment(@PathVariable Long templateId, HttpSession session) {
        User user = requireCreator(session);
        try {
            TestTemplate template = testManagementService.getTemplateForCreator(user, templateId);
            List<Map<String, Object>> students = new ArrayList<>();

            if (user.getRole() == UserRole.TEACHER) {
                List<StudentTeacher> rels = studentTeacherRepository.findActiveByTeacherAndSubject(user, template.getSubject());
                for (StudentTeacher st : rels) {
                    User s = st.getStudent();
                    if (s != null && s.getRole() == UserRole.STUDENT) {
                        students.add(Map.of("id", s.getId(), "name", s.getName(), "email", s.getEmail()));
                    }
                }
            } else {
                List<User> all = userRepository.findActiveByRoleAndSubject(UserRole.STUDENT, template.getSubject().getId());
                for (User s : all) {
                    students.add(Map.of("id", s.getId(), "name", s.getName(), "email", s.getEmail()));
                }
            }
            return ResponseEntity.ok(students);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Опубликовать тест и назначить ученикам */
    @PostMapping("/api/{templateId}/publish")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> publishTest(@PathVariable Long templateId,
                                                           @RequestBody Map<String, Object> payload,
                                                           HttpSession session) {
        User user = requireCreator(session);
        try {
            @SuppressWarnings("unchecked")
            List<Number> ids = payload.get("studentIds") != null
                    ? ((List<Number>) payload.get("studentIds")) : Collections.emptyList();
            List<Long> studentIds = ids.stream().map(Number::longValue).collect(Collectors.toList());

            TestTemplate published = testManagementService.publishTest(user, templateId, studentIds);
            return ResponseEntity.ok(Map.of("status", "success", "templateId", published.getId()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ──────────── API: Просмотр результатов ────────────

    /** Получить детали попытки (для страницы review) */
    @GetMapping("/api/review/{attemptId}")
    @ResponseBody
    @Transactional(readOnly = true)
    public ResponseEntity<?> getAttemptReview(@PathVariable Long attemptId, HttpSession session) {
        User user = sessionManager.getCurrentUser(session);
        if (user == null) return ResponseEntity.status(401).build();

        try {
            StudentTestAttempt attempt = studentTestAttemptRepository.findById(attemptId)
                    .orElseThrow(() -> new IllegalArgumentException("Попытка не найдена"));

            StudentTest assignment = attempt.getStudentTest();
            TestTemplate template = assignment.getTemplate();

            boolean isStudent = user.getId().equals(assignment.getStudent().getId());
            boolean isCreator = user.getId().equals(template.getCreatedBy().getId());
            boolean isAdmin = user.getRole() == UserRole.ADMIN || user.getRole() == UserRole.MANAGER;
            if (!isStudent && !isCreator && !isAdmin) {
                return ResponseEntity.status(403).body(Map.of("error", "Нет доступа"));
            }

            List<TestQuestion> questions = testManagementService.getQuestions(template);

            // Парсим answersJson
            List<Map<String, Object>> answers = new ArrayList<>();
            if (attempt.getAnswersJson() != null && !attempt.getAnswersJson().isBlank()) {
                try {
                    answers = objectMapper.readValue(attempt.getAnswersJson(),
                            new TypeReference<List<Map<String, Object>>>() {});
                } catch (Exception ignore) {}
            }

            // Собираем полные данные
            Map<Long, Map<String, Object>> answersByQId = new HashMap<>();
            for (Map<String, Object> a : answers) {
                Object qid = a.get("questionId");
                if (qid != null) {
                    answersByQId.put(Long.valueOf(qid.toString()), a);
                }
            }

            List<Map<String, Object>> reviewItems = new ArrayList<>();
            for (TestQuestion q : questions) {
                Map<String, Object> item = new HashMap<>();
                item.put("questionId", q.getId());
                item.put("questionNumber", q.getQuestionNumber());
                item.put("questionText", q.getQuestionText());
                item.put("isExtendedAnswer", q.getIsExtendedAnswer());
                item.put("imageUrl", q.getImagePath() != null ? "/tests/media/" + q.getImagePath() : null);
                item.put("correctAnswer", q.getCorrectAnswer());

                Map<String, Object> ans = answersByQId.getOrDefault(q.getId(), Collections.emptyMap());
                item.put("userAnswer", ans.getOrDefault("userAnswer", ""));
                item.put("isCorrect", ans.getOrDefault("isCorrect", false));
                item.put("drawingData", ans.getOrDefault("drawingData", null));
                item.put("teacherGrade", ans.getOrDefault("teacherGrade", null));
                reviewItems.add(item);
            }

            Map<String, Object> resp = new HashMap<>();
            resp.put("templateTitle", template.getTitle());
            resp.put("subjectName", template.getSubject().getName());
            resp.put("studentName", assignment.getStudent().getName());
            resp.put("submittedAt", attempt.getSubmittedAt());
            resp.put("totalQuestions", attempt.getTotalQuestions());
            resp.put("correctAnswers", attempt.getCorrectAnswers());
            resp.put("scorePercentage", attempt.getScorePercentage());
            resp.put("isReviewed", attempt.getIsReviewed());
            resp.put("canGrade", isCreator || isAdmin);
            resp.put("items", reviewItems);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** Учитель оценивает развёрнутые ответы */
    @PostMapping("/api/review/{attemptId}/grade")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> gradeAttempt(@PathVariable Long attemptId,
                                                            @RequestBody Map<String, Object> payload,
                                                            HttpSession session) {
        requireCreator(session); // проверка авторизации
        try {
            StudentTestAttempt attempt = studentTestAttemptRepository.findById(attemptId)
                    .orElseThrow(() -> new IllegalArgumentException("Попытка не найдена"));

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> grades = (List<Map<String, Object>>) payload.get("grades");

            // Парсим существующие ответы
            List<Map<String, Object>> answers = new ArrayList<>();
            if (attempt.getAnswersJson() != null && !attempt.getAnswersJson().isBlank()) {
                try {
                    answers = objectMapper.readValue(attempt.getAnswersJson(),
                            new TypeReference<List<Map<String, Object>>>() {});
                } catch (Exception ignore) {}
            }

            // Обновляем оценки
            Map<Long, String> gradeMap = new HashMap<>();
            for (Map<String, Object> g : grades) {
                Long qId = Long.valueOf(g.get("questionId").toString());
                String grade = g.get("grade").toString(); // "correct" или "incorrect"
                gradeMap.put(qId, grade);
            }

            int correctCount = 0;
            for (Map<String, Object> a : answers) {
                Long qId = Long.valueOf(a.get("questionId").toString());
                if (gradeMap.containsKey(qId)) {
                    String grade = gradeMap.get(qId);
                    a.put("teacherGrade", grade);
                    a.put("isCorrect", "correct".equals(grade));
                }
                if (Boolean.TRUE.equals(a.get("isCorrect"))) correctCount++;
            }

            attempt.setAnswersJson(objectMapper.writeValueAsString(answers));
            attempt.setCorrectAnswers(correctCount);
            attempt.setScorePercentage(
                    Math.round(((double) correctCount / attempt.getTotalQuestions()) * 1000.0) / 10.0);
            attempt.setIsReviewed(true);
            attempt.setReviewedAt(LocalDateTime.now());
            studentTestAttemptRepository.save(attempt);

            return ResponseEntity.ok(Map.of("status", "success",
                    "correctAnswers", correctCount,
                    "scorePercentage", attempt.getScorePercentage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    // ──────────── API: Тесты конкретного ученика (для админки) ────────────

    /** Получить все тестовые попытки ученика (для admin panel) */
    @GetMapping("/api/student/{studentId}/attempts")
    @ResponseBody
    @Transactional(readOnly = true)
    public ResponseEntity<?> getStudentAttempts(@PathVariable Long studentId, HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) return ResponseEntity.status(401).build();
        if (currentUser.getRole() != UserRole.ADMIN && currentUser.getRole() != UserRole.MANAGER
                && currentUser.getRole() != UserRole.TEACHER) {
            return ResponseEntity.status(403).body(Map.of("error", "Недостаточно прав"));
        }

        User student = userRepository.findById(studentId).orElse(null);
        if (student == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Ученик не найден"));
        }

        List<StudentTest> assignments = testAssignmentService.getStudentAssignments(student);
        List<Map<String, Object>> results = new ArrayList<>();

        for (StudentTest st : assignments) {
            List<StudentTestAttempt> attempts = studentTestAttemptRepository
                    .findByStudentTestOrderBySubmittedAtDesc(st);
            TestTemplate template = st.getTemplate();

            Map<String, Object> item = new HashMap<>();
            item.put("assignmentId", st.getId());
            item.put("templateId", template.getId());
            item.put("testTitle", template.getTitle());
            item.put("subjectName", template.getSubject().getName());
            item.put("category", template.getCategory().name());
            item.put("status", st.getStatus().name());
            item.put("assignedAt", st.getAssignedAt());

            if (!attempts.isEmpty()) {
                StudentTestAttempt lastAttempt = attempts.get(0);
                item.put("attemptId", lastAttempt.getId());
                item.put("submittedAt", lastAttempt.getSubmittedAt());
                item.put("totalQuestions", lastAttempt.getTotalQuestions());
                item.put("correctAnswers", lastAttempt.getCorrectAnswers());
                item.put("scorePercentage", lastAttempt.getScorePercentage());
                item.put("isReviewed", lastAttempt.getIsReviewed());
            }

            results.add(item);
        }

        return ResponseEntity.ok(results);
    }

    // ──────────── Helpers ────────────

    private User requireCreator(HttpSession session) {
        User user = sessionManager.getCurrentUser(session);
        if (user == null) throw new IllegalArgumentException("Не авторизован");
        if (user.getRole() != UserRole.ADMIN && user.getRole() != UserRole.MANAGER && user.getRole() != UserRole.TEACHER) {
            throw new IllegalArgumentException("Недостаточно прав");
        }
        return user;
    }

    private Map<String, Object> mapTemplate(TestTemplate t) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", t.getId());
        m.put("title", t.getTitle());
        m.put("description", t.getDescription());
        m.put("category", t.getCategory().name());
        m.put("status", t.getStatus().name());
        m.put("subjectId", t.getSubject().getId());
        m.put("subjectName", t.getSubject().getName());
        m.put("difficultyLevel", t.getDifficultyLevel());
        m.put("createdAt", t.getCreatedAt());
        return m;
    }

    private Map<String, Object> mapQuestion(TestQuestion q) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", q.getId());
        m.put("questionNumber", q.getQuestionNumber());
        m.put("questionText", q.getQuestionText());
        m.put("correctAnswer", q.getCorrectAnswer());
        m.put("isExtendedAnswer", q.getIsExtendedAnswer());
        m.put("displayOrder", q.getDisplayOrder());
        m.put("imageUrl", q.getImagePath() != null ? "/tests/media/" + q.getImagePath() : null);
        return m;
    }

    private String saveImage(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) return null;
        Files.createDirectories(TEST_IMAGE_DIR);
        String ext = Optional.ofNullable(file.getOriginalFilename())
                .filter(n -> n.contains(".")).map(n -> n.substring(n.lastIndexOf('.'))).orElse(".png");
        String name = UUID.randomUUID() + ext;
        Files.copy(file.getInputStream(), TEST_IMAGE_DIR.resolve(name), StandardCopyOption.REPLACE_EXISTING);
        return name;
    }

    private void deleteImage(String path) {
        if (path == null || path.isBlank()) return;
        try { Files.deleteIfExists(TEST_IMAGE_DIR.resolve(path)); } catch (IOException ignored) {}
    }
}
