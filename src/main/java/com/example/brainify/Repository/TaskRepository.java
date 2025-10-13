package com.example.brainify.Repository;

import com.example.brainify.Model.Task;
import com.example.brainify.Model.Subtopic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
    
    // Найти все задания для конкретной подтемы
    List<Task> findBySubtopicAndIsActiveTrueOrderByCreatedAtAsc(Subtopic subtopic);
    
    // Найти задания по уровню сложности
    List<Task> findBySubtopicAndDifficultyLevelAndIsActiveTrueOrderByCreatedAtAsc(Subtopic subtopic, Integer difficultyLevel);
    
    // Найти случайные задания для подтемы
    @Query("SELECT t FROM Task t WHERE t.subtopic = :subtopic AND t.isActive = true ORDER BY RAND()")
    List<Task> findRandomTasksBySubtopic(@Param("subtopic") Subtopic subtopic);
    
    // Найти задания с изображениями
    @Query("SELECT t FROM Task t WHERE t.subtopic = :subtopic AND t.imageData IS NOT NULL AND t.isActive = true ORDER BY t.createdAt ASC")
    List<Task> findTasksWithImagesBySubtopic(@Param("subtopic") Subtopic subtopic);
    
    // Найти задания без изображений
    @Query("SELECT t FROM Task t WHERE t.subtopic = :subtopic AND t.imageData IS NULL AND t.isActive = true ORDER BY t.createdAt ASC")
    List<Task> findTasksWithoutImagesBySubtopic(@Param("subtopic") Subtopic subtopic);
    
    // Подсчитать количество заданий в подтеме
    long countBySubtopicAndIsActiveTrue(Subtopic subtopic);
    
    // Найти задания по предмету и типу экзамена
    @Query("SELECT t FROM Task t JOIN t.subtopic s JOIN s.taskNumber tn WHERE tn.subject = :subject AND tn.examType = :examType AND t.isActive = true ORDER BY tn.number ASC, s.sortOrder ASC, t.createdAt ASC")
    List<Task> findBySubjectAndExamType(@Param("subject") com.example.brainify.Model.Subject subject, @Param("examType") String examType);

    // Найти все задания по номеру задания, независимо от подтем
    @Query("SELECT t FROM Task t JOIN t.subtopic s WHERE s.taskNumber = :taskNumber AND t.isActive = true ORDER BY t.createdAt ASC")
    List<Task> findByTaskNumber(@Param("taskNumber") com.example.brainify.Model.TaskNumber taskNumber);

    // Резервная выборка по номеру напрямую из таблицы tasks (если данные не привязаны к подтемам)
    @Query(value = "SELECT * FROM tasks t WHERE t.is_active = true AND (t.number = :number OR t.task_number = :number) ORDER BY t.created_at ASC", nativeQuery = true)
    List<Task> findByLegacyNumber(@Param("number") Integer number);

    // Получить пары (task_id, task_number)
    @Query(value = "SELECT t.id AS task_id, tn.number AS task_number FROM tasks t JOIN subtopics s ON s.id = t.subtopic_id JOIN task_numbers tn ON tn.id = s.task_number_id WHERE t.id = ANY(:ids)", nativeQuery = true)
    List<Object[]> findTaskIdWithNumber(@Param("ids") Long[] ids);
}

