package com.example.brainify.Repository;

import com.example.brainify.Model.BoardState;
import com.example.brainify.Model.Lesson;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BoardStateRepository extends JpaRepository<BoardState, Long> {
    
    // Найти все состояния доски для урока
    List<BoardState> findAllByLesson(Lesson lesson);
    
    // Найти все состояния доски по ID урока
    List<BoardState> findAllByLessonId(Long lessonId);
    
    // Найти самое новое активное состояние доски для урока
    @Query("SELECT bs FROM BoardState bs WHERE bs.lesson = :lesson ORDER BY bs.updatedAt DESC, bs.version DESC")
    List<BoardState> findByLessonOrderByUpdatedAtDesc(@Param("lesson") Lesson lesson);
    
    // Найти самое новое активное состояние доски по ID урока
    @Query("SELECT bs FROM BoardState bs WHERE bs.lesson.id = :lessonId ORDER BY bs.updatedAt DESC, bs.version DESC")
    List<BoardState> findByLessonIdOrderByUpdatedAtDesc(@Param("lessonId") Long lessonId);
    
    // Удалить состояние доски для урока
    void deleteByLesson(Lesson lesson);
}

