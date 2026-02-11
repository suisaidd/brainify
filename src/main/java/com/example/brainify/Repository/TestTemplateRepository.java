package com.example.brainify.Repository;

import com.example.brainify.Model.TestTemplate;
import com.example.brainify.Model.TestTemplateCategory;
import com.example.brainify.Model.TestTemplateStatus;
import com.example.brainify.Model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TestTemplateRepository extends JpaRepository<TestTemplate, Long> {

    List<TestTemplate> findByCategoryOrderByCreatedAtDesc(TestTemplateCategory category);

    List<TestTemplate> findByCreatedByOrderByCreatedAtDesc(User createdBy);

    List<TestTemplate> findByCreatedByAndCategoryOrderByCreatedAtDesc(User createdBy,
                                                                     TestTemplateCategory category);

    List<TestTemplate> findByCategoryAndStatusOrderByCreatedAtDesc(TestTemplateCategory category,
                                                                   TestTemplateStatus status);

    List<TestTemplate> findByCreatedByAndCategoryAndStatusOrderByCreatedAtDesc(User createdBy,
                                                                              TestTemplateCategory category,
                                                                              TestTemplateStatus status);
}

