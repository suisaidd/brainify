package com.example.brainify.Utils;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

public class TimezoneUtils {
    
    // Популярные часовые пояса России
    private static final Map<String, String> RUSSIAN_TIMEZONES = new HashMap<>();
    
    static {
        RUSSIAN_TIMEZONES.put("Москва", "Europe/Moscow");
        RUSSIAN_TIMEZONES.put("Санкт-Петербург", "Europe/Moscow");
        RUSSIAN_TIMEZONES.put("Екатеринбург", "Asia/Yekaterinburg");
        RUSSIAN_TIMEZONES.put("Новосибирск", "Asia/Novosibirsk");
        RUSSIAN_TIMEZONES.put("Красноярск", "Asia/Krasnoyarsk");
        RUSSIAN_TIMEZONES.put("Иркутск", "Asia/Irkutsk");
        RUSSIAN_TIMEZONES.put("Якутск", "Asia/Yakutsk");
        RUSSIAN_TIMEZONES.put("Владивосток", "Asia/Vladivostok");
        RUSSIAN_TIMEZONES.put("Магадан", "Asia/Magadan");
        RUSSIAN_TIMEZONES.put("Калининград", "Europe/Kaliningrad");
        RUSSIAN_TIMEZONES.put("Самара", "Europe/Samara");
        RUSSIAN_TIMEZONES.put("Уфа", "Asia/Yekaterinburg");
        RUSSIAN_TIMEZONES.put("Казань", "Europe/Moscow");
        RUSSIAN_TIMEZONES.put("Нижний Новгород", "Europe/Moscow");
        RUSSIAN_TIMEZONES.put("Ростов-на-Дону", "Europe/Moscow");
    }
    
    /**
     * Конвертирует время из часового пояса учителя в часовой пояс ученика
     */
    public static String convertTimeForUser(String teacherTime, String teacherTimezone, String studentTimezone) {
        try {
            // Парсим время учителя (например, "12:00")
            LocalTime time = LocalTime.parse(teacherTime);
            
            // Создаем дату сегодня в часовом поясе учителя
            ZoneId teacherZone = ZoneId.of(teacherTimezone);
            LocalDate today = LocalDate.now();
            LocalDateTime teacherDateTime = LocalDateTime.of(today, time);
            ZonedDateTime teacherZoned = teacherDateTime.atZone(teacherZone);
            
            // Конвертируем в часовой пояс ученика
            ZoneId studentZone = ZoneId.of(studentTimezone);
            ZonedDateTime studentZoned = teacherZoned.withZoneSameInstant(studentZone);
            
            // Возвращаем только время
            return studentZoned.toLocalTime().format(DateTimeFormatter.ofPattern("HH:mm"));
            
        } catch (Exception e) {
            // В случае ошибки возвращаем исходное время
            return teacherTime;
        }
    }
    
    /**
     * Получает смещение часового пояса в часах
     */
    public static int getTimezoneOffset(String timezone) {
        try {
            ZoneId zone = ZoneId.of(timezone);
            ZonedDateTime now = ZonedDateTime.now(zone);
            return now.getOffset().getTotalSeconds() / 3600;
        } catch (Exception e) {
            return 0; // По умолчанию UTC
        }
    }
    
    /**
     * Получает название города по часовому поясу
     */
    public static String getCityName(String timezone) {
        for (Map.Entry<String, String> entry : RUSSIAN_TIMEZONES.entrySet()) {
            if (entry.getValue().equals(timezone)) {
                return entry.getKey();
            }
        }
        return timezone;
    }
    
    /**
     * Получает список популярных городов России
     */
    public static Map<String, String> getRussianCities() {
        return new HashMap<>(RUSSIAN_TIMEZONES);
    }
    
    /**
     * Проверяет, валиден ли часовой пояс
     */
    public static boolean isValidTimezone(String timezone) {
        try {
            ZoneId.of(timezone);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
