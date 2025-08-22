package com.example.brainify.DTO;

import com.example.brainify.Model.NoteFile;
import java.time.LocalDateTime;

public class NoteFileDTO {
    private Long id;
    private Long noteId;
    private String fileName;
    private String fileType;
    private Long fileSize;
    private String mimeType;
    private LocalDateTime createdAt;
    
    // Конструкторы
    public NoteFileDTO() {}
    
    public NoteFileDTO(NoteFile noteFile) {
        this.id = noteFile.getId();
        this.noteId = noteFile.getNote().getId();
        this.fileName = noteFile.getFileName();
        this.fileType = noteFile.getFileType();
        this.fileSize = noteFile.getFileSize();
        this.mimeType = noteFile.getMimeType();
        this.createdAt = noteFile.getCreatedAt();
    }
    
    // Геттеры и сеттеры
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public Long getNoteId() {
        return noteId;
    }
    
    public void setNoteId(Long noteId) {
        this.noteId = noteId;
    }
    
    public String getFileName() {
        return fileName;
    }
    
    public void setFileName(String fileName) {
        this.fileName = fileName;
    }
    
    public String getFileType() {
        return fileType;
    }
    
    public void setFileType(String fileType) {
        this.fileType = fileType;
    }
    
    public Long getFileSize() {
        return fileSize;
    }
    
    public void setFileSize(Long fileSize) {
        this.fileSize = fileSize;
    }
    
    public String getMimeType() {
        return mimeType;
    }
    
    public void setMimeType(String mimeType) {
        this.mimeType = mimeType;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    // Utility методы
    public String getFileSizeFormatted() {
        if (fileSize < 1024) {
            return fileSize + " B";
        } else if (fileSize < 1024 * 1024) {
            return String.format("%.1f KB", fileSize / 1024.0);
        } else {
            return String.format("%.1f MB", fileSize / (1024.0 * 1024.0));
        }
    }
    
    public boolean isImage() {
        return mimeType != null && mimeType.startsWith("image/");
    }
    
    public boolean isPdf() {
        return mimeType != null && mimeType.equals("application/pdf");
    }
    
    public boolean isDocument() {
        return mimeType != null && (
            mimeType.equals("application/msword") ||
            mimeType.equals("application/vnd.openxmlformats-officedocument.wordprocessingml.document") ||
            mimeType.equals("text/plain")
        );
    }
    
    @Override
    public String toString() {
        return "NoteFileDTO{" +
                "id=" + id +
                ", fileName='" + fileName + '\'' +
                ", fileType='" + fileType + '\'' +
                ", fileSize=" + fileSize +
                ", mimeType='" + mimeType + '\'' +
                ", createdAt=" + createdAt +
                '}';
    }
}
