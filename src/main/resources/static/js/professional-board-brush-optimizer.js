// Professional Board Brush Optimizer - Упрощенная версия без багов

class BrushOptimizer {
    constructor(board) {
        this.board = board;
        this.isEnabled = true;
        
        // Состояние рисования
        this.drawingState = {
            isDrawing: false,
            currentStroke: null,
            lastPoint: null,
            lastTime: 0
        };
        
        console.log('🖌️ BrushOptimizer (простая версия) инициализирован');
    }
    
    // Начало рисования
    startDrawing(point, options = {}) {
        if (!this.isEnabled) return false;
        
        console.log('🎨 Начало рисования (простая версия)');
        
        this.drawingState.isDrawing = true;
        this.drawingState.lastPoint = point;
        this.drawingState.lastTime = performance.now();
        
        // Создание простого штриха
        this.drawingState.currentStroke = {
            id: Date.now() + '_' + Math.random(),
            points: [point],
            color: options.color || '#000000',
            brushSize: options.brushSize || 3,
            opacity: options.opacity || 1,
            tool: options.tool || 'brush',
            timestamp: Date.now()
        };
        
        return true;
    }
    
    // Добавление точки
    addPoint(point, options = {}) {
        if (!this.isEnabled || !this.drawingState.isDrawing) return false;
        
        // Простая проверка расстояния
        const distance = this.calculateDistance(this.drawingState.lastPoint, point);
        if (distance < 2) {
            return false; // Слишком близко к предыдущей точке
        }
        
        // Добавляем точку
        this.drawingState.currentStroke.points.push(point);
        this.drawingState.lastPoint = point;
        this.drawingState.lastTime = performance.now();
        
        return point;
    }
    
    // Завершение рисования
    finishDrawing() {
        if (!this.isEnabled || !this.drawingState.isDrawing) return null;
        
        console.log('✅ Завершение рисования (простая версия)');
        
        const finalStroke = this.drawingState.currentStroke;
        
        // Очистка состояния
        this.drawingState.isDrawing = false;
        this.drawingState.currentStroke = null;
        
        return finalStroke;
    }
    
    // Вспомогательная функция расчета расстояния
    calculateDistance(p1, p2) {
        if (!p1 || !p2) return 0;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    // Включение/выключение
    setEnabled(enabled) {
        this.isEnabled = enabled;
        console.log(`🖌️ BrushOptimizer ${enabled ? 'включен' : 'выключен'}`);
    }
    
    // Получение статистики
    getStats() {
        return {
            isEnabled: this.isEnabled,
            isDrawing: this.drawingState.isDrawing
        };
    }
}

// Экспорт для использования в других модулях
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BrushOptimizer;
}
