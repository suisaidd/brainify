package com.example.brainify.Repository;

import com.example.brainify.Model.Note;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NoteRepository extends JpaRepository<Note, Long> {
    
    // Найти все конспекты преподавателя
    List<Note> findByTeacherIdAndIsActiveOrderByCreatedAtDesc(Long teacherId, Boolean isActive);
    
    // Найти конспекты преподавателя по предмету
    List<Note> findByTeacherIdAndSubjectIdAndIsActiveOrderByCreatedAtDesc(Long teacherId, Long subjectId, Boolean isActive);
    
    // Найти конспекты по типу контента
    List<Note> findByTeacherIdAndContentTypeAndIsActiveOrderByCreatedAtDesc(Long teacherId, Note.ContentType contentType, Boolean isActive);
    
    // Поиск конспектов по названию (регистронезависимый)
    @Query("SELECT n FROM Note n WHERE n.teacher.id = :teacherId AND n.isActive = :isActive AND LOWER(n.title) LIKE LOWER(CONCAT('%', :searchTerm, '%')) ORDER BY n.createdAt DESC")
    List<Note> findByTeacherIdAndTitleContainingIgnoreCase(@Param("teacherId") Long teacherId, @Param("isActive") Boolean isActive, @Param("searchTerm") String searchTerm);
    
    // Поиск конспектов по описанию (регистронезависимый)
    @Query("SELECT n FROM Note n WHERE n.teacher.id = :teacherId AND n.isActive = :isActive AND LOWER(n.description) LIKE LOWER(CONCAT('%', :searchTerm, '%')) ORDER BY n.createdAt DESC")
    List<Note> findByTeacherIdAndDescriptionContainingIgnoreCase(@Param("teacherId") Long teacherId, @Param("isActive") Boolean isActive, @Param("searchTerm") String searchTerm);
    
    // Подсчитать количество конспектов преподавателя
    long countByTeacherIdAndIsActive(Long teacherId, Boolean isActive);
    
    // Подсчитать количество конспектов по предмету
    long countByTeacherIdAndSubjectIdAndIsActive(Long teacherId, Long subjectId, Boolean isActive);
}
