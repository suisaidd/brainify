package com.example.brainify.Model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "board_operations")
public class BoardOperation {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "lesson_id", nullable = false, foreignKey = @ForeignKey(name = "fk_board_operations_lesson"))
    private Lesson lesson;
    
    @Column(name = "operation_type", nullable = false)
    private String operationType; // start, draw, end, clear
    
    @Column(name = "x_coordinate")
    private Double x;
    
    @Column(name = "y_coordinate")
    private Double y;
    
    @Column(name = "color")
    private String color;
    
    @Column(name = "brush_size")
    private Integer brushSize;
    
    @Column(name = "user_id")
    private Long userId;
    
    @Column(name = "user_name")
    private String userName;
    
    @Column(name = "timestamp", nullable = false)
    private LocalDateTime timestamp;
    
    @Column(name = "sequence_number", nullable = false)
    private Long sequenceNumber;
    
    // Конструкторы
    public BoardOperation() {}
    
    public BoardOperation(Lesson lesson, String operationType, Double x, Double y, 
                         String color, Integer brushSize, Long userId, String userName) {
        this.lesson = lesson;
        this.operationType = operationType;
        this.x = x;
        this.y = y;
        this.color = color;
        this.brushSize = brushSize;
        this.userId = userId;
        this.userName = userName;
        this.timestamp = LocalDateTime.now();
        // Устанавливаем sequenceNumber в 0, он будет обновлен в сервисе
        this.sequenceNumber = 0L;
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
    
    public String getOperationType() {
        return operationType;
    }
    
    public void setOperationType(String operationType) {
        this.operationType = operationType;
    }
    
    public Double getX() {
        return x;
    }
    
    public void setX(Double x) {
        this.x = x;
    }
    
    public Double getY() {
        return y;
    }
    
    public void setY(Double y) {
        this.y = y;
    }
    
    public String getColor() {
        return color;
    }
    
    public void setColor(String color) {
        this.color = color;
    }
    
    public Integer getBrushSize() {
        return brushSize;
    }
    
    public void setBrushSize(Integer brushSize) {
        this.brushSize = brushSize;
    }
    
    public Long getUserId() {
        return userId;
    }
    
    public void setUserId(Long userId) {
        this.userId = userId;
    }
    
    public String getUserName() {
        return userName;
    }
    
    public void setUserName(String userName) {
        this.userName = userName;
    }
    
    public LocalDateTime getTimestamp() {
        return timestamp;
    }
    
    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }
    
    public Long getSequenceNumber() {
        return sequenceNumber;
    }
    
    public void setSequenceNumber(Long sequenceNumber) {
        this.sequenceNumber = sequenceNumber;
    }
    
    @Override
    public String toString() {
        return "BoardOperation{" +
                "id=" + id +
                ", lessonId=" + (lesson != null ? lesson.getId() : null) +
                ", operationType='" + operationType + '\'' +
                ", x=" + x +
                ", y=" + y +
                ", color='" + color + '\'' +
                ", brushSize=" + brushSize +
                ", userId=" + userId +
                ", userName='" + userName + '\'' +
                ", timestamp=" + timestamp +
                ", sequenceNumber=" + sequenceNumber +
                '}';
    }
}
