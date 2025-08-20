package com.example.brainify.Service;

import com.example.brainify.Model.Lesson;
import com.example.brainify.Model.LessonReschedule;
import com.example.brainify.Model.User;
import com.example.brainify.Repository.LessonRescheduleRepository;
import com.example.brainify.Repository.LessonRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.HashMap;
import java.util.Map;
import java.util.List;

@Service
public class LessonRescheduleService {
    
    @Autowired
    private LessonRescheduleRepository lessonRescheduleRepository;
    
    @Autowired
    private LessonRepository lessonRepository;
    
    private static final double PENALTY_FOR_LATE_RESCHEDULE = 120.0;
    private static final int LATE_RESCHEDULE_HOURS = 12;
    
    /**
     * Получить информацию о возможности переноса урока
     */
    public Map<String, Object> getRescheduleInfo(Long lessonId, User teacher) {
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
            info.put("error", "Нельзя перенести отмененный урок");
            return info;
        }
        
        // Проверяем, что урок еще не прошел
        if (lesson.getLessonDate().isBefore(LocalDateTime.now())) {
            info.put("error", "Нельзя перенести прошедший урок");
            return info;
        }
        
        // Вычисляем время до урока
        long hoursUntilLesson = java.time.Duration.between(LocalDateTime.now(), lesson.getLessonDate()).toHours();
        
        // Определяем штрафы
        double penaltyAmount = 0.0;
        String penaltyReason = "";
        
        if (hoursUntilLesson < LATE_RESCHEDULE_HOURS) {
            penaltyAmount = PENALTY_FOR_LATE_RESCHEDULE;
            penaltyReason = "Перенос менее чем за 12 часов до урока";
        }
        
        info.put("lessonId", lessonId);
        info.put("lessonDate", lesson.getLessonDate().toString());
        info.put("subjectName", lesson.getSubject().getName());
        info.put("studentName", lesson.getStudent().getName());
        info.put("hoursUntilLesson", hoursUntilLesson);
        info.put("penaltyAmount", penaltyAmount);
        info.put("penaltyReason", penaltyReason);
        info.put("canReschedule", true);
        
        return info;
    }
    
    /**
     * Перенести урок
     */
    public Map<String, Object> rescheduleLesson(Long lessonId, User teacher, LocalDateTime newDate, String reason) {
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
            result.put("error", "Нельзя перенести отмененный урок");
            return result;
        }
        
        // Проверяем, что урок еще не прошел
        if (lesson.getLessonDate().isBefore(LocalDateTime.now())) {
            result.put("success", false);
            result.put("error", "Нельзя перенести прошедший урок");
            return result;
        }
        
        // Проверяем, что новое время в будущем
        if (newDate.isBefore(LocalDateTime.now())) {
            result.put("success", false);
            result.put("error", "Новое время урока должно быть в будущем");
            return result;
        }
        
        // Проверяем, что новое время отличается от текущего
        if (newDate.equals(lesson.getLessonDate())) {
            result.put("success", false);
            result.put("error", "Новое время должно отличаться от текущего");
            return result;
        }
        
        try {
            // Получаем информацию о штрафах
            Map<String, Object> rescheduleInfo = getRescheduleInfo(lessonId, teacher);
            
            // Сохраняем оригинальную дату
            LocalDateTime originalDate = lesson.getLessonDate();
            
            // Создаем запись о переносе
            LessonReschedule reschedule = new LessonReschedule(lesson, teacher, originalDate, newDate, reason);
            
            // Устанавливаем информацию о штрафах
            reschedule.setHoursBeforeLesson(((Number) rescheduleInfo.get("hoursUntilLesson")).intValue());
            reschedule.setPenaltyAmount((Double) rescheduleInfo.get("penaltyAmount"));
            reschedule.setPenaltyReason((String) rescheduleInfo.get("penaltyReason"));
            
            // Сохраняем перенос
            lessonRescheduleRepository.save(reschedule);
            
            // Обновляем дату урока
            lesson.setLessonDate(newDate);
            lessonRepository.save(lesson);
            
            result.put("success", true);
            result.put("message", "Урок успешно перенесен");
            result.put("penaltyAmount", reschedule.getPenaltyAmount());
            result.put("penaltyReason", reschedule.getPenaltyReason());
            result.put("originalDate", originalDate.toString());
            result.put("newDate", newDate.toString());
            
        } catch (Exception e) {
            result.put("success", false);
            result.put("error", "Ошибка при переносе урока: " + e.getMessage());
        }
        
        return result;
    }
    
    /**
     * Получить статистику переносов преподавателя
     */
    public Map<String, Object> getTeacherRescheduleStats(User teacher) {
        Map<String, Object> stats = new HashMap<>();
        
        YearMonth currentMonth = YearMonth.now();
        LocalDateTime startOfMonth = currentMonth.atDay(1).atStartOfDay();
        LocalDateTime endOfMonth = currentMonth.atEndOfMonth().atTime(23, 59, 59);
        
        Long reschedulesThisMonth = lessonRescheduleRepository.countByTeacherInCurrentMonth(
            teacher, startOfMonth, endOfMonth);
        
        List<LessonReschedule> unpaidPenalties = lessonRescheduleRepository.findUnpaidPenaltiesByTeacher(teacher);
        double totalUnpaidPenalty = unpaidPenalties.stream()
            .mapToDouble(LessonReschedule::getPenaltyAmount)
            .sum();
        
        List<LessonReschedule> penaltyReschedules = lessonRescheduleRepository.findPenaltyReschedulesByTeacherInMonth(
            teacher, startOfMonth, endOfMonth);
        
        stats.put("reschedulesThisMonth", reschedulesThisMonth);
        stats.put("totalUnpaidPenalty", totalUnpaidPenalty);
        stats.put("unpaidPenaltiesCount", unpaidPenalties.size());
        stats.put("penaltyReschedulesCount", penaltyReschedules.size());
        
        return stats;
    }
}
