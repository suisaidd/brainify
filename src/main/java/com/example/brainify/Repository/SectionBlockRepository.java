package com.example.brainify.Repository;

import com.example.brainify.Model.SectionBlock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SectionBlockRepository extends JpaRepository<SectionBlock, Long> {
    List<SectionBlock> findBySectionIdOrderBySortOrderAsc(Long sectionId);
}


