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
        this.resizeHandle = null;
        this.resizeStartX = 0;
        this.resizeStartY = 0;
        this.resizeOrigRect = null;
        
        // Последняя позиция курсора (мировые координаты)
        this.lastMouseWorldX = 0;
        this.lastMouseWorldY = 0;
        
        // Для рисования свободной линии
        this.currentPath = [];
        
        // Для ломаной линии (polyline)
        this._polylinePoints = null;
        this._draggingPolylinePoint = -1;
        
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
        
        // ===== RAF render loop =====
        this._needsRedraw = false;
        this._rafId = null;
        
        // ===== High-DPI (Retina) =====
        this._dpr = window.devicePixelRatio || 1;
        this._cssWidth = 0;
        this._cssHeight = 0;
        
        // ===== Pointer / Stylus / Palm rejection =====
        this._penDetected = sessionStorage.getItem('wb_penDetected') === '1';
        this._activePointerId = null;
        this._isMultiTouch = false;
        
        // Кэш загруженных картинок
        this.imageCache = new Map();
        this._imageSrcStore = new Map(); // Хранение src отдельно от history (экономия памяти)
        
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
        this.remoteDrawing = null;
        this.remoteDrawPath = [];
        this.lastBroadcastTime = 0;
        this.broadcastThrottle = 30;
        
        // Защита недавно полученных по STOMP элементов от удаления при merge
        this.recentRemoteIds = new Map();
        this.remoteProtectionTTL = 15000;
        this.remoteDirty = false;
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.setupToolbar();
        this.loadBoardState();
        this.startAutoSave();
        this._startRenderLoop();
        try { this.connectRealtimeStomp(); } catch (e) { console.warn('Whiteboard: STOMP init error:', e); }
    }
    
    // ===== RAF Render Loop =====
    
    requestRedraw() {
        this._needsRedraw = true;
    }
    
    _startRenderLoop() {
        const loop = () => {
            if (this._needsRedraw) {
                this._needsRedraw = false;
                this.redraw();
            }
            this._rafId = requestAnimationFrame(loop);
        };
        this._rafId = requestAnimationFrame(loop);
    }
    
    // ===== Canvas setup with DPI scaling =====
    
    setupCanvas() {
        const container = document.getElementById('boardContainer');
        const resizeCanvas = () => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            const dpr = window.devicePixelRatio || 1;
            
            if (w > 0 && h > 0 && (this._cssWidth !== w || this._cssHeight !== h || this._dpr !== dpr)) {
                this._dpr = dpr;
                this._cssWidth = w;
                this._cssHeight = h;
                
                this.canvas.width = Math.round(w * dpr);
                this.canvas.height = Math.round(h * dpr);
                this.canvas.style.width = w + 'px';
                this.canvas.style.height = h + 'px';
                
                this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
                this.ctx.imageSmoothingEnabled = true;
                this.ctx.imageSmoothingQuality = 'high';
                this.redraw();
            }
        };
        
        resizeCanvas();
        requestAnimationFrame(() => resizeCanvas());
        window.addEventListener('load', () => resizeCanvas());
        
        if (typeof ResizeObserver !== 'undefined') {
            new ResizeObserver(() => resizeCanvas()).observe(container);
        }
        
        window.addEventListener('resize', resizeCanvas);
    }
    
    // ===== Конвертация координат =====
    
    screenToWorld(sx, sy) {
        return {
            x: (sx - this.panX) / this.zoom,
            y: (sy - this.panY) / this.zoom
        };
    }
    
    worldToScreen(wx, wy) {
        return {
            x: wx * this.zoom + this.panX,
            y: wy * this.zoom + this.panY
        };
    }
    
    getPointerPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        return this.screenToWorld(sx, sy);
    }
    
    getScreenPointerPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    
    getTouchPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0] || e.changedTouches[0];
        const sx = touch.clientX - rect.left;
        const sy = touch.clientY - rect.top;
        return this.screenToWorld(sx, sy);
    }
    
    getScreenTouchPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const touch = e.touches[0] || e.changedTouches[0];
        return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    
    // ===== Zoom =====
    
    setZoom(newZoom, pivotSX, pivotSY) {
        const oldZoom = this.zoom;
        this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, newZoom));
        
        const ratio = this.zoom / oldZoom;
        this.panX = pivotSX - (pivotSX - this.panX) * ratio;
        this.panY = pivotSY - (pivotSY - this.panY) * ratio;
        
        this.updateZoomIndicator();
        this.requestRedraw();
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
        this.requestRedraw();
    }
    
    // ===== Event Listeners (Pointer Events + Touch for pinch) =====
    
    setupEventListeners() {
        this.canvas.addEventListener('pointerdown', () => this.closeAllDropdowns());
        
        // Pointer events (replaces mouse events, supports stylus/pen)
        this.canvas.addEventListener('pointerdown', this.handlePointerDown.bind(this));
        this.canvas.addEventListener('pointermove', this.handlePointerMove.bind(this));
        this.canvas.addEventListener('pointerup', this.handlePointerUp.bind(this));
        this.canvas.addEventListener('pointerleave', this.handlePointerUp.bind(this));
        this.canvas.addEventListener('pointercancel', this.handlePointerUp.bind(this));
        
        this.canvas.addEventListener('dblclick', this.handleDblClick.bind(this));
        
        // Wheel — zoom
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this), { passive: false });
        
        // Touch events ONLY for multi-touch pinch/zoom
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Клавиатура
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        document.addEventListener('keyup', this.handleKeyUp.bind(this));
        
        // Вставка изображений (Ctrl+V)
        document.addEventListener('paste', this.handlePaste.bind(this));
        
        // Drag-and-drop изображений
        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.canvas.classList.add('drag-over');
        });
        this.canvas.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.canvas.classList.remove('drag-over');
        });
        this.canvas.addEventListener('drop', this.handleDrop.bind(this));
        
        const boardContainer = document.getElementById('boardContainer');
        boardContainer.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        boardContainer.addEventListener('drop', this.handleDrop.bind(this));
        
        this.setupImageImport();
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
    
    // ===== Pointer Handlers (replaces Mouse, adds palm rejection) =====
    
    _shouldRejectAsTouch(e) {
        if (e.pointerType !== 'touch') return false;
        if (!this._penDetected) return false;
        return true;
    }
    
    handlePointerDown(e) {
        if (this._isMultiTouch) return;
        
        // Detect stylus/pen input
        if (e.pointerType === 'pen') {
            this._penDetected = true;
            try { sessionStorage.setItem('wb_penDetected', '1'); } catch (_) {}
        }
        
        // Palm rejection: if pen was detected, finger touches only pan
        if (this._shouldRejectAsTouch(e)) {
            e.preventDefault();
            this.canvas.setPointerCapture(e.pointerId);
            this._activePointerId = e.pointerId;
            this.isPanning = true;
            const sp = this.getScreenPointerPos(e);
            this.panStartX = sp.x;
            this.panStartY = sp.y;
            this.panStartPanX = this.panX;
            this.panStartPanY = this.panY;
            this.canvas.style.cursor = 'grabbing';
            return;
        }
        
        this.canvas.setPointerCapture(e.pointerId);
        this._activePointerId = e.pointerId;
        
        const screenPos = this.getScreenPointerPos(e);
        
        // Middle button, space, or pan tool → panning
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
        
        const pos = this.getPointerPos(e);
        
        // Resize handles
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
    
    handlePointerMove(e) {
        if (this._isMultiTouch) return;
        if (e.pointerId !== this._activePointerId && this._activePointerId !== null && (this.isDrawing || this.isPanning || this.isResizing)) return;
        
        const worldPos = this.getPointerPos(e);
        this.lastMouseWorldX = worldPos.x;
        this.lastMouseWorldY = worldPos.y;
        
        if (this.isPanning) {
            const screenPos = this.getScreenPointerPos(e);
            this.panX = this.panStartPanX + (screenPos.x - this.panStartX);
            this.panY = this.panStartPanY + (screenPos.y - this.panStartY);
            this.requestRedraw();
            return;
        }
        
        if ((this.spacePressed || this.currentTool === 'pan') && !this.isDrawing) {
            this.canvas.style.cursor = 'grab';
            return;
        }
        
        if (this.isResizing && this.selectedElement) {
            this.handleResize(worldPos.x, worldPos.y);
            return;
        }
        
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
    
    handlePointerUp(e) {
        if (this._isMultiTouch) return;
        if (e.pointerId !== this._activePointerId && this._activePointerId !== null) return;
        
        this._activePointerId = null;
        
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
        
        if (this._draggingPolylinePoint >= 0) {
            this._draggingPolylinePoint = -1;
            this.isDragging = false;
            this.isDrawing = false;
            this.saveToHistory();
            this.scheduleSave();
            return;
        }
        
        this.stopDrawing();
    }
    
    handleDblClick(e) {
        if (this.currentTool === 'polyline') {
            const pos = this.getPointerPos(e);
            this.handlePolylineDblClick(pos.x, pos.y);
            return;
        }
        
        if (this.currentTool === 'select' && this.selectedElement && this.selectedElement.type === 'polyline') {
            const pos = this.getPointerPos(e);
            const pts = this.selectedElement.controlPoints;
            let bestIdx = 1;
            let bestDist = Infinity;
            for (let i = 0; i < pts.length - 1; i++) {
                const d = this._distToSegment(pos.x, pos.y, pts[i], pts[i + 1]);
                if (d < bestDist) {
                    bestDist = d;
                    bestIdx = i + 1;
                }
            }
            if (bestDist < 20 / this.zoom) {
                pts.splice(bestIdx, 0, { x: pos.x, y: pos.y });
                this._updatePolylineBounds(this.selectedElement);
                this.selectedElement.timestamp = Date.now();
                this.saveToHistory();
                this.requestRedraw();
                this.scheduleSave();
            }
        }
    }
    
    _distToSegment(px, py, a, b) {
        const dx = b.x - a.x, dy = b.y - a.y;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return Math.hypot(px - a.x, py - a.y);
        let t = ((px - a.x) * dx + (py - a.y) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
    }
    
    // ===== Touch Handlers (ONLY multi-touch pinch/pan) =====
    
    handleTouchStart(e) {
        if (e.touches.length >= 2) {
            e.preventDefault();
            
            // Cancel any ongoing single-pointer drawing
            if (this.isDrawing) {
                this.isDrawing = false;
                this.isDragging = false;
                this.currentElement = null;
                this.currentPath = [];
                this._draggingPolylinePoint = -1;
            }
            
            this._isMultiTouch = true;
            this.isPanning = true;
            
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
        } else if (e.touches.length === 1) {
            // Single touch is handled by pointer events; prevent default only for drawing tools
            // to prevent scroll/zoom browser behavior
            e.preventDefault();
        }
    }
    
    handleTouchMove(e) {
        if (e.touches.length >= 2) {
            e.preventDefault();
            
            const t0 = e.touches[0];
            const t1 = e.touches[1];
            const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
            const rect = this.canvas.getBoundingClientRect();
            const cx = (t0.clientX + t1.clientX) / 2 - rect.left;
            const cy = (t0.clientY + t1.clientY) / 2 - rect.top;
            
            if (this.lastPinchDist > 0) {
                const factor = dist / this.lastPinchDist;
                this.setZoom(this.zoom * factor, cx, cy);
            }
            
            if (this.lastPinchCenter) {
                this.panX += cx - this.lastPinchCenter.x;
                this.panY += cy - this.lastPinchCenter.y;
            }
            
            this.lastPinchDist = dist;
            this.lastPinchCenter = { x: cx, y: cy };
            this.requestRedraw();
        }
    }
    
    handleTouchEnd(e) {
        if (e.touches.length < 2) {
            this.isPanning = false;
            this.lastPinchDist = 0;
            this.lastPinchCenter = null;
            
            if (e.touches.length === 0) {
                this._isMultiTouch = false;
            }
        }
    }
    
    // ===== Keyboard =====
    
    handleKeyDown(e) {
        if (e.code === 'Space' && !e.repeat) {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            e.preventDefault();
            this.spacePressed = true;
            if (!this.isDrawing) this.canvas.style.cursor = 'grab';
            return;
        }
        
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
            if (e.key === '0') {
                e.preventDefault();
                this.resetView();
                return;
            }
        }
        
        const toolMap = {
            'v': 'select',
            'r': 'rectangle',
            'e': 'ellipse',
            'a': 'arrow',
            'l': 'line',
            'p': 'draw',
            't': 'text',
            'h': 'pan',
            'g': 'grid'
        };
        
        const shapeTools = ['rectangle', 'ellipse', 'arrow', 'line', 'polyline', 'grid'];
        
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
        
        const shapesToggle = document.getElementById('shapesToggle');
        const shapesDropdown = document.getElementById('shapesDropdown');
        const shapesPanel = shapesDropdown.querySelector('.dropdown-panel');
        
        this.shapeIcons = {
            rectangle: 'far fa-square',
            ellipse:   'far fa-circle',
            arrow:     'fas fa-long-arrow-alt-right',
            line:      'fas fa-minus',
            polyline:  'fas fa-project-diagram',
            grid:      'fas fa-th'
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
        
        document.addEventListener('click', () => this.closeAllDropdowns());
        document.querySelectorAll('.dropdown-panel').forEach(panel => {
            panel.addEventListener('click', (e) => e.stopPropagation());
        });
        
        const zoomReset = document.getElementById('zoomReset');
        if (zoomReset) zoomReset.addEventListener('click', () => this.resetView());
    }
    
    activateTool(tool, activeBtn) {
        if (this._polylinePoints && this._polylinePoints.length >= 2 && tool !== 'polyline') {
            this.handlePolylineDblClick(0, 0);
        } else {
            this._polylinePoints = null;
        }
        
        this.currentTool = tool;
        this.canvas.className = tool;
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
    
    getHandleSize() {
        return 8 / this.zoom;
    }
    
    getElementBounds(el) {
        if (el.type === 'path' && el.points && el.points.length > 0) {
            let minX = el.points[0].x, maxX = el.points[0].x;
            let minY = el.points[0].y, maxY = el.points[0].y;
            for (let i = 1; i < el.points.length; i++) {
                const p = el.points[i];
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
            }
            return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
        }
        if (el.type === 'polyline' && el.controlPoints && el.controlPoints.length > 0) {
            let minX = el.controlPoints[0].x, maxX = el.controlPoints[0].x;
            let minY = el.controlPoints[0].y, maxY = el.controlPoints[0].y;
            for (let i = 1; i < el.controlPoints.length; i++) {
                const p = el.controlPoints[i];
                if (p.x < minX) minX = p.x;
                if (p.x > maxX) maxX = p.x;
                if (p.y < minY) minY = p.y;
                if (p.y > maxY) maxY = p.y;
            }
            return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
        }
        return { x: el.x, y: el.y, width: el.width, height: el.height };
    }
    
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
        
        if (el.type === 'image') {
            const aspect = orig.width / orig.height;
            if (Math.abs(newW / orig.width - 1) > Math.abs(newH / orig.height - 1)) {
                newH = newW / aspect;
            } else {
                newW = newH * aspect;
            }
            if (this.resizeHandle === 'nw') {
                newX = orig.x + orig.width - newW;
                newY = orig.y + orig.height - newH;
            } else if (this.resizeHandle === 'ne') {
                newY = orig.y + orig.height - newH;
            } else if (this.resizeHandle === 'sw') {
                newX = orig.x + orig.width - newW;
            }
        }
        
        if (Math.abs(newW) > 10 && Math.abs(newH) > 10) {
            el.x = newX;
            el.y = newY;
            el.width = newW;
            el.height = newH;
            if (el.id) el.timestamp = Date.now();
            this.requestRedraw();
        }
    }
    
    // ===== Drawing Logic =====
    
    startDrawing(x, y) {
        if (this.currentTool === 'polyline') {
            this.handlePolylineClick(x, y);
            return;
        }
        
        this.isDrawing = true;
        this.startX = x;
        this.startY = y;
        
        if (this.currentTool === 'select') {
            if (this.selectedElement && this.selectedElement.type === 'polyline') {
                const cpIdx = this.getPolylineControlPoint(x, y, this.selectedElement);
                if (cpIdx >= 0) {
                    this.isDragging = true;
                    this._draggingPolylinePoint = cpIdx;
                    this.requestRedraw();
                    return;
                }
            }
            
            this.selectedElement = this.getElementAt(x, y);
            if (this.selectedElement) {
                this.isDragging = true;
                this._draggingPolylinePoint = -1;
                this.dragOffset = {
                    x: x - this.selectedElement.x,
                    y: y - this.selectedElement.y
                };
            } else {
                this.selectedElement = null;
            }
            this.requestRedraw();
            return;
        }
        
        if (this.currentTool === 'draw') {
            this.currentPath = [{ x, y }];
            this._lastBroadcastPathIndex = 1;
            this.broadcastDrawImmediate({
                type: 'path-start',
                strokeColor: this.strokeColor,
                strokeWidth: this.strokeWidth,
                startPoint: { x, y }
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
            if (this._draggingPolylinePoint >= 0 && this.selectedElement.type === 'polyline') {
                this.selectedElement.controlPoints[this._draggingPolylinePoint] = { x, y };
                this.selectedElement.timestamp = Date.now();
                this._updatePolylineBounds(this.selectedElement);
                this.requestRedraw();
                return;
            }
            
            if (this.selectedElement.type === 'polyline') {
                const dx = x - this.dragOffset.x - this.selectedElement.x;
                const dy = y - this.dragOffset.y - this.selectedElement.y;
                this.selectedElement.x += dx;
                this.selectedElement.y += dy;
                this.selectedElement.controlPoints.forEach(p => { p.x += dx; p.y += dy; });
            } else {
                this.selectedElement.x = x - this.dragOffset.x;
                this.selectedElement.y = y - this.dragOffset.y;
            }
            if (this.selectedElement.id) {
                this.selectedElement.timestamp = Date.now();
                this.broadcastDraw({
                    type: 'move-progress',
                    elementId: this.selectedElement.id,
                    x: this.selectedElement.x,
                    y: this.selectedElement.y
                });
            }
            this.requestRedraw();
            return;
        }
        
        if (this.currentTool === 'draw') {
            this.currentPath.push({ x, y });
            this._broadcastPathBatch();
            this.requestRedraw();
            return;
        }
        
        if (this.currentTool === 'eraser') {
            this.eraseAt(x, y);
            return;
        }
        
        if (this.currentElement) {
            this.currentElement.width = x - this.startX;
            this.currentElement.height = y - this.startY;
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
            this.requestRedraw();
        }
    }
    
    stopDrawing() {
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        this.isDragging = false;
        this._draggingPolylinePoint = -1;
        
        let createdElementId = null;
        
        if (this.currentTool === 'draw' && this.currentPath.length > 0) {
            if (this._pathBatchTimer) { clearTimeout(this._pathBatchTimer); this._pathBatchTimer = null; }
            const fromIdx = this._lastBroadcastPathIndex || 0;
            const remaining = this.currentPath.slice(fromIdx);
            if (remaining.length > 0) {
                this.broadcastDrawImmediate({ type: 'path-progress', points: remaining });
            }
            
            const simplified = this._simplifyPoints(this.currentPath, 0.8);
            
            const now = Date.now();
            const newElement = {
                type: 'path',
                points: simplified,
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
        
        if (createdElementId !== null) {
            const finalEl = this.elements.find(e => e.id === createdElementId);
            const elData = finalEl ? Object.assign({}, finalEl) : null;
            if (elData && elData.type === 'image') delete elData.src;
            this.broadcastDrawImmediate({
                type: 'draw-done',
                elementId: createdElementId,
                element: elData
            });
        }
        
        this.requestRedraw();
        this.scheduleSave();
    }
    
    // ===== Point simplification (Ramer-Douglas-Peucker) =====
    
    _simplifyPoints(points, tolerance) {
        if (points.length <= 3) return [...points];
        
        let maxDist = 0;
        let maxIndex = 0;
        const first = points[0];
        const last = points[points.length - 1];
        
        for (let i = 1; i < points.length - 1; i++) {
            const dist = this._perpDist(points[i], first, last);
            if (dist > maxDist) {
                maxDist = dist;
                maxIndex = i;
            }
        }
        
        if (maxDist > tolerance) {
            const left = this._simplifyPoints(points.slice(0, maxIndex + 1), tolerance);
            const right = this._simplifyPoints(points.slice(maxIndex), tolerance);
            return left.slice(0, -1).concat(right);
        }
        
        return [first, last];
    }
    
    _perpDist(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
        const t = Math.max(0, Math.min(1,
            ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lenSq
        ));
        return Math.hypot(
            point.x - (lineStart.x + t * dx),
            point.y - (lineStart.y + t * dy)
        );
    }
    
    eraseAt(x, y) {
        const eraserSize = this.strokeWidth * 5 / this.zoom;
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
            this.requestRedraw();
            this.scheduleSave();
        }
    }
    
    isPointInElement(x, y, element, tolerance = 0) {
        if (element.type === 'path') {
            const threshold = (element.strokeWidth || 2) / 2 + tolerance;
            for (const point of element.points) {
                const dx = x - point.x, dy = y - point.y;
                if (dx * dx + dy * dy <= threshold * threshold) return true;
            }
            return false;
        }
        
        if (element.type === 'polyline' && element.controlPoints) {
            const cpHit = (element.strokeWidth || 2) / 2 + tolerance + 10;
            for (let i = 0; i < element.controlPoints.length; i++) {
                const p = element.controlPoints[i];
                const dx = x - p.x, dy = y - p.y;
                if (dx * dx + dy * dy <= cpHit * cpHit) return true;
            }
            for (let i = 0; i < element.controlPoints.length - 1; i++) {
                const d = this._distToSegment(x, y, element.controlPoints[i], element.controlPoints[i + 1]);
                if (d <= (element.strokeWidth / 2 + tolerance + 5)) {
                    return true;
                }
            }
            return false;
        }
        
        if (element.type === 'text' || element.type === 'image' || element.type === 'grid') {
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
        this.requestRedraw();
        this.scheduleSave();
    }
    
    // ===== Ломаная линия (polyline) =====
    
    handlePolylineClick(x, y) {
        if (!this._polylinePoints) {
            this._polylinePoints = [];
        }
        this._polylinePoints.push({ x, y });
        this.requestRedraw();
    }
    
    handlePolylineDblClick(x, y) {
        if (!this._polylinePoints || this._polylinePoints.length < 2) {
            this._polylinePoints = null;
            return;
        }
        
        const points = this._polylinePoints;
        const now = Date.now();
        
        let minX = points[0].x, maxX = points[0].x;
        let minY = points[0].y, maxY = points[0].y;
        for (let i = 1; i < points.length; i++) {
            if (points[i].x < minX) minX = points[i].x;
            if (points[i].x > maxX) maxX = points[i].x;
            if (points[i].y < minY) minY = points[i].y;
            if (points[i].y > maxY) maxY = points[i].y;
        }
        
        const newElement = {
            type: 'polyline',
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            controlPoints: points.map(p => ({ x: p.x, y: p.y })),
            strokeColor: this.strokeColor,
            fillColor: 'transparent',
            strokeWidth: this.strokeWidth,
            id: now + Math.random(),
            timestamp: now
        };
        
        this.elements.push(newElement);
        this.localElements.add(newElement.id);
        this._polylinePoints = null;
        this.saveToHistory();
        this.requestRedraw();
        this.scheduleSave();
        
        this.broadcastDrawImmediate({
            type: 'draw-done',
            elementId: newElement.id,
            element: newElement
        });
    }
    
    _drawPolylinePreview(ctx) {
        if (!this._polylinePoints || this._polylinePoints.length === 0) return;
        const pts = this._polylinePoints;
        
        ctx.save();
        ctx.translate(this.panX, this.panY);
        ctx.scale(this.zoom, this.zoom);
        
        ctx.beginPath();
        ctx.strokeStyle = this.strokeColor;
        ctx.lineWidth = this.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        if (pts.length >= 2) {
            this._drawSmoothPolyline(ctx, pts);
        } else {
            ctx.moveTo(pts[0].x, pts[0].y);
        }
        ctx.stroke();
        
        const hs = 7 / this.zoom;
        pts.forEach((p, idx) => {
            ctx.beginPath();
            ctx.fillStyle = (idx === 0 || idx === pts.length - 1) ? '#4c6ef5' : '#667eea';
            ctx.arc(p.x, p.y, (idx === 0 || idx === pts.length - 1) ? hs * 1.3 : hs, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5 / this.zoom;
            ctx.stroke();
        });
        
        ctx.restore();
    }
    
    _drawSmoothPolyline(ctx, pts) {
        if (pts.length < 2) return;
        if (pts.length === 2) {
            ctx.moveTo(pts[0].x, pts[0].y);
            ctx.lineTo(pts[1].x, pts[1].y);
            return;
        }
        
        ctx.moveTo(pts[0].x, pts[0].y);
        
        for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[Math.max(i - 1, 0)];
            const p1 = pts[i];
            const p2 = pts[i + 1];
            const p3 = pts[Math.min(i + 2, pts.length - 1)];
            
            const segments = 20;
            
            for (let t = 1; t <= segments; t++) {
                const s = t / segments;
                const s2 = s * s;
                const s3 = s2 * s;
                
                const x = 0.5 * (
                    (2 * p1.x) +
                    (-p0.x + p2.x) * s +
                    (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * s2 +
                    (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * s3
                );
                const y = 0.5 * (
                    (2 * p1.y) +
                    (-p0.y + p2.y) * s +
                    (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * s2 +
                    (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * s3
                );
                
                ctx.lineTo(x, y);
            }
        }
    }
    
    getPolylineControlPoint(mx, my, el) {
        if (!el || el.type !== 'polyline' || !el.controlPoints) return -1;
        const hs = 12 / this.zoom;
        for (let i = 0; i < el.controlPoints.length; i++) {
            const p = el.controlPoints[i];
            if (Math.abs(mx - p.x) <= hs && Math.abs(my - p.y) <= hs) {
                return i;
            }
        }
        return -1;
    }
    
    _updatePolylineBounds(el) {
        if (!el.controlPoints || el.controlPoints.length === 0) return;
        let minX = el.controlPoints[0].x, maxX = el.controlPoints[0].x;
        let minY = el.controlPoints[0].y, maxY = el.controlPoints[0].y;
        for (let i = 1; i < el.controlPoints.length; i++) {
            const p = el.controlPoints[i];
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        }
        el.x = minX;
        el.y = minY;
        el.width = maxX - minX;
        el.height = maxY - minY;
    }
    
    // ===== Вставка изображений =====
    
    handlePaste(e) {
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
    
    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        this.canvas.classList.remove('drag-over');
        
        const files = e.dataTransfer && e.dataTransfer.files;
        if (!files || files.length === 0) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const sx = e.clientX - rect.left;
        const sy = e.clientY - rect.top;
        const worldPos = this.screenToWorld(sx, sy);
        
        for (const file of files) {
            if (file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (ev) => {
                    this.addImageElement(ev.target.result, worldPos.x, worldPos.y);
                };
                reader.readAsDataURL(file);
            }
        }
    }
    
    setupImageImport() {
        const importBtn = document.getElementById('importImageBtn');
        const fileInput = document.getElementById('imageFileInput');
        
        if (importBtn && fileInput) {
            importBtn.addEventListener('click', () => {
                fileInput.click();
            });
            
            fileInput.addEventListener('change', (e) => {
                const files = e.target.files;
                if (!files || files.length === 0) return;
                
                for (const file of files) {
                    if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                            this.addImageElement(ev.target.result);
                        };
                        reader.readAsDataURL(file);
                    }
                }
                
                fileInput.value = '';
            });
        }
    }
    
    addImageElement(dataUrl, dropX, dropY) {
        const img = new Image();
        img.onload = () => {
            const cx = dropX !== undefined ? dropX : this.lastMouseWorldX;
            const cy = dropY !== undefined ? dropY : this.lastMouseWorldY;
            
            let w = img.naturalWidth;
            let h = img.naturalHeight;
            const maxDim = 1200;
            
            // Compress: re-encode via canvas to limit resolution and file size
            let finalSrc = dataUrl;
            if (w > maxDim || h > maxDim || dataUrl.length > 500000) {
                const compressed = this._compressImage(img, maxDim, 0.82);
                if (compressed) finalSrc = compressed;
            }
            
            const displayMax = 600;
            let dw = w, dh = h;
            if (dw > displayMax || dh > displayMax) {
                const ratio = Math.min(displayMax / dw, displayMax / dh);
                dw = Math.round(dw * ratio);
                dh = Math.round(dh * ratio);
            }
            
            const now = Date.now();
            const newElement = {
                type: 'image',
                x: cx - dw / 2,
                y: cy - dh / 2,
                width: dw,
                height: dh,
                src: finalSrc,
                id: now + Math.random(),
                timestamp: now
            };
            
            this.imageCache.set(newElement.id, img);
            this._imageSrcStore.set(newElement.id, finalSrc);
            
            this.elements.push(newElement);
            this.localElements.add(newElement.id);
            this.saveToHistory();
            this.requestRedraw();
            this.scheduleSave();
        };
        img.onerror = () => {
            console.warn('Whiteboard: не удалось загрузить изображение');
        };
        img.src = dataUrl;
    }
    
    _compressImage(img, maxDim, quality) {
        try {
            let w = img.naturalWidth;
            let h = img.naturalHeight;
            if (w > maxDim || h > maxDim) {
                const ratio = Math.min(maxDim / w, maxDim / h);
                w = Math.round(w * ratio);
                h = Math.round(h * ratio);
            }
            const offscreen = document.createElement('canvas');
            offscreen.width = w;
            offscreen.height = h;
            const octx = offscreen.getContext('2d');
            octx.drawImage(img, 0, 0, w, h);
            const webp = offscreen.toDataURL('image/webp', quality);
            if (webp && webp.length > 10 && webp.startsWith('data:image/webp')) return webp;
            return offscreen.toDataURL('image/jpeg', quality);
        } catch (e) {
            return null;
        }
    }
    
    getImageObj(element) {
        if (this.imageCache.has(element.id)) {
            const cached = this.imageCache.get(element.id);
            if (cached.complete && cached.naturalWidth > 0) return cached;
            if (!cached.complete) return cached;
            // Broken image (complete but naturalWidth=0) — retry
            this.imageCache.delete(element.id);
        }
        if (!element.src) return null;
        const img = new Image();
        img.onload = () => {
            this.imageCache.set(element.id, img);
            this.requestRedraw();
        };
        img.onerror = () => {
            this.imageCache.delete(element.id);
            // Retry after delay
            setTimeout(() => this.requestRedraw(), 2000);
        };
        img.src = element.src;
        this.imageCache.set(element.id, img);
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
                
            case 'ellipse': {
                ctx.beginPath();
                const centerX = element.x + element.width / 2;
                const centerY = element.y + element.height / 2;
                const radiusX = Math.abs(element.width) / 2;
                const radiusY = Math.abs(element.height) / 2;
                ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
                ctx.fill();
                ctx.stroke();
                break;
            }
                
            case 'line':
                ctx.beginPath();
                ctx.moveTo(element.x, element.y);
                ctx.lineTo(element.x + element.width, element.y + element.height);
                ctx.stroke();
                break;
                
            case 'arrow': {
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
            }
                
            case 'path':
                ctx.beginPath();
                ctx.strokeStyle = element.strokeColor;
                ctx.lineWidth = element.strokeWidth;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                
                if (element.points && element.points.length > 0) {
                    if (element.points.length <= 2) {
                        ctx.moveTo(element.points[0].x, element.points[0].y);
                        for (let i = 1; i < element.points.length; i++) {
                            ctx.lineTo(element.points[i].x, element.points[i].y);
                        }
                    } else {
                        ctx.moveTo(element.points[0].x, element.points[0].y);
                        for (let i = 1; i < element.points.length - 1; i++) {
                            const midX = (element.points[i].x + element.points[i + 1].x) / 2;
                            const midY = (element.points[i].y + element.points[i + 1].y) / 2;
                            ctx.quadraticCurveTo(element.points[i].x, element.points[i].y, midX, midY);
                        }
                        const last = element.points[element.points.length - 1];
                        ctx.lineTo(last.x, last.y);
                    }
                }
                ctx.stroke();
                break;
            
            case 'polyline':
                ctx.beginPath();
                ctx.strokeStyle = element.strokeColor;
                ctx.lineWidth = element.strokeWidth;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';
                
                if (element.controlPoints && element.controlPoints.length >= 2) {
                    this._drawSmoothPolyline(ctx, element.controlPoints);
                }
                ctx.stroke();
                
                if (this.selectedElement === element) {
                    const cpSize = 7 / this.zoom;
                    element.controlPoints.forEach((p, idx) => {
                        const isEndpoint = (idx === 0 || idx === element.controlPoints.length - 1);
                        const r = isEndpoint ? cpSize * 1.3 : cpSize;
                        ctx.beginPath();
                        ctx.fillStyle = isEndpoint ? '#4c6ef5' : '#667eea';
                        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.strokeStyle = '#fff';
                        ctx.lineWidth = (isEndpoint ? 2.5 : 1.5) / this.zoom;
                        ctx.stroke();
                    });
                }
                break;
                
            case 'grid': {
                const gx = element.x;
                const gy = element.y;
                const gw = element.width;
                const gh = element.height;
                
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(gx, gy, gw, gh);
                
                const targetCell = 40;
                const cellCountX = Math.max(2, Math.round(Math.abs(gw) / targetCell));
                const cellCountY = Math.max(2, Math.round(Math.abs(gh) / targetCell));
                const cellW = gw / cellCountX;
                const cellH = gh / cellCountY;
                
                // Thin grid lines
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(180, 200, 220, 0.5)';
                ctx.lineWidth = 0.5 / this.zoom;
                for (let i = 0; i <= cellCountX; i++) {
                    const lx = gx + i * cellW;
                    ctx.moveTo(lx, gy);
                    ctx.lineTo(lx, gy + gh);
                }
                for (let i = 0; i <= cellCountY; i++) {
                    const ly = gy + i * cellH;
                    ctx.moveTo(gx, ly);
                    ctx.lineTo(gx + gw, ly);
                }
                ctx.stroke();
                
                // Major axes (thicker lines at center)
                ctx.beginPath();
                ctx.strokeStyle = 'rgba(60, 80, 110, 0.8)';
                ctx.lineWidth = 1.5 / this.zoom;
                const midY = gy + gh / 2;
                ctx.moveTo(gx, midY);
                ctx.lineTo(gx + gw, midY);
                const midX = gx + gw / 2;
                ctx.moveTo(midX, gy);
                ctx.lineTo(midX, gy + gh);
                ctx.stroke();
                
                ctx.strokeStyle = 'rgba(100, 120, 150, 0.4)';
                ctx.lineWidth = 1 / this.zoom;
                ctx.strokeRect(gx, gy, gw, gh);
                break;
            }
                
            case 'text':
                ctx.font = `${element.strokeWidth * 10}px Arial`;
                ctx.fillStyle = element.strokeColor;
                ctx.fillText(element.text, element.x, element.y + element.height);
                break;
                
            case 'image': {
                const imgObj = this.getImageObj(element);
                if (imgObj && imgObj.complete && imgObj.naturalWidth > 0) {
                    ctx.drawImage(imgObj, element.x, element.y, element.width, element.height);
                } else {
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
        }
        
        ctx.restore();
    }
    
    drawGrid() {
        const ctx = this.ctx;
        const w = this._cssWidth;
        const h = this._cssHeight;
        
        let gridSize = 20;
        if (this.zoom < 0.4) gridSize = 100;
        else if (this.zoom < 0.8) gridSize = 50;
        
        const topLeft = this.screenToWorld(0, 0);
        const bottomRight = this.screenToWorld(w, h);
        
        const startX = Math.floor(topLeft.x / gridSize) * gridSize;
        const startY = Math.floor(topLeft.y / gridSize) * gridSize;
        
        ctx.save();
        ctx.translate(this.panX, this.panY);
        ctx.scale(this.zoom, this.zoom);
        
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.06)';
        ctx.lineWidth = 1 / this.zoom;
        
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
        const w = this._cssWidth;
        const h = this._cssHeight;
        
        if (w <= 0 || h <= 0) return;
        
        // Reset to DPI base transform (clears any leftover transforms)
        ctx.setTransform(this._dpr, 0, 0, this._dpr, 0, 0);
        
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0, 0, w, h);
        
        this.drawGrid();
        
        ctx.save();
        ctx.translate(this.panX, this.panY);
        ctx.scale(this.zoom, this.zoom);
        
        // Draw all committed elements
        for (let i = 0; i < this.elements.length; i++) {
            this.drawElement(ctx, this.elements[i]);
        }
        
        // Draw current element (shape being created)
        if (this.currentElement) {
            this.drawElement(ctx, this.currentElement);
        }
        
        // Draw current freehand path being drawn
        if (this.currentPath.length >= 2) {
            ctx.beginPath();
            ctx.strokeStyle = this.strokeColor;
            ctx.lineWidth = this.strokeWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            const pts = this.currentPath;
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length - 1; i++) {
                const midX = (pts[i].x + pts[i + 1].x) / 2;
                const midY = (pts[i].y + pts[i + 1].y) / 2;
                ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
            }
            ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
            ctx.stroke();
        }
        
        // Draw selection
        if (this.selectedElement) {
            this.drawSelection(this.selectedElement);
        }
        
        ctx.restore();
        
        // Polyline preview (outside camera transform since it has its own)
        if (this._polylinePoints && this._polylinePoints.length > 0) {
            this._drawPolylinePreview(ctx);
        }
        
        // Remote drawing preview
        this.drawRemoteDrawing();
    }
    
    drawSelection(element) {
        const ctx = this.ctx;
        
        if (element.type === 'polyline') return;
        
        const b = this.getElementBounds(element);
        
        const left = Math.min(b.x, b.x + b.width);
        const right = Math.max(b.x, b.x + b.width);
        const top = Math.min(b.y, b.y + b.height);
        const bottom = Math.max(b.y, b.y + b.height);
        const pad = 4 / this.zoom;
        
        if (element.type !== 'image') {
            ctx.save();
            ctx.strokeStyle = '#667eea';
            ctx.lineWidth = 1.5 / this.zoom;
            ctx.setLineDash([5 / this.zoom, 4 / this.zoom]);
            ctx.strokeRect(left - pad, top - pad, right - left + pad * 2, bottom - top + pad * 2);
            ctx.restore();
        }
        
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
    
    preloadImages() {
        this.elements.forEach(el => {
            if (el.type === 'image' && el.src) {
                const cached = this.imageCache.get(el.id);
                if (cached && cached.complete && cached.naturalWidth > 0) return;
                const img = new Image();
                img.onload = () => {
                    this.imageCache.set(el.id, img);
                    this.requestRedraw();
                };
                img.onerror = () => {
                    this.imageCache.delete(el.id);
                };
                img.src = el.src;
                this.imageCache.set(el.id, img);
            }
        });
    }
    
    // ===== History =====
    
    saveToHistory() {
        this.history = this.history.slice(0, this.historyIndex + 1);
        const snapshot = this.elements.map(el => {
            if (el.type === 'image' && el.src) {
                this._imageSrcStore.set(el.id, el.src);
                const copy = {};
                for (const key in el) {
                    if (key !== 'src') copy[key] = el[key];
                }
                return copy;
            }
            return el;
        });
        this.history.push(JSON.stringify(snapshot));
        this.historyIndex = this.history.length - 1;
        if (this.history.length > 50) {
            this.history.shift();
            this.historyIndex--;
        }
    }
    
    _restoreElementsFromHistory(json) {
        const elements = JSON.parse(json);
        elements.forEach(el => {
            if (el.type === 'image' && !el.src) {
                const storedSrc = this._imageSrcStore.get(el.id);
                if (storedSrc) el.src = storedSrc;
            }
        });
        return elements;
    }
    
    _storeImageSrcs() {
        this.elements.forEach(el => {
            if (el.type === 'image' && el.src) {
                this._imageSrcStore.set(el.id, el.src);
            }
        });
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.elements = this._restoreElementsFromHistory(this.history[this.historyIndex]);
            this.preloadImages();
            this.requestRedraw();
            this.scheduleSave();
        }
    }
    
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.elements = this._restoreElementsFromHistory(this.history[this.historyIndex]);
            this.preloadImages();
            this.requestRedraw();
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
        
        this.syncInterval = setInterval(() => {
            const now = Date.now();
            const timeSinceLastSync = now - this.lastSyncTime;
            if (this.remoteDirty || timeSinceLastSync > 10000) {
                this.remoteDirty = false;
                this.syncBoardState();
            }
        }, 5000);
    }
    
    // ===== Realtime drawing via STOMP =====
    
    connectRealtimeStomp() {
        if (typeof SockJS === 'undefined' || typeof Stomp === 'undefined') {
            console.warn('Whiteboard: SockJS/Stomp не загружены — realtime отключён');
            return;
        }
        try {
            const socket = new SockJS('/ws');
            this.stompClient = Stomp.over(socket);
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
                setTimeout(() => {
                    try { this.connectRealtimeStomp(); } catch (e) { /* ignore */ }
                }, 5000);
            });
        } catch (e) {
            console.warn('Whiteboard: не удалось инициализировать STOMP:', e);
        }
    }
    
    broadcastDraw(data) {
        const now = Date.now();
        if (now - this.lastBroadcastTime < this.broadcastThrottle) return;
        this.lastBroadcastTime = now;
        if (!this.stompClient || !this.stompClient.connected) return;
        data.senderId = this.currentUserId;
        this.stompClient.send(`/app/whiteboard/draw/${this.lessonId}`, {}, JSON.stringify(data));
    }
    
    broadcastDrawImmediate(data) {
        if (!this.stompClient || !this.stompClient.connected) return;
        data.senderId = this.currentUserId;
        this.stompClient.send(`/app/whiteboard/draw/${this.lessonId}`, {}, JSON.stringify(data));
    }
    
    _broadcastPathBatch() {
        const now = Date.now();
        if (now - this.lastBroadcastTime < this.broadcastThrottle) {
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
    
    cleanupRemoteProtection() {
        const now = Date.now();
        for (const [id, ts] of this.recentRemoteIds) {
            if (now - ts > this.remoteProtectionTTL) {
                this.recentRemoteIds.delete(id);
            }
        }
    }
    
    handleRemoteDraw(data) {
        switch (data.type) {
            case 'path-start':
                this.remoteDrawPath = [];
                this.remoteDrawing = {
                    type: 'path',
                    strokeColor: data.strokeColor || '#000000',
                    strokeWidth: data.strokeWidth || 2
                };
                if (data.startPoint) {
                    this.remoteDrawPath.push(data.startPoint);
                    this.requestRedraw();
                }
                break;
                
            case 'path-progress':
                if (data.points && data.points.length) {
                    this.remoteDrawPath.push(...data.points);
                    this.requestRedraw();
                }
                break;
                
            case 'shape-progress':
                this.remoteDrawing = data.element;
                this.requestRedraw();
                break;
                
            case 'draw-done': {
                const now = Date.now();
                let addedId = null;
                
                if (data.element) {
                    addedId = data.element.id || data.elementId || (now + Math.random());
                    const already = this.elements.find(e => e.id === addedId);
                    if (!already) {
                        this.elements.push({
                            ...data.element,
                            id: addedId,
                            timestamp: now
                        });
                    }
                } else if (this.remoteDrawing) {
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
                
                if (addedId != null) {
                    this.recentRemoteIds.set(addedId, now);
                    this.cleanupRemoteProtection();
                }
                
                this.remoteDrawing = null;
                this.remoteDrawPath = [];
                this.requestRedraw();
                this.remoteDirty = true;
                break;
            }
                
            case 'erase':
                if (data.ids && data.ids.length) {
                    const idsSet = new Set(data.ids);
                    this.elements = this.elements.filter(el => !idsSet.has(el.id));
                    data.ids.forEach(id => this.recentRemoteIds.delete(id));
                    this.requestRedraw();
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
                        this.requestRedraw();
                    }
                }
                break;
        }
    }
    
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
            
            const rpts = this.remoteDrawPath;
            if (rpts.length === 1) {
                ctx.moveTo(rpts[0].x, rpts[0].y);
                ctx.arc(rpts[0].x, rpts[0].y,
                        this.remoteDrawing.strokeWidth / 2, 0, Math.PI * 2);
                ctx.fillStyle = this.remoteDrawing.strokeColor;
                ctx.fill();
            } else if (rpts.length <= 2) {
                ctx.moveTo(rpts[0].x, rpts[0].y);
                for (let i = 1; i < rpts.length; i++) {
                    ctx.lineTo(rpts[i].x, rpts[i].y);
                }
                ctx.stroke();
            } else {
                ctx.moveTo(rpts[0].x, rpts[0].y);
                for (let i = 1; i < rpts.length - 1; i++) {
                    const midX = (rpts[i].x + rpts[i + 1].x) / 2;
                    const midY = (rpts[i].y + rpts[i + 1].y) / 2;
                    ctx.quadraticCurveTo(rpts[i].x, rpts[i].y, midX, midY);
                }
                ctx.lineTo(rpts[rpts.length - 1].x, rpts[rpts.length - 1].y);
                ctx.stroke();
            }
        } else if (this.remoteDrawing.type && this.remoteDrawing.type !== 'path') {
            ctx.globalAlpha = 0.6;
            this.drawElement(ctx, this.remoteDrawing);
        }
        
        ctx.restore();
    }
    
    // ===== Sync =====
    
    async syncBoardState() {
        if (this.isSaving || this.isDrawing || this.currentPath.length > 0) return;
        if (this.remoteDrawing) return;
        
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
                        const prevJson = JSON.stringify(this.elements);
                        
                        this.mergeElements(serverElements);
                        this.lastSyncedVersion = serverVersion;
                        this.lastSyncTime = Date.now();
                        
                        this.lastSavedData = JSON.stringify({
                            elements: this.elements,
                            appState: boardData.appState || {}
                        });
                        
                        this._storeImageSrcs();
                        this.saveToHistory();
                        this.preloadImages();
                        
                        const newJson = JSON.stringify(this.elements);
                        if (newJson !== prevJson) {
                            this.requestRedraw();
                        }
                    } else {
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
        
        const serverMap = new Map();
        serverElements.forEach(el => {
            if (el.id != null) {
                if (!el.timestamp) el.timestamp = 0;
                serverMap.set(el.id, el);
            }
        });
        
        const currentMap = new Map();
        this.elements.forEach(el => {
            if (el.id != null) {
                if (!el.timestamp) el.timestamp = now;
                currentMap.set(el.id, el);
            }
        });
        
        this.cleanupRemoteProtection();
        
        const merged = new Map();
        
        // Server elements form the baseline
        serverElements.forEach(el => {
            if (el.id != null) {
                const localEl = currentMap.get(el.id);
                if (localEl && (localEl.timestamp || 0) > (el.timestamp || 0)) {
                    merged.set(el.id, localEl);
                } else {
                    merged.set(el.id, el);
                }
            } else {
                merged.set(Symbol('no-id'), el);
            }
        });
        
        // Preserve local elements not yet on server
        this.localElements.forEach(localId => {
            if (!merged.has(localId)) {
                const localEl = currentMap.get(localId);
                if (localEl) merged.set(localId, localEl);
            }
        });
        
        // Preserve recently received STOMP elements not yet on server
        this.recentRemoteIds.forEach((ts, remoteId) => {
            if (!merged.has(remoteId)) {
                const el = currentMap.get(remoteId);
                if (el) merged.set(remoteId, el);
            }
        });
        
        // Extra safety: never drop image elements that still have src data
        currentMap.forEach((el, id) => {
            if (el.type === 'image' && el.src && !merged.has(id)) {
                merged.set(id, el);
            }
        });
        
        this.elements = Array.from(merged.values());
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
                this.requestRedraw();
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
                    
                    this._storeImageSrcs();
                    this.saveToHistory();
                    this.preloadImages();
                    this.requestRedraw();
                    
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
                    this.requestRedraw();
                }
            } else {
                this.elements = [];
                this.requestRedraw();
            }
        } catch (error) {
            console.error('Ошибка загрузки доски:', error);
            this.elements = [];
            this.requestRedraw();
        }
    }
}

// Глобальные функции
let whiteboard;

function clearBoard() {
    if (confirm('Вы уверены, что хотите очистить доску?')) {
        whiteboard.elements = [];
        whiteboard.saveToHistory();
        whiteboard.requestRedraw();
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
        if (whiteboard._rafId) cancelAnimationFrame(whiteboard._rafId);
        whiteboard.saveBoardState();
        window.location.href = '/dashboard';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        whiteboard = new Whiteboard();
    } catch (e) {
        console.error('Whiteboard: ошибка инициализации:', e);
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
