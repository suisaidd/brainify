package com.example.brainify.Controllers;

import com.example.brainify.Config.SessionManager;
import com.example.brainify.Model.*;
import com.example.brainify.Repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpSession;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/test")
public class TestController {

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

    @Autowired
    private TestSessionRepository testSessionRepository;

    @Autowired
    private TestAnswerRepository testAnswerRepository;

    // Страница тестирования
    @GetMapping("/{testType}")
    public String testPage(@PathVariable String testType, Model model, HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        model.addAttribute("currentUser", currentUser);
        model.addAttribute("isAuthenticated", currentUser != null);
        model.addAttribute("testType", testType);
        model.addAttribute("pageTitle", "Тест - " + getTestTypeName(testType));

        return "test-page";
    }

    // Простой тест API
    @GetMapping("/api/test")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> testApi() {
        Map<String, Object> response = new HashMap<>();
        response.put("status", "ok");
        response.put("message", "API работает");
        return ResponseEntity.ok(response);
    }

    // API для получения предметов
    @GetMapping("/api/subjects")
    @ResponseBody
    public ResponseEntity<List<Map<String, Object>>> getSubjects(@RequestParam String examType) {
        System.out.println("Запрос предметов для типа экзамена: " + examType);
        
        List<Subject> subjects = subjectRepository.findByIsActiveTrueOrderByNameAsc();
        System.out.println("Всего предметов в БД: " + subjects.size());
        
        List<Map<String, Object>> result = subjects.stream()
                .filter(s -> {
                    String name = s.getName().toLowerCase();
                    boolean matches = false;
                    if ("oge".equals(examType.toLowerCase())) {
                        matches = name.contains("огэ");
                    } else if ("ege".equals(examType.toLowerCase())) {
                        matches = name.contains("егэ") || name.contains("базовый") || name.contains("профильный");
                    }
                    System.out.println("Предмет: " + s.getName() + ", подходит: " + matches);
                    return matches;
                })
                .map(s -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", s.getId());
                    map.put("name", s.getName());
                    return map;
                })
                .collect(Collectors.toList());
        
        System.out.println("Отфильтрованных предметов: " + result.size());
        return ResponseEntity.ok(result);
    }

    // API для получения номеров заданий
    @GetMapping("/api/task-numbers")
    @ResponseBody
    public ResponseEntity<List<Map<String, Object>>> getTaskNumbers(
            @RequestParam Long subjectId,
            @RequestParam String examType) {
        
        Optional<Subject> subjectOpt = subjectRepository.findById(subjectId);
        if (subjectOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        String normalizedExamType = examType == null ? null : examType.toUpperCase();
        List<TaskNumber> taskNumbers = taskNumberRepository.findBySubjectAndExamTypeAndIsActiveTrueOrderByNumberAsc(
                subjectOpt.get(), normalizedExamType);
        
        List<Map<String, Object>> result = taskNumbers.stream()
                .map(tn -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", tn.getId());
                    map.put("number", tn.getNumber());
                    return map;
                })
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(result);
    }

    // API для начала теста
    @PostMapping("/api/start")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> startTest(@RequestBody Map<String, Object> request, HttpSession session) {
        try {
            String testType = (String) request.get("testType");
            String examType = (String) request.get("examType");
            String normalizedExamType = examType == null ? null : examType.toUpperCase();
            Long subjectId = Long.valueOf(request.get("subjectId").toString());
            
            Optional<Subject> subjectOpt = subjectRepository.findById(subjectId);
            if (subjectOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Предмет не найден"));
            }

            Subject subject = subjectOpt.get();
            List<Task> tasks = new ArrayList<>();
            
            if ("random".equals(testType)) {
                // Случайный тест — по одному случайному заданию каждого номера (без учета подтем)
                List<TaskNumber> taskNumbers = taskNumberRepository.findBySubjectAndExamTypeAndIsActiveTrueOrderByNumberAsc(
                        subject, normalizedExamType);

                for (TaskNumber taskNumber : taskNumbers) {
                    List<Task> tasksForNumber = taskRepository.findByTaskNumber(taskNumber);
                    if (!tasksForNumber.isEmpty()) {
                        tasks.add(tasksForNumber.get(new Random().nextInt(tasksForNumber.size())));
                    }
                }
            } else if ("specific".equals(testType)) {
                // Тест по номеру - 20 заданий из выбранного номера
                Integer taskNumberId = Integer.valueOf(request.get("taskNumberId").toString());
                Optional<TaskNumber> taskNumberOpt = taskNumberRepository.findById(Long.valueOf(taskNumberId));
                if (taskNumberOpt.isEmpty()) {
                    return ResponseEntity.badRequest().body(Map.of("error", "Номер задания не найден"));
                }
                
                List<Task> allTasks = taskRepository.findByTaskNumber(taskNumberOpt.get());
                if (allTasks.isEmpty()) {
                    // Резервный путь: искать по числовому номеру напрямую в tasks
                    Integer number = taskNumberOpt.get().getNumber();
                    allTasks = taskRepository.findByLegacyNumber(number);
                }

                // Если задач меньше 20 — отдаём все
                int limit = Math.min(20, allTasks.size());
                Collections.shuffle(allTasks);
                tasks = allTasks.stream().limit(limit).collect(Collectors.toList());
                
            } else if ("marathon".equals(testType)) {
                // Марафон - поддержка как явного списка номеров, так и диапазона [от;до]
                Integer questionCount = Integer.valueOf(request.get("questionCount").toString());

                List<Task> allTasks = new ArrayList<>();

                // Вариант 1: передан диапазон номеров
                if (request.get("rangeStart") != null && request.get("rangeEnd") != null) {
                    Integer rangeStartVal = Integer.valueOf(request.get("rangeStart").toString());
                    Integer rangeEndVal = Integer.valueOf(request.get("rangeEnd").toString());

                    final int from = Math.min(rangeStartVal, rangeEndVal);
                    final int to = Math.max(rangeStartVal, rangeEndVal);

                    List<TaskNumber> taskNumbersInRange = taskNumberRepository
                            .findBySubjectAndExamTypeAndIsActiveTrueOrderByNumberAsc(subject, normalizedExamType)
                            .stream()
                            .filter(tn -> tn.getNumber() != null && tn.getNumber() >= from && tn.getNumber() <= to)
                            .collect(Collectors.toList());

                    for (TaskNumber taskNumber : taskNumbersInRange) {
                        List<Task> perNumber = taskRepository.findByTaskNumber(taskNumber);
                        if (perNumber.isEmpty()) {
                            perNumber = taskRepository.findByLegacyNumber(taskNumber.getNumber());
                        }
                        allTasks.addAll(perNumber);
                    }
                } else {
                    // Вариант 2: совместимость со старым форматом (список ID номеров)
                    @SuppressWarnings("unchecked")
                    List<Integer> taskNumberIds = (List<Integer>) request.get("taskNumberIds");
                    if (taskNumberIds == null) taskNumberIds = Collections.emptyList();

                    for (Integer taskNumberId : taskNumberIds) {
                        Optional<TaskNumber> taskNumberOpt = taskNumberRepository.findById(Long.valueOf(taskNumberId));
                        if (taskNumberOpt.isPresent()) {
                            List<Task> perNumber = taskRepository.findByTaskNumber(taskNumberOpt.get());
                            if (perNumber.isEmpty()) {
                                perNumber = taskRepository.findByLegacyNumber(taskNumberOpt.get().getNumber());
                            }
                            allTasks.addAll(perNumber);
                        }
                    }
                }

                Collections.shuffle(allTasks);
                tasks = allTasks.stream().limit(questionCount).collect(Collectors.toList());
            }

            if (tasks.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Задания не найдены"));
            }

            // Создаем сессию теста
            TestSession testSession = new TestSession();
            testSession.setUser(sessionManager.getCurrentUser(session));
            testSession.setSubject(subject);
            testSession.setExamType(examType);
            testSession.setTestType(testType);
            testSession.setTotalQuestions(tasks.size());
            // Сохраняем ids заданий в БД (JSON) как резерв
            List<Long> taskIdsForPersist = tasks.stream().map(Task::getId).collect(Collectors.toList());
            testSession.setTaskNumbers(taskIdsForPersist.stream().map(String::valueOf).collect(Collectors.joining(",")));
            testSession.setCreatedAt(LocalDateTime.now());
            testSession = testSessionRepository.save(testSession);

            // Сохраняем ID сессии в сессии
            session.setAttribute("currentTestSessionId", testSession.getId());

            // Сохраняем выбранные задания в сессии сервера (по sessionId)
            List<Long> taskIds = tasks.stream().map(Task::getId).collect(Collectors.toList());
            session.setAttribute("testTasks:" + testSession.getId(), taskIds);

            Map<String, Object> response = new HashMap<>();
            response.put("sessionId", testSession.getId());
            response.put("tasks", tasks.stream().map(task -> {
                Map<String, Object> taskData = new HashMap<>();
                taskData.put("id", task.getId());
                taskData.put("question", task.getQuestion());
                taskData.put("answer", task.getAnswer());
                taskData.put("solution", task.getSolution());
                taskData.put("difficultyLevel", task.getDifficultyLevel());
                taskData.put("points", task.getPoints());
                taskData.put("hasImage", task.getImageData() != null && task.getImageData().length > 0);
                return taskData;
            }).collect(Collectors.toList()));

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Ошибка при создании теста: " + e.getMessage()));
        }
    }

    // Новая страница запуска для "Тест по номеру"
    @GetMapping("/specific/{sessionId}")
    public String runSpecificTest(@PathVariable Long sessionId, Model model, HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        model.addAttribute("currentUser", currentUser);
        model.addAttribute("isAuthenticated", currentUser != null);
        model.addAttribute("pageTitle", "Тест по номеру");
        model.addAttribute("sessionId", sessionId);
        return "test-run";
    }

    // Новая страница запуска для "Марафон"
    @GetMapping("/marathon/{sessionId}")
    public String runMarathon(@PathVariable Long sessionId, Model model, HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        model.addAttribute("currentUser", currentUser);
        model.addAttribute("isAuthenticated", currentUser != null);
        model.addAttribute("pageTitle", "Марафон");
        model.addAttribute("sessionId", sessionId);
        return "test-run";
    }

    // API: получить задания для сессии теста (чтобы отрисовать на отдельной странице)
    @GetMapping("/api/session/{sessionId}/tasks")
    @ResponseBody
    public ResponseEntity<?> getSessionTasks(@PathVariable Long sessionId, HttpSession session) {
        Object idsObj = session.getAttribute("testTasks:" + sessionId);
        List<Long> taskIds;
        if (idsObj != null) {
            @SuppressWarnings("unchecked")
            List<Long> idsFromSession = (List<Long>) idsObj;
            taskIds = idsFromSession;
        } else {
            Optional<TestSession> tsOpt = testSessionRepository.findById(sessionId);
            if (tsOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("error", "Сессия теста не найдена"));
            }
            TestSession ts = tsOpt.get();
            String csv = ts.getTaskNumbers();
            if (csv == null || csv.isBlank()) {
                return ResponseEntity.status(404).body(Map.of("error", "Список заданий пуст"));
            }
            try {
                taskIds = Arrays.stream(csv.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .map(Long::valueOf)
                        .collect(Collectors.toList());
            } catch (Exception parseErr) {
                return ResponseEntity.status(500).body(Map.of("error", "Ошибка чтения списка заданий: " + parseErr.getMessage()));
            }
        }
        List<Task> tasks = taskRepository.findAllById(taskIds);

        // Попробуем сопоставить каждому заданию его номер (через связи) для отображения
        Map<Long, Integer> taskIdToNumber = new HashMap<>();
        try {
            List<Object[]> idNumPairs = taskRepository.findTaskIdWithNumber(taskIds.toArray(new Long[0]));
            for (Object[] row : idNumPairs) {
                Long id = ((Number) row[0]).longValue();
                Integer num = ((Number) row[1]).intValue();
                taskIdToNumber.put(id, num);
            }
        } catch (Exception ignore) { }

        List<Map<String, Object>> payload = tasks.stream().map(task -> {
            Map<String, Object> taskData = new HashMap<>();
            taskData.put("id", task.getId());
            taskData.put("question", task.getQuestion());
            taskData.put("answer", task.getAnswer());
            taskData.put("solution", task.getSolution());
            taskData.put("difficultyLevel", task.getDifficultyLevel());
            taskData.put("points", task.getPoints());
            taskData.put("hasImage", task.getImageData() != null && task.getImageData().length > 0);
            Integer num = taskIdToNumber.get(task.getId());
            if (num != null) taskData.put("taskNumber", num);
            return taskData;
        }).collect(Collectors.toList());
        return ResponseEntity.ok(Map.of("sessionId", sessionId, "tasks", payload));
    }

    // API для завершения теста
    @PostMapping("/api/complete")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> completeTest(@RequestBody Map<String, Object> request, HttpSession session) {
        try {
            Long sessionId = Long.valueOf(request.get("sessionId").toString());
            @SuppressWarnings("unchecked")
            List<Map<String, Object>> answers = (List<Map<String, Object>>) request.get("answers");
            
            Optional<TestSession> sessionOpt = testSessionRepository.findById(sessionId);
            if (sessionOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Сессия теста не найдена"));
            }

            TestSession testSession = sessionOpt.get();
            int correctCount = 0;

            for (Map<String, Object> answerData : answers) {
                Long taskId = Long.valueOf(answerData.get("taskId").toString());
                String userAnswer = (String) answerData.get("answer");
                
                Optional<Task> taskOpt = taskRepository.findById(taskId);
                if (taskOpt.isPresent()) {
                    Task task = taskOpt.get();
                    boolean isCorrect = task.getAnswer() != null && 
                                      task.getAnswer().trim().equalsIgnoreCase(userAnswer.trim());
                    
                    TestAnswer testAnswer = new TestAnswer();
                    testAnswer.setTestSession(testSession);
                    testAnswer.setTask(task);
                    testAnswer.setUserAnswer(userAnswer);
                    testAnswer.setIsCorrect(isCorrect);
                    testAnswer.setPointsEarned(isCorrect ? task.getPoints() : 0);
                    testAnswerRepository.save(testAnswer);
                    
                    if (isCorrect) {
                        correctCount++;
                    }
                }
            }

            testSession.setCorrectAnswers(correctCount);
            testSession.setScorePercentage((double) correctCount / testSession.getTotalQuestions() * 100);
            testSession.setIsCompleted(true);
            testSession.setCompletedAt(LocalDateTime.now());
            testSessionRepository.save(testSession);

            // Очищаем сессию
            session.removeAttribute("currentTestSessionId");

            Map<String, Object> response = new HashMap<>();
            response.put("sessionId", testSession.getId());
            response.put("correctAnswers", correctCount);
            response.put("totalQuestions", testSession.getTotalQuestions());
            response.put("scorePercentage", testSession.getScorePercentage());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Ошибка при завершении теста: " + e.getMessage()));
        }
    }

    // Страница результатов
    @GetMapping("/results/{sessionId}")
    public String testResults(@PathVariable Long sessionId, Model model, HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        model.addAttribute("currentUser", currentUser);
        model.addAttribute("isAuthenticated", currentUser != null);

        Optional<TestSession> sessionOpt = testSessionRepository.findById(sessionId);
        if (sessionOpt.isEmpty()) {
            model.addAttribute("error", "Результаты теста не найдены");
            return "error";
        }

        TestSession testSession = sessionOpt.get();
        List<TestAnswer> answers = testAnswerRepository.findByTestSessionOrderByCreatedAtAsc(testSession);

        // Построим карту taskId -> номер задания
        Map<Long, Integer> taskIdToNumber = new HashMap<>();
        try {
            List<Long> ids = answers.stream().map(a -> a.getTask().getId()).toList();
            if (!ids.isEmpty()) {
                List<Object[]> rows = taskRepository.findTaskIdWithNumber(ids.toArray(new Long[0]));
                for (Object[] r : rows) {
                    Long id = ((Number) r[0]).longValue();
                    Integer num = ((Number) r[1]).intValue();
                    taskIdToNumber.put(id, num);
                }
            }
        } catch (Exception ignore) {}

        // Статистика по номерам
        Map<Integer, int[]> perNumberStats = new TreeMap<>(); // number -> [total, correct]
        for (TestAnswer a : answers) {
            Integer num = taskIdToNumber.get(a.getTask().getId());
            if (num == null) continue;
            perNumberStats.putIfAbsent(num, new int[]{0,0});
            perNumberStats.get(num)[0] += 1;
            if (Boolean.TRUE.equals(a.getIsCorrect())) perNumberStats.get(num)[1] += 1;
        }

        List<Integer> incorrectNumbers = perNumberStats.entrySet().stream()
                .filter(e -> e.getValue()[1] < e.getValue()[0])
                .map(Map.Entry::getKey)
                .toList();

        model.addAttribute("testSession", testSession);
        model.addAttribute("answers", answers);
        model.addAttribute("perNumberStats", perNumberStats);
        model.addAttribute("incorrectNumbers", incorrectNumbers);
        model.addAttribute("pageTitle", "Результаты теста");

        return "test-results";
    }

    private String getTestTypeName(String testType) {
        switch (testType) {
            case "random": return "Случайный вариант";
            case "specific": return "Тест по номеру";
            case "marathon": return "Марафон";
            default: return "Тест";
        }
    }
}
