package com.example.brainify.Repository;

import com.example.brainify.Model.StudentTest;
import com.example.brainify.Model.StudentTestAttempt;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudentTestAttemptRepository extends JpaRepository<StudentTestAttempt, Long> {

    List<StudentTestAttempt> findByStudentTestOrderBySubmittedAtDesc(StudentTest studentTest);
}

