package com.example.brainify.Utils;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

public class TimezoneUtils {

    /**
     * Возвращает текущее время в UTC.
     * Используется ВЕЗДЕ вместо LocalDateTime.now() для консистентности,
     * т.к. все даты в БД хранятся в UTC.
     */
    public static LocalDateTime nowUtc() {
        return LocalDateTime.now(ZoneOffset.UTC);
    }

    /**
     * Форматирует LocalDateTime (UTC) в строку с суффиксом "Z"
     * для передачи на фронтенд. Фронтенд распознает "Z" как UTC
     * и автоматически конвертирует в локальное время браузера.
     */
    public static String toIsoUtcString(LocalDateTime utcDateTime) {
        if (utcDateTime == null) return null;
        return utcDateTime.toString() + "Z";
    }
    
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
        RUSSIAN_TIMEZONES.put("Саратов", "Europe/Saratov");
        RUSSIAN_TIMEZONES.put("Волгоград", "Europe/Volgograd");
        RUSSIAN_TIMEZONES.put("Астрахань", "Europe/Astrakhan");
        RUSSIAN_TIMEZONES.put("Пермь", "Asia/Yekaterinburg");
        RUSSIAN_TIMEZONES.put("Челябинск", "Asia/Yekaterinburg");
        RUSSIAN_TIMEZONES.put("Омск", "Asia/Omsk");
        RUSSIAN_TIMEZONES.put("Томск", "Asia/Tomsk");
        RUSSIAN_TIMEZONES.put("Хабаровск", "Asia/Vladivostok");
        RUSSIAN_TIMEZONES.put("Петропавловск-Камчатский", "Asia/Kamchatka");
        RUSSIAN_TIMEZONES.put("Краснодар", "Europe/Moscow");
        RUSSIAN_TIMEZONES.put("Воронеж", "Europe/Moscow");
        RUSSIAN_TIMEZONES.put("Тюмень", "Asia/Yekaterinburg");
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
    
    /**
     * Конвертирует LocalDateTime из локальной таймзоны пользователя в UTC.
     * Используется при СОЗДАНИИ уроков: учитель вводит время в своей таймзоне,
     * а в БД сохраняем UTC.
     *
     * @param localDateTime время в локальной таймзоне пользователя
     * @param fromTimezone  таймзона пользователя (например, "Europe/Saratov")
     * @return время в UTC
     */
    public static LocalDateTime toUtc(LocalDateTime localDateTime, String fromTimezone) {
        try {
            ZoneId userZone = ZoneId.of(fromTimezone);
            ZonedDateTime userZoned = localDateTime.atZone(userZone);
            ZonedDateTime utcZoned = userZoned.withZoneSameInstant(ZoneId.of("UTC"));
            return utcZoned.toLocalDateTime();
        } catch (Exception e) {
            // Если таймзона невалидная — возвращаем как есть
            return localDateTime;
        }
    }
    
    /**
     * Конвертирует LocalDateTime из UTC в локальную таймзону пользователя.
     * Используется при ОТОБРАЖЕНИИ уроков.
     *
     * @param utcDateTime время в UTC
     * @param toTimezone  целевая таймзона (например, "Europe/Moscow")
     * @return время в локальной таймзоне
     */
    public static LocalDateTime fromUtc(LocalDateTime utcDateTime, String toTimezone) {
        try {
            ZonedDateTime utcZoned = utcDateTime.atZone(ZoneId.of("UTC"));
            ZonedDateTime localZoned = utcZoned.withZoneSameInstant(ZoneId.of(toTimezone));
            return localZoned.toLocalDateTime();
        } catch (Exception e) {
            return utcDateTime;
        }
    }
}
