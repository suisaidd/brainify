package com.example.brainify.Repository;

import com.example.brainify.Model.CourseModule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CourseModuleRepository extends JpaRepository<CourseModule, Long> {
    List<CourseModule> findBySubjectIdOrderBySortOrderAsc(Long subjectId);
}


