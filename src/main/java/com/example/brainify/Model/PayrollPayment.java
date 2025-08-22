package com.example.brainify.Model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "payroll_payments")
public class PayrollPayment {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    private User teacher;
    
    @Column(name = "payment_year", nullable = false)
    private Integer paymentYear;
    
    @Column(name = "payment_month", nullable = false)
    private Integer paymentMonth;
    
    @Column(name = "payment_type", nullable = false)
    private String paymentType; // "current-payroll", "past-payroll", "monthly-payroll"
    
    @Column(name = "expected_amount", nullable = false)
    private BigDecimal expectedAmount;
    
    @Column(name = "paid_amount", nullable = false)
    private BigDecimal paidAmount;
    
    @Column(name = "payment_date", nullable = false)
    private LocalDateTime paymentDate;
    
    @Column(name = "payment_status", nullable = false)
    private String paymentStatus; // "pending", "paid"
    
    @Column(name = "excel_file_path")
    private String excelFilePath;
    
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    
    // Конструкторы
    public PayrollPayment() {}
    
    public PayrollPayment(User teacher, Integer paymentYear, Integer paymentMonth, 
                         String paymentType, BigDecimal expectedAmount, BigDecimal paidAmount) {
        this.teacher = teacher;
        this.paymentYear = paymentYear;
        this.paymentMonth = paymentMonth;
        this.paymentType = paymentType;
        this.expectedAmount = expectedAmount;
        this.paidAmount = paidAmount;
        this.paymentDate = LocalDateTime.now();
        this.paymentStatus = "pending";
        this.createdAt = LocalDateTime.now();
    }
    
    // Геттеры и сеттеры
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public User getTeacher() {
        return teacher;
    }
    
    public void setTeacher(User teacher) {
        this.teacher = teacher;
    }
    
    public Integer getPaymentYear() {
        return paymentYear;
    }
    
    public void setPaymentYear(Integer paymentYear) {
        this.paymentYear = paymentYear;
    }
    
    public Integer getPaymentMonth() {
        return paymentMonth;
    }
    
    public void setPaymentMonth(Integer paymentMonth) {
        this.paymentMonth = paymentMonth;
    }
    
    public String getPaymentType() {
        return paymentType;
    }
    
    public void setPaymentType(String paymentType) {
        this.paymentType = paymentType;
    }
    
    public BigDecimal getExpectedAmount() {
        return expectedAmount;
    }
    
    public void setExpectedAmount(BigDecimal expectedAmount) {
        this.expectedAmount = expectedAmount;
    }
    
    public BigDecimal getPaidAmount() {
        return paidAmount;
    }
    
    public void setPaidAmount(BigDecimal paidAmount) {
        this.paidAmount = paidAmount;
    }
    
    public LocalDateTime getPaymentDate() {
        return paymentDate;
    }
    
    public void setPaymentDate(LocalDateTime paymentDate) {
        this.paymentDate = paymentDate;
    }
    
    public String getPaymentStatus() {
        return paymentStatus;
    }
    
    public void setPaymentStatus(String paymentStatus) {
        this.paymentStatus = paymentStatus;
    }
    
    public String getExcelFilePath() {
        return excelFilePath;
    }
    
    public void setExcelFilePath(String excelFilePath) {
        this.excelFilePath = excelFilePath;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
