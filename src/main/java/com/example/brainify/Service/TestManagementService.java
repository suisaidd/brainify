package com.example.brainify.Service;

import com.example.brainify.Model.*;
import com.example.brainify.Repository.TestQuestionRepository;
import com.example.brainify.Repository.TestTemplateRepository;
import com.example.brainify.Repository.StudentTestRepository;
import com.example.brainify.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class TestManagementService {

    @Autowired
    private TestTemplateRepository testTemplateRepository;

    @Autowired
    private TestQuestionRepository testQuestionRepository;

    @Autowired
    private StudentTestRepository studentTestRepository;

    @Autowired
    private UserRepository userRepository;

    // studentTeacherRepository и subjectRepository — используются в publishTest косвенно через userRepository

    public TestTemplate getTemplateForAdmin(User user, Long templateId) {
        if (user == null || (user.getRole() != UserRole.ADMIN && user.getRole() != UserRole.MANAGER)) {
            throw new IllegalArgumentException("Недостаточно прав для доступа к тесту");
        }

        return testTemplateRepository.findById(templateId)
                .orElseThrow(() -> new IllegalArgumentException("Тест не найден"));
    }

    public TestTemplate getTemplateForTeacher(User user, Long templateId) {
        if (user == null || user.getRole() != UserRole.TEACHER) {
            throw new IllegalArgumentException("Недостаточно прав для доступа к тесту");
        }

        TestTemplate template = testTemplateRepository.findById(templateId)
                .orElseThrow(() -> new IllegalArgumentException("Тест не найден"));

        if (!template.getCreatedBy().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Вы не можете управлять чужим тестом");
        }

        return template;
    }

    public List<TestQuestion> getQuestions(TestTemplate template) {
        return testQuestionRepository.findByTemplateOrderByDisplayOrderAsc(template);
    }

    public TestQuestion getQuestionForCreator(User creator, Long questionId) {
        TestQuestion question = testQuestionRepository.findById(questionId)
                .orElseThrow(() -> new IllegalArgumentException("Задание не найдено"));

        resolveTemplateForCreator(creator, question.getTemplate().getId());
        return question;
    }

    @Transactional
    public TestQuestion addQuestion(User creator,
                                    Long templateId,
                                    String questionNumber,
                                    String questionText,
                                    String correctAnswer,
                                    String imagePath) {
        return addQuestion(creator, templateId, questionNumber, questionText, correctAnswer, imagePath, false);
    }

    @Transactional
    public TestQuestion addQuestion(User creator,
                                    Long templateId,
                                    String questionNumber,
                                    String questionText,
                                    String correctAnswer,
                                    String imagePath,
                                    boolean isExtendedAnswer) {
        TestTemplate template = resolveTemplateForCreator(creator, templateId);

        if (questionNumber == null || questionNumber.isBlank()) {
            throw new IllegalArgumentException("Номер задания обязателен");
        }
        if (questionText == null || questionText.isBlank()) {
            throw new IllegalArgumentException("Условие задания обязательно");
        }
        // Для развёрнутого ответа правильный ответ не обязателен (оценивает учитель)
        if (!isExtendedAnswer && (correctAnswer == null || correctAnswer.isBlank())) {
            throw new IllegalArgumentException("Ответ обязателен");
        }

        TestQuestion question = new TestQuestion();
        question.setTemplate(template);
        question.setQuestionNumber(questionNumber.trim());
        question.setQuestionText(questionText.trim());
        question.setCorrectAnswer(correctAnswer != null ? correctAnswer.trim() : "");
        question.setIsExtendedAnswer(isExtendedAnswer);
        if (imagePath != null && !imagePath.isBlank()) {
            question.setImagePath(imagePath.trim());
        }

        long count = testQuestionRepository.countByTemplate(template);
        question.setDisplayOrder((int) count + 1);

        return testQuestionRepository.save(question);
    }

    @Transactional
    public TestQuestion updateQuestion(User creator,
                                       Long questionId,
                                       String questionNumber,
                                       String questionText,
                                       String correctAnswer,
                                       String imagePath,
                                       boolean removeImage) {
        TestQuestion question = getQuestionForCreator(creator, questionId);

        if (questionNumber != null && !questionNumber.isBlank()) {
            question.setQuestionNumber(questionNumber.trim());
        }

        if (questionText != null && !questionText.isBlank()) {
            question.setQuestionText(questionText.trim());
        }

        if (correctAnswer != null && !correctAnswer.isBlank()) {
            question.setCorrectAnswer(correctAnswer.trim());
        }

        if (removeImage) {
            question.setImagePath(null);
        } else if (imagePath != null && !imagePath.isBlank()) {
            question.setImagePath(imagePath.trim());
        }

        return testQuestionRepository.save(question);
    }

    @Transactional
    public void deleteQuestion(User creator, Long questionId) {
        TestQuestion question = getQuestionForCreator(creator, questionId);
        testQuestionRepository.delete(question);
    }

    /**
     * Изменить порядок заданий
     */
    @Transactional
    public void reorderQuestions(User creator, Long templateId, List<Long> questionIdsInOrder) {
        resolveTemplateForCreator(creator, templateId);
        for (int i = 0; i < questionIdsInOrder.size(); i++) {
            testQuestionRepository.findById(questionIdsInOrder.get(i)).ifPresent(q -> {
                q.setDisplayOrder(questionIdsInOrder.indexOf(q.getId()) + 1);
                testQuestionRepository.save(q);
            });
        }
    }

    /**
     * Опубликовать тест — назначить ученикам
     */
    @Transactional
    public TestTemplate publishTest(User creator, Long templateId, List<Long> studentIds) {
        TestTemplate template = resolveTemplateForCreator(creator, templateId);

        List<TestQuestion> questions = testQuestionRepository.findByTemplateOrderByDisplayOrderAsc(template);
        if (questions.isEmpty()) {
            throw new IllegalArgumentException("Невозможно опубликовать тест без заданий");
        }

        template.setStatus(TestTemplateStatus.PUBLISHED);
        testTemplateRepository.save(template);

        // Назначаем ученикам
        if (studentIds != null && !studentIds.isEmpty()) {
            for (Long studentId : studentIds) {
                User student = userRepository.findById(studentId).orElse(null);
                if (student == null || student.getRole() != UserRole.STUDENT) continue;

                if (studentTestRepository.findByTemplateAndStudent(template, student).isEmpty()) {
                    StudentTest assignment = new StudentTest();
                    assignment.setTemplate(template);
                    assignment.setStudent(student);
                    assignment.setStatus(StudentTestStatus.NEW);
                    studentTestRepository.save(assignment);
                }
            }
        } else if (creator.getRole() == UserRole.ADMIN) {
            // Для админа — назначаем всем ученикам по предмету
            List<User> students = userRepository.findActiveByRoleAndSubject(
                    UserRole.STUDENT, template.getSubject().getId());
            for (User student : students) {
                if (studentTestRepository.findByTemplateAndStudent(template, student).isEmpty()) {
                    StudentTest assignment = new StudentTest();
                    assignment.setTemplate(template);
                    assignment.setStudent(student);
                    assignment.setStatus(StudentTestStatus.NEW);
                    studentTestRepository.save(assignment);
                }
            }
        }

        return template;
    }

    /**
     * Получить шаблон для создателя (админ или учитель)
     */
    public TestTemplate getTemplateForCreator(User creator, Long templateId) {
        return resolveTemplateForCreator(creator, templateId);
    }

    private TestTemplate resolveTemplateForCreator(User creator, Long templateId) {
        if (creator == null) {
            throw new IllegalArgumentException("Пользователь не авторизован");
        }

        if (creator.getRole() == UserRole.ADMIN) {
            return getTemplateForAdmin(creator, templateId);
        }

        if (creator.getRole() == UserRole.TEACHER) {
            return getTemplateForTeacher(creator, templateId);
        }

        throw new IllegalArgumentException("Недостаточно прав для управления тестом");
    }
}
