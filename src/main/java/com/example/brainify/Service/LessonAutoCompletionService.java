package com.example.brainify.Service;

import com.example.brainify.Model.Lesson;
import com.example.brainify.Model.LessonCancellation;
import com.example.brainify.Model.User;
import com.example.brainify.Utils.TimezoneUtils;

import com.example.brainify.Repository.LessonRepository;
import com.example.brainify.Repository.LessonCancellationRepository;
import com.example.brainify.Repository.UserRepository;

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

    @Autowired
    private UserRepository userRepository;

    // Буфер в минутах: допуск сверх 15 минут для компенсации
    // задержки сети и рассинхронизации часов клиента и сервера
    private static final int JOIN_BUFFER_MINUTES = 2;

    /**
     * Отметить вход преподавателя в урок.
     * Вход разрешён: за (15 + буфер) минут до начала и до 1 часа после начала.
     *
     * @return null — успех; иначе строка с описанием причины отказа
     */
    @Transactional
    public String joinLesson(Long lessonId, Long teacherId) {
        Lesson lesson = lessonRepository.findById(lessonId).orElse(null);
        if (lesson == null) {
            return "Урок не найден.";
        }
        if (!lesson.getTeacher().getId().equals(teacherId)) {
            return "Нет прав доступа к этому уроку.";
        }

        // Все времена в UTC
        LocalDateTime now = TimezoneUtils.nowUtc();
        LocalDateTime lessonStart = lesson.getLessonDate();
        LocalDateTime lessonEnd = lessonStart.plusHours(1);
        // Допуск: 15 минут + буфер для защиты от рассинхронизации часов
        LocalDateTime earliestJoin = lessonStart.minusMinutes(15 + JOIN_BUFFER_MINUTES);

        System.out.println("[JOIN TEACHER] now(UTC)=" + now
                + ", lessonStart(UTC)=" + lessonStart
                + ", earliestJoin=" + earliestJoin
                + ", lessonEnd=" + lessonEnd);

        if (now.isBefore(earliestJoin)) {
            long minutesLeft = java.time.Duration.between(now, earliestJoin).toMinutes();
            System.out.println("[JOIN TEACHER] Отказ: слишком рано. До окна входа осталось " + minutesLeft + " мин.");
            return "Вход в урок откроется за 15 минут до начала. Осталось ≈" + minutesLeft + " мин.";
        }
        if (now.isAfter(lessonEnd)) {
            System.out.println("[JOIN TEACHER] Отказ: урок уже завершён.");
            return "Урок уже завершён.";
        }

        // Отмечаем вход преподавателя
        lesson.setTeacherJoinedAt(now);
        lessonRepository.save(lesson);

        System.out.println("[JOIN TEACHER] Успешно вошёл в урок " + lessonId + " в " + now + " UTC");
        return null; // null = успех
    }

    /**
     * Автоматическое завершение уроков (запускается каждые 5 минут)
     */
    @Scheduled(fixedRate = 300000) // 5 минут = 300000 мс
    @Transactional
    public void autoCompleteLessons() {
        LocalDateTime now = TimezoneUtils.nowUtc();
        
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
                deductStudentLessonBalance(lesson);

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
        cancellation.setCancellationDate(TimezoneUtils.nowUtc());
        cancellation.setCreatedAt(TimezoneUtils.nowUtc());
        cancellation.setCancellationReason("Автоматический штраф: преподаватель не вошел в урок");
        cancellation.setPenaltyAmount(600.0);
        cancellation.setPenaltyReason("Неявка преподавателя на урок");
        cancellation.setIsPenaltyPaid(false);
        cancellation.setHoursBeforeLesson(0); // Штраф применяется сразу
        lessonCancellationRepository.save(cancellation);

        System.out.println("Применен автоматический штраф 600₽ за урок " + lesson.getId() + 
                          " (преподаватель: " + lesson.getTeacher().getName() + ")");
    }

    private void deductStudentLessonBalance(Lesson lesson) {
        User student = lesson.getStudent();
        if (student == null) {
            return;
        }

        User managedStudent = userRepository.findById(student.getId()).orElse(null);
        if (managedStudent == null) {
            return;
        }

        Integer remainingLessons = managedStudent.getRemainingLessons();
        if (remainingLessons == null) {
            remainingLessons = 0;
        }

        if (remainingLessons > 0) {
            managedStudent.setRemainingLessons(remainingLessons - 1);
            userRepository.save(managedStudent);
        }
    }

    /**
     * Проверить статус урока для преподавателя
     */
    public LessonStatusResponse getLessonStatus(Long lessonId, Long teacherId) {
        Lesson lesson = lessonRepository.findById(lessonId).orElse(null);
        if (lesson == null || !lesson.getTeacher().getId().equals(teacherId)) {
            return null;
        }

        LocalDateTime now = TimezoneUtils.nowUtc();
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
