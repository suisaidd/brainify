package com.example.brainify.Config;

import org.springframework.context.annotation.Configuration;
import org.springframework.retry.annotation.EnableRetry;

@Configuration
@EnableRetry
public class RetryConfig {
    // Конфигурация для Spring Retry
    // Позволяет использовать @Retryable аннотации
}
