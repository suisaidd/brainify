package com.example.brainify.Repository;

import com.example.brainify.Model.CourseChapter;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CourseChapterRepository extends JpaRepository<CourseChapter, Long> {
    List<CourseChapter> findByModuleIdOrderBySortOrderAsc(Long moduleId);
}


