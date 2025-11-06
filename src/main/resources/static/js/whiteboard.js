// ===== ИНИЦИАЛИЗАЦИЯ ДОСКИ =====

class Whiteboard {
    constructor() {
        this.canvas = document.getElementById('whiteboardCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.lessonId = document.getElementById('lessonId').value;
        this.currentUserId = document.getElementById('currentUserId').value;
        this.currentUserName = document.getElementById('currentUserName').value;
        
        // Состояние
        this.elements = [];
        this.history = [];
        this.historyIndex = -1;
        this.currentTool = 'select';
        this.strokeColor = '#000000';
        this.fillColor = '#ffffff';
        this.strokeWidth = 2;
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.currentElement = null;
        this.selectedElement = null;
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        
        // Для рисования свободной линии
        this.currentPath = [];
        
        // Синхронизация
        this.saveTimeout = null;
        this.autoSaveInterval = null;
        this.syncInterval = null;
        this.lastSyncedVersion = 0;
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.setupToolbar();
        this.loadBoardState();
        this.startAutoSave();
    }
    
    setupCanvas() {
        const container = document.getElementById('boardContainer');
        const resizeCanvas = () => {
            this.canvas.width = container.clientWidth;
            this.canvas.height = container.clientHeight;
            this.redraw();
        };
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }
    
    setupEventListeners() {
        // Мышь
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
        
        // Касание
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Клавиатура
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }
    
    setupToolbar() {
        // Инструменты
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.setTool(btn.getAttribute('data-tool'));
                document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        
        // Цвета
        document.getElementById('strokeColor').addEventListener('change', (e) => {
            this.strokeColor = e.target.value;
        });
        
        document.getElementById('fillColor').addEventListener('change', (e) => {
            this.fillColor = e.target.value;
        });
        
        // Толщина линии
        const strokeWidthInput = document.getElementById('strokeWidth');
        const strokeWidthLabel = document.getElementById('strokeWidthLabel');
        strokeWidthInput.addEventListener('input', (e) => {
            this.strokeWidth = parseInt(e.target.value);
            strokeWidthLabel.textContent = this.strokeWidth;
        });
        
        // Ластик
        document.getElementById('eraserBtn').addEventListener('click', () => {
            this.setTool('eraser');
            document.querySelectorAll('.tool-btn[data-tool]').forEach(b => b.classList.remove('active'));
        });
    }
    
    setTool(tool) {
        this.currentTool = tool;
        this.canvas.className = tool;
    }
    
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }
    
    getTouchPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0] || e.changedTouches[0];
        return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top
        };
    }
    
    handleMouseDown(e) {
        const pos = this.getMousePos(e);
        this.startDrawing(pos.x, pos.y);
    }
    
    handleMouseMove(e) {
        const pos = this.getMousePos(e);
        this.updateDrawing(pos.x, pos.y);
    }
    
    handleMouseUp(e) {
        this.stopDrawing();
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        const pos = this.getTouchPos(e);
        this.startDrawing(pos.x, pos.y);
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        const pos = this.getTouchPos(e);
        this.updateDrawing(pos.x, pos.y);
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        this.stopDrawing();
    }
    
    handleKeyDown(e) {
        // Горячие клавиши
        if (e.ctrlKey || e.metaKey) {
            if (e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                this.undo();
                return;
            }
            if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
                e.preventDefault();
                this.redo();
                return;
            }
            if (e.key === 's') {
                e.preventDefault();
                this.saveBoard();
                return;
            }
        }
        
        // Быстрый выбор инструментов
        const toolMap = {
            'v': 'select',
            'r': 'rectangle',
            'e': 'ellipse',
            'a': 'arrow',
            'l': 'line',
            'p': 'draw',
            't': 'text'
        };
        
        if (toolMap[e.key.toLowerCase()] && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            const tool = toolMap[e.key.toLowerCase()];
            this.setTool(tool);
            document.querySelectorAll('.tool-btn[data-tool]').forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-tool') === tool);
            });
        }
    }
    
    startDrawing(x, y) {
        this.isDrawing = true;
        this.startX = x;
        this.startY = y;
        
        if (this.currentTool === 'select') {
            // Проверяем, кликнули ли на элемент
            this.selectedElement = this.getElementAt(x, y);
            if (this.selectedElement) {
                this.isDragging = true;
                this.dragOffset = {
                    x: x - this.selectedElement.x,
                    y: y - this.selectedElement.y
                };
            } else {
                this.selectedElement = null;
            }
            this.redraw();
            return;
        }
        
        if (this.currentTool === 'draw') {
            this.currentPath = [{ x, y }];
            return;
        }
        
        if (this.currentTool === 'eraser') {
            this.eraseAt(x, y);
            return;
        }
        
        if (this.currentTool === 'text') {
            this.addTextElement(x, y);
            return;
        }
        
        // Создаем новый элемент
        this.currentElement = {
            type: this.currentTool,
            x: x,
            y: y,
            width: 0,
            height: 0,
            strokeColor: this.strokeColor,
            fillColor: this.fillColor,
            strokeWidth: this.strokeWidth,
            id: Date.now() + Math.random()
        };
    }
    
    updateDrawing(x, y) {
        if (!this.isDrawing) return;
        
        if (this.isDragging && this.selectedElement) {
            this.selectedElement.x = x - this.dragOffset.x;
            this.selectedElement.y = y - this.dragOffset.y;
            this.redraw();
            return;
        }
        
        if (this.currentTool === 'draw') {
            this.currentPath.push({ x, y });
            this.drawPath();
            return;
        }
        
        if (this.currentTool === 'eraser') {
            this.eraseAt(x, y);
            return;
        }
        
        if (this.currentElement) {
            const width = x - this.startX;
            const height = y - this.startY;
            
            this.currentElement.width = width;
            this.currentElement.height = height;
            
            this.redraw();
            this.drawElement(this.ctx, this.currentElement);
        }
    }
    
    stopDrawing() {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        this.isDragging = false;
        
        if (this.currentTool === 'draw' && this.currentPath.length > 0) {
            this.elements.push({
                type: 'path',
                points: [...this.currentPath],
                strokeColor: this.strokeColor,
                strokeWidth: this.strokeWidth,
                id: Date.now() + Math.random()
            });
            this.saveToHistory();
            this.currentPath = [];
        }
        
        if (this.currentElement && (this.currentElement.width !== 0 || this.currentElement.height !== 0)) {
            this.elements.push(this.currentElement);
            this.saveToHistory();
            this.currentElement = null;
        }
        
        this.redraw();
        this.scheduleSave();
    }
    
    drawPath() {
        if (this.currentPath.length < 2) return;
        
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.strokeColor;
        this.ctx.lineWidth = this.strokeWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.moveTo(this.currentPath[0].x, this.currentPath[0].y);
        for (let i = 1; i < this.currentPath.length; i++) {
            this.ctx.lineTo(this.currentPath[i].x, this.currentPath[i].y);
        }
        this.ctx.stroke();
    }
    
    eraseAt(x, y) {
        const eraserSize = this.strokeWidth * 5;
        const elementsToRemove = [];
        
        this.elements.forEach((element, index) => {
            if (this.isPointInElement(x, y, element, eraserSize)) {
                elementsToRemove.push(index);
            }
        });
        
        // Удаляем в обратном порядке
        elementsToRemove.reverse().forEach(index => {
            this.elements.splice(index, 1);
        });
        
        if (elementsToRemove.length > 0) {
            this.saveToHistory();
            this.redraw();
            this.scheduleSave();
        }
    }
    
    isPointInElement(x, y, element, tolerance = 0) {
        if (element.type === 'path') {
            // Проверяем расстояние до всех точек пути
            for (const point of element.points) {
                const dist = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2));
                if (dist <= (element.strokeWidth / 2 + tolerance)) {
                    return true;
                }
            }
            return false;
        }
        
        if (element.type === 'text') {
            return x >= element.x && x <= element.x + element.width &&
                   y >= element.y && y <= element.y + element.height;
        }
        
        // Для фигур
        const left = Math.min(element.x, element.x + element.width);
        const right = Math.max(element.x, element.x + element.width);
        const top = Math.min(element.y, element.y + element.height);
        const bottom = Math.max(element.y, element.y + element.height);
        
        return x >= left - tolerance && x <= right + tolerance &&
               y >= top - tolerance && y <= bottom + tolerance;
    }
    
    getElementAt(x, y) {
        // Ищем с конца, чтобы выбрать верхний элемент
        for (let i = this.elements.length - 1; i >= 0; i--) {
            if (this.isPointInElement(x, y, this.elements[i])) {
                return this.elements[i];
            }
        }
        return null;
    }
    
    addTextElement(x, y) {
        const text = prompt('Введите текст:');
        if (!text) return;
        
        this.ctx.font = `${this.strokeWidth * 10}px Arial`;
        const metrics = this.ctx.measureText(text);
        
        this.elements.push({
            type: 'text',
            x: x,
            y: y,
            text: text,
            width: metrics.width,
            height: this.strokeWidth * 10,
            strokeColor: this.strokeColor,
            strokeWidth: this.strokeWidth,
            id: Date.now() + Math.random()
        });
        
        this.saveToHistory();
        this.redraw();
        this.scheduleSave();
    }
    
    drawElement(ctx, element) {
        ctx.save();
        
        ctx.strokeStyle = element.strokeColor || '#000000';
        ctx.fillStyle = element.fillColor || '#ffffff';
        ctx.lineWidth = element.strokeWidth || 2;
        
        switch (element.type) {
            case 'rectangle':
                ctx.beginPath();
                ctx.rect(element.x, element.y, element.width, element.height);
                ctx.fill();
                ctx.stroke();
                break;
                
            case 'ellipse':
                ctx.beginPath();
                const centerX = element.x + element.width / 2;
                const centerY = element.y + element.height / 2;
                const radiusX = Math.abs(element.width) / 2;
                const radiusY = Math.abs(element.height) / 2;
                ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
                break;
                
            case 'line':
                ctx.beginPath();
                ctx.moveTo(element.x, element.y);
                ctx.lineTo(element.x + element.width, element.y + element.height);
                ctx.stroke();
                break;
                
            case 'arrow':
                ctx.beginPath();
                ctx.moveTo(element.x, element.y);
                ctx.lineTo(element.x + element.width, element.y + element.height);
                ctx.stroke();
                
                // Рисуем наконечник стрелки
                const angle = Math.atan2(element.height, element.width);
                const arrowLength = 15;
                const arrowAngle = Math.PI / 6;
                
                ctx.beginPath();
                ctx.moveTo(element.x + element.width, element.y + element.height);
                ctx.lineTo(
                    element.x + element.width - arrowLength * Math.cos(angle - arrowAngle),
                    element.y + element.height - arrowLength * Math.sin(angle - arrowAngle)
                );
                ctx.moveTo(element.x + element.width, element.y + element.height);
                ctx.lineTo(
                    element.x + element.width - arrowLength * Math.cos(angle + arrowAngle),
                    element.y + element.height - arrowLength * Math.sin(angle + arrowAngle)
                );
                ctx.stroke();
                break;
                
            case 'path':
                ctx.beginPath();
                ctx.strokeStyle = element.strokeColor;
                ctx.lineWidth = element.strokeWidth;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                
                if (element.points.length > 0) {
                    ctx.moveTo(element.points[0].x, element.points[0].y);
                    for (let i = 1; i < element.points.length; i++) {
                        ctx.lineTo(element.points[i].x, element.points[i].y);
                    }
                }
                ctx.stroke();
                break;
                
            case 'text':
                ctx.font = `${element.strokeWidth * 10}px Arial`;
                ctx.fillStyle = element.strokeColor;
                ctx.fillText(element.text, element.x, element.y + element.height);
                break;
        }
        
        ctx.restore();
    }
    
    redraw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Рисуем все элементы
        this.elements.forEach(element => {
            this.drawElement(this.ctx, element);
        });
        
        // Рисуем текущий элемент
        if (this.currentElement) {
            this.drawElement(this.ctx, this.currentElement);
        }
        
        // Рисуем выделение
        if (this.selectedElement) {
            this.drawSelection(this.selectedElement);
        }
    }
    
    drawSelection(element) {
        this.ctx.save();
        this.ctx.strokeStyle = '#667eea';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        
        if (element.type === 'path') {
            // Рисуем границы пути
            const minX = Math.min(...element.points.map(p => p.x));
            const maxX = Math.max(...element.points.map(p => p.x));
            const minY = Math.min(...element.points.map(p => p.y));
            const maxY = Math.max(...element.points.map(p => p.y));
            
            this.ctx.strokeRect(minX - 5, minY - 5, maxX - minX + 10, maxY - minY + 10);
        } else if (element.type === 'text') {
            this.ctx.strokeRect(element.x - 5, element.y - 5, element.width + 10, element.height + 10);
        } else {
            const left = Math.min(element.x, element.x + element.width);
            const right = Math.max(element.x, element.x + element.width);
            const top = Math.min(element.y, element.y + element.height);
            const bottom = Math.max(element.y, element.y + element.height);
            
            this.ctx.strokeRect(left - 5, top - 5, right - left + 10, bottom - top + 10);
        }
        
        this.ctx.restore();
    }
    
    saveToHistory() {
        // Удаляем все элементы после текущего индекса
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // Добавляем новое состояние
        this.history.push(JSON.stringify(this.elements));
        this.historyIndex = this.history.length - 1;
        
        // Ограничиваем размер истории
        if (this.history.length > 50) {
            this.history.shift();
            this.historyIndex--;
        }
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.elements = JSON.parse(this.history[this.historyIndex]);
            this.redraw();
            this.scheduleSave();
        }
    }
    
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.elements = JSON.parse(this.history[this.historyIndex]);
            this.redraw();
            this.scheduleSave();
        }
    }
    
    scheduleSave() {
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        this.saveTimeout = setTimeout(() => {
            this.saveBoardState();
        }, 1000);
    }
    
    startAutoSave() {
        // Автосохранение каждые 5 секунд
        this.autoSaveInterval = setInterval(() => {
            this.saveBoardState();
        }, 5000);
        
        // Синхронизация с сервером каждые 2 секунды
        this.syncInterval = setInterval(() => {
            this.syncBoardState();
        }, 2000);
    }
    
    async syncBoardState() {
        try {
            const response = await fetch(`/whiteboard/api/state/${this.lessonId}`);
            if (!response.ok) {
                return; // Игнорируем ошибки при синхронизации
            }
            
            const data = await response.json();
            if (data.success && data.boardData) {
                try {
                    const boardData = JSON.parse(data.boardData);
                    const serverElements = boardData.elements || [];
                    const serverVersion = data.version || 0;
                    
                    // Проверяем, изменилось ли состояние на сервере
                    const currentElementsStr = JSON.stringify(this.elements);
                    const serverElementsStr = JSON.stringify(serverElements);
                    
                    // Если состояние на сервере отличается и версия новее, обновляем локальное состояние
                    if (currentElementsStr !== serverElementsStr && serverVersion > this.lastSyncedVersion) {
                        // Обновляем только если мы не редактируем сейчас
                        if (!this.isDrawing && !this.currentElement && this.currentPath.length === 0) {
                            this.elements = serverElements;
                            this.lastSyncedVersion = serverVersion;
                            // Восстанавливаем историю
                            this.history = [JSON.stringify(this.elements)];
                            this.historyIndex = 0;
                            this.redraw();
                            console.log('Доска синхронизирована с сервером, версия:', serverVersion);
                        }
                    } else if (serverVersion > this.lastSyncedVersion) {
                        // Обновляем версию даже если элементы не изменились
                        this.lastSyncedVersion = serverVersion;
                    }
                } catch (parseError) {
                    console.debug('Ошибка парсинга при синхронизации:', parseError);
                }
            }
        } catch (error) {
            // Игнорируем ошибки синхронизации
            console.debug('Ошибка синхронизации доски:', error);
        }
    }
    
    async saveBoardState() {
        try {
            const boardData = JSON.stringify({
                elements: this.elements,
                appState: {
                    currentTool: this.currentTool,
                    strokeColor: this.strokeColor,
                    fillColor: this.fillColor,
                    strokeWidth: this.strokeWidth
                }
            });
            
            const response = await fetch(`/whiteboard/api/state/${this.lessonId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ boardData })
            });
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Ошибка сохранения доски:', response.status, errorText);
                return;
            }
            
            const data = await response.json();
            if (data.success) {
                this.lastSyncedVersion = data.version || this.lastSyncedVersion;
                console.log('Доска сохранена, версия:', this.lastSyncedVersion);
            } else {
                console.error('Ошибка сохранения доски:', data.message);
            }
        } catch (error) {
            console.error('Ошибка сохранения доски:', error);
        }
    }
    
    async loadBoardState() {
        try {
            const response = await fetch(`/whiteboard/api/state/${this.lessonId}`);
            
            if (!response.ok) {
                console.error('Ошибка загрузки доски:', response.status);
                // Создаем пустое состояние при ошибке
                this.elements = [];
                this.redraw();
                return;
            }
            
            const data = await response.json();
            
            if (data.success && data.boardData) {
                try {
                    const boardData = JSON.parse(data.boardData);
                    this.elements = boardData.elements || [];
                    
                    if (boardData.appState) {
                        this.currentTool = boardData.appState.currentTool || 'select';
                        this.strokeColor = boardData.appState.strokeColor || '#000000';
                        this.fillColor = boardData.appState.fillColor || '#ffffff';
                        this.strokeWidth = boardData.appState.strokeWidth || 2;
                    }
                    
                    // Сохраняем версию
                    this.lastSyncedVersion = data.version || 0;
                    
                    // Восстанавливаем историю
                    this.history = [JSON.stringify(this.elements)];
                    this.historyIndex = 0;
                    
                    this.redraw();
                    
                    // Обновляем UI
                    const strokeColorInput = document.getElementById('strokeColor');
                    const fillColorInput = document.getElementById('fillColor');
                    const strokeWidthInput = document.getElementById('strokeWidth');
                    const strokeWidthLabel = document.getElementById('strokeWidthLabel');
                    
                    if (strokeColorInput) strokeColorInput.value = this.strokeColor;
                    if (fillColorInput) fillColorInput.value = this.fillColor;
                    if (strokeWidthInput) strokeWidthInput.value = this.strokeWidth;
                    if (strokeWidthLabel) strokeWidthLabel.textContent = this.strokeWidth;
                    
                    document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
                        btn.classList.toggle('active', btn.getAttribute('data-tool') === this.currentTool);
                    });
                } catch (parseError) {
                    console.error('Ошибка парсинга данных доски:', parseError);
                    this.elements = [];
                    this.redraw();
                }
            } else {
                // Если данных нет, создаем пустое состояние
                this.elements = [];
                this.redraw();
            }
        } catch (error) {
            console.error('Ошибка загрузки доски:', error);
            // Создаем пустое состояние при ошибке
            this.elements = [];
            this.redraw();
        }
    }
}

// Глобальные функции
let whiteboard;

function clearBoard() {
    if (confirm('Вы уверены, что хотите очистить доску? Это действие нельзя отменить.')) {
        whiteboard.elements = [];
        whiteboard.saveToHistory();
        whiteboard.redraw();
        whiteboard.saveBoardState();
        
        fetch(`/whiteboard/api/clear/${whiteboard.lessonId}`, {
            method: 'POST'
        });
    }
}

function saveBoard() {
    whiteboard.saveBoardState();
    alert('Доска сохранена!');
}

function undoAction() {
    whiteboard.undo();
}

function redoAction() {
    whiteboard.redo();
}

function closeBoard() {
    if (confirm('Вы уверены, что хотите закрыть доску?')) {
        // Останавливаем синхронизацию
        if (whiteboard.autoSaveInterval) {
            clearInterval(whiteboard.autoSaveInterval);
        }
        if (whiteboard.syncInterval) {
            clearInterval(whiteboard.syncInterval);
        }
        
        // Сохраняем перед закрытием
        whiteboard.saveBoardState();
        window.location.href = '/dashboard';
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    whiteboard = new Whiteboard();
});

