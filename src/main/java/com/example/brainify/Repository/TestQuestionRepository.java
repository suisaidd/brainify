package com.example.brainify.Repository;

import com.example.brainify.Model.TestQuestion;
import com.example.brainify.Model.TestTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TestQuestionRepository extends JpaRepository<TestQuestion, Long> {

    List<TestQuestion> findByTemplateOrderByDisplayOrderAsc(TestTemplate template);

    long countByTemplate(TestTemplate template);
}

