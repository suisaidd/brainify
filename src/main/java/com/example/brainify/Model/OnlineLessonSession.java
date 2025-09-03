package com.example.brainify.Model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "online_lesson_sessions")
public class OnlineLessonSession {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lesson_id", nullable = false)
    private Lesson lesson;
    
    @Column(name = "room_id", nullable = false)
    private String roomId;
    
    @Column(name = "room_key", nullable = false)
    private String roomKey;
    
    @Column(name = "teacher_joined_at")
    private LocalDateTime teacherJoinedAt;
    
    @Column(name = "student_joined_at")
    private LocalDateTime studentJoinedAt;
    
    @Column(name = "session_started_at", nullable = false)
    private LocalDateTime sessionStartedAt;
    
    @Column(name = "session_ended_at")
    private LocalDateTime sessionEndedAt;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private SessionStatus status;
    
    @Column(name = "board_content", columnDefinition = "TEXT")
    private String boardContent;
    
    @Column(name = "lesson_notes", columnDefinition = "TEXT")
    private String lessonNotes;
    
    public enum SessionStatus {
        WAITING,
        ACTIVE,
        COMPLETED,
        CANCELLED
    }
    
    // Конструкторы
    public OnlineLessonSession() {}
    
    public OnlineLessonSession(Lesson lesson, String roomId, String roomKey) {
        this.lesson = lesson;
        this.roomId = roomId;
        this.roomKey = roomKey;
        this.sessionStartedAt = LocalDateTime.now();
        this.status = SessionStatus.WAITING;
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
    
    public String getRoomId() {
        return roomId;
    }
    
    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }
    
    public String getRoomKey() {
        return roomKey;
    }
    
    public void setRoomKey(String roomKey) {
        this.roomKey = roomKey;
    }
    
    public LocalDateTime getTeacherJoinedAt() {
        return teacherJoinedAt;
    }
    
    public void setTeacherJoinedAt(LocalDateTime teacherJoinedAt) {
        this.teacherJoinedAt = teacherJoinedAt;
    }
    
    public LocalDateTime getStudentJoinedAt() {
        return studentJoinedAt;
    }
    
    public void setStudentJoinedAt(LocalDateTime studentJoinedAt) {
        this.studentJoinedAt = studentJoinedAt;
    }
    
    public LocalDateTime getSessionStartedAt() {
        return sessionStartedAt;
    }
    
    public void setSessionStartedAt(LocalDateTime sessionStartedAt) {
        this.sessionStartedAt = sessionStartedAt;
    }
    
    public LocalDateTime getSessionEndedAt() {
        return sessionEndedAt;
    }
    
    public void setSessionEndedAt(LocalDateTime sessionEndedAt) {
        this.sessionEndedAt = sessionEndedAt;
    }
    
    public SessionStatus getStatus() {
        return status;
    }
    
    public void setStatus(SessionStatus status) {
        this.status = status;
    }
    
    public String getBoardContent() {
        return boardContent;
    }
    
    public void setBoardContent(String boardContent) {
        this.boardContent = boardContent;
    }
    
    public String getLessonNotes() {
        return lessonNotes;
    }
    
    public void setLessonNotes(String lessonNotes) {
        this.lessonNotes = lessonNotes;
    }
    
    // Методы для управления сессией
    public void teacherJoined() {
        this.teacherJoinedAt = LocalDateTime.now();
        if (this.status == SessionStatus.WAITING) {
            this.status = SessionStatus.ACTIVE;
        }
    }
    
    public void studentJoined() {
        this.studentJoinedAt = LocalDateTime.now();
        if (this.status == SessionStatus.WAITING) {
            this.status = SessionStatus.ACTIVE;
        }
    }
    
    public void completeSession() {
        this.sessionEndedAt = LocalDateTime.now();
        this.status = SessionStatus.COMPLETED;
    }
    
    public void cancelSession() {
        this.sessionEndedAt = LocalDateTime.now();
        this.status = SessionStatus.CANCELLED;
    }
    
    public boolean isActive() {
        return this.status == SessionStatus.ACTIVE;
    }
    
    public boolean isCompleted() {
        return this.status == SessionStatus.COMPLETED;
    }
    
    public boolean isCancelled() {
        return this.status == SessionStatus.CANCELLED;
    }
    
    public boolean isWaiting() {
        return this.status == SessionStatus.WAITING;
    }
}
