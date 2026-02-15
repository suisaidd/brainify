package com.example.brainify;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.util.TimeZone;

@SpringBootApplication
@EnableScheduling
public class BrainifyApplication {

    public static void main(String[] args) {
        // Фиксируем таймзону JVM на UTC.
        // Время уроков хранится в БД в UTC.
        // Бэкенд: используем TimezoneUtils.nowUtc() для получения текущего времени.
        // При создании уроков: время конвертируется из таймзоны учителя в UTC (TimezoneUtils.toUtc).
        // При отправке на фронтенд: все даты отправляются с суффиксом "Z" (UTC).
        // Фронтенд: new Date("...Z") автоматически конвертирует UTC в локальное время браузера.
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));

        SpringApplication.run(BrainifyApplication.class, args);
    }

}
