package com.example.brainify.Controllers;

import com.example.brainify.Model.User;
import com.example.brainify.Model.Lesson;
import com.example.brainify.Model.TeacherSchedule;
import com.example.brainify.Repository.LessonRepository;
import com.example.brainify.Repository.TeacherScheduleRepository;
import com.example.brainify.Config.SessionManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseBody;
import jakarta.servlet.http.HttpSession;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.DayOfWeek;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;
import java.util.stream.Collectors;
import com.example.brainify.Model.UserRole;
import com.example.brainify.Utils.TimezoneUtils;

@Controller
public class MainController {

    @Autowired
    private SessionManager sessionManager;
    
    @Autowired
    private LessonRepository lessonRepository;
    
    @Autowired
    private TeacherScheduleRepository teacherScheduleRepository;

    @GetMapping({"/", "/main"})
    public String mainPage(Model model, HttpSession session) {
        // Добавляем данные для отображения на странице
        model.addAttribute("pageTitle", "Brainify – онлайн-школа репетиторства");
        
        // Проверяем, авторизован ли пользователь через SessionManager
        User currentUser = sessionManager.getCurrentUser(session);
        model.addAttribute("currentUser", currentUser);
        model.addAttribute("isAuthenticated", currentUser != null);
        
        return "main";
    }



    @GetMapping("/private-lessons")
    public String privateLessonsPage(Model model, HttpSession session) {
        model.addAttribute("pageTitle", "Частные занятия - Brainify");
        
        // Проверяем, авторизован ли пользователь через SessionManager
        User currentUser = sessionManager.getCurrentUser(session);
        model.addAttribute("currentUser", currentUser);
        model.addAttribute("isAuthenticated", currentUser != null);
        
        return "private-lessons";
    }

    @GetMapping("/dashboard")
    public String dashboardPage(Model model, HttpSession session) {
        // Проверяем, авторизован ли пользователь через SessionManager
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return "redirect:/auth/login";
        }
        
        // Перенаправляем в зависимости от роли
        switch (currentUser.getRole()) {
            case STUDENT:
                return "redirect:/student-dashboard";
            case TEACHER:
                model.addAttribute("pageTitle", "Личный кабинет - Brainify");
                return "dashboard";
            case MANAGER:
            case ADMIN:
                return "redirect:/admin-role";
            default:
                return "redirect:/student-dashboard";
        }
    }

    @GetMapping("/student-dashboard")
    public String studentDashboardPage(Model model, HttpSession session) {
        // Проверяем, авторизован ли пользователь через SessionManager
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return "redirect:/auth/login";
        }
        
        model.addAttribute("pageTitle", "Личный кабинет ученика - Brainify");
        model.addAttribute("currentUser", currentUser);
        return "student-dashboard";
    }
    
    // API для получения уроков студента
    @GetMapping("/api/student/{studentId}/lessons")
    @ResponseBody
    public ResponseEntity<List<Map<String, Object>>> getStudentLessons(@PathVariable Long studentId, HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }
        
        // Проверяем, что пользователь запрашивает свои уроки или является админом/менеджером
        if (!currentUser.getId().equals(studentId) && 
            !currentUser.getRole().equals(UserRole.ADMIN) && 
            !currentUser.getRole().equals(UserRole.MANAGER)) {
            return ResponseEntity.status(403).build();
        }
        
        try {
            List<Lesson> lessons = lessonRepository.findByStudentOrderByLessonDateAsc(currentUser);
            
            List<Map<String, Object>> result = lessons.stream().map(lesson -> {
                Map<String, Object> lessonInfo = new HashMap<>();
                lessonInfo.put("id", lesson.getId());
                lessonInfo.put("subjectName", lesson.getSubject().getName());
                lessonInfo.put("teacherName", lesson.getTeacher().getName());
                lessonInfo.put("lessonDate", lesson.getLessonDate());
                lessonInfo.put("status", lesson.getStatus().toString());
                lessonInfo.put("description", lesson.getDescription());
                lessonInfo.put("isRecurring", lesson.getIsRecurring());
                lessonInfo.put("recurrenceWeeks", lesson.getRecurrenceWeeks());
                lessonInfo.put("originalLessonId", lesson.getOriginalLessonId());
                return lessonInfo;
            }).collect(Collectors.toList());
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }
    
    // API для получения данных преподавателя для дашборда
    @GetMapping("/api/teacher/dashboard-data")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getTeacherDashboardData(HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }
        
        // Проверяем, что пользователь является преподавателем
        if (!currentUser.getRole().equals(UserRole.TEACHER)) {
            return ResponseEntity.status(403).build();
        }
        
        try {
            // Получаем статистику преподавателя
            List<Lesson> teacherLessons = lessonRepository.findByTeacherOrderByLessonDateDesc(currentUser);
            
            long totalLessons = teacherLessons.size();
            long completedLessons = teacherLessons.stream()
                .filter(lesson -> lesson.getStatus().toString().equals("COMPLETED"))
                .count();
            
            // Пока что возвращаем базовую статистику
            Map<String, Object> dashboardData = new HashMap<>();
            dashboardData.put("totalLessons", totalLessons);
            dashboardData.put("completedLessons", completedLessons);
            dashboardData.put("averageRating", 0.0); // Пока не реализовано
            dashboardData.put("notificationCount", 0); // Пока не реализовано
            
            return ResponseEntity.ok(dashboardData);
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }
    
    // API для получения уроков преподавателя
    @GetMapping("/api/teacher/lessons")
    @ResponseBody
    public ResponseEntity<List<Map<String, Object>>> getTeacherLessons(
            @RequestParam(defaultValue = "0") int weekOffset,
            HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }
        
        // Проверяем, что пользователь является преподавателем
        if (!currentUser.getRole().equals(UserRole.TEACHER)) {
            return ResponseEntity.status(403).build();
        }
        
        try {
            List<Lesson> lessons = lessonRepository.findByTeacherOrderByLessonDateDesc(currentUser);
            
            // Фильтруем уроки для выбранной недели
            LocalDateTime now = LocalDateTime.now();
            final LocalDateTime weekStart = now.toLocalDate().atStartOfDay().with(java.time.DayOfWeek.MONDAY).plusWeeks(weekOffset);
            final LocalDateTime weekEnd = weekStart.plusDays(7);
            
            List<Map<String, Object>> result = lessons.stream()
                .filter(lesson -> {
                    LocalDateTime lessonDate = lesson.getLessonDate();
                    return lessonDate.isAfter(weekStart) && lessonDate.isBefore(weekEnd);
                })
                .map(lesson -> {
                    Map<String, Object> lessonInfo = new HashMap<>();
                    lessonInfo.put("id", lesson.getId());
                    lessonInfo.put("subjectName", lesson.getSubject() != null ? lesson.getSubject().getName() : "Предмет не указан");
                    lessonInfo.put("studentName", lesson.getStudent() != null ? lesson.getStudent().getName() : "Ученик не указан");
                    lessonInfo.put("lessonDate", lesson.getLessonDate());
                    lessonInfo.put("status", lesson.getStatus().toString());
                    lessonInfo.put("description", lesson.getDescription());
                    lessonInfo.put("rating", 5.0); // Пока не реализовано
                    return lessonInfo;
                }).collect(Collectors.toList());
            
            System.out.println("Найдено уроков для преподавателя " + currentUser.getName() + ": " + result.size());
            result.forEach(lesson -> {
                System.out.println("Урок: " + lesson.get("subjectName") + " с " + lesson.get("studentName") + " в " + lesson.get("lessonDate"));
            });
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }
    
    // API для получения расписания преподавателя
    @GetMapping("/api/teacher/schedule")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getTeacherSchedule(
            @RequestParam(defaultValue = "0") int weekOffset,
            HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }
        
        // Проверяем, что пользователь является преподавателем
        if (!currentUser.getRole().equals(UserRole.TEACHER)) {
            return ResponseEntity.status(403).build();
        }
        
        try {
            System.out.println("Запрос расписания для преподавателя: " + currentUser.getName());
            
            // Загружаем расписание преподавателя из teacher_schedules
            List<TeacherSchedule> teacherSchedules = teacherScheduleRepository.findByTeacherOrderByDayOfWeekAscStartTimeAsc(currentUser);
            
            System.out.println("Найдено записей расписания: " + teacherSchedules.size());
            
            // Формируем список расписания в том же формате, что и admin-lessons
            List<Map<String, Object>> scheduleList = new ArrayList<>();
            String teacherTimezone = currentUser.getTimezone();
            
            for (TeacherSchedule schedule : teacherSchedules) {
                Map<String, Object> scheduleInfo = new HashMap<>();
                scheduleInfo.put("id", schedule.getId());
                scheduleInfo.put("dayOfWeek", schedule.getDayOfWeek().toString());
                
                // Конвертируем время в часовой пояс пользователя
                String startTime = schedule.getStartTime().toString();
                String endTime = schedule.getEndTime().toString();
                
                // Если пользователь не в том же часовом поясе, конвертируем время
                if (!teacherTimezone.equals("Europe/Moscow")) { // Показываем время учителя как есть
                    startTime = TimezoneUtils.convertTimeForUser(startTime, teacherTimezone, "Europe/Moscow");
                    endTime = TimezoneUtils.convertTimeForUser(endTime, teacherTimezone, "Europe/Moscow");
                }
                
                scheduleInfo.put("startTime", startTime);
                scheduleInfo.put("endTime", endTime);
                scheduleInfo.put("isAvailable", schedule.getIsAvailable());
                scheduleInfo.put("teacherTimezone", teacherTimezone);
                scheduleInfo.put("teacherCity", TimezoneUtils.getCityName(teacherTimezone));
                scheduleList.add(scheduleInfo);
            }

            // Получаем уроки преподавателя для отображения занятых слотов
            List<Map<String, Object>> lessonsData = new ArrayList<>();
            List<Lesson> lessons = lessonRepository.findByTeacherAndLessonDateBetween(
                currentUser,
                getDateFromDayAndHour("MONDAY", "12", weekOffset),
                getDateFromDayAndHour("SUNDAY", "22", weekOffset)
            );
            
            for (Lesson lesson : lessons) {
                Map<String, Object> lessonMap = new HashMap<>();
                lessonMap.put("dayOfWeek", lesson.getLessonDate().getDayOfWeek().name());
                lessonMap.put("startTime", lesson.getLessonDate().toLocalTime().toString());
                lessonMap.put("subjectName", lesson.getSubject().getName());
                lessonMap.put("studentName", lesson.getStudent().getName());
                lessonMap.put("lessonId", lesson.getId());
                lessonsData.add(lessonMap);
            }
            
            Map<String, Object> result = new HashMap<>();
            result.put("teacherId", currentUser.getId());
            result.put("teacherName", currentUser.getName());
            result.put("schedules", scheduleList);
            result.put("lessons", lessonsData);
            
            System.out.println("Расписание преподавателя: " + result);
            System.out.println("Найдено уроков: " + lessonsData.size());
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            System.err.println("Ошибка при загрузке расписания: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }
    
    // API для получения списка городов России
    @GetMapping("/api/timezones/cities")
    @ResponseBody
    public ResponseEntity<Map<String, String>> getRussianCities() {
        try {
            Map<String, String> cities = TimezoneUtils.getRussianCities();
            return ResponseEntity.ok(cities);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }
    
    // API для сохранения расписания преподавателя
    @PostMapping("/api/teacher/schedule")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> saveTeacherSchedule(
            @RequestBody Map<String, Object> scheduleData,
            HttpSession session) {
        
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }
        
        if (!currentUser.getRole().equals(UserRole.TEACHER)) {
            return ResponseEntity.status(403).build();
        }
        
        try {
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> selectedSlots = (List<Map<String, Object>>) scheduleData.get("selectedSlots");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> slotsToDelete = (List<Map<String, Object>>) scheduleData.get("slotsToDelete");
            
            // Удаляем слоты, помеченные для удаления
            if (slotsToDelete != null) {
                for (Map<String, Object> slot : slotsToDelete) {
                    Long scheduleId = Long.valueOf(slot.get("id").toString());
                    teacherScheduleRepository.deleteById(scheduleId);
                }
            }
            
            // Добавляем новые слоты
            if (selectedSlots != null) {
                for (Map<String, Object> slot : selectedSlots) {
                    TeacherSchedule newSchedule = new TeacherSchedule();
                    newSchedule.setTeacher(currentUser);
                    newSchedule.setDayOfWeek(DayOfWeek.valueOf(slot.get("dayOfWeek").toString()));
                    
                    String startTimeStr = slot.get("startTime").toString();
                    String endTimeStr = slot.get("endTime").toString();
                    
                    // Обрабатываем случай с 00:00 (полночь)
                    LocalTime startTime = LocalTime.parse(startTimeStr);
                    LocalTime endTime = LocalTime.parse(endTimeStr);
                    
                    newSchedule.setStartTime(startTime);
                    newSchedule.setEndTime(endTime);
                    newSchedule.setIsAvailable(true);
                    
                    teacherScheduleRepository.save(newSchedule);
                }
            }
            
            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("message", "Расписание успешно обновлено");
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> result = new HashMap<>();
            result.put("success", false);
            result.put("message", "Ошибка сохранения расписания: " + e.getMessage());
            return ResponseEntity.status(500).body(result);
        }
    }
    
    // Вспомогательный метод для получения даты по дню недели и часу
    private LocalDateTime getDateFromDayAndHour(String dayOfWeek, String hour, int weekOffset) {
        LocalDateTime now = LocalDateTime.now();
        
        // Правильно вычисляем понедельник текущей недели
        LocalDateTime weekStart = now.toLocalDate().atStartOfDay();
        java.time.DayOfWeek currentDayOfWeek = now.getDayOfWeek();
        
        // Вычисляем количество дней до понедельника
        int daysToMonday;
        if (currentDayOfWeek == java.time.DayOfWeek.SUNDAY) {
            daysToMonday = 6; // До понедельника этой недели (6 дней назад)
        } else {
            daysToMonday = currentDayOfWeek.getValue() - 1; // До понедельника этой недели
        }
        
        weekStart = weekStart.minusDays(daysToMonday);
        weekStart = weekStart.plusWeeks(weekOffset);
        
        java.time.DayOfWeek targetDay = java.time.DayOfWeek.valueOf(dayOfWeek);
        LocalDateTime targetDate = weekStart.with(targetDay);
        return targetDate.withHour(Integer.parseInt(hour));
    }
} 