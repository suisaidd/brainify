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
        
        // Ресайз элементов
        this.isResizing = false;
        this.resizeHandle = null; // 'nw','ne','sw','se'
        this.resizeStartX = 0;
        this.resizeStartY = 0;
        this.resizeOrigRect = null; // {x,y,width,height}
        
        // Последняя позиция курсора (мировые координаты) — для вставки картинок
        this.lastMouseWorldX = 0;
        this.lastMouseWorldY = 0;
        
        // Для рисования свободной линии
        this.currentPath = [];
        
        // ===== Бесконечная доска: камера =====
        this.panX = 0;
        this.panY = 0;
        this.zoom = 1;
        this.minZoom = 0.1;
        this.maxZoom = 5;
        this.isPanning = false;
        this.panStartX = 0;
        this.panStartY = 0;
        this.panStartPanX = 0;
        this.panStartPanY = 0;
        this.spacePressed = false;
        this.lastPinchDist = 0;
        this.lastPinchCenter = null;
        
        // Кэш загруженных картинок (id -> HTMLImageElement)
        this.imageCache = new Map();
        
        // Синхронизация
        this.saveTimeout = null;
        this.autoSaveInterval = null;
        this.syncInterval = null;
        this.lastSyncedVersion = 0;
        this.isSaving = false;
        this.pendingSave = false;
        this.lastSavedData = null;
        this.localElements = new Set();
        this.lastSyncTime = 0;
        
        // Реальное время — STOMP
        this.stompClient = null;
        this.remoteDrawing = null;        // элемент/путь, который рисует собеседник прямо сейчас
        this.remoteDrawPath = [];         // точки пути собеседника
        this.lastBroadcastTime = 0;
        this.broadcastThrottle = 30;      // мс между отправками (снижено для плавности)
        
        // Защита недавно полученных по STOMP элементов от удаления при merge
        this.recentRemoteIds = new Map();   // id -> timestamp добавления
        this.remoteProtectionTTL = 10000;   // 10 секунд защиты
        this.remoteDirty = false;           // флаг: были ли STOMP-события с последнего sync
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.setupToolbar();
        this.loadBoardState();
        this.startAutoSave();
        // Realtime STOMP подключение — в try-catch, чтобы ошибка не ломала всю доску
        try { this.connectRealtimeStomp(); } catch (e) { console.warn('Whiteboard: STOMP init error:', e); }
    }
    
    setupCanvas() {
        const container = document.getElementById('boardContainer');
        const resizeCanvas = () => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            if (w > 0 && h > 0 && (this.canvas.width !== w || this.canvas.height !== h)) {
                this.canvas.width = w;
                this.canvas.height = h;
                this.redraw();
            }
        };
        
        // Начальный размер
        resizeCanvas();
        
        // Fallback: при flex-раскладке размеры могут быть 0 на DOMContentLoaded
        // — повторяем после того как браузер закончит layout
        requestAnimationFrame(() => resizeCanvas());
        // И ещё раз на window.load (все ресурсы загружены)
        window.addEventListener('load', () => resizeCanvas());
        
        // ResizeObserver — надёжнее всего: реагирует когда контейнер получает размеры
        if (typeof ResizeObserver !== 'undefined') {
            new ResizeObserver(() => resizeCanvas()).observe(container);
        }
        
        window.addEventListener('resize', resizeCanvas);
    }
    
    // ===== Конвертация координат =====
    
    /** Экранные координаты -> мировые */
    screenToWorld(sx, sy) {
        return {
            x: (sx - this.panX) / this.zoom,
            y: (sy - this.panY) / this.zoom
        };
    }
    
    /** Мировые координаты -> экранные */
    worldToScreen(wx, wy) {
        return {
            x: wx * this.zoom + this.panX,
            y: wy * this.zoom + this.panY
        };
    }
    
    /** Позиция мыши в мировых координатах */
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        return this.screenToWorld(sx, sy);
    }
    
    /** Экранная позиция мыши (без трансформации) */
    getScreenMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    
    /** Позиция касания в мировых координатах */
    getTouchPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0] || e.changedTouches[0];
        const sx = touch.clientX - rect.left;
        const sy = touch.clientY - rect.top;
        return this.screenToWorld(sx, sy);
    }
    
    /** Экранная позиция касания */
    getScreenTouchPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0] || e.changedTouches[0];
        return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    
    // ===== Zoom =====
    
    setZoom(newZoom, pivotSX, pivotSY) {
        const oldZoom = this.zoom;
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
        
        // Зумим к точке под курсором
        const ratio = this.zoom / oldZoom;
        this.panX = pivotSX - (pivotSX - this.panX) * ratio;
        this.panY = pivotSY - (pivotSY - this.panY) * ratio;
        
        this.updateZoomIndicator();
        this.redraw();
    }
    
    updateZoomIndicator() {
        const el = document.getElementById('zoomIndicator');
        if (el) el.textContent = Math.round(this.zoom * 100) + '%';
    }
    
    resetView() {
        this.panX = 0;
        this.panY = 0;
        this.zoom = 1;
        this.updateZoomIndicator();
        this.redraw();
    }
    
    // ===== Event Listeners =====
    
    setupEventListeners() {
        // Закрытие дропдаунов при клике/касании на доску
        this.canvas.addEventListener('mousedown', () => this.closeAllDropdowns());
        this.canvas.addEventListener('touchstart', () => this.closeAllDropdowns());
        
        // Мышь
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
        
        // Колесо мыши — zoom
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
        
        // Касание
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Клавиатура
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Вставка изображений (Ctrl+V)
        document.addEventListener('paste', this.handlePaste.bind(this));
    }
    
    handleWheel(e) {
        e.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        
        const delta = -e.deltaY;
        const factor = delta > 0 ? 1.08 : 1 / 1.08;
        this.setZoom(this.zoom * factor, sx, sy);
    }
    
    // ===== Mouse Handlers =====
    
    handleMouseDown(e) {
        const screenPos = this.getScreenMousePos(e);
        
        // Средняя кнопка мыши, Space или инструмент pan — панорамирование
        if (e.button === 1 || this.spacePressed || this.currentTool === 'pan') {
            e.preventDefault();
            this.isPanning = true;
            this.panStartX = screenPos.x;
            this.panStartY = screenPos.y;
            this.panStartPanX = this.panX;
            this.panStartPanY = this.panY;
            this.canvas.style.cursor = 'grabbing';
            return;
        }
        
        const pos = this.getMousePos(e);
        
        // Проверяем ресайз-ручки перед обычным рисованием
        if (this.currentTool === 'select' && this.selectedElement) {
            const handle = this.getResizeHandle(pos.x, pos.y, this.selectedElement);
            if (handle) {
                this.isResizing = true;
                this.resizeHandle = handle;
                this.resizeStartX = pos.x;
                this.resizeStartY = pos.y;
                this.resizeOrigRect = {
                    x: this.selectedElement.x,
                    y: this.selectedElement.y,
                    width: this.selectedElement.width,
                    height: this.selectedElement.height
                };
                return;
            }
        }
        
        this.startDrawing(pos.x, pos.y);
    }
    
    handleMouseMove(e) {
        // Всегда отслеживаем позицию курсора в мировых координатах
        const worldPos = this.getMousePos(e);
        this.lastMouseWorldX = worldPos.x;
        this.lastMouseWorldY = worldPos.y;
        
        if (this.isPanning) {
            const screenPos = this.getScreenMousePos(e);
            this.panX = this.panStartPanX + (screenPos.x - this.panStartX);
            this.panY = this.panStartPanY + (screenPos.y - this.panStartY);
            this.redraw();
            return;
        }
        
        // Курсор grab при зажатом пробеле или инструменте pan
        if ((this.spacePressed || this.currentTool === 'pan') && !this.isDrawing) {
            this.canvas.style.cursor = 'grab';
            return;
        }
        
        // Ресайз
        if (this.isResizing && this.selectedElement) {
            this.handleResize(worldPos.x, worldPos.y);
            return;
        }
        
        // Курсор ресайза при наведении на ручку
        if (this.currentTool === 'select' && this.selectedElement && !this.isDrawing) {
            const handle = this.getResizeHandle(worldPos.x, worldPos.y, this.selectedElement);
            if (handle) {
                const cursors = { nw: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', se: 'nwse-resize' };
                this.canvas.style.cursor = cursors[handle] || 'default';
                return;
            } else {
                this.canvas.style.cursor = '';
            }
        }
        
        this.updateDrawing(worldPos.x, worldPos.y);
    }
    
    handleMouseUp(e) {
        if (this.isPanning) {
            this.isPanning = false;
            this.canvas.style.cursor = (this.spacePressed || this.currentTool === 'pan') ? 'grab' : '';
            return;
        }
        
        if (this.isResizing) {
            this.isResizing = false;
            this.resizeHandle = null;
            this.canvas.style.cursor = '';
            this.saveToHistory();
            this.scheduleSave();
            return;
        }
        
        this.stopDrawing();
    }
    
    // ===== Touch Handlers (pan + pinch-to-zoom) =====
    
    handleTouchStart(e) {
        e.preventDefault();
        
        if (e.touches.length === 2) {
            // Два пальца — начинаем pinch/pan
            this.isPanning = true;
            this.isDrawing = false;
            const t0 = e.touches[0];
            const t1 = e.touches[1];
            this.lastPinchDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
            const rect = this.canvas.getBoundingClientRect();
            this.lastPinchCenter = {
                x: (t0.clientX + t1.clientX) / 2 - rect.left,
                y: (t0.clientY + t1.clientY) / 2 - rect.top
            };
            this.panStartX = this.lastPinchCenter.x;
            this.panStartY = this.lastPinchCenter.y;
            this.panStartPanX = this.panX;
            this.panStartPanY = this.panY;
            return;
        }
        
        const pos = this.getTouchPos(e);
        this.startDrawing(pos.x, pos.y);
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        
        if (e.touches.length === 2) {
            const t0 = e.touches[0];
            const t1 = e.touches[1];
            const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
            const rect = this.canvas.getBoundingClientRect();
            const cx = (t0.clientX + t1.clientX) / 2 - rect.left;
            const cy = (t0.clientY + t1.clientY) / 2 - rect.top;
            
            // Zoom
            if (this.lastPinchDist > 0) {
                const factor = dist / this.lastPinchDist;
                this.setZoom(this.zoom * factor, cx, cy);
            }
            
            // Pan
            if (this.lastPinchCenter) {
                this.panX += cx - this.lastPinchCenter.x;
                this.panY += cy - this.lastPinchCenter.y;
            }
            
            this.lastPinchDist = dist;
            this.lastPinchCenter = { x: cx, y: cy };
            this.redraw();
            return;
        }
        
        const pos = this.getTouchPos(e);
        this.updateDrawing(pos.x, pos.y);
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        
        if (e.touches.length < 2) {
            this.isPanning = false;
            this.lastPinchDist = 0;
            this.lastPinchCenter = null;
        }
        
        if (e.touches.length === 0) {
            this.stopDrawing();
        }
    }
    
    // ===== Keyboard =====
    
    handleKeyDown(e) {
        // Space для панорамирования
        if (e.code === 'Space' && !e.repeat) {
            // Не перехватываем, если фокус в input/textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            e.preventDefault();
            this.spacePressed = true;
            if (!this.isDrawing) this.canvas.style.cursor = 'grab';
            return;
        }
        
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
                this.saveBoardState();
                return;
            }
            // Ctrl+0 — сбросить вид
            if (e.key === '0') {
                e.preventDefault();
                this.resetView();
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
            't': 'text',
            'h': 'pan'
        };
        
        const shapeTools = ['rectangle', 'ellipse', 'arrow', 'line'];
        
        if (toolMap[e.key.toLowerCase()] && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            const tool = toolMap[e.key.toLowerCase()];
            
            if (shapeTools.includes(tool)) {
                this.currentShape = tool;
                const icon = document.getElementById('shapesIcon');
                if (icon && this.shapeIcons) icon.className = this.shapeIcons[tool] || 'fas fa-shapes';
                const shapesDropdown = document.getElementById('shapesDropdown');
                if (shapesDropdown) {
                    shapesDropdown.querySelectorAll('.dropdown-item').forEach(d => {
                        d.classList.toggle('active', d.getAttribute('data-tool') === tool);
                    });
                }
                this.activateTool(tool, document.getElementById('shapesToggle'));
            } else {
                const btn = document.querySelector(`.tool-btn[data-tool="${tool}"]`);
                this.activateTool(tool, btn);
            }
        }
    }
    
    handleKeyUp(e) {
        if (e.code === 'Space') {
            this.spacePressed = false;
            if (!this.isPanning) this.canvas.style.cursor = '';
        }
    }
    
    // ===== Toolbar =====
    
    setupToolbar() {
        const self = this;
        
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => {
                self.activateTool(btn.getAttribute('data-tool'), btn);
            });
        });
        
        // Фигуры dropdown
        const shapesToggle = document.getElementById('shapesToggle');
        const shapesDropdown = document.getElementById('shapesDropdown');
        const shapesPanel = shapesDropdown.querySelector('.dropdown-panel');
        
        this.shapeIcons = {
            rectangle: 'far fa-square',
            ellipse:   'far fa-circle',
            arrow:     'fas fa-long-arrow-alt-right',
            line:      'fas fa-minus'
        };
        this.currentShape = null;
        
        shapesToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const wasOpen = shapesPanel.classList.contains('open');
            this.closeAllDropdowns();
            if (!wasOpen) shapesPanel.classList.add('open');
        });
        
        shapesDropdown.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const tool = item.getAttribute('data-tool');
                this.currentShape = tool;
                const icon = document.getElementById('shapesIcon');
                icon.className = this.shapeIcons[tool] || 'fas fa-shapes';
                shapesDropdown.querySelectorAll('.dropdown-item').forEach(d => d.classList.remove('active'));
                item.classList.add('active');
                this.activateTool(tool, shapesToggle);
                shapesPanel.classList.remove('open');
            });
        });
        
        // Ластик
        document.getElementById('eraserBtn').addEventListener('click', () => {
            this.activateTool('eraser', document.getElementById('eraserBtn'));
        });
        
        // Цвет линии
        const strokeDD = document.getElementById('strokeColorDropdown');
        const strokeTrigger = document.getElementById('strokeColorTrigger');
        const strokePanel = strokeDD.querySelector('.dropdown-panel');
        
        strokeTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const wasOpen = strokePanel.classList.contains('open');
            this.closeAllDropdowns();
            if (!wasOpen) strokePanel.classList.add('open');
        });
        
        strokeDD.querySelectorAll('.color-opt').forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                const color = opt.getAttribute('data-color');
                this.strokeColor = color;
                document.getElementById('strokeColor').value = color;
                document.getElementById('strokeDot').style.background = color;
                strokeDD.querySelectorAll('.color-opt').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                strokePanel.classList.remove('open');
            });
        });
        
        // Цвет заливки
        const fillDD = document.getElementById('fillColorDropdown');
        const fillTrigger = document.getElementById('fillColorTrigger');
        const fillPanel = fillDD.querySelector('.dropdown-panel');
        
        fillTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const wasOpen = fillPanel.classList.contains('open');
            this.closeAllDropdowns();
            if (!wasOpen) fillPanel.classList.add('open');
        });
        
        fillDD.querySelectorAll('.color-opt').forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                const color = opt.getAttribute('data-color');
                this.fillColor = color === 'transparent' ? 'transparent' : color;
                document.getElementById('fillColor').value = color === 'transparent' ? '#ffffff' : color;
                const dot = document.getElementById('fillDot');
                dot.style.background = color === 'transparent' ? '#ffffff' : color;
                fillDD.querySelectorAll('.color-opt').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                fillPanel.classList.remove('open');
            });
        });
        
        // Толщина линии
        const strokeWidthInput = document.getElementById('strokeWidth');
        const strokeWidthLabel = document.getElementById('strokeWidthLabel');
        strokeWidthInput.addEventListener('input', (e) => {
            this.strokeWidth = parseInt(e.target.value);
            strokeWidthLabel.textContent = this.strokeWidth;
        });
        
        // Закрытие dropdown при клике снаружи
        document.addEventListener('click', () => this.closeAllDropdowns());
        document.querySelectorAll('.dropdown-panel').forEach(panel => {
            panel.addEventListener('click', (e) => e.stopPropagation());
        });
        
        // Кнопка сброса зума
        const zoomReset = document.getElementById('zoomReset');
        if (zoomReset) zoomReset.addEventListener('click', () => this.resetView());
    }
    
    activateTool(tool, activeBtn) {
        this.currentTool = tool;
        this.canvas.className = tool;
        // Сбрасываем инлайн-курсор, чтобы CSS-класс работал корректно
        this.canvas.style.cursor = '';
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        if (activeBtn) activeBtn.classList.add('active');
    }
    
    setTool(tool) {
        this.currentTool = tool;
        this.canvas.className = tool;
        this.canvas.style.cursor = '';
    }
    
    closeAllDropdowns() {
        document.querySelectorAll('.dropdown-panel').forEach(p => p.classList.remove('open'));
    }
    
    updatePaletteActive() {}
    
    // ===== Resize =====
    
    /** Размер ручки в мировых координатах (постоянный на экране) */
    getHandleSize() {
        return 8 / this.zoom;
    }
    
    /** Возвращает bounding box элемента */
    getElementBounds(el) {
        if (el.type === 'path') {
            const xs = el.points.map(p => p.x);
            const ys = el.points.map(p => p.y);
            const minX = Math.min(...xs), maxX = Math.max(...xs);
            const minY = Math.min(...ys), maxY = Math.max(...ys);
            return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
        }
        return { x: el.x, y: el.y, width: el.width, height: el.height };
    }
    
    /** Проверяет, попали ли в угловую ручку. Возвращает 'nw','ne','sw','se' или null */
    getResizeHandle(mx, my, el) {
        const b = this.getElementBounds(el);
        const hs = this.getHandleSize();
        
        const left = Math.min(b.x, b.x + b.width);
        const right = Math.max(b.x, b.x + b.width);
        const top = Math.min(b.y, b.y + b.height);
        const bottom = Math.max(b.y, b.y + b.height);
        
        const corners = {
            nw: { x: left, y: top },
            ne: { x: right, y: top },
            sw: { x: left, y: bottom },
            se: { x: right, y: bottom }
        };
        
        for (const [name, c] of Object.entries(corners)) {
            if (Math.abs(mx - c.x) <= hs && Math.abs(my - c.y) <= hs) {
                return name;
            }
        }
        return null;
    }
    
    /** Обрабатывает перетаскивание ручки ресайза */
    handleResize(mx, my) {
        const el = this.selectedElement;
        if (!el || !this.resizeOrigRect) return;
        
        const orig = this.resizeOrigRect;
        const dx = mx - this.resizeStartX;
        const dy = my - this.resizeStartY;
        
        let newX = orig.x;
        let newY = orig.y;
        let newW = orig.width;
        let newH = orig.height;
        
        switch (this.resizeHandle) {
            case 'se':
                newW = orig.width + dx;
                newH = orig.height + dy;
                break;
            case 'sw':
                newX = orig.x + dx;
                newW = orig.width - dx;
                newH = orig.height + dy;
                break;
            case 'ne':
                newY = orig.y + dy;
                newW = orig.width + dx;
                newH = orig.height - dy;
                break;
            case 'nw':
                newX = orig.x + dx;
                newY = orig.y + dy;
                newW = orig.width - dx;
                newH = orig.height - dy;
                break;
        }
        
        // Для изображений — сохраняем пропорции
        if (el.type === 'image') {
            const aspect = orig.width / orig.height;
            // Используем бóльшее изменение
            if (Math.abs(newW / orig.width - 1) > Math.abs(newH / orig.height - 1)) {
                newH = newW / aspect;
            } else {
                newW = newH * aspect;
            }
            // Пересчитываем позицию для ручек nw/ne/sw
            if (this.resizeHandle === 'nw') {
                newX = orig.x + orig.width - newW;
                newY = orig.y + orig.height - newH;
            } else if (this.resizeHandle === 'ne') {
                newY = orig.y + orig.height - newH;
            } else if (this.resizeHandle === 'sw') {
                newX = orig.x + orig.width - newW;
            }
        }
        
        // Минимальный размер
        if (Math.abs(newW) > 10 && Math.abs(newH) > 10) {
            el.x = newX;
            el.y = newY;
            el.width = newW;
            el.height = newH;
            if (el.id) el.timestamp = Date.now();
            this.redraw();
        }
    }
    
    // ===== Drawing Logic =====
    
    startDrawing(x, y) {
        this.isDrawing = true;
        this.startX = x;
        this.startY = y;
        
        if (this.currentTool === 'select') {
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
            this._lastBroadcastPathIndex = 1; // первая точка уже включена в path-start
            this.broadcastDrawImmediate({
                type: 'path-start',
                strokeColor: this.strokeColor,
                strokeWidth: this.strokeWidth,
                startPoint: { x, y }  // отправляем начальную точку сразу
            });
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
        
        const now = Date.now();
        this.currentElement = {
            type: this.currentTool,
            x: x,
            y: y,
            width: 0,
            height: 0,
            strokeColor: this.strokeColor,
            fillColor: this.fillColor,
            strokeWidth: this.strokeWidth,
            id: now + Math.random(),
            timestamp: now
        };
    }
    
    updateDrawing(x, y) {
        if (!this.isDrawing) return;
        
        if (this.isDragging && this.selectedElement) {
            this.selectedElement.x = x - this.dragOffset.x;
            this.selectedElement.y = y - this.dragOffset.y;
            if (this.selectedElement.id) {
                this.selectedElement.timestamp = Date.now();
                // Транслируем перемещение собеседнику
                this.broadcastDraw({
                    type: 'move-progress',
                    elementId: this.selectedElement.id,
                    x: this.selectedElement.x,
                    y: this.selectedElement.y
                });
            }
            this.redraw();
            return;
        }
        
        if (this.currentTool === 'draw') {
            this.currentPath.push({ x, y });
            // Отправляем новые точки собеседнику (с throttle)
            this._broadcastPathBatch();
            // Полный перерисов + текущий путь (для корректной работы с трансформацией)
            this.redraw();
            this.drawCurrentPath();
            return;
        }
        
        if (this.currentTool === 'eraser') {
            this.eraseAt(x, y);
            return;
        }
        
        if (this.currentElement) {
            this.currentElement.width = x - this.startX;
            this.currentElement.height = y - this.startY;
            // Отправляем форму собеседнику
            this.broadcastDraw({
                type: 'shape-progress',
                element: {
                    type: this.currentElement.type,
                    x: this.currentElement.x,
                    y: this.currentElement.y,
                    width: this.currentElement.width,
                    height: this.currentElement.height,
                    strokeColor: this.currentElement.strokeColor,
                    fillColor: this.currentElement.fillColor,
                    strokeWidth: this.currentElement.strokeWidth
                }
            });
            this.redraw();
            // Рисуем текущий элемент с трансформацией
            this.ctx.save();
            this.ctx.translate(this.panX, this.panY);
            this.ctx.scale(this.zoom, this.zoom);
            this.drawElement(this.ctx, this.currentElement);
            this.ctx.restore();
        }
    }
    
    stopDrawing() {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        this.isDragging = false;
        
        let createdElementId = null;
        
        if (this.currentTool === 'draw' && this.currentPath.length > 0) {
            // Очищаем pending таймер и отправляем оставшиеся точки
            if (this._pathBatchTimer) { clearTimeout(this._pathBatchTimer); this._pathBatchTimer = null; }
            const fromIdx = this._lastBroadcastPathIndex || 0;
            const remaining = this.currentPath.slice(fromIdx);
            if (remaining.length > 0) {
                this.broadcastDrawImmediate({ type: 'path-progress', points: remaining });
            }
            
            const now = Date.now();
            const newElement = {
                type: 'path',
                points: [...this.currentPath],
                strokeColor: this.strokeColor,
                strokeWidth: this.strokeWidth,
                id: now + Math.random(),
                timestamp: now
            };
            this.elements.push(newElement);
            this.localElements.add(newElement.id);
            this.saveToHistory();
            this.currentPath = [];
            this._lastBroadcastPathIndex = 0;
            createdElementId = newElement.id;
        }
        
        if (this.currentElement && (this.currentElement.width !== 0 || this.currentElement.height !== 0)) {
            if (!this.currentElement.timestamp) {
                this.currentElement.timestamp = Date.now();
            }
            this.elements.push(this.currentElement);
            this.localElements.add(this.currentElement.id);
            this.saveToHistory();
            createdElementId = this.currentElement.id;
            this.currentElement = null;
        }
        
        // Сообщаем собеседнику, что рисование завершено (включаем ID элемента)
        // Также отправляем финальные оставшиеся точки для path, чтобы не терять хвост
        if (createdElementId !== null) {
            this.broadcastDrawImmediate({ type: 'draw-done', elementId: createdElementId });
        }
        
        this.redraw();
        this.scheduleSave();
    }
    
    /** Рисует текущий путь (карандаш) во время рисования — с учётом камеры */
    drawCurrentPath() {
        if (this.currentPath.length < 2) return;
        
        this.ctx.save();
        this.ctx.translate(this.panX, this.panY);
        this.ctx.scale(this.zoom, this.zoom);
        
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
        this.ctx.restore();
    }
    
    eraseAt(x, y) {
        const eraserSize = this.strokeWidth * 5 / this.zoom; // Учитываем зум
        const elementsToRemove = [];
        
        this.elements.forEach((element, index) => {
            if (this.isPointInElement(x, y, element, eraserSize)) {
                elementsToRemove.push({ index, id: element.id });
            }
        });
        
        const removedIds = elementsToRemove.map(r => r.id);
        elementsToRemove.reverse().forEach(removed => {
            this.elements.splice(removed.index, 1);
            this.localElements.delete(removed.id);
        });
        
        if (elementsToRemove.length > 0) {
            this.broadcastDrawImmediate({ type: 'erase', ids: removedIds });
            this.saveToHistory();
            this.redraw();
            this.scheduleSave();
        }
    }
    
    isPointInElement(x, y, element, tolerance = 0) {
        if (element.type === 'path') {
            for (const point of element.points) {
                const dist = Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2));
                if (dist <= (element.strokeWidth / 2 + tolerance)) {
                    return true;
                }
            }
            return false;
        }
        
        if (element.type === 'text' || element.type === 'image') {
            return x >= element.x - tolerance && x <= element.x + element.width + tolerance &&
                   y >= element.y - tolerance && y <= element.y + element.height + tolerance;
        }
        
        const left = Math.min(element.x, element.x + element.width);
        const right = Math.max(element.x, element.x + element.width);
        const top = Math.min(element.y, element.y + element.height);
        const bottom = Math.max(element.y, element.y + element.height);
        
        return x >= left - tolerance && x <= right + tolerance &&
               y >= top - tolerance && y <= bottom + tolerance;
    }
    
    getElementAt(x, y) {
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
        
        const now = Date.now();
        const newElement = {
            type: 'text',
            x: x,
            y: y,
            text: text,
            width: metrics.width,
            height: this.strokeWidth * 10,
            strokeColor: this.strokeColor,
            strokeWidth: this.strokeWidth,
            id: now + Math.random(),
            timestamp: now
        };
        this.elements.push(newElement);
        this.localElements.add(newElement.id);
        
        this.saveToHistory();
        this.redraw();
        this.scheduleSave();
    }
    
    // ===== Вставка изображений =====
    
    handlePaste(e) {
        // Не перехватываем, если фокус в input/textarea
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        const items = e.clipboardData && e.clipboardData.items;
        if (!items) return;
        
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const blob = item.getAsFile();
                if (!blob) return;
                
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const dataUrl = ev.target.result;
                    this.addImageElement(dataUrl);
                };
                reader.readAsDataURL(blob);
                return;
            }
        }
    }
    
    addImageElement(dataUrl) {
        const img = new Image();
        img.onload = () => {
            // Вставляем в позицию последнего положения курсора
            const cx = this.lastMouseWorldX;
            const cy = this.lastMouseWorldY;
            
            // Ограничиваем размер изображения (макс 600px по большей стороне)
            let w = img.naturalWidth;
            let h = img.naturalHeight;
            const maxSize = 600;
            if (w > maxSize || h > maxSize) {
                const ratio = Math.min(maxSize / w, maxSize / h);
                w = Math.round(w * ratio);
                h = Math.round(h * ratio);
            }
            
            const now = Date.now();
            const newElement = {
                type: 'image',
                x: cx - w / 2,
                y: cy - h / 2,
                width: w,
                height: h,
                src: dataUrl,
                id: now + Math.random(),
                timestamp: now
            };
            
            // Кэшируем Image объект
            this.imageCache.set(newElement.id, img);
            
            this.elements.push(newElement);
            this.localElements.add(newElement.id);
            this.saveToHistory();
            this.redraw();
            this.scheduleSave();
        };
        img.src = dataUrl;
    }
    
    /** Загружает Image объект из кэша или создаёт новый */
    getImageObj(element) {
        if (this.imageCache.has(element.id)) {
            return this.imageCache.get(element.id);
        }
        // Создаём и кэшируем
        const img = new Image();
        img.src = element.src;
        img.onload = () => {
            this.imageCache.set(element.id, img);
            this.redraw();
        };
        this.imageCache.set(element.id, img); // Сохраняем даже до загрузки, чтобы не создавать повторно
        return img;
    }
    
    // ===== Рисование =====
    
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
                
            case 'image':
                const imgObj = this.getImageObj(element);
                if (imgObj && imgObj.complete && imgObj.naturalWidth > 0) {
                    ctx.drawImage(imgObj, element.x, element.y, element.width, element.height);
                } else {
                    // Плейсхолдер пока грузится
                    ctx.fillStyle = '#f0f0f0';
                    ctx.fillRect(element.x, element.y, element.width, element.height);
                    ctx.strokeStyle = '#ccc';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(element.x, element.y, element.width, element.height);
                    ctx.fillStyle = '#aaa';
                    ctx.font = '14px Arial';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('Загрузка...', element.x + element.width / 2, element.y + element.height / 2);
                    ctx.textAlign = 'start';
                    ctx.textBaseline = 'alphabetic';
                }
                break;
        }
        
        ctx.restore();
    }
    
    /** Рисует бесконечную сетку */
    drawGrid() {
        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;
        
        // Размер ячейки сетки в мировых координатах
        let gridSize = 20;
        // Адаптивный размер: при сильном отдалении — крупнее
        if (this.zoom < 0.4) gridSize = 100;
        else if (this.zoom < 0.8) gridSize = 50;
        
        // Конвертируем углы экрана в мировые координаты
        const topLeft = this.screenToWorld(0, 0);
        const bottomRight = this.screenToWorld(w, h);
        
        // Начало линий (привязка к сетке)
        const startX = Math.floor(topLeft.x / gridSize) * gridSize;
        const startY = Math.floor(topLeft.y / gridSize) * gridSize;
        
        ctx.save();
        ctx.translate(this.panX, this.panY);
        ctx.scale(this.zoom, this.zoom);
        
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
        ctx.lineWidth = 1 / this.zoom; // Постоянная толщина на экране
        
        ctx.beginPath();
        for (let x = startX; x <= bottomRight.x; x += gridSize) {
            ctx.moveTo(x, topLeft.y);
            ctx.lineTo(x, bottomRight.y);
        }
        for (let y = startY; y <= bottomRight.y; y += gridSize) {
            ctx.moveTo(topLeft.x, y);
            ctx.lineTo(bottomRight.x, y);
        }
        ctx.stroke();
        
        ctx.restore();
    }
    
    redraw() {
        const ctx = this.ctx;
        
        // Очищаем весь канвас
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Фон
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Сетка
        this.drawGrid();
        
        // Применяем трансформацию камеры
        ctx.save();
        ctx.translate(this.panX, this.panY);
        ctx.scale(this.zoom, this.zoom);
        
        // Рисуем все элементы
        this.elements.forEach(element => {
            this.drawElement(ctx, element);
        });
        
        // Рисуем текущий элемент (фигура в процессе создания)
        if (this.currentElement) {
            this.drawElement(ctx, this.currentElement);
        }
        
        // Рисуем выделение
        if (this.selectedElement) {
            this.drawSelection(this.selectedElement);
        }
        
        ctx.restore();
        
        // Рисуем то, что рисует собеседник прямо сейчас
        this.drawRemoteDrawing();
    }
    
    drawSelection(element) {
        const ctx = this.ctx;
        const b = this.getElementBounds(element);
        
        const left = Math.min(b.x, b.x + b.width);
        const right = Math.max(b.x, b.x + b.width);
        const top = Math.min(b.y, b.y + b.height);
        const bottom = Math.max(b.y, b.y + b.height);
        const pad = 4 / this.zoom;
        
        // Пунктирная рамка
        ctx.save();
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 1.5 / this.zoom;
        ctx.setLineDash([5 / this.zoom, 4 / this.zoom]);
        ctx.strokeRect(left - pad, top - pad, right - left + pad * 2, bottom - top + pad * 2);
        ctx.restore();
        
        // Угловые ручки
        const hs = this.getHandleSize();
        const corners = [
            { x: left, y: top },
            { x: right, y: top },
            { x: left, y: bottom },
            { x: right, y: bottom }
        ];
        
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#667eea';
        ctx.lineWidth = 1.5 / this.zoom;
        ctx.setLineDash([]);
        
        corners.forEach(c => {
            ctx.beginPath();
            ctx.rect(c.x - hs / 2, c.y - hs / 2, hs, hs);
            ctx.fill();
            ctx.stroke();
        });
        ctx.restore();
    }
    
    /** Предзагрузка картинок из элементов (после загрузки/синхронизации) */
    preloadImages() {
        this.elements.forEach(el => {
            if (el.type === 'image' && el.src && !this.imageCache.has(el.id)) {
                const img = new Image();
                img.onload = () => {
                    this.imageCache.set(el.id, img);
                    this.redraw();
                };
                img.src = el.src;
                this.imageCache.set(el.id, img);
            }
        });
    }
    
    // ===== History =====
    
    saveToHistory() {
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(JSON.stringify(this.elements));
        this.historyIndex = this.history.length - 1;
        if (this.history.length > 50) {
            this.history.shift();
            this.historyIndex--;
        }
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.elements = JSON.parse(this.history[this.historyIndex]);
            this.preloadImages();
            this.redraw();
            this.scheduleSave();
        }
    }
    
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.elements = JSON.parse(this.history[this.historyIndex]);
            this.preloadImages();
            this.redraw();
            this.scheduleSave();
        }
    }
    
    // ===== Sync / Save =====
    
    scheduleSave() {
        if (this.saveTimeout) clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => this.saveBoardState(), 500);
    }
    
    startAutoSave() {
        this.autoSaveInterval = setInterval(() => {
            if (!this.isSaving && !this.isDrawing && this.localElements.size > 0) {
                this.saveBoardState();
            }
        }, 3000);
        
        // Синхронизация реже: каждые 5 секунд и только если были удалённые изменения
        // или прошло достаточно времени с последнего sync
        this.syncInterval = setInterval(() => {
            const now = Date.now();
            const timeSinceLastSync = now - this.lastSyncTime;
            // Синхронизируем если:
            // 1) были STOMP-события (remoteDirty), чтобы подтянуть серверное состояние
            // 2) или прошло больше 10 секунд — на случай если STOMP-событие потерялось
            if (this.remoteDirty || timeSinceLastSync > 10000) {
                this.remoteDirty = false;
                this.syncBoardState();
            }
        }, 5000);
    }
    
    // ===== Realtime drawing via STOMP =====
    
    connectRealtimeStomp() {
        // SockJS / Stomp загружаются из CDN на странице whiteboard-board.html
        if (typeof SockJS === 'undefined' || typeof Stomp === 'undefined') {
            console.warn('Whiteboard: SockJS/Stomp не загружены — realtime отключён');
            return;
        }
        try {
            const socket = new SockJS('/ws');
            this.stompClient = Stomp.over(socket);
            // Отключаем debug-логи (noop-функция, null вызывает TypeError)
            this.stompClient.debug = function() {};
            
            this.stompClient.connect({}, () => {
                console.log('Whiteboard: STOMP realtime подключён');
                this.stompClient.subscribe(`/topic/whiteboard/${this.lessonId}`, (msg) => {
                    try {
                        const data = JSON.parse(msg.body);
                        if (String(data.senderId) === String(this.currentUserId)) return;
                        this.handleRemoteDraw(data);
                    } catch (e) {
                        console.warn('Whiteboard: ошибка обработки сообщения:', e);
                    }
                });
            }, (err) => {
                console.warn('Whiteboard: STOMP ошибка подключения:', err);
                // Переподключение
                setTimeout(() => {
                    try { this.connectRealtimeStomp(); } catch (e) { /* ignore */ }
                }, 5000);
            });
        } catch (e) {
            console.warn('Whiteboard: не удалось инициализировать STOMP:', e);
        }
    }
    
    /** Отправить событие рисования (с throttle) */
    broadcastDraw(data) {
        const now = Date.now();
        if (now - this.lastBroadcastTime < this.broadcastThrottle) return;
        this.lastBroadcastTime = now;
        if (!this.stompClient || !this.stompClient.connected) return;
        data.senderId = this.currentUserId;
        this.stompClient.send(`/app/whiteboard/draw/${this.lessonId}`, {}, JSON.stringify(data));
    }
    
    /** Отправить немедленно (для draw-done и т.п.) */
    broadcastDrawImmediate(data) {
        if (!this.stompClient || !this.stompClient.connected) return;
        data.senderId = this.currentUserId;
        this.stompClient.send(`/app/whiteboard/draw/${this.lessonId}`, {}, JSON.stringify(data));
    }
    
    /** Отправить накопленные точки пути (с throttle) */
    _broadcastPathBatch() {
        const now = Date.now();
        if (now - this.lastBroadcastTime < this.broadcastThrottle) {
            // Планируем отправку оставшегося через остаток throttle
            if (!this._pathBatchTimer) {
                this._pathBatchTimer = setTimeout(() => {
                    this._pathBatchTimer = null;
                    this._broadcastPathBatch();
                }, this.broadcastThrottle);
            }
            return;
        }
        const fromIdx = this._lastBroadcastPathIndex || 0;
        if (fromIdx >= this.currentPath.length) return;
        const newPoints = this.currentPath.slice(fromIdx);
        this.lastBroadcastTime = now;
        this._lastBroadcastPathIndex = this.currentPath.length;
        if (!this.stompClient || !this.stompClient.connected) return;
        const data = { type: 'path-progress', points: newPoints, senderId: this.currentUserId };
        this.stompClient.send(`/app/whiteboard/draw/${this.lessonId}`, {}, JSON.stringify(data));
    }
    
    /** Очищает устаревшие записи из recentRemoteIds */
    cleanupRemoteProtection() {
        const now = Date.now();
        for (const [id, ts] of this.recentRemoteIds) {
            if (now - ts > this.remoteProtectionTTL) {
                this.recentRemoteIds.delete(id);
            }
        }
    }
    
    /** Обработать входящее событие рисования от собеседника */
    handleRemoteDraw(data) {
        switch (data.type) {
            case 'path-start':
                this.remoteDrawPath = [];
                this.remoteDrawing = {
                    type: 'path',
                    strokeColor: data.strokeColor || '#000000',
                    strokeWidth: data.strokeWidth || 2
                };
                // Если пришла начальная точка — сразу добавляем и отрисовываем
                if (data.startPoint) {
                    this.remoteDrawPath.push(data.startPoint);
                    this.redraw();
                }
                break;
                
            case 'path-progress':
                if (data.points && data.points.length) {
                    this.remoteDrawPath.push(...data.points);
                    this.redraw();
                }
                break;
                
            case 'shape-progress':
                this.remoteDrawing = data.element;
                this.redraw();
                break;
                
            case 'draw-done': {
                // Превращаем превью в настоящий элемент — без паузы
                const now = Date.now();
                let addedId = null;
                
                if (this.remoteDrawing) {
                    if (this.remoteDrawing.type === 'path' && this.remoteDrawPath.length > 1) {
                        addedId = data.elementId || (now + Math.random());
                        this.elements.push({
                            type: 'path',
                            points: [...this.remoteDrawPath],
                            strokeColor: this.remoteDrawing.strokeColor,
                            strokeWidth: this.remoteDrawing.strokeWidth,
                            id: addedId,
                            timestamp: now
                        });
                    } else if (this.remoteDrawing.type && this.remoteDrawing.type !== 'path') {
                        addedId = data.elementId || (now + Math.random());
                        this.elements.push({
                            ...this.remoteDrawing,
                            id: addedId,
                            timestamp: now
                        });
                    }
                }
                
                // Защищаем элемент от удаления при merge — сервер ещё не имеет его
                if (addedId != null) {
                    this.recentRemoteIds.set(addedId, now);
                    this.cleanupRemoteProtection();
                }
                
                this.remoteDrawing = null;
                this.remoteDrawPath = [];
                this.redraw();
                
                // НЕ вызываем syncBoardState() сразу — элемент ещё не сохранён на сервере,
                // merge удалит его. Вместо этого помечаем что нужна синхронизация позже.
                this.remoteDirty = true;
                break;
            }
                
            case 'erase':
                if (data.ids && data.ids.length) {
                    const idsSet = new Set(data.ids);
                    this.elements = this.elements.filter(el => !idsSet.has(el.id));
                    // Удаляем из защиты — элемент стёрт намеренно
                    data.ids.forEach(id => this.recentRemoteIds.delete(id));
                    this.redraw();
                    this.remoteDirty = true;
                }
                break;
                
            case 'move-progress':
                if (data.elementId != null) {
                    const el = this.elements.find(e => e.id === data.elementId);
                    if (el) {
                        el.x = data.x;
                        el.y = data.y;
                        el.timestamp = Date.now();
                        this.redraw();
                    }
                }
                break;
        }
    }
    
    /** Рисует то, что рисует собеседник прямо сейчас */
    drawRemoteDrawing() {
        if (!this.remoteDrawing) return;
        
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(this.panX, this.panY);
        ctx.scale(this.zoom, this.zoom);
        
        if (this.remoteDrawing.type === 'path' && this.remoteDrawPath.length > 0) {
            ctx.beginPath();
            ctx.strokeStyle = this.remoteDrawing.strokeColor;
            ctx.lineWidth = this.remoteDrawing.strokeWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.globalAlpha = 0.7;
            ctx.moveTo(this.remoteDrawPath[0].x, this.remoteDrawPath[0].y);
            
            if (this.remoteDrawPath.length === 1) {
                // Одна точка — рисуем точку (маленький круг)
                ctx.arc(this.remoteDrawPath[0].x, this.remoteDrawPath[0].y,
                        this.remoteDrawing.strokeWidth / 2, 0, Math.PI * 2);
                ctx.fillStyle = this.remoteDrawing.strokeColor;
                ctx.fill();
            } else {
                for (let i = 1; i < this.remoteDrawPath.length; i++) {
                    ctx.lineTo(this.remoteDrawPath[i].x, this.remoteDrawPath[i].y);
                }
                ctx.stroke();
            }
        } else if (this.remoteDrawing.type && this.remoteDrawing.type !== 'path') {
            ctx.globalAlpha = 0.6;
            this.drawElement(ctx, this.remoteDrawing);
        }
        
        ctx.restore();
    }
    
    async syncBoardState() {
        // Не синхронизируем если идёт сохранение, рисование или собеседник рисует прямо сейчас
        if (this.isSaving || this.isDrawing || this.currentPath.length > 0) return;
        if (this.remoteDrawing) return; // собеседник ещё рисует — подождём
        
        try {
            const response = await fetch(`/whiteboard/api/state/${this.lessonId}`);
            if (!response.ok) return;
            
            const data = await response.json();
            if (data.success && data.boardData) {
                try {
                    const boardData = JSON.parse(data.boardData);
                    const serverElements = boardData.elements || [];
                    const serverVersion = data.version || 0;
                    
                    if (serverVersion > this.lastSyncedVersion) {
                        // Запоминаем текущее количество элементов для проверки,
                        // нужен ли перерисовка
                        const prevCount = this.elements.length;
                        const prevJson = JSON.stringify(this.elements);
                        
                        this.mergeElements(serverElements);
                        this.lastSyncedVersion = serverVersion;
                        this.lastSyncTime = Date.now();
                        
                        this.lastSavedData = JSON.stringify({
                            elements: this.elements,
                            appState: boardData.appState || {}
                        });
                        
                        this.history = [JSON.stringify(this.elements)];
                        this.historyIndex = 0;
                        this.preloadImages();
                        
                        // Перерисовываем только если элементы реально изменились
                        const newJson = JSON.stringify(this.elements);
                        if (newJson !== prevJson) {
                            this.redraw();
                        }
                    } else {
                        // Версия не изменилась — обновляем только время
                        this.lastSyncTime = Date.now();
                    }
                } catch (parseError) {
                    console.debug('Ошибка парсинга при синхронизации:', parseError);
                }
            }
        } catch (error) {
            console.debug('Ошибка синхронизации доски:', error);
        }
    }
    
    mergeElements(serverElements) {
        const now = Date.now();
        const serverElementsMap = new Map();
        const currentElementsMap = new Map();
        
        serverElements.forEach(el => {
            if (el.id) {
                if (!el.timestamp) el.timestamp = 0;
                serverElementsMap.set(el.id, el);
            }
        });
        
        this.elements.forEach(el => {
            if (el.id) {
                if (!el.timestamp) el.timestamp = now;
                currentElementsMap.set(el.id, el);
            }
        });
        
        // Собираем все защищённые элементы: и локальные, и недавно полученные по STOMP
        const preservedLocalElements = [];
        this.localElements.forEach(localId => {
            const localElement = currentElementsMap.get(localId);
            if (localElement) preservedLocalElements.push(localElement);
        });
        
        // Также сохраняем элементы, недавно полученные от собеседника через STOMP
        this.cleanupRemoteProtection();
        const preservedRemoteElements = [];
        this.recentRemoteIds.forEach((ts, remoteId) => {
            const el = currentElementsMap.get(remoteId);
            if (el) preservedRemoteElements.push(el);
        });
        
        const mergedElements = [];
        const usedIds = new Set();
        
        serverElements.forEach(serverEl => {
            if (serverEl.id) {
                const isLocal = this.localElements.has(serverEl.id);
                const localEl = currentElementsMap.get(serverEl.id);
                
                if (isLocal && localEl) {
                    const localTimestamp = localEl.timestamp || now;
                    const serverTimestamp = serverEl.timestamp || (now - 2000000);
                    if (localTimestamp >= serverTimestamp) {
                        usedIds.add(localEl.id);
                        mergedElements.push(localEl);
                    } else {
                        usedIds.add(serverEl.id);
                        mergedElements.push(serverEl);
                    }
                } else {
                    if (!serverEl.timestamp) serverEl.timestamp = now - 2000000;
                    usedIds.add(serverEl.id);
                    mergedElements.push(serverEl);
                }
            } else {
                mergedElements.push(serverEl);
            }
        });
        
        // Сохраняем локальные элементы, которых нет на сервере
        preservedLocalElements.forEach(localEl => {
            const localTimestamp = localEl.timestamp || now;
            const existingIndex = mergedElements.findIndex(el => el.id === localEl.id);
            if (existingIndex >= 0) {
                const existing = mergedElements[existingIndex];
                if (localTimestamp >= (existing.timestamp || 0)) {
                    mergedElements[existingIndex] = localEl;
                }
            } else {
                mergedElements.push(localEl);
                usedIds.add(localEl.id);
            }
        });
        
        // Сохраняем недавно полученные от собеседника STOMP-элементы,
        // которых сервер ещё не знает — предотвращаем «мерцание»
        preservedRemoteElements.forEach(remoteEl => {
            if (!usedIds.has(remoteEl.id)) {
                mergedElements.push(remoteEl);
                usedIds.add(remoteEl.id);
            }
        });
        
        this.elements = mergedElements;
    }
    
    async saveBoardState() {
        if (this.isSaving) {
            this.pendingSave = true;
            return;
        }
        
        const boardData = JSON.stringify({
            elements: this.elements,
            appState: {
                currentTool: this.currentTool,
                strokeColor: this.strokeColor,
                fillColor: this.fillColor,
                strokeWidth: this.strokeWidth
            }
        });
        
        if (this.lastSavedData === boardData) return;
        
        this.isSaving = true;
        this.pendingSave = false;
        
        try {
            const response = await fetch(`/whiteboard/api/state/${this.lessonId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ boardData, version: this.lastSyncedVersion })
            });
            
            if (!response.ok) {
                console.error('Ошибка сохранения доски:', response.status);
                this.isSaving = false;
                return;
            }
            
            const data = await response.json();
            if (data.success) {
                this.lastSyncedVersion = data.version || this.lastSyncedVersion;
                this.lastSavedData = boardData;
                const savedElements = JSON.parse(boardData).elements || [];
                savedElements.forEach(el => { if (el.id) this.localElements.delete(el.id); });
            } else {
                console.error('Ошибка сохранения доски:', data.message);
                if (data.message && data.message.includes("версия")) {
                    await this.syncBoardState();
                }
            }
        } catch (error) {
            console.error('Ошибка сохранения доски:', error);
        } finally {
            this.isSaving = false;
            if (this.pendingSave) setTimeout(() => this.saveBoardState(), 500);
        }
    }
    
    async loadBoardState() {
        try {
            const response = await fetch(`/whiteboard/api/state/${this.lessonId}`);
            if (!response.ok) {
                this.elements = [];
                this.redraw();
                return;
            }
            
            const data = await response.json();
            if (data.success && data.boardData) {
                try {
                    const boardData = JSON.parse(data.boardData);
                    const loadedElements = boardData.elements || [];
                    const now = Date.now();
                    loadedElements.forEach(el => { if (!el.timestamp) el.timestamp = now - 1000000; });
                    
                    this.elements = loadedElements;
                    
                    if (boardData.appState) {
                        this.currentTool = boardData.appState.currentTool || 'select';
                        this.strokeColor = boardData.appState.strokeColor || '#000000';
                        this.fillColor = boardData.appState.fillColor || '#ffffff';
                        this.strokeWidth = boardData.appState.strokeWidth || 2;
                    }
                    
                    this.lastSyncedVersion = data.version || 0;
                    this.lastSyncTime = Date.now();
                    this.localElements.clear();
                    
                    this.lastSavedData = JSON.stringify({
                        elements: this.elements,
                        appState: boardData.appState || {}
                    });
                    
                    this.history = [JSON.stringify(this.elements)];
                    this.historyIndex = 0;
                    this.preloadImages();
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
                    
                    const strokeDot = document.getElementById('strokeDot');
                    const fillDot = document.getElementById('fillDot');
                    if (strokeDot) strokeDot.style.background = this.strokeColor;
                    if (fillDot) fillDot.style.background = this.fillColor === 'transparent' ? '#ffffff' : this.fillColor;
                    
                    document.querySelectorAll('.tool-btn').forEach(btn => {
                        const t = btn.getAttribute('data-tool');
                        btn.classList.toggle('active', t === this.currentTool);
                    });
                } catch (parseError) {
                    console.error('Ошибка парсинга данных доски:', parseError);
                    this.elements = [];
                    this.redraw();
                }
            } else {
                this.elements = [];
                this.redraw();
            }
        } catch (error) {
            console.error('Ошибка загрузки доски:', error);
            this.elements = [];
            this.redraw();
        }
    }
}

// Глобальные функции
let whiteboard;

function clearBoard() {
    if (confirm('Вы уверены, что хотите очистить доску?')) {
        whiteboard.elements = [];
        whiteboard.saveToHistory();
        whiteboard.redraw();
        whiteboard.saveBoardState();
        fetch(`/whiteboard/api/clear/${whiteboard.lessonId}`, { method: 'POST' });
    }
}

function saveBoard() {
    whiteboard.saveBoardState();
    alert('Доска сохранена!');
}

function undoAction() { whiteboard.undo(); }
function redoAction() { whiteboard.redo(); }

function closeBoard() {
    if (confirm('Вы уверены, что хотите закрыть доску?')) {
        if (whiteboard.autoSaveInterval) clearInterval(whiteboard.autoSaveInterval);
        if (whiteboard.syncInterval) clearInterval(whiteboard.syncInterval);
        whiteboard.saveBoardState();
        window.location.href = '/dashboard';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        whiteboard = new Whiteboard();
    } catch (e) {
        console.error('Whiteboard: ошибка инициализации:', e);
        // Пробуем показать хотя бы пустую доску
        try {
            const canvas = document.getElementById('whiteboardCanvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                const container = document.getElementById('boardContainer');
                canvas.width = container.clientWidth;
                canvas.height = container.clientHeight;
                ctx.fillStyle = '#fafafa';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        } catch (_) {}
    }
});
