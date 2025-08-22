package com.example.brainify.DTO;

import java.math.BigDecimal;

public class TeacherPayrollDTO {
    private Long teacherId;
    private String teacherName;
    private String teacherEmail;
    private String teacherPhone;
    private BigDecimal currentPayrollAmount;
    private BigDecimal paidAmount;
    private String paymentStatus;
    private Long paymentId;

    public TeacherPayrollDTO() {}

    public TeacherPayrollDTO(Long teacherId, String teacherName, String teacherEmail, 
                           String teacherPhone, BigDecimal currentPayrollAmount, 
                           BigDecimal paidAmount, String paymentStatus, Long paymentId) {
        this.teacherId = teacherId;
        this.teacherName = teacherName;
        this.teacherEmail = teacherEmail;
        this.teacherPhone = teacherPhone;
        this.currentPayrollAmount = currentPayrollAmount;
        this.paidAmount = paidAmount;
        this.paymentStatus = paymentStatus;
        this.paymentId = paymentId;
    }

    // Геттеры и сеттеры
    public Long getTeacherId() {
        return teacherId;
    }

    public void setTeacherId(Long teacherId) {
        this.teacherId = teacherId;
    }

    public String getTeacherName() {
        return teacherName;
    }

    public void setTeacherName(String teacherName) {
        this.teacherName = teacherName;
    }

    public String getTeacherEmail() {
        return teacherEmail;
    }

    public void setTeacherEmail(String teacherEmail) {
        this.teacherEmail = teacherEmail;
    }

    public String getTeacherPhone() {
        return teacherPhone;
    }

    public void setTeacherPhone(String teacherPhone) {
        this.teacherPhone = teacherPhone;
    }

    public BigDecimal getCurrentPayrollAmount() {
        return currentPayrollAmount;
    }

    public void setCurrentPayrollAmount(BigDecimal currentPayrollAmount) {
        this.currentPayrollAmount = currentPayrollAmount;
    }

    public BigDecimal getPaidAmount() {
        return paidAmount;
    }

    public void setPaidAmount(BigDecimal paidAmount) {
        this.paidAmount = paidAmount;
    }

    public String getPaymentStatus() {
        return paymentStatus;
    }

    public void setPaymentStatus(String paymentStatus) {
        this.paymentStatus = paymentStatus;
    }

    public Long getPaymentId() {
        return paymentId;
    }

    public void setPaymentId(Long paymentId) {
        this.paymentId = paymentId;
    }
}
