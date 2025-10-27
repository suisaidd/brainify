package com.example.brainify.Repository;

import com.example.brainify.Model.ChapterBlock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChapterBlockRepository extends JpaRepository<ChapterBlock, Long> {
    List<ChapterBlock> findByChapterIdOrderBySortOrderAsc(Long chapterId);
}

