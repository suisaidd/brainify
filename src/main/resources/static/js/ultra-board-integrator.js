/**
 * 🔗 ULTRA BOARD INTEGRATOR
 * Интегратор для безболезненного перехода на Ultra Board систему
 * Создано самым гениальным разработчиком в мире
 * 
 * ОСОБЕННОСТИ:
 * 🔄 Seamless integration с существующей системой
 * 🎯 Обратная совместимость со старыми функциями
 * 🚀 Постепенный переход на Ultra режим
 * 💫 Автоматическое обнаружение возможностей
 * 🛡️ Fallback на старую систему при проблемах
 */

class UltraBoardIntegrator {
    constructor() {
        console.log('🔗 === ULTRA BOARD INTEGRATOR ИНИЦИАЛИЗАЦИЯ ===');
        
        this.isUltraMode = false;
        this.legacyMode = false;
        this.hybridMode = true; // По умолчанию гибридный режим
        
        // Экземпляры систем
        this.ultraSyncEngine = null;
        this.ultraRenderer = null;
        this.legacyBoard = null;
        
        // Настройки интеграции
        this.config = {
            enableUltraMode: true,
            fallbackOnError: true,
            compatibilityMode: true,
            performanceThreshold: 100, // ms для переключения режимов
            batchSize: 20,
            syncInterval: 16 // 60 FPS
        };
        
        // Метрики для принятия решений
        this.performanceMetrics = {
            averageRenderTime: 0,
            averageSyncTime: 0,
            errorCount: 0,
            operationsPerSecond: 0
        };
        
        this.init();
    }
    
    init() {
        console.log('🔧 Инициализация Ultra Board Integrator...');
        
        // Глобальная обработка ошибок для Ultra Board
        this.setupErrorHandling();
        
        try {
            // Проверяем поддержку Ultra режима
            this.checkUltraSupport();
            
            // Инициализируем систему в зависимости от возможностей
            if (this.config.enableUltraMode && this.isUltraModeSupported()) {
                this.initUltraMode();
            } else {
                this.initLegacyMode();
            }
            
            // Настраиваем мониторинг производительности
            this.setupPerformanceMonitoring();
            
            // Интегрируемся с существующими функциями
            this.setupLegacyIntegration();
            
            // Слушаем события создания доски
            this.setupBoardEventListeners();
            
            console.log(`✅ Ultra Board Integrator готов! Режим: ${this.getCurrentMode()}`);
            
        } catch (error) {
            console.error('❌ Критическая ошибка инициализации Ultra Board:', error);
            this.emergencyFallback();
        }
    }
    
    // Настройка слушателей событий доски
    setupBoardEventListeners() {
        // Слушаем событие создания экземпляра доски
        window.addEventListener('boardInstanceCreated', (event) => {
            console.log('🔔 Получено событие создания доски:', event.detail);
            
            if (this.isUltraMode && !this.ultraSyncEngine) {
                console.log('🚀 Пробуем повторно создать Ultra Sync Engine...');
                this.setupUltraSyncEngine();
            }
        });
        
        // Слушаем другие полезные события
        window.addEventListener('boardReady', (event) => {
            console.log('🔔 Доска готова к работе');
        });
    }
    
    setupErrorHandling() {
        const self = this;
        
        // Перехватываем JavaScript ошибки связанные с Ultra Board
        const originalError = window.onerror;
        window.onerror = function(message, source, lineno, colno, error) {
            if (message && (
                message.includes('ctx.scale') || 
                message.includes('UltraBoard') || 
                message.includes('ultra-board')
            )) {
                console.error('🚨 Ultra Board ошибка перехвачена:', message);
                self.emergencyFallback();
                return true; // Предотвращаем дальнейшее распространение
            }
            
            if (originalError) {
                return originalError.apply(this, arguments);
            }
            return false;
        };
    }
    
    emergencyFallback() {
        console.warn('🚨 АВАРИЙНЫЙ ПЕРЕХОД НА LEGACY РЕЖИМ');
        
        // Отключаем все Ultra компоненты
        this.isUltraMode = false;
        this.config.enableUltraMode = false;
        
        if (this.ultraSyncEngine) {
            try { this.ultraSyncEngine.disconnect(); } catch (e) {}
            this.ultraSyncEngine = null;
        }
        
        if (this.ultraRenderer) {
            try { this.ultraRenderer.destroy(); } catch (e) {}
            this.ultraRenderer = null;
        }
        
        // Принудительно переходим на Legacy
        this.initLegacyMode();
        
        console.log('✅ Аварийный переход завершен, система работает в Legacy режиме');
    }
    
    /**
     * 🔍 ПРОВЕРКА ПОДДЕРЖКИ ULTRA РЕЖИМА
     */
    checkUltraSupport() {
        // Проверяем необходимые API
        const hasWebGL = this.checkWebGLSupport();
        const hasWorkers = typeof Worker !== 'undefined';
        const hasArrayBuffer = typeof ArrayBuffer !== 'undefined';
        const hasRequestAnimationFrame = typeof requestAnimationFrame !== 'undefined';
        
        // Проверяем производительность устройства
        const performanceScore = this.estimateDevicePerformance();
        
        const isSupported = hasWebGL && hasWorkers && hasArrayBuffer && 
                           hasRequestAnimationFrame && performanceScore > 50;
        
        console.log('🔍 Ultra Mode Support Check:', {
            webGL: hasWebGL,
            workers: hasWorkers,
            arrayBuffer: hasArrayBuffer,
            animationFrame: hasRequestAnimationFrame,
            performanceScore: performanceScore,
            supported: isSupported
        });
        
        return isSupported;
    }
    
    checkWebGLSupport() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return !!gl;
        } catch (e) {
            return false;
        }
    }
    
    estimateDevicePerformance() {
        // Простая оценка производительности устройства
        let score = 50; // базовый балл
        
        // Проверяем количество ядер
        if (navigator.hardwareConcurrency) {
            score += Math.min(navigator.hardwareConcurrency * 10, 40);
        }
        
        // Проверяем память
        if (navigator.deviceMemory) {
            score += Math.min(navigator.deviceMemory * 5, 20);
        }
        
        // Проверяем платформу
        if (/Mobile|Android|iPhone|iPad/.test(navigator.userAgent)) {
            score -= 20; // мобильные устройства менее производительны
        }
        
        return Math.max(0, Math.min(100, score));
    }
    
    isUltraModeSupported() {
        return this.checkUltraSupport();
    }
    
    /**
     * 🚀 ИНИЦИАЛИЗАЦИЯ ULTRA РЕЖИМА
     */
    initUltraMode() {
        console.log('🚀 Инициализация Ultra режима...');
        
        try {
            // Ищем canvas элемент
            const canvas = this.findCanvasElement();
            if (!canvas) {
                throw new Error('Canvas элемент не найден');
            }
            
            // Проверяем, что canvas имеет размеры
            if (canvas.width === 0 || canvas.height === 0) {
                console.log('⚠️ Canvas не имеет размеров, устанавливаем минимальные');
                canvas.width = 800;
                canvas.height = 600;
                canvas.style.width = '800px';
                canvas.style.height = '600px';
            }
            
            console.log('📐 Canvas размеры:', canvas.width, 'x', canvas.height);
            
            // Создаем Ultra компоненты
            this.ultraRenderer = new UltraBoardRenderer(canvas, {
                preferWebGL: true,
                antialiasing: true,
                dirtyRegionsEnabled: true,
                viewportCulling: true
            });
            
            // Создаем Sync Engine после загрузки board instance
            this.setupUltraSyncEngine();
            
            this.isUltraMode = true;
            this.legacyMode = false;
            
            console.log('✅ Ultra режим инициализирован успешно');
            
        } catch (error) {
            console.error('❌ Ошибка инициализации Ultra режима:', error);
            this.fallbackToLegacy();
        }
    }
    
    setupUltraSyncEngine() {
        // Ждем инициализации доски с более умной логикой
        let attempts = 0;
        const maxAttempts = 100; // 10 секунд максимум
        
        const checkBoard = () => {
            attempts++;
            const board = this.getBoardInstance();
            
            if (board) {
                console.log(`✅ Доска найдена на попытке ${attempts}, создаем Ultra Sync Engine`);
                
                this.ultraSyncEngine = new UltraBoardSyncEngine(board, {
                    batchInterval: this.config.syncInterval,
                    maxBatchSize: this.config.batchSize,
                    enablePredictiveRendering: true,
                    enableDirtyRegions: true
                });
                
                // Интегрируем renderer с sync engine
                if (this.ultraRenderer) {
                    this.ultraRenderer.setBoard(board);
                }
                
                console.log('✅ Ultra Sync Engine готов');
                
                // Уведомляем о готовности системы
                this.onUltraBoardReady();
                
            } else if (attempts < maxAttempts) {
                // Логируем только каждые 10 попыток чтобы не спамить
                if (attempts % 10 === 0) {
                    console.log(`⏳ Ожидаем создания доски... попытка ${attempts}/${maxAttempts}`);
                }
                // Повторяем попытку через 100ms
                setTimeout(checkBoard, 100);
            } else {
                console.warn('⚠️ Доска не найдена после максимального ожидания, переходим на Legacy режим');
                this.fallbackToLegacy();
            }
        };
        
        checkBoard();
    }
    
    // Callback когда Ultra Board готов
    onUltraBoardReady() {
        console.log('🎉 Ultra Board система полностью готова!');
        
        // Можно добавить дополнительную логику при готовности
        if (window.onUltraBoardReady) {
            window.onUltraBoardReady();
        }
        
        // Событие для других систем
        window.dispatchEvent(new CustomEvent('ultraBoardReady', {
            detail: {
                syncEngine: this.ultraSyncEngine,
                renderer: this.ultraRenderer,
                mode: this.getCurrentMode()
            }
        }));
    }
    
    /**
     * 🔄 ИНИЦИАЛИЗАЦИЯ LEGACY РЕЖИМА
     */
    initLegacyMode() {
        console.log('🔄 Инициализация Legacy режима...');
        
        this.legacyMode = true;
        this.isUltraMode = false;
        
        // Сохраняем ссылку на существующую систему
        this.legacyBoard = {
            canvas: this.findCanvasElement(),
            sendDrawData: window.sendDrawData,
            connectWebSocket: window.connectWebSocket,
            render: this.findLegacyRenderFunction()
        };
        
        console.log('✅ Legacy режим активирован');
    }
    
    /**
     * ⚡ FALLBACK НА LEGACY СИСТЕМУ
     */
    fallbackToLegacy() {
        console.warn('⚡ Fallback на Legacy систему...');
        
        // Отключаем Ultra компоненты
        if (this.ultraSyncEngine) {
            this.ultraSyncEngine.disconnect();
            this.ultraSyncEngine = null;
        }
        
        if (this.ultraRenderer) {
            this.ultraRenderer.destroy();
            this.ultraRenderer = null;
        }
        
        // Переключаемся на Legacy
        this.initLegacyMode();
        
        // Увеличиваем счетчик ошибок
        this.performanceMetrics.errorCount++;
    }
    
    /**
     * 🔗 ИНТЕГРАЦИЯ С СУЩЕСТВУЮЩИМИ ФУНКЦИЯМИ
     */
    setupLegacyIntegration() {
        // Перехватываем существующие функции и перенаправляем их
        this.wrapLegacyFunctions();
        
        // Создаем универсальный API
        this.createUnifiedAPI();
    }
    
    wrapLegacyFunctions() {
        const self = this;
        
        // Обертка для sendDrawData
        if (window.sendDrawData) {
            const originalSendDrawData = window.sendDrawData;
            window.sendDrawData = function(type, x, y) {
                if (self.isUltraMode && self.ultraSyncEngine) {
                    // Используем Ultra систему
                    self.ultraSyncEngine.addDrawOperation(x, y, type, {
                        color: window.currentColor || '#000000',
                        brushSize: window.currentBrushSize || 3,
                        userId: self.getCurrentUserId(),
                        userName: self.getCurrentUserName()
                    });
                } else {
                    // Используем Legacy систему
                    originalSendDrawData.call(this, type, x, y);
                }
            };
        }
        
        // Обертка для рендеринга
        this.wrapRenderFunctions();
        
        // Обертка для WebSocket функций
        this.wrapWebSocketFunctions();
    }
    
    wrapRenderFunctions() {
        const self = this;
        
        // Ищем и оборачиваем функции рендеринга
        const renderFunctions = ['render', 'redraw', 'updateCanvas'];
        
        renderFunctions.forEach(funcName => {
            if (window[funcName] && typeof window[funcName] === 'function') {
                const originalFunc = window[funcName];
                window[funcName] = function(...args) {
                    if (self.isUltraMode && self.ultraRenderer) {
                        self.ultraRenderer.scheduleRender();
                    } else {
                        originalFunc.apply(this, args);
                    }
                };
            }
        });
    }
    
    wrapWebSocketFunctions() {
        const self = this;
        
        // Интеграция с WebSocket соединением
        if (window.stompClient && this.ultraSyncEngine) {
            // Подписываемся на Ultra sync сообщения
            const originalSubscribe = window.stompClient.subscribe;
            
            // Добавляем обработчик для Ultra сообщений
            this.ultraSyncEngine.connect();
        }
    }
    
    /**
     * 🎯 СОЗДАНИЕ УНИФИЦИРОВАННОГО API
     */
    createUnifiedAPI() {
        // Создаем единый API для работы с доской
        window.UltraBoard = {
            // Основные операции
            addDrawOperation: (x, y, type, options) => this.addDrawOperation(x, y, type, options),
            clearBoard: () => this.clearBoard(),
            scheduleRender: () => this.scheduleRender(),
            
            // Управление режимами
            switchToUltraMode: () => this.switchToUltraMode(),
            switchToLegacyMode: () => this.switchToLegacyMode(),
            getCurrentMode: () => this.getCurrentMode(),
            
            // Метрики и диагностика
            getMetrics: () => this.getMetrics(),
            getPerformanceReport: () => this.getPerformanceReport(),
            
            // Настройки
            setConfig: (config) => this.setConfig(config),
            getConfig: () => this.config
        };
        
        console.log('🎯 Унифицированный API создан: window.UltraBoard');
    }
    
    /**
     * 🎨 УНИФИЦИРОВАННЫЕ МЕТОДЫ
     */
    addDrawOperation(x, y, type, options = {}) {
        const startTime = performance.now();
        
        try {
            if (this.isUltraMode && this.ultraSyncEngine) {
                this.ultraSyncEngine.addDrawOperation(x, y, type, options);
            } else if (window.sendDrawData) {
                window.sendDrawData(type, x, y);
            }
            
            // Обновляем метрики
            this.updatePerformanceMetrics('operation', performance.now() - startTime);
            
        } catch (error) {
            console.error('Ошибка добавления операции:', error);
            this.handleError(error);
        }
    }
    
    clearBoard() {
        try {
            if (this.isUltraMode && this.ultraSyncEngine) {
                this.ultraSyncEngine.clearBoard();
            } else if (window.clearBoard) {
                window.clearBoard();
            }
        } catch (error) {
            console.error('Ошибка очистки доски:', error);
            this.handleError(error);
        }
    }
    
    scheduleRender() {
        const startTime = performance.now();
        
        try {
            if (this.isUltraMode && this.ultraRenderer) {
                this.ultraRenderer.scheduleRender();
            } else if (window.render) {
                window.render();
            }
            
            // Обновляем метрики рендеринга
            this.updatePerformanceMetrics('render', performance.now() - startTime);
            
        } catch (error) {
            console.error('Ошибка рендеринга:', error);
            this.handleError(error);
        }
    }
    
    /**
     * 🔄 ПЕРЕКЛЮЧЕНИЕ РЕЖИМОВ
     */
    switchToUltraMode() {
        if (this.isUltraModeSupported() && !this.isUltraMode) {
            console.log('🔄 Переключение на Ultra режим...');
            this.initUltraMode();
            return true;
        }
        return false;
    }
    
    switchToLegacyMode() {
        if (this.isUltraMode) {
            console.log('🔄 Переключение на Legacy режим...');
            this.fallbackToLegacy();
            return true;
        }
        return false;
    }
    
    getCurrentMode() {
        if (this.isUltraMode) return 'ultra';
        if (this.legacyMode) return 'legacy';
        return 'hybrid';
    }
    
    /**
     * 📊 МОНИТОРИНГ ПРОИЗВОДИТЕЛЬНОСТИ
     */
    setupPerformanceMonitoring() {
        // Мониторим производительность каждые 5 секунд
        setInterval(() => {
            this.analyzePerformance();
        }, 5000);
    }
    
    updatePerformanceMetrics(type, duration) {
        if (type === 'render') {
            this.performanceMetrics.averageRenderTime = 
                (this.performanceMetrics.averageRenderTime * 0.9) + (duration * 0.1);
        } else if (type === 'operation') {
            this.performanceMetrics.averageSyncTime = 
                (this.performanceMetrics.averageSyncTime * 0.9) + (duration * 0.1);
        }
    }
    
    analyzePerformance() {
        const metrics = this.getMetrics();
        
        // Автоматическое переключение режимов на основе производительности
        if (this.config.fallbackOnError) {
            if (metrics.averageRenderTime > this.config.performanceThreshold && this.isUltraMode) {
                console.warn('⚠️ Производительность Ultra режима низкая, переключаемся на Legacy');
                this.fallbackToLegacy();
            }
        }
        
        // Логируем метрики
        if (metrics.errorCount > 0) {
            console.log('📊 Performance Metrics:', metrics);
        }
    }
    
    /**
     * 🔧 УТИЛИТЫ
     */
    findCanvasElement() {
        // Ищем canvas элемент различными способами
        let canvas = document.getElementById('boardCanvas');
        if (!canvas) canvas = document.getElementById('canvas');
        if (!canvas) canvas = document.querySelector('canvas');
        if (!canvas) canvas = document.querySelector('.board-canvas');
        
        return canvas;
    }
    
    getBoardInstance() {
        // Ищем экземпляр доски во всех возможных местах
        
        // 1. Проверяем window.professionalBoardInstance
        if (window.professionalBoardInstance && this.isValidBoardInstance(window.professionalBoardInstance)) {
            return window.professionalBoardInstance;
        }
        
        // 2. Проверяем window.board через Proxy
        if (window.board && this.isValidBoardInstance(window.board)) {
            return window.board;
        }
        
        // 3. Проверяем window.getBoard()
        if (window.getBoard && typeof window.getBoard === 'function') {
            const board = window.getBoard();
            if (board && this.isValidBoardInstance(board)) {
                return board;
            }
        }
        
        // 4. Проверяем _realBoardInstance из professional-board.js
        if (window._realBoardInstance && this.isValidBoardInstance(window._realBoardInstance)) {
            return window._realBoardInstance;
        }
        
        // 5. Проверяем глобальные переменные, которые могут содержать экземпляр доски
        const possibleNames = [
            'boardInstance', 
            'professionalBoard', 
            'mainBoard',
            'canvasBoard'
        ];
        
        for (const name of possibleNames) {
            if (window[name] && this.isValidBoardInstance(window[name])) {
                return window[name];
            }
        }
        
        return null;
    }
    
    // Проверка что это валидный экземпляр доски
    isValidBoardInstance(instance) {
        if (!instance || typeof instance !== 'object') {
            return false;
        }
        
        // Проверяем наличие основных методов/свойств доски
        const requiredProperties = ['canvas', 'ctx'];
        const requiredMethods = ['render', 'addObject'];
        
        // Проверяем обязательные свойства
        for (const prop of requiredProperties) {
            if (!(prop in instance)) {
                return false;
            }
        }
        
        // Проверяем обязательные методы
        for (const method of requiredMethods) {
            if (!(method in instance) || typeof instance[method] !== 'function') {
                return false;
            }
        }
        
        return true;
    }
    
    findLegacyRenderFunction() {
        if (window.render) return window.render;
        if (window.redraw) return window.redraw;
        if (window.updateCanvas) return window.updateCanvas;
        
        return () => console.warn('Legacy render function not found');
    }
    
    getCurrentUserId() {
        if (window.currentUser) return window.currentUser.id;
        if (window.userId) return window.userId;
        return 1;
    }
    
    getCurrentUserName() {
        if (window.currentUser) return window.currentUser.name;
        if (window.userName) return window.userName;
        return 'Unknown User';
    }
    
    handleError(error) {
        this.performanceMetrics.errorCount++;
        
        if (this.config.fallbackOnError && this.isUltraMode) {
            if (this.performanceMetrics.errorCount > 5) {
                console.warn('⚠️ Слишком много ошибок, переключаемся на Legacy режим');
                this.fallbackToLegacy();
            }
        }
    }
    
    /**
     * 📋 ПУБЛИЧНЫЕ МЕТОДЫ
     */
    getMetrics() {
        const base = { ...this.performanceMetrics };
        
        if (this.isUltraMode) {
            if (this.ultraSyncEngine) {
                Object.assign(base, this.ultraSyncEngine.getMetrics());
            }
            if (this.ultraRenderer) {
                Object.assign(base, this.ultraRenderer.getMetrics());
            }
        }
        
        return base;
    }
    
    getPerformanceReport() {
        return {
            mode: this.getCurrentMode(),
            isUltraSupported: this.isUltraModeSupported(),
            devicePerformance: this.estimateDevicePerformance(),
            metrics: this.getMetrics(),
            config: this.config
        };
    }
    
    setConfig(newConfig) {
        Object.assign(this.config, newConfig);
        
        // Применяем изменения к активным компонентам
        if (this.ultraSyncEngine) {
            this.ultraSyncEngine.setOptions(newConfig);
        }
        
        console.log('⚙️ Конфигурация обновлена:', newConfig);
    }
}

// Автоматическая инициализация
let ultraBoardIntegrator = null;

function initUltraBoardIntegrator() {
    if (!ultraBoardIntegrator) {
        ultraBoardIntegrator = new UltraBoardIntegrator();
        window.UltraBoardIntegrator = ultraBoardIntegrator;
    }
    return ultraBoardIntegrator;
}

// Инициализируем после загрузки DOM и когда canvas готов
function safeInitUltraBoardIntegrator() {
    // Проверяем готовность DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', safeInitUltraBoardIntegrator);
        return;
    }
    
    // Ждем появления canvas элемента
    function waitForCanvas(attempts = 0) {
        const canvas = document.getElementById('boardCanvas') || 
                     document.getElementById('canvas') || 
                     document.querySelector('canvas');
                     
        if (canvas && canvas.parentElement) {
            console.log('✅ Canvas найден, инициализируем Ultra Board');
            initUltraBoardIntegrator();
        } else if (attempts < 50) { // Максимум 5 секунд ожидания
            console.log(`⏳ Ожидаем canvas... попытка ${attempts + 1}/50`);
            setTimeout(() => waitForCanvas(attempts + 1), 100);
        } else {
            console.warn('⚠️ Canvas не найден после 5 секунд ожидания');
            // Все равно пытаемся инициализировать (может быть создан динамически)
            initUltraBoardIntegrator();
        }
    }
    
    waitForCanvas();
}

safeInitUltraBoardIntegrator();

console.log('🔗 ULTRA BOARD INTEGRATOR загружен и готов к работе!');
