// Professional Board Minimal - Минимальная работающая версия доски

// Глобальные переменные
if (typeof board === 'undefined') var board = null;
var _realBoardInstance = null;

// Минимальная реализация доски
class MinimalBoard {
    constructor(canvasId, options = {}) {
        console.log('🔧 === МИНИМАЛЬНАЯ ДОСКА ===');
        console.log('canvasId:', canvasId);
        
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error('❌ Canvas не найден:', canvasId);
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        this.isInitialized = false;
        
        // Простое состояние
        this.state = {
            isDrawing: false,
            lastX: 0,
            lastY: 0,
            tool: 'pen',
            color: '#000000',
            brushSize: 3
        };
        
        // Список штрихов
        this.strokes = [];
        this.currentStroke = null;
        
        console.log('✅ Минимальная доска создана');
    }
    
    // Инициализация
    init() {
        if (this.isInitialized) {
            console.log('✅ Доска уже инициализирована');
            return true;
        }
        
        console.log('🔧 Инициализация минимальной доски...');
        
        try {
            // Настройка canvas
            this.setupCanvas();
            
            // Обработчики событий
            this.setupEventHandlers();
            
            // Очистка и первая отрисовка
            this.clear();
            
            this.isInitialized = true;
            console.log('✅ Минимальная доска инициализирована');
            return true;
            
        } catch (error) {
            console.error('❌ Ошибка инициализации:', error);
            return false;
        }
    }
    
    // Настройка canvas
    setupCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        let width = rect.width || 800;
        let height = rect.height || 600;
        
        this.canvas.width = width;
        this.canvas.height = height;
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        
        console.log('📐 Canvas размер:', width + 'x' + height);
    }
    
    // Настройка обработчиков событий
    setupEventHandlers() {
        this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this.draw.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));
        
        // Touch события для мобильных
        this.canvas.addEventListener('touchstart', this.handleTouch.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouch.bind(this));
        this.canvas.addEventListener('touchend', this.stopDrawing.bind(this));
        
        console.log('✅ Обработчики событий установлены');
    }
    
    // Начало рисования
    startDrawing(e) {
        this.state.isDrawing = true;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.state.lastX = x;
        this.state.lastY = y;
        
        // Начинаем новый штрих
        this.currentStroke = {
            id: Date.now(),
            points: [{x, y}],
            color: this.state.color,
            brushSize: this.state.brushSize
        };
        
        console.log('🎨 Начало рисования в точке:', x, y);
    }
    
    // Рисование
    draw(e) {
        if (!this.state.isDrawing) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Добавляем точку к текущему штриху
        if (this.currentStroke) {
            this.currentStroke.points.push({x, y});
        }
        
        // Рисуем линию
        this.ctx.beginPath();
        this.ctx.moveTo(this.state.lastX, this.state.lastY);
        this.ctx.lineTo(x, y);
        this.ctx.strokeStyle = this.state.color;
        this.ctx.lineWidth = this.state.brushSize;
        this.ctx.lineCap = 'round';
        this.ctx.stroke();
        
        this.state.lastX = x;
        this.state.lastY = y;
    }
    
    // Остановка рисования
    stopDrawing() {
        if (!this.state.isDrawing) return;
        
        this.state.isDrawing = false;
        
        // Сохраняем штрих
        if (this.currentStroke && this.currentStroke.points.length > 1) {
            this.strokes.push(this.currentStroke);
            console.log('✅ Штрих сохранен, всего штрихов:', this.strokes.length);
        }
        
        this.currentStroke = null;
    }
    
    // Обработка touch событий
    handleTouch(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 
                                         e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
            clientX: touch.clientX,
            clientY: touch.clientY
        });
        this.canvas.dispatchEvent(mouseEvent);
    }
    
    // Очистка доски
    clear() {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.strokes = [];
        console.log('🧹 Доска очищена');
    }
    
    // Перерисовка всех штрихов
    render() {
        this.clear();
        
        this.strokes.forEach(stroke => {
            if (stroke.points && stroke.points.length > 1) {
                this.ctx.beginPath();
                this.ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
                
                for (let i = 1; i < stroke.points.length; i++) {
                    this.ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
                }
                
                this.ctx.strokeStyle = stroke.color;
                this.ctx.lineWidth = stroke.brushSize;
                this.ctx.lineCap = 'round';
                this.ctx.stroke();
            }
        });
    }
    
    // Установка цвета
    setColor(color) {
        this.state.color = color;
        console.log('🎨 Цвет изменен на:', color);
    }
    
    // Установка размера кисти
    setBrushSize(size) {
        this.state.brushSize = size;
        console.log('🖌️ Размер кисти изменен на:', size);
    }
    
    // Заглушки для совместимости
    emit(event, data) { 
        console.log('📡 Событие:', event, data);
    }
    
    addObject(object) { 
        console.log('➕ Добавление объекта:', object);
    }
    
    async initSync(lessonId, userId, userName) {
        console.log('🔄 Синхронизация пропущена (минимальная версия)');
        return Promise.resolve();
    }
    
    // Заглушки для модулей
    get modules() {
        return {
            sync: { setEnabled: () => {}, sendDrawOperation: () => {}, sendDrawComplete: () => {} },
            performance: { shouldRender: () => true, getCurrentFPS: () => 60 },
            brushOptimizer: { setEnabled: () => {} }
        };
    }
}

// Функции для совместимости
function getBoard() {
    return _realBoardInstance;
}

function setRealBoardInstance(boardInstance) {
    _realBoardInstance = boardInstance;
    console.log('✅ Минимальная доска установлена как основная');
}

// Создаем Proxy для board
board = new Proxy({}, {
    get: function(target, prop) {
        const boardInstance = getBoard();
        if (boardInstance && prop in boardInstance) {
            const value = boardInstance[prop];
            if (typeof value === 'function') {
                return value.bind(boardInstance);
            }
            return value;
        }
        return undefined;
    },
    set: function(target, prop, value) {
        const boardInstance = getBoard();
        if (boardInstance) {
            boardInstance[prop] = value;
            return true;
        }
        return false;
    }
});

// Безопасные функции
function safeBoardOperation(operation, ...args) {
    const boardInstance = getBoard();
    if (!boardInstance) {
        console.warn('Доска не инициализирована для операции:', operation);
        return null;
    }
    
    try {
        if (typeof boardInstance[operation] === 'function') {
            return boardInstance[operation](...args);
        }
    } catch (error) {
        console.error('Ошибка операции доски:', operation, error);
        return null;
    }
}

// Экспорт
window.MinimalBoard = MinimalBoard;
window.getBoard = getBoard;
window.setRealBoardInstance = setRealBoardInstance;
window.safeBoardOperation = safeBoardOperation;

console.log('📦 Минимальная доска загружена и готова к использованию');
