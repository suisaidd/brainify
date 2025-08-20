package com.example.brainify.Repository;

import com.example.brainify.Model.LessonReschedule;
import com.example.brainify.Model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface LessonRescheduleRepository extends JpaRepository<LessonReschedule, Long> {
    
    // Найти переносы по преподавателю
    List<LessonReschedule> findByRescheduledByOrderByRescheduleDateDesc(User rescheduledBy);
    
    // Найти переносы преподавателя за текущий месяц
    @Query("SELECT lr FROM LessonReschedule lr WHERE lr.rescheduledBy = :teacher AND " +
           "lr.rescheduleDate >= :startOfMonth AND lr.rescheduleDate < :endOfMonth")
    List<LessonReschedule> findByTeacherInCurrentMonth(@Param("teacher") User teacher,
                                                      @Param("startOfMonth") LocalDateTime startOfMonth,
                                                      @Param("endOfMonth") LocalDateTime endOfMonth);
    
    // Подсчитать количество переносов преподавателя за текущий месяц
    @Query("SELECT COUNT(lr) FROM LessonReschedule lr WHERE lr.rescheduledBy = :teacher AND " +
           "lr.rescheduleDate >= :startOfMonth AND lr.rescheduleDate < :endOfMonth")
    Long countByTeacherInCurrentMonth(@Param("teacher") User teacher,
                                     @Param("startOfMonth") LocalDateTime startOfMonth,
                                     @Param("endOfMonth") LocalDateTime endOfMonth);
    
    // Найти переносы по уроку
    List<LessonReschedule> findByLessonId(Long lessonId);
    
    // Найти неоплаченные штрафы за переносы преподавателя
    @Query("SELECT lr FROM LessonReschedule lr WHERE lr.rescheduledBy = :teacher AND " +
           "lr.penaltyAmount > 0 AND lr.isPenaltyPaid = false")
    List<LessonReschedule> findUnpaidPenaltiesByTeacher(@Param("teacher") User teacher);
    
    // Найти переносы с штрафами (менее 12 часов до урока)
    @Query("SELECT lr FROM LessonReschedule lr WHERE lr.rescheduledBy = :teacher AND " +
           "lr.hoursBeforeLesson < 12 AND lr.rescheduleDate >= :startOfMonth AND lr.rescheduleDate < :endOfMonth")
    List<LessonReschedule> findPenaltyReschedulesByTeacherInMonth(@Param("teacher") User teacher,
                                                                 @Param("startOfMonth") LocalDateTime startOfMonth,
                                                                 @Param("endOfMonth") LocalDateTime endOfMonth);
}
