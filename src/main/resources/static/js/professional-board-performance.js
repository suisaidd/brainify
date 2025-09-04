// Professional Board Performance Manager - Упрощенная версия

class PerformanceManager {
    constructor(board) {
        this.board = board;
        this.isEnabled = true;
        
        // Простые метрики
        this.metrics = {
            fps: 60,
            frameTime: 16.67,
            renderTime: 0,
            objectCount: 0
        };
        
        console.log('📊 PerformanceManager (простая версия) инициализирован');
    }
    
    // Проверка нужности рендеринга
    shouldRender() {
        return true; // Всегда разрешаем рендеринг в простой версии
    }
    
    // Получение текущего FPS
    getCurrentFPS() {
        return this.metrics.fps;
    }
    
    // Получение статистики
    getStats() {
        return {
            fps: this.metrics.fps,
            frameTime: this.metrics.frameTime,
            renderTime: this.metrics.renderTime,
            objectCount: this.board.objects ? this.board.objects.size : 0
        };
    }
    
    // Включение/выключение
    setEnabled(enabled) {
        this.isEnabled = enabled;
        console.log(`📊 PerformanceManager ${enabled ? 'включен' : 'выключен'}`);
    }
    
    // Заглушки для совместимости
    startFrame() {}
    endFrame() {}
    trackRender() {}
    optimizeQuality() {}
}

// Экспорт
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceManager;
}
