package com.example.brainify.Service;

import com.example.brainify.Model.OnlineLessonSession;
import com.example.brainify.Model.Lesson;
import com.example.brainify.Repository.OnlineLessonSessionRepository;
import com.example.brainify.Repository.LessonRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class OnlineLessonAutoCompletionService {

    @Autowired
    private OnlineLessonSessionRepository sessionRepository;
    
    @Autowired
    private LessonRepository lessonRepository;

    /**
     * Автоматическое завершение онлайн-уроков по расписанию
     * Запускается каждые 5 минут
     * Сессии автоматически завершаются через 90 минут после первого подключения
     * (стандартный урок 55 минут + 35 минут дополнительного времени)
     */
    @Scheduled(fixedRate = 300000) // 5 минут = 300000 мс
    @Transactional
    public void autoCompleteOnlineLessons() {
        System.out.println("=== Запуск автоматического завершения онлайн-уроков ===");
        System.out.println("Время: " + LocalDateTime.now());
        
        try {
            // Находим сессии, которые должны быть завершены
            // Сессия автоматически завершается через 90 минут после первого подключения
            LocalDateTime cutoffTime = LocalDateTime.now().minusMinutes(90);
            
            List<OnlineLessonSession> expiredSessions = sessionRepository.findActiveSessionsOlderThan(cutoffTime);
            
            System.out.println("Найдено " + expiredSessions.size() + " сессий для автоматического завершения");
            
            for (OnlineLessonSession session : expiredSessions) {
                try {
                    Lesson lesson = session.getLesson();
                    System.out.println("Завершаем сессию " + session.getId() + " для урока " + lesson.getId() + 
                                     " (начался в " + session.getSessionStartedAt() + ")");
                    
                    // Завершаем сессию
                    session.completeSession();
                    sessionRepository.save(session);
                    
                    // Обновляем статус урока
                    lesson.setStatus(Lesson.LessonStatus.COMPLETED);
                    lesson.setAutoCompleted(true);
                    lessonRepository.save(lesson);
                    
                    System.out.println("✓ Сессия " + session.getId() + " успешно завершена");
                    
                } catch (Exception e) {
                    System.out.println("✗ Ошибка при завершении сессии " + session.getId() + ": " + e.getMessage());
                    e.printStackTrace();
                }
            }
            
            if (expiredSessions.isEmpty()) {
                System.out.println("Нет сессий для завершения");
            }
            
        } catch (Exception e) {
            System.out.println("✗ Общая ошибка при автоматическом завершении уроков: " + e.getMessage());
            e.printStackTrace();
        }
        
        System.out.println("=== Завершение автоматического завершения онлайн-уроков ===");
    }

    /**
     * Принудительное завершение всех активных сессий старше указанного времени
     * Используется для очистки "зависших" сессий
     */
    @Scheduled(cron = "0 0 2 * * ?") // Каждый день в 2:00
    @Transactional
    public void cleanupOldSessions() {
        System.out.println("=== Очистка старых сессий ===");
        
        try {
            // Завершаем все сессии старше 24 часов
            LocalDateTime cutoffTime = LocalDateTime.now().minusHours(24);
            List<OnlineLessonSession> oldSessions = sessionRepository.findActiveSessionsOlderThan(cutoffTime);
            
            System.out.println("Найдено " + oldSessions.size() + " старых сессий для очистки");
            
            for (OnlineLessonSession session : oldSessions) {
                try {
                    session.completeSession();
                    sessionRepository.save(session);
                    
                    Lesson lesson = session.getLesson();
                    lesson.setStatus(Lesson.LessonStatus.COMPLETED);
                    lesson.setAutoCompleted(true);
                    lessonRepository.save(lesson);
                    
                    System.out.println("✓ Очищена старая сессия " + session.getId());
                    
                } catch (Exception e) {
                    System.out.println("✗ Ошибка при очистке сессии " + session.getId() + ": " + e.getMessage());
                }
            }
            
        } catch (Exception e) {
            System.out.println("✗ Ошибка при очистке старых сессий: " + e.getMessage());
        }
    }
}
