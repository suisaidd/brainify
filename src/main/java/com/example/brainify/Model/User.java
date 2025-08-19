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
@Table(name = "users")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@JsonIdentityInfo(generator = ObjectIdGenerators.PropertyGenerator.class, property = "id")
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(nullable = false, unique = true)
    private String email;
    
    @Column(nullable = false)
    private String phone;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role = UserRole.STUDENT; // По умолчанию ученик
    
    @Column(nullable = false)
    private Boolean isVerified = false;
    
    @Column(nullable = false)
    private Boolean isActive = true;
    
    @Column(nullable = false)
    @JsonIgnore
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Column
    @JsonIgnore
    private LocalDateTime lastLoginAt;
    
    // Поле для отслеживания оставшихся занятий (только для учеников)
    @Column(name = "remaining_lessons")
    private Integer remainingLessons = 0;
    
    // Часовой пояс пользователя (например, "Europe/Moscow", "Asia/Yekaterinburg")
    @Column(name = "timezone")
    private String timezone = "Europe/Moscow"; // По умолчанию Москва
    
    // Связь Many-to-Many с предметами (только для преподавателей)
    @ManyToMany(cascade = {CascadeType.PERSIST, CascadeType.MERGE})
    @JoinTable(
        name = "user_subjects",
        joinColumns = @JoinColumn(name = "user_id"),
        inverseJoinColumns = @JoinColumn(name = "subject_id")
    )
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Set<Subject> subjects = new HashSet<>();
    
    // Конструкторы
    public User() {}
    
    public User(String name, String email, String phone) {
        this.name = name;
        this.email = email;
        this.phone = phone;
        this.role = UserRole.STUDENT;
        this.isVerified = false;
        this.isActive = true;
        this.createdAt = LocalDateTime.now();
        this.timezone = "Europe/Moscow";
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
    
    public String getEmail() {
        return email;
    }
    
    public void setEmail(String email) {
        this.email = email;
    }
    
    public String getPhone() {
        return phone;
    }
    
    public void setPhone(String phone) {
        this.phone = phone;
    }
    
    public UserRole getRole() {
        return role;
    }
    
    public void setRole(UserRole role) {
        this.role = role;
    }
    
    public Boolean getIsVerified() {
        return isVerified;
    }
    
    public void setIsVerified(Boolean isVerified) {
        this.isVerified = isVerified;
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
    
    public LocalDateTime getLastLoginAt() {
        return lastLoginAt;
    }
    
    public void setLastLoginAt(LocalDateTime lastLoginAt) {
        this.lastLoginAt = lastLoginAt;
    }
    
    public Integer getRemainingLessons() {
        return remainingLessons;
    }
    
    public void setRemainingLessons(Integer remainingLessons) {
        this.remainingLessons = remainingLessons;
    }
    
    public String getTimezone() {
        return timezone != null ? timezone : "Europe/Moscow";
    }
    
    public void setTimezone(String timezone) {
        this.timezone = timezone;
    }
    
    @Override
    public String toString() {
        return "User{" +
                "id=" + id +
                ", name='" + name + '\'' +
                ", email='" + email + '\'' +
                ", phone='" + phone + '\'' +
                ", role=" + role +
                ", isVerified=" + isVerified +
                ", isActive=" + isActive +
                ", createdAt=" + createdAt +
                '}';
    }
    
    // Геттеры и сеттеры для subjects
    public Set<Subject> getSubjects() {
        return subjects;
    }
    
    public void setSubjects(Set<Subject> subjects) {
        this.subjects = subjects;
    }
    
    // Utility методы для работы с предметами
    public void addSubject(Subject subject) {
        this.subjects.add(subject);
        subject.getTeachers().add(this);
    }
    
    public void removeSubject(Subject subject) {
        this.subjects.remove(subject);
        subject.getTeachers().remove(this);
    }
} 