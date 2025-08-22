package com.example.brainify.DTO;

import com.fasterxml.jackson.annotation.JsonFormat;
import java.math.BigDecimal;
import java.time.LocalDate;

public class PayrollDTO {
    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate date;
    private String subject;
    private String type;
    private String status;
    private String student;
    private BigDecimal rate;
    private BigDecimal bonus;
    private BigDecimal compensation;
    private BigDecimal penalty;

    public PayrollDTO() {}

    public PayrollDTO(LocalDate date, String subject, String type, String status, 
                     String student, BigDecimal rate, BigDecimal bonus, 
                     BigDecimal compensation, BigDecimal penalty) {
        this.date = date;
        this.subject = subject;
        this.type = type;
        this.status = status;
        this.student = student;
        this.rate = rate;
        this.bonus = bonus;
        this.compensation = compensation;
        this.penalty = penalty;
    }

    // Геттеры и сеттеры
    public LocalDate getDate() {
        return date;
    }

    public void setDate(LocalDate date) {
        this.date = date;
    }

    public String getSubject() {
        return subject;
    }

    public void setSubject(String subject) {
        this.subject = subject;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getStudent() {
        return student;
    }

    public void setStudent(String student) {
        this.student = student;
    }

    public BigDecimal getRate() {
        return rate;
    }

    public void setRate(BigDecimal rate) {
        this.rate = rate;
    }

    public BigDecimal getBonus() {
        return bonus;
    }

    public void setBonus(BigDecimal bonus) {
        this.bonus = bonus;
    }

    public BigDecimal getCompensation() {
        return compensation;
    }

    public void setCompensation(BigDecimal compensation) {
        this.compensation = compensation;
    }

    public BigDecimal getPenalty() {
        return penalty;
    }

    public void setPenalty(BigDecimal penalty) {
        this.penalty = penalty;
    }
}
