package com.example.brainify.Service;

import com.example.brainify.Model.Lesson;
import com.example.brainify.Repository.LessonRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.UUID;

@Service
public class ExcalidrawService {
    
    @Autowired
    private LessonRepository lessonRepository;
    
    private static final String CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private static final int SECRET_KEY_LENGTH = 22;
    private final SecureRandom random = new SecureRandom();
    
    /**
     * Генерирует уникальный ID комнаты для Excalidraw
     * @return уникальный ID комнаты
     */
    public String generateRoomId() {
        return UUID.randomUUID().toString().replace("-", "");
    }
    
    /**
     * Генерирует 22-значный секретный ключ для Excalidraw
     * @return секретный ключ
     */
    public String generateSecretKey() {
        StringBuilder key = new StringBuilder(SECRET_KEY_LENGTH);
        for (int i = 0; i < SECRET_KEY_LENGTH; i++) {
            key.append(CHARACTERS.charAt(random.nextInt(CHARACTERS.length())));
        }
        return key.toString();
    }
    
    /**
     * Создает уникальные ID и секретный ключ для урока
     * @param lesson урок для которого создаются ключи
     * @return урок с обновленными полями
     */
    public Lesson generateExcalidrawKeys(Lesson lesson) {
        if (lesson.getExcalidrawRoomId() == null || lesson.getExcalidrawSecretKey() == null) {
            String roomId = generateRoomId();
            String secretKey = generateSecretKey();
            
            // Проверяем уникальность roomId
            while (lessonRepository.findByExcalidrawRoomId(roomId).isPresent()) {
                roomId = generateRoomId();
            }
            
            lesson.setExcalidrawRoomId(roomId);
            lesson.setExcalidrawSecretKey(secretKey);
            
            lessonRepository.save(lesson);
        }
        
        return lesson;
    }
    
    /**
     * Получает URL для iframe Excalidraw
     * @param lesson урок
     * @return URL для iframe
     */
    public String getExcalidrawUrl(Lesson lesson) {
        if (lesson.getExcalidrawRoomId() == null || lesson.getExcalidrawSecretKey() == null) {
            lesson = generateExcalidrawKeys(lesson);
        }
        
        // Добавляем параметры для принудительной очистки состояния и изоляции
        long timestamp = System.currentTimeMillis();
        String lessonId = lesson.getId().toString();
        
        return String.format("https://excalidraw.com/#room=%s,%s&clearStorage=true&_t=%d&new=true&forceClear=1&lessonId=%s&isolate=true&reset=true", 
                           lesson.getExcalidrawRoomId(), 
                           lesson.getExcalidrawSecretKey(),
                           timestamp,
                           lessonId);
    }
    
    /**
     * Генерирует новые ключи для урока (принудительно)
     * @param lesson урок
     * @return урок с новыми ключами
     */
    public Lesson forceGenerateNewKeys(Lesson lesson) {
        // Принудительно генерируем новые ключи
        String roomId = generateRoomId();
        String secretKey = generateSecretKey();
        
        // Проверяем уникальность roomId
        while (lessonRepository.findByExcalidrawRoomId(roomId).isPresent()) {
            roomId = generateRoomId();
        }
        
        lesson.setExcalidrawRoomId(roomId);
        lesson.setExcalidrawSecretKey(secretKey);
        
        lessonRepository.save(lesson);
        
        return lesson;
    }
}
