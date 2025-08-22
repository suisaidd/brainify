package com.example.brainify.Service;

import com.example.brainify.Model.Lesson;
import com.example.brainify.Repository.LessonRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class LessonAutoCompletionService {

    @Autowired
    private LessonRepository lessonRepository;

    /**
     * Автоматически завершает уроки, время которых истекло
     * Запускается каждые 5 минут
     */
    @Scheduled(fixedRate = 300000) // 5 минут
    public void autoCompleteExpiredLessons() {
        LocalDateTime now = LocalDateTime.now();
        
        // Находим все запланированные уроки, время которых истекло
        List<Lesson> expiredLessons = lessonRepository.findByStatusAndLessonDateBefore(
                Lesson.LessonStatus.SCHEDULED, 
                now
        );
        
        for (Lesson lesson : expiredLessons) {
            // Помечаем урок как автоматически завершенный
            lesson.setStatus(Lesson.LessonStatus.COMPLETED);
            lesson.setAutoCompleted(true);
            lessonRepository.save(lesson);
            
            System.out.println("Автоматически завершен урок ID: " + lesson.getId() + 
                             " для ученика: " + lesson.getStudent().getName() + 
                             " по предмету: " + lesson.getSubject().getName());
        }
    }

    /**
     * Ручное завершение урока (для административных целей)
     */
    public void completeLesson(Long lessonId) {
        Lesson lesson = lessonRepository.findById(lessonId).orElse(null);
        if (lesson != null) {
            lesson.setStatus(Lesson.LessonStatus.COMPLETED);
            lesson.setAutoCompleted(false); // Ручное завершение
            lessonRepository.save(lesson);
        }
    }

    /**
     * Отмена автоматического завершения урока
     */
    public void uncompleteLesson(Long lessonId) {
        Lesson lesson = lessonRepository.findById(lessonId).orElse(null);
        if (lesson != null) {
            lesson.setStatus(Lesson.LessonStatus.SCHEDULED);
            lesson.setAutoCompleted(false);
            lessonRepository.save(lesson);
        }
    }
}
