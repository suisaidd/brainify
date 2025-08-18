package com.example.brainify.Repository;

import com.example.brainify.Model.Lesson;
import com.example.brainify.Model.User;
import com.example.brainify.Model.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface LessonRepository extends JpaRepository<Lesson, Long> {
    
    // Найти уроки студента
    List<Lesson> findByStudentOrderByLessonDateAsc(User student);
    
    // Найти уроки преподавателя
    List<Lesson> findByTeacherOrderByLessonDateAsc(User teacher);
    
    // Найти уроки по предмету
    List<Lesson> findBySubjectOrderByLessonDateAsc(Subject subject);
    
    // Найти уроки в определенном временном диапазоне
    @Query("SELECT l FROM Lesson l WHERE l.lessonDate BETWEEN :startDate AND :endDate ORDER BY l.lessonDate ASC")
    List<Lesson> findLessonsBetweenDates(@Param("startDate") LocalDateTime startDate, @Param("endDate") LocalDateTime endDate);
    
    // Проверить конфликт времени для преподавателя
    @Query("SELECT l FROM Lesson l WHERE l.teacher = :teacher AND l.lessonDate = :lessonDate AND l.status != 'CANCELLED'")
    List<Lesson> findConflictingLessonsForTeacher(@Param("teacher") User teacher, @Param("lessonDate") LocalDateTime lessonDate);
    
    // Найти уроки студента по предмету
    List<Lesson> findByStudentAndSubjectOrderByLessonDateAsc(User student, Subject subject);
    
    // Найти уроки преподавателя по предмету
    List<Lesson> findByTeacherAndSubjectOrderByLessonDateAsc(User teacher, Subject subject);
    
    // Найти уроки преподавателя в указанном временном интервале
    @Query("SELECT l FROM Lesson l WHERE l.teacher = :teacher AND " +
           "l.lessonDate BETWEEN :startDate AND :endDate")
    List<Lesson> findByTeacherAndLessonDateBetween(@Param("teacher") User teacher, 
                                                 @Param("startDate") LocalDateTime startDate, 
                                                 @Param("endDate") LocalDateTime endDate);
    
    // Найти уроки по originalLessonId
    List<Lesson> findByOriginalLessonId(Long originalLessonId);
    
    // Найти уроки преподавателя по ID преподавателя в указанном временном интервале
    @Query("SELECT l FROM Lesson l WHERE l.teacher.id = :teacherId AND " +
           "l.lessonDate BETWEEN :startDate AND :endDate")
    List<Lesson> findByTeacherIdAndLessonDateBetween(@Param("teacherId") Long teacherId, 
                                                   @Param("startDate") LocalDateTime startDate, 
                                                   @Param("endDate") LocalDateTime endDate);
    
    // Найти уроки студента в указанном временном интервале
    @Query("SELECT l FROM Lesson l WHERE l.student = :student AND " +
           "l.lessonDate BETWEEN :startDate AND :endDate")
    List<Lesson> findByStudentAndLessonDateBetween(@Param("student") User student, 
                                                 @Param("startDate") LocalDateTime startDate, 
                                                 @Param("endDate") LocalDateTime endDate);
} 