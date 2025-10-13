package com.example.brainify.Controllers;

import com.example.brainify.Model.Subject;
import com.example.brainify.Model.TaskNumber;
import com.example.brainify.Model.Subtopic;
import com.example.brainify.Model.Task;
import com.example.brainify.Repository.SubjectRepository;
import com.example.brainify.Repository.TaskNumberRepository;
import com.example.brainify.Repository.SubtopicRepository;
import com.example.brainify.Repository.TaskRepository;
import com.example.brainify.Config.SessionManager;
import com.example.brainify.Model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpSession;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;

@Controller
public class TrainerController {

    @Autowired
    private SessionManager sessionManager;
    
    @Autowired
    private SubjectRepository subjectRepository;
    
    @Autowired
    private TaskNumberRepository taskNumberRepository;
    
    @Autowired
    private SubtopicRepository subtopicRepository;
    
    @Autowired
    private TaskRepository taskRepository;

    // Страница предмета с номерами заданий
    @GetMapping("/trainers/{examType}/{subjectName}")
    public String subjectPage(
            @PathVariable String examType,
            @PathVariable String subjectName,
            Model model,
            HttpSession session) {
        
        // Проверяем авторизацию (необязательно)
        User currentUser = sessionManager.getCurrentUser(session);
        model.addAttribute("currentUser", currentUser);
        model.addAttribute("isAuthenticated", currentUser != null);
        
        // Находим предмет
        Optional<Subject> subjectOpt = subjectRepository.findByNameAndIsActiveTrue(subjectName);
        if (subjectOpt.isEmpty()) {
            model.addAttribute("error", "Предмет не найден");
            return "error";
        }
        
        Subject subject = subjectOpt.get();
        
        // Получаем номера заданий для этого предмета и типа экзамена
        List<TaskNumber> taskNumbers = taskNumberRepository.findBySubjectAndExamTypeAndIsActiveTrueOrderByNumberAsc(subject, examType.toUpperCase());
        
        model.addAttribute("pageTitle", subject.getName() + " " + examType.toUpperCase() + " - Тренажёры");
        model.addAttribute("subject", subject);
        model.addAttribute("examType", examType.toUpperCase());
        model.addAttribute("taskNumbers", taskNumbers);
        
        return "subject-page";
    }
    
    // API для получения подтем номера задания
    @GetMapping("/api/trainers/{examType}/{subjectName}/task/{taskNumber}")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getSubtopics(
            @PathVariable String examType,
            @PathVariable String subjectName,
            @PathVariable Integer taskNumber) {
        
        try {
            // Находим предмет
            Optional<Subject> subjectOpt = subjectRepository.findByNameAndIsActiveTrue(subjectName);
            if (subjectOpt.isEmpty()) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Предмет не найден");
                return ResponseEntity.badRequest().body(error);
            }
            
            Subject subject = subjectOpt.get();
            
            // Находим номер задания
            TaskNumber taskNumberObj = taskNumberRepository.findBySubjectAndExamTypeAndNumberAndIsActiveTrue(
                subject, examType.toUpperCase(), taskNumber);
            
            if (taskNumberObj == null) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Номер задания не найден");
                return ResponseEntity.badRequest().body(error);
            }
            
            // Получаем подтемы
            List<Subtopic> subtopics = subtopicRepository.findByTaskNumberAndIsActiveTrueOrderBySortOrderAsc(taskNumberObj);
            
            Map<String, Object> response = new HashMap<>();
            response.put("taskNumber", taskNumber);
            response.put("subtopics", subtopics.stream().map(st -> {
                Map<String, Object> subtopicData = new HashMap<>();
                subtopicData.put("id", st.getId());
                subtopicData.put("name", st.getName());
                subtopicData.put("description", st.getDescription());
                subtopicData.put("sortOrder", st.getSortOrder());
                return subtopicData;
            }).toList());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Ошибка при получении подтем: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
    
    // Страница с заданиями подтемы
    @GetMapping("/trainers/{examType}/{subjectName}/task/{taskNumber}/subtopic/{subtopicId}")
    public String subtopicTasksPage(
            @PathVariable String examType,
            @PathVariable String subjectName,
            @PathVariable Integer taskNumber,
            @PathVariable Long subtopicId,
            Model model,
            HttpSession session) {
        
        // Проверяем авторизацию (необязательно)
        User currentUser = sessionManager.getCurrentUser(session);
        model.addAttribute("currentUser", currentUser);
        model.addAttribute("isAuthenticated", currentUser != null);
        
        try {
            // Находим подтему
            Optional<Subtopic> subtopicOpt = subtopicRepository.findById(subtopicId);
            if (subtopicOpt.isEmpty() || !subtopicOpt.get().getIsActive()) {
                model.addAttribute("error", "Подтема не найдена");
                return "error";
            }
            
            Subtopic subtopic = subtopicOpt.get();
            
            // Получаем задания для этой подтемы
            List<Task> tasks = taskRepository.findBySubtopicAndIsActiveTrueOrderByCreatedAtAsc(subtopic);
            
            model.addAttribute("pageTitle", subtopic.getName() + " - " + subjectName + " " + examType.toUpperCase());
            model.addAttribute("subjectName", subjectName);
            model.addAttribute("examType", examType.toUpperCase());
            model.addAttribute("taskNumber", taskNumber);
            model.addAttribute("subtopic", subtopic);
            model.addAttribute("tasks", tasks);
            
            return "subtopic-tasks";
            
        } catch (Exception e) {
            model.addAttribute("error", "Ошибка при загрузке заданий: " + e.getMessage());
            return "error";
        }
    }
    
    // API для получения заданий подтемы
    @GetMapping("/api/trainers/subtopic/{subtopicId}/tasks")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getSubtopicTasks(@PathVariable Long subtopicId) {
        try {
            Optional<Subtopic> subtopicOpt = subtopicRepository.findById(subtopicId);
            if (subtopicOpt.isEmpty() || !subtopicOpt.get().getIsActive()) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Подтема не найдена");
                return ResponseEntity.badRequest().body(error);
            }
            
            Subtopic subtopic = subtopicOpt.get();
            List<Task> tasks = taskRepository.findBySubtopicAndIsActiveTrueOrderByCreatedAtAsc(subtopic);
            
            Map<String, Object> response = new HashMap<>();
            response.put("subtopic", Map.of(
                "id", subtopic.getId(),
                "name", subtopic.getName(),
                "description", subtopic.getDescription()
            ));
            response.put("tasks", tasks.stream().map(task -> {
                Map<String, Object> taskData = new HashMap<>();
                taskData.put("id", task.getId());
                taskData.put("question", task.getQuestion());
                taskData.put("answer", task.getAnswer());
                taskData.put("solution", task.getSolution());
                taskData.put("difficultyLevel", task.getDifficultyLevel());
                taskData.put("points", task.getPoints());
                taskData.put("hasImage", task.getImageData() != null);
                taskData.put("imageType", task.getImageType());
                return taskData;
            }).toList());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Ошибка при получении заданий: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
    
    // API для получения изображения задания
    @GetMapping("/api/tasks/{taskId}/image")
    @ResponseBody
    public ResponseEntity<byte[]> getTaskImage(@PathVariable Long taskId) {
        try {
            Optional<Task> taskOpt = taskRepository.findById(taskId);
            if (taskOpt.isEmpty() || !taskOpt.get().getIsActive()) {
                return ResponseEntity.notFound().build();
            }
            
            Task task = taskOpt.get();
            if (task.getImageData() == null || task.getImageData().length == 0) {
                return ResponseEntity.notFound().build();
            }
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(task.getImageType()));
            headers.setContentLength(task.getImageData().length);
            headers.setCacheControl("max-age=3600"); // Кэшируем на час
            
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(task.getImageData());
                    
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }
}
