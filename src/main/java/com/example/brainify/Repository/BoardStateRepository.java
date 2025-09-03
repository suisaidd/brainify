package com.example.brainify.Repository;

import com.example.brainify.Model.BoardState;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface BoardStateRepository extends JpaRepository<BoardState, Long> {
    
    /**
     * Найти активное состояние доски для урока
     */
    @Query("SELECT bs FROM BoardState bs WHERE bs.lessonId = :lessonId AND bs.isActive = true ORDER BY bs.updatedAt DESC")
    Optional<BoardState> findActiveByLessonId(@Param("lessonId") Long lessonId);
    
    /**
     * Найти все состояния доски для урока
     */
    @Query("SELECT bs FROM BoardState bs WHERE bs.lessonId = :lessonId ORDER BY bs.updatedAt DESC")
    List<BoardState> findAllByLessonId(@Param("lessonId") Long lessonId);
    
    /**
     * Найти последнее состояние доски для урока
     */
    @Query("SELECT bs FROM BoardState bs WHERE bs.lessonId = :lessonId ORDER BY bs.updatedAt DESC")
    Optional<BoardState> findLatestByLessonId(@Param("lessonId") Long lessonId);
    
    /**
     * Деактивировать все состояния доски для урока
     */
    @Modifying
    @Transactional
    @Query("UPDATE BoardState bs SET bs.isActive = false WHERE bs.lessonId = :lessonId")
    void deactivateAllByLessonId(@Param("lessonId") Long lessonId);
    
    /**
     * Удалить старые состояния доски (старше 30 дней)
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM BoardState bs WHERE bs.updatedAt < :cutoffDate")
    void deleteOldStates(@Param("cutoffDate") java.time.LocalDateTime cutoffDate);
}
