package com.example.brainify.Config;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Конфигурация кэширования
 * Обеспечивает эффективное кэширование часто используемых данных
 */
@Configuration
@EnableCaching
public class CacheConfig {
    
    /**
     * Менеджер кэша
     */
    @Bean
    public CacheManager cacheManager() {
        ConcurrentMapCacheManager cacheManager = new ConcurrentMapCacheManager();
        
        // Настраиваем кэши для различных типов данных
        cacheManager.setCacheNames(java.util.Arrays.asList(
            "lessons",               // Кэш уроков
            "users",                 // Кэш пользователей
            "subjects"               // Кэш предметов
        ));
        
        // Включаем динамическое создание кэшей
        cacheManager.setAllowNullValues(false);
        
        return cacheManager;
    }
}
