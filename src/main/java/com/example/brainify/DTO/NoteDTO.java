package com.example.brainify.DTO;

import com.example.brainify.Model.Note;
import com.example.brainify.Model.Subject;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

public class NoteDTO {
    private Long id;
    private Long teacherId;
    private Subject subject;
    private String title;
    private String description;
    private Note.ContentType contentType;
    private String textContent;
    private String drawingData;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean isActive;
    private List<NoteFileDTO> files;
    
    // Конструкторы
    public NoteDTO() {}
    
    public NoteDTO(Note note) {
        this.id = note.getId();
        this.teacherId = note.getTeacher().getId();
        this.subject = note.getSubject();
        this.title = note.getTitle();
        this.description = note.getDescription();
        this.contentType = note.getContentType();
        this.textContent = note.getTextContent();
        this.drawingData = note.getDrawingData();
        this.createdAt = note.getCreatedAt();
        this.updatedAt = note.getUpdatedAt();
        this.isActive = note.getIsActive();
        this.files = note.getFiles().stream()
                .map(NoteFileDTO::new)
                .collect(Collectors.toList());
    }
    
    // Геттеры и сеттеры
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public Long getTeacherId() {
        return teacherId;
    }
    
    public void setTeacherId(Long teacherId) {
        this.teacherId = teacherId;
    }
    
    public Subject getSubject() {
        return subject;
    }
    
    public void setSubject(Subject subject) {
        this.subject = subject;
    }
    
    public String getTitle() {
        return title;
    }
    
    public void setTitle(String title) {
        this.title = title;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public Note.ContentType getContentType() {
        return contentType;
    }
    
    public void setContentType(Note.ContentType contentType) {
        this.contentType = contentType;
    }
    
    public String getTextContent() {
        return textContent;
    }
    
    public void setTextContent(String textContent) {
        this.textContent = textContent;
    }
    
    public String getDrawingData() {
        return drawingData;
    }
    
    public void setDrawingData(String drawingData) {
        this.drawingData = drawingData;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    public Boolean getIsActive() {
        return isActive;
    }
    
    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }
    
    public List<NoteFileDTO> getFiles() {
        return files;
    }
    
    public void setFiles(List<NoteFileDTO> files) {
        this.files = files;
    }
    
    @Override
    public String toString() {
        return "NoteDTO{" +
                "id=" + id +
                ", title='" + title + '\'' +
                ", contentType=" + contentType +
                ", createdAt=" + createdAt +
                ", isActive=" + isActive +
                '}';
    }
}

