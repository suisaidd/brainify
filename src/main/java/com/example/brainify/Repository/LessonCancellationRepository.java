package com.example.brainify.Repository;

import com.example.brainify.Model.LessonCancellation;
import com.example.brainify.Model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface LessonCancellationRepository extends JpaRepository<LessonCancellation, Long> {
    
    // Найти отмены по преподавателю
    List<LessonCancellation> findByCancelledByOrderByCancellationDateDesc(User cancelledBy);
    
    // Найти отмены преподавателя за текущий месяц
    @Query("SELECT lc FROM LessonCancellation lc WHERE lc.cancelledBy = :teacher AND " +
           "lc.cancellationDate >= :startOfMonth AND lc.cancellationDate < :endOfMonth")
    List<LessonCancellation> findByTeacherInCurrentMonth(@Param("teacher") User teacher,
                                                       @Param("startOfMonth") LocalDateTime startOfMonth,
                                                       @Param("endOfMonth") LocalDateTime endOfMonth);
    
    // Подсчитать количество отмен преподавателя за текущий месяц
    @Query("SELECT COUNT(lc) FROM LessonCancellation lc WHERE lc.cancelledBy = :teacher AND " +
           "lc.cancellationDate >= :startOfMonth AND lc.cancellationDate < :endOfMonth")
    Long countByTeacherInCurrentMonth(@Param("teacher") User teacher,
                                    @Param("startOfMonth") LocalDateTime startOfMonth,
                                    @Param("endOfMonth") LocalDateTime endOfMonth);
    
    // Найти отмены по уроку
    List<LessonCancellation> findByLessonId(Long lessonId);
    
    // Найти неоплаченные штрафы преподавателя
    @Query("SELECT lc FROM LessonCancellation lc WHERE lc.cancelledBy = :teacher AND " +
           "lc.penaltyAmount > 0 AND lc.isPenaltyPaid = false")
    List<LessonCancellation> findUnpaidPenaltiesByTeacher(@Param("teacher") User teacher);
}
