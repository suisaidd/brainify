// Professional Board Tools - Расширенные инструменты рисования

// Менеджер инструментов
class ToolsManager {
    constructor(board) {
        this.board = board;
        this.tools = new Map();
        this.activeTool = null;
        this.initTools();
    }
    
    initTools() {
        // Регистрация инструментов
        this.registerTool('pen', new PenTool(this.board));
        this.registerTool('highlighter', new HighlighterTool(this.board));
        this.registerTool('eraser', new EraserTool(this.board));
        this.registerTool('shape', new ShapeTool(this.board));
        this.registerTool('arrow', new ArrowTool(this.board));
        this.registerTool('text', new TextTool(this.board));
        this.registerTool('select', new SelectTool(this.board));
        this.registerTool('laser', new LaserPointerTool(this.board));
        this.registerTool('image', new ImageTool(this.board));
        this.registerTool('formula', new FormulaTool(this.board));
        
        // Установка инструмента по умолчанию
        this.setActiveTool('pen');
    }
    
    registerTool(name, tool) {
        this.tools.set(name, tool);
    }
    
    setActiveTool(name) {
        if (this.activeTool) {
            this.activeTool.deactivate();
        }
        
        this.activeTool = this.tools.get(name);
        if (this.activeTool) {
            this.activeTool.activate();
            this.board.state.selectedTool = name;
            this.board.emit('toolChanged', name);
        }
    }
    
    handleMouseDown(pos, event) {
        if (this.activeTool) {
            this.activeTool.onMouseDown(pos, event);
        }
    }
    
    handleMouseMove(pos, event) {
        if (this.activeTool) {
            this.activeTool.onMouseMove(pos, event);
        }
    }
    
    handleMouseUp(pos, event) {
        if (this.activeTool) {
            this.activeTool.onMouseUp(pos, event);
        }
    }
    
    handleKeyDown(event) {
        if (this.activeTool && this.activeTool.onKeyDown) {
            this.activeTool.onKeyDown(event);
        }
    }
}

// Базовый класс инструмента
class BaseTool {
    constructor(board) {
        this.board = board;
        this.active = false;
        this.cursor = 'default';
    }
    
    activate() {
        this.active = true;
        this.board.canvas.style.cursor = this.cursor;
    }
    
    deactivate() {
        this.active = false;
    }
    
    onMouseDown(pos, event) {}
    onMouseMove(pos, event) {}
    onMouseUp(pos, event) {}
    onKeyDown(event) {}
}

// Инструмент рисования (ручка)
class PenTool extends BaseTool {
    constructor(board) {
        super(board);
        this.cursor = 'crosshair';
        this.currentStroke = null;
        this.isDrawing = false;
        this.lastPoint = null;
        this.points = [];
        this.smoothing = 0.5;
    }
    
    onMouseDown(pos, event) {
        console.log('🖱️ СОБЫТИЕ МЫШИ: onMouseDown - позиция:', pos);
        this.isDrawing = true;
        this.lastPoint = pos;
        this.points = [pos];
        
        // Используем BrushOptimizer если доступен
        if (this.board.modules.brushOptimizer) {
            const success = this.board.modules.brushOptimizer.startDrawing(pos, {
                color: this.board.state.selectedColor,
                brushSize: this.board.state.brushSize,
                opacity: this.board.state.opacity || 1,
                tool: 'pen',
                pressure: event.pressure || 1
            });
            
            if (success) {
                this.currentStroke = this.board.modules.brushOptimizer.drawingState.currentStroke;
                console.log('🎨 BrushOptimizer активирован для рисования');
            }
        } else {
            // Fallback: создание нового штриха как обычно
            this.currentStroke = {
                type: 'stroke',
                points: [{ x: pos.x, y: pos.y }],
                color: this.board.state.selectedColor,
                brushSize: this.board.state.brushSize,
                opacity: this.board.state.opacity,
                tool: 'pen',
                timestamp: Date.now()
            };
            console.log('⚠️ BrushOptimizer недоступен, используем fallback');
        }
        
        console.log('🎯 СОЗДАН НОВЫЙ ШТРИХ:', this.currentStroke);
        
        // Отправка события начала рисования
        this.board.emit('drawStart', this.currentStroke);
    }
    
    onMouseMove(pos, event) {
        if (!this.isDrawing || !this.currentStroke) return;
        
        let optimizedPoint = null;
        
        // Используем BrushOptimizer если доступен
        if (this.board.modules.brushOptimizer) {
            optimizedPoint = this.board.modules.brushOptimizer.addPoint(pos, {
                pressure: event.pressure || 1
            });
            
            if (optimizedPoint) {
                console.log('🎨 Оптимизированная точка добавлена:', optimizedPoint);
                // Синхронизируем локальные точки с оптимизированными
                this.points.push(optimizedPoint);
            } else {
                // Точка была отфильтрована оптимизатором (throttling/distance)
                return;
            }
        } else {
            // Fallback: ручная оптимизация расстояния
            const distance = Math.sqrt(
                Math.pow(pos.x - this.lastPoint.x, 2) +
                Math.pow(pos.y - this.lastPoint.y, 2)
            );
            
            // Добавление точки только если расстояние достаточное
            if (distance > this.board.state.brushSize * 0.1) {
                console.log('🖱️ СОБЫТИЕ МЫШИ: onMouseMove - новая точка:', pos, 'расстояние:', distance);
                
                // Сглаживание линии
                const smoothedPoint = this.smoothPoint(pos);
                this.currentStroke.points.push(smoothedPoint);
                this.points.push(smoothedPoint);
                optimizedPoint = smoothedPoint;
                
                console.log('⚠️ Fallback оптимизация, точек:', this.currentStroke.points.length);
            } else {
                return; // Пропускаем слишком близкие точки
            }
        }
        
        console.log('🎨 ДОБАВЛЕНА ТОЧКА К ШТРИХУ:', optimizedPoint, 'всего точек:', this.currentStroke.points.length);
        
        // Отправка события рисования
        this.board.emit('drawing', optimizedPoint);
        
        // Немедленный рендер для отзывчивости
        this.renderCurrentStroke();
        
        this.lastPoint = pos;
    }
    
    onMouseUp(pos, event) {
        if (!this.isDrawing || !this.currentStroke) return;
        
        console.log('🖱️ СОБЫТИЕ МЫШИ: onMouseUp - финальная позиция:', pos);
        this.isDrawing = false;
        
        let finalStroke = this.currentStroke;
        
        // Используем BrushOptimizer для финализации если доступен
        if (this.board.modules.brushOptimizer) {
            const optimizedStroke = this.board.modules.brushOptimizer.finishDrawing();
            if (optimizedStroke) {
                finalStroke = optimizedStroke;
                console.log('🎨 BrushOptimizer финализировал штрих:', {
                    originalPoints: optimizedStroke.originalPointCount,
                    finalPoints: optimizedStroke.finalPointCount,
                    efficiency: ((optimizedStroke.originalPointCount - optimizedStroke.finalPointCount) / optimizedStroke.originalPointCount * 100).toFixed(1) + '%'
                });
            }
        } else {
            // Fallback: ручная оптимизация точек
            finalStroke.points = this.optimizePoints(this.currentStroke.points);
            console.log('⚠️ Fallback оптимизация точек');
        }
        
        console.log('🏁 ЗАВЕРШЕНИЕ ШТРИХА - итоговое количество точек:', finalStroke.points.length);
        
        // Добавление объекта на доску
        this.board.addObject(finalStroke);
        
        // Отправка события завершения рисования
        this.board.emit('drawEnd', finalStroke);
        
        // Очистка
        this.currentStroke = null;
        this.points = [];
    }
    
    smoothPoint(pos) {
        if (this.points.length < 2) {
            return { x: pos.x, y: pos.y };
        }
        
        // Взвешенное среднее для сглаживания
        const prev = this.points[this.points.length - 1];
        return {
            x: prev.x * this.smoothing + pos.x * (1 - this.smoothing),
            y: prev.y * this.smoothing + pos.y * (1 - this.smoothing)
        };
    }
    
    optimizePoints(points) {
        if (points.length < 3) return points;
        
        // Алгоритм Дугласа-Пекера для упрощения линии
        const tolerance = this.board.state.brushSize * 0.5;
        return this.douglasPeucker(points, tolerance);
    }
    
    douglasPeucker(points, tolerance) {
        if (points.length <= 2) return points;
        
        // Найти точку с максимальным расстоянием
        let maxDistance = 0;
        let maxIndex = 0;
        
        for (let i = 1; i < points.length - 1; i++) {
            const distance = this.perpendicularDistance(
                points[i],
                points[0],
                points[points.length - 1]
            );
            
            if (distance > maxDistance) {
                maxDistance = distance;
                maxIndex = i;
            }
        }
        
        // Если максимальное расстояние больше допустимого, рекурсивно упростить
        if (maxDistance > tolerance) {
            const left = this.douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
            const right = this.douglasPeucker(points.slice(maxIndex), tolerance);
            
            return left.slice(0, -1).concat(right);
        } else {
            return [points[0], points[points.length - 1]];
        }
    }
    
    perpendicularDistance(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        
        if (dx === 0 && dy === 0) {
            return Math.sqrt(
                Math.pow(point.x - lineStart.x, 2) +
                Math.pow(point.y - lineStart.y, 2)
            );
        }
        
        const t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) /
                  (dx * dx + dy * dy);
        
        const closestPoint = {
            x: lineStart.x + t * dx,
            y: lineStart.y + t * dy
        };
        
        return Math.sqrt(
            Math.pow(point.x - closestPoint.x, 2) +
            Math.pow(point.y - closestPoint.y, 2)
        );
    }
    
    renderCurrentStroke() {
        // Быстрый рендер текущего штриха
        if (this.board.config.renderer === 'canvas2d' && this.currentStroke) {
            const ctx = this.board.ctx;
            const points = this.currentStroke.points;
            
            if (points.length >= 2) {
                ctx.save();
                
                // Применение трансформаций
                ctx.translate(this.board.state.panX, this.board.state.panY);
                ctx.scale(this.board.state.zoom, this.board.state.zoom);
                
                // Настройки линии
                ctx.strokeStyle = this.currentStroke.color;
                ctx.lineWidth = this.currentStroke.brushSize;
                ctx.globalAlpha = this.currentStroke.opacity;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                
                // Рисование последнего сегмента
                const lastIndex = points.length - 1;
                ctx.beginPath();
                ctx.moveTo(points[lastIndex - 1].x, points[lastIndex - 1].y);
                ctx.lineTo(points[lastIndex].x, points[lastIndex].y);
                ctx.stroke();
                
                ctx.restore();
            }
        }
    }
}

// Инструмент маркера (с прозрачностью)
class HighlighterTool extends PenTool {
    constructor(board) {
        super(board);
        this.defaultOpacity = 0.3;
    }
    
    onMouseDown(pos, event) {
        // Сохраняем текущую прозрачность
        const savedOpacity = this.board.state.opacity;
        this.board.state.opacity = this.defaultOpacity;
        
        super.onMouseDown(pos, event);
        
        // Восстанавливаем прозрачность
        this.board.state.opacity = savedOpacity;
        
        // Устанавливаем режим смешивания для маркера
        if (this.currentStroke) {
            this.currentStroke.tool = 'highlighter';
            this.currentStroke.blendMode = 'multiply';
        }
    }
}

// Инструмент ластика
class EraserTool extends BaseTool {
    constructor(board) {
        super(board);
        this.cursor = 'crosshair';
        this.isErasing = false;
        this.eraserSize = 20;
        this.eraserMode = 'stroke'; // 'stroke' | 'pixel' | 'object'
        this.erasedObjects = []; // Для undo/redo
        this.previewCursor = null;
        
        // Настройки производительности
        this.throttleInterval = 16; // ~60 FPS
        this.lastEraseTime = 0;
    }
    
    activate() {
        super.activate();
        this.setupEraserCursor();
        console.log('🧹 Ластик активирован, размер:', this.eraserSize);
    }
    
    deactivate() {
        super.deactivate();
        this.hidePreviewCursor();
    }
    
    onMouseDown(pos, event) {
        console.log('🧹 Начало стирания в позиции:', pos);
        this.isErasing = true;
        this.erasedObjects = []; // Сброс для новой операции стирания
        this.eraseAt(pos);
        
        // Отправка события начала стирания
        this.board.emit('eraseStart', { pos, eraserSize: this.eraserSize });
    }
    
    onMouseMove(pos, event) {
        // Показ preview курсора всегда
        this.showPreviewCursor(pos);
        
        if (!this.isErasing) return;
        
        // Throttling для производительности
        const now = performance.now();
        if (now - this.lastEraseTime < this.throttleInterval) {
            return;
        }
        this.lastEraseTime = now;
        
        this.eraseAt(pos);
    }
    
    onMouseUp(pos, event) {
        if (!this.isErasing) return;
        
        console.log('🧹 Завершение стирания, удалено объектов:', this.erasedObjects.length);
        this.isErasing = false;
        
        // Отправка события завершения стирания для синхронизации
        if (this.erasedObjects.length > 0) {
            this.board.emit('eraseComplete', { 
                erasedObjects: this.erasedObjects.slice(),
                eraserSize: this.eraserSize,
                mode: this.eraserMode
            });
            
            // Отправка через синхронизацию
            this.board.sendDrawingOperation({
                type: 'erase_complete',
                erasedObjects: this.erasedObjects.slice(),
                eraserSize: this.eraserSize
            });
        }
        
        // Добавление в историю для undo/redo
        if (this.erasedObjects.length > 0) {
            this.board.addToHistory({
                type: 'erase',
                objects: this.erasedObjects.slice()
            });
        }
    }
    
    eraseAt(pos) {
        const eraserRadius = this.eraserSize / 2;
        const objectsToRemove = [];
        
        // Проверка пересечения с объектами в зависимости от режима
        this.board.objects.forEach((object, id) => {
            if (this.intersectsWithEraser(object, pos, eraserRadius)) {
                if (this.eraserMode === 'stroke' && object.type === 'stroke') {
                    // Для штрихов - частичное стирание по сегментам
                    this.eraseStrokeSegments(object, pos, eraserRadius);
                } else {
                    // Полное удаление объекта
                    objectsToRemove.push(id);
                    this.erasedObjects.push({
                        id: id,
                        object: object,
                        action: 'removed'
                    });
                }
            }
        });
        
        // Удаление объектов
        if (objectsToRemove.length > 0) {
            objectsToRemove.forEach(id => {
                this.board.objects.delete(id);
            });
            
            // Немедленный рендеринг
            this.board.render();
            
            // Отправка операции стирания для real-time синхронизации
            this.board.sendDrawingOperation({
                type: 'erase_operation',
                objectIds: objectsToRemove,
                position: pos,
                eraserSize: this.eraserSize
            });
        }
    }
    
    // Улучшенное частичное стирание штрихов
    eraseStrokeSegments(stroke, eraserPos, eraserRadius) {
        if (!stroke.points || stroke.points.length < 2) return;
        
        const newSegments = [];
        let currentSegment = [];
        
        for (let i = 0; i < stroke.points.length; i++) {
            const point = stroke.points[i];
            const distance = Math.sqrt(
                Math.pow(point.x - eraserPos.x, 2) +
                Math.pow(point.y - eraserPos.y, 2)
            );
            
            if (distance > eraserRadius + stroke.brushSize / 2) {
                // Точка вне зоны стирания
                currentSegment.push(point);
            } else {
                // Точка в зоне стирания
                if (currentSegment.length > 1) {
                    // Сохраняем текущий сегмент как новый штрих
                    newSegments.push(currentSegment);
                }
                currentSegment = [];
            }
        }
        
        // Добавляем последний сегмент
        if (currentSegment.length > 1) {
            newSegments.push(currentSegment);
        }
        
        if (newSegments.length > 0) {
            // Удаляем оригинальный штрих
            this.board.objects.delete(stroke.id);
            this.erasedObjects.push({
                id: stroke.id,
                object: stroke,
                action: 'segmented'
            });
            
            // Добавляем новые сегменты
            newSegments.forEach((segment, index) => {
                const newStroke = {
                    ...stroke,
                    id: stroke.id + '_segment_' + index,
                    points: segment
                };
                this.board.objects.set(newStroke.id, newStroke);
                this.erasedObjects.push({
                    id: newStroke.id,
                    object: newStroke,
                    action: 'created'
                });
            });
        } else {
            // Весь штрих стерт
            this.board.objects.delete(stroke.id);
            this.erasedObjects.push({
                id: stroke.id,
                object: stroke,
                action: 'removed'
            });
        }
    }
    
    // Настройка курсора ластика
    setupEraserCursor() {
        // Создаем canvas для кастомного курсора
        const cursorCanvas = document.createElement('canvas');
        const size = Math.max(this.eraserSize, 16);
        cursorCanvas.width = size;
        cursorCanvas.height = size;
        
        const ctx = cursorCanvas.getContext('2d');
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(size/2, size/2, size/2 - 2, 0, Math.PI * 2);
        ctx.stroke();
        
        // Крестик в центре
        ctx.beginPath();
        ctx.moveTo(size/2 - 4, size/2);
        ctx.lineTo(size/2 + 4, size/2);
        ctx.moveTo(size/2, size/2 - 4);
        ctx.lineTo(size/2, size/2 + 4);
        ctx.stroke();
        
        const cursorUrl = cursorCanvas.toDataURL();
        this.board.canvas.style.cursor = `url(${cursorUrl}) ${size/2} ${size/2}, crosshair`;
    }
    
    // Показ preview курсора
    showPreviewCursor(pos) {
        if (!this.previewCursor) {
            this.previewCursor = document.createElement('div');
            this.previewCursor.style.position = 'fixed';
            this.previewCursor.style.border = '2px solid rgba(255, 0, 0, 0.7)';
            this.previewCursor.style.borderRadius = '50%';
            this.previewCursor.style.pointerEvents = 'none';
            this.previewCursor.style.zIndex = '10000';
            this.previewCursor.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
            document.body.appendChild(this.previewCursor);
        }
        
        const rect = this.board.canvas.getBoundingClientRect();
        const screenPos = {
            x: rect.left + pos.x * this.board.state.zoom + this.board.state.panX,
            y: rect.top + pos.y * this.board.state.zoom + this.board.state.panY
        };
        
        const size = this.eraserSize * this.board.state.zoom;
        this.previewCursor.style.width = size + 'px';
        this.previewCursor.style.height = size + 'px';
        this.previewCursor.style.left = (screenPos.x - size/2) + 'px';
        this.previewCursor.style.top = (screenPos.y - size/2) + 'px';
        this.previewCursor.style.display = 'block';
    }
    
    // Скрытие preview курсора
    hidePreviewCursor() {
        if (this.previewCursor) {
            this.previewCursor.style.display = 'none';
        }
    }
    
    // Установка размера ластика
    setEraserSize(size) {
        this.eraserSize = Math.max(5, Math.min(100, size));
        this.setupEraserCursor();
        console.log('🧹 Размер ластика изменен на:', this.eraserSize);
    }
    
    // Установка режима ластика
    setEraserMode(mode) {
        if (['stroke', 'pixel', 'object'].includes(mode)) {
            this.eraserMode = mode;
            console.log('🧹 Режим ластика изменен на:', mode);
        }
    }
    
    intersectsWithEraser(object, eraserPos, eraserRadius) {
        switch (object.type) {
            case 'stroke':
                // Проверка пересечения с точками линии
                return object.points.some(point => {
                    const distance = Math.sqrt(
                        Math.pow(point.x - eraserPos.x, 2) +
                        Math.pow(point.y - eraserPos.y, 2)
                    );
                    return distance <= eraserRadius + object.brushSize / 2;
                });
                
            case 'shape':
                // Проверка пересечения с фигурой
                const bounds = this.board.modules.renderer.getObjectBounds(object);
                return this.rectCircleIntersection(bounds, eraserPos, eraserRadius);
                
            default:
                return false;
        }
    }
    
    rectCircleIntersection(rect, circle, radius) {
        const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
        const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
        
        const distance = Math.sqrt(
            Math.pow(closestX - circle.x, 2) +
            Math.pow(closestY - circle.y, 2)
        );
        
        return distance <= radius;
    }
}

// Инструмент фигур
class ShapeTool extends BaseTool {
    constructor(board) {
        super(board);
        this.cursor = 'crosshair';
        this.currentShape = null;
        this.isDrawing = false;
        this.startPos = null;
        this.shapeType = 'rectangle'; // rectangle, circle, triangle, polygon
    }
    
    setShapeType(type) {
        this.shapeType = type;
    }
    
    onMouseDown(pos, event) {
        this.isDrawing = true;
        this.startPos = pos;
        
        // Создание новой фигуры
        this.currentShape = {
            type: 'shape',
            shapeType: this.shapeType,
            x: pos.x,
            y: pos.y,
            width: 0,
            height: 0,
            color: this.board.state.selectedColor,
            strokeColor: this.board.state.selectedColor,
            fillColor: event.shiftKey ? this.board.state.selectedColor : null,
            strokeWidth: this.board.state.brushSize,
            opacity: this.board.state.opacity,
            timestamp: Date.now()
        };
        
        if (this.shapeType === 'circle') {
            this.currentShape.radius = 0;
        }
    }
    
    onMouseMove(pos, event) {
        if (!this.isDrawing || !this.currentShape) return;
        
        const dx = pos.x - this.startPos.x;
        const dy = pos.y - this.startPos.y;
        
        // Удерживание Shift для пропорциональных фигур
        if (event.shiftKey) {
            const size = Math.max(Math.abs(dx), Math.abs(dy));
            this.currentShape.width = dx < 0 ? -size : size;
            this.currentShape.height = dy < 0 ? -size : size;
        } else {
            this.currentShape.width = dx;
            this.currentShape.height = dy;
        }
        
        if (this.shapeType === 'circle') {
            this.currentShape.radius = Math.sqrt(dx * dx + dy * dy);
        }
        
        // Временный рендер
        this.board.render();
        this.renderTempShape();
    }
    
    onMouseUp(pos, event) {
        if (!this.isDrawing || !this.currentShape) return;
        
        this.isDrawing = false;
        
        // Нормализация координат для отрицательных размеров
        if (this.currentShape.width < 0) {
            this.currentShape.x += this.currentShape.width;
            this.currentShape.width = Math.abs(this.currentShape.width);
        }
        
        if (this.currentShape.height < 0) {
            this.currentShape.y += this.currentShape.height;
            this.currentShape.height = Math.abs(this.currentShape.height);
        }
        
        // Добавление фигуры на доску
        if (this.currentShape.width > 5 || this.currentShape.height > 5 || 
            (this.shapeType === 'circle' && this.currentShape.radius > 5)) {
            this.board.addObject(this.currentShape);
        }
        
        this.currentShape = null;
    }
    
    renderTempShape() {
        if (!this.currentShape) return;
        
        const ctx = this.board.ctx;
        ctx.save();
        
        // Применение трансформаций
        ctx.translate(this.board.state.panX, this.board.state.panY);
        ctx.scale(this.board.state.zoom, this.board.state.zoom);
        
        // Стиль линии
        ctx.strokeStyle = this.currentShape.strokeColor;
        ctx.lineWidth = this.currentShape.strokeWidth;
        ctx.globalAlpha = this.currentShape.opacity;
        
        if (this.currentShape.fillColor) {
            ctx.fillStyle = this.currentShape.fillColor;
        }
        
        // Рисование фигуры
        switch (this.shapeType) {
            case 'rectangle':
                if (this.currentShape.fillColor) {
                    ctx.fillRect(
                        this.currentShape.x,
                        this.currentShape.y,
                        this.currentShape.width,
                        this.currentShape.height
                    );
                }
                ctx.strokeRect(
                    this.currentShape.x,
                    this.currentShape.y,
                    this.currentShape.width,
                    this.currentShape.height
                );
                break;
                
            case 'circle':
                ctx.beginPath();
                ctx.arc(
                    this.currentShape.x,
                    this.currentShape.y,
                    this.currentShape.radius,
                    0,
                    Math.PI * 2
                );
                if (this.currentShape.fillColor) {
                    ctx.fill();
                }
                ctx.stroke();
                break;
                
            case 'triangle':
                ctx.beginPath();
                ctx.moveTo(
                    this.currentShape.x + this.currentShape.width / 2,
                    this.currentShape.y
                );
                ctx.lineTo(
                    this.currentShape.x,
                    this.currentShape.y + this.currentShape.height
                );
                ctx.lineTo(
                    this.currentShape.x + this.currentShape.width,
                    this.currentShape.y + this.currentShape.height
                );
                ctx.closePath();
                if (this.currentShape.fillColor) {
                    ctx.fill();
                }
                ctx.stroke();
                break;
        }
        
        ctx.restore();
    }
}

// Инструмент стрелок
class ArrowTool extends BaseTool {
    constructor(board) {
        super(board);
        this.cursor = 'crosshair';
        this.currentArrow = null;
        this.isDrawing = false;
        this.startPos = null;
    }
    
    onMouseDown(pos, event) {
        this.isDrawing = true;
        this.startPos = pos;
        
        // Создание новой стрелки
        this.currentArrow = {
            type: 'shape',
            shapeType: 'arrow',
            x1: pos.x,
            y1: pos.y,
            x2: pos.x,
            y2: pos.y,
            color: this.board.state.selectedColor,
            strokeWidth: this.board.state.brushSize,
            headSize: this.board.state.brushSize * 5,
            opacity: this.board.state.opacity,
            timestamp: Date.now()
        };
    }
    
    onMouseMove(pos, event) {
        if (!this.isDrawing || !this.currentArrow) return;
        
        this.currentArrow.x2 = pos.x;
        this.currentArrow.y2 = pos.y;
        
        // Удерживание Shift для прямых линий
        if (event.shiftKey) {
            const dx = pos.x - this.startPos.x;
            const dy = pos.y - this.startPos.y;
            const angle = Math.atan2(dy, dx);
            
            // Привязка к углам 0, 45, 90, 135, 180, 225, 270, 315
            const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            this.currentArrow.x2 = this.startPos.x + Math.cos(snapAngle) * distance;
            this.currentArrow.y2 = this.startPos.y + Math.sin(snapAngle) * distance;
        }
        
        // Временный рендер
        this.board.render();
        this.renderTempArrow();
    }
    
    onMouseUp(pos, event) {
        if (!this.isDrawing || !this.currentArrow) return;
        
        this.isDrawing = false;
        
        // Добавление стрелки на доску
        const distance = Math.sqrt(
            Math.pow(this.currentArrow.x2 - this.currentArrow.x1, 2) +
            Math.pow(this.currentArrow.y2 - this.currentArrow.y1, 2)
        );
        
        if (distance > 10) {
            this.board.addObject(this.currentArrow);
        }
        
        this.currentArrow = null;
    }
    
    renderTempArrow() {
        if (!this.currentArrow) return;
        
        const ctx = this.board.ctx;
        ctx.save();
        
        // Применение трансформаций
        ctx.translate(this.board.state.panX, this.board.state.panY);
        ctx.scale(this.board.state.zoom, this.board.state.zoom);
        
        // Рендер стрелки
        this.board.modules.renderer.renderArrow(this.currentArrow, ctx);
        
        ctx.restore();
    }
}

// Инструмент текста
class TextTool extends BaseTool {
    constructor(board) {
        super(board);
        this.cursor = 'text';
        this.editingText = null;
        this.textInput = null;
    }
    
    onMouseDown(pos, event) {
        // Создание текстового объекта
        const textObject = {
            type: 'text',
            x: pos.x,
            y: pos.y,
            content: '',
            color: this.board.state.selectedColor,
            fontSize: 16,
            fontFamily: 'Arial',
            opacity: this.board.state.opacity,
            timestamp: Date.now()
        };
        
        // Создание input элемента для редактирования
        this.createTextInput(textObject);
    }
    
    createTextInput(textObject) {
        // Создание textarea для ввода текста
        const textarea = document.createElement('textarea');
        textarea.style.position = 'absolute';
        textarea.style.background = 'rgba(255, 255, 255, 0.9)';
        textarea.style.border = '2px solid #007AFF';
        textarea.style.borderRadius = '4px';
        textarea.style.padding = '8px';
        textarea.style.fontSize = textObject.fontSize + 'px';
        textarea.style.fontFamily = textObject.fontFamily;
        textarea.style.color = textObject.color;
        textarea.style.minWidth = '200px';
        textarea.style.minHeight = '50px';
        textarea.style.resize = 'both';
        textarea.style.outline = 'none';
        
        // Позиционирование
        const rect = this.board.canvas.getBoundingClientRect();
        const screenPos = this.board.worldToScreen(textObject.x, textObject.y);
        textarea.style.left = (rect.left + screenPos.x) + 'px';
        textarea.style.top = (rect.top + screenPos.y) + 'px';
        
        // Добавление в документ
        document.body.appendChild(textarea);
        textarea.focus();
        
        // Обработчики событий
        textarea.addEventListener('blur', () => {
            if (textarea.value.trim()) {
                textObject.content = textarea.value;
                textObject.width = textarea.offsetWidth / this.board.state.zoom;
                textObject.height = textarea.offsetHeight / this.board.state.zoom;
                this.board.addObject(textObject);
            }
            document.body.removeChild(textarea);
            this.textInput = null;
        });
        
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(textarea);
                this.textInput = null;
            }
        });
        
        this.textInput = textarea;
        this.editingText = textObject;
    }
    
    worldToScreen(x, y) {
        return {
            x: x * this.board.state.zoom + this.board.state.panX,
            y: y * this.board.state.zoom + this.board.state.panY
        };
    }
}

// Инструмент выбора
class SelectTool extends BaseTool {
    constructor(board) {
        super(board);
        this.cursor = 'default';
        this.isSelecting = false;
        this.isDragging = false;
        this.selectionStart = null;
        this.selectionBox = null;
        this.dragStart = null;
        this.originalPositions = new Map();
    }
    
    onMouseDown(pos, event) {
        // Проверка клика по объекту
        const clickedObject = this.getObjectAt(pos);
        
        if (clickedObject) {
            // Клик по объекту
            if (!this.board.selectedObjects.has(clickedObject.id)) {
                // Выбор объекта
                if (!event.shiftKey) {
                    this.board.selectedObjects.clear();
                }
                this.board.selectedObjects.add(clickedObject.id);
            }
            
            // Начало перетаскивания
            this.startDragging(pos);
        } else {
            // Клик по пустому месту - начало выделения
            if (!event.shiftKey) {
                this.board.selectedObjects.clear();
            }
            this.startSelection(pos);
        }
        
        this.board.render();
    }
    
    onMouseMove(pos, event) {
        if (this.isSelecting) {
            // Обновление рамки выделения
            this.updateSelection(pos);
        } else if (this.isDragging) {
            // Перетаскивание выбранных объектов
            this.dragObjects(pos);
        } else {
            // Изменение курсора при наведении
            const object = this.getObjectAt(pos);
            this.board.canvas.style.cursor = object ? 'move' : 'default';
        }
    }
    
    onMouseUp(pos, event) {
        if (this.isSelecting) {
            this.endSelection();
        } else if (this.isDragging) {
            this.endDragging();
        }
    }
    
    getObjectAt(pos) {
        // Поиск объекта в позиции (в обратном порядке для верхних объектов)
        const objects = Array.from(this.board.objects.values()).reverse();
        
        for (const object of objects) {
            if (this.pointInObject(pos, object)) {
                return object;
            }
        }
        
        return null;
    }
    
    pointInObject(point, object) {
        const bounds = this.board.modules.renderer.getObjectBounds(object);
        
        return point.x >= bounds.x &&
               point.x <= bounds.x + bounds.width &&
               point.y >= bounds.y &&
               point.y <= bounds.y + bounds.height;
    }
    
    startSelection(pos) {
        this.isSelecting = true;
        this.selectionStart = pos;
        this.selectionBox = {
            x: pos.x,
            y: pos.y,
            width: 0,
            height: 0
        };
    }
    
    updateSelection(pos) {
        if (!this.selectionBox) return;
        
        this.selectionBox.width = pos.x - this.selectionStart.x;
        this.selectionBox.height = pos.y - this.selectionStart.y;
        
        // Выбор объектов в рамке
        const normalizedBox = this.normalizeBox(this.selectionBox);
        
        this.board.objects.forEach((object, id) => {
            const bounds = this.board.modules.renderer.getObjectBounds(object);
            
            if (this.boxIntersection(normalizedBox, bounds)) {
                this.board.selectedObjects.add(id);
            } else if (!event.shiftKey) {
                this.board.selectedObjects.delete(id);
            }
        });
        
        // Рендер с рамкой выделения
        this.board.render();
        this.renderSelectionBox();
    }
    
    endSelection() {
        this.isSelecting = false;
        this.selectionBox = null;
        this.board.render();
    }
    
    startDragging(pos) {
        this.isDragging = true;
        this.dragStart = pos;
        
        // Сохранение исходных позиций
        this.originalPositions.clear();
        this.board.selectedObjects.forEach(id => {
            const object = this.board.objects.get(id);
            if (object) {
                this.originalPositions.set(id, this.getObjectPosition(object));
            }
        });
    }
    
    dragObjects(pos) {
        const dx = pos.x - this.dragStart.x;
        const dy = pos.y - this.dragStart.y;
        
        // Перемещение выбранных объектов
        this.board.selectedObjects.forEach(id => {
            const object = this.board.objects.get(id);
            const originalPos = this.originalPositions.get(id);
            
            if (object && originalPos) {
                this.moveObject(object, originalPos.x + dx, originalPos.y + dy);
            }
        });
        
        this.board.render();
    }
    
    endDragging() {
        this.isDragging = false;
        
        // Добавление в историю
        const movedObjects = [];
        this.board.selectedObjects.forEach(id => {
            const object = this.board.objects.get(id);
            if (object) {
                movedObjects.push({
                    id: id,
                    oldPosition: this.originalPositions.get(id),
                    newPosition: this.getObjectPosition(object)
                });
            }
        });
        
        if (movedObjects.length > 0) {
            this.board.addToHistory({
                type: 'move',
                objects: movedObjects
            });
        }
    }
    
    getObjectPosition(object) {
        switch (object.type) {
            case 'stroke':
                return { x: object.points[0].x, y: object.points[0].y };
            case 'shape':
            case 'text':
            case 'image':
            case 'formula':
                return { x: object.x, y: object.y };
            default:
                return { x: 0, y: 0 };
        }
    }
    
    moveObject(object, newX, newY) {
        const pos = this.getObjectPosition(object);
        const dx = newX - pos.x;
        const dy = newY - pos.y;
        
        switch (object.type) {
            case 'stroke':
                object.points.forEach(point => {
                    point.x += dx;
                    point.y += dy;
                });
                break;
                
            case 'shape':
                if (object.shapeType === 'arrow') {
                    object.x1 += dx;
                    object.y1 += dy;
                    object.x2 += dx;
                    object.y2 += dy;
                } else {
                    object.x += dx;
                    object.y += dy;
                }
                break;
                
            case 'text':
            case 'image':
            case 'formula':
                object.x += dx;
                object.y += dy;
                break;
        }
    }
    
    normalizeBox(box) {
        return {
            x: Math.min(box.x, box.x + box.width),
            y: Math.min(box.y, box.y + box.height),
            width: Math.abs(box.width),
            height: Math.abs(box.height)
        };
    }
    
    boxIntersection(box1, box2) {
        return !(box1.x + box1.width < box2.x ||
                 box2.x + box2.width < box1.x ||
                 box1.y + box1.height < box2.y ||
                 box2.y + box2.height < box1.y);
    }
    
    renderSelectionBox() {
        if (!this.selectionBox) return;
        
        const ctx = this.board.ctx;
        ctx.save();
        
        // Применение трансформаций
        ctx.translate(this.board.state.panX, this.board.state.panY);
        ctx.scale(this.board.state.zoom, this.board.state.zoom);
        
        // Стиль рамки
        ctx.strokeStyle = '#007AFF';
        ctx.lineWidth = 1 / this.board.state.zoom;
        ctx.setLineDash([5 / this.board.state.zoom, 5 / this.board.state.zoom]);
        ctx.fillStyle = 'rgba(0, 122, 255, 0.1)';
        
        // Рисование рамки
        ctx.fillRect(
            this.selectionBox.x,
            this.selectionBox.y,
            this.selectionBox.width,
            this.selectionBox.height
        );
        ctx.strokeRect(
            this.selectionBox.x,
            this.selectionBox.y,
            this.selectionBox.width,
            this.selectionBox.height
        );
        
        ctx.restore();
    }
}

// Лазерная указка
class LaserPointerTool extends BaseTool {
    constructor(board) {
        super(board);
        this.cursor = 'crosshair';
        this.isPointing = false;
        this.trail = [];
        this.maxTrailLength = 20;
        this.fadeTime = 1000; // мс
    }
    
    onMouseDown(pos, event) {
        this.isPointing = true;
        this.trail = [{ ...pos, timestamp: Date.now() }];
        
        // Отправка события для синхронизации
        this.board.emit('laserStart', pos);
    }
    
    onMouseMove(pos, event) {
        if (!this.isPointing) return;
        
        // Добавление точки в след
        this.trail.push({ ...pos, timestamp: Date.now() });
        
        // Ограничение длины следа
        if (this.trail.length > this.maxTrailLength) {
            this.trail.shift();
        }
        
        // Отправка события
        this.board.emit('laserMove', pos);
        
        // Рендер
        this.board.render();
        this.renderLaserTrail();
    }
    
    onMouseUp(pos, event) {
        this.isPointing = false;
        
        // Отправка события
        this.board.emit('laserEnd', pos);
        
        // Анимация исчезновения
        this.fadeOutTrail();
    }
    
    renderLaserTrail() {
        if (this.trail.length < 2) return;
        
        const ctx = this.board.ctx;
        ctx.save();
        
        // Применение трансформаций
        ctx.translate(this.board.state.panX, this.board.state.panY);
        ctx.scale(this.board.state.zoom, this.board.state.zoom);
        
        const now = Date.now();
        
        // Рисование следа
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        for (let i = 1; i < this.trail.length; i++) {
            const point1 = this.trail[i - 1];
            const point2 = this.trail[i];
            
            // Расчёт прозрачности на основе времени
            const age = now - point1.timestamp;
            const opacity = Math.max(0, 1 - age / this.fadeTime);
            
            if (opacity > 0) {
                ctx.beginPath();
                ctx.moveTo(point1.x, point1.y);
                ctx.lineTo(point2.x, point2.y);
                
                // Градиент для эффекта лазера
                const gradient = ctx.createLinearGradient(
                    point1.x, point1.y, point2.x, point2.y
                );
                gradient.addColorStop(0, `rgba(255, 0, 0, ${opacity * 0.8})`);
                gradient.addColorStop(0.5, `rgba(255, 100, 100, ${opacity})`);
                gradient.addColorStop(1, `rgba(255, 0, 0, ${opacity * 0.8})`);
                
                ctx.strokeStyle = gradient;
                ctx.lineWidth = 3 + i / this.trail.length * 2;
                ctx.stroke();
            }
        }
        
        // Светящаяся точка в конце
        if (this.trail.length > 0) {
            const lastPoint = this.trail[this.trail.length - 1];
            const gradient = ctx.createRadialGradient(
                lastPoint.x, lastPoint.y, 0,
                lastPoint.x, lastPoint.y, 10
            );
            gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
            gradient.addColorStop(0.5, 'rgba(255, 100, 100, 0.8)');
            gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(lastPoint.x, lastPoint.y, 10, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
    
    fadeOutTrail() {
        const fadeInterval = setInterval(() => {
            const now = Date.now();
            
            // Удаление старых точек
            this.trail = this.trail.filter(point => 
                now - point.timestamp < this.fadeTime
            );
            
            if (this.trail.length === 0) {
                clearInterval(fadeInterval);
            } else {
                this.board.render();
                this.renderLaserTrail();
            }
        }, 50);
    }
}

// Инструмент изображений
class ImageTool extends BaseTool {
    constructor(board) {
        super(board);
        this.cursor = 'crosshair';
    }
    
    onMouseDown(pos, event) {
        // Создание input для выбора файла
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.loadImage(file, pos);
            }
        };
        
        input.click();
    }
    
    loadImage(file, position) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            
            img.onload = () => {
                // Создание объекта изображения
                const imageObject = {
                    type: 'image',
                    x: position.x,
                    y: position.y,
                    width: img.width,
                    height: img.height,
                    originalWidth: img.width,
                    originalHeight: img.height,
                    element: img,
                    src: e.target.result,
                    opacity: this.board.state.opacity,
                    timestamp: Date.now()
                };
                
                // Масштабирование если слишком большое
                const maxSize = 500;
                if (img.width > maxSize || img.height > maxSize) {
                    const scale = maxSize / Math.max(img.width, img.height);
                    imageObject.width *= scale;
                    imageObject.height *= scale;
                }
                
                // Добавление на доску
                this.board.addObject(imageObject);
            };
            
            img.src = e.target.result;
        };
        
        reader.readAsDataURL(file);
    }
}

// Инструмент математических формул
class FormulaTool extends BaseTool {
    constructor(board) {
        super(board);
        this.cursor = 'text';
    }
    
    onMouseDown(pos, event) {
        // Создание диалога для ввода формулы
        this.showFormulaDialog(pos);
    }
    
    showFormulaDialog(position) {
        // Создание модального окна
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            z-index: 10000;
            min-width: 400px;
        `;
        
        modal.innerHTML = `
            <h3 style="margin: 0 0 15px 0;">Введите математическую формулу (LaTeX)</h3>
            <textarea id="formulaInput" style="width: 100%; height: 100px; font-family: monospace; margin-bottom: 10px;" placeholder="\\frac{a}{b} = \\sqrt{c^2 + d^2}"></textarea>
            <div id="formulaPreview" style="min-height: 50px; border: 1px solid #ddd; padding: 10px; margin-bottom: 15px; text-align: center;"></div>
            <div style="text-align: right;">
                <button id="cancelFormula" style="margin-right: 10px; padding: 8px 16px;">Отмена</button>
                <button id="insertFormula" style="padding: 8px 16px; background: #007AFF; color: white; border: none; border-radius: 4px;">Вставить</button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        const input = document.getElementById('formulaInput');
        const preview = document.getElementById('formulaPreview');
        const cancelBtn = document.getElementById('cancelFormula');
        const insertBtn = document.getElementById('insertFormula');
        
        // Обновление превью
        const updatePreview = () => {
            try {
                // Используем KaTeX для рендеринга
                if (window.katex) {
                    preview.innerHTML = '';
                    katex.render(input.value, preview, {
                        throwOnError: false,
                        displayMode: true
                    });
                } else {
                    preview.innerHTML = '<em>KaTeX не загружен</em>';
                }
            } catch (e) {
                preview.innerHTML = '<em style="color: red;">Ошибка в формуле</em>';
            }
        };
        
        input.addEventListener('input', updatePreview);
        
        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(modal);
        });
        
        insertBtn.addEventListener('click', () => {
            if (input.value.trim()) {
                this.createFormula(input.value, position);
            }
            document.body.removeChild(modal);
        });
        
        // Загрузка KaTeX если не загружен
        if (!window.katex) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.css';
            document.head.appendChild(link);
            
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.js';
            script.onload = updatePreview;
            document.head.appendChild(script);
        }
        
        input.focus();
    }
    
    createFormula(latex, position) {
        // Создание временного элемента для рендеринга
        const tempDiv = document.createElement('div');
        tempDiv.style.position = 'absolute';
        tempDiv.style.visibility = 'hidden';
        document.body.appendChild(tempDiv);
        
        // Рендеринг формулы
        katex.render(latex, tempDiv, {
            throwOnError: false,
            displayMode: true
        });
        
        // Создание canvas для формулы
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Получение размеров
        const rect = tempDiv.getBoundingClientRect();
        const scale = 2; // Для высокого разрешения
        canvas.width = rect.width * scale;
        canvas.height = rect.height * scale;
        
        // Рендеринг в canvas
        ctx.scale(scale, scale);
        ctx.fillStyle = this.board.state.selectedColor;
        
        // Конвертация HTML в изображение (упрощённая версия)
        // В реальности нужно использовать html2canvas или подобную библиотеку
        
        // Создание объекта формулы
        const formulaObject = {
            type: 'formula',
            x: position.x,
            y: position.y,
            width: rect.width,
            height: rect.height,
            latex: latex,
            color: this.board.state.selectedColor,
            opacity: this.board.state.opacity,
            timestamp: Date.now()
        };
        
        // Добавление на доску
        this.board.addObject(formulaObject);
        
        // Очистка
        document.body.removeChild(tempDiv);
    }
}

// Экспорт классов
window.ToolsManager = ToolsManager;
window.BaseTool = BaseTool;
window.PenTool = PenTool;
window.HighlighterTool = HighlighterTool;
window.EraserTool = EraserTool;
window.ShapeTool = ShapeTool;
window.ArrowTool = ArrowTool;
window.TextTool = TextTool;
window.SelectTool = SelectTool;
window.LaserPointerTool = LaserPointerTool;
window.ImageTool = ImageTool;
window.FormulaTool = FormulaTool;
