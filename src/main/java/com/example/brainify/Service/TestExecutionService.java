package com.example.brainify.Service;

import com.example.brainify.Model.*;
import com.example.brainify.Repository.StudentTestAttemptRepository;
import com.example.brainify.Repository.StudentTestRepository;
import com.example.brainify.Repository.TestQuestionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class TestExecutionService {

    @Autowired
    private StudentTestRepository studentTestRepository;

    @Autowired
    private TestQuestionRepository testQuestionRepository;

    @Autowired
    private StudentTestAttemptRepository studentTestAttemptRepository;

    @Autowired
    private ObjectMapper objectMapper;

    public StudentTest getAssignmentForStudent(User student, Long assignmentId) {
        return studentTestRepository.findByIdAndStudent(assignmentId, student)
                .orElseThrow(() -> new IllegalArgumentException("Назначенный тест не найден"));
    }

    public List<TestQuestion> getQuestionsForTemplate(TestTemplate template) {
        return testQuestionRepository.findByTemplateOrderByDisplayOrderAsc(template);
    }

    /**
     * Оценить попытку. answers — карта questionId -> ответ текстом.
     * drawingAnswers — карта questionId -> base64 PNG (для развёрнутых ответов).
     */
    @Transactional
    public StudentTestAttempt evaluateAttempt(User student, Long assignmentId,
                                              Map<Long, String> answers) {
        return evaluateAttempt(student, assignmentId, answers, Collections.emptyMap());
    }

    @Transactional
    public StudentTestAttempt evaluateAttempt(User student, Long assignmentId,
                                              Map<Long, String> answers,
                                              Map<Long, String> drawingAnswers) {
        if (answers == null || answers.isEmpty()) {
            throw new IllegalArgumentException("Ответы отсутствуют");
        }

        StudentTest assignment = getAssignmentForStudent(student, assignmentId);
        TestTemplate template = assignment.getTemplate();
        List<TestQuestion> questions = getQuestionsForTemplate(template);

        if (questions.isEmpty()) {
            throw new IllegalArgumentException("Для теста отсутствуют задания");
        }

        int totalQuestions = questions.size();
        int correctAnswers = 0;
        boolean hasExtended = false;

        List<Map<String, Object>> attemptAnswers = new ArrayList<>();

        for (TestQuestion question : questions) {
            String userAnswer = answers.getOrDefault(question.getId(), "");
            boolean isExtended = Boolean.TRUE.equals(question.getIsExtendedAnswer());

            Map<String, Object> answerInfo = new HashMap<>();
            answerInfo.put("questionId", question.getId());
            answerInfo.put("questionNumber", question.getQuestionNumber());
            answerInfo.put("isExtendedAnswer", isExtended);

            if (isExtended) {
                hasExtended = true;
                // Развёрнутые ответы проверяет учитель
                String drawingData = drawingAnswers != null
                        ? drawingAnswers.getOrDefault(question.getId(), "") : "";
                answerInfo.put("userAnswer", userAnswer);
                answerInfo.put("drawingData", drawingData);
                answerInfo.put("correctAnswer", question.getCorrectAnswer());
                answerInfo.put("isCorrect", false); // Ожидает проверки учителем
                answerInfo.put("teacherGrade", null);
            } else {
                boolean isCorrect = compareAnswers(question.getCorrectAnswer(), userAnswer);
                if (isCorrect) {
                    correctAnswers++;
                }
                answerInfo.put("userAnswer", userAnswer);
                answerInfo.put("correctAnswer", question.getCorrectAnswer());
                answerInfo.put("isCorrect", isCorrect);
            }

            attemptAnswers.add(answerInfo);
        }

        double scorePercentage = totalQuestions > 0
                ? ((double) correctAnswers / (double) totalQuestions) * 100.0 : 0.0;

        StudentTestAttempt attempt = new StudentTestAttempt();
        attempt.setStudentTest(assignment);
        attempt.setTotalQuestions(totalQuestions);
        attempt.setCorrectAnswers(correctAnswers);
        attempt.setScorePercentage(Math.round(scorePercentage * 10.0) / 10.0);
        attempt.setIsReviewed(!hasExtended); // Автоматически проверен если нет развёрнутых
        attempt.setSubmittedAt(LocalDateTime.now());
        try {
            attempt.setAnswersJson(objectMapper.writeValueAsString(attemptAnswers));
        } catch (Exception e) {
            attempt.setAnswersJson("[]");
        }

        StudentTestAttempt savedAttempt = studentTestAttemptRepository.save(attempt);

        assignment.setStatus(StudentTestStatus.COMPLETED);
        assignment.setCompletedAt(savedAttempt.getSubmittedAt());
        studentTestRepository.save(assignment);

        return savedAttempt;
    }

    private boolean compareAnswers(String correct, String userAnswer) {
        if (correct == null) return false;
        if (userAnswer == null) return false;
        return correct.trim().equalsIgnoreCase(userAnswer.trim());
    }
}
