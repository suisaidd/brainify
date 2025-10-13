package com.example.brainify.Model;

import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "task_numbers")
public class TaskNumber {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name; // Например: "Задание 1", "Задание 2"
    
    @Column(nullable = false)
    private Integer number; // Номер задания (1, 2, 3...)
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;
    
    @Column(nullable = false)
    private String examType; // "OGE" или "EGE"
    
    @OneToMany(mappedBy = "taskNumber", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Subtopic> subtopics;
    
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
    
    // Конструкторы
    public TaskNumber() {}
    
    public TaskNumber(String name, Integer number, Subject subject, String examType) {
        this.name = name;
        this.number = number;
        this.subject = subject;
        this.examType = examType;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public Integer getNumber() {
        return number;
    }
    
    public void setNumber(Integer number) {
        this.number = number;
    }
    
    public Subject getSubject() {
        return subject;
    }
    
    public void setSubject(Subject subject) {
        this.subject = subject;
    }
    
    public String getExamType() {
        return examType;
    }
    
    public void setExamType(String examType) {
        this.examType = examType;
    }
    
    public List<Subtopic> getSubtopics() {
        return subtopics;
    }
    
    public void setSubtopics(List<Subtopic> subtopics) {
        this.subtopics = subtopics;
    }
    
    public Boolean getIsActive() {
        return isActive;
    }
    
    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }
}

