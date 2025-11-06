package com.example.brainify.Model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@Entity
@Table(name = "board_states")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class BoardState {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id", nullable = false)
    private Lesson lesson;
    
    @Column(name = "board_data", columnDefinition = "TEXT")
    private String boardData; // JSON с данными доски
    
    @Column(name = "board_content", columnDefinition = "TEXT")
    private String boardContent; // Альтернативное поле (для совместимости)
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt = LocalDateTime.now();
    
    @Column(name = "version")
    private Long version = 1L; // Версия для оптимистичной блокировки
    
    // Конструкторы
    public BoardState() {}
    
    public BoardState(Lesson lesson, String boardData) {
        this.lesson = lesson;
        this.boardData = boardData;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
    
    // Геттеры и сеттеры
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public Lesson getLesson() {
        return lesson;
    }
    
    public void setLesson(Lesson lesson) {
        this.lesson = lesson;
    }
    
    public String getBoardData() {
        // Если boardData пусто, используем boardContent, если и он пуст - возвращаем пустой JSON
        if (boardData != null && !boardData.isEmpty()) {
            return boardData;
        }
        if (boardContent != null && !boardContent.isEmpty()) {
            return boardContent;
        }
        return "{\"elements\":[],\"appState\":{}}";
    }
    
    public void setBoardData(String boardData) {
        this.boardData = boardData;
        this.boardContent = boardData; // Для совместимости
        this.updatedAt = LocalDateTime.now();
    }
    
    public String getBoardContent() {
        return boardContent != null ? boardContent : boardData;
    }
    
    public void setBoardContent(String boardContent) {
        this.boardContent = boardContent;
        this.boardData = boardContent; // Для совместимости
        this.updatedAt = LocalDateTime.now();
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
    
    public Long getVersion() {
        return version;
    }
    
    public void setVersion(Long version) {
        this.version = version;
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
        if (version == null) {
            version = 1L;
        } else {
            version++;
        }
    }
}

