package com.example.brainify.Service;

import com.example.brainify.Model.User;
import com.example.brainify.Model.UserRole;
import com.example.brainify.Model.Subject;
import com.example.brainify.Repository.UserRepository;
import com.example.brainify.Repository.SubjectRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private SubjectRepository subjectRepository;

    // Получить всех пользователей с пагинацией
    public Page<User> getAllUsers(Pageable pageable) {
        return userRepository.findAll(pageable);
    }

    // Поиск пользователей по номеру телефона
    public Page<User> searchUsersByPhone(String phone, Pageable pageable) {
        return userRepository.findByPhoneContaining(phone, pageable);
    }
    
    // Получить пользователей по роли
    public Page<User> getUsersByRole(UserRole role, Pageable pageable) {
        return userRepository.findByRole(role, pageable);
    }
    
    // Поиск пользователей по роли и номеру телефона
    public Page<User> searchUsersByRoleAndPhone(UserRole role, String phone, Pageable pageable) {
        if (phone != null && !phone.trim().isEmpty()) {
            return userRepository.findByRoleAndPhoneContaining(role, phone, pageable);
        } else {
            return userRepository.findByRole(role, pageable);
        }
    }

    // Обновить роль пользователя
    @Transactional
    public void updateUserRole(Long userId, UserRole newRole) throws Exception {
        User user = userRepository.findById(userId)
            .orElse(null);
        
        if (user == null) {
            throw new Exception("Пользователь не найден");
        }
        
        user.setRole(newRole);
        userRepository.save(user);
    }

    // Получить пользователя по ID
    public User getUserById(Long userId) throws Exception {
        User user = userRepository.findById(userId)
            .orElse(null);
            
        if (user == null) {
            throw new Exception("Пользователь не найден");
        }
        
        return user;
    }

    // Получить общее количество пользователей
    public long getTotalUsersCount() {
        return userRepository.count();
    }

    // Получить количество пользователей по роли
    public long getUsersCountByRole(UserRole role) {
        return userRepository.countByRole(role);
    }
    
    // Методы для работы с предметами
    
    // Получить все активные предметы
    public List<Subject> getAllActiveSubjects() {
        return subjectRepository.findByIsActiveTrueOrderByNameAsc();
    }
    
    // Назначить предметы пользователю (преподаватель или ученик)
    @Transactional
    public void assignSubjectsToUser(Long userId, List<Long> subjectIds) throws Exception {
        User user = getUserById(userId);
        
        // Проверяем, что это преподаватель или ученик
        if (!user.getRole().equals(UserRole.TEACHER) && !user.getRole().equals(UserRole.STUDENT)) {
            throw new Exception("Предметы можно назначать только преподавателям и ученикам");
        }
        
        // Очищаем текущие предметы
        user.getSubjects().clear();
        
        // Добавляем новые предметы
        for (Long subjectId : subjectIds) {
            Subject subject = subjectRepository.findById(subjectId)
                .orElse(null);
            if (subject != null && subject.getIsActive()) {
                user.addSubject(subject);
            }
        }
        
        userRepository.save(user);
    }
    
    // Получить предметы пользователя
    public List<Subject> getUserSubjects(Long userId) throws Exception {
        User user = getUserById(userId);
        return user.getSubjects().stream().toList();
    }
    
    // Назначить предметы преподавателю (для обратной совместимости)
    @Transactional
    public void assignSubjectsToTeacher(Long teacherId, List<Long> subjectIds) throws Exception {
        assignSubjectsToUser(teacherId, subjectIds);
    }
    
    // Получить предметы преподавателя (для обратной совместимости)
    public List<Subject> getTeacherSubjects(Long teacherId) throws Exception {
        return getUserSubjects(teacherId);
    }
    
    // Получить список пользователей по роли без пагинации
    public List<User> getUsersByRole(UserRole role) {
        Page<User> page = userRepository.findByRole(role, org.springframework.data.domain.PageRequest.of(0, Integer.MAX_VALUE));
        return page.getContent();
    }
    
    // ==================== МЕТОДЫ ДЛЯ РАБОТЫ С КУПЛЕННЫМИ КУРСАМИ ====================
    
    // Получить купленные курсы пользователя
    public List<Subject> getUserPurchasedCourses(Long userId) throws Exception {
        User user = getUserById(userId);
        return user.getPurchasedCourses().stream().toList();
    }
    
    // Назначить купленные курсы пользователю
    @Transactional
    public void assignCoursesToUser(Long userId, List<Long> courseIds) throws Exception {
        User user = getUserById(userId);
        
        // Очищаем текущие курсы
        user.getPurchasedCourses().clear();
        
        // Добавляем новые курсы
        for (Long courseId : courseIds) {
            Subject subject = subjectRepository.findById(courseId).orElse(null);
            if (subject != null && subject.getIsActive()) {
                user.addPurchasedCourse(subject);
            }
        }
        
        userRepository.save(user);
    }
    
    // Проверить, купил ли пользователь курс
    public boolean hasUserPurchasedCourse(Long userId, Long subjectId) throws Exception {
        User user = getUserById(userId);
        return user.hasPurchasedCourse(subjectId);
    }
    
    // Обновить количество занятий у ученика
    @Transactional
    public void updateStudentLessons(Long userId, Integer remainingLessons) throws Exception {
        User user = getUserById(userId);
        
        // Проверяем, что это ученик
        if (!user.getRole().equals(UserRole.STUDENT)) {
            throw new Exception("Количество занятий можно изменять только у учеников");
        }
        
        // Проверяем, что количество занятий не отрицательное
        if (remainingLessons < 0) {
            throw new Exception("Количество занятий не может быть отрицательным");
        }
        
        user.setRemainingLessons(remainingLessons);
        userRepository.save(user);
    }
} 