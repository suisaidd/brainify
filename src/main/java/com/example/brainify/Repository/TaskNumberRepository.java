package com.example.brainify.Repository;

import com.example.brainify.Model.TaskNumber;
import com.example.brainify.Model.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskNumberRepository extends JpaRepository<TaskNumber, Long> {
    
    // Найти все номера заданий для конкретного предмета и типа экзамена
    List<TaskNumber> findBySubjectAndExamTypeAndIsActiveTrueOrderByNumberAsc(Subject subject, String examType);
    
    // Найти номер задания по предмету, типу экзамена и номеру
    TaskNumber findBySubjectAndExamTypeAndNumberAndIsActiveTrue(Subject subject, String examType, Integer number);
    
    // Найти все номера заданий для предмета
    List<TaskNumber> findBySubjectAndIsActiveTrueOrderByNumberAsc(Subject subject);
    
    // Найти номера заданий по типу экзамена
    List<TaskNumber> findByExamTypeAndIsActiveTrueOrderByNumberAsc(String examType);
    
    // Проверить существование номера задания
    boolean existsBySubjectAndExamTypeAndNumberAndIsActiveTrue(Subject subject, String examType, Integer number);
    
    // Найти номера заданий с подтемами
    @Query("SELECT tn FROM TaskNumber tn LEFT JOIN FETCH tn.subtopics s WHERE tn.subject = :subject AND tn.examType = :examType AND tn.isActive = true ORDER BY tn.number ASC")
    List<TaskNumber> findBySubjectAndExamTypeWithSubtopics(@Param("subject") Subject subject, @Param("examType") String examType);
}

