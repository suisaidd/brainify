package com.example.brainify.Model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonIdentityInfo;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.ObjectIdGenerators;

@Entity
@Table(name = "lessons")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
@JsonIdentityInfo(generator = ObjectIdGenerators.PropertyGenerator.class, property = "id")
public class Lesson {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    private User teacher;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;
    
    @Column(name = "lesson_date", nullable = false)
    private LocalDateTime lessonDate;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private LessonStatus status;
    
    @Column(name = "description", length = 500)
    private String description;
    
    @Column(name = "homework", length = 1000)
    private String homework;
    
    // Поля для повторения занятий
    @Column(name = "is_recurring")
    private Boolean isRecurring = false;
    
    @Column(name = "recurrence_weeks")
    private Integer recurrenceWeeks = 0;
    
    @Column(name = "original_lesson_id")
    private Long originalLessonId;
    
    @Column(name = "auto_completed")
    private Boolean autoCompleted = false;
    
    @Column(name = "teacher_joined_at")
    private LocalDateTime teacherJoinedAt;
    
    @Column(name = "auto_penalty_applied")
    private Boolean autoPenaltyApplied = false;
    
    public enum LessonStatus {
        SCHEDULED,
        COMPLETED,
        CANCELLED,
        MISSED
    }
    
    // Конструкторы
    public Lesson() {}
    
    public Lesson(User student, User teacher, Subject subject, LocalDateTime lessonDate) {
        this.student = student;
        this.teacher = teacher;
        this.subject = subject;
        this.lessonDate = lessonDate;
        this.status = LessonStatus.SCHEDULED;
    }
    
    // Геттеры и сеттеры
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public User getStudent() {
        return student;
    }
    
    public void setStudent(User student) {
        this.student = student;
    }
    
    public User getTeacher() {
        return teacher;
    }
    
    public void setTeacher(User teacher) {
        this.teacher = teacher;
    }
    
    public Subject getSubject() {
        return subject;
    }
    
    public void setSubject(Subject subject) {
        this.subject = subject;
    }
    
    public LocalDateTime getLessonDate() {
        return lessonDate;
    }
    
    public void setLessonDate(LocalDateTime lessonDate) {
        this.lessonDate = lessonDate;
    }
    
    public LessonStatus getStatus() {
        return status;
    }
    
    public void setStatus(LessonStatus status) {
        this.status = status;
    }
    
    public String getDescription() {
        return description;
    }
    
    public void setDescription(String description) {
        this.description = description;
    }
    
    public String getHomework() {
        return homework;
    }
    
    public void setHomework(String homework) {
        this.homework = homework;
    }
    
    public Boolean getIsRecurring() {
        return isRecurring;
    }
    
    public void setIsRecurring(Boolean isRecurring) {
        this.isRecurring = isRecurring;
    }
    
    public Integer getRecurrenceWeeks() {
        return recurrenceWeeks;
    }
    
    public void setRecurrenceWeeks(Integer recurrenceWeeks) {
        this.recurrenceWeeks = recurrenceWeeks;
    }
    
    public Long getOriginalLessonId() {
        return originalLessonId;
    }
    
    public void setOriginalLessonId(Long originalLessonId) {
        this.originalLessonId = originalLessonId;
    }
    
    public Boolean getAutoCompleted() {
        return autoCompleted;
    }
    
    public void setAutoCompleted(Boolean autoCompleted) {
        this.autoCompleted = autoCompleted;
    }
    
    public LocalDateTime getTeacherJoinedAt() {
        return teacherJoinedAt;
    }
    
    public void setTeacherJoinedAt(LocalDateTime teacherJoinedAt) {
        this.teacherJoinedAt = teacherJoinedAt;
    }
    
    public Boolean getAutoPenaltyApplied() {
        return autoPenaltyApplied;
    }
    
    public void setAutoPenaltyApplied(Boolean autoPenaltyApplied) {
        this.autoPenaltyApplied = autoPenaltyApplied;
    }
} 