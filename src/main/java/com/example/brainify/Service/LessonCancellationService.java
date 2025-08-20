package com.example.brainify.Service;

import com.example.brainify.Model.Lesson;
import com.example.brainify.Model.LessonCancellation;
import com.example.brainify.Model.User;
import com.example.brainify.Repository.LessonCancellationRepository;
import com.example.brainify.Repository.LessonRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.Map;
import java.util.List;

@Service
public class LessonCancellationService {
    
    @Autowired
    private LessonCancellationRepository lessonCancellationRepository;
    
    @Autowired
    private LessonRepository lessonRepository;
    
    private static final int FREE_CANCELLATIONS_PER_MONTH = 5;
    private static final double PENALTY_FOR_EXCESS_CANCELLATIONS = 120.0;
    private static final double PENALTY_FOR_LATE_CANCELLATION = 300.0;
    private static final int LATE_CANCELLATION_HOURS = 12;
    
    /**
     * Получить информацию о возможности отмены урока
     */
    public Map<String, Object> getCancellationInfo(Long lessonId, User teacher) {
        Map<String, Object> info = new HashMap<>();
        
        Lesson lesson = lessonRepository.findById(lessonId).orElse(null);
        if (lesson == null) {
            info.put("error", "Урок не найден");
            return info;
        }
        
        // Проверяем, что урок принадлежит преподавателю
        if (!lesson.getTeacher().getId().equals(teacher.getId())) {
            info.put("error", "Урок не принадлежит вам");
            return info;
        }
        
        // Проверяем, что урок еще не отменен
        if (lesson.getStatus() == Lesson.LessonStatus.CANCELLED) {
            info.put("error", "Урок уже отменен");
            return info;
        }
        
        // Уроки можно отменять в любое время
        // Никаких ограничений по времени
        
        // Получаем количество отмен за текущий месяц
        YearMonth currentMonth = YearMonth.now();
        LocalDateTime startOfMonth = currentMonth.atDay(1).atStartOfDay();
        LocalDateTime endOfMonth = currentMonth.atEndOfMonth().atTime(23, 59, 59);
        
        Long cancellationsThisMonth = lessonCancellationRepository.countByTeacherInCurrentMonth(
            teacher, startOfMonth, endOfMonth);
        
        // Вычисляем время до урока
        long hoursUntilLesson = java.time.Duration.between(LocalDateTime.now(), lesson.getLessonDate()).toHours();
        
        // Определяем штрафы
        double penaltyAmount = 0.0;
        String penaltyReason = "";
        
        if (hoursUntilLesson < LATE_CANCELLATION_HOURS && hoursUntilLesson >= 0) {
            penaltyAmount = PENALTY_FOR_LATE_CANCELLATION;
            penaltyReason = "Отмена менее чем за 12 часов до урока";
        } else if (cancellationsThisMonth >= FREE_CANCELLATIONS_PER_MONTH) {
            penaltyAmount = PENALTY_FOR_EXCESS_CANCELLATIONS;
            penaltyReason = "Превышен лимит бесплатных отмен в месяц";
        }
        
        info.put("lessonId", lessonId);
        info.put("lessonDate", lesson.getLessonDate().toString());
        info.put("subjectName", lesson.getSubject().getName());
        info.put("studentName", lesson.getStudent().getName());
        info.put("hoursUntilLesson", hoursUntilLesson);
        info.put("cancellationsThisMonth", cancellationsThisMonth);
        info.put("freeCancellationsLeft", Math.max(0, FREE_CANCELLATIONS_PER_MONTH - cancellationsThisMonth));
        info.put("penaltyAmount", penaltyAmount);
        info.put("penaltyReason", penaltyReason);
        info.put("canCancel", true);
        
        return info;
    }
    
    /**
     * Отменить урок
     */
    public Map<String, Object> cancelLesson(Long lessonId, User teacher, String reason) {
        Map<String, Object> result = new HashMap<>();
        
        Lesson lesson = lessonRepository.findById(lessonId).orElse(null);
        if (lesson == null) {
            result.put("success", false);
            result.put("error", "Урок не найден");
            return result;
        }
        
        // Проверяем, что урок принадлежит преподавателю
        if (!lesson.getTeacher().getId().equals(teacher.getId())) {
            result.put("success", false);
            result.put("error", "Урок не принадлежит вам");
            return result;
        }
        
        // Проверяем, что урок еще не отменен
        if (lesson.getStatus() == Lesson.LessonStatus.CANCELLED) {
            result.put("success", false);
            result.put("error", "Урок уже отменен");
            return result;
        }
        
        // Уроки можно отменять в любое время
        // Никаких ограничений по времени
        
        try {
            // Получаем информацию о штрафах
            Map<String, Object> cancellationInfo = getCancellationInfo(lessonId, teacher);
            
            // Создаем запись об отмене
            LessonCancellation cancellation = new LessonCancellation(lesson, teacher, reason);
            
            // Устанавливаем информацию о штрафах
            cancellation.setHoursBeforeLesson(((Number) cancellationInfo.get("hoursUntilLesson")).intValue());
            cancellation.setPenaltyAmount((Double) cancellationInfo.get("penaltyAmount"));
            cancellation.setPenaltyReason((String) cancellationInfo.get("penaltyReason"));
            
            // Сохраняем отмену
            lessonCancellationRepository.save(cancellation);
            
            // Обновляем статус урока
            lesson.setStatus(Lesson.LessonStatus.CANCELLED);
            lessonRepository.save(lesson);
            
            result.put("success", true);
            result.put("message", "Урок успешно отменен");
            result.put("penaltyAmount", cancellation.getPenaltyAmount());
            result.put("penaltyReason", cancellation.getPenaltyReason());
            
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", "Ошибка при отмене урока: " + e.getMessage());
        }
        
        return result;
    }
    
    /**
     * Получить статистику отмен преподавателя
     */
    public Map<String, Object> getTeacherCancellationStats(User teacher) {
        Map<String, Object> stats = new HashMap<>();
        
        YearMonth currentMonth = YearMonth.now();
        LocalDateTime startOfMonth = currentMonth.atDay(1).atStartOfDay();
        LocalDateTime endOfMonth = currentMonth.atEndOfMonth().atTime(23, 59, 59);
        
        Long cancellationsThisMonth = lessonCancellationRepository.countByTeacherInCurrentMonth(
            teacher, startOfMonth, endOfMonth);
        
        List<LessonCancellation> unpaidPenalties = lessonCancellationRepository.findUnpaidPenaltiesByTeacher(teacher);
        double totalUnpaidPenalty = unpaidPenalties.stream()
            .mapToDouble(LessonCancellation::getPenaltyAmount)
            .sum();
        
        stats.put("cancellationsThisMonth", cancellationsThisMonth);
        stats.put("freeCancellationsLeft", Math.max(0, FREE_CANCELLATIONS_PER_MONTH - cancellationsThisMonth));
        stats.put("totalUnpaidPenalty", totalUnpaidPenalty);
        stats.put("unpaidPenaltiesCount", unpaidPenalties.size());
        
        return stats;
    }
}
