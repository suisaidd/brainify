package com.example.brainify.Model;

public enum UserRole {
    STUDENT("Ученик"),
    TEACHER("Учитель"), 
    MANAGER("Менеджер"),
    ADMIN("Администратор");
    
    private final String displayName;
    
    UserRole(String displayName) {
        this.displayName = displayName;
    }
    
    public String getDisplayName() {
        return displayName;
    }
} 