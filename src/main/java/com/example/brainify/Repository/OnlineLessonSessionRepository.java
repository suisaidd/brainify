package com.example.brainify.Repository;

import com.example.brainify.Model.OnlineLessonSession;
import com.example.brainify.Model.Lesson;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface OnlineLessonSessionRepository extends JpaRepository<OnlineLessonSession, Long> {
    
    /**
     * Найти активную сессию для урока
     */
    Optional<OnlineLessonSession> findByLessonAndStatus(Lesson lesson, OnlineLessonSession.SessionStatus status);
    
    /**
     * Найти все сессии для урока
     */
    List<OnlineLessonSession> findByLessonOrderBySessionStartedAtDesc(Lesson lesson);
    
    /**
     * Найти активные сессии
     */
    List<OnlineLessonSession> findByStatus(OnlineLessonSession.SessionStatus status);
    
    /**
     * Найти сессии, которые начались в определенном временном диапазоне
     */
    @Query("SELECT ols FROM OnlineLessonSession ols WHERE ols.sessionStartedAt BETWEEN :startDate AND :endDate")
    List<OnlineLessonSession> findSessionsInDateRange(@Param("startDate") LocalDateTime startDate, 
                                                     @Param("endDate") LocalDateTime endDate);
    
    /**
     * Найти сессии для преподавателя
     */
    @Query("SELECT ols FROM OnlineLessonSession ols WHERE ols.lesson.teacher.id = :teacherId")
    List<OnlineLessonSession> findByTeacherId(@Param("teacherId") Long teacherId);
    
    /**
     * Найти сессии для ученика
     */
    @Query("SELECT ols FROM OnlineLessonSession ols WHERE ols.lesson.student.id = :studentId")
    List<OnlineLessonSession> findByStudentId(@Param("studentId") Long studentId);
    
    /**
     * Найти завершенные сессии для урока
     */
    @Query("SELECT ols FROM OnlineLessonSession ols WHERE ols.lesson = :lesson AND ols.status = 'COMPLETED' ORDER BY ols.sessionEndedAt DESC")
    List<OnlineLessonSession> findCompletedSessionsForLesson(@Param("lesson") Lesson lesson);
    
    /**
     * Найти сессии по ID комнаты
     */
    Optional<OnlineLessonSession> findByRoomId(String roomId);
    
    /**
     * Найти активные сессии старше определенного времени
     */
    @Query("SELECT ols FROM OnlineLessonSession ols WHERE ols.status = 'ACTIVE' AND ols.sessionStartedAt < :cutoffTime")
    List<OnlineLessonSession> findActiveSessionsOlderThan(@Param("cutoffTime") LocalDateTime cutoffTime);
    
    /**
     * Найти сессии с сохраненным содержимым доски
     */
    @Query("SELECT ols FROM OnlineLessonSession ols WHERE ols.boardContent IS NOT NULL AND ols.boardContent != ''")
    List<OnlineLessonSession> findSessionsWithBoardContent();
}
