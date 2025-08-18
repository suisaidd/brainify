package com.example.brainify.Repository;

import com.example.brainify.Model.Subject;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubjectRepository extends JpaRepository<Subject, Long> {
    
    // Поиск активных предметов
    List<Subject> findByIsActiveTrueOrderByNameAsc();
    
    // Поиск по имени
    Optional<Subject> findByName(String name);
    
    // Поиск по имени среди активных
    Optional<Subject> findByNameAndIsActiveTrue(String name);
    
    // Проверка существования активного предмета
    boolean existsByNameAndIsActiveTrue(String name);
    
    // Получить все предметы, отсортированные по названию
    List<Subject> findAllByOrderByNameAsc();
} 