package com.example.brainify.Repository;

import com.example.brainify.Model.TeacherSchedule;
import com.example.brainify.Model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalTime;
import java.util.List;

@Repository
public interface TeacherScheduleRepository extends JpaRepository<TeacherSchedule, Long> {
    
    // Найти расписание преподавателя
    List<TeacherSchedule> findByTeacherOrderByDayOfWeekAscStartTimeAsc(User teacher);
    
    // Найти доступное расписание преподавателя
    List<TeacherSchedule> findByTeacherAndIsAvailableTrueOrderByDayOfWeekAscStartTimeAsc(User teacher);
    
    // Найти расписание на определенный день недели
    @Query("SELECT ts FROM TeacherSchedule ts WHERE ts.teacher = :teacher AND ts.dayOfWeek = :dayOfWeek AND ts.isAvailable = true ORDER BY ts.startTime ASC")
    List<TeacherSchedule> findAvailableScheduleForDay(@Param("teacher") User teacher, @Param("dayOfWeek") DayOfWeek dayOfWeek);
    
    // Проверить пересечение времени
    @Query("SELECT ts FROM TeacherSchedule ts WHERE ts.teacher = :teacher AND ts.dayOfWeek = :dayOfWeek AND " +
           "((ts.startTime <= :startTime AND ts.endTime > :startTime) OR " +
           "(ts.startTime < :endTime AND ts.endTime >= :endTime) OR " +
           "(ts.startTime >= :startTime AND ts.endTime <= :endTime))")
    List<TeacherSchedule> findOverlappingSchedules(@Param("teacher") User teacher, 
                                                  @Param("dayOfWeek") DayOfWeek dayOfWeek,
                                                  @Param("startTime") LocalTime startTime, 
                                                  @Param("endTime") LocalTime endTime);
    
    // Удалить все расписания преподавателя
    @Modifying
    @Transactional
    void deleteByTeacher(User teacher);
} 