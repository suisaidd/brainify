package com.example.brainify.Service;

import com.example.brainify.DTO.NoteDTO;
import com.example.brainify.DTO.NoteFileDTO;
import com.example.brainify.Model.Note;
import com.example.brainify.Model.NoteFile;
import com.example.brainify.Model.Subject;
import com.example.brainify.Model.User;
import com.example.brainify.Repository.NoteFileRepository;
import com.example.brainify.Repository.NoteRepository;
import com.example.brainify.Repository.SubjectRepository;
import com.example.brainify.Repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@Transactional
public class NoteService {
    
    @Autowired
    private NoteRepository noteRepository;
    
    @Autowired
    private NoteFileRepository noteFileRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private SubjectRepository subjectRepository;
    
    // Создать новый конспект
    public NoteDTO createNote(Long teacherId, String title, String description, Long subjectId, 
                             Note.ContentType contentType, String textContent, String drawingData) {
        
        User teacher = userRepository.findById(teacherId)
                .orElseThrow(() -> new RuntimeException("Преподаватель не найден"));
        
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new RuntimeException("Предмет не найден"));
        
        Note note = new Note(title, description, contentType);
        note.setTeacher(teacher);
        note.setSubject(subject);
        note.setTextContent(textContent);
        note.setDrawingData(drawingData);
        
        Note savedNote = noteRepository.save(note);
        return new NoteDTO(savedNote);
    }
    
    // Получить все конспекты преподавателя
    public List<NoteDTO> getTeacherNotes(Long teacherId) {
        List<Note> notes = noteRepository.findByTeacherIdAndIsActiveOrderByCreatedAtDesc(teacherId, true);
        return notes.stream().map(NoteDTO::new).collect(Collectors.toList());
    }
    
    // Получить конспекты преподавателя по предмету
    public List<NoteDTO> getTeacherNotesBySubject(Long teacherId, Long subjectId) {
        List<Note> notes = noteRepository.findByTeacherIdAndSubjectIdAndIsActiveOrderByCreatedAtDesc(teacherId, subjectId, true);
        return notes.stream().map(NoteDTO::new).collect(Collectors.toList());
    }
    
    // Получить конспект по ID
    public Optional<NoteDTO> getNoteById(Long noteId, Long teacherId) {
        Optional<Note> note = noteRepository.findById(noteId);
        if (note.isPresent() && note.get().getTeacher().getId().equals(teacherId)) {
            return Optional.of(new NoteDTO(note.get()));
        }
        return Optional.empty();
    }
    
    // Обновить конспект
    public Optional<NoteDTO> updateNote(Long noteId, Long teacherId, String title, String description, 
                                       Long subjectId, Note.ContentType contentType, String textContent, String drawingData) {
        
        Optional<Note> noteOpt = noteRepository.findById(noteId);
        if (noteOpt.isPresent()) {
            Note note = noteOpt.get();
            if (note.getTeacher().getId().equals(teacherId)) {
                note.setTitle(title);
                note.setDescription(description);
                note.setContentType(contentType);
                note.setTextContent(textContent);
                note.setDrawingData(drawingData);
                note.setUpdatedAt(LocalDateTime.now());
                
                if (subjectId != null) {
                    Subject subject = subjectRepository.findById(subjectId)
                            .orElseThrow(() -> new RuntimeException("Предмет не найден"));
                    note.setSubject(subject);
                }
                
                Note savedNote = noteRepository.save(note);
                return Optional.of(new NoteDTO(savedNote));
            }
        }
        return Optional.empty();
    }
    
    // Удалить конспект (мягкое удаление)
    public boolean deleteNote(Long noteId, Long teacherId) {
        Optional<Note> noteOpt = noteRepository.findById(noteId);
        if (noteOpt.isPresent()) {
            Note note = noteOpt.get();
            if (note.getTeacher().getId().equals(teacherId)) {
                note.setIsActive(false);
                note.setUpdatedAt(LocalDateTime.now());
                noteRepository.save(note);
                return true;
            }
        }
        return false;
    }
    
    // Поиск конспектов по названию
    public List<NoteDTO> searchNotesByTitle(Long teacherId, String searchTerm) {
        List<Note> notes = noteRepository.findByTeacherIdAndTitleContainingIgnoreCase(teacherId, true, searchTerm);
        return notes.stream().map(NoteDTO::new).collect(Collectors.toList());
    }
    
    // Поиск конспектов по описанию
    public List<NoteDTO> searchNotesByDescription(Long teacherId, String searchTerm) {
        List<Note> notes = noteRepository.findByTeacherIdAndDescriptionContainingIgnoreCase(teacherId, true, searchTerm);
        return notes.stream().map(NoteDTO::new).collect(Collectors.toList());
    }
    
    // Добавить файл к конспекту
    public NoteFileDTO addFileToNote(Long noteId, Long teacherId, MultipartFile file) throws IOException {
        Optional<Note> noteOpt = noteRepository.findById(noteId);
        if (noteOpt.isPresent()) {
            Note note = noteOpt.get();
            if (note.getTeacher().getId().equals(teacherId)) {
                NoteFile noteFile = new NoteFile(
                    file.getOriginalFilename(),
                    getFileExtension(file.getOriginalFilename()),
                    file.getSize(),
                    file.getBytes(),
                    file.getContentType()
                );
                noteFile.setNote(note);
                
                NoteFile savedFile = noteFileRepository.save(noteFile);
                return new NoteFileDTO(savedFile);
            }
        }
        throw new RuntimeException("Конспект не найден или доступ запрещен");
    }
    
    // Получить файлы конспекта
    public List<NoteFileDTO> getNoteFiles(Long noteId, Long teacherId) {
        Optional<Note> noteOpt = noteRepository.findById(noteId);
        if (noteOpt.isPresent()) {
            Note note = noteOpt.get();
            if (note.getTeacher().getId().equals(teacherId)) {
                List<NoteFile> files = noteFileRepository.findByNoteIdOrderByCreatedAtAsc(noteId);
                return files.stream().map(NoteFileDTO::new).collect(Collectors.toList());
            }
        }
        return List.of();
    }
    
    // Удалить файл конспекта
    public boolean deleteNoteFile(Long fileId, Long teacherId) {
        Optional<NoteFile> fileOpt = noteFileRepository.findById(fileId);
        if (fileOpt.isPresent()) {
            NoteFile file = fileOpt.get();
            if (file.getNote().getTeacher().getId().equals(teacherId)) {
                noteFileRepository.delete(file);
                return true;
            }
        }
        return false;
    }
    
    // Получить файл для скачивания
    public Optional<NoteFile> getFileForDownload(Long fileId, Long teacherId) {
        Optional<NoteFile> fileOpt = noteFileRepository.findById(fileId);
        if (fileOpt.isPresent()) {
            NoteFile file = fileOpt.get();
            if (file.getNote().getTeacher().getId().equals(teacherId)) {
                return fileOpt;
            }
        }
        return Optional.empty();
    }
    
    // Получить статистику конспектов преподавателя
    public long getTeacherNotesCount(Long teacherId) {
        return noteRepository.countByTeacherIdAndIsActive(teacherId, true);
    }
    
    // Получить количество конспектов по предмету
    public long getTeacherNotesCountBySubject(Long teacherId, Long subjectId) {
        return noteRepository.countByTeacherIdAndSubjectIdAndIsActive(teacherId, subjectId, true);
    }
    
    // Получить общий размер файлов конспекта
    public Long getNoteFilesTotalSize(Long noteId) {
        return noteFileRepository.sumFileSizeByNoteId(noteId);
    }
    
    // Вспомогательный метод для получения расширения файла
    private String getFileExtension(String fileName) {
        if (fileName == null || fileName.lastIndexOf(".") == -1) {
            return "";
        }
        return fileName.substring(fileName.lastIndexOf(".") + 1);
    }
}
