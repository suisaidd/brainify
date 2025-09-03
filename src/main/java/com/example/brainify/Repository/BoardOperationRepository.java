package com.example.brainify.Repository;

import com.example.brainify.Model.BoardOperation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BoardOperationRepository extends JpaRepository<BoardOperation, Long> {
    
    /**
     * Получить все операции для урока, отсортированные по порядку
     */
    @Query("SELECT bo FROM BoardOperation bo WHERE bo.lesson.id = :lessonId ORDER BY bo.sequenceNumber ASC")
    List<BoardOperation> findByLessonIdOrderBySequenceNumberAsc(@Param("lessonId") Long lessonId);
    
    /**
     * Получить операции для урока после определенного номера последовательности
     */
    @Query("SELECT bo FROM BoardOperation bo WHERE bo.lesson.id = :lessonId AND bo.sequenceNumber > :sequenceNumber ORDER BY bo.sequenceNumber ASC")
    List<BoardOperation> findByLessonIdAndSequenceNumberGreaterThan(@Param("lessonId") Long lessonId, @Param("sequenceNumber") Long sequenceNumber);
    
    /**
     * Получить максимальный номер последовательности для урока
     */
    @Query("SELECT COALESCE(MAX(bo.sequenceNumber), 0) FROM BoardOperation bo WHERE bo.lesson.id = :lessonId")
    Long getMaxSequenceNumberByLessonId(@Param("lessonId") Long lessonId);
    
    /**
     * Получить следующий номер последовательности для урока
     */
    @Query("SELECT COALESCE(MAX(bo.sequenceNumber), 0) + 1 FROM BoardOperation bo WHERE bo.lesson.id = :lessonId")
    Long getNextSequenceNumber(@Param("lessonId") Long lessonId);
    
    /**
     * Удалить все операции для урока
     */
    @Modifying
    @Query("DELETE FROM BoardOperation bo WHERE bo.lesson.id = :lessonId")
    void deleteByLessonId(@Param("lessonId") Long lessonId);
    
    /**
     * Получить количество операций для урока
     */
    @Query("SELECT COUNT(bo) FROM BoardOperation bo WHERE bo.lesson.id = :lessonId")
    Long countByLessonId(@Param("lessonId") Long lessonId);
    
    /**
     * Получить последние операции для урока (для оптимизации)
     * Используем нативный SQL для PostgreSQL
     */
    @Query(value = "SELECT * FROM board_operations WHERE lesson_id = :lessonId ORDER BY sequence_number DESC LIMIT :limit", nativeQuery = true)
    List<BoardOperation> findLastOperationsByLessonId(@Param("lessonId") Long lessonId, @Param("limit") int limit);
    
    /**
     * Проверить существование операций для урока
     */
    @Query("SELECT CASE WHEN COUNT(bo) > 0 THEN true ELSE false END FROM BoardOperation bo WHERE bo.lesson.id = :lessonId")
    boolean existsByLessonId(@Param("lessonId") Long lessonId);
    
    /**
     * Получить все операции для отладки
     */
    @Query("SELECT bo FROM BoardOperation bo ORDER BY bo.timestamp DESC")
    List<BoardOperation> findAllOrderByTimestampDesc();
}
