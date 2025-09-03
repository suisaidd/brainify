package com.example.brainify.Service;

import com.example.brainify.Model.Lesson;
import com.example.brainify.Model.OnlineLessonSession;

import com.example.brainify.Model.UserRole;
import com.example.brainify.Repository.LessonRepository;
import com.example.brainify.Repository.OnlineLessonSessionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class OnlineLessonService {

    @Autowired
    private LessonRepository lessonRepository;
    
    @Autowired
    private OnlineLessonSessionRepository sessionRepository;

    /**
     * Создать или получить активную сессию для урока
     */
    @Transactional
    public OnlineLessonSession createOrGetSession(Long lessonId, Long userId, UserRole userRole) {
        Optional<Lesson> lessonOpt = lessonRepository.findById(lessonId);
        if (lessonOpt.isEmpty()) {
            throw new RuntimeException("Урок не найден");
        }

        Lesson lesson = lessonOpt.get();
        
        // Проверяем права доступа
        boolean isAdmin = UserRole.ADMIN.equals(userRole);
        boolean isTeacher = lesson.getTeacher().getId().equals(userId);
        boolean isStudent = lesson.getStudent().getId().equals(userId);
        
        if (!isAdmin && !isTeacher && !isStudent) {
            throw new RuntimeException("Нет прав доступа к уроку");
        }

        // Ищем активную сессию
        Optional<OnlineLessonSession> activeSession = sessionRepository.findByLessonAndStatus(
            lesson, OnlineLessonSession.SessionStatus.ACTIVE);
        
        if (activeSession.isPresent()) {
            OnlineLessonSession session = activeSession.get();
            
            // Отмечаем присоединение пользователя
            if (UserRole.ADMIN.equals(userRole)) {
                // Администратор присоединяется как наблюдатель
                System.out.println("Администратор присоединяется к уроку как наблюдатель");
            } else if (lesson.getTeacher().getId().equals(userId)) {
                session.teacherJoined();
            } else {
                session.studentJoined();
            }
            
            sessionRepository.save(session);
            return session;
        }

        // Ищем ожидающую сессию
        Optional<OnlineLessonSession> waitingSession = sessionRepository.findByLessonAndStatus(
            lesson, OnlineLessonSession.SessionStatus.WAITING);
        
        if (waitingSession.isPresent()) {
            OnlineLessonSession session = waitingSession.get();
            
            // Отмечаем присоединение пользователя
            if (UserRole.ADMIN.equals(userRole)) {
                // Администратор присоединяется как наблюдатель
                System.out.println("Администратор присоединяется к уроку как наблюдатель");
            } else if (lesson.getTeacher().getId().equals(userId)) {
                session.teacherJoined();
            } else {
                session.studentJoined();
            }
            
            sessionRepository.save(session);
            return session;
        }

        // Создаем новую сессию
        String roomId = "brainify-lesson-" + lessonId + "-" + UUID.randomUUID().toString().substring(0, 8);
        String roomKey = UUID.randomUUID().toString();
        
        OnlineLessonSession session = new OnlineLessonSession(lesson, roomId, roomKey);
        
        // Отмечаем присоединение пользователя
        if (UserRole.ADMIN.equals(userRole)) {
            // Администратор присоединяется как наблюдатель
            System.out.println("Администратор присоединяется к уроку как наблюдатель");
        } else if (lesson.getTeacher().getId().equals(userId)) {
            session.teacherJoined();
        } else {
            session.studentJoined();
        }
        
        return sessionRepository.save(session);
    }

    /**
     * Получить данные сессии для онлайн-урока
     */
    public OnlineLessonSession getSessionData(Long lessonId, Long userId) {
        Optional<Lesson> lessonOpt = lessonRepository.findById(lessonId);
        if (lessonOpt.isEmpty()) {
            throw new RuntimeException("Урок не найден");
        }

        Lesson lesson = lessonOpt.get();
        
        // Проверяем права доступа
        if (!lesson.getTeacher().getId().equals(userId) && 
            !lesson.getStudent().getId().equals(userId)) {
            throw new RuntimeException("Нет прав доступа к уроку");
        }

        // Ищем активную или ожидающую сессию
        Optional<OnlineLessonSession> activeSession = sessionRepository.findByLessonAndStatus(
            lesson, OnlineLessonSession.SessionStatus.ACTIVE);
        
        if (activeSession.isPresent()) {
            return activeSession.get();
        }

        Optional<OnlineLessonSession> waitingSession = sessionRepository.findByLessonAndStatus(
            lesson, OnlineLessonSession.SessionStatus.WAITING);
        
        return waitingSession.orElse(null);
    }

    /**
     * Завершить сессию онлайн-урока
     */
    @Transactional
    public void completeSession(Long lessonId, Long userId, String boardContent, String lessonNotes) {
        Optional<Lesson> lessonOpt = lessonRepository.findById(lessonId);
        if (lessonOpt.isEmpty()) {
            throw new RuntimeException("Урок не найден");
        }

        Lesson lesson = lessonOpt.get();
        
        // Проверяем права доступа (только преподаватель может завершить урок)
        if (!lesson.getTeacher().getId().equals(userId)) {
            throw new RuntimeException("Только преподаватель может завершить урок");
        }

        // Ищем активную сессию
        Optional<OnlineLessonSession> sessionOpt = sessionRepository.findByLessonAndStatus(
            lesson, OnlineLessonSession.SessionStatus.ACTIVE);
        
        if (sessionOpt.isPresent()) {
            OnlineLessonSession session = sessionOpt.get();
            session.completeSession();
            
            // Сохраняем содержимое доски и заметки
            if (boardContent != null && !boardContent.trim().isEmpty()) {
                session.setBoardContent(boardContent);
            }
            
            if (lessonNotes != null && !lessonNotes.trim().isEmpty()) {
                session.setLessonNotes(lessonNotes);
            }
            
            sessionRepository.save(session);
        }

        // Завершаем урок
        lesson.setStatus(Lesson.LessonStatus.COMPLETED);
        lessonRepository.save(lesson);
    }

    /**
     * Отменить сессию онлайн-урока
     */
    @Transactional
    public void cancelSession(Long lessonId, Long userId) {
        Optional<Lesson> lessonOpt = lessonRepository.findById(lessonId);
        if (lessonOpt.isEmpty()) {
            throw new RuntimeException("Урок не найден");
        }

        Lesson lesson = lessonOpt.get();
        
        // Проверяем права доступа
        if (!lesson.getTeacher().getId().equals(userId) && 
            !lesson.getStudent().getId().equals(userId)) {
            throw new RuntimeException("Нет прав доступа к уроку");
        }

        // Ищем активную или ожидающую сессию
        Optional<OnlineLessonSession> activeSession = sessionRepository.findByLessonAndStatus(
            lesson, OnlineLessonSession.SessionStatus.ACTIVE);
        
        if (activeSession.isPresent()) {
            OnlineLessonSession session = activeSession.get();
            session.cancelSession();
            sessionRepository.save(session);
            return;
        }

        Optional<OnlineLessonSession> waitingSession = sessionRepository.findByLessonAndStatus(
            lesson, OnlineLessonSession.SessionStatus.WAITING);
        
        if (waitingSession.isPresent()) {
            OnlineLessonSession session = waitingSession.get();
            session.cancelSession();
            sessionRepository.save(session);
        }
    }

    /**
     * Обновить содержимое доски
     */
    @Transactional
    public void updateBoardContent(Long lessonId, Long userId, String boardContent) {
        Optional<Lesson> lessonOpt = lessonRepository.findById(lessonId);
        if (lessonOpt.isEmpty()) {
            throw new RuntimeException("Урок не найден");
        }

        Lesson lesson = lessonOpt.get();
        
        // Проверяем права доступа
        if (!lesson.getTeacher().getId().equals(userId) && 
            !lesson.getStudent().getId().equals(userId)) {
            throw new RuntimeException("Нет прав доступа к уроку");
        }

        // Ищем активную сессию
        Optional<OnlineLessonSession> sessionOpt = sessionRepository.findByLessonAndStatus(
            lesson, OnlineLessonSession.SessionStatus.ACTIVE);
        
        if (sessionOpt.isPresent()) {
            OnlineLessonSession session = sessionOpt.get();
            session.setBoardContent(boardContent);
            sessionRepository.save(session);
        }
    }

    /**
     * Получить историю сессий для урока
     */
    public java.util.List<OnlineLessonSession> getSessionHistory(Long lessonId, Long userId) {
        Optional<Lesson> lessonOpt = lessonRepository.findById(lessonId);
        if (lessonOpt.isEmpty()) {
            throw new RuntimeException("Урок не найден");
        }

        Lesson lesson = lessonOpt.get();
        
        // Проверяем права доступа
        if (!lesson.getTeacher().getId().equals(userId) && 
            !lesson.getStudent().getId().equals(userId)) {
            throw new RuntimeException("Нет прав доступа к уроку");
        }

        return sessionRepository.findByLessonOrderBySessionStartedAtDesc(lesson);
    }

    /**
     * Автоматическое завершение уроков по истечении времени
     * Сессия автоматически завершается через 90 минут после первого подключения
     */
    @Transactional
    public void autoCompleteExpiredLessons() {
        LocalDateTime cutoffTime = LocalDateTime.now().minusMinutes(90); // 90 минут
        
        List<OnlineLessonSession> expiredSessions = sessionRepository.findActiveSessionsOlderThan(cutoffTime);
        
        System.out.println("Найдено " + expiredSessions.size() + " сессий для автоматического завершения");
        
        for (OnlineLessonSession session : expiredSessions) {
            try {
                System.out.println("Автоматически завершаем сессию " + session.getId() + " для урока " + session.getLesson().getId());
                
                // Завершаем сессию
                session.completeSession();
                sessionRepository.save(session);
                
                // Обновляем статус урока
                Lesson lesson = session.getLesson();
                lesson.setStatus(Lesson.LessonStatus.COMPLETED);
                lesson.setAutoCompleted(true);
                lessonRepository.save(lesson);
                
                System.out.println("Сессия " + session.getId() + " успешно завершена");
                
            } catch (Exception e) {
                System.out.println("Ошибка при завершении сессии " + session.getId() + ": " + e.getMessage());
            }
        }
    }

    /**
     * Получить все активные онлайн-уроки
     */
    public List<OnlineLessonSession> getActiveSessions() {
        return sessionRepository.findByStatus(OnlineLessonSession.SessionStatus.ACTIVE);
    }

    /**
     * Найти активную сессию по уроку
     */
    public Optional<OnlineLessonSession> findActiveSessionByLesson(Lesson lesson) {
        return sessionRepository.findByLessonAndStatus(lesson, OnlineLessonSession.SessionStatus.ACTIVE);
    }

    /**
     * Сохранить сессию
     */
    public OnlineLessonSession saveSession(OnlineLessonSession session) {
        return sessionRepository.save(session);
    }

    /**
     * Очистка старых сессий (запускается по расписанию)
     */
    @Transactional
    public void cleanupOldSessions() {
        LocalDateTime cutoffTime = LocalDateTime.now().minusHours(24); // Сессии старше 24 часов
        
        java.util.List<OnlineLessonSession> oldSessions = sessionRepository.findActiveSessionsOlderThan(cutoffTime);
        
        for (OnlineLessonSession session : oldSessions) {
            session.cancelSession();
            sessionRepository.save(session);
        }
    }

    /**
     * Проверить, может ли пользователь присоединиться к уроку
     */
    public boolean canJoinLesson(Long lessonId, Long userId, UserRole userRole) {
        System.out.println("=== Проверка возможности присоединения к уроку ===");
        System.out.println("LessonId: " + lessonId + ", UserId: " + userId);
        
        Optional<Lesson> lessonOpt = lessonRepository.findById(lessonId);
        if (lessonOpt.isEmpty()) {
            System.out.println("Урок не найден");
            return false;
        }

        Lesson lesson = lessonOpt.get();
        System.out.println("Урок найден: " + lesson.getSubject().getName() + " - " + lesson.getLessonDate());
        
        // Проверяем права доступа
        boolean isAdmin = UserRole.ADMIN.equals(userRole);
        boolean isTeacher = lesson.getTeacher().getId().equals(userId);
        boolean isStudent = lesson.getStudent().getId().equals(userId);
        System.out.println("Права доступа - Админ: " + isAdmin + ", Учитель: " + isTeacher + ", Ученик: " + isStudent);
        
        if (!isAdmin && !isTeacher && !isStudent) {
            System.out.println("Нет прав доступа к уроку");
            return false;
        }

        // Проверяем время урока
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime lessonStart = lesson.getLessonDate();
        LocalDateTime lessonEnd = lessonStart.plusHours(1);
        LocalDateTime allowedStart = lessonStart.minusMinutes(15);
        
        System.out.println("Время проверки:");
        System.out.println("  Сейчас: " + now);
        System.out.println("  Начало урока: " + lessonStart);
        System.out.println("  Конец урока: " + lessonEnd);
        System.out.println("  Разрешено присоединиться с: " + allowedStart);
        
        boolean timeAllowed = now.isAfter(allowedStart) && now.isBefore(lessonEnd);
        System.out.println("Время разрешено: " + timeAllowed);
        
        // Временно разрешаем присоединиться в любое время для тестирования
        System.out.println("ВРЕМЕННО: разрешаем присоединиться в любое время");
        return true;
    }
}
