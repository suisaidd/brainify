package com.example.brainify.Controllers;

import com.example.brainify.Model.User;
import com.example.brainify.Model.Lesson;
import com.example.brainify.Repository.LessonRepository;
import com.example.brainify.Config.SessionManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ResponseBody;
import jakarta.servlet.http.HttpSession;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.stream.Collectors;
import com.example.brainify.Model.UserRole;

@Controller
public class MainController {

    @Autowired
    private SessionManager sessionManager;
    
    @Autowired
    private LessonRepository lessonRepository;

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
} 