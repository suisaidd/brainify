// Professional Board Modules - Дополнительные модули доски

// Модуль экспорта
class ExportManager {
    constructor(board) {
        this.board = board;
    }
    
    export(format, options = {}) {
        console.log('Экспорт в формате:', format);
        
        switch (format) {
            case 'png':
                return this.exportToPNG(options);
            case 'jpg':
            case 'jpeg':
                return this.exportToJPEG(options);
            case 'svg':
                return this.exportToSVG(options);
            case 'pdf':
                return this.exportToPDF(options);
            case 'json':
                return this.exportToJSON(options);
            default:
                throw new Error(`Неподдерживаемый формат: ${format}`);
        }
    }
    
    exportToPNG(options = {}) {
        return new Promise((resolve) => {
            const canvas = this.board.canvas;
            const dataURL = canvas.toDataURL('image/png', options.quality || 1.0);
            resolve(dataURL);
        });
    }
    
    exportToJPEG(options = {}) {
        return new Promise((resolve) => {
            const canvas = this.board.canvas;
            const dataURL = canvas.toDataURL('image/jpeg', options.quality || 0.92);
            resolve(dataURL);
        });
    }
    
    exportToSVG(options = {}) {
        return new Promise((resolve) => {
            // Создание SVG из объектов доски
            const svg = this.createSVGFromObjects();
            resolve(svg);
        });
    }
    
    exportToPDF(options = {}) {
        return new Promise((resolve) => {
            // Используем canvas для создания PDF
            const canvas = this.board.canvas;
            const dataURL = canvas.toDataURL('image/png');
            resolve(dataURL); // В реальности здесь должна быть библиотека PDF
        });
    }
    
    exportToJSON(options = {}) {
        return new Promise((resolve) => {
            const data = {
                version: '1.0',
                timestamp: Date.now(),
                config: this.board.config,
                state: this.board.state,
                layers: this.serializeLayers(),
                objects: this.serializeObjects()
            };
            resolve(JSON.stringify(data, null, 2));
        });
    }
    
    serializeLayers() {
        const layers = [];
        this.board.layers.forEach((layer, id) => {
            layers.push({
                id: layer.id,
                name: layer.name,
                visible: layer.visible,
                locked: layer.locked,
                opacity: layer.opacity,
                blendMode: layer.blendMode,
                order: layer.order
            });
        });
        return layers;
    }
    
    serializeObjects() {
        const objects = [];
        this.board.objects.forEach((object, id) => {
            objects.push({
                id: object.id,
                type: object.type,
                layerId: object.layerId,
                timestamp: object.timestamp,
                ...this.serializeObjectData(object)
            });
        });
        return objects;
    }
    
    serializeObjectData(object) {
        const data = { ...object };
        
        // Удаляем неконсервируемые свойства
        delete data.id;
        delete data.type;
        delete data.layerId;
        delete data.timestamp;
        delete data.element; // HTML элементы
        
        return data;
    }
    
    createSVGFromObjects() {
        const width = this.board.config.width;
        const height = this.board.config.height;
        
        let svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">`;
        
        this.board.objects.forEach(object => {
            svg += this.objectToSVG(object);
        });
        
        svg += '</svg>';
        return svg;
    }
    
    objectToSVG(object) {
        switch (object.type) {
            case 'stroke':
                return this.strokeToSVG(object);
            case 'shape':
                return this.shapeToSVG(object);
            case 'text':
                return this.textToSVG(object);
            default:
                return '';
        }
    }
    
    strokeToSVG(stroke) {
        if (stroke.points.length < 2) return '';
        
        let path = `<path d="M ${stroke.points[0].x} ${stroke.points[0].y}`;
        for (let i = 1; i < stroke.points.length; i++) {
            path += ` L ${stroke.points[i].x} ${stroke.points[i].y}`;
        }
        path += `" stroke="${stroke.color}" stroke-width="${stroke.brushSize}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${stroke.opacity || 1}"/>`;
        
        return path;
    }
    
    shapeToSVG(shape) {
        let svg = '';
        const opacity = shape.opacity || 1;
        
        switch (shape.shapeType) {
            case 'rectangle':
                svg = `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" 
                       fill="${shape.fillColor || 'transparent'}" stroke="${shape.strokeColor || shape.color}" 
                       stroke-width="${shape.strokeWidth || 2}" opacity="${opacity}"/>`;
                break;
                
            case 'circle':
                svg = `<circle cx="${shape.x}" cy="${shape.y}" r="${shape.radius}" 
                       fill="${shape.fillColor || 'transparent'}" stroke="${shape.strokeColor || shape.color}" 
                       stroke-width="${shape.strokeWidth || 2}" opacity="${opacity}"/>`;
                break;
        }
        
        return svg;
    }
    
    textToSVG(text) {
        return `<text x="${text.x}" y="${text.y}" font-family="${text.fontFamily || 'Arial'}" 
                font-size="${text.fontSize || 16}" fill="${text.color}" opacity="${text.opacity || 1}">${text.content}</text>`;
    }
}

// Модуль истории
class HistoryManager {
    constructor(board) {
        this.board = board;
        this.history = [];
        this.historyIndex = -1;
        this.maxHistorySize = board.config.maxHistorySize || 50;
    }
    
    addAction(action) {
        // Удаляем операции после текущего индекса
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // Добавляем новую операцию
        this.history.push(action);
        
        // Ограничиваем размер истории
        if (this.history.length > this.maxHistorySize) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
        
        this.board.emit('historyChanged', { 
            canUndo: this.historyIndex >= 0, 
            canRedo: this.historyIndex < this.history.length - 1 
        });
    }
    
    undo() {
        if (this.historyIndex >= 0) {
            const action = this.history[this.historyIndex];
            this.executeUndo(action);
            this.historyIndex--;
            
            this.board.emit('historyChanged', {
                canUndo: this.historyIndex >= 0,
                canRedo: true
            });
            
            this.board.render();
        }
    }
    
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            const action = this.history[this.historyIndex];
            this.executeRedo(action);
            
            this.board.emit('historyChanged', {
                canUndo: true,
                canRedo: this.historyIndex < this.history.length - 1
            });
            
            this.board.render();
        }
    }
    
    executeUndo(action) {
        switch (action.type) {
            case 'add':
                action.objects.forEach(obj => {
                    this.board.objects.delete(obj.id);
                    const layer = this.board.layers.get(obj.layerId);
                    if (layer) {
                        layer.objects.delete(obj.id);
                    }
                });
                break;
                
            case 'remove':
                action.objects.forEach(obj => {
                    this.board.objects.set(obj.id, obj);
                    const layer = this.board.layers.get(obj.layerId);
                    if (layer) {
                        layer.objects.set(obj.id, obj);
                    }
                });
                break;
        }
    }
    
    executeRedo(action) {
        switch (action.type) {
            case 'add':
                action.objects.forEach(obj => {
                    this.board.objects.set(obj.id, obj);
                    const layer = this.board.layers.get(obj.layerId);
                    if (layer) {
                        layer.objects.set(obj.id, obj);
                    }
                });
                break;
                
            case 'remove':
                action.objects.forEach(obj => {
                    this.board.objects.delete(obj.id);
                    const layer = this.board.layers.get(obj.layerId);
                    if (layer) {
                        layer.objects.delete(obj.id);
                    }
                });
                break;
        }
    }
}

// Модуль слоев
class LayersManager {
    constructor(board) {
        this.board = board;
    }
    
    createLayer(name, options = {}) {
        const id = 'layer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        const layer = {
            id,
            name: name || `Слой ${this.board.layers.size + 1}`,
            visible: options.visible !== false,
            locked: options.locked || false,
            opacity: options.opacity || 1,
            blendMode: options.blendMode || 'normal',
            objects: new Map(),
            order: this.board.layers.size
        };
        
        this.board.layers.set(id, layer);
        
        if (!this.board.activeLayerId) {
            this.board.activeLayerId = id;
        }
        
        this.board.emit('layerCreated', layer);
        return layer;
    }
    
    deleteLayer(layerId) {
        const layer = this.board.layers.get(layerId);
        if (!layer) return;
        
        // Удаляем все объекты слоя
        layer.objects.forEach((object, id) => {
            this.board.objects.delete(id);
        });
        
        // Удаляем слой
        this.board.layers.delete(layerId);
        
        // Если это был активный слой, выбираем другой
        if (this.board.activeLayerId === layerId) {
            const remainingLayers = Array.from(this.board.layers.keys());
            this.board.activeLayerId = remainingLayers.length > 0 ? remainingLayers[0] : null;
        }
        
        this.board.emit('layerDeleted', layerId);
        this.board.render();
    }
    
    setLayerVisibility(layerId, visible) {
        const layer = this.board.layers.get(layerId);
        if (layer) {
            layer.visible = visible;
            this.board.emit('layerVisibilityChanged', { layerId, visible });
            this.board.render();
        }
    }
    
    setLayerOpacity(layerId, opacity) {
        const layer = this.board.layers.get(layerId);
        if (layer) {
            layer.opacity = Math.max(0, Math.min(1, opacity));
            this.board.emit('layerOpacityChanged', { layerId, opacity: layer.opacity });
            this.board.render();
        }
    }
}

// Модуль совместной работы
class CollaborationManager {
    constructor(board) {
        this.board = board;
        this.isConnected = false;
        this.remoteCursors = new Map();
        this.remoteUsers = new Set();
    }
    
    connect() {
        // Подключение к WebSocket происходит в основном файле
        this.isConnected = true;
    }
    
    disconnect() {
        this.isConnected = false;
        this.remoteCursors.clear();
        this.remoteUsers.clear();
    }
    
    broadcastCursorPosition(x, y) {
        if (!this.isConnected) return;
        
        // Отправка позиции курсора через WebSocket
        // Реализация в основном файле
    }
    
    updateRemoteCursor(userId, userName, x, y) {
        this.remoteCursors.set(userId, {
            userName,
            x,
            y,
            timestamp: Date.now()
        });
        
        // Автоматическое удаление неактивных курсоров
        setTimeout(() => {
            const cursor = this.remoteCursors.get(userId);
            if (cursor && Date.now() - cursor.timestamp > 3000) {
                this.remoteCursors.delete(userId);
                this.board.render();
            }
        }, 3000);
    }
    
    removeRemoteCursor(userId) {
        this.remoteCursors.delete(userId);
        this.board.render();
    }
    
    renderCursors(ctx) {
        this.remoteCursors.forEach((cursor, userId) => {
            this.renderRemoteCursor(ctx, cursor);
        });
    }
    
    renderRemoteCursor(ctx, cursor) {
        ctx.save();
        
        // Рисуем курсор
        ctx.strokeStyle = '#FF6B6B';
        ctx.fillStyle = '#FF6B6B';
        ctx.lineWidth = 2;
        
        // Стрелка курсора
        ctx.beginPath();
        ctx.moveTo(cursor.x, cursor.y);
        ctx.lineTo(cursor.x + 12, cursor.y + 4);
        ctx.lineTo(cursor.x + 8, cursor.y + 8);
        ctx.lineTo(cursor.x + 4, cursor.y + 12);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        // Имя пользователя
        ctx.font = '12px Arial';
        ctx.fillStyle = '#333';
        ctx.fillText(cursor.userName, cursor.x + 15, cursor.y + 15);
        
        ctx.restore();
    }
    
    addUser(userId, userName) {
        this.remoteUsers.add({ userId, userName });
        this.board.emit('userJoined', { userId, userName });
    }
    
    removeUser(userId) {
        this.remoteUsers.forEach(user => {
            if (user.userId === userId) {
                this.remoteUsers.delete(user);
                this.removeRemoteCursor(userId);
                this.board.emit('userLeft', { userId, userName: user.userName });
            }
        });
    }
}

// Модуль формул
class FormulaManager {
    constructor(board) {
        this.board = board;
        this.katexLoaded = false;
        this.loadKaTeX();
    }
    
    loadKaTeX() {
        if (window.katex) {
            this.katexLoaded = true;
            return;
        }
        
        // Загружаем KaTeX CSS
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.css';
        document.head.appendChild(link);
        
        // Загружаем KaTeX JS
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.js';
        script.onload = () => {
            this.katexLoaded = true;
        };
        document.head.appendChild(script);
    }
    
    renderFormula(latex, options = {}) {
        if (!this.katexLoaded) {
            console.warn('KaTeX не загружен');
            return null;
        }
        
        try {
            const container = document.createElement('div');
            container.style.position = 'absolute';
            container.style.visibility = 'hidden';
            document.body.appendChild(container);
            
            window.katex.render(latex, container, {
                throwOnError: false,
                displayMode: options.displayMode || true,
                ...options
            });
            
            // Конвертируем в canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const rect = container.getBoundingClientRect();
            
            canvas.width = rect.width * 2;
            canvas.height = rect.height * 2;
            ctx.scale(2, 2);
            
            // Здесь должна быть реализация конвертации HTML в canvas
            // Для простоты возвращаем размеры
            
            document.body.removeChild(container);
            
            return {
                canvas,
                width: rect.width,
                height: rect.height
            };
            
        } catch (error) {
            console.error('Ошибка рендеринга формулы:', error);
            return null;
        }
    }
}

// Модуль распознавания
class RecognitionManager {
    constructor(board) {
        this.board = board;
        this.isRecognizing = false;
    }
    
    recognizeShape(stroke) {
        // Простое распознавание фигур по точкам
        if (stroke.points.length < 3) return null;
        
        const bounds = this.getStrokeBounds(stroke);
        const aspectRatio = bounds.width / bounds.height;
        
        // Проверка на круг
        if (this.isCircleShape(stroke, bounds)) {
            return {
                type: 'shape',
                shapeType: 'circle',
                x: bounds.centerX,
                y: bounds.centerY,
                radius: Math.max(bounds.width, bounds.height) / 2,
                color: stroke.color,
                strokeWidth: stroke.brushSize
            };
        }
        
        // Проверка на прямоугольник
        if (this.isRectangleShape(stroke, bounds)) {
            return {
                type: 'shape',
                shapeType: 'rectangle',
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bounds.height,
                color: stroke.color,
                strokeWidth: stroke.brushSize
            };
        }
        
        return null;
    }
    
    getStrokeBounds(stroke) {
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        stroke.points.forEach(point => {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        });
        
        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2
        };
    }
    
    isCircleShape(stroke, bounds) {
        // Простая проверка: если штрих примерно круглый и замкнутый
        const aspectRatio = bounds.width / bounds.height;
        const firstPoint = stroke.points[0];
        const lastPoint = stroke.points[stroke.points.length - 1];
        const distance = Math.sqrt(
            Math.pow(lastPoint.x - firstPoint.x, 2) + 
            Math.pow(lastPoint.y - firstPoint.y, 2)
        );
        
        return aspectRatio > 0.7 && aspectRatio < 1.3 && 
               distance < Math.min(bounds.width, bounds.height) * 0.3;
    }
    
    isRectangleShape(stroke, bounds) {
        // Простая проверка на прямоугольник
        // Здесь должен быть более сложный алгоритм
        return false; // Пока отключено
    }
}

// Экспорт классов
window.ExportManager = ExportManager;
window.HistoryManager = HistoryManager;
window.LayersManager = LayersManager;
window.CollaborationManager = CollaborationManager;
window.FormulaManager = FormulaManager;
window.RecognitionManager = RecognitionManager;