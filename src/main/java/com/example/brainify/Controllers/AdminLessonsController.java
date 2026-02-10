package com.example.brainify.Controllers;

import com.example.brainify.Model.*;
import com.example.brainify.Repository.*;

import com.example.brainify.Config.SessionManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpSession;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;

import java.util.*;
import java.util.stream.Collectors;
import org.springframework.transaction.annotation.Transactional;

@Controller
@RequestMapping("/admin/lessons")
public class AdminLessonsController {


    
    @Autowired
    private SessionManager sessionManager;
    
    @Autowired
    private LessonRepository lessonRepository;
    
    @Autowired
    private TeacherScheduleRepository teacherScheduleRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private SubjectRepository subjectRepository;
    
    @Autowired
    private StudentTeacherRepository studentTeacherRepository;

    // Главная страница admin-lessons
    @GetMapping
    public String adminLessonsPage(Model model, HttpSession session) {
        // Проверяем роль пользователя
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || 
            (!currentUser.getRole().equals(UserRole.ADMIN) && !currentUser.getRole().equals(UserRole.MANAGER))) {
            return "redirect:/auth/login";
        }

        model.addAttribute("pageTitle", "Управление расписанием - Brainify");
        model.addAttribute("currentUser", currentUser);
        return "admin/lessons";
    }

    // API для получения списка студентов с их предметами
    @GetMapping("/api/students")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getStudents(HttpSession session) {
        try {
            User currentUser = sessionManager.getCurrentUser(session);
            if (currentUser == null || 
                (!currentUser.getRole().equals(UserRole.ADMIN) && !currentUser.getRole().equals(UserRole.MANAGER))) {
                return ResponseEntity.status(403).body(Map.of("error", "Доступ запрещен"));
            }

            List<User> students = userRepository.findByRole(UserRole.STUDENT);
            List<Map<String, Object>> studentData = students.stream()
                .map(student -> {
                    Map<String, Object> studentInfo = new HashMap<>();
                    studentInfo.put("id", student.getId());
                    studentInfo.put("name", student.getName());
                    studentInfo.put("email", student.getEmail());
                    studentInfo.put("phone", student.getPhone());
                    studentInfo.put("remainingLessons", student.getRemainingLessons());
                    
                    // Получаем предметы ученика
                    List<Map<String, Object>> subjectData = student.getSubjects().stream()
                        .map(subject -> {
                            Map<String, Object> subjectInfo = new HashMap<>();
                            subjectInfo.put("id", subject.getId());
                            subjectInfo.put("name", subject.getName());
                            subjectInfo.put("description", subject.getDescription());
                            return subjectInfo;
                        })
                        .collect(Collectors.toList());
                    studentInfo.put("subjects", subjectData);
                    
                    return studentInfo;
                })
                .collect(Collectors.toList());

            return ResponseEntity.ok(Map.of("students", studentData));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Ошибка получения учеников: " + e.getMessage()));
        }
    }

    // API для получения списка преподавателей по предмету
    @GetMapping("/api/teachers/by-subject/{subjectId}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getTeachersBySubject(@PathVariable Long subjectId) {
        try {
            Subject subject = subjectRepository.findById(subjectId).orElse(null);
            if (subject == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Предмет не найден"));
            }

            // Получаем только активных преподавателей с ролью TEACHER, которые ведут этот предмет
            List<Map<String, Object>> teacherData = subject.getTeachers().stream()
                .filter(User::getIsActive)
                .filter(teacher -> teacher.getRole().equals(UserRole.TEACHER))
                .map(teacher -> {
                    Map<String, Object> teacherInfo = new HashMap<>();
                    teacherInfo.put("id", teacher.getId());
                    teacherInfo.put("name", teacher.getName());
                    teacherInfo.put("email", teacher.getEmail());
                    return teacherInfo;
                })
                .collect(Collectors.toList());

            return ResponseEntity.ok(Map.of("teachers", teacherData));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Ошибка получения преподавателей: " + e.getMessage()));
        }
    }

    // API для получения всех предметов
    @GetMapping("/api/subjects")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getSubjects() {
        try {
            List<Subject> subjects = subjectRepository.findByIsActiveTrueOrderByNameAsc();
            List<Map<String, Object>> subjectData = subjects.stream()
                .map(subject -> {
                    Map<String, Object> subjectInfo = new HashMap<>();
                    subjectInfo.put("id", subject.getId());
                    subjectInfo.put("name", subject.getName());
                    subjectInfo.put("description", subject.getDescription());
                    return subjectInfo;
                })
                .collect(Collectors.toList());

            return ResponseEntity.ok(Map.of("subjects", subjectData));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Ошибка получения предметов: " + e.getMessage()));
        }
    }

    // API для получения предметов ученика
    @GetMapping("/api/student/{studentId}/subjects")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getStudentSubjects(
            @PathVariable Long studentId,
            HttpSession session) {
        try {
            User currentUser = sessionManager.getCurrentUser(session);
            if (currentUser == null || 
                (!currentUser.getRole().equals(UserRole.ADMIN) && !currentUser.getRole().equals(UserRole.MANAGER))) {
                return ResponseEntity.status(403).body(Map.of("error", "Доступ запрещен"));
            }

            User student = userRepository.findById(studentId).orElse(null);
            if (student == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Ученик не найден"));
            }

            List<Map<String, Object>> subjectData = student.getSubjects().stream()
                .map(subject -> {
                    Map<String, Object> subjectInfo = new HashMap<>();
                    subjectInfo.put("id", subject.getId());
                    subjectInfo.put("name", subject.getName());
                    subjectInfo.put("description", subject.getDescription());
                    return subjectInfo;
                })
                .collect(Collectors.toList());
            
            return ResponseEntity.ok(Map.of("subjects", subjectData));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Ошибка получения предметов ученика: " + e.getMessage()));
        }
    }

    // API для получения преподавателя по предмету ученика
    @GetMapping("/api/student/{studentId}/teacher-for-subject/{subjectId}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getTeacherForSubject(
            @PathVariable Long studentId,
            @PathVariable Long subjectId,
            HttpSession session) {
        try {
            User currentUser = sessionManager.getCurrentUser(session);
            if (currentUser == null || 
                (!currentUser.getRole().equals(UserRole.ADMIN) && !currentUser.getRole().equals(UserRole.MANAGER))) {
                return ResponseEntity.status(403).body(Map.of("error", "Доступ запрещен"));
            }

            User student = userRepository.findById(studentId).orElse(null);
            Subject subject = subjectRepository.findById(subjectId).orElse(null);
            
            if (student == null || subject == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Ученик или предмет не найден"));
            }

            // Получаем назначенного преподавателя для данного предмета
            StudentTeacher assignment = studentTeacherRepository.findActiveByStudentAndSubject(student, subject).orElse(null);
            
            if (assignment == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("teacher", null);
                response.put("message", "Преподаватель не назначен");
                return ResponseEntity.ok(response);
            }
            
            User teacher = assignment.getTeacher();
            if (teacher == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("teacher", null);
                response.put("message", "Преподаватель не найден");
                return ResponseEntity.ok(response);
            }
            
            Map<String, Object> teacherData = new HashMap<>();
            teacherData.put("id", teacher.getId());
            teacherData.put("name", teacher.getName());
            teacherData.put("email", teacher.getEmail());
            
            return ResponseEntity.ok(Map.of("teacher", teacherData));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Ошибка получения преподавателя: " + e.getMessage()));
        }
    }

    // API для назначения преподавателя студенту
    @PostMapping("/api/assign-teacher")
    @ResponseBody
    @Transactional
    public ResponseEntity<Map<String, Object>> assignTeacher(
            @RequestParam Long studentId,
            @RequestParam Long teacherId,
            @RequestParam Long subjectId,
            HttpSession session) {
        
        try {
            User currentUser = sessionManager.getCurrentUser(session);
            if (currentUser == null || 
                (!currentUser.getRole().equals(UserRole.ADMIN) && !currentUser.getRole().equals(UserRole.MANAGER))) {
                return ResponseEntity.status(403).body(Map.of("error", "Доступ запрещен"));
            }

            // Проверяем существование пользователей и предмета
            User student = userRepository.findById(studentId).orElse(null);
            User teacher = userRepository.findById(teacherId).orElse(null);
            Subject subject = subjectRepository.findById(subjectId).orElse(null);

            if (student == null || teacher == null || subject == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Студент, преподаватель или предмет не найден"));
            }

            // Проверяем, что преподаватель ведет этот предмет
            // Инициализируем коллекцию subjects для проверки
            teacher.getSubjects().size(); // Инициализируем ленивую коллекцию
            if (!teacher.getSubjects().contains(subject)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Преподаватель не ведет выбранный предмет"));
            }

            // Деактивируем предыдущего преподавателя для этого предмета (если есть)
            studentTeacherRepository.deactivateByStudentAndSubject(student, subject);

            // Проверяем, не существует ли уже активная связь с этим преподавателем
            Optional<StudentTeacher> existingAssignment = studentTeacherRepository.findActiveByStudentTeacherAndSubject(
                student, teacher, subject);
            
            if (existingAssignment.isPresent()) {
                // Если связь уже существует, просто активируем её
                StudentTeacher existing = existingAssignment.get();
                if (!existing.getIsActive()) {
                    existing.setIsActive(true);
                    studentTeacherRepository.save(existing);
                }
                return ResponseEntity.ok(Map.of("success", true, "message", "Преподаватель успешно назначен"));
            }

            // Создаем новую связь
            StudentTeacher studentTeacher = new StudentTeacher(student, teacher, subject);
            studentTeacherRepository.save(studentTeacher);

            return ResponseEntity.ok(Map.of("success", true, "message", "Преподаватель успешно назначен"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Ошибка назначения преподавателя: " + e.getMessage()));
        }
    }

    // API для снятия назначения преподавателя
    @PostMapping("/api/remove-teacher")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> removeTeacher(
            @RequestBody Map<String, Object> request,
            HttpSession session) {
        
        try {
            User currentUser = sessionManager.getCurrentUser(session);
            if (currentUser == null || 
                (!currentUser.getRole().equals(UserRole.ADMIN) && !currentUser.getRole().equals(UserRole.MANAGER))) {
                return ResponseEntity.status(403).body(Map.of("error", "Доступ запрещен"));
            }

            Long studentId = Long.valueOf(String.valueOf(request.get("studentId")));
            Long subjectId = Long.valueOf(String.valueOf(request.get("subjectId")));

            // Проверяем существование пользователя и предмета
            User student = userRepository.findById(studentId).orElse(null);
            Subject subject = subjectRepository.findById(subjectId).orElse(null);

            if (student == null || subject == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Студент или предмет не найден"));
            }

            // Деактивируем назначение преподавателя для этого предмета
            studentTeacherRepository.deactivateByStudentAndSubject(student, subject);

            return ResponseEntity.ok(Map.of("success", true, "message", "Назначение преподавателя снято"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Ошибка снятия назначения преподавателя: " + e.getMessage()));
        }
    }

    // API для получения расписания преподавателя
    @GetMapping("/api/teacher/{teacherId}/schedule")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getTeacherSchedule(
            @PathVariable Long teacherId,
            @RequestParam(defaultValue = "0") int weekOffset,
            HttpSession session) {
        
        try {
            User currentUser = sessionManager.getCurrentUser(session);
            if (currentUser == null || 
                (!currentUser.getRole().equals(UserRole.ADMIN) && !currentUser.getRole().equals(UserRole.MANAGER))) {
                return ResponseEntity.status(403).body(Map.of("error", "Доступ запрещен"));
            }

            User teacher = userRepository.findById(teacherId).orElse(null);
            if (teacher == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Преподаватель не найден"));
            }

            List<TeacherSchedule> schedules = teacherScheduleRepository.findByTeacherOrderByDayOfWeekAscStartTimeAsc(teacher);
            
            List<Map<String, Object>> scheduleList = new ArrayList<>();
            for (TeacherSchedule schedule : schedules) {
                Map<String, Object> scheduleInfo = new HashMap<>();
                scheduleInfo.put("id", schedule.getId());
                scheduleInfo.put("dayOfWeek", schedule.getDayOfWeek().name());
                scheduleInfo.put("startTime", schedule.getStartTime().toString());
                scheduleInfo.put("endTime", schedule.getEndTime().toString());
                scheduleInfo.put("isAvailable", schedule.getIsAvailable());
                scheduleList.add(scheduleInfo);
            }

            // Получаем уроки преподавателя для отображения занятых слотов
            List<Map<String, Object>> lessonsData = new ArrayList<>();
            LocalDateTime now = LocalDateTime.now();
            List<Lesson> lessons = lessonRepository.findByTeacherAndLessonDateBetween(
                teacher,
                getDateFromDayAndHour("MONDAY", "12", weekOffset),
                getDateFromDayAndHour("SUNDAY", "23", weekOffset)
            );
            
            for (Lesson lesson : lessons) {
                Map<String, Object> lessonMap = new HashMap<>();
                lessonMap.put("dayOfWeek", lesson.getLessonDate().getDayOfWeek().name());
                lessonMap.put("startTime", lesson.getLessonDate().toLocalTime().toString());
                lessonMap.put("subjectName", lesson.getSubject().getName());
                lessonMap.put("studentName", lesson.getStudent().getName());
                lessonMap.put("lessonId", lesson.getId());
                lessonMap.put("isPast", lesson.getLessonDate().isBefore(now));
                lessonsData.add(lessonMap);
            }
            
            Map<String, Object> result = new HashMap<>();
            result.put("teacherId", teacherId);
            result.put("teacherName", teacher.getName());
            result.put("schedules", scheduleList);
            result.put("lessons", lessonsData);

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Ошибка загрузки расписания: " + e.getMessage()));
        }
    }

    // API для сохранения расписания преподавателя
    @PostMapping("/api/teacher/{teacherId}/schedule")
    @ResponseBody
    @Transactional
    public ResponseEntity<Map<String, Object>> saveTeacherSchedule(
            @PathVariable Long teacherId,
            @RequestBody Map<String, Object> scheduleData,
            HttpSession session) {
        
        try {
            User currentUser = sessionManager.getCurrentUser(session);
            if (currentUser == null || 
                (!currentUser.getRole().equals(UserRole.ADMIN) && !currentUser.getRole().equals(UserRole.MANAGER))) {
                return ResponseEntity.status(403).body(Map.of("error", "Доступ запрещен"));
            }

            User teacher = userRepository.findById(teacherId).orElse(null);
            if (teacher == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Преподаватель не найден"));
            }

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> selectedSlots = (List<Map<String, Object>>) scheduleData.get("selectedSlots");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> slotsToDelete = (List<Map<String, Object>>) scheduleData.get("slotsToDelete");
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> lessonsToDelete = (List<Map<String, Object>>) scheduleData.get("lessonsToDelete");

            // Удаляем слоты, помеченные для удаления
            if (slotsToDelete != null) {
                for (Map<String, Object> slot : slotsToDelete) {
                    String dayOfWeekStr = (String) slot.get("dayOfWeek");
                    String startTimeStr = (String) slot.get("startTime");
                    
                    DayOfWeek dayOfWeek = DayOfWeek.valueOf(dayOfWeekStr);
                    LocalTime startTime = LocalTime.parse(startTimeStr);
                    
                    // Находим и удаляем существующий слот
                    List<TeacherSchedule> existingSchedules = teacherScheduleRepository.findByTeacherOrderByDayOfWeekAscStartTimeAsc(teacher);
                    for (TeacherSchedule existing : existingSchedules) {
                        if (existing.getDayOfWeek().equals(dayOfWeek) && 
                            existing.getStartTime().equals(startTime)) {
                            teacherScheduleRepository.delete(existing);
                            break;
                        }
                    }
                }
            }

            // Удаляем уроки, помеченные для удаления
            if (lessonsToDelete != null) {
                for (Map<String, Object> lessonSlot : lessonsToDelete) {
                    String dayOfWeekStr = (String) lessonSlot.get("dayOfWeek");
                    String startTimeStr = (String) lessonSlot.get("startTime");
                    
                    DayOfWeek dayOfWeek = DayOfWeek.valueOf(dayOfWeekStr);
                    LocalTime startTime = LocalTime.parse(startTimeStr);
                    
                    // Находим уроки преподавателя на это время
                    LocalDateTime lessonDateTime = getDateFromDayAndHour(dayOfWeek.toString(), String.valueOf(startTime.getHour()), 0);
                    List<Lesson> lessons = lessonRepository.findByTeacherAndLessonDateBetween(
                        teacher,
                        lessonDateTime,
                        lessonDateTime.plusHours(1)
                    );
                    
                    for (Lesson lesson : lessons) {
                        // Если это повторяющийся урок, удаляем все связанные уроки
                        if (lesson.getIsRecurring() && lesson.getOriginalLessonId() == null) {
                            List<Lesson> relatedLessons = lessonRepository.findByOriginalLessonId(lesson.getId());
                            lessonRepository.deleteAll(relatedLessons);
                            lessonRepository.delete(lesson);
                        } else if (lesson.getIsRecurring() && lesson.getOriginalLessonId() != null) {
                            // Это связанный урок, удаляем только его
                            lessonRepository.delete(lesson);
                        } else {
                            // Обычный урок, удаляем только его
                            lessonRepository.delete(lesson);
                        }
                    }
                }
            }

            // Добавляем новые слоты
            if (selectedSlots != null) {
                for (Map<String, Object> slot : selectedSlots) {
                    String dayOfWeekStr = (String) slot.get("dayOfWeek");
                    String startTimeStr = (String) slot.get("startTime");
                    
                    DayOfWeek dayOfWeek = DayOfWeek.valueOf(dayOfWeekStr);
                    LocalTime startTime = LocalTime.parse(startTimeStr);
                    LocalTime endTime = startTime.plusHours(1); // Каждый слот - 1 час

                    TeacherSchedule schedule = new TeacherSchedule(teacher, dayOfWeek, startTime, endTime);
                    teacherScheduleRepository.save(schedule);
                }
            }

            return ResponseEntity.ok(Map.of("status", "success", "message", "Расписание успешно сохранено"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Ошибка сохранения расписания: " + e.getMessage()));
        }
    }

    // API для деактивации/активации слота времени преподавателя
    @PostMapping("/api/teacher/{teacherId}/schedule/{scheduleId}/toggle")
    @ResponseBody
    @Transactional
    public ResponseEntity<Map<String, Object>> toggleScheduleSlot(
            @PathVariable Long teacherId,
            @PathVariable Long scheduleId,
            HttpSession session) {
        
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || 
            (!currentUser.getRole().equals(UserRole.ADMIN) && !currentUser.getRole().equals(UserRole.MANAGER))) {
            return ResponseEntity.status(403).build();
        }

        Map<String, Object> response = new HashMap<>();

        try {
            TeacherSchedule schedule = teacherScheduleRepository.findById(scheduleId).orElse(null);
            if (schedule == null || !schedule.getTeacher().getId().equals(teacherId)) {
                response.put("status", "error");
                response.put("message", "Слот расписания не найден");
                return ResponseEntity.status(404).body(response);
            }

            // Проверяем, есть ли уроки на этот слот
            LocalDateTime scheduleDateTime = LocalDateTime.of(
                LocalDateTime.now().toLocalDate().with(schedule.getDayOfWeek()),
                schedule.getStartTime()
            );
            
            List<Lesson> lessons = lessonRepository.findByTeacherAndLessonDateBetween(
                schedule.getTeacher(), 
                scheduleDateTime, 
                scheduleDateTime.plusHours(1)
            );

            if (!lessons.isEmpty() && schedule.getIsAvailable()) {
                response.put("status", "error");
                response.put("message", "Нельзя деактивировать слот с назначенным уроком");
                return ResponseEntity.badRequest().body(response);
            }

            // Переключаем статус
            schedule.setIsAvailable(!schedule.getIsAvailable());
            teacherScheduleRepository.save(schedule);

            response.put("status", "success");
            response.put("message", schedule.getIsAvailable() ? "Слот активирован" : "Слот деактивирован");
            response.put("isAvailable", schedule.getIsAvailable());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", "Ошибка при изменении слота: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    // API для получения всех преподавателей
    @GetMapping("/api/teachers")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getTeachers(HttpSession session) {
        try {
            User currentUser = sessionManager.getCurrentUser(session);
            if (currentUser == null || 
                (!currentUser.getRole().equals(UserRole.ADMIN) && !currentUser.getRole().equals(UserRole.MANAGER))) {
                return ResponseEntity.status(403).body(Map.of("error", "Доступ запрещен"));
            }

            List<User> teachers = userRepository.findByRole(UserRole.TEACHER);
            List<Map<String, Object>> teacherData = teachers.stream()
                .map(teacher -> {
                    Map<String, Object> teacherInfo = new HashMap<>();
                    teacherInfo.put("id", teacher.getId());
                    teacherInfo.put("name", teacher.getName());
                    teacherInfo.put("email", teacher.getEmail());
                    teacherInfo.put("phone", teacher.getPhone());
                    teacherInfo.put("isActive", teacher.getIsActive());
                    
                    // Получаем предметы преподавателя
                    List<String> subjects = teacher.getSubjects().stream()
                        .map(Subject::getName)
                        .collect(Collectors.toList());
                    teacherInfo.put("subjects", subjects);
                    
                    return teacherInfo;
                })
                .collect(Collectors.toList());

            return ResponseEntity.ok(Map.of("teachers", teacherData));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Ошибка получения преподавателей: " + e.getMessage()));
        }
    }

    // API для создания урока
    @PostMapping("/api/create-lesson")
    @ResponseBody
    @Transactional
    public ResponseEntity<Map<String, Object>> createLesson(
            @RequestParam Long studentId,
            @RequestParam Long teacherId,
            @RequestParam Long subjectId,
            @RequestParam String lessonDate,
            @RequestParam(required = false) String description,
            HttpSession session) {
        
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || 
            (!currentUser.getRole().equals(UserRole.ADMIN) && !currentUser.getRole().equals(UserRole.MANAGER))) {
            return ResponseEntity.status(403).build();
        }

        Map<String, Object> response = new HashMap<>();

        try {
            User student = userRepository.findById(studentId).orElse(null);
            User teacher = userRepository.findById(teacherId).orElse(null);
            Subject subject = subjectRepository.findById(subjectId).orElse(null);

            if (student == null || teacher == null || subject == null) {
                response.put("status", "error");
                response.put("message", "Студент, преподаватель или предмет не найден");
                return ResponseEntity.badRequest().body(response);
            }

            LocalDateTime parsedLessonDate;
            try {
                parsedLessonDate = LocalDateTime.parse(lessonDate);
            } catch (Exception e) {
                response.put("status", "error");
                response.put("message", "Неверный формат даты урока");
                return ResponseEntity.badRequest().body(response);
            }

            // Проверяем конфликты времени
            List<Lesson> conflicts = lessonRepository.findConflictingLessonsForTeacher(teacher, parsedLessonDate);
            if (!conflicts.isEmpty()) {
                response.put("status", "error");
                response.put("message", "На это время у преподавателя уже есть урок");
                return ResponseEntity.badRequest().body(response);
            }

            // Создаем урок
            Lesson lesson = new Lesson();
            lesson.setStudent(student);
            lesson.setTeacher(teacher);
            lesson.setSubject(subject);
            lesson.setLessonDate(parsedLessonDate);
            lesson.setStatus(Lesson.LessonStatus.SCHEDULED);
            if (description != null && !description.trim().isEmpty()) {
                lesson.setDescription(description);
            }

            lessonRepository.save(lesson);

            response.put("status", "success");
            response.put("message", "Урок успешно создан");
            response.put("lessonId", lesson.getId());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("status", "error");
            response.put("message", "Ошибка при создании урока: " + e.getMessage());
            return ResponseEntity.status(500).body(response);
        }
    }

    // API для получения оставшихся занятий студента
    @GetMapping("/api/student/{studentId}/remaining-lessons")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getStudentRemainingLessons(
            @PathVariable Long studentId,
            HttpSession session) {
        
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || 
            (!currentUser.getRole().equals(UserRole.ADMIN) && !currentUser.getRole().equals(UserRole.MANAGER))) {
            return ResponseEntity.status(403).build();
        }

        try {
            User student = userRepository.findById(studentId).orElse(null);
            if (student == null) {
                return ResponseEntity.ok(Map.of("status", "error", "message", "Студент не найден"));
            }

            Integer remainingLessons = student.getRemainingLessons();
            return ResponseEntity.ok(Map.of(
                "status", "success", 
                "remainingLessons", remainingLessons != null ? remainingLessons : 0
            ));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("status", "error", "message", "Ошибка получения данных: " + e.getMessage()));
        }
    }

    // API для создания уроков с поддержкой повторения
    @PostMapping("/api/create-lessons")
    @ResponseBody
    @Transactional
    public ResponseEntity<Map<String, Object>> createLessons(
            @RequestBody Map<String, Object> request,
            HttpSession session) {
        
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || 
            (!currentUser.getRole().equals(UserRole.ADMIN) && !currentUser.getRole().equals(UserRole.MANAGER))) {
            return ResponseEntity.status(403).build();
        }

        try {
            Long studentId = Long.valueOf(String.valueOf(request.get("studentId")));
            Long subjectId = Long.valueOf(String.valueOf(request.get("subjectId")));
            @SuppressWarnings("unchecked")
            List<String> selectedSlots = (List<String>) request.get("selectedSlots");
            Boolean repeatWeekly = (Boolean) request.get("repeatWeekly");
            Integer recurrenceWeeks = (Integer) request.get("recurrenceWeeks");

            User student = userRepository.findById(studentId).orElse(null);
            Subject subject = subjectRepository.findById(subjectId).orElse(null);

            if (student == null || subject == null) {
                return ResponseEntity.ok(Map.of("status", "error", "message", "Не найдены студент или предмет"));
            }

            // Получаем назначенного преподавателя для данного предмета
            StudentTeacher assignment = studentTeacherRepository.findActiveByStudentAndSubject(student, subject).orElse(null);
            if (assignment == null) {
                return ResponseEntity.ok(Map.of("status", "error", "message", "Не назначен преподаватель для данного предмета"));
            }
            
            User teacher = assignment.getTeacher();

            // Проверяем количество оставшихся занятий
            Integer remainingLessons = student.getRemainingLessons();
            if (remainingLessons == null) remainingLessons = 0;
            
            int totalLessonsToCreate = repeatWeekly ? selectedSlots.size() * recurrenceWeeks : selectedSlots.size();
            int scheduledLessonsCount = Math.toIntExact(lessonRepository.countByStudentAndStatus(student, Lesson.LessonStatus.SCHEDULED));
            int availableLessons = remainingLessons - scheduledLessonsCount;
            
            if (availableLessons < totalLessonsToCreate) {
                return ResponseEntity.ok(Map.of(
                    "status", "error", 
                    "message", "Недостаточно занятий на балансе. Доступно: " + Math.max(availableLessons, 0) + ", требуется: " + totalLessonsToCreate
                ));
            }

            int createdLessons = 0;
            Long originalLessonId = null;

            // Определяем количество недель для создания уроков
            int weeksToCreate = repeatWeekly ? recurrenceWeeks : 1;
            
            for (int week = 0; week < weeksToCreate; week++) {
                for (String slotId : selectedSlots) {
                    String[] parts = slotId.split("_");
                    String day = parts[0];
                    String hour = parts[1];
                    
                    LocalDateTime lessonDate = getDateFromDayAndHour(day, hour, week);
                    
                    Lesson lesson = new Lesson(student, teacher, subject, lessonDate);
                    
                    // Устанавливаем параметры повторения только если включено
                    if (repeatWeekly) {
                        lesson.setIsRecurring(true);
                        lesson.setRecurrenceWeeks(recurrenceWeeks);
                        if (week == 0) {
                            // Первый урок будет оригинальным
                            lessonRepository.save(lesson);
                            originalLessonId = lesson.getId();
                        } else {
                            // Последующие уроки ссылаются на оригинальный
                            lesson.setOriginalLessonId(originalLessonId);
                        }
                    } else {
                        // Если повторение не включено, создаем только один урок
                        lesson.setIsRecurring(false);
                        lesson.setRecurrenceWeeks(0);
                    }
                    
                    lessonRepository.save(lesson);
                    createdLessons++;
                }
            }

            return ResponseEntity.ok(Map.of(
                "status", "success", 
                "message", "Уроки созданы", 
                "createdLessons", createdLessons
            ));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("status", "error", "message", "Ошибка создания уроков: " + e.getMessage()));
        }
    }

    // API для создания уроков по конкретным датам
    @PostMapping("/api/create-lessons-by-dates")
    @ResponseBody
    @Transactional
    public ResponseEntity<Map<String, Object>> createLessonsByDates(
            @RequestBody Map<String, Object> request,
            HttpSession session) {
        
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || 
            (!currentUser.getRole().equals(UserRole.ADMIN) && !currentUser.getRole().equals(UserRole.MANAGER))) {
            return ResponseEntity.status(403).build();
        }

        try {
            Long studentId = Long.valueOf(String.valueOf(request.get("studentId")));
            Long subjectId = Long.valueOf(String.valueOf(request.get("subjectId")));
            @SuppressWarnings("unchecked")
            List<String> lessonDates = (List<String>) request.get("lessonDates");
            Boolean repeatWeekly = (Boolean) request.get("repeatWeekly");
            Integer recurrenceWeeks = (Integer) request.get("recurrenceWeeks");

            User student = userRepository.findById(studentId).orElse(null);
            Subject subject = subjectRepository.findById(subjectId).orElse(null);

            if (student == null || subject == null) {
                return ResponseEntity.ok(Map.of("status", "error", "message", "Не найдены студент или предмет"));
            }

            // Получаем назначенного преподавателя для данного предмета
            StudentTeacher assignment = studentTeacherRepository.findActiveByStudentAndSubject(student, subject).orElse(null);
            if (assignment == null) {
                return ResponseEntity.ok(Map.of("status", "error", "message", "Не назначен преподаватель для данного предмета"));
            }
            
            User teacher = assignment.getTeacher();

            // Проверяем количество оставшихся занятий
            Integer remainingLessons = student.getRemainingLessons();
            if (remainingLessons == null) remainingLessons = 0;
            
            int totalLessonsToCreate = lessonDates.size();
            int scheduledLessonsCount = Math.toIntExact(lessonRepository.countByStudentAndStatus(student, Lesson.LessonStatus.SCHEDULED));
            int availableLessons = remainingLessons - scheduledLessonsCount;
            
            if (availableLessons < totalLessonsToCreate) {
                return ResponseEntity.ok(Map.of(
                    "status", "error", 
                    "message", "Недостаточно занятий на балансе. Доступно: " + Math.max(availableLessons, 0) + ", требуется: " + totalLessonsToCreate
                ));
            }

            int createdLessons = 0;
            Long originalLessonId = null;

            for (int i = 0; i < lessonDates.size(); i++) {
                String dateStr = lessonDates.get(i);
                LocalDateTime lessonDate;
                
                try {
                    // Пытаемся распарсить дату с timezone (например, "2025-08-12T15:00:00.000Z")
                    if (dateStr.endsWith("Z")) {
                        lessonDate = LocalDateTime.parse(dateStr.substring(0, dateStr.length() - 1));
                    } else if (dateStr.contains("+") || dateStr.lastIndexOf("-") > 10) {
                        // Обрабатываем другие форматы с timezone
                        lessonDate = LocalDateTime.parse(dateStr.substring(0, 19));
                    } else {
                        lessonDate = LocalDateTime.parse(dateStr);
                    }
                } catch (Exception e) {
                    return ResponseEntity.ok(Map.of("status", "error", "message", "Неверный формат даты: " + dateStr));
                }
                
                Lesson lesson = new Lesson(student, teacher, subject, lessonDate);
                
                // Устанавливаем параметры повторения только если включено
                if (repeatWeekly) {
                    lesson.setIsRecurring(true);
                    lesson.setRecurrenceWeeks(recurrenceWeeks);
                    if (i == 0) {
                        // Первый урок будет оригинальным
                        lessonRepository.save(lesson);
                        originalLessonId = lesson.getId();
                    } else {
                        // Последующие уроки ссылаются на оригинальный
                        lesson.setOriginalLessonId(originalLessonId);
                    }
                } else {
                    // Если повторение не включено, создаем только один урок
                    lesson.setIsRecurring(false);
                    lesson.setRecurrenceWeeks(0);
                }
                
                lessonRepository.save(lesson);
                System.out.println("✅ Создан урок ID " + lesson.getId() + 
                                 ", дата: " + lesson.getLessonDate() + 
                                 ", студент: " + student.getName() +
                                 ", преподаватель: " + teacher.getName() +
                                 ", предмет: " + subject.getName());
                createdLessons++;
            }

            return ResponseEntity.ok(Map.of(
                "status", "success", 
                "message", "Уроки созданы", 
                "createdLessons", createdLessons
            ));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("status", "error", "message", "Ошибка создания уроков: " + e.getMessage()));
        }
    }

    // Вспомогательный метод для получения даты из дня недели и часа
    private LocalDateTime getDateFromDayAndHour(String day, String hour, int weekOffset) {
        return getDateFromDayAndHour(day, hour, weekOffset, LocalDateTime.now());
    }

    // Перегруженный метод для получения даты из дня недели и часа с базовой датой
    private LocalDateTime getDateFromDayAndHour(String day, String hour, int weekOffset, LocalDateTime baseDate) {
        Map<String, DayOfWeek> dayMap = Map.of(
            "MONDAY", DayOfWeek.MONDAY,
            "TUESDAY", DayOfWeek.TUESDAY,
            "WEDNESDAY", DayOfWeek.WEDNESDAY,
            "THURSDAY", DayOfWeek.THURSDAY,
            "FRIDAY", DayOfWeek.FRIDAY,
            "SATURDAY", DayOfWeek.SATURDAY,
            "SUNDAY", DayOfWeek.SUNDAY
        );

        DayOfWeek targetDay = dayMap.getOrDefault(day, DayOfWeek.MONDAY);

        LocalDate baseMonday = baseDate.toLocalDate()
            .with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY))
            .plusWeeks(weekOffset);

        int dayOffset = targetDay.getValue() - DayOfWeek.MONDAY.getValue();
        LocalDate targetDate = baseMonday.plusDays(dayOffset);

        String normalizedHour = hour.contains(":") ? hour : hour + ":00";
        if (normalizedHour.length() == 2) {
            normalizedHour += ":00";
        }
        String[] timeParts = normalizedHour.split(":");
        int hourValue = Integer.parseInt(timeParts[0]);
        int minuteValue = timeParts.length > 1 ? Integer.parseInt(timeParts[1]) : 0;
        LocalTime time = LocalTime.of(hourValue, minuteValue);

        return targetDate.atTime(time);
    }

    // API для удаления урока
    @DeleteMapping("/api/lesson/{lessonId}")
    @ResponseBody
    @Transactional
    public ResponseEntity<Map<String, Object>> deleteLesson(
            @PathVariable Long lessonId,
            HttpSession session) {
        
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || 
            (!currentUser.getRole().equals(UserRole.ADMIN) && !currentUser.getRole().equals(UserRole.MANAGER))) {
            return ResponseEntity.status(403).build();
        }

        try {
            Lesson lesson = lessonRepository.findById(lessonId).orElse(null);
            if (lesson == null) {
                return ResponseEntity.ok(Map.of("status", "error", "message", "Урок не найден"));
            }

            boolean isRecurring = Boolean.TRUE.equals(lesson.getIsRecurring());
            Long originalLessonId = lesson.getOriginalLessonId();

            List<Lesson> lessonsToRemove = new ArrayList<>();

            if (isRecurring && originalLessonId == null) {
                lessonsToRemove.add(lesson);
                lessonsToRemove.addAll(lessonRepository.findByOriginalLessonId(lessonId));
            } else {
                lessonsToRemove.add(lesson);
            }

            for (Lesson lessonToRemove : lessonsToRemove) {
                if (lessonToRemove.getStatus() != Lesson.LessonStatus.COMPLETED) {
                    User student = lessonToRemove.getStudent();
                    if (student != null) {
                        Integer remainingLessons = student.getRemainingLessons();
                        if (remainingLessons == null) {
                            remainingLessons = 0;
                        }
                        student.setRemainingLessons(remainingLessons + 1);
                        userRepository.save(student);
                    }
                }
            }

            lessonRepository.deleteAll(lessonsToRemove);

            return ResponseEntity.ok(Map.of("status", "success", "message", "Урок удален"));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("status", "error", "message", "Ошибка удаления урока: " + e.getMessage()));
        }
    }

    // API для получения расписания ученика
    @GetMapping("/api/student/{studentId}/schedule")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getStudentSchedule(
            @PathVariable Long studentId,
            @RequestParam(defaultValue = "0") int weekOffset,
            @RequestParam(required = false) Long subjectId,
            HttpSession session) {
        try {
            User currentUser = sessionManager.getCurrentUser(session);
            if (currentUser == null || 
                (!currentUser.getRole().equals(UserRole.ADMIN) && !currentUser.getRole().equals(UserRole.MANAGER))) {
                return ResponseEntity.status(403).body(Map.of("error", "Доступ запрещен"));
            }

            User student = userRepository.findById(studentId).orElse(null);
            if (student == null || !student.getRole().equals(UserRole.STUDENT)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Ученик не найден"));
            }

            // Получаем назначенных преподавателей ученика
            List<StudentTeacher> assignments = studentTeacherRepository.findByStudentAndIsActiveTrue(student);
            
            // Если указан предмет, фильтруем только по нему
            if (subjectId != null) {
                assignments = assignments.stream()
                    .filter(assignment -> assignment.getSubject().getId().equals(subjectId))
                    .collect(Collectors.toList());
            }
            
            // Получаем расписание всех преподавателей ученика
            Map<String, Object> scheduleData = new HashMap<>();
            scheduleData.put("studentId", studentId);
            scheduleData.put("studentName", student.getName());
            scheduleData.put("weekOffset", weekOffset);
            
            List<Map<String, Object>> availableSlots = new ArrayList<>();
            List<Map<String, Object>> bookedSlots = new ArrayList<>();
            
            for (StudentTeacher assignment : assignments) {
                User teacher = assignment.getTeacher();
                Subject subject = assignment.getSubject();
                
                // Получаем рабочее расписание преподавателя
                List<TeacherSchedule> teacherSchedules = teacherScheduleRepository.findByTeacherAndIsAvailableTrueOrderByDayOfWeekAscStartTimeAsc(teacher);
                
                for (TeacherSchedule schedule : teacherSchedules) {
                    Map<String, Object> slot = new HashMap<>();
                    slot.put("dayOfWeek", schedule.getDayOfWeek().name());
                    slot.put("startTime", schedule.getStartTime().toString());
                    slot.put("endTime", schedule.getEndTime().toString());
                    slot.put("teacherId", teacher.getId());
                    slot.put("teacherName", teacher.getName());
                    slot.put("subjectId", subject.getId());
                    slot.put("subjectName", subject.getName());
                    
                    // Проверяем, есть ли уже урок на это время
                    // TODO: Добавить проверку существующих уроков
                    availableSlots.add(slot);
                }
            }
            
            // Получаем забронированные уроки ученика
            LocalDateTime now = LocalDateTime.now();
            List<Lesson> studentLessons = lessonRepository.findByStudentAndLessonDateBetween(
                student,
                getDateFromDayAndHour("MONDAY", "12", weekOffset),
                getDateFromDayAndHour("SUNDAY", "23", weekOffset)
            );
            
            for (Lesson lesson : studentLessons) {
                Map<String, Object> lessonData = new HashMap<>();
                lessonData.put("dayOfWeek", lesson.getLessonDate().getDayOfWeek().name());
                lessonData.put("startTime", lesson.getLessonDate().toLocalTime().toString());
                lessonData.put("subjectName", lesson.getSubject().getName());
                lessonData.put("teacherName", lesson.getTeacher().getName());
                lessonData.put("lessonId", lesson.getId());
                lessonData.put("isPast", lesson.getLessonDate().isBefore(now));
                bookedSlots.add(lessonData);
            }
            
            // Получаем слоты, занятые другими учениками у тех же преподавателей
            List<Map<String, Object>> occupiedByOthers = new ArrayList<>();
            for (StudentTeacher assignment : assignments) {
                User teacher = assignment.getTeacher();
                
                // Получаем все уроки преподавателя на эту неделю
                List<Lesson> teacherLessons = lessonRepository.findByTeacherAndLessonDateBetween(
                    teacher,
                    getDateFromDayAndHour("MONDAY", "12", weekOffset),
                    getDateFromDayAndHour("SUNDAY", "23", weekOffset)
                );
                
                for (Lesson lesson : teacherLessons) {
                    // Исключаем уроки текущего ученика
                    if (!lesson.getStudent().getId().equals(studentId)) {
                        Map<String, Object> occupiedSlot = new HashMap<>();
                        occupiedSlot.put("dayOfWeek", lesson.getLessonDate().getDayOfWeek().name());
                        occupiedSlot.put("startTime", lesson.getLessonDate().toLocalTime().toString());
                        occupiedSlot.put("subjectName", lesson.getSubject().getName());
                        occupiedSlot.put("studentName", lesson.getStudent().getName());
                        occupiedSlot.put("teacherName", lesson.getTeacher().getName());
                        occupiedByOthers.add(occupiedSlot);
                    }
                }
            }
            
            scheduleData.put("availableSlots", availableSlots);
            scheduleData.put("bookedSlots", bookedSlots);
            scheduleData.put("occupiedByOthers", occupiedByOthers);

            return ResponseEntity.ok(scheduleData);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Ошибка получения расписания: " + e.getMessage()));
        }
    }

    // API для отмены уроков ученика
    @PostMapping("/api/student/{studentId}/lessons-to-cancel")
    @ResponseBody
    @Transactional
    public ResponseEntity<Map<String, Object>> cancelStudentLessons(
            @PathVariable Long studentId,
            @RequestBody Map<String, Object> request,
            HttpSession session) {
        
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || 
            (!currentUser.getRole().equals(UserRole.ADMIN) && !currentUser.getRole().equals(UserRole.MANAGER))) {
            return ResponseEntity.status(403).build();
        }

        try {
            @SuppressWarnings("unchecked")
            List<String> slotsToDelete = (List<String>) request.get("slotsToDelete");
            Integer weekOffset = (Integer) request.get("weekOffset");

            User student = userRepository.findById(studentId).orElse(null);
            if (student == null) {
                return ResponseEntity.ok(Map.of("status", "error", "message", "Ученик не найден"));
            }

            int cancelledLessons = 0;

            for (String slotId : slotsToDelete) {
                String[] parts = slotId.split("_");
                String day = parts[0];
                String hour = parts[1];
                
                LocalDateTime lessonDate = getDateFromDayAndHour(day, hour, weekOffset);
                
                // Находим урок ученика на это время
                List<Lesson> lessons = lessonRepository.findByStudentAndLessonDateBetween(
                    student,
                    lessonDate,
                    lessonDate.plusHours(1)
                );
                
                for (Lesson lesson : lessons) {
                    // Если это повторяющийся урок, удаляем все связанные уроки
                    if (lesson.getIsRecurring() && lesson.getOriginalLessonId() == null) {
                        List<Lesson> relatedLessons = lessonRepository.findByOriginalLessonId(lesson.getId());
                        lessonRepository.deleteAll(relatedLessons);
                        lessonRepository.delete(lesson);
                        cancelledLessons += relatedLessons.size() + 1;
                    } else if (lesson.getIsRecurring() && lesson.getOriginalLessonId() != null) {
                        // Это связанный урок, удаляем только его
                        lessonRepository.delete(lesson);
                        cancelledLessons++;
                    } else {
                        // Обычный урок, удаляем только его
                        lessonRepository.delete(lesson);
                        cancelledLessons++;
                    }
                }
            }

            return ResponseEntity.ok(Map.of(
                "status", "success", 
                "message", "Уроки отменены", 
                "cancelledLessons", cancelledLessons
            ));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("status", "error", "message", "Ошибка отмены уроков: " + e.getMessage()));
        }
    }

    // API для получения уроков преподавателя на определенную неделю
    @GetMapping("/api/teacher/{teacherId}/lessons")
    @ResponseBody
    public ResponseEntity<List<Map<String, Object>>> getTeacherLessons(
            @PathVariable Long teacherId,
            @RequestParam String weekStart,
            HttpSession session) {
        
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || 
            (!currentUser.getRole().equals(UserRole.ADMIN) && !currentUser.getRole().equals(UserRole.MANAGER))) {
            return ResponseEntity.status(403).build();
        }

        try {
            LocalDateTime weekStartDate;
            LocalDateTime weekEndDate;
            
            try {
                // Пытаемся распарсить дату с timezone (например, "2025-08-12T15:00:00.000Z")
                if (weekStart.endsWith("Z")) {
                    weekStartDate = LocalDateTime.parse(weekStart.substring(0, weekStart.length() - 1));
                } else if (weekStart.contains("+") || weekStart.lastIndexOf("-") > 10) {
                    // Обрабатываем другие форматы с timezone
                    weekStartDate = LocalDateTime.parse(weekStart.substring(0, 19));
                } else {
                    weekStartDate = LocalDateTime.parse(weekStart);
                }
            } catch (Exception parseException) {
                return ResponseEntity.ok(new ArrayList<>());
            }
            
            weekEndDate = weekStartDate.plusDays(7);
            
            System.out.println("🔍 Поиск уроков для преподавателя " + teacherId + " с " + weekStartDate + " по " + weekEndDate);
            
            List<Lesson> lessons = lessonRepository.findByTeacherIdAndLessonDateBetween(teacherId, weekStartDate, weekEndDate);
            
            System.out.println("📚 Найдено уроков: " + lessons.size());
            if (lessons.size() > 0) {
                System.out.println("📋 Список найденных уроков:");
                for (Lesson lesson : lessons) {
                    System.out.println("  - Урок ID " + lesson.getId() + 
                                     ", дата: " + lesson.getLessonDate() + 
                                     ", студент: " + lesson.getStudent().getName() +
                                     ", предмет: " + lesson.getSubject().getName());
                }
            }
            
            List<Map<String, Object>> result = lessons.stream().map(lesson -> {
                Map<String, Object> lessonInfo = new HashMap<>();
                lessonInfo.put("id", lesson.getId());
                lessonInfo.put("studentName", lesson.getStudent().getName());
                lessonInfo.put("studentId", lesson.getStudent().getId());
                lessonInfo.put("subjectName", lesson.getSubject().getName());
                lessonInfo.put("lessonDate", lesson.getLessonDate());
                lessonInfo.put("isRecurring", lesson.getIsRecurring());
                
                System.out.println("Урок: " + lesson.getId() + ", дата: " + lesson.getLessonDate() + 
                                 ", студент: " + lesson.getStudent().getName());
                
                return lessonInfo;
            }).collect(Collectors.toList());
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            System.err.println("Ошибка при получении уроков: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.ok(new ArrayList<>());
        }
    }
} 