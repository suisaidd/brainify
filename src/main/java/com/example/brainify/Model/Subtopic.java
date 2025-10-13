package com.example.brainify.Model;

import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "subtopics")
public class Subtopic {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name; // Например: "Линейные уравнения", "Квадратные уравнения"
    
    @Column(columnDefinition = "TEXT")
    private String description; // Описание подтемы
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_number_id", nullable = false)
    private TaskNumber taskNumber;
    
    @OneToMany(mappedBy = "subtopic", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Task> tasks;
    
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
    
    @Column(name = "sort_order")
    private Integer sortOrder = 0; // Порядок сортировки
    
    // Конструкторы
    public Subtopic() {}
    
    public Subtopic(String name, String description, TaskNumber taskNumber) {
        this.name = name;
        this.description = description;
        this.taskNumber = taskNumber;
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
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public TaskNumber getTaskNumber() {
        return taskNumber;
    }
    
    public void setTaskNumber(TaskNumber taskNumber) {
        this.taskNumber = taskNumber;
    }
    
    public List<Task> getTasks() {
        return tasks;
    }
    
    public void setTasks(List<Task> tasks) {
        this.tasks = tasks;
    }
    
    public Boolean getIsActive() {
        return isActive;
    }
    
    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }
    
    public Integer getSortOrder() {
        return sortOrder;
    }
    
    public void setSortOrder(Integer sortOrder) {
        this.sortOrder = sortOrder;
    }
}

