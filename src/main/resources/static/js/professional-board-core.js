// Professional Board Core - Профессиональная архитектура доски
// Модульная структура с поддержкой WebGL и Canvas2D

class ProfessionalBoard {
    constructor(canvasId, options = {}) {
        console.log('🔧 === КОНСТРУКТОР PROFESSIONALBOARD ===');
        console.log('  - canvasId:', canvasId);
        console.log('  - options:', options);
        
        this.canvas = document.getElementById(canvasId);
        console.log('  - canvas element найден:', !!this.canvas);
        if (this.canvas) {
            console.log('  - canvas размеры:', this.canvas.offsetWidth, 'x', this.canvas.offsetHeight);
        }
        
        this.ctx = null;
        this.webglSupported = this.checkWebGLSupport();
        console.log('  - WebGL поддержка:', this.webglSupported);
        
        // Конфигурация
        this.config = {
            renderer: options.renderer || (this.webglSupported ? 'webgl' : 'canvas2d'),
            width: options.width || 10000,
            height: options.height || 10000,
            backgroundColor: options.backgroundColor || '#ffffff',
            gridEnabled: options.gridEnabled || true,
            gridSize: options.gridSize || 20,
            snapToGrid: options.snapToGrid || false,
            antialiasing: options.antialiasing !== false,
            maxHistorySize: options.maxHistorySize || 100,
            virtualScrolling: options.virtualScrolling !== false,
            ...options
        };
        
        // Состояние доски
        this.state = {
            zoom: 1,
            panX: 0,
            panY: 0,
            rotation: 0,
            selectedTool: 'pen',
            selectedColor: '#000000',
            brushSize: 3,
            opacity: 1,
            isDrawing: false,
            isPanning: false,
            isSelecting: false
        };
        
        // Данные
        this.layers = new Map();
        this.activeLayerId = null;
        this.objects = new Map();
        this.selectedObjects = new Set();
        this.history = [];
        this.historyIndex = -1;
        
        // Модули
        this.modules = {
            renderer: null,
            tools: null,
            layers: null,
            history: null,
            export: null,
            collaboration: null,
            formula: null,
            recognition: null
        };
        
        // События
        this.eventListeners = new Map();
        
        // Инициализация
        console.log('🚀 Запуск инициализации...');
        this.init();
        console.log('✅ === КОНСТРУКТОР PROFESSIONALBOARD ЗАВЕРШЕН ===');
    }
    
    // Проверка поддержки WebGL
    checkWebGLSupport() {
        try {
            const testCanvas = document.createElement('canvas');
            return !!(window.WebGLRenderingContext && 
                     (testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl')));
        } catch (e) {
            return false;
        }
    }
    
    // Инициализация доски
    init() {
        console.log('🔧 === ИНИЦИАЛИЗАЦИЯ PROFESSIONAL BOARD ===');
        
        // Настройка canvas
        console.log('1️⃣ Настройка canvas...');
        this.setupCanvas();
        console.log('✅ Canvas настроен');
        
        // Инициализация рендерера
        console.log('2️⃣ Инициализация рендерера...');
        this.initRenderer();
        console.log('✅ Рендерер инициализирован:', !!this.modules.renderer);
        
        // Инициализация модулей
        console.log('3️⃣ Инициализация модулей...');
        this.initModules();
        console.log('✅ Модули инициализированы:', Object.keys(this.modules));
        
        // Создание первого слоя
        console.log('4️⃣ Создание первого слоя...');
        this.createLayer('main', 'Основной слой');
        console.log('✅ Слой создан');
        
        // Настройка событий
        console.log('5️⃣ Настройка событий...');
        this.setupEventHandlers();
        console.log('✅ События настроены');
        
        // Первый рендер
        console.log('6️⃣ Первый рендер...');
        this.render();
        console.log('✅ Первый рендер выполнен');
        
        console.log('🎉 === PROFESSIONAL BOARD ИНИЦИАЛИЗИРОВАНА УСПЕШНО! ===');
        console.log('📊 Финальные размеры canvas:', this.canvas?.width, 'x', this.canvas?.height);
        console.log('📊 CSS размеры:', this.canvas?.style.width, 'x', this.canvas?.style.height);
    }
    
    // Настройка canvas
    setupCanvas() {
        // Установка размеров
        const container = this.canvas.parentElement;
        if (!container) {
            console.error('Контейнер canvas не найден!');
            return;
        }
        
        console.log('🔍 Контейнер canvas найден:', container);
        console.log('🔍 Контейнер classList:', container.classList.toString());
        
        // Получаем размеры контейнера
        const rect = container.getBoundingClientRect();
        console.log('📏 Размеры контейнера:', rect.width, 'x', rect.height);
        
        // Если контейнер имеет нулевые размеры, устанавливаем минимальные
        let width = rect.width || 800;
        let height = rect.height || 600;
        
        if (width === 0 || height === 0) {
            console.warn('⚠️ Контейнер имеет нулевые размеры, используем fallback');
            width = 800;
            height = 600;
        }
        
        // Стили
        this.canvas.style.touchAction = 'none';
        this.canvas.style.userSelect = 'none';
        
        // Поддержка Retina дисплеев
        const dpr = window.devicePixelRatio || 1;
        
        // Устанавливаем физические размеры canvas
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;
        
        // Устанавливаем CSS размеры
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        
        console.log('📐 Установлены размеры canvas: CSS', width + 'x' + height, 'физические', this.canvas.width + 'x' + this.canvas.height);
        
        if (this.config.renderer === 'canvas2d') {
            this.ctx = this.canvas.getContext('2d', {
                alpha: true,
                desynchronized: true,
                willReadFrequently: false
            });
            this.ctx.scale(dpr, dpr);
        }
        
        // Сохранение DPR для расчётов
        this.dpr = dpr;
        
        console.log('Canvas настроен:', this.canvas.width, 'x', this.canvas.height, 'DPR:', dpr);
    }
    
    // Инициализация рендерера
    initRenderer() {
        try {
            if (this.config.renderer === 'webgl' && typeof WebGLRenderer !== 'undefined') {
                this.modules.renderer = new WebGLRenderer(this);
            } else if (typeof Canvas2DRenderer !== 'undefined') {
                this.modules.renderer = new Canvas2DRenderer(this);
            } else {
                console.error('Ни один рендерер не найден!');
                throw new Error('Рендереры не загружены');
            }
        } catch (error) {
            console.warn('Ошибка инициализации рендерера:', error);
            // Создаем простой fallback рендерер
            this.modules.renderer = {
                render: () => {
                    const ctx = this.ctx;
                    if (!ctx) return;
                    
                    // Очистка
                    ctx.fillStyle = this.config.backgroundColor;
                    ctx.fillRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);
                    
                    // Применение трансформаций
                    ctx.save();
                    ctx.translate(this.state.panX, this.state.panY);
                    ctx.scale(this.state.zoom, this.state.zoom);
                    
                    // Рендеринг объектов
                    this.objects.forEach(object => {
                        if (object.type === 'stroke' && object.points && object.points.length > 0) {
                            ctx.strokeStyle = object.color || '#000000';
                            ctx.lineWidth = object.brushSize || 3;
                            ctx.lineCap = 'round';
                            ctx.lineJoin = 'round';
                            ctx.beginPath();
                            ctx.moveTo(object.points[0].x, object.points[0].y);
                            for (let i = 1; i < object.points.length; i++) {
                                ctx.lineTo(object.points[i].x, object.points[i].y);
                            }
                            ctx.stroke();
                        }
                    });
                    
                    ctx.restore();
                },
                clear: () => {
                    const ctx = this.ctx;
                    if (ctx) {
                        ctx.clearRect(0, 0, this.canvas.width / this.dpr, this.canvas.height / this.dpr);
                    }
                },
                getObjectBounds: (object) => {
                    // Простая реализация для получения границ объекта
                    if (object.type === 'stroke' && object.points && object.points.length > 0) {
                        let minX = Infinity, minY = Infinity;
                        let maxX = -Infinity, maxY = -Infinity;
                        
                        object.points.forEach(point => {
                            minX = Math.min(minX, point.x);
                            minY = Math.min(minY, point.y);
                            maxX = Math.max(maxX, point.x);
                            maxY = Math.max(maxY, point.y);
                        });
                        
                        const padding = (object.brushSize || 3) / 2;
                        return {
                            x: minX - padding,
                            y: minY - padding,
                            width: maxX - minX + padding * 2,
                            height: maxY - minY + padding * 2
                        };
                    }
                    
                    return { x: 0, y: 0, width: 0, height: 0 };
                }
            };
        }
    }
    
    // Инициализация модулей
    initModules() {
        try {
            // Инструменты
            if (typeof ToolsManager !== 'undefined') {
                this.modules.tools = new ToolsManager(this);
            } else {
                console.warn('ToolsManager не найден');
            }
            
            // Слои
            if (typeof LayersManager !== 'undefined') {
                this.modules.layers = new LayersManager(this);
            } else {
                console.warn('LayersManager не найден');
            }
            
            // История
            if (typeof HistoryManager !== 'undefined') {
                this.modules.history = new HistoryManager(this);
            } else {
                console.warn('HistoryManager не найден');
            }
            
            // Экспорт
            if (typeof ExportManager !== 'undefined') {
                this.modules.export = new ExportManager(this);
            } else {
                console.warn('ExportManager не найден');
            }
            
            // Совместная работа
            if (typeof CollaborationManager !== 'undefined') {
                this.modules.collaboration = new CollaborationManager(this);
            } else {
                console.warn('CollaborationManager не найден');
            }
            
            // Математические формулы
            if (typeof FormulaManager !== 'undefined') {
                this.modules.formula = new FormulaManager(this);
            } else {
                console.warn('FormulaManager не найден');
            }
            
            // Распознавание
            if (typeof RecognitionManager !== 'undefined') {
                this.modules.recognition = new RecognitionManager(this);
            } else {
                console.warn('RecognitionManager не найден');
            }
        } catch (error) {
            console.error('Ошибка инициализации модулей:', error);
        }
    }
    
    // Настройка обработчиков событий
    setupEventHandlers() {
        // Мышь
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        
        // Касания
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Клавиатура
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Изменение размера
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // Контекстное меню
        this.canvas.addEventListener('contextmenu', this.handleContextMenu.bind(this));
    }
    
    // Создание слоя
    createLayer(id, name, options = {}) {
        const layer = {
            id,
            name,
            visible: options.visible !== false,
            locked: options.locked || false,
            opacity: options.opacity || 1,
            blendMode: options.blendMode || 'normal',
            objects: new Map(),
            order: this.layers.size
        };
        
        this.layers.set(id, layer);
        
        if (!this.activeLayerId) {
            this.activeLayerId = id;
        }
        
        this.emit('layerCreated', layer);
        return layer;
    }
    
    // Установка активного слоя
    setActiveLayer(layerId) {
        if (this.layers.has(layerId)) {
            this.activeLayerId = layerId;
            this.emit('activeLayerChanged', layerId);
        }
    }
    
    // Получение активного слоя
    getActiveLayer() {
        return this.layers.get(this.activeLayerId);
    }
    
    // Преобразование координат
    screenToWorld(x, y) {
        const rect = this.canvas.getBoundingClientRect();
        const sx = (x - rect.left);
        const sy = (y - rect.top);
        
        // Применение трансформаций
        const wx = (sx - this.state.panX) / this.state.zoom;
        const wy = (sy - this.state.panY) / this.state.zoom;
        
        // Учёт поворота
        if (this.state.rotation !== 0) {
            const cos = Math.cos(-this.state.rotation);
            const sin = Math.sin(-this.state.rotation);
            const cx = this.canvas.width / (2 * this.dpr);
            const cy = this.canvas.height / (2 * this.dpr);
            
            const dx = wx - cx;
            const dy = wy - cy;
            
            return {
                x: cx + dx * cos - dy * sin,
                y: cy + dx * sin + dy * cos
            };
        }
        
        return { x: wx, y: wy };
    }
    
    // Обработчики событий мыши
    handleMouseDown(e) {
        e.preventDefault();
        const worldPos = this.screenToWorld(e.clientX, e.clientY);
        
        if (e.button === 1 || (e.button === 0 && e.altKey)) {
            // Средняя кнопка или Alt+ЛКМ - панорамирование
            this.startPanning(e.clientX, e.clientY);
        } else if (e.button === 0) {
            // Левая кнопка - активный инструмент
            if (this.modules.tools && this.modules.tools.activeTool) {
                this.modules.tools.handleMouseDown(worldPos, e);
            }
        } else if (e.button === 2) {
            // Правая кнопка - контекстное меню
            e.preventDefault();
        }
        
        // Отправка события
        this.emit('mouseDown', { pos: worldPos, event: e });
    }
    
    handleMouseMove(e) {
        e.preventDefault();
        const worldPos = this.screenToWorld(e.clientX, e.clientY);
        
        if (this.state.isPanning) {
            this.updatePanning(e.clientX, e.clientY);
        } else {
            if (this.modules.tools && this.modules.tools.activeTool) {
                this.modules.tools.handleMouseMove(worldPos, e);
            }
        }
        
        // Обновление курсора позиции
        this.emit('cursorMove', worldPos);
        
        // Отправка позиции курсора для совместной работы
        if (this.modules.collaboration && this.modules.collaboration.isConnected) {
            this.modules.collaboration.broadcastCursorPosition(worldPos.x, worldPos.y);
        }
    }
    
    handleMouseUp(e) {
        e.preventDefault();
        const worldPos = this.screenToWorld(e.clientX, e.clientY);
        
        if (this.state.isPanning) {
            this.stopPanning();
        } else {
            if (this.modules.tools && this.modules.tools.activeTool) {
                this.modules.tools.handleMouseUp(worldPos, e);
            }
        }
    }
    
    // Обработка колеса мыши (зум)
    handleWheel(e) {
        e.preventDefault();
        
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const mousePos = this.screenToWorld(e.clientX, e.clientY);
        
        this.zoomAt(mousePos.x, mousePos.y, this.state.zoom * delta);
    }
    
    // Обработка касаний
    handleTouchStart(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            this.handleMouseDown({
                clientX: touch.clientX,
                clientY: touch.clientY,
                button: 0,
                preventDefault: () => {}
            });
        }
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        if (e.touches.length === 1) {
            const touch = e.touches[0];
            this.handleMouseMove({
                clientX: touch.clientX,
                clientY: touch.clientY,
                preventDefault: () => {}
            });
        }
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        this.handleMouseUp({
            preventDefault: () => {}
        });
    }
    
    // Обработка клавиатуры
    handleKeyDown(e) {
        // Передача события активному инструменту
        this.modules.tools.handleKeyDown(e);
        
        // Горячие клавиши
        switch (e.key.toLowerCase()) {
            case 'z':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this.undo();
                }
                break;
            case 'y':
                if (e.ctrlKey) {
                    e.preventDefault();
                    this.redo();
                }
                break;
            case 'delete':
            case 'backspace':
                e.preventDefault();
                // Удаление выбранных объектов
                break;
        }
    }
    
    handleKeyUp(e) {
        // Обработка отпускания клавиш
    }
    
    // Обработка контекстного меню
    handleContextMenu(e) {
        e.preventDefault();
        // Показ контекстного меню
    }
    
    // Панорамирование
    startPanning(x, y) {
        this.state.isPanning = true;
        this.lastPanX = x;
        this.lastPanY = y;
        this.canvas.style.cursor = 'grabbing';
    }
    
    updatePanning(x, y) {
        const dx = x - this.lastPanX;
        const dy = y - this.lastPanY;
        
        this.state.panX += dx * this.dpr;
        this.state.panY += dy * this.dpr;
        
        this.lastPanX = x;
        this.lastPanY = y;
        
        this.render();
    }
    
    stopPanning() {
        this.state.isPanning = false;
        this.canvas.style.cursor = 'default';
    }
    
    // Зум
    zoomAt(x, y, newZoom) {
        newZoom = Math.max(0.1, Math.min(10, newZoom));
        
        const scale = newZoom / this.state.zoom;
        
        this.state.panX = x - (x - this.state.panX) * scale;
        this.state.panY = y - (y - this.state.panY) * scale;
        this.state.zoom = newZoom;
        
        this.render();
        this.emit('zoomChanged', newZoom);
    }
    
    // Рендеринг
    render() {
        console.log('🎨 render() вызван, renderer готов:', !!this.modules.renderer);
        requestAnimationFrame(() => {
            if (this.modules.renderer) {
                console.log('🖼️ Выполняем рендеринг...');
                this.modules.renderer.render();
                console.log('✅ Рендеринг завершен');
            } else {
                console.error('❌ Renderer не инициализирован!');
            }
        });
    }
    
    // Добавление объекта
    addObject(object) {
        let layer = this.getActiveLayer();
        
        // Если нет активного слоя, создаем его
        if (!layer) {
            layer = this.createLayer('main', 'Основной слой');
            this.activeLayerId = layer.id;
        }
        
        if (layer.locked) return null;
        
        // Генерация ID
        object.id = object.id || this.generateId();
        object.layerId = layer.id;
        object.timestamp = Date.now();
        
        // Добавление в слой и общий список
        layer.objects.set(object.id, object);
        this.objects.set(object.id, object);
        
        // История
        this.addToHistory({
            type: 'add',
            objects: [object]
        });
        
        this.render();
        this.emit('objectAdded', object);
        
        return object;
    }
    
    // Удаление объектов
    removeObjects(objectIds) {
        const removedObjects = [];
        
        objectIds.forEach(id => {
            const object = this.objects.get(id);
            if (object) {
                const layer = this.layers.get(object.layerId);
                if (layer && !layer.locked) {
                    layer.objects.delete(id);
                    this.objects.delete(id);
                    this.selectedObjects.delete(id);
                    removedObjects.push(object);
                }
            }
        });
        
        if (removedObjects.length > 0) {
            this.addToHistory({
                type: 'remove',
                objects: removedObjects
            });
            
            this.render();
            this.emit('objectsRemoved', removedObjects);
        }
    }
    
    // История операций
    addToHistory(action) {
        // Удаляем операции после текущего индекса
        this.history = this.history.slice(0, this.historyIndex + 1);
        
        // Добавляем новую операцию
        this.history.push(action);
        
        // Ограничиваем размер истории
        if (this.history.length > this.config.maxHistorySize) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
        
        this.emit('historyChanged', { canUndo: true, canRedo: false });
    }
    
    // Отмена операции
    undo() {
        if (this.historyIndex >= 0) {
            const action = this.history[this.historyIndex];
            
            // Простая отмена - удаление последнего объекта
            if (action.type === 'add' && action.objects) {
                action.objects.forEach(obj => {
                    this.objects.delete(obj.id);
                    const layer = this.layers.get(obj.layerId);
                    if (layer) {
                        layer.objects.delete(obj.id);
                    }
                });
            }
            
            this.historyIndex--;
            this.render();
            this.emit('historyChanged', {
                canUndo: this.historyIndex >= 0,
                canRedo: true
            });
        }
    }
    
    // Повтор операции
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            const action = this.history[this.historyIndex];
            
            // Простое повторение - добавление объекта обратно
            if (action.type === 'add' && action.objects) {
                action.objects.forEach(obj => {
                    this.objects.set(obj.id, obj);
                    const layer = this.layers.get(obj.layerId);
                    if (layer) {
                        layer.objects.set(obj.id, obj);
                    }
                });
            }
            
            this.render();
            this.emit('historyChanged', {
                canUndo: true,
                canRedo: this.historyIndex < this.history.length - 1
            });
        }
    }
    
    // Генерация уникального ID
    generateId() {
        return `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // События
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    
    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                callback(data);
            });
        }
    }
    
    // Обработка изменения размера
    handleResize() {
        this.setupCanvas();
        this.render();
    }
    
    // Очистка доски
    clear() {
        this.objects.clear();
        this.layers.forEach(layer => layer.objects.clear());
        this.selectedObjects.clear();
        this.history = [];
        this.historyIndex = -1;
        
        this.render();
        this.emit('boardCleared');
    }
    
    // Экспорт
    exportAs(format, options = {}) {
        if (this.modules.export) {
            return this.modules.export.export(format, options);
        }
        
        // Простая реализация экспорта
        return new Promise((resolve) => {
            const canvas = this.canvas;
            const dataURL = canvas.toDataURL(`image/${format}`);
            resolve(dataURL);
        });
    }
    
    // Импорт
    import(data, format) {
        // Простая реализация импорта
        return new Promise((resolve) => {
            resolve(true);
        });
    }
    
    // Уничтожение доски
    destroy() {
        // Удаление обработчиков событий
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        this.canvas.removeEventListener('mouseup', this.handleMouseUp);
        this.canvas.removeEventListener('wheel', this.handleWheel);
        
        // Очистка модулей
        Object.values(this.modules).forEach(module => {
            if (module && module.destroy) {
                module.destroy();
            }
        });
        
        // Очистка данных
        this.objects.clear();
        this.layers.clear();
        this.selectedObjects.clear();
        this.eventListeners.clear();
        
        this.emit('boardDestroyed');
    }
}

// Экспорт класса
window.ProfessionalBoard = ProfessionalBoard;
