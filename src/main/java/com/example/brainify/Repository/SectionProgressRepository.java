package com.example.brainify.Repository;

import com.example.brainify.Model.SectionProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface SectionProgressRepository extends JpaRepository<SectionProgress, Long> {
    Optional<SectionProgress> findByUserIdAndSectionId(Long userId, Long sectionId);
    List<SectionProgress> findByUserIdAndSectionChapterId(Long userId, Long chapterId);
}


