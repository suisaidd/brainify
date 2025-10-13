package com.example.brainify.Repository;

import com.example.brainify.Model.Subtopic;
import com.example.brainify.Model.TaskNumber;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SubtopicRepository extends JpaRepository<Subtopic, Long> {
    
    // Найти все подтемы для конкретного номера задания
    List<Subtopic> findByTaskNumberAndIsActiveTrueOrderBySortOrderAsc(TaskNumber taskNumber);
    
    // Найти подтемы по номеру задания и названию
    Subtopic findByTaskNumberAndNameAndIsActiveTrue(TaskNumber taskNumber, String name);
    
    // Найти все подтемы для предмета и типа экзамена
    @Query("SELECT s FROM Subtopic s JOIN s.taskNumber tn WHERE tn.subject = :subject AND tn.examType = :examType AND s.isActive = true ORDER BY tn.number ASC, s.sortOrder ASC")
    List<Subtopic> findBySubjectAndExamType(@Param("subject") com.example.brainify.Model.Subject subject, @Param("examType") String examType);
    
    // Проверить существование подтемы
    boolean existsByTaskNumberAndNameAndIsActiveTrue(TaskNumber taskNumber, String name);
    
    // Найти подтемы с заданиями
    @Query("SELECT s FROM Subtopic s LEFT JOIN FETCH s.tasks t WHERE s.taskNumber = :taskNumber AND s.isActive = true ORDER BY s.sortOrder ASC")
    List<Subtopic> findByTaskNumberWithTasks(@Param("taskNumber") TaskNumber taskNumber);
}

