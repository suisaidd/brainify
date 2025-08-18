package com.example.brainify.Repository;

import com.example.brainify.Model.VerificationCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface VerificationCodeRepository extends JpaRepository<VerificationCode, Long> {
    
    // Поиск действующего кода по email и типу
    @Query("SELECT vc FROM VerificationCode vc WHERE vc.email = :email AND vc.type = :type AND vc.isUsed = false AND vc.expiresAt > :now ORDER BY vc.createdAt DESC")
    Optional<VerificationCode> findValidCodeByEmailAndType(@Param("email") String email, 
                                                          @Param("type") VerificationCode.CodeType type,
                                                          @Param("now") LocalDateTime now);
    
    // Поиск кода по email, коду и типу
    Optional<VerificationCode> findByEmailAndCodeAndType(String email, String code, VerificationCode.CodeType type);
    
    // Поиск всех кодов по email
    List<VerificationCode> findByEmailOrderByCreatedAtDesc(String email);
    
    // Поиск неиспользованных кодов по email
    List<VerificationCode> findByEmailAndIsUsedFalse(String email);
    
    // Удаление истекших кодов
    @Modifying
    @Transactional
    @Query("DELETE FROM VerificationCode vc WHERE vc.expiresAt < :now")
    void deleteExpiredCodes(@Param("now") LocalDateTime now);
    
    // Деактивация всех кодов пользователя при успешной верификации
    @Modifying
    @Transactional
    @Query("UPDATE VerificationCode vc SET vc.isUsed = true, vc.usedAt = :now WHERE vc.email = :email AND vc.type = :type AND vc.isUsed = false")
    void deactivateAllUserCodes(@Param("email") String email, 
                               @Param("type") VerificationCode.CodeType type,
                               @Param("now") LocalDateTime now);
    
    // Подсчет попыток за последний час
    @Query("SELECT COUNT(vc) FROM VerificationCode vc WHERE vc.email = :email AND vc.createdAt > :oneHourAgo")
    long countRecentAttempts(@Param("email") String email, @Param("oneHourAgo") LocalDateTime oneHourAgo);
} 