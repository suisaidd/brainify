package com.example.brainify.Repository;

import com.example.brainify.Model.PayrollPayment;
import com.example.brainify.Model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PayrollPaymentRepository extends JpaRepository<PayrollPayment, Long> {
    
    // Найти все платежи преподавателя
    List<PayrollPayment> findByTeacherOrderByCreatedAtDesc(User teacher);
    
    // Найти платежи преподавателя за определенный месяц
    @Query("SELECT pp FROM PayrollPayment pp WHERE pp.teacher = :teacher AND pp.paymentYear = :year AND pp.paymentMonth = :month")
    List<PayrollPayment> findByTeacherAndYearAndMonth(@Param("teacher") User teacher, 
                                                     @Param("year") Integer year, 
                                                     @Param("month") Integer month);
    
    // Найти ожидающий платеж преподавателя за определенный месяц и тип
    @Query("SELECT pp FROM PayrollPayment pp WHERE pp.teacher = :teacher AND pp.paymentYear = :year AND pp.paymentMonth = :month AND pp.paymentType = :type AND pp.paymentStatus = 'pending'")
    Optional<PayrollPayment> findPendingPaymentByTeacherAndYearAndMonthAndType(@Param("teacher") User teacher, 
                                                                              @Param("year") Integer year, 
                                                                              @Param("month") Integer month, 
                                                                              @Param("type") String type);
    
    // Найти любой платеж (pending или paid) преподавателя за определенный месяц и тип
    @Query("SELECT pp FROM PayrollPayment pp WHERE pp.teacher = :teacher AND pp.paymentYear = :year AND pp.paymentMonth = :month AND pp.paymentType = :type")
    Optional<PayrollPayment> findAnyPaymentByTeacherAndYearAndMonthAndType(@Param("teacher") User teacher, 
                                                                          @Param("year") Integer year, 
                                                                          @Param("month") Integer month, 
                                                                          @Param("type") String type);
    
    // Найти все платежи (pending или paid) преподавателя за определенный месяц и тип
    @Query("SELECT pp FROM PayrollPayment pp WHERE pp.teacher = :teacher AND pp.paymentYear = :year AND pp.paymentMonth = :month AND pp.paymentType = :type ORDER BY pp.createdAt DESC")
    List<PayrollPayment> findAllPaymentsByTeacherAndYearAndMonthAndType(@Param("teacher") User teacher, 
                                                                       @Param("year") Integer year, 
                                                                       @Param("month") Integer month, 
                                                                       @Param("type") String type);
    
    // Найти все ожидающие платежи за определенный месяц
    @Query("SELECT pp FROM PayrollPayment pp WHERE pp.paymentYear = :year AND pp.paymentMonth = :month AND pp.paymentStatus = 'pending'")
    List<PayrollPayment> findPendingPaymentsByYearAndMonth(@Param("year") Integer year, 
                                                          @Param("month") Integer month);
    
    // Найти все ожидающие платежи
    @Query("SELECT pp FROM PayrollPayment pp WHERE pp.paymentStatus = 'pending' ORDER BY pp.paymentYear DESC, pp.paymentMonth DESC")
    List<PayrollPayment> findAllPendingPayments();
    
    // Подсчитать общую сумму ожидающих платежей за месяц
    @Query("SELECT SUM(pp.expectedAmount) FROM PayrollPayment pp WHERE pp.paymentYear = :year AND pp.paymentMonth = :month AND pp.paymentStatus = 'pending'")
    java.math.BigDecimal sumPendingPaymentsByYearAndMonth(@Param("year") Integer year, 
                                                         @Param("month") Integer month);
}
