package com.example.brainify.DTO;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.util.List;

public class PayrollSummaryDTO {
    private BigDecimal expected;
    private BigDecimal paid;
    private List<PayrollDTO> lessons;

    public PayrollSummaryDTO() {}

    public PayrollSummaryDTO(BigDecimal expected, BigDecimal paid, List<PayrollDTO> lessons) {
        this.expected = expected;
        this.paid = paid;
        this.lessons = lessons;
    }

    // Геттеры и сеттеры
    @JsonProperty("expected")
    public BigDecimal getExpected() {
        return expected;
    }

    public void setExpected(BigDecimal expected) {
        this.expected = expected;
    }

    @JsonProperty("paid")
    public BigDecimal getPaid() {
        return paid;
    }

    public void setPaid(BigDecimal paid) {
        this.paid = paid;
    }

    public List<PayrollDTO> getLessons() {
        return lessons;
    }

    public void setLessons(List<PayrollDTO> lessons) {
        this.lessons = lessons;
    }
}
