package com.example.brainify.Model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonIdentityInfo;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.ObjectIdGenerators;

@Entity
@Table(name = "subjects")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@JsonIdentityInfo(generator = ObjectIdGenerators.PropertyGenerator.class, property = "id")
public class Subject {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true, length = 100)
    private String name;
    
    @Column(length = 500)
    private String description;
    
    @Column(nullable = false)
    private Boolean isActive = true;
    
    @Column(name = "created_at", nullable = false)
    @JsonIgnore
    private LocalDateTime createdAt;
    
    @ManyToMany(mappedBy = "subjects")
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Set<User> teachers = new HashSet<>();
    
    // Конструкторы
    public Subject() {
        this.createdAt = LocalDateTime.now();
    }
    
    public Subject(String name, String description) {
        this();
        this.name = name;
        this.description = description;
    }
    
    // Геттеры и сеттеры
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
    
    public Set<User> getTeachers() {
        return teachers;
    }
    
    public void setTeachers(Set<User> teachers) {
        this.teachers = teachers;
    }
    
    // Utility методы
    public void addTeacher(User teacher) {
        this.teachers.add(teacher);
        teacher.getSubjects().add(this);
    }
    
    public void removeTeacher(User teacher) {
        this.teachers.remove(teacher);
        teacher.getSubjects().remove(this);
    }
    
    @Override
    public String toString() {
        return "Subject{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", description='" + description + '\'' +
                ", isActive=" + isActive +
                '}';
    }
} 