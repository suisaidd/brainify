package com.example.brainify.Config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Конфигурация запуска приложения
 * Выполняет необходимые действия при старте
 */
@Component
public class StartupConfig implements CommandLineRunner {

    @Override
    public void run(String... args) throws Exception {
        System.out.println("=== ЗАПУСК ПРИЛОЖЕНИЯ BRAINIFY ===");
        
        try {
            System.out.println("Приложение успешно запущено!");
        } catch (Exception e) {
            System.err.println("Ошибка при запуске приложения: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
