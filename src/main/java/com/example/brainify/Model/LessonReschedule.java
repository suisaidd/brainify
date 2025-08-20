package com.example.brainify.Model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "lesson_reschedules")
public class LessonReschedule {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id", nullable = false)
    private Lesson lesson;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rescheduled_by", nullable = false)
    private User rescheduledBy;
    
    @Column(name = "original_date", nullable = false)
    private LocalDateTime originalDate;
    
    @Column(name = "new_date", nullable = false)
    private LocalDateTime newDate;
    
    @Column(name = "reschedule_reason", length = 500)
    private String rescheduleReason;
    
    @Column(name = "reschedule_date", nullable = false)
    private LocalDateTime rescheduleDate;
    
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
    
    // Конструкторы
    public LessonReschedule() {}
    
    public LessonReschedule(Lesson lesson, User rescheduledBy, LocalDateTime originalDate, 
                           LocalDateTime newDate, String rescheduleReason) {
        this.lesson = lesson;
        this.rescheduledBy = rescheduledBy;
        this.originalDate = originalDate;
        this.newDate = newDate;
        this.rescheduleReason = rescheduleReason;
        this.rescheduleDate = LocalDateTime.now();
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
    
    public User getRescheduledBy() {
        return rescheduledBy;
    }
    
    public void setRescheduledBy(User rescheduledBy) {
        this.rescheduledBy = rescheduledBy;
    }
    
    public LocalDateTime getOriginalDate() {
        return originalDate;
    }
    
    public void setOriginalDate(LocalDateTime originalDate) {
        this.originalDate = originalDate;
    }
    
    public LocalDateTime getNewDate() {
        return newDate;
    }
    
    public void setNewDate(LocalDateTime newDate) {
        this.newDate = newDate;
    }
    
    public String getRescheduleReason() {
        return rescheduleReason;
    }
    
    public void setRescheduleReason(String rescheduleReason) {
        this.rescheduleReason = rescheduleReason;
    }
    
    public LocalDateTime getRescheduleDate() {
        return rescheduleDate;
    }
    
    public void setRescheduleDate(LocalDateTime rescheduleDate) {
        this.rescheduleDate = rescheduleDate;
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
