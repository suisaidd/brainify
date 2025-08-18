package com.example.brainify.Repository;

import com.example.brainify.Model.User;
import com.example.brainify.Model.UserRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    // Поиск по email
    Optional<User> findByEmail(String email);
    
    // Проверка существования пользователя по email
    boolean existsByEmail(String email);
    
    // Поиск по телефону
    Optional<User> findByPhone(String phone);
    
    // Проверка существования пользователя по телефону
    boolean existsByPhone(String phone);
    
    // Поиск активных пользователей
    List<User> findByIsActiveTrue();
    
    // Поиск верифицированных пользователей
    List<User> findByIsVerifiedTrue();
    
    // Поиск по роли
    List<User> findByRole(UserRole role);
    
    // Поиск активных пользователей по роли
    List<User> findByRoleAndIsActiveTrue(UserRole role);
    
    // Поиск верифицированных пользователей по роли
    List<User> findByRoleAndIsVerifiedTrue(UserRole role);
    
    // Поиск по имени (игнорируя регистр)
    List<User> findByNameContainingIgnoreCase(String name);
    
    // Статистика по ролям
    @Query("SELECT u.role, COUNT(u) FROM User u WHERE u.isActive = true GROUP BY u.role")
    List<Object[]> getUserCountByRole();
    
    // Поиск пользователей для админ панели
    @Query("SELECT u FROM User u WHERE " +
           "(:role IS NULL OR u.role = :role) AND " +
           "(:verified IS NULL OR u.isVerified = :verified) AND " +
           "(:active IS NULL OR u.isActive = :active)")
    List<User> findUsersWithFilters(@Param("role") UserRole role,
                                   @Param("verified") Boolean verified,
                                   @Param("active") Boolean active);
    
    // Новые методы для админ панели
    
    // Поиск пользователей по номеру телефона с пагинацией
    Page<User> findByPhoneContaining(String phone, Pageable pageable);
    
    // Поиск пользователей по роли с пагинацией
    Page<User> findByRole(UserRole role, Pageable pageable);
    
    // Поиск пользователей по роли и номеру телефона с пагинацией
    Page<User> findByRoleAndPhoneContaining(UserRole role, String phone, Pageable pageable);
    
    // Количество пользователей по роли
    long countByRole(UserRole role);
} 