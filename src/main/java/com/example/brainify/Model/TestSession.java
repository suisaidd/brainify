package com.example.brainify.Model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "test_sessions")
public class TestSession {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user; // Может быть null для неавторизованных пользователей

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @Column(name = "exam_type", nullable = false)
    private String examType; // ОГЭ, ЕГЭ

    @Column(name = "test_type", nullable = false)
    private String testType; // random, specific, marathon

    @Column(name = "task_numbers")
    private String taskNumbers; // JSON строка с номерами заданий

    @Column(name = "total_questions", nullable = false)
    private Integer totalQuestions;

    @Column(name = "correct_answers", nullable = false)
    private Integer correctAnswers = 0;

    @Column(name = "score_percentage")
    private Double scorePercentage;

    @Column(name = "time_spent_minutes")
    private Integer timeSpentMinutes;

    @Column(name = "is_completed", nullable = false)
    private Boolean isCompleted = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @OneToMany(mappedBy = "testSession", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TestAnswer> answers;

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public Subject getSubject() { return subject; }
    public void setSubject(Subject subject) { this.subject = subject; }
    public String getExamType() { return examType; }
    public void setExamType(String examType) { this.examType = examType; }
    public String getTestType() { return testType; }
    public void setTestType(String testType) { this.testType = testType; }
    public String getTaskNumbers() { return taskNumbers; }
    public void setTaskNumbers(String taskNumbers) { this.taskNumbers = taskNumbers; }
    public Integer getTotalQuestions() { return totalQuestions; }
    public void setTotalQuestions(Integer totalQuestions) { this.totalQuestions = totalQuestions; }
    public Integer getCorrectAnswers() { return correctAnswers; }
    public void setCorrectAnswers(Integer correctAnswers) { this.correctAnswers = correctAnswers; }
    public Double getScorePercentage() { return scorePercentage; }
    public void setScorePercentage(Double scorePercentage) { this.scorePercentage = scorePercentage; }
    public Integer getTimeSpentMinutes() { return timeSpentMinutes; }
    public void setTimeSpentMinutes(Integer timeSpentMinutes) { this.timeSpentMinutes = timeSpentMinutes; }
    public Boolean getIsCompleted() { return isCompleted; }
    public void setIsCompleted(Boolean isCompleted) { this.isCompleted = isCompleted; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
    public List<TestAnswer> getAnswers() { return answers; }
    public void setAnswers(List<TestAnswer> answers) { this.answers = answers; }
}

