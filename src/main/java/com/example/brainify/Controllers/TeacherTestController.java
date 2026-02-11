package com.example.brainify.Controllers;

import com.example.brainify.Config.SessionManager;
import com.example.brainify.Model.*;
import com.example.brainify.Repository.StudentTestRepository;
import com.example.brainify.Repository.TestTemplateRepository;
import com.example.brainify.Repository.StudentTeacherRepository;
import com.example.brainify.Repository.SubjectRepository;
import com.example.brainify.Repository.UserRepository;
import com.example.brainify.Service.TestAssignmentService;
import com.example.brainify.Service.TestManagementService;
import com.example.brainify.Repository.StudentTestAttemptRepository;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.Optional;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Comparator;
import java.util.Locale;

@RestController
@RequestMapping("/api/teacher/tests")
public class TeacherTestController {

    @Autowired
    private SessionManager sessionManager;

    @Autowired
    private TestAssignmentService testAssignmentService;

    @Autowired
    private TestTemplateRepository testTemplateRepository;

    @Autowired
    private StudentTestRepository studentTestRepository;

    @Autowired
    private TestManagementService testManagementService;

    @Autowired
    private StudentTestAttemptRepository studentTestAttemptRepository;

    @Autowired
    private StudentTeacherRepository studentTeacherRepository;

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private UserRepository userRepository;

    private static final Path TEST_IMAGE_DIR = Paths.get("uploads", "tests");

    @GetMapping("/subjects")
    public ResponseEntity<List<Map<String, Object>>> getTeacherSubjects(HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || currentUser.getRole() != UserRole.TEACHER) {
            return ResponseEntity.status(403).build();
        }

        List<Map<String, Object>> subjects = currentUser.getSubjects().stream()
                .filter(Subject::getIsActive)
                .map(subject -> Map.<String, Object>of(
                        "id", subject.getId(),
                        "name", subject.getName()
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(subjects);
    }

    @GetMapping("/students/{subjectId}")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> getStudentsBySubject(@PathVariable Long subjectId, HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || currentUser.getRole() != UserRole.TEACHER) {
            return ResponseEntity.status(403).build();
        }

        Subject subject = subjectRepository.findById(subjectId).orElse(null);
        if (subject == null) {
            return ResponseEntity.badRequest().build();
        }

        List<StudentTeacher> relationships = studentTeacherRepository.findActiveByTeacherAndSubject(currentUser, subject);
        List<Map<String, Object>> students = new ArrayList<>();
        for (StudentTeacher st : relationships) {
            User student = st.getStudent();
            if (student != null && student.getRole() == UserRole.STUDENT) {
                Map<String, Object> studentData = new HashMap<>();
                studentData.put("id", student.getId());
                studentData.put("name", student.getName());
                studentData.put("email", student.getEmail());
                students.add(studentData);
            }
        }

        return ResponseEntity.ok(students);
    }

    @GetMapping("/student/{studentId}/tests")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getStudentTests(@PathVariable Long studentId, HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || currentUser.getRole() != UserRole.TEACHER) {
            return ResponseEntity.status(403).build();
        }

        User student = userRepository.findById(studentId).orElse(null);
        if (student == null || student.getRole() != UserRole.STUDENT) {
            return ResponseEntity.badRequest().build();
        }

        // Проверяем, что ученик закреплён за преподавателем
        List<StudentTeacher> relationships = studentTeacherRepository.findActiveByTeacher(currentUser);
        boolean isAssigned = relationships.stream()
                .anyMatch(st -> st.getStudent().getId().equals(studentId));

        if (!isAssigned) {
            return ResponseEntity.status(403).build();
        }

        List<StudentTest> allTests = studentTestRepository.findByStudentOrderByAssignedAtDesc(student);
        List<StudentTest> completedTests = allTests.stream()
                .filter(t -> t.getStatus() == StudentTestStatus.COMPLETED)
                .collect(Collectors.toList());

        List<Map<String, Object>> results = new ArrayList<>();
        for (StudentTest assignment : completedTests) {
            List<StudentTestAttempt> attempts = studentTestAttemptRepository
                    .findByStudentTestOrderBySubmittedAtDesc(assignment);
            
            for (StudentTestAttempt attempt : attempts) {
                Map<String, Object> attemptData = new HashMap<>();
                attemptData.put("attemptId", attempt.getId());
                attemptData.put("assignmentId", assignment.getId());
                attemptData.put("templateTitle", assignment.getTemplate().getTitle());
                attemptData.put("subjectName", assignment.getTemplate().getSubject().getName());
                attemptData.put("category", assignment.getTemplate().getCategory().name());
                attemptData.put("difficultyLevel", assignment.getTemplate().getDifficultyLevel());
                attemptData.put("submittedAt", attempt.getSubmittedAt());
                attemptData.put("totalQuestions", attempt.getTotalQuestions());
                attemptData.put("correctAnswers", attempt.getCorrectAnswers());
                attemptData.put("scorePercentage", attempt.getScorePercentage());
                attemptData.put("isReviewed", attempt.getIsReviewed());
                attemptData.put("reviewUrl", "/test-builder/review/" + attempt.getId());
                results.add(attemptData);
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("studentId", student.getId());
        response.put("studentName", student.getName());
        response.put("studentEmail", student.getEmail());
        response.put("results", results);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/intermediate")
    public ResponseEntity<Map<String, Object>> createIntermediateTest(@RequestBody Map<String, Object> payload,
                                                                      HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || currentUser.getRole() != UserRole.TEACHER) {
            return ResponseEntity.status(403).body(Map.of("error", "Доступ запрещён"));
        }

        try {
            Long subjectId = Long.valueOf(payload.get("subjectId").toString());
            String title = payload.get("title") != null ? payload.get("title").toString() : null;
            String description = payload.get("description") != null ? payload.get("description").toString() : null;
            
            List<Long> studentIds = null;
            if (payload.get("studentIds") != null && payload.get("studentIds") instanceof List<?>) {
                studentIds = ((List<?>) payload.get("studentIds")).stream()
                        .map(id -> Long.valueOf(id.toString()))
                        .collect(Collectors.toList());
            }

            TestTemplate template = testAssignmentService.createIntermediateTest(
                    currentUser,
                    subjectId,
                    title,
                    description,
                    studentIds
            );

            Map<String, Object> response = new HashMap<>();
            response.put("status", "success");
            response.put("templateId", template.getId());
            response.put("title", template.getTitle());
            response.put("subjectId", template.getSubject().getId());
            response.put("createdAt", template.getCreatedAt());

            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(500).body(Map.of("error", "Не удалось создать тест: " + ex.getMessage()));
        }
    }

    @GetMapping("/intermediate")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> listIntermediateTests(HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || currentUser.getRole() != UserRole.TEACHER) {
            return ResponseEntity.status(403).build();
        }

        List<TestTemplate> templates = testTemplateRepository.findByCreatedByAndCategoryOrderByCreatedAtDesc(
                currentUser,
                TestTemplateCategory.INTERMEDIATE
        );

        List<Map<String, Object>> response = templates.stream()
                .map(template -> Map.<String, Object>of(
                        "id", template.getId(),
                        "title", template.getTitle(),
                        "subjectId", template.getSubject().getId(),
                        "subjectName", template.getSubject().getName(),
                        "createdAt", template.getCreatedAt(),
                        "assignments", studentTestRepository.countByTemplate(template)
                ))
                .collect(Collectors.toList());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/results")
    @Transactional(readOnly = true)
    public ResponseEntity<List<Map<String, Object>>> getTeacherResults(HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || currentUser.getRole() != UserRole.TEACHER) {
            return ResponseEntity.status(403).build();
        }

        List<StudentTest> assignments = studentTestRepository
                .findByTemplate_CreatedByAndStatusOrderByCompletedAtDesc(currentUser, StudentTestStatus.COMPLETED);

        Map<Long, Map<String, Object>> byStudent = new LinkedHashMap<>();

        for (StudentTest assignment : assignments) {
            User student = assignment.getStudent();
            Map<String, Object> studentBucket = byStudent.computeIfAbsent(student.getId(), id -> {
                Map<String, Object> data = new HashMap<>();
                data.put("studentId", student.getId());
                data.put("studentName", student.getName());
                data.put("studentEmail", student.getEmail());
                data.put("results", new ArrayList<Map<String, Object>>());
                return data;
            });

            List<Map<String, Object>> results = (List<Map<String, Object>>) studentBucket.get("results");

            List<StudentTestAttempt> attempts = studentTestAttemptRepository
                    .findByStudentTestOrderBySubmittedAtDesc(assignment);

            for (StudentTestAttempt attempt : attempts) {
                Map<String, Object> attemptData = new HashMap<>();
                attemptData.put("attemptId", attempt.getId());
                attemptData.put("assignmentId", assignment.getId());
                attemptData.put("templateTitle", assignment.getTemplate().getTitle());
                attemptData.put("subjectName", assignment.getTemplate().getSubject().getName());
                attemptData.put("submittedAt", attempt.getSubmittedAt());
                attemptData.put("totalQuestions", attempt.getTotalQuestions());
                attemptData.put("correctAnswers", attempt.getCorrectAnswers());
                attemptData.put("scorePercentage", attempt.getScorePercentage());
                attemptData.put("isReviewed", attempt.getIsReviewed());
                attemptData.put("reviewUrl", "/test-builder/review/" + attempt.getId());
                results.add(attemptData);
            }
        }

        List<Map<String, Object>> response = new ArrayList<>(byStudent.values());
        response.sort(Comparator
                .comparing((Map<String, Object> item) -> ((String) item.getOrDefault("studentName", "")).toLowerCase(Locale.ROOT))
                .thenComparing(item -> ((String) item.getOrDefault("studentEmail", "")).toLowerCase(Locale.ROOT)));
        return ResponseEntity.ok(response);
    }

    @GetMapping("/template/{templateId}")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getTemplateDetail(@PathVariable Long templateId, HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || currentUser.getRole() != UserRole.TEACHER) {
            return ResponseEntity.status(403).build();
        }

        try {
            TestTemplate template = testManagementService.getTemplateForTeacher(currentUser, templateId);
            Map<String, Object> payload = new HashMap<>();
            payload.put("template", mapTemplate(template));
            payload.put("questions", testManagementService.getQuestions(template).stream()
                    .map(this::mapQuestion)
                    .collect(Collectors.toList()));
            return ResponseEntity.ok(payload);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @PostMapping(value = "/template/{templateId}/questions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> createQuestion(@PathVariable Long templateId,
                                                              @RequestParam("questionNumber") String questionNumber,
                                                              @RequestParam("questionText") String questionText,
                                                              @RequestParam("correctAnswer") String correctAnswer,
                                                              @RequestParam(value = "image", required = false) MultipartFile image,
                                                              HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || currentUser.getRole() != UserRole.TEACHER) {
            return ResponseEntity.status(403).body(Map.of("error", "Доступ запрещён"));
        }

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

    @PutMapping(value = "/questions/{questionId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> updateQuestion(@PathVariable Long questionId,
                                                              @RequestParam(value = "questionNumber", required = false) String questionNumber,
                                                              @RequestParam(value = "questionText", required = false) String questionText,
                                                              @RequestParam(value = "correctAnswer", required = false) String correctAnswer,
                                                              @RequestParam(value = "image", required = false) MultipartFile image,
                                                              @RequestParam(value = "removeImage", defaultValue = "false") boolean removeImage,
                                                              HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || currentUser.getRole() != UserRole.TEACHER) {
            return ResponseEntity.status(403).body(Map.of("error", "Доступ запрещён"));
        }

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

    @DeleteMapping("/questions/{questionId}")
    public ResponseEntity<Map<String, Object>> deleteQuestion(@PathVariable Long questionId, HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || currentUser.getRole() != UserRole.TEACHER) {
            return ResponseEntity.status(403).body(Map.of("error", "Доступ запрещён"));
        }

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

        String fileName = java.util.UUID.randomUUID() + extension;
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

