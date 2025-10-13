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
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.servlet.http.HttpSession;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.Optional;

@Controller
@RequestMapping("/admin/trainers")
public class AdminTrainerController {

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

    // Главная страница админ-панели тренажёров
    @GetMapping("")
    public String adminTrainersPage(Model model, HttpSession session) {
        // Проверяем авторизацию
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || (!currentUser.getRole().name().equals("ADMIN") && !currentUser.getRole().name().equals("MANAGER"))) {
            return "redirect:/auth/login";
        }
        
        model.addAttribute("pageTitle", "Управление тренажёрами - Админ панель");
        model.addAttribute("currentUser", currentUser);
        
        // Получаем статистику
        List<Subject> subjects = subjectRepository.findByIsActiveTrueOrderByNameAsc();
        List<TaskNumber> taskNumbers = taskNumberRepository.findAll();
        List<Subtopic> subtopics = subtopicRepository.findAll();
        List<Task> tasks = taskRepository.findAll();
        
        model.addAttribute("subjectsCount", subjects.size());
        model.addAttribute("taskNumbersCount", taskNumbers.size());
        model.addAttribute("subtopicsCount", subtopics.size());
        model.addAttribute("tasksCount", tasks.size());
        model.addAttribute("subjects", subjects);
        
        return "admin/trainers";
    }
    
    // API для получения предметов
    @GetMapping("/api/subjects")
    @ResponseBody
    public ResponseEntity<List<Subject>> getSubjects() {
        List<Subject> subjects = subjectRepository.findByIsActiveTrueOrderByNameAsc();
        return ResponseEntity.ok(subjects);
    }
    
    // API для получения номеров заданий по предмету и типу экзамена
    @GetMapping("/api/task-numbers")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getTaskNumbers(
            @RequestParam Long subjectId,
            @RequestParam String examType) {
        
        try {
            Optional<Subject> subjectOpt = subjectRepository.findById(subjectId);
            if (subjectOpt.isEmpty()) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Предмет не найден");
                return ResponseEntity.badRequest().body(error);
            }
            
            List<TaskNumber> taskNumbers = taskNumberRepository.findBySubjectAndExamTypeAndIsActiveTrueOrderByNumberAsc(
                subjectOpt.get(), examType.toUpperCase());
            
            Map<String, Object> response = new HashMap<>();
            response.put("taskNumbers", taskNumbers.stream().map(tn -> {
                Map<String, Object> tnData = new HashMap<>();
                tnData.put("id", tn.getId());
                tnData.put("name", tn.getName());
                tnData.put("number", tn.getNumber());
                return tnData;
            }).toList());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Ошибка при получении номеров заданий: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
    
    // API для получения подтем по номеру задания
    @GetMapping("/api/subtopics")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getSubtopics(@RequestParam Long taskNumberId) {
        try {
            Optional<TaskNumber> taskNumberOpt = taskNumberRepository.findById(taskNumberId);
            if (taskNumberOpt.isEmpty()) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Номер задания не найден");
                return ResponseEntity.badRequest().body(error);
            }
            
            List<Subtopic> subtopics = subtopicRepository.findByTaskNumberAndIsActiveTrueOrderBySortOrderAsc(taskNumberOpt.get());
            
            Map<String, Object> response = new HashMap<>();
            response.put("subtopics", subtopics.stream().map(st -> {
                Map<String, Object> stData = new HashMap<>();
                stData.put("id", st.getId());
                stData.put("name", st.getName());
                stData.put("description", st.getDescription());
                stData.put("sortOrder", st.getSortOrder());
                return stData;
            }).toList());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Ошибка при получении подтем: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
    
    // API для создания номера задания
    @PostMapping("/api/task-numbers")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> createTaskNumber(@RequestBody Map<String, Object> request) {
        try {
            Long subjectId = Long.valueOf(request.get("subjectId").toString());
            String examType = request.get("examType").toString();
            String name = request.get("name").toString();
            Integer number = Integer.valueOf(request.get("number").toString());
            
            Optional<Subject> subjectOpt = subjectRepository.findById(subjectId);
            if (subjectOpt.isEmpty()) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Предмет не найден");
                return ResponseEntity.badRequest().body(error);
            }
            
            // Проверяем, не существует ли уже такой номер
            if (taskNumberRepository.existsBySubjectAndExamTypeAndNumberAndIsActiveTrue(
                subjectOpt.get(), examType.toUpperCase(), number)) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Номер задания уже существует");
                return ResponseEntity.badRequest().body(error);
            }
            
            TaskNumber taskNumber = new TaskNumber(name, number, subjectOpt.get(), examType.toUpperCase());
            taskNumberRepository.save(taskNumber);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Номер задания успешно создан");
            response.put("taskNumberId", taskNumber.getId());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Ошибка при создании номера задания: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
    
    // API для создания подтемы
    @PostMapping("/api/subtopics")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> createSubtopic(@RequestBody Map<String, Object> request) {
        try {
            Long taskNumberId = Long.valueOf(request.get("taskNumberId").toString());
            String name = request.get("name").toString();
            String description = request.get("description").toString();
            Integer sortOrder = Integer.valueOf(request.get("sortOrder").toString());
            
            Optional<TaskNumber> taskNumberOpt = taskNumberRepository.findById(taskNumberId);
            if (taskNumberOpt.isEmpty()) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Номер задания не найден");
                return ResponseEntity.badRequest().body(error);
            }
            
            // Проверяем, не существует ли уже такая подтема
            if (subtopicRepository.existsByTaskNumberAndNameAndIsActiveTrue(taskNumberOpt.get(), name)) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Подтема с таким названием уже существует");
                return ResponseEntity.badRequest().body(error);
            }
            
            Subtopic subtopic = new Subtopic(name, description, taskNumberOpt.get());
            subtopic.setSortOrder(sortOrder);
            subtopicRepository.save(subtopic);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Подтема успешно создана");
            response.put("subtopicId", subtopic.getId());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Ошибка при создании подтемы: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
    
    // API для создания задания
    @PostMapping("/api/tasks")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> createTask(
            @RequestParam Long subtopicId,
            @RequestParam String question,
            @RequestParam String answer,
            @RequestParam(required = false) String solution,
            @RequestParam(required = false) Integer difficultyLevel,
            @RequestParam(required = false) Integer points,
            @RequestParam(required = false) MultipartFile image) {
        
        try {
            Optional<Subtopic> subtopicOpt = subtopicRepository.findById(subtopicId);
            if (subtopicOpt.isEmpty()) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Подтема не найдена");
                return ResponseEntity.badRequest().body(error);
            }
            
            Task task = new Task(question, answer, subtopicOpt.get());
            if (solution != null && !solution.trim().isEmpty()) {
                task.setSolution(solution);
            }
            if (difficultyLevel != null) {
                task.setDifficultyLevel(difficultyLevel);
            }
            if (points != null) {
                task.setPoints(points);
            }
            
            // Обработка изображения
            if (image != null && !image.isEmpty()) {
                try {
                    byte[] imageBytes = image.getBytes();
                    task.setImageData(imageBytes);
                    task.setImageType(image.getContentType());
                    task.setImageSize((long) imageBytes.length);
                } catch (IOException e) {
                    Map<String, Object> error = new HashMap<>();
                    error.put("error", "Ошибка при обработке изображения: " + e.getMessage());
                    return ResponseEntity.badRequest().body(error);
                }
            }
            
            taskRepository.save(task);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Задание успешно создано");
            response.put("taskId", task.getId());
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Ошибка при создании задания: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
    
    // API для получения изображения задания
    @GetMapping("/api/tasks/{taskId}/image")
    @ResponseBody
    public ResponseEntity<byte[]> getTaskImage(@PathVariable Long taskId) {
        try {
            Optional<Task> taskOpt = taskRepository.findById(taskId);
            if (taskOpt.isEmpty() || taskOpt.get().getImageData() == null) {
                return ResponseEntity.notFound().build();
            }
            
            Task task = taskOpt.get();
            return ResponseEntity.ok()
                .header("Content-Type", task.getImageType())
                .body(task.getImageData());
                
        } catch (Exception e) {
            return ResponseEntity.status(500).build();
        }
    }
}

