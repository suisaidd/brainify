package com.example.brainify.Service;

import org.springframework.stereotype.Service;
import java.time.LocalDateTime;


@Service
public class GoogleMeetService {

    /**
     * Создать Google Meet ссылку для урока
     * Используем простую генерацию ссылки Google Meet
     */
    public String createMeetingForLesson(Long lessonId, String lessonTitle, LocalDateTime startTime, LocalDateTime endTime, 
                                       String teacherEmail, String studentEmail) {
        // Генерируем уникальный код для встречи
        String meetingCode = generateMeetingCode();
        
        // Создаем Google Meet ссылку
        String meetLink = "https://meet.google.com/" + meetingCode;
        
        return meetLink;
    }

    /**
     * Генерировать код встречи Google Meet
     */
    private String generateMeetingCode() {
        // Google Meet коды обычно состоят из 3 групп по 3 символа, разделенных дефисами
        // Например: abc-defg-hij
        String chars = "abcdefghijklmnopqrstuvwxyz";
        StringBuilder code = new StringBuilder();
        
        // Первая группа: 3 символа
        for (int i = 0; i < 3; i++) {
            code.append(chars.charAt((int) (Math.random() * chars.length())));
        }
        code.append("-");
        
        // Вторая группа: 4 символа
        for (int i = 0; i < 4; i++) {
            code.append(chars.charAt((int) (Math.random() * chars.length())));
        }
        code.append("-");
        
        // Третья группа: 3 символа
        for (int i = 0; i < 3; i++) {
            code.append(chars.charAt((int) (Math.random() * chars.length())));
        }
        
        return code.toString();
    }

    /**
     * Создать прямую ссылку для входа в Google Meet
     */
    public String createDirectMeetLink(String meetingCode) {
        return "https://meet.google.com/" + meetingCode;
    }

    /**
     * Создать ссылку для администратора (с правами организатора)
     */
    public String createAdminMeetLink(String meetingCode) {
        return "https://meet.google.com/" + meetingCode + "?hs=122&authuser=0";
    }
}
