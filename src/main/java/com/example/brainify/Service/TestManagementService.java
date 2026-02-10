package com.example.brainify.Service;

import com.example.brainify.Model.TestQuestion;
import com.example.brainify.Model.TestTemplate;
import com.example.brainify.Model.TestTemplateCategory;
import com.example.brainify.Model.User;
import com.example.brainify.Model.UserRole;
import com.example.brainify.Repository.TestQuestionRepository;
import com.example.brainify.Repository.TestTemplateRepository;
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

    public TestTemplate getTemplateForAdmin(User user, Long templateId) {
        if (user == null || user.getRole() != UserRole.ADMIN) {
            throw new IllegalArgumentException("Недостаточно прав для доступа к тесту");
        }

        return testTemplateRepository.findById(templateId)
                .map(template -> {
                    if (template.getCategory() != TestTemplateCategory.BASIC) {
                        throw new IllegalArgumentException("Администратор может управлять только базовыми тестами");
                    }
                    return template;
                })
                .orElseThrow(() -> new IllegalArgumentException("Тест не найден"));
    }

    public TestTemplate getTemplateForTeacher(User user, Long templateId) {
        if (user == null || user.getRole() != UserRole.TEACHER) {
            throw new IllegalArgumentException("Недостаточно прав для доступа к тесту");
        }

        TestTemplate template = testTemplateRepository.findById(templateId)
                .orElseThrow(() -> new IllegalArgumentException("Тест не найден"));

        if (template.getCategory() != TestTemplateCategory.INTERMEDIATE) {
            throw new IllegalArgumentException("Преподаватель может управлять только промежуточными тестами");
        }

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
        TestTemplate template = resolveTemplateForCreator(creator, templateId);

        if (questionNumber == null || questionNumber.isBlank()) {
            throw new IllegalArgumentException("Номер задания обязателен");
        }
        if (questionText == null || questionText.isBlank()) {
            throw new IllegalArgumentException("Условие задания обязательно");
        }
        if (correctAnswer == null || correctAnswer.isBlank()) {
            throw new IllegalArgumentException("Ответ обязателен");
        }

        TestQuestion question = new TestQuestion();
        question.setTemplate(template);
        question.setQuestionNumber(questionNumber.trim());
        question.setQuestionText(questionText.trim());
        question.setCorrectAnswer(correctAnswer.trim());
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
