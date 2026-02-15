package com.example.brainify.Controllers;

import com.example.brainify.Config.SessionManager;
import com.example.brainify.Model.*;
import com.example.brainify.Repository.*;
import com.example.brainify.Utils.TimezoneUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpSession;
import java.time.*;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/schedule")
public class ScheduleController {

    @Autowired
    private SessionManager sessionManager;

    @Autowired
    private TeacherScheduleRepository teacherScheduleRepository;

    @Autowired
    private LessonRepository lessonRepository;

    @Autowired
    private UserRepository userRepository;



    @Autowired
    private StudentTeacherRepository studentTeacherRepository;

    // Отображение расписания учителя
    @GetMapping("/teacher")
    public String teacherSchedule(HttpSession session, Model model, 
                                 @RequestParam(required = false) String week) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || (currentUser.getRole() != UserRole.TEACHER && currentUser.getRole() != UserRole.ADMIN)) {
            return "redirect:/auth/login";
        }

        LocalDate startOfWeek = getStartOfWeek(week);
        model.addAttribute("currentUser", currentUser);
        model.addAttribute("startOfWeek", startOfWeek);
        model.addAttribute("weekDays", getWeekDays(startOfWeek));
        model.addAttribute("timeSlots", getTimeSlots());
        
        // Получаем расписание учителя
        List<TeacherSchedule> schedules = teacherScheduleRepository.findByTeacherOrderByDayOfWeekAscStartTimeAsc(currentUser);
        model.addAttribute("teacherSchedules", schedules);
        
        // Получаем уроки на эту неделю
        LocalDateTime weekStart = startOfWeek.atStartOfDay();
        LocalDateTime weekEnd = startOfWeek.plusDays(7).atStartOfDay();
        List<Lesson> lessons = lessonRepository.findByTeacherAndLessonDateBetween(currentUser, weekStart, weekEnd);
        model.addAttribute("weekLessons", lessons);

        return "schedule/teacher-schedule";
    }

    // Отображение расписания ученика
    @GetMapping("/student")
    public String studentSchedule(HttpSession session, Model model, 
                                 @RequestParam(required = false) String week,
                                 @RequestParam(required = false) Long teacherId) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || currentUser.getRole() != UserRole.STUDENT) {
            return "redirect:/auth/login";
        }

        LocalDate startOfWeek = getStartOfWeek(week);
        model.addAttribute("currentUser", currentUser);
        model.addAttribute("startOfWeek", startOfWeek);
        model.addAttribute("weekDays", getWeekDays(startOfWeek));
        model.addAttribute("timeSlots", getTimeSlots());

        // Получаем назначенных учителей для ученика
        List<StudentTeacher> studentTeachers = studentTeacherRepository.findByStudentAndIsActiveTrue(currentUser);
        model.addAttribute("studentTeachers", studentTeachers);

        User selectedTeacher = null;
        if (teacherId != null) {
            selectedTeacher = userRepository.findById(teacherId).orElse(null);
            // Проверяем, что этот учитель назначен данному ученику
            boolean isAssigned = studentTeachers.stream()
                .anyMatch(st -> st.getTeacher().getId().equals(teacherId));
            if (!isAssigned) {
                selectedTeacher = null;
            }
        }

        if (selectedTeacher != null) {
            model.addAttribute("selectedTeacher", selectedTeacher);
            
            // Получаем доступные слоты учителя
            List<TeacherSchedule> availableSlots = teacherScheduleRepository
                .findByTeacherAndIsAvailableTrueOrderByDayOfWeekAscStartTimeAsc(selectedTeacher);
            model.addAttribute("availableSlots", availableSlots);
            
            // Получаем уроки на эту неделю
            LocalDateTime weekStart = startOfWeek.atStartOfDay();
            LocalDateTime weekEnd = startOfWeek.plusDays(7).atStartOfDay();
            List<Lesson> allLessons = lessonRepository.findByTeacherAndLessonDateBetween(selectedTeacher, weekStart, weekEnd);
            List<Lesson> studentLessons = allLessons.stream()
                .filter(lesson -> lesson.getStudent().getId().equals(currentUser.getId()))
                .collect(Collectors.toList());
            List<Lesson> otherLessons = allLessons.stream()
                .filter(lesson -> !lesson.getStudent().getId().equals(currentUser.getId()))
                .collect(Collectors.toList());
                
            model.addAttribute("studentLessons", studentLessons);
            model.addAttribute("otherLessons", otherLessons);
        }

        return "schedule/student-schedule";
    }

    // Создание/удаление слота в расписании учителя
    @PostMapping("/teacher/slot")
    @ResponseBody
    public ResponseEntity<?> manageTeacherSlot(HttpSession session,
                                              @RequestParam String dayOfWeek,
                                              @RequestParam String timeSlot,
                                              @RequestParam String action) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || (currentUser.getRole() != UserRole.TEACHER && currentUser.getRole() != UserRole.ADMIN)) {
            return ResponseEntity.status(403).body("Доступ запрещен");
        }

        try {
            DayOfWeek day = DayOfWeek.valueOf(dayOfWeek.toUpperCase());
            LocalTime startTime = LocalTime.parse(timeSlot);
            LocalTime endTime = startTime.plusHours(1);

            if ("add".equals(action)) {
                // Проверяем, нет ли пересечений
                List<TeacherSchedule> overlapping = teacherScheduleRepository
                    .findOverlappingSchedules(currentUser, day, startTime, endTime);
                
                if (!overlapping.isEmpty()) {
                    return ResponseEntity.badRequest().body("Время уже занято");
                }

                // Создаем новый слот
                TeacherSchedule schedule = new TeacherSchedule(currentUser, day, startTime, endTime);
                teacherScheduleRepository.save(schedule);
                
                return ResponseEntity.ok().body("Слот добавлен");
                
            } else if ("remove".equals(action)) {
                // Находим и удаляем слот
                List<TeacherSchedule> schedules = teacherScheduleRepository
                    .findOverlappingSchedules(currentUser, day, startTime, endTime);
                
                for (TeacherSchedule schedule : schedules) {
                    if (schedule.getStartTime().equals(startTime)) {
                        teacherScheduleRepository.delete(schedule);
                        break;
                    }
                }
                
                return ResponseEntity.ok().body("Слот удален");
            }
            
            return ResponseEntity.badRequest().body("Неизвестное действие");
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Ошибка: " + e.getMessage());
        }
    }

    // Создание уроков для ученика
    @PostMapping("/student/book")
    @ResponseBody
    public ResponseEntity<?> bookLessons(HttpSession session,
                                        @RequestParam Long teacherId,
                                        @RequestParam List<String> selectedSlots,
                                        @RequestParam(defaultValue = "1") int weeks,
                                        @RequestParam String startDate) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || currentUser.getRole() != UserRole.STUDENT) {
            return ResponseEntity.status(403).body("Доступ запрещен");
        }

        try {
            User teacher = userRepository.findById(teacherId).orElse(null);
            if (teacher == null) {
                return ResponseEntity.badRequest().body("Учитель не найден");
            }

            // Проверяем, что учитель назначен ученику
            List<StudentTeacher> studentTeachers = studentTeacherRepository.findByStudentAndIsActiveTrue(currentUser);
            StudentTeacher assignment = studentTeachers.stream()
                .filter(st -> st.getTeacher().getId().equals(teacherId))
                .findFirst().orElse(null);
                
            if (assignment == null) {
                return ResponseEntity.badRequest().body("Учитель не назначен этому ученику");
            }

            Integer remainingLessons = currentUser.getRemainingLessons();
            if (remainingLessons == null) remainingLessons = 0;
            int totalLessonsToCreate = selectedSlots.size() * weeks;
            int scheduledLessonsCount = Math.toIntExact(lessonRepository.countByStudentAndStatus(currentUser, Lesson.LessonStatus.SCHEDULED));
            int availableLessons = remainingLessons - scheduledLessonsCount;

            if (availableLessons < totalLessonsToCreate) {
                return ResponseEntity.badRequest().body("Недостаточно занятий на балансе. Доступно: " + Math.max(availableLessons, 0) + ", требуется: " + totalLessonsToCreate);
            }

            LocalDate weekStart = LocalDate.parse(startDate);
            List<Lesson> createdLessons = new ArrayList<>();
            // Слоты в таймзоне преподавателя — конвертируем в UTC при сохранении
            String teacherTimezone = teacher.getTimezone();

            for (int week = 0; week < weeks; week++) {
                LocalDate currentWeek = weekStart.plusWeeks(week);
                
                for (String slot : selectedSlots) {
                    String[] parts = slot.split("_");
                    String dayStr = parts[0];
                    String timeStr = parts[1];
                    
                    DayOfWeek dayOfWeek = DayOfWeek.valueOf(dayStr.toUpperCase());
                    LocalTime time = LocalTime.parse(timeStr);
                    
                    // Вычисляем дату урока в таймзоне преподавателя
                    LocalDate lessonDate = currentWeek.with(TemporalAdjusters.nextOrSame(dayOfWeek));
                    LocalDateTime lessonDateTime = lessonDate.atTime(time);
                    // Конвертируем в UTC для хранения
                    lessonDateTime = TimezoneUtils.toUtc(lessonDateTime, teacherTimezone);
                    
                    // Проверяем, нет ли конфликтов
                    List<Lesson> conflicts = lessonRepository.findConflictingLessonsForTeacher(teacher, lessonDateTime);
                    if (!conflicts.isEmpty()) {
                        continue; // Пропускаем занятое время
                    }
                    
                    // Создаем урок
                    Lesson lesson = new Lesson(currentUser, teacher, assignment.getSubject(), lessonDateTime);
                    if (weeks > 1) {
                        lesson.setIsRecurring(true);
                        lesson.setRecurrenceWeeks(weeks);
                    }
                    lessonRepository.save(lesson);
                    createdLessons.add(lesson);
                }
            }

            return ResponseEntity.ok().body("Создано уроков: " + createdLessons.size());
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Ошибка: " + e.getMessage());
        }
    }

    // Удаление урока
    @PostMapping("/lesson/cancel")
    @ResponseBody
    public ResponseEntity<?> cancelLesson(HttpSession session, @RequestParam Long lessonId) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return ResponseEntity.status(403).body("Доступ запрещен");
        }

        try {
            Lesson lesson = lessonRepository.findById(lessonId).orElse(null);
            if (lesson == null) {
                return ResponseEntity.badRequest().body("Урок не найден");
            }

            // Проверяем права доступа
            boolean canCancel = lesson.getStudent().getId().equals(currentUser.getId()) ||
                               lesson.getTeacher().getId().equals(currentUser.getId()) ||
                               currentUser.getRole() == UserRole.ADMIN;
                               
            if (!canCancel) {
                return ResponseEntity.status(403).body("Нет прав для удаления этого урока");
            }

            lesson.setStatus(Lesson.LessonStatus.CANCELLED);
            lessonRepository.save(lesson);
            
            return ResponseEntity.ok().body("Урок отменен");
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Ошибка: " + e.getMessage());
        }
    }

    // Вспомогательные методы
    private LocalDate getStartOfWeek(String week) {
        if (week != null && !week.isEmpty()) {
            try {
                return LocalDate.parse(week);
            } catch (Exception e) {
                // Игнорируем ошибку и используем текущую неделю
            }
        }
        return TimezoneUtils.nowUtc().toLocalDate().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
    }

    private List<LocalDate> getWeekDays(LocalDate startOfWeek) {
        List<LocalDate> days = new ArrayList<>();
        for (int i = 0; i < 7; i++) {
            days.add(startOfWeek.plusDays(i));
        }
        return days;
    }

    private List<LocalTime> getTimeSlots() {
        List<LocalTime> slots = new ArrayList<>();
        for (int hour = 8; hour <= 20; hour++) {
            slots.add(LocalTime.of(hour, 0));
        }
        return slots;
    }
} 