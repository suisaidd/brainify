package com.example.brainify.Controllers;

import com.example.brainify.Config.SessionManager;
import com.example.brainify.Model.*;
import com.example.brainify.Repository.StudentTestRepository;
import com.example.brainify.Repository.UserRepository;
import com.example.brainify.Repository.StudentTestAttemptRepository;
import com.example.brainify.Service.TestExecutionService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.HashMap;
import java.util.ArrayList;

@RestController
@RequestMapping("/api/student/{studentId}/tests")
public class StudentTestController {

    @Autowired
    private SessionManager sessionManager;

    @Autowired
    private StudentTestRepository studentTestRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TestExecutionService testExecutionService;

    @Autowired
    private StudentTestAttemptRepository studentTestAttemptRepository;

    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getStudentTests(@PathVariable Long studentId, HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }

        if (!currentUser.getId().equals(studentId) &&
            currentUser.getRole() != UserRole.ADMIN &&
            currentUser.getRole() != UserRole.MANAGER) {
            return ResponseEntity.status(403).build();
        }

        User student = userRepository.findById(studentId).orElse(null);
        if (student == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Ученик не найден"));
        }

        List<StudentTest> basicAssignments = studentTestRepository
                .findByStudentAndTemplate_CategoryOrderByAssignedAtDesc(student, TestTemplateCategory.BASIC)
                .stream()
                .filter(a -> a.getTemplate().getStatus() == TestTemplateStatus.PUBLISHED
                        || a.getTemplate().getStatus() == null) // null = старые тесты до миграции
                .collect(Collectors.toList());

        List<StudentTest> intermediateAssignments = studentTestRepository
                .findByStudentAndTemplate_CategoryOrderByAssignedAtDesc(student, TestTemplateCategory.INTERMEDIATE)
                .stream()
                .filter(a -> a.getTemplate().getStatus() == TestTemplateStatus.PUBLISHED
                        || a.getTemplate().getStatus() == null)
                .collect(Collectors.toList());

        Map<String, Object> response = Map.of(
                "basicTests", basicAssignments.stream().map(this::mapAssignment).collect(Collectors.toList()),
                "intermediateTests", intermediateAssignments.stream().map(this::mapAssignment).collect(Collectors.toList())
        );

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{assignmentId}/detail")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getTestDetail(@PathVariable Long studentId,
                                                             @PathVariable Long assignmentId,
                                                             HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }

        if (!currentUser.getId().equals(studentId)) {
            return ResponseEntity.status(403).build();
        }

        User student = userRepository.findById(studentId).orElse(null);
        if (student == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Ученик не найден"));
        }

        try {
            StudentTest assignment = testExecutionService.getAssignmentForStudent(student, assignmentId);
            List<Map<String, Object>> questions = testExecutionService.getQuestionsForTemplate(assignment.getTemplate()).stream()
                    .map(this::mapQuestionForStudent)
                    .collect(Collectors.toList());

            Map<String, Object> response = new HashMap<>();
            response.put("assignment", mapAssignment(assignment));
            response.put("questions", questions);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @PostMapping("/{assignmentId}/submit")
    @Transactional
    public ResponseEntity<Map<String, Object>> submitTest(@PathVariable Long studentId,
                                                          @PathVariable Long assignmentId,
                                                          @RequestBody Map<String, Object> payload,
                                                          HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }

        if (!currentUser.getId().equals(studentId)) {
            return ResponseEntity.status(403).build();
        }

        User student = userRepository.findById(studentId).orElse(null);
        if (student == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Ученик не найден"));
        }

        Object answersObj = payload.get("answers");
        if (!(answersObj instanceof List<?> answerList) || answerList.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Ответы отсутствуют"));
        }

        Map<Long, String> answersMap = new HashMap<>();
        Map<Long, String> drawingMap = new HashMap<>();
        for (Object element : answerList) {
            if (!(element instanceof Map<?, ?> answerData)) {
                continue;
            }
            Object questionIdObj = answerData.get("questionId");
            if (questionIdObj == null) continue;
            Long questionId = Long.valueOf(questionIdObj.toString());

            Object answerValueObj = answerData.get("answer");
            answersMap.put(questionId, answerValueObj != null ? answerValueObj.toString() : "");

            Object drawingDataObj = answerData.get("drawingData");
            if (drawingDataObj != null && !drawingDataObj.toString().isBlank()) {
                drawingMap.put(questionId, drawingDataObj.toString());
            }
        }

        if (answersMap.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Ответы отсутствуют"));
        }

        try {
            StudentTestAttempt attempt = testExecutionService.evaluateAttempt(student, assignmentId, answersMap, drawingMap);
            StudentTest assignment = testExecutionService.getAssignmentForStudent(student, assignmentId);
            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "attempt", mapAttempt(assignment, attempt)
            ));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        }
    }

    @GetMapping("/results")
    @Transactional(readOnly = true)
    public ResponseEntity<Map<String, Object>> getTestResults(@PathVariable Long studentId, HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }

        if (!currentUser.getId().equals(studentId)) {
            return ResponseEntity.status(403).build();
        }

        User student = userRepository.findById(studentId).orElse(null);
        if (student == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Ученик не найден"));
        }

        List<StudentTest> completed = studentTestRepository.findByStudentAndStatusOrderByAssignedAtDesc(student, StudentTestStatus.COMPLETED);

        List<Map<String, Object>> basicResults = new ArrayList<>();
        List<Map<String, Object>> intermediateResults = new ArrayList<>();

        for (StudentTest assignment : completed) {
            List<StudentTestAttempt> attempts = studentTestAttemptRepository.findByStudentTestOrderBySubmittedAtDesc(assignment);
            for (StudentTestAttempt attempt : attempts) {
                Map<String, Object> attemptData = mapAttempt(assignment, attempt);
                if (assignment.getTemplate().getCategory() == TestTemplateCategory.BASIC) {
                    basicResults.add(attemptData);
                } else {
                    intermediateResults.add(attemptData);
                }
            }
        }

        Map<String, Object> response = new HashMap<>();
        response.put("basic", basicResults);
        response.put("intermediate", intermediateResults);

        return ResponseEntity.ok(response);
    }

    private Map<String, Object> mapAssignment(StudentTest assignment) {
        TestTemplate template = assignment.getTemplate();
        Subject subject = template.getSubject();
        User creator = template.getCreatedBy();

        Map<String, Object> data = new HashMap<>();
        data.put("assignmentId", assignment.getId());
        data.put("templateId", template.getId());
        data.put("title", template.getTitle() != null ? template.getTitle() : "");
        data.put("subjectName", subject != null && subject.getName() != null ? subject.getName() : "Предмет не указан");
        data.put("difficultyLevel", template.getDifficultyLevel());
        data.put("status", assignment.getStatus() != null ? assignment.getStatus().name() : "NEW");
        data.put("assignedAt", assignment.getAssignedAt());
        data.put("createdAt", template.getCreatedAt());
        data.put("createdBy", creator != null && creator.getName() != null ? creator.getName() : "Неизвестно");
        data.put("category", template.getCategory() != null ? template.getCategory().name() : "BASIC");
        return data;
    }

    private Map<String, Object> mapQuestionForStudent(TestQuestion question) {
        Map<String, Object> data = new HashMap<>();
        data.put("id", question.getId());
        data.put("questionNumber", question.getQuestionNumber());
        data.put("questionText", question.getQuestionText());
        data.put("imageUrl", question.getImagePath() != null ? "/tests/media/" + question.getImagePath() : null);
        data.put("displayOrder", question.getDisplayOrder());
        data.put("isExtendedAnswer", question.getIsExtendedAnswer());
        return data;
    }

    private Map<String, Object> mapAttempt(StudentTest assignment, StudentTestAttempt attempt) {
        Map<String, Object> data = new HashMap<>();
        data.put("attemptId", attempt.getId());
        data.put("assignmentId", assignment.getId());
        data.put("templateTitle", assignment.getTemplate().getTitle());
        data.put("subjectName", assignment.getTemplate().getSubject().getName());
        data.put("category", assignment.getTemplate().getCategory().name());
        data.put("submittedAt", attempt.getSubmittedAt());
        data.put("totalQuestions", attempt.getTotalQuestions());
        data.put("correctAnswers", attempt.getCorrectAnswers());
        data.put("scorePercentage", attempt.getScorePercentage());
        data.put("isReviewed", attempt.getIsReviewed());
        data.put("reviewUrl", "/test-builder/review/" + attempt.getId());
        return data;
    }
}

