package com.example.brainify.Model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "lesson_cancellations")
public class LessonCancellation {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id", nullable = false)
    private Lesson lesson;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cancelled_by", nullable = false)
    private User cancelledBy;
    
    @Column(name = "cancellation_reason", length = 500)
    private String cancellationReason;
    
    @Column(name = "cancellation_date", nullable = false)
    private LocalDateTime cancellationDate;
    
    @Column(name = "hours_before_lesson")
    private Integer hoursBeforeLesson;
    
    @Column(name = "penalty_amount")
    private Double penaltyAmount;
    
    @Column(name = "penalty_reason", length = 200)
    private String penaltyReason;
    
    @Column(name = "is_penalty_paid", nullable = false)
    private Boolean isPenaltyPaid = false;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
        if (cancellationDate == null) {
            cancellationDate = LocalDateTime.now();
        }
    }
    
    // Конструкторы
    public LessonCancellation() {}
    
    public LessonCancellation(Lesson lesson, User cancelledBy, String cancellationReason) {
        this.lesson = lesson;
        this.cancelledBy = cancelledBy;
        this.cancellationReason = cancellationReason;
        this.cancellationDate = LocalDateTime.now();
        this.createdAt = LocalDateTime.now();
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
    
    public User getCancelledBy() {
        return cancelledBy;
    }
    
    public void setCancelledBy(User cancelledBy) {
        this.cancelledBy = cancelledBy;
    }
    
    public String getCancellationReason() {
        return cancellationReason;
    }
    
    public void setCancellationReason(String cancellationReason) {
        this.cancellationReason = cancellationReason;
    }
    
    public LocalDateTime getCancellationDate() {
        return cancellationDate;
    }
    
    public void setCancellationDate(LocalDateTime cancellationDate) {
        this.cancellationDate = cancellationDate;
    }
    
    public Integer getHoursBeforeLesson() {
        return hoursBeforeLesson;
    }
    
    public void setHoursBeforeLesson(Integer hoursBeforeLesson) {
        this.hoursBeforeLesson = hoursBeforeLesson;
    }
    
    public Double getPenaltyAmount() {
        return penaltyAmount;
    }
    
    public void setPenaltyAmount(Double penaltyAmount) {
        this.penaltyAmount = penaltyAmount;
    }
    
    public String getPenaltyReason() {
        return penaltyReason;
    }
    
    public void setPenaltyReason(String penaltyReason) {
        this.penaltyReason = penaltyReason;
    }
    
    public Boolean getIsPenaltyPaid() {
        return isPenaltyPaid;
    }
    
    public void setIsPenaltyPaid(Boolean isPenaltyPaid) {
        this.isPenaltyPaid = isPenaltyPaid;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
