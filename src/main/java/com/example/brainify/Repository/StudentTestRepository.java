package com.example.brainify.Repository;

import com.example.brainify.Model.StudentTest;
import com.example.brainify.Model.StudentTestStatus;
import com.example.brainify.Model.TestTemplate;
import com.example.brainify.Model.TestTemplateCategory;
import com.example.brainify.Model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentTestRepository extends JpaRepository<StudentTest, Long> {

    List<StudentTest> findByStudentAndTemplate_CategoryOrderByAssignedAtDesc(
            User student,
            TestTemplateCategory category
    );

    List<StudentTest> findByTemplate(TestTemplate template);

    Optional<StudentTest> findByTemplateAndStudent(TestTemplate template, User student);

    Optional<StudentTest> findByIdAndStudent(Long id, User student);

    List<StudentTest> findByStudentAndStatusOrderByAssignedAtDesc(User student, StudentTestStatus status);

    List<StudentTest> findByTemplate_CreatedByAndStatusOrderByCompletedAtDesc(User teacher, StudentTestStatus status);

    List<StudentTest> findByStudentOrderByAssignedAtDesc(User student);

    long countByTemplate(TestTemplate template);
}

