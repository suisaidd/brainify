package com.example.brainify.Model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "tasks")
public class Task {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, columnDefinition = "TEXT")
    private String question; // Текст задания
    
    @Column(columnDefinition = "TEXT")
    private String answer; // Ответ на задание
    
    @Column(columnDefinition = "TEXT")
    private String solution; // Решение задания
    
    @Column(name = "image_data", columnDefinition = "BYTEA")
    private byte[] imageData; // Сжатое изображение
    
    @Column(name = "image_type")
    private String imageType; // Тип изображения (jpg, png, etc.)
    
    @Column(name = "image_size")
    private Long imageSize; // Размер изображения в байтах
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subtopic_id", nullable = false)
    private Subtopic subtopic;
    
    @Column(name = "difficulty_level")
    private Integer difficultyLevel = 1; // Уровень сложности (1-5)
    
    @Column(name = "points")
    private Integer points = 1; // Количество баллов за задание
    
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    // Конструкторы
    public Task() {}
    
    public Task(String question, String answer, Subtopic subtopic) {
        this.question = question;
        this.answer = answer;
        this.subtopic = subtopic;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getQuestion() {
        return question;
    }
    
    public void setQuestion(String question) {
        this.question = question;
    }
    
    public String getAnswer() {
        return answer;
    }
    
    public void setAnswer(String answer) {
        this.answer = answer;
    }
    
    public String getSolution() {
        return solution;
    }
    
    public void setSolution(String solution) {
        this.solution = solution;
    }
    
    public byte[] getImageData() {
        return imageData;
    }
    
    public void setImageData(byte[] imageData) {
        this.imageData = imageData;
    }
    
    public String getImageType() {
        return imageType;
    }
    
    public void setImageType(String imageType) {
        this.imageType = imageType;
    }
    
    public Long getImageSize() {
        return imageSize;
    }
    
    public void setImageSize(Long imageSize) {
        this.imageSize = imageSize;
    }
    
    public Subtopic getSubtopic() {
        return subtopic;
    }
    
    public void setSubtopic(Subtopic subtopic) {
        this.subtopic = subtopic;
    }
    
    public Integer getDifficultyLevel() {
        return difficultyLevel;
    }
    
    public void setDifficultyLevel(Integer difficultyLevel) {
        this.difficultyLevel = difficultyLevel;
    }
    
    public Integer getPoints() {
        return points;
    }
    
    public void setPoints(Integer points) {
        this.points = points;
    }
    
    public Boolean getIsActive() {
        return isActive;
    }
    
    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
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
}
