package com.example.brainify.Repository;

import com.example.brainify.Model.TestAnswer;
import com.example.brainify.Model.TestSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TestAnswerRepository extends JpaRepository<TestAnswer, Long> {
    List<TestAnswer> findByTestSessionOrderByCreatedAtAsc(TestSession testSession);
}


