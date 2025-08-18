package com.example.brainify.DTO;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public class VerificationRequest {
    
    @NotBlank(message = "Email обязателен для заполнения")
    @Email(message = "Некорректный формат email")
    private String email;
    
    @NotBlank(message = "Код обязателен для заполнения")
    @Pattern(regexp = "^[0-9]{6}$", message = "Код должен содержать 6 цифр")
    private String code;
    
    @NotBlank(message = "Тип верификации обязателен")
    private String type; // "REGISTRATION" или "LOGIN"
    
    // Конструкторы
    public VerificationRequest() {}
    
    public VerificationRequest(String email, String code, String type) {
        this.email = email;
        this.code = code;
        this.type = type;
    }
    
    // Геттеры и сеттеры
    public String getEmail() {
        return email;
    }
    
    public void setEmail(String email) {
        this.email = email;
    }
    
    public String getCode() {
        return code;
    }
    
    public void setCode(String code) {
        this.code = code;
    }
    
    public String getType() {
        return type;
    }
    
    public void setType(String type) {
        this.type = type;
    }
    
    @Override
    public String toString() {
        return "VerificationRequest{" +
                "email='" + email + '\'' +
                ", code='" + code + '\'' +
                ", type='" + type + '\'' +
                '}';
    }
} 