package com.example.brainify.Repository;

import com.example.brainify.Model.StudentTeacher;
import com.example.brainify.Model.User;
import com.example.brainify.Model.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentTeacherRepository extends JpaRepository<StudentTeacher, Long> {
    
    // Найти активную связь студента с преподавателем по предмету
    @Query("SELECT st FROM StudentTeacher st JOIN FETCH st.teacher WHERE st.student = :student AND st.subject = :subject AND st.isActive = true")
    Optional<StudentTeacher> findActiveByStudentAndSubject(@Param("student") User student, @Param("subject") Subject subject);
    
    // Найти всех преподавателей студента
    @Query("SELECT st FROM StudentTeacher st WHERE st.student = :student AND st.isActive = true")
    List<StudentTeacher> findActiveByStudent(@Param("student") User student);
    
    // Найти активные связи студента (альтернативный метод)
    List<StudentTeacher> findByStudentAndIsActiveTrue(User student);
    
    // Найти всех студентов преподавателя
    @Query("SELECT st FROM StudentTeacher st WHERE st.teacher = :teacher AND st.isActive = true")
    List<StudentTeacher> findActiveByTeacher(@Param("teacher") User teacher);
    
    @Query("SELECT st FROM StudentTeacher st WHERE st.teacher = :teacher AND st.subject = :subject AND st.isActive = true")
    List<StudentTeacher> findActiveByTeacherAndSubject(@Param("teacher") User teacher,
                                                       @Param("subject") Subject subject);
    
    // Найти связь по студенту, преподавателю и предмету
    @Query("SELECT st FROM StudentTeacher st WHERE st.student = :student AND st.teacher = :teacher AND st.subject = :subject AND st.isActive = true")
    Optional<StudentTeacher> findActiveByStudentTeacherAndSubject(@Param("student") User student, @Param("teacher") User teacher, @Param("subject") Subject subject);
    
    // Деактивировать все связи студента по предмету (для смены преподавателя)
    @Modifying
    @Transactional
    @Query("UPDATE StudentTeacher st SET st.isActive = false WHERE st.student = :student AND st.subject = :subject")
    void deactivateByStudentAndSubject(@Param("student") User student, @Param("subject") Subject subject);
} 