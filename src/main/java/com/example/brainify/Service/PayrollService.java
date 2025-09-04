package com.example.brainify.Service;

import com.example.brainify.DTO.PayrollDTO;
import com.example.brainify.DTO.PayrollSummaryDTO;
import com.example.brainify.Model.Lesson;
import com.example.brainify.Model.User;
import com.example.brainify.Model.LessonCancellation;
import com.example.brainify.Model.LessonReschedule;
import com.example.brainify.Model.PayrollPayment;
import com.example.brainify.Repository.LessonRepository;
import com.example.brainify.Repository.UserRepository;
import com.example.brainify.Repository.LessonCancellationRepository;
import com.example.brainify.Repository.LessonRescheduleRepository;
import com.example.brainify.Repository.PayrollPaymentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class PayrollService {

    @Autowired
    private LessonRepository lessonRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private LessonCancellationRepository lessonCancellationRepository;

    @Autowired
    private LessonRescheduleRepository lessonRescheduleRepository;

    @Autowired
    private PayrollPaymentRepository payrollPaymentRepository;

    // Константы для расчета
    private static final BigDecimal BONUS_AMOUNT = new BigDecimal("40");
    private static final int BONUS_THRESHOLD = 30; // Количество уроков для бонуса

    public PayrollSummaryDTO getPayrollData(Long teacherId, int year, int month, String type) {
        // Определяем период сметы
        LocalDateTime startDateTime, endDateTime;
        LocalDateTime now = LocalDateTime.now();
        
        if ("monthly-payroll".equals(type)) {
            // Месячный просмотр: весь месяц
            LocalDate startDate = LocalDate.of(year, month, 1);
            LocalDate endDate = LocalDate.of(year, month, startDate.lengthOfMonth());
            startDateTime = LocalDateTime.of(startDate, LocalTime.MIN);
            endDateTime = LocalDateTime.of(endDate, LocalTime.MAX);
        } else if ("current-payroll".equals(type)) {
            // Текущая смета: с 17 по последний день месяца
            LocalDate startDate = LocalDate.of(year, month, 17);
            LocalDate endDate = LocalDate.of(year, month, startDate.lengthOfMonth());
            startDateTime = LocalDateTime.of(startDate, LocalTime.MIN);
            endDateTime = LocalDateTime.of(endDate, LocalTime.MAX);
        } else {
            // Прошлая смета: с 1 по 16 число
            startDateTime = LocalDateTime.of(year, month, 1, 0, 0);
            endDateTime = LocalDateTime.of(year, month, 16, 23, 59, 59);
        }

        // Получаем уроки за период
        List<Lesson> periodLessons = lessonRepository.findByTeacherIdAndLessonDateBetween(teacherId, startDateTime, endDateTime);

        System.out.println("=== ФИЛЬТРАЦИЯ УРОКОВ ===");
        System.out.println("Период: " + startDateTime + " - " + endDateTime);
        System.out.println("Найдено уроков в периоде: " + periodLessons.size());
        System.out.println("Текущее время: " + now);

        // Фильтруем уроки: показываем прошедшие уроки и отменённые уроки (независимо от даты)
        List<Lesson> lessons = periodLessons.stream()
                .filter(lesson -> {
                    boolean isPastOrCancelled = lesson.getLessonDate().isBefore(now) || lesson.getStatus() == Lesson.LessonStatus.CANCELLED;
                    System.out.println("Урок " + lesson.getId() + " (" + lesson.getSubject().getName() + "): " + 
                                     lesson.getLessonDate() + " - статус: " + lesson.getStatus() + 
                                     " - прошел/отменен: " + isPastOrCancelled);
                    return isPastOrCancelled;
                })
                .collect(Collectors.toList());

        System.out.println("Уроков после фильтрации: " + lessons.size());
        System.out.println("=========================");

        // Если это текущая смета, добавляем отменённые уроки из других периодов
        if ("current-payroll".equals(type)) {
            // Получаем все отменённые уроки за текущий месяц
            LocalDate monthStart = LocalDate.of(year, month, 1);
            LocalDate monthEnd = LocalDate.of(year, month, monthStart.lengthOfMonth());
            LocalDateTime monthStartDateTime = LocalDateTime.of(monthStart, LocalTime.MIN);
            LocalDateTime monthEndDateTime = LocalDateTime.of(monthEnd, LocalTime.MAX);
            
            List<Lesson> cancelledLessons = lessonRepository.findByTeacherIdAndLessonDateBetween(teacherId, monthStartDateTime, monthEndDateTime)
                    .stream()
                    .filter(lesson -> lesson.getStatus() == Lesson.LessonStatus.CANCELLED)
                    .collect(Collectors.toList());
            
            // Добавляем отменённые уроки, которых нет в текущем списке
            lessons.addAll(cancelledLessons.stream()
                    .filter(cancelled -> lessons.stream()
                            .noneMatch(existing -> existing.getId().equals(cancelled.getId())))
                    .collect(Collectors.toList()));
        }

        // Преобразуем в DTO
        List<PayrollDTO> payrollData = lessons.stream()
                .map(this::convertLessonToPayrollDTO)
                .collect(Collectors.toList());

        // Рассчитываем сводку
        BigDecimal expected = calculateExpectedAmount(payrollData);
        // Получаем реальные выплаты из базы данных
        BigDecimal paid = getPaidAmount(teacherId, year, month, type);
        
        // Если есть ожидающие платежи, добавляем их к ожидаемой сумме
        List<PayrollPayment> pendingPayments = payrollPaymentRepository
            .findAllPaymentsByTeacherAndYearAndMonthAndType(userRepository.findById(teacherId).orElse(null), year, month, type);
        
        for (PayrollPayment payment : pendingPayments) {
            if ("pending".equals(payment.getPaymentStatus())) {
                // Добавляем ожидающий платеж к общей ожидаемой сумме
                expected = expected.add(payment.getExpectedAmount());
            }
        }

        // Логирование для отладки
        System.out.println("=== ОТЛАДКА PAYROLL ===");
        System.out.println("Тип запроса: " + type);
        System.out.println("Количество уроков: " + payrollData.size());
        System.out.println("Ожидаемая сумма: " + expected);
        System.out.println("Выплаченная сумма: " + paid);
        
        for (int i = 0; i < Math.min(payrollData.size(), 3); i++) {
            PayrollDTO lesson = payrollData.get(i);
            System.out.println("Урок " + (i+1) + ": " + lesson.getSubject() + " - " + lesson.getStatus() + 
                             " (ставка: " + lesson.getRate() + ", бонус: " + lesson.getBonus() + 
                             ", компенсация: " + lesson.getCompensation() + ", штраф: " + lesson.getPenalty() + ")");
        }
        System.out.println("======================");

        return new PayrollSummaryDTO(expected, paid, payrollData);
    }

    private PayrollDTO convertLessonToPayrollDTO(Lesson lesson) {
        String status = determineLessonStatus(lesson);
        BigDecimal rate = calculateRate(lesson);
        BigDecimal bonus = calculateBonus(lesson);
        BigDecimal compensation = calculateCompensation(lesson);
        BigDecimal penalty = calculatePenalty(lesson);

        return new PayrollDTO(
                lesson.getLessonDate().toLocalDate(),
                lesson.getSubject().getName(),
                getLessonType(lesson),
                status,
                lesson.getStudent().getName(),
                rate,
                bonus,
                compensation,
                penalty
        );
    }

    private String determineLessonStatus(Lesson lesson) {
        if (lesson.getStatus() == Lesson.LessonStatus.CANCELLED) {
            return "cancelled";
        }
        
        if (lesson.getStatus() == Lesson.LessonStatus.MISSED) {
            return "absent";
        }
        
        return "completed";
    }

    private String getLessonType(Lesson lesson) {
        // Определяем тип экзамена на основе предмета
        String subjectName = lesson.getSubject().getName();
        
        switch (subjectName) {
            case "Математика":
                return "ЕГЭ Профиль";
            case "Физика":
            case "Биология":
                return "ЕГЭ";
            case "Химия":
                return "ОГЭ";
            default:
                return "ЕГЭ";
        }
    }

    private BigDecimal calculateRate(Lesson lesson) {
        if ("cancelled".equals(determineLessonStatus(lesson))) {
            return BigDecimal.ZERO;
        }

        // Базовая ставка в зависимости от типа экзамена
        String lessonType = getLessonType(lesson);
        switch (lessonType) {
            case "ОГЭ":
                return new BigDecimal("450");
            case "ЕГЭ":
                return new BigDecimal("600");
            case "ЕГЭ Профиль":
                return new BigDecimal("650");
            default:
                return new BigDecimal("450");
        }
    }

    private BigDecimal calculateBonus(Lesson lesson) {
        if ("cancelled".equals(determineLessonStatus(lesson)) || 
            "absent".equals(determineLessonStatus(lesson))) {
            return BigDecimal.ZERO;
        }

        // Проверяем количество уроков с этим учеником
        List<Lesson> completedLessons = lessonRepository.findByTeacherAndStudentAndStatus(
                lesson.getTeacher(), 
                lesson.getStudent(), 
                Lesson.LessonStatus.COMPLETED
        );

        if (completedLessons.size() >= BONUS_THRESHOLD) {
            return BONUS_AMOUNT;
        }

        return BigDecimal.ZERO;
    }

    private BigDecimal calculateCompensation(Lesson lesson) {
        // Компенсация за отмененные уроки (если отмена не по вине преподавателя)
        if ("cancelled".equals(determineLessonStatus(lesson))) {
            // В реальном приложении нужно добавить поля для отслеживания кто отменил урок
            return BigDecimal.ZERO;
        }

        return BigDecimal.ZERO;
    }

    private BigDecimal calculatePenalty(Lesson lesson) {
        BigDecimal penalty = BigDecimal.ZERO;

        // Проверяем штрафы за отмены уроков
        List<LessonCancellation> cancellations = lessonCancellationRepository.findByLessonId(lesson.getId());
        for (LessonCancellation cancellation : cancellations) {
            if (cancellation.getPenaltyAmount() != null && cancellation.getPenaltyAmount() > 0) {
                penalty = penalty.add(BigDecimal.valueOf(cancellation.getPenaltyAmount()));
            }
        }

        // Проверяем штрафы за переносы уроков
        List<LessonReschedule> reschedules = lessonRescheduleRepository.findByLessonId(lesson.getId());
        for (LessonReschedule reschedule : reschedules) {
            if (reschedule.getPenaltyAmount() != null && reschedule.getPenaltyAmount() > 0) {
                penalty = penalty.add(BigDecimal.valueOf(reschedule.getPenaltyAmount()));
            }
        }

        return penalty;
    }

    private BigDecimal calculateExpectedAmount(List<PayrollDTO> payrollData) {
        System.out.println("=== РАСЧЕТ ОЖИДАЕМОЙ СУММЫ ===");
        System.out.println("Количество уроков для расчета: " + payrollData.size());
        
        BigDecimal totalExpected = BigDecimal.ZERO;
        
        for (PayrollDTO dto : payrollData) {
            BigDecimal rate = dto.getRate();
            BigDecimal bonus = dto.getBonus();
            BigDecimal compensation = dto.getCompensation();
            BigDecimal penalty = dto.getPenalty();
            
            BigDecimal lessonTotal = rate.add(bonus).add(compensation).subtract(penalty);
            totalExpected = totalExpected.add(lessonTotal);
            
            System.out.println("Урок: " + dto.getSubject() + " - " + dto.getStatus() + 
                             " (ставка: " + rate + " + бонус: " + bonus + " + компенсация: " + compensation + 
                             " - штраф: " + penalty + " = " + lessonTotal + ")");
        }
        
        System.out.println("ИТОГО ожидаемая сумма: " + totalExpected);
        System.out.println("================================");
        
        return totalExpected;
    }

    /**
     * Получить сумму выплат для преподавателя за указанный период
     */
    private BigDecimal getPaidAmount(Long teacherId, int year, int month, String type) {
        User teacher = userRepository.findById(teacherId).orElse(null);
        if (teacher == null) {
            return BigDecimal.ZERO;
        }
        
        // Ищем все платежи (pending или paid) для этого периода
        List<PayrollPayment> payments = payrollPaymentRepository
            .findAllPaymentsByTeacherAndYearAndMonthAndType(teacher, year, month, type);
        
        // Суммируем все оплаченные платежи
        BigDecimal totalPaid = BigDecimal.ZERO;
        for (PayrollPayment payment : payments) {
            if ("paid".equals(payment.getPaymentStatus())) {
                totalPaid = totalPaid.add(payment.getPaidAmount());
            }
        }
        
        return totalPaid;
    }
}
