package com.example.brainify.Repository;

import com.example.brainify.Model.CourseSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CourseSectionRepository extends JpaRepository<CourseSection, Long> {
    List<CourseSection> findByChapterIdOrderBySortOrderAsc(Long chapterId);
}


