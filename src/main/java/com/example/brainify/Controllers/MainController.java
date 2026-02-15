package com.example.brainify.Controllers;

import com.example.brainify.Model.User;
import com.example.brainify.Model.Lesson;
import com.example.brainify.Model.TeacherSchedule;
import com.example.brainify.Model.StudentTeacher;
import com.example.brainify.Model.Subject;
import com.example.brainify.Repository.LessonRepository;
import com.example.brainify.Repository.TeacherScheduleRepository;
import com.example.brainify.Repository.StudentTeacherRepository;
import com.example.brainify.Repository.SubjectRepository;
import com.example.brainify.Repository.UserRepository;
import com.example.brainify.Config.SessionManager;
import com.example.brainify.Service.LessonCancellationService;
import com.example.brainify.Service.LessonRescheduleService;
import com.example.brainify.Service.ExcalidrawService;
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
import java.util.Optional;
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
    
    @Autowired
    private StudentTeacherRepository studentTeacherRepository;
    
    @Autowired
    private LessonCancellationService lessonCancellationService;
    
    @Autowired
    private LessonRescheduleService lessonRescheduleService;
    
    @Autowired
    private SubjectRepository subjectRepository;
    
    @Autowired
    private ExcalidrawService excalidrawService;
    
    @Autowired
    private UserRepository userRepository;

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



    @GetMapping("/study-map")
    public String studyMapPage(Model model, HttpSession session) {
        model.addAttribute("pageTitle", "Карта подготовки - Brainify");

        // Страница доступна только авторизованным пользователям
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return "redirect:/";
        }
        
        model.addAttribute("currentUser", currentUser);
        model.addAttribute("isAuthenticated", true);

        // Подтягиваем активные предметы для плиток
        try {
            List<Subject> subjects = subjectRepository.findByIsActiveTrueOrderByNameAsc();
            
            // Для учеников показываем только купленные курсы
            // Для админов/менеджеров/преподавателей — все
            if (currentUser.getRole() == com.example.brainify.Model.UserRole.STUDENT) {
                java.util.Set<Long> purchasedIds = currentUser.getPurchasedCourses()
                    .stream().map(Subject::getId).collect(java.util.stream.Collectors.toSet());
                subjects = subjects.stream()
                    .filter(s -> purchasedIds.contains(s.getId()))
                    .collect(java.util.stream.Collectors.toList());
            }
            
            model.addAttribute("subjects", subjects);
        } catch (Exception e) {
            model.addAttribute("subjects", java.util.Collections.emptyList());
        }

        return "study-map";
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

    @GetMapping("/trainers")
    public String trainersPage(Model model, HttpSession session) {
        model.addAttribute("pageTitle", "Тренажёры - Brainify");
        
        // Страница доступна всем пользователям без регистрации
        User currentUser = sessionManager.getCurrentUser(session);
        model.addAttribute("currentUser", currentUser);
        model.addAttribute("isAuthenticated", currentUser != null);
        
        return "trainers";
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
                return "redirect:/dashboard-student";
            case TEACHER:
                model.addAttribute("pageTitle", "Личный кабинет - Brainify");
                model.addAttribute("currentUser", currentUser);
                return "dashboard";
            case MANAGER:
            case ADMIN:
                return "redirect:/admin-role";
            default:
                return "redirect:/dashboard-student";
        }
    }


    @GetMapping("/dashboard-student")
    public String dashboardStudentPage(Model model, HttpSession session) {
        // Проверяем, авторизован ли пользователь через SessionManager
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return "redirect:/auth/login";
        }
        
        // Проверяем, что пользователь является учеником
        if (!currentUser.getRole().equals(UserRole.STUDENT)) {
            return "redirect:/dashboard";
        }
        
        model.addAttribute("pageTitle", "Личный кабинет ученика - Brainify");
        model.addAttribute("currentUser", currentUser);
        return "dashboard-student";
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
                lessonInfo.put("lessonDate", TimezoneUtils.toIsoUtcString(lesson.getLessonDate()));
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
    
    // API для входа ученика в урок
    @PostMapping("/api/student/lessons/{lessonId}/join")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> joinStudentLesson(
            @PathVariable Long lessonId, 
            HttpSession session) {
        try {
            User currentUser = sessionManager.getCurrentUser(session);
            if (currentUser == null) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Пользователь не авторизован");
                return ResponseEntity.status(401).body(error);
            }

            // Проверяем, что пользователь является учеником
            if (!currentUser.getRole().equals(UserRole.STUDENT)) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Доступ запрещен");
                return ResponseEntity.status(403).body(error);
            }

            // Находим урок
            Optional<Lesson> lessonOpt = lessonRepository.findById(lessonId);
            if (lessonOpt.isEmpty()) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Урок не найден");
                return ResponseEntity.badRequest().body(response);
            }

            Lesson lesson = lessonOpt.get();
            
            // Проверяем, что урок принадлежит этому ученику
            if (!lesson.getStudent().getId().equals(currentUser.getId())) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Урок не принадлежит этому ученику");
                return ResponseEntity.badRequest().body(response);
            }

            // Проверяем статус урока
            if (!lesson.getStatus().equals(Lesson.LessonStatus.SCHEDULED)) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Урок не может быть начат. Статус: " + lesson.getStatus());
                return ResponseEntity.badRequest().body(response);
            }

            // Проверяем время урока (можно войти за 15 + 2 минуты буфера до начала)
            // Буфер компенсирует рассинхронизацию часов клиента и сервера
            // Все времена в UTC
            LocalDateTime now = TimezoneUtils.nowUtc();
            LocalDateTime lessonStart = lesson.getLessonDate();
            LocalDateTime lessonEnd = lessonStart.plusHours(1);
            LocalDateTime earliestJoin = lessonStart.minusMinutes(17); // 15 мин + 2 мин буфер

            System.out.println("[STUDENT JOIN] now(UTC)=" + now
                    + ", lessonStart(UTC)=" + lessonStart
                    + ", earliestJoin=" + earliestJoin
                    + ", lessonEnd=" + lessonEnd);

            if (now.isBefore(earliestJoin)) {
                long minutesLeft = java.time.Duration.between(now, earliestJoin).toMinutes();
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Вход в урок откроется за 15 минут до начала. Осталось ≈" + minutesLeft + " мин.");
                return ResponseEntity.badRequest().body(response);
            }
            if (now.isAfter(lessonEnd)) {
                Map<String, Object> response = new HashMap<>();
                response.put("success", false);
                response.put("message", "Урок уже завершён.");
                return ResponseEntity.badRequest().body(response);
            }

            // Отмечаем вход ученика
            lesson.setStudentJoinedAt(now);
            lessonRepository.save(lesson);

            // Генерируем ключи Excalidraw для урока, если их нет
            lesson = excalidrawService.generateExcalidrawKeys(lesson);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Успешно вошли в урок");
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Ошибка при входе в урок: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
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
            List<Lesson> teacherLessons = lessonRepository.findByTeacherOrderByLessonDateAsc(currentUser);
            
            LocalDateTime now = TimezoneUtils.nowUtc();
            
            // Считаем уроки со статусом "Успешно" (COMPLETED или прошедшие уроки)
            long successfulLessons = teacherLessons.stream()
                .filter(lesson -> {
                    // Уроки со статусом COMPLETED
                    if (lesson.getStatus().toString().equals("COMPLETED")) {
                        return true;
                    }
                    // Прошедшие уроки (которые не отменены) - они будут отображаться как "Успешно"
                    if (!lesson.getStatus().toString().equals("CANCELLED") && lesson.getLessonDate().isBefore(now)) {
                        return true;
                    }
                    return false;
                })
                .count();
            
            // Пока что возвращаем базовую статистику
            Map<String, Object> dashboardData = new HashMap<>();
            dashboardData.put("totalLessons", successfulLessons); // Изменено: теперь показывает количество успешных уроков
            dashboardData.put("completedLessons", successfulLessons);
            dashboardData.put("averageRating", 0.0); // Пока не реализовано
            dashboardData.put("notificationCount", 0); // Уведомления о штрафах убраны
            
            return ResponseEntity.ok(dashboardData);
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }
    
    // API для получения уроков преподавателя (для расписания)
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
            List<Lesson> lessons = lessonRepository.findByTeacherOrderByLessonDateAsc(currentUser);
            
            // Фильтруем уроки для выбранной недели (UTC)
            LocalDateTime now = TimezoneUtils.nowUtc();
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
                    lessonInfo.put("lessonDate", TimezoneUtils.toIsoUtcString(lesson.getLessonDate()));
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
    
    // API для получения учеников преподавателя
    @GetMapping("/api/teacher/students")
    @ResponseBody
    public ResponseEntity<List<Map<String, Object>>> getTeacherStudents(HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }
        
        // Проверяем, что пользователь является преподавателем
        if (!currentUser.getRole().equals(UserRole.TEACHER)) {
            return ResponseEntity.status(403).build();
        }
        
        try {
            // Получаем всех учеников преподавателя через связи student_teachers
            List<StudentTeacher> studentTeachers = studentTeacherRepository.findActiveByTeacher(currentUser);
            
            // Группируем учеников и считаем количество уроков
            Map<Long, Map<String, Object>> studentsMap = new HashMap<>();
            
            for (StudentTeacher st : studentTeachers) {
                User student = st.getStudent();
                Long studentId = student.getId();
                
                if (!studentsMap.containsKey(studentId)) {
                    Map<String, Object> studentInfo = new HashMap<>();
                    studentInfo.put("id", student.getId());
                    studentInfo.put("name", student.getName());
                    studentInfo.put("email", student.getEmail());
                    studentInfo.put("phone", student.getPhone());
                    studentInfo.put("remainingLessons", student.getRemainingLessons());
                    studentInfo.put("subjects", new ArrayList<>());
                    studentInfo.put("lessonsCount", 0);
                    studentsMap.put(studentId, studentInfo);
                }
                
                // Добавляем предмет
                @SuppressWarnings("unchecked")
                List<String> subjects = (List<String>) studentsMap.get(studentId).get("subjects");
                subjects.add(st.getSubject().getName());
            }
            
            // Считаем количество уроков для каждого ученика
            List<Lesson> allLessons = lessonRepository.findByTeacherOrderByLessonDateAsc(currentUser);
            for (Lesson lesson : allLessons) {
                Long studentId = lesson.getStudent().getId();
                if (studentsMap.containsKey(studentId)) {
                    Map<String, Object> studentInfo = studentsMap.get(studentId);
                    int currentCount = (Integer) studentInfo.get("lessonsCount");
                    studentInfo.put("lessonsCount", currentCount + 1);
                }
            }
            
            List<Map<String, Object>> result = new ArrayList<>(studentsMap.values());
            
            System.out.println("Найдено учеников для преподавателя " + currentUser.getName() + ": " + result.size());
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).build();
        }
    }
    
    // API для получения всех уроков преподавателя (для главной страницы)
    @GetMapping("/api/teacher/all-lessons")
    @ResponseBody
    public ResponseEntity<List<Map<String, Object>>> getAllTeacherLessons(HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }
        
        // Проверяем, что пользователь является преподавателем
        if (!currentUser.getRole().equals(UserRole.TEACHER)) {
            return ResponseEntity.status(403).build();
        }
        
        try {
            List<Lesson> lessons = lessonRepository.findByTeacherOrderByLessonDateAsc(currentUser);
            
            List<Map<String, Object>> result = lessons.stream()
                .map(lesson -> {
                    Map<String, Object> lessonInfo = new HashMap<>();
                    lessonInfo.put("id", lesson.getId());
                    lessonInfo.put("subjectName", lesson.getSubject() != null ? lesson.getSubject().getName() : "Предмет не указан");
                    lessonInfo.put("studentName", lesson.getStudent() != null ? lesson.getStudent().getName() : "Ученик не указан");
                    lessonInfo.put("lessonDate", TimezoneUtils.toIsoUtcString(lesson.getLessonDate()));
                    lessonInfo.put("status", lesson.getStatus().toString());
                    lessonInfo.put("description", lesson.getDescription());
                    lessonInfo.put("rating", 5.0); // Пока не реализовано
                    return lessonInfo;
                }).collect(Collectors.toList());
            
            System.out.println("Найдено всех уроков для преподавателя " + currentUser.getName() + ": " + result.size());
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

            // Получаем уроки преподавателя для отображения занятых слотов.
            // Диапазон запроса: неделя в таймзоне учителя, конвертированная в UTC.
            LocalDateTime weekStartLocal = getDateFromDayAndHour("MONDAY", "0", weekOffset, teacherTimezone);
            LocalDateTime weekEndLocal = getDateFromDayAndHour("SUNDAY", "23", weekOffset, teacherTimezone).plusHours(1);
            LocalDateTime weekStartUtc = TimezoneUtils.toUtc(weekStartLocal, teacherTimezone);
            LocalDateTime weekEndUtc = TimezoneUtils.toUtc(weekEndLocal, teacherTimezone);

            List<Map<String, Object>> lessonsData = new ArrayList<>();
            List<Lesson> lessons = lessonRepository.findByTeacherAndLessonDateBetween(
                currentUser, weekStartUtc, weekEndUtc
            );
            
            for (Lesson lesson : lessons) {
                Map<String, Object> lessonMap = new HashMap<>();
                // Конвертируем UTC → локальное время преподавателя для отображения в сетке расписания
                LocalDateTime localLessonDate = TimezoneUtils.fromUtc(lesson.getLessonDate(), teacherTimezone);
                lessonMap.put("dayOfWeek", localLessonDate.getDayOfWeek().name());
                lessonMap.put("startTime", localLessonDate.toLocalTime().toString());
                lessonMap.put("subjectName", lesson.getSubject().getName());
                lessonMap.put("studentName", lesson.getStudent().getName());
                lessonMap.put("lessonId", lesson.getId());
                lessonMap.put("status", lesson.getStatus().toString());
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
    
    // API для обновления часового пояса текущего пользователя (из профиля)
    @PostMapping("/api/profile/timezone")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> updateMyTimezone(
            @RequestBody Map<String, String> body,
            HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return ResponseEntity.status(401).body(Map.of("error", "Необходима авторизация"));
        }
        
        String timezone = body.get("timezone");
        if (timezone == null || !TimezoneUtils.isValidTimezone(timezone)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Некорректный часовой пояс"));
        }
        
        currentUser.setTimezone(timezone);
        userRepository.save(currentUser);
        
        return ResponseEntity.ok(Map.of("success", true, "message", "Часовой пояс обновлён"));
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
    
    // API для получения информации об отмене урока
    @GetMapping("/api/teacher/lesson/{lessonId}/cancellation-info")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getLessonCancellationInfo(@PathVariable Long lessonId, HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }
        
        if (!currentUser.getRole().equals(UserRole.TEACHER)) {
            return ResponseEntity.status(403).build();
        }
        
        try {
            Map<String, Object> info = lessonCancellationService.getCancellationInfo(lessonId, currentUser);
            
            if (info.containsKey("error")) {
                return ResponseEntity.badRequest().body(info);
            }
            
            return ResponseEntity.ok(info);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Ошибка при получении информации: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
    
    // API для отмены урока
    @PostMapping("/api/teacher/lesson/{lessonId}/cancel")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> cancelLesson(
            @PathVariable Long lessonId,
            @RequestBody Map<String, String> request,
            HttpSession session) {
        
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }
        
        if (!currentUser.getRole().equals(UserRole.TEACHER)) {
            return ResponseEntity.status(403).build();
        }
        
        try {
            String reason = request.get("reason");
            if (reason == null || reason.trim().isEmpty()) {
                reason = "Причина не указана";
            }
            
            Map<String, Object> result = lessonCancellationService.cancelLesson(lessonId, currentUser, reason);
            
            if (result.get("success").equals(true)) {
                return ResponseEntity.ok(result);
            } else {
                return ResponseEntity.badRequest().body(result);
            }
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "Ошибка при отмене урока: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
    
    // API для получения статистики отмен преподавателя
    @GetMapping("/api/teacher/cancellation-stats")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getTeacherCancellationStats(HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }
        
        if (!currentUser.getRole().equals(UserRole.TEACHER)) {
            return ResponseEntity.status(403).build();
        }
        
        try {
            Map<String, Object> stats = lessonCancellationService.getTeacherCancellationStats(currentUser);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Ошибка при получении статистики: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
    
    // API для получения информации о переносе урока
    @GetMapping("/api/teacher/lesson/{lessonId}/reschedule-info")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getLessonRescheduleInfo(@PathVariable Long lessonId, HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }
        
        if (!currentUser.getRole().equals(UserRole.TEACHER)) {
            return ResponseEntity.status(403).build();
        }
        
        try {
            Map<String, Object> info = lessonRescheduleService.getRescheduleInfo(lessonId, currentUser);
            
            if (info.containsKey("error")) {
                return ResponseEntity.badRequest().body(info);
            }
            
            return ResponseEntity.ok(info);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Ошибка при получении информации: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
    
    // API для переноса урока
    @PostMapping("/api/teacher/lesson/{lessonId}/reschedule")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> rescheduleLesson(
            @PathVariable Long lessonId,
            @RequestBody Map<String, Object> request,
            HttpSession session) {
        
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }
        
        if (!currentUser.getRole().equals(UserRole.TEACHER)) {
            return ResponseEntity.status(403).build();
        }
        
        try {
            String reason = (String) request.get("reason");
            String newDateStr = (String) request.get("newDate");
            
            if (reason == null || reason.trim().isEmpty()) {
                reason = "Причина не указана";
            }
            
            if (newDateStr == null || newDateStr.trim().isEmpty()) {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("error", "Не указана новая дата урока");
                return ResponseEntity.badRequest().body(error);
            }
            
            LocalDateTime newDate = LocalDateTime.parse(newDateStr);
            // Новая дата приходит в локальном времени преподавателя — конвертируем в UTC
            newDate = TimezoneUtils.toUtc(newDate, currentUser.getTimezone());
            
            Map<String, Object> result = lessonRescheduleService.rescheduleLesson(lessonId, currentUser, newDate, reason);
            
            if (result.get("success").equals(true)) {
                return ResponseEntity.ok(result);
            } else {
                return ResponseEntity.badRequest().body(result);
            }
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "Ошибка при переносе урока: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
    
    // API для получения статистики переносов преподавателя
    @GetMapping("/api/teacher/reschedule-stats")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getTeacherRescheduleStats(HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return ResponseEntity.status(401).build();
        }
        
        if (!currentUser.getRole().equals(UserRole.TEACHER)) {
            return ResponseEntity.status(403).build();
        }
        
        try {
            Map<String, Object> stats = lessonRescheduleService.getTeacherRescheduleStats(currentUser);
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Ошибка при получении статистики: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
    
    // API для проверки статуса аутентификации
    @GetMapping("/api/auth/status")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getAuthStatus(HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser != null) {
            response.put("authenticated", true);
            response.put("user", Map.of(
                "id", currentUser.getId(),
                "name", currentUser.getName(),
                "email", currentUser.getEmail(),
                "role", currentUser.getRole().name()
            ));
            return ResponseEntity.ok(response);
        } else {
            response.put("authenticated", false);
            return ResponseEntity.ok(response);
        }
    }
    
    /**
     * Вспомогательный метод для получения даты по дню недели и часу.
     * Вычисляет "сегодня" в указанной таймзоне, чтобы понедельник
     * фронтенда совпадал с понедельником бэкенда.
     *
     * @return LocalDateTime в таймзоне timezone (НЕ в UTC!). Вызывающий код
     *         должен конвертировать в UTC через TimezoneUtils.toUtc().
     */
    private LocalDateTime getDateFromDayAndHour(String dayOfWeek, String hour, int weekOffset, String timezone) {
        java.time.ZoneId zone = java.time.ZoneId.of(timezone);
        java.time.LocalDate todayLocal = java.time.ZonedDateTime.now(zone).toLocalDate();
        java.time.LocalDate weekStart = todayLocal.with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        weekStart = weekStart.plusWeeks(weekOffset);

        java.time.DayOfWeek targetDay = java.time.DayOfWeek.valueOf(dayOfWeek);
        int dayOffset = targetDay.getValue() - java.time.DayOfWeek.MONDAY.getValue();
        java.time.LocalDate targetDate = weekStart.plusDays(dayOffset);
        return targetDate.atTime(Integer.parseInt(hour), 0);
    }
    
    // API для получения всех активных предметов
    @GetMapping("/api/subjects")
    @ResponseBody
    public ResponseEntity<List<Subject>> getAllSubjects() {
        try {
            List<Subject> subjects = subjectRepository.findByIsActiveTrueOrderByNameAsc();
            return ResponseEntity.ok(subjects);
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }
} 