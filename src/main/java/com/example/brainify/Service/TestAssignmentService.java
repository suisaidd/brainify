package com.example.brainify.Service;

import com.example.brainify.Model.*;
import com.example.brainify.Repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
public class TestAssignmentService {

    @Autowired
    private TestTemplateRepository testTemplateRepository;

    @Autowired
    private StudentTestRepository studentTestRepository;

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentTeacherRepository studentTeacherRepository;

    @Transactional
    public TestTemplate createBasicTest(User creator, Long subjectId, Integer difficultyLevel, String title, String description) {
        if (creator == null || (creator.getRole() != UserRole.ADMIN && creator.getRole() != UserRole.MANAGER)) {
            throw new IllegalArgumentException("Недостаточно прав для создания базового теста");
        }

        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new IllegalArgumentException("Предмет не найден"));

        if (difficultyLevel == null || difficultyLevel < 1 || difficultyLevel > 5) {
            throw new IllegalArgumentException("Уровень сложности должен быть в диапазоне от 1 до 5");
        }

        TestTemplate template = new TestTemplate();
        template.setCategory(TestTemplateCategory.BASIC);
        template.setSubject(subject);
        template.setCreatedBy(creator);
        template.setDifficultyLevel(difficultyLevel);
        template.setTitle(title != null && !title.isBlank()
                ? title.trim()
                : String.format("Базовый тест по предмету \"%s\" (уровень %d)", subject.getName(), difficultyLevel));
        template.setDescription(description != null ? description.trim() : null);

        TestTemplate savedTemplate = testTemplateRepository.save(template);

        List<User> students = userRepository.findActiveByRoleAndSubject(UserRole.STUDENT, subjectId);
        for (User student : students) {
            if (studentTestRepository.findByTemplateAndStudent(savedTemplate, student).isEmpty()) {
                StudentTest assignment = new StudentTest();
                assignment.setTemplate(savedTemplate);
                assignment.setStudent(student);
                assignment.setStatus(StudentTestStatus.NEW);
                studentTestRepository.save(assignment);
            }
        }

        return savedTemplate;
    }

    @Transactional
    public TestTemplate createIntermediateTest(User teacher, Long subjectId, String title, String description, List<Long> studentIds) {
        if (teacher == null || teacher.getRole() != UserRole.TEACHER) {
            throw new IllegalArgumentException("Недостаточно прав для создания промежуточного теста");
        }

        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new IllegalArgumentException("Предмет не найден"));

        boolean teachesSubject = teacher.getSubjects().stream()
                .anyMatch(s -> s.getId().equals(subject.getId()));

        if (!teachesSubject) {
            throw new IllegalArgumentException("Преподаватель не привязан к выбранному предмету");
        }

        TestTemplate template = new TestTemplate();
        template.setCategory(TestTemplateCategory.INTERMEDIATE);
        template.setSubject(subject);
        template.setCreatedBy(teacher);
        template.setTitle(title != null && !title.isBlank()
                ? title.trim()
                : String.format("Промежуточный тест по предмету \"%s\"", subject.getName()));
        template.setDescription(description != null ? description.trim() : null);

        TestTemplate savedTemplate = testTemplateRepository.save(template);

        if (studentIds != null && !studentIds.isEmpty()) {
            // Назначаем тест выбранным ученикам
            for (Long studentId : studentIds) {
                User student = userRepository.findById(studentId).orElse(null);
                if (student == null || student.getRole() != UserRole.STUDENT) {
                    continue;
                }

                // Проверяем, что ученик закреплён за преподавателем по этому предмету
                List<StudentTeacher> relationships = studentTeacherRepository.findActiveByTeacherAndSubject(teacher, subject);
                boolean isAssigned = relationships.stream()
                        .anyMatch(st -> st.getStudent().getId().equals(studentId));

                if (isAssigned && studentTestRepository.findByTemplateAndStudent(savedTemplate, student).isEmpty()) {
                    StudentTest assignment = new StudentTest();
                    assignment.setTemplate(savedTemplate);
                    assignment.setStudent(student);
                    assignment.setStatus(StudentTestStatus.NEW);
                    studentTestRepository.save(assignment);
                }
            }
        }

        return savedTemplate;
    }
}

