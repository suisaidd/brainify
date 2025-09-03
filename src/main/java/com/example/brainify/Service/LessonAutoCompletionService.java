package com.example.brainify.Service;

import com.example.brainify.Model.Lesson;
import com.example.brainify.Model.LessonCancellation;

import com.example.brainify.Repository.LessonRepository;
import com.example.brainify.Repository.LessonCancellationRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class LessonAutoCompletionService {

    @Autowired
    private LessonRepository lessonRepository;

    @Autowired
    private LessonCancellationRepository lessonCancellationRepository;

    /**
     * Отметить вход преподавателя в урок
     */
    @Transactional
    public boolean joinLesson(Long lessonId, Long teacherId) {
        Lesson lesson = lessonRepository.findById(lessonId).orElse(null);
        if (lesson == null || !lesson.getTeacher().getId().equals(teacherId)) {
            return false;
        }

        // Проверяем, что урок еще не начался или только начался (в пределах 15 минут)
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime lessonStart = lesson.getLessonDate();
        LocalDateTime lessonEnd = lessonStart.plusHours(1);

        if (now.isBefore(lessonStart.minusMinutes(15)) || now.isAfter(lessonEnd)) {
            return false; // Слишком рано или слишком поздно
        }

        // Отмечаем вход преподавателя
        lesson.setTeacherJoinedAt(now);
        lessonRepository.save(lesson);

        return true;
    }

    /**
     * Автоматическое завершение уроков (запускается каждые 5 минут)
     */
    @Scheduled(fixedRate = 300000) // 5 минут = 300000 мс
    @Transactional
    public void autoCompleteLessons() {
        LocalDateTime now = LocalDateTime.now();
        
        // Находим уроки, которые должны быть завершены
        List<Lesson> lessonsToProcess = lessonRepository.findScheduledLessonsForAutoCompletion(now);
        
        for (Lesson lesson : lessonsToProcess) {
            processLessonCompletion(lesson, now);
        }
    }

    /**
     * Обработка завершения конкретного урока
     */
    private void processLessonCompletion(Lesson lesson, LocalDateTime now) {
        LocalDateTime lessonStart = lesson.getLessonDate();
        LocalDateTime lessonEnd = lessonStart.plusHours(1);
        
        // Если урок уже прошел (прошло больше часа с начала)
        if (now.isAfter(lessonEnd)) {
            if (lesson.getTeacherJoinedAt() != null) {
                // Преподаватель вошел в урок - отмечаем как завершенный
                lesson.setStatus(Lesson.LessonStatus.COMPLETED);
                lesson.setAutoCompleted(true);
                lessonRepository.save(lesson);
                
                System.out.println("Урок " + lesson.getId() + " автоматически завершен (преподаватель вошел)");
            } else {
                // Преподаватель не вошел - отмечаем как пропущенный и применяем штраф
                if (!lesson.getAutoPenaltyApplied()) {
                    applyAutoPenalty(lesson);
                }
            }
        }
    }

    /**
     * Применение автоматического штрафа за пропуск урока
     */
    private void applyAutoPenalty(Lesson lesson) {
        // Отмечаем урок как пропущенный
        lesson.setStatus(Lesson.LessonStatus.MISSED);
        lesson.setAutoCompleted(true);
        lesson.setAutoPenaltyApplied(true);
        lessonRepository.save(lesson);

        // Создаем запись об отмене с штрафом
        LessonCancellation cancellation = new LessonCancellation();
        cancellation.setLesson(lesson);
        cancellation.setCancelledBy(lesson.getTeacher());
        cancellation.setCancellationDate(LocalDateTime.now());
        cancellation.setCreatedAt(LocalDateTime.now());
        cancellation.setCancellationReason("Автоматический штраф: преподаватель не вошел в урок");
        cancellation.setPenaltyAmount(600.0);
        cancellation.setPenaltyReason("Неявка преподавателя на урок");
        cancellation.setIsPenaltyPaid(false);
        cancellation.setHoursBeforeLesson(0); // Штраф применяется сразу
        lessonCancellationRepository.save(cancellation);

        System.out.println("Применен автоматический штраф 600₽ за урок " + lesson.getId() + 
                          " (преподаватель: " + lesson.getTeacher().getName() + ")");
    }

    /**
     * Проверить статус урока для преподавателя
     */
    public LessonStatusResponse getLessonStatus(Long lessonId, Long teacherId) {
        Lesson lesson = lessonRepository.findById(lessonId).orElse(null);
        if (lesson == null || !lesson.getTeacher().getId().equals(teacherId)) {
            return null;
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime lessonStart = lesson.getLessonDate();
        LocalDateTime lessonEnd = lessonStart.plusHours(1);

        return new LessonStatusResponse(
            lesson.getId(),
            lesson.getStatus(),
            lesson.getTeacherJoinedAt(),
            lessonStart,
            lessonEnd,
            now.isAfter(lessonStart.minusMinutes(15)) && now.isBefore(lessonEnd),
            lesson.getAutoPenaltyApplied()
        );
    }

    /**
     * DTO для ответа о статусе урока
     */
    public static class LessonStatusResponse {
        private Long lessonId;
        private Lesson.LessonStatus status;
        private LocalDateTime teacherJoinedAt;
        private LocalDateTime lessonStart;
        private LocalDateTime lessonEnd;
        private boolean canJoin;
        private boolean penaltyApplied;

        public LessonStatusResponse(Long lessonId, Lesson.LessonStatus status, 
                                  LocalDateTime teacherJoinedAt, LocalDateTime lessonStart, 
                                  LocalDateTime lessonEnd, boolean canJoin, boolean penaltyApplied) {
            this.lessonId = lessonId;
            this.status = status;
            this.teacherJoinedAt = teacherJoinedAt;
            this.lessonStart = lessonStart;
            this.lessonEnd = lessonEnd;
            this.canJoin = canJoin;
            this.penaltyApplied = penaltyApplied;
        }

        // Геттеры
        public Long getLessonId() { return lessonId; }
        public Lesson.LessonStatus getStatus() { return status; }
        public LocalDateTime getTeacherJoinedAt() { return teacherJoinedAt; }
        public LocalDateTime getLessonStart() { return lessonStart; }
        public LocalDateTime getLessonEnd() { return lessonEnd; }
        public boolean isCanJoin() { return canJoin; }
        public boolean isPenaltyApplied() { return penaltyApplied; }
    }
}
