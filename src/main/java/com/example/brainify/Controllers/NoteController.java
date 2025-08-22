package com.example.brainify.Controllers;

import com.example.brainify.DTO.NoteDTO;
import com.example.brainify.DTO.NoteFileDTO;
import com.example.brainify.Model.Note;
import com.example.brainify.Model.NoteFile;
import com.example.brainify.Model.User;
import com.example.brainify.Service.NoteService;
import com.example.brainify.Config.SessionManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/notes")
public class NoteController {
    
    @Autowired
    private NoteService noteService;
    
    @Autowired
    private SessionManager sessionManager;
    
    // Получить все конспекты преподавателя
    @GetMapping
    public ResponseEntity<List<NoteDTO>> getTeacherNotes(HttpSession session) {
        System.out.println("GET /api/notes - получение конспектов преподавателя");
        
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            System.out.println("Пользователь не авторизован");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        System.out.println("Пользователь: " + currentUser.getName() + " (ID: " + currentUser.getId() + ")");
        
        List<NoteDTO> notes = noteService.getTeacherNotes(currentUser.getId());
        System.out.println("Найдено конспектов: " + notes.size());
        
        return ResponseEntity.ok(notes);
    }
    
    // Получить конспекты по предмету
    @GetMapping("/subject/{subjectId}")
    public ResponseEntity<List<NoteDTO>> getNotesBySubject(@PathVariable Long subjectId, HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        List<NoteDTO> notes = noteService.getTeacherNotesBySubject(currentUser.getId(), subjectId);
        return ResponseEntity.ok(notes);
    }
    
    // Получить конспект по ID
    @GetMapping("/{noteId}")
    public ResponseEntity<NoteDTO> getNoteById(@PathVariable Long noteId, HttpSession session) {
        System.out.println("GET /api/notes/" + noteId + " - получение конспекта по ID");
        
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            System.out.println("Пользователь не авторизован");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        System.out.println("Пользователь: " + currentUser.getName() + " (ID: " + currentUser.getId() + ")");
        System.out.println("Запрашиваемый конспект ID: " + noteId);
        
        Optional<NoteDTO> note = noteService.getNoteById(noteId, currentUser.getId());
        if (note.isPresent()) {
            System.out.println("Конспект найден: " + note.get().getTitle());
            return ResponseEntity.ok(note.get());
        } else {
            System.out.println("Конспект не найден");
            return ResponseEntity.notFound().build();
        }
    }
    
    // Создать новый конспект
    @PostMapping
    public ResponseEntity<NoteDTO> createNote(@RequestBody Map<String, Object> request, HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            String title = (String) request.get("title");
            String description = (String) request.get("description");
            Long subjectId = Long.valueOf(request.get("subjectId").toString());
            String contentTypeStr = (String) request.get("contentType");
            String textContent = (String) request.get("textContent");
            String drawingData = (String) request.get("drawingData");
            
            Note.ContentType contentType = Note.ContentType.valueOf(contentTypeStr.toUpperCase());
            
            NoteDTO note = noteService.createNote(currentUser.getId(), title, description, subjectId, 
                                                 contentType, textContent, drawingData);
            return ResponseEntity.status(HttpStatus.CREATED).body(note);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Обновить конспект
    @PutMapping("/{noteId}")
    public ResponseEntity<NoteDTO> updateNote(@PathVariable Long noteId, 
                                            @RequestBody Map<String, Object> request, 
                                            HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            String title = (String) request.get("title");
            String description = (String) request.get("description");
            Long subjectId = request.get("subjectId") != null ? 
                Long.valueOf(request.get("subjectId").toString()) : null;
            String contentTypeStr = (String) request.get("contentType");
            String textContent = (String) request.get("textContent");
            String drawingData = (String) request.get("drawingData");
            
            Note.ContentType contentType = Note.ContentType.valueOf(contentTypeStr.toUpperCase());
            
            Optional<NoteDTO> note = noteService.updateNote(noteId, currentUser.getId(), title, description, 
                                                           subjectId, contentType, textContent, drawingData);
            return note.map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    // Удалить конспект
    @DeleteMapping("/{noteId}")
    public ResponseEntity<Map<String, String>> deleteNote(@PathVariable Long noteId, HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        boolean deleted = noteService.deleteNote(noteId, currentUser.getId());
        Map<String, String> response = new HashMap<>();
        
        if (deleted) {
            response.put("message", "Конспект успешно удален");
            return ResponseEntity.ok(response);
        } else {
            response.put("message", "Конспект не найден или доступ запрещен");
            return ResponseEntity.notFound().build();
        }
    }
    
    // Поиск конспектов
    @GetMapping("/search")
    public ResponseEntity<List<NoteDTO>> searchNotes(@RequestParam String query, 
                                                    @RequestParam(defaultValue = "title") String type,
                                                    HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        List<NoteDTO> notes;
        if ("description".equals(type)) {
            notes = noteService.searchNotesByDescription(currentUser.getId(), query);
        } else {
            notes = noteService.searchNotesByTitle(currentUser.getId(), query);
        }
        
        return ResponseEntity.ok(notes);
    }
    
    // Добавить файл к конспекту
    @PostMapping("/{noteId}/files")
    public ResponseEntity<NoteFileDTO> addFileToNote(@PathVariable Long noteId, 
                                                    @RequestParam("file") MultipartFile file,
                                                    HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            NoteFileDTO noteFile = noteService.addFileToNote(noteId, currentUser.getId(), file);
            return ResponseEntity.status(HttpStatus.CREATED).body(noteFile);
        } catch (IOException e) {
            return ResponseEntity.badRequest().build();
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    // Получить файлы конспекта
    @GetMapping("/{noteId}/files")
    public ResponseEntity<List<NoteFileDTO>> getNoteFiles(@PathVariable Long noteId, HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        List<NoteFileDTO> files = noteService.getNoteFiles(noteId, currentUser.getId());
        return ResponseEntity.ok(files);
    }
    
    // Скачать файл
    @GetMapping("/files/{fileId}/download")
    public ResponseEntity<ByteArrayResource> downloadFile(@PathVariable Long fileId, HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        Optional<NoteFile> fileOpt = noteService.getFileForDownload(fileId, currentUser.getId());
        if (fileOpt.isPresent()) {
            NoteFile file = fileOpt.get();
            ByteArrayResource resource = new ByteArrayResource(file.getFileData());
            
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getFileName() + "\"")
                    .contentType(MediaType.parseMediaType(file.getMimeType()))
                    .contentLength(file.getFileSize())
                    .body(resource);
        }
        
        return ResponseEntity.notFound().build();
    }
    
    // Удалить файл
    @DeleteMapping("/files/{fileId}")
    public ResponseEntity<Map<String, String>> deleteFile(@PathVariable Long fileId, HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        boolean deleted = noteService.deleteNoteFile(fileId, currentUser.getId());
        Map<String, String> response = new HashMap<>();
        
        if (deleted) {
            response.put("message", "Файл успешно удален");
            return ResponseEntity.ok(response);
        } else {
            response.put("message", "Файл не найден или доступ запрещен");
            return ResponseEntity.notFound().build();
        }
    }
    
    // Получить статистику конспектов
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getNotesStats(HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalNotes", noteService.getTeacherNotesCount(currentUser.getId()));
        
        return ResponseEntity.ok(stats);
    }
}
