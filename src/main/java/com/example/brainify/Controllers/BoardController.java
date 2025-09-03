package com.example.brainify.Controllers;

import com.example.brainify.Service.BoardService;
import com.example.brainify.Model.BoardState;
import com.example.brainify.Model.BoardOperation;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.ArrayList;

@RestController
@RequestMapping("/api/board")
public class BoardController {

    @Autowired
    private BoardService boardService;

    @PostMapping("/save")
    @Transactional
    public ResponseEntity<Map<String, Object>> saveBoard(@RequestBody Map<String, Object> request) {
        try {
            Object lessonIdObj = request.get("lessonId");
            Object contentObj = request.get("content");
            String title = (String) request.get("title");

            if (lessonIdObj == null || contentObj == null) {
                Map<String, Object> error = new HashMap<>();
                error.put("success", false);
                error.put("message", "Отсутствуют обязательные параметры");
                return ResponseEntity.badRequest().body(error);
            }

            // Преобразуем content в JSON строку
            String content;
            if (contentObj instanceof String) {
                content = (String) contentObj;
            } else {
                // Если это объект, преобразуем в JSON
                content = new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(contentObj);
            }

            // Преобразуем lessonId в Long (может быть String или Integer)
            Long lessonIdLong;
            if (lessonIdObj instanceof String) {
                lessonIdLong = Long.valueOf((String) lessonIdObj);
            } else if (lessonIdObj instanceof Integer) {
                lessonIdLong = ((Integer) lessonIdObj).longValue();
            } else if (lessonIdObj instanceof Long) {
                lessonIdLong = (Long) lessonIdObj;
            } else {
                throw new IllegalArgumentException("lessonId должен быть строкой, целым числом или Long");
            }

            // Сохраняем состояние доски в БД
            System.out.println("BoardController: Calling boardService.saveBoardState with lessonId: " + lessonIdLong + ", content length: " + content.length());
            BoardState boardState = boardService.saveBoardState(lessonIdLong, content);
            System.out.println("BoardController: Board state saved with ID: " + boardState.getId());

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Доска успешно сохранена");
            response.put("boardId", boardState.getId());
            response.put("title", title);
            response.put("timestamp", boardState.getUpdatedAt());

            System.out.println("Доска сохранена в БД: " + boardState.getId() + ", заголовок: " + title);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Ошибка сохранения: " + e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }

    @GetMapping("/load/{lessonId}")
    public ResponseEntity<Map<String, Object>> loadBoard(@PathVariable String lessonId) {
        try {
            // Преобразуем lessonId в Long
            Long lessonIdLong = Long.valueOf(lessonId);
            
            // Загружаем состояние доски из БД
            Optional<BoardState> boardStateOpt = boardService.loadBoardState(lessonIdLong);
            
            if (boardStateOpt.isPresent()) {
                BoardState boardState = boardStateOpt.get();
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("content", boardState.getBoardContent());
                response.put("boardId", boardState.getId());
                response.put("timestamp", boardState.getUpdatedAt());
                return ResponseEntity.ok(response);
            } else {
                // Если состояние доски не найдено, возвращаем пустое состояние
                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                response.put("content", "{}");
                response.put("boardId", null);
                response.put("message", "Доска пуста");
                return ResponseEntity.ok(response);
            }
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Ошибка загрузки: " + e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }

    @DeleteMapping("/delete/{lessonId}")
    public ResponseEntity<Map<String, Object>> deleteBoard(@PathVariable String lessonId) {
        try {
            // Преобразуем lessonId в Long
            Long lessonIdLong = Long.valueOf(lessonId);
            
            // Очищаем все операции рисования для урока
            boardService.clearDrawOperations(lessonIdLong);
            
            // Деактивируем все состояния доски для урока
            boardService.deactivateBoardStates(lessonIdLong);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Доска успешно удалена");

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Ошибка удаления: " + e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }

    /**
     * Получить все операции рисования для урока
     */
    @GetMapping("/operations/{lessonId}")
    public ResponseEntity<Map<String, Object>> getBoardOperations(@PathVariable Long lessonId) {
        try {
            List<com.example.brainify.Model.BoardOperation> operations = boardService.getDrawOperations(lessonId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("operations", operations);
            response.put("count", operations.size());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Ошибка получения операций: " + e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }

    /**
     * Очистить все операции рисования для урока
     */
    @DeleteMapping("/operations/{lessonId}")
    public ResponseEntity<Map<String, Object>> clearBoardOperations(@PathVariable Long lessonId) {
        try {
            boardService.clearDrawOperations(lessonId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Операции рисования успешно очищены");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Ошибка очистки операций: " + e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }

    /**
     * Тестовый метод для проверки сохранения операций рисования
     */
    @PostMapping("/test-save-operation/{lessonId}")
    public ResponseEntity<Map<String, Object>> testSaveOperation(@PathVariable Long lessonId) {
        try {
            System.out.println("=== ТЕСТ СОХРАНЕНИЯ ОПЕРАЦИИ ===");
            System.out.println("lessonId: " + lessonId);
            
            // Создаем тестовую операцию
            BoardOperation testOperation = boardService.saveDrawOperation(
                lessonId,
                "test_draw",
                100.0,
                200.0,
                "#FF0000",
                5,
                1L,
                "TestUser"
            );
            
            System.out.println("Тестовая операция сохранена с ID: " + testOperation.getId());
            
            // Проверяем, что операция действительно сохранена
            List<BoardOperation> operations = boardService.getDrawOperations(lessonId);
            System.out.println("Всего операций для урока " + lessonId + ": " + operations.size());
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Тестовая операция успешно сохранена");
            response.put("operationId", testOperation.getId());
            response.put("totalOperations", operations.size());
            response.put("operation", testOperation);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("Ошибка в тестовом методе: " + e.getMessage());
            e.printStackTrace();
            
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Ошибка тестирования: " + e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }

    /**
     * Тестовый метод для проверки подключения к БД
     */
    @GetMapping("/test-db")
    public ResponseEntity<Map<String, Object>> testDatabase() {
        try {
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Подключение к БД работает");
            response.put("timestamp", System.currentTimeMillis());
            
            // Проверяем существование таблиц
            try {
                List<BoardOperation> operations = boardService.getDrawOperations(1L);
                response.put("board_operations_table", "существует");
                response.put("operations_count", operations.size());
            } catch (Exception e) {
                response.put("board_operations_table", "ошибка: " + e.getMessage());
            }
            
            try {
                Optional<BoardState> state = boardService.loadBoardState(1L);
                response.put("board_states_table", "существует");
                response.put("states_count", state.isPresent() ? 1 : 0);
            } catch (Exception e) {
                response.put("board_states_table", "ошибка: " + e.getMessage());
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Ошибка подключения к БД: " + e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }

    /**
     * Экспорт доски в PNG
     */
    @PostMapping("/export/{lessonId}")
    public ResponseEntity<byte[]> exportBoardToPNG(@PathVariable Long lessonId, 
                                                  @RequestBody Map<String, Object> request) {
        try {
            String imageData = (String) request.get("imageData");
            
            if (imageData == null || !imageData.startsWith("data:image/png;base64,")) {
                return ResponseEntity.badRequest().build();
            }
            
            // Извлекаем base64 данные
            String base64Data = imageData.substring("data:image/png;base64,".length());
            byte[] imageBytes = java.util.Base64.getDecoder().decode(base64Data);
            
            // Создаем заголовки для скачивания
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.IMAGE_PNG);
            headers.setContentDispositionFormData("attachment", 
                "board_" + lessonId + "_" + System.currentTimeMillis() + ".png");
            
            return new ResponseEntity<>(imageBytes, headers, HttpStatus.OK);
            
        } catch (Exception e) {
            System.err.println("Ошибка экспорта доски: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Получить состояние доски для урока (REST API)
     */
    @GetMapping("/state/{lessonId}")
    public ResponseEntity<Map<String, Object>> getBoardState(@PathVariable Long lessonId) {
        try {
            System.out.println("=== REST API: Получение состояния доски для урока " + lessonId + " ===");
            
            // Получаем все операции для урока
            List<BoardOperation> operations = boardService.getDrawOperations(lessonId);
            System.out.println("Найдено операций: " + operations.size());
            
            // Преобразуем операции в формат для фронтенда
            List<Map<String, Object>> operationsList = new ArrayList<>();
            for (BoardOperation operation : operations) {
                Map<String, Object> opMap = new HashMap<>();
                opMap.put("id", operation.getId());
                opMap.put("operationType", operation.getOperationType());
                opMap.put("x", operation.getX());
                opMap.put("y", operation.getY());
                opMap.put("color", operation.getColor());
                opMap.put("brushSize", operation.getBrushSize());
                opMap.put("userId", operation.getUserId());
                opMap.put("userName", operation.getUserName());
                opMap.put("timestamp", operation.getTimestamp());
                opMap.put("sequenceNumber", operation.getSequenceNumber());
                operationsList.add(opMap);
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("type", "board_state");
            response.put("lessonId", lessonId);
            response.put("operations", operationsList);
            response.put("totalOperations", operations.size());
            response.put("hasDrawOperations", operations.size() > 0);
            response.put("timestamp", System.currentTimeMillis());
            
            System.out.println("Состояние доски отправлено: " + operations.size() + " операций");
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("Ошибка получения состояния доски: " + e.getMessage());
            e.printStackTrace();
            
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("type", "error");
            error.put("message", "Ошибка получения состояния доски: " + e.getMessage());
            return ResponseEntity.internalServerError().body(error);
        }
    }
}
