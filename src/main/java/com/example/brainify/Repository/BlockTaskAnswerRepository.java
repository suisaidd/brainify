package com.example.brainify.Repository;

import com.example.brainify.Model.BlockTaskAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BlockTaskAnswerRepository extends JpaRepository<BlockTaskAnswer, Long> {
    Optional<BlockTaskAnswer> findByBlockIdAndBlockType(Long blockId, String blockType);
}

