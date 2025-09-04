package com.example.brainify.Service;

import com.example.brainify.Model.BoardOperation;
import com.example.brainify.Repository.BoardOperationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.scheduling.annotation.Scheduled;


import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * 🚀 ULTRA BOARD SERVICE
 * Сверхбыстрый сервис для работы с операциями доски
 * Создано самым гениальным разработчиком в мире
 * 
 * ОСОБЕННОСТИ:
 * ⚡ Кеширование операций для мгновенного доступа
 * 🎯 Оптимизированные запросы к БД
 * 🔥 Батчинг операций для массовых операций
 * 💫 Дифференциальные обновления
 * 🛡️ Интеллектуальная дедупликация
 */

@Service
public class UltraBoardService {

    @Autowired
    private BoardOperationRepository boardOperationRepository;
    
    // Кеши для оптимизации
    private final Map<String, List<Map<String, Object>>> operationCache = new ConcurrentHashMap<>();
    private final Map<String, Long> lessonSequenceCache = new ConcurrentHashMap<>();
    private final Map<String, Long> cacheTimestamps = new ConcurrentHashMap<>();
    
    // Конфигурация кеширования
    private static final long CACHE_TTL_MS = 60000; // 1 минута
    private static final int MAX_CACHE_SIZE = 1000; // Максимум операций в кеше
    private static final int BATCH_SIZE = 100; // Размер батча для БД операций

    /**
     * 🔍 ПОЛУЧЕНИЕ ОПЕРАЦИЙ ПОСЛЕ ОПРЕДЕЛЕННОГО SEQUENCE NUMBER
     * Используется для дифференциальной синхронизации
     */
    public List<Map<String, Object>> getOperationsAfterSequence(Long lessonId, Long afterSequence) {
        System.out.println("🔍 Getting operations after sequence " + afterSequence + " for lesson " + lessonId);
        
        if (afterSequence == null) {
            afterSequence = 0L;
        }
        
        String cacheKey = lessonId + "_after_" + afterSequence;
        
        // Проверяем кеш
        List<Map<String, Object>> cachedOps = getCachedOperations(cacheKey);
        if (cachedOps != null) {
            System.out.println("✅ Returning " + cachedOps.size() + " operations from cache");
            return cachedOps;
        }
        
        // Загружаем из БД
        List<BoardOperation> operations = boardOperationRepository
            .findByLessonIdAndSequenceNumberGreaterThanOrderBySequenceNumberAsc(lessonId, afterSequence);
        
        System.out.println("📊 Loaded " + operations.size() + " operations from database");
        
        // Конвертируем в Map для передачи клиенту
        List<Map<String, Object>> result = operations.stream()
            .map(this::convertOperationToMap)
            .collect(Collectors.toList());
        
        // Кешируем результат
        cacheOperations(cacheKey, result);
        
        return result;
    }
    
    /**
     * 🎯 ПОЛУЧЕНИЕ ПОСЛЕДНИХ ОПЕРАЦИЙ с ограничением
     */
    public List<Map<String, Object>> getRecentOperations(Long lessonId, int limit) {
        System.out.println("🎯 Getting " + limit + " recent operations for lesson " + lessonId);
        
        String cacheKey = lessonId + "_recent_" + limit;
        
        // Проверяем кеш
        List<Map<String, Object>> cachedOps = getCachedOperations(cacheKey);
        if (cachedOps != null) {
            return cachedOps;
        }
        
        // Создаем Pageable для ограничения результатов
        Pageable pageable = PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "sequenceNumber"));
        
        List<BoardOperation> operations = boardOperationRepository
            .findByLessonIdOrderBySequenceNumberDesc(lessonId, pageable);
        
        // Возвращаем в правильном порядке (по возрастанию sequence number)
        Collections.reverse(operations);
        
        List<Map<String, Object>> result = operations.stream()
            .map(this::convertOperationToMap)
            .collect(Collectors.toList());
        
        cacheOperations(cacheKey, result);
        
        return result;
    }
    
    /**
     * 📈 ПОЛУЧЕНИЕ СТАТИСТИКИ ОПЕРАЦИЙ
     */
    public Map<String, Object> getOperationStats(Long lessonId) {
        System.out.println("📈 Getting operation stats for lesson " + lessonId);
        
        Map<String, Object> stats = new HashMap<>();
        
        // Общее количество операций
        Long totalCount = boardOperationRepository.countByLessonId(lessonId);
        stats.put("totalOperations", totalCount);
        
        // Последний sequence number
        Long lastSequence = getLastSequenceNumber(lessonId);
        stats.put("lastSequenceNumber", lastSequence);
        
        // Количество операций по типам
        List<Object[]> operationTypes = boardOperationRepository.countOperationsByType(lessonId);
        Map<String, Long> typeStats = new HashMap<>();
        for (Object[] row : operationTypes) {
            typeStats.put((String) row[0], (Long) row[1]);
        }
        stats.put("operationsByType", typeStats);
        
        // Количество уникальных пользователей
        Long uniqueUsers = boardOperationRepository.countUniqueUsersByLessonId(lessonId);
        stats.put("uniqueUsers", uniqueUsers);
        
        // Временной диапазон
        List<Object[]> timeRange = boardOperationRepository.getTimeRangeForLesson(lessonId);
        if (!timeRange.isEmpty() && timeRange.get(0)[0] != null) {
            stats.put("firstOperationTime", timeRange.get(0)[0]);
            stats.put("lastOperationTime", timeRange.get(0)[1]);
        }
        
        System.out.println("📊 Stats: " + totalCount + " total operations, " + uniqueUsers + " users");
        
        return stats;
    }
    
    /**
     * 🔄 ПОЛУЧЕНИЕ ОПЕРАЦИЙ ДЛЯ ПОЛНОЙ СИНХРОНИЗАЦИИ
     */
    @Cacheable(value = "fullOperations", key = "#lessonId")
    public List<Map<String, Object>> getAllOperations(Long lessonId) {
        System.out.println("🔄 Getting ALL operations for lesson " + lessonId);
        
        // Используем стриминг для больших наборов данных
        List<Map<String, Object>> result = new ArrayList<>();
        
        // Обрабатываем операции батчами
        long totalCount = boardOperationRepository.countByLessonId(lessonId);
        int totalPages = (int) Math.ceil((double) totalCount / BATCH_SIZE);
        
        System.out.println("📊 Processing " + totalCount + " operations in " + totalPages + " batches");
        
        for (int page = 0; page < totalPages; page++) {
            Pageable pageable = PageRequest.of(page, BATCH_SIZE, 
                Sort.by(Sort.Direction.ASC, "sequenceNumber"));
            
            List<BoardOperation> batch = boardOperationRepository
                .findByLessonId(lessonId, pageable);
            
            List<Map<String, Object>> batchMaps = batch.stream()
                .map(this::convertOperationToMap)
                .collect(Collectors.toList());
            
            result.addAll(batchMaps);
            
            // Логируем прогресс для больших наборов
            if (totalPages > 10 && page % (totalPages / 10) == 0) {
                int progress = (int) ((double) page / totalPages * 100);
                System.out.println("📈 Progress: " + progress + "% (" + result.size() + "/" + totalCount + ")");
            }
        }
        
        System.out.println("✅ Loaded " + result.size() + " operations total");
        
        return result;
    }
    
    /**
     * 🗑️ ОЧИСТКА ОПЕРАЦИЙ УРОКА (с оптимизацией)
     */
    @Transactional
    public void clearLessonOperations(Long lessonId) {
        System.out.println("🗑️ Clearing operations for lesson " + lessonId);
        
        // Считаем количество для логирования
        Long count = boardOperationRepository.countByLessonId(lessonId);
        
        // Удаляем батчами для больших наборов данных
        if (count > 1000) {
            System.out.println("🔄 Deleting " + count + " operations in batches...");
            
            while (boardOperationRepository.countByLessonId(lessonId) > 0) {
                boardOperationRepository.deleteTopNByLessonId(lessonId, BATCH_SIZE);
                System.out.println("🗑️ Deleted batch, remaining: " + 
                    boardOperationRepository.countByLessonId(lessonId));
            }
        } else {
            // Простое удаление для небольших наборов
            boardOperationRepository.deleteByLessonId(lessonId);
        }
        
        // Очищаем кеш
        clearCacheForLesson(lessonId);
        
        System.out.println("✅ Cleared " + count + " operations");
    }
    
    /**
     * 🚀 МАССОВОЕ СОХРАНЕНИЕ ОПЕРАЦИЙ (для батчинга)
     */
    @Transactional
    public List<BoardOperation> saveOperationsBatch(List<BoardOperation> operations) {
        System.out.println("🚀 Saving batch of " + operations.size() + " operations");
        
        long startTime = System.currentTimeMillis();
        
        // Сохраняем все операции одним запросом
        List<BoardOperation> saved = boardOperationRepository.saveAll(operations);
        
        long saveTime = System.currentTimeMillis() - startTime;
        System.out.println("✅ Batch saved in " + saveTime + "ms");
        
        // Инвалидируем кеш для затронутых уроков
        Set<Long> affectedLessons = operations.stream()
            .map(op -> {
                if (op.getLesson() != null) {
                    return op.getLesson().getId();
                } else {
                    // Fallback: try to get lessonId from other sources
                    return null;
                }
            })
            .filter(Objects::nonNull)
            .collect(Collectors.toSet());
        
        affectedLessons.forEach(this::clearCacheForLesson);
        
        return saved;
    }
    
    /**
     * 🔍 ПОИСК ОПЕРАЦИЙ ПО КРИТЕРИЯМ
     */
    public List<Map<String, Object>> findOperations(Long lessonId, OperationSearchCriteria criteria) {
        System.out.println("🔍 Searching operations with criteria for lesson " + lessonId);
        
        List<BoardOperation> operations;
        
        if (criteria.hasUserFilter()) {
            operations = boardOperationRepository
                .findByLessonIdAndUserIdOrderBySequenceNumberAsc(lessonId, criteria.getUserId());
        } else if (criteria.hasTimeFilter()) {
            operations = boardOperationRepository
                .findByLessonIdAndTimestampBetweenOrderBySequenceNumberAsc(
                    lessonId, criteria.getStartTime(), criteria.getEndTime());
        } else if (criteria.hasTypeFilter()) {
            operations = boardOperationRepository
                .findByLessonIdAndOperationTypeOrderBySequenceNumberAsc(lessonId, criteria.getOperationType());
        } else {
            // Fallback to all operations
            operations = boardOperationRepository
                .findByLessonIdOrderBySequenceNumberAsc(lessonId);
        }
        
        List<Map<String, Object>> result = operations.stream()
            .map(this::convertOperationToMap)
            .collect(Collectors.toList());
        
        System.out.println("🔍 Found " + result.size() + " operations matching criteria");
        
        return result;
    }
    
    /**
     * 🎯 ПОЛУЧЕНИЕ ПОСЛЕДНЕГО SEQUENCE NUMBER
     */
    public Long getLastSequenceNumber(Long lessonId) {
        String cacheKey = lessonId.toString();
        
        // Проверяем кеш
        Long cached = lessonSequenceCache.get(cacheKey);
        if (cached != null && isCacheValid(cacheKey)) {
            return cached;
        }
        
        // Загружаем из БД
        Long lastSequence = boardOperationRepository.getLastSequenceNumber(lessonId);
        if (lastSequence == null) {
            lastSequence = 0L;
        }
        
        // Кешируем
        lessonSequenceCache.put(cacheKey, lastSequence);
        cacheTimestamps.put(cacheKey, System.currentTimeMillis());
        
        return lastSequence;
    }
    
    /**
     * 💾 КЕШИРОВАНИЕ ОПЕРАЦИЙ
     */
    private void cacheOperations(String cacheKey, List<Map<String, Object>> operations) {
        // Ограничиваем размер кеша
        if (operations.size() <= MAX_CACHE_SIZE) {
            operationCache.put(cacheKey, new ArrayList<>(operations));
            cacheTimestamps.put(cacheKey, System.currentTimeMillis());
        }
    }
    
    private List<Map<String, Object>> getCachedOperations(String cacheKey) {
        if (!isCacheValid(cacheKey)) {
            operationCache.remove(cacheKey);
            cacheTimestamps.remove(cacheKey);
            return null;
        }
        
        return operationCache.get(cacheKey);
    }
    
    private boolean isCacheValid(String cacheKey) {
        Long timestamp = cacheTimestamps.get(cacheKey);
        return timestamp != null && (System.currentTimeMillis() - timestamp) < CACHE_TTL_MS;
    }
    
    private void clearCacheForLesson(Long lessonId) {
        String lessonKey = lessonId.toString();
        
        // Удаляем все ключи, связанные с уроком
        operationCache.entrySet().removeIf(entry -> entry.getKey().startsWith(lessonKey));
        cacheTimestamps.entrySet().removeIf(entry -> entry.getKey().startsWith(lessonKey));
        lessonSequenceCache.remove(lessonKey);
        
        System.out.println("🗑️ Cache cleared for lesson " + lessonId);
    }
    
    /**
     * 🔄 КОНВЕРТАЦИЯ ОПЕРАЦИИ В MAP
     */
    private Map<String, Object> convertOperationToMap(BoardOperation operation) {
        Map<String, Object> map = new HashMap<>();
        
        map.put("id", operation.getId());
        map.put("type", "draw");
        map.put("subType", operation.getOperationType());
        map.put("x", operation.getX());
        map.put("y", operation.getY());
        map.put("color", operation.getColor());
        map.put("brushSize", operation.getBrushSize());
        map.put("userId", operation.getUserId());
        map.put("userName", operation.getUserName());
        map.put("timestamp", operation.getTimestamp());
        map.put("sequenceNumber", operation.getSequenceNumber());
        
        return map;
    }
    
    /**
     * 🧹 ОЧИСТКА СТАРЫХ КЕШЕЙ (периодическая задача)
     * Выполняется каждые 5 минут
     */
    @Scheduled(fixedRate = 300000) // 5 минут
    public void cleanupExpiredCaches() {
        long currentTime = System.currentTimeMillis();
        
        Set<String> expiredKeys = new HashSet<>();
        
        // Находим устаревшие записи
        cacheTimestamps.entrySet().forEach(entry -> {
            if (currentTime - entry.getValue() > CACHE_TTL_MS) {
                expiredKeys.add(entry.getKey());
            }
        });
        
        // Удаляем устаревшие записи
        expiredKeys.forEach(key -> {
            operationCache.remove(key);
            lessonSequenceCache.remove(key);
            cacheTimestamps.remove(key);
        });
        
        if (!expiredKeys.isEmpty()) {
            System.out.println("🧹 Cleaned up " + expiredKeys.size() + " expired cache entries");
        }
    }
    
    /**
     * 📊 МЕТРИКИ КЕША
     */
    public Map<String, Object> getCacheMetrics() {
        Map<String, Object> metrics = new HashMap<>();
        
        metrics.put("operationCacheSize", operationCache.size());
        metrics.put("sequenceCacheSize", lessonSequenceCache.size());
        metrics.put("timestampCacheSize", cacheTimestamps.size());
        
        // Вычисляем hit rate (приблизительно)
        long validEntries = cacheTimestamps.values().stream()
            .mapToLong(timestamp -> System.currentTimeMillis() - timestamp < CACHE_TTL_MS ? 1 : 0)
            .sum();
        
        metrics.put("validCacheEntries", validEntries);
        metrics.put("cacheHitRate", cacheTimestamps.size() > 0 ? 
            (double) validEntries / cacheTimestamps.size() : 0.0);
        
        return metrics;
    }
    
    /**
     * 📋 КРИТЕРИИ ПОИСКА ОПЕРАЦИЙ
     */
    public static class OperationSearchCriteria {
        private Long userId;
        private String operationType;
        private java.time.LocalDateTime startTime;
        private java.time.LocalDateTime endTime;
        
        // Геттеры и сеттеры
        public Long getUserId() { return userId; }
        public void setUserId(Long userId) { this.userId = userId; }
        
        public String getOperationType() { return operationType; }
        public void setOperationType(String operationType) { this.operationType = operationType; }
        
        public java.time.LocalDateTime getStartTime() { return startTime; }
        public void setStartTime(java.time.LocalDateTime startTime) { this.startTime = startTime; }
        
        public java.time.LocalDateTime getEndTime() { return endTime; }
        public void setEndTime(java.time.LocalDateTime endTime) { this.endTime = endTime; }
        
        // Вспомогательные методы
        public boolean hasUserFilter() { return userId != null; }
        public boolean hasTypeFilter() { return operationType != null && !operationType.isEmpty(); }
        public boolean hasTimeFilter() { return startTime != null && endTime != null; }
    }
}
