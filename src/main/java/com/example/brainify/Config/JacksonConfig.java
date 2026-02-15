package com.example.brainify.Config;

import com.fasterxml.jackson.core.JsonGenerator;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.SerializerProvider;
import com.fasterxml.jackson.databind.ser.std.StdSerializer;
import com.fasterxml.jackson.datatype.hibernate6.Hibernate6Module;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import java.io.IOException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

@Configuration
public class JacksonConfig {

    /**
     * Кастомный сериализатор для LocalDateTime.
     * Все LocalDateTime в приложении хранятся в UTC (JVM timezone = UTC).
     * При сериализации добавляем суффикс "Z" для корректной обработки на фронтенде:
     * фронтенд автоматически конвертирует UTC в локальное время браузера.
     */
    public static class UtcLocalDateTimeSerializer extends StdSerializer<LocalDateTime> {
        private static final DateTimeFormatter FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

        public UtcLocalDateTimeSerializer() {
            super(LocalDateTime.class);
        }

        @Override
        public void serialize(LocalDateTime value, JsonGenerator gen, SerializerProvider provider) throws IOException {
            // Форматируем как ISO 8601 с суффиксом Z (UTC)
            gen.writeString(value.format(FORMATTER) + "Z");
        }
    }

    @Bean
    @Primary
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        
        // Добавляем модуль для работы с Hibernate
        Hibernate6Module hibernate6Module = new Hibernate6Module();
        hibernate6Module.disable(Hibernate6Module.Feature.USE_TRANSIENT_ANNOTATION);
        hibernate6Module.enable(Hibernate6Module.Feature.FORCE_LAZY_LOADING);
        hibernate6Module.enable(Hibernate6Module.Feature.SERIALIZE_IDENTIFIER_FOR_LAZY_NOT_LOADED_OBJECTS);
        
        // Добавляем модуль для работы с Java 8 Time API
        // с кастомным сериализатором для LocalDateTime (добавляет "Z" для UTC)
        JavaTimeModule javaTimeModule = new JavaTimeModule();
        javaTimeModule.addSerializer(LocalDateTime.class, new UtcLocalDateTimeSerializer());
        
        mapper.registerModule(hibernate6Module);
        mapper.registerModule(javaTimeModule);
        
        // Настройка для правильной сериализации BigDecimal
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        mapper.enable(SerializationFeature.WRITE_ENUMS_USING_TO_STRING);
        
        return mapper;
    }
} 