/**
 * 🎨 ULTRA BOARD RENDERER
 * Революционный рендерер для онлайн доски с поддержкой WebGL и Canvas2D
 * Создано самым гениальным разработчиком в мире
 * 
 * ОСОБЕННОСТИ:
 * ⚡ WebGL acceleration с fallback на Canvas2D
 * 🎯 Viewport culling - рендер только видимых объектов  
 * 🔥 Dirty regions - обновление только изменений
 * 💫 Smooth interpolation для плавной анимации
 * 🖌️ Advanced brush effects и анти-алиасинг
 */

class UltraBoardRenderer {
    constructor(canvas, options = {}) {
        console.log('🎨 === ULTRA BOARD RENDERER ИНИЦИАЛИЗАЦИЯ ===');
        
        this.canvas = canvas;
        this.options = {
            // Настройки рендеринга
            preferWebGL: options.preferWebGL !== false,
            antialiasing: options.antialiasing !== false,
            maxFPS: options.maxFPS || 60,
            
            // Viewport настройки
            viewportCulling: options.viewportCulling !== false,
            cullingMargin: options.cullingMargin || 100, // Отступ для culling
            
            // Dirty regions
            dirtyRegionsEnabled: options.dirtyRegionsEnabled !== false,
            maxDirtyRegions: options.maxDirtyRegions || 50,
            
            // Эффекты
            smoothInterpolation: options.smoothInterpolation !== false,
            brushEffects: options.brushEffects !== false,
            
            // Производительность
            batchRendering: options.batchRendering !== false,
            instancedRendering: options.instancedRendering !== false,
            
            ...options
        };
        
        // Инициализация рендерера
        this.initRenderer();
        
        // Состояние рендеринга
        this.state = {
            renderMode: this.renderMode, // 'webgl' или 'canvas2d'
            viewMatrix: this.createIdentityMatrix(),
            projectionMatrix: this.createIdentityMatrix(),
            dirtyRegions: new Set(),
            animationFrame: null,
            lastFrameTime: 0,
            frameCount: 0,
            fps: 0
        };
        
        // Объекты для рендеринга
        this.renderQueue = [];
        this.visibleObjects = new Set();
        this.objectBounds = new Map();
        
        // Кеши и буферы
        this.pathCache = new Map();
        this.textureCache = new Map();
        this.strokeBuffers = new Map();
        
        // Метрики
        this.metrics = {
            objectsRendered: 0,
            trianglesRendered: 0,
            drawCalls: 0,
            cullsPerformed: 0,
            renderTime: 0
        };
        
        console.log(`✅ ULTRA BOARD RENDERER готов! Режим: ${this.renderMode}`);
    }
    
    initRenderer() {
        // Попытка инициализации WebGL
        if (this.options.preferWebGL) {
            this.webglContext = this.initWebGL();
            if (this.webglContext) {
                this.renderMode = 'webgl';
                this.ctx = null; // WebGL не использует ctx
                console.log('✅ WebGL режим активирован');
                return;
            }
        }
        
        // Fallback на Canvas2D
        this.canvas2dContext = this.initCanvas2D();
        this.renderMode = 'canvas2d';
        this.ctx = this.canvas2dContext; // Устанавливаем ctx для совместимости
        console.log('✅ Canvas2D режим активирован');
    }
    
    /**
     * 🌟 WEBGL ИНИЦИАЛИЗАЦИЯ
     */
    initWebGL() {
        try {
            const gl = this.canvas.getContext('webgl2', {
                antialias: this.options.antialiasing,
                premultipliedAlpha: true,
                preserveDrawingBuffer: false,
                powerPreference: 'high-performance'
            }) || this.canvas.getContext('webgl', {
                antialias: this.options.antialiasing,
                premultipliedAlpha: true,
                preserveDrawingBuffer: false
            });
            
            if (!gl) {
                console.warn('❌ WebGL не поддерживается');
                return null;
            }
            
            console.log('✅ WebGL контекст создан');
            
            // Базовые настройки WebGL
            this.setupWebGL(gl);
            
            // Компиляция шейдеров
            this.shaderPrograms = this.compileShaders(gl);
            
            // Создание буферов
            this.createBuffers(gl);
            
            return gl;
            
        } catch (error) {
            console.error('❌ Ошибка инициализации WebGL:', error);
            return null;
        }
    }
    
    setupWebGL(gl) {
        // Включаем блендинг для прозрачности
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        
        // Настройки viewport
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        
        // Цвет очистки
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
    }
    
    compileShaders(gl) {
        const programs = {};
        
        // Шейдер для штрихов
        programs.stroke = this.createShaderProgram(gl, {
            vertex: `
                attribute vec2 a_position;
                attribute vec4 a_color;
                attribute float a_size;
                
                uniform mat3 u_viewMatrix;
                uniform mat3 u_projectionMatrix;
                uniform vec2 u_resolution;
                
                varying vec4 v_color;
                varying float v_size;
                
                void main() {
                    vec3 position = u_projectionMatrix * u_viewMatrix * vec3(a_position, 1.0);
                    gl_Position = vec4(position.xy, 0.0, 1.0);
                    
                    v_color = a_color;
                    v_size = a_size;
                    
                    gl_PointSize = a_size;
                }
            `,
            fragment: `
                precision mediump float;
                
                varying vec4 v_color;
                varying float v_size;
                
                void main() {
                    vec2 coord = gl_PointCoord - vec2(0.5);
                    float distance = length(coord);
                    
                    // Сглаживание краев для anti-aliasing
                    float alpha = 1.0 - smoothstep(0.4, 0.5, distance);
                    
                    gl_FragColor = vec4(v_color.rgb, v_color.a * alpha);
                }
            `
        });
        
        // Шейдер для линий
        programs.line = this.createShaderProgram(gl, {
            vertex: `
                attribute vec2 a_position;
                attribute vec4 a_color;
                attribute float a_width;
                
                uniform mat3 u_viewMatrix;
                uniform mat3 u_projectionMatrix;
                
                varying vec4 v_color;
                
                void main() {
                    vec3 position = u_projectionMatrix * u_viewMatrix * vec3(a_position, 1.0);
                    gl_Position = vec4(position.xy, 0.0, 1.0);
                    v_color = a_color;
                }
            `,
            fragment: `
                precision mediump float;
                varying vec4 v_color;
                
                void main() {
                    gl_FragColor = v_color;
                }
            `
        });
        
        return programs;
    }
    
    createShaderProgram(gl, shaders) {
        // Компилируем вершинный шейдер
        const vertexShader = this.compileShader(gl, gl.VERTEX_SHADER, shaders.vertex);
        if (!vertexShader) return null;
        
        // Компилируем фрагментный шейдер
        const fragmentShader = this.compileShader(gl, gl.FRAGMENT_SHADER, shaders.fragment);
        if (!fragmentShader) {
            gl.deleteShader(vertexShader);
            return null;
        }
        
        // Создаем программу
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        // Проверяем линковку
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Ошибка линковки шейдерной программы:', gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
            return null;
        }
        
        // Получаем локации атрибутов и uniform
        const programInfo = {
            program: program,
            attribLocations: {},
            uniformLocations: {}
        };
        
        // Автоматически находим все атрибуты и uniform
        const numAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
        for (let i = 0; i < numAttributes; i++) {
            const attribute = gl.getActiveAttrib(program, i);
            programInfo.attribLocations[attribute.name] = gl.getAttribLocation(program, attribute.name);
        }
        
        const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < numUniforms; i++) {
            const uniform = gl.getActiveUniform(program, i);
            programInfo.uniformLocations[uniform.name] = gl.getUniformLocation(program, uniform.name);
        }
        
        return programInfo;
    }
    
    compileShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Ошибка компиляции шейдера:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    createBuffers(gl) {
        this.buffers = {
            // Буфер для позиций точек
            position: gl.createBuffer(),
            // Буфер для цветов
            color: gl.createBuffer(),
            // Буфер для размеров
            size: gl.createBuffer(),
            // Буфер для индексов
            index: gl.createBuffer()
        };
    }
    
    /**
     * 🖌️ CANVAS2D ИНИЦИАЛИЗАЦИЯ
     */
    initCanvas2D() {
        const ctx = this.canvas.getContext('2d', {
            alpha: true,
            desynchronized: true,
            willReadFrequently: false
        });
        
        if (!ctx) {
            throw new Error('Не удалось создать Canvas2D контекст');
        }
        
        // Настройки Canvas2D
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.imageSmoothingEnabled = this.options.antialiasing;
        
        // Применяем DPR масштабирование
        const dpr = window.devicePixelRatio || 1;
        if (dpr !== 1) {
            ctx.scale(dpr, dpr);
        }
        
        console.log('✅ Canvas2D контекст создан с DPR:', dpr);
        return ctx;
    }
    
    /**
     * 🎯 VIEWPORT CULLING
     */
    updateViewport(viewMatrix) {
        this.state.viewMatrix = viewMatrix;
        
        // Вычисляем видимую область
        this.viewportBounds = this.calculateViewportBounds();
        
        // Обновляем видимые объекты
        this.updateVisibleObjects();
    }
    
    calculateViewportBounds() {
        const transform = this.invertMatrix(this.state.viewMatrix);
        
        // Углы экрана в мировых координатах
        const corners = [
            { x: 0, y: 0 },
            { x: this.canvas.width, y: 0 },
            { x: this.canvas.width, y: this.canvas.height },
            { x: 0, y: this.canvas.height }
        ];
        
        const worldCorners = corners.map(corner => 
            this.transformPoint(corner, transform)
        );
        
        // Находим границы
        const minX = Math.min(...worldCorners.map(p => p.x)) - this.options.cullingMargin;
        const maxX = Math.max(...worldCorners.map(p => p.x)) + this.options.cullingMargin;
        const minY = Math.min(...worldCorners.map(p => p.y)) - this.options.cullingMargin;
        const maxY = Math.max(...worldCorners.map(p => p.y)) + this.options.cullingMargin;
        
        return { minX, maxX, minY, maxY };
    }
    
    updateVisibleObjects() {
        this.visibleObjects.clear();
        
        // Проверяем каждый объект на видимость
        for (const [objectId, object] of this.board?.objects || []) {
            if (this.isObjectVisible(object)) {
                this.visibleObjects.add(objectId);
            }
        }
        
        this.metrics.cullsPerformed++;
    }
    
    isObjectVisible(object) {
        const bounds = this.getObjectBounds(object);
        
        return !(bounds.maxX < this.viewportBounds.minX ||
                bounds.minX > this.viewportBounds.maxX ||
                bounds.maxY < this.viewportBounds.minY ||
                bounds.minY > this.viewportBounds.maxY);
    }
    
    getObjectBounds(object) {
        // Кешируем вычисленные границы
        if (!this.objectBounds.has(object.id)) {
            this.objectBounds.set(object.id, this.calculateObjectBounds(object));
        }
        
        return this.objectBounds.get(object.id);
    }
    
    calculateObjectBounds(object) {
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
                minX: minX - padding,
                minY: minY - padding,
                maxX: maxX + padding,
                maxY: maxY + padding
            };
        }
        
        return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    }
    
    /**
     * 🔥 DIRTY REGIONS
     */
    addDirtyRegion(region) {
        if (!this.options.dirtyRegionsEnabled) return;
        
        // Ограничиваем количество dirty regions
        if (this.state.dirtyRegions.size >= this.options.maxDirtyRegions) {
            // Объединяем все в одну большую область
            this.state.dirtyRegions.clear();
            this.state.dirtyRegions.add({
                x: 0, y: 0,
                width: this.canvas.width,
                height: this.canvas.height
            });
            return;
        }
        
        this.state.dirtyRegions.add(region);
    }
    
    optimizeDirtyRegions() {
        if (this.state.dirtyRegions.size <= 1) return;
        
        const regions = [...this.state.dirtyRegions];
        const optimized = [];
        
        // Простая оптимизация - объединяем перекрывающиеся регионы
        regions.forEach(region => {
            let merged = false;
            for (let i = 0; i < optimized.length; i++) {
                if (this.regionsOverlap(region, optimized[i])) {
                    optimized[i] = this.mergeRegions(region, optimized[i]);
                    merged = true;
                    break;
                }
            }
            if (!merged) {
                optimized.push(region);
            }
        });
        
        this.state.dirtyRegions.clear();
        optimized.forEach(region => this.state.dirtyRegions.add(region));
    }
    
    regionsOverlap(a, b) {
        return !(a.x + a.width < b.x || 
                b.x + b.width < a.x || 
                a.y + a.height < b.y || 
                b.y + b.height < a.y);
    }
    
    mergeRegions(a, b) {
        const x = Math.min(a.x, b.x);
        const y = Math.min(a.y, b.y);
        const maxX = Math.max(a.x + a.width, b.x + b.width);
        const maxY = Math.max(a.y + a.height, b.y + b.height);
        
        return {
            x: x,
            y: y,
            width: maxX - x,
            height: maxY - y
        };
    }
    
    /**
     * 🎨 ОСНОВНЫЕ МЕТОДЫ РЕНДЕРИНГА
     */
    render(objects, forceFullRender = false) {
        const startTime = performance.now();
        
        // Обновляем FPS
        this.updateFPS();
        
        // Выбираем метод рендеринга
        if (forceFullRender || this.state.dirtyRegions.size === 0) {
            this.renderFull(objects);
        } else {
            this.renderDirtyRegions(objects);
        }
        
        // Очищаем dirty regions
        this.state.dirtyRegions.clear();
        
        // Обновляем метрики
        this.metrics.renderTime = performance.now() - startTime;
        this.state.frameCount++;
    }
    
    renderFull(objects) {
        if (this.renderMode === 'webgl') {
            this.renderWebGLFull(objects);
        } else {
            this.renderCanvas2DFull(objects);
        }
    }
    
    renderDirtyRegions(objects) {
        // Оптимизируем регионы
        this.optimizeDirtyRegions();
        
        if (this.renderMode === 'webgl') {
            this.renderWebGLDirty(objects);
        } else {
            this.renderCanvas2DDirty(objects);
        }
    }
    
    /**
     * 🌟 WEBGL РЕНДЕРИНГ
     */
    renderWebGLFull(objects) {
        const gl = this.webglContext;
        
        // Очистка экрана
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        // Рендерим все видимые объекты
        this.renderWebGLObjects(objects, this.visibleObjects);
        
        this.metrics.drawCalls = this.visibleObjects.size;
    }
    
    renderWebGLDirty(objects) {
        const gl = this.webglContext;
        
        // Для WebGL полная перерисовка более эффективна чем частичная
        // TODO: Реализовать framebuffer-based dirty regions
        this.renderWebGLFull(objects);
    }
    
    renderWebGLObjects(objects, visibleObjectIds) {
        const gl = this.webglContext;
        
        // Группируем объекты по типу для batch rendering
        const strokeObjects = [];
        
        for (const objectId of visibleObjectIds) {
            const object = objects.get(objectId);
            if (!object) continue;
            
            if (object.type === 'stroke') {
                strokeObjects.push(object);
            }
        }
        
        // Рендерим штрихи батчами
        if (strokeObjects.length > 0) {
            this.renderWebGLStrokes(strokeObjects);
        }
        
        this.metrics.objectsRendered = strokeObjects.length;
    }
    
    renderWebGLStrokes(strokes) {
        const gl = this.webglContext;
        const program = this.shaderPrograms.stroke;
        
        if (!program) return;
        
        // Используем шейдерную программу
        gl.useProgram(program.program);
        
        // Подготавливаем данные для всех штрихов
        const vertices = [];
        const colors = [];
        const sizes = [];
        
        strokes.forEach(stroke => {
            if (!stroke.points || stroke.points.length === 0) return;
            
            // Цвет штриха
            const color = this.parseColor(stroke.color || '#000000');
            const size = stroke.brushSize || 3;
            
            stroke.points.forEach(point => {
                vertices.push(point.x, point.y);
                colors.push(color.r, color.g, color.b, color.a);
                sizes.push(size);
            });
        });
        
        if (vertices.length === 0) return;
        
        // Загружаем данные в буферы
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.position);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(program.attribLocations.a_position);
        gl.vertexAttribPointer(program.attribLocations.a_position, 2, gl.FLOAT, false, 0, 0);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.color);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(program.attribLocations.a_color);
        gl.vertexAttribPointer(program.attribLocations.a_color, 4, gl.FLOAT, false, 0, 0);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.size);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sizes), gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(program.attribLocations.a_size);
        gl.vertexAttribPointer(program.attribLocations.a_size, 1, gl.FLOAT, false, 0, 0);
        
        // Устанавливаем uniform переменные
        gl.uniformMatrix3fv(program.uniformLocations.u_viewMatrix, false, this.state.viewMatrix);
        gl.uniformMatrix3fv(program.uniformLocations.u_projectionMatrix, false, this.state.projectionMatrix);
        gl.uniform2f(program.uniformLocations.u_resolution, this.canvas.width, this.canvas.height);
        
        // Рендерим точки
        gl.drawArrays(gl.POINTS, 0, vertices.length / 2);
        
        this.metrics.trianglesRendered += vertices.length / 2;
        this.metrics.drawCalls++;
    }
    
    /**
     * 🖌️ CANVAS2D РЕНДЕРИНГ
     */
    renderCanvas2DFull(objects) {
        const ctx = this.canvas2dContext;
        
        if (!ctx) {
            console.error('❌ Canvas2D контекст не инициализирован');
            return;
        }
        
        // Очистка экрана
        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
        
        // Применяем трансформации
        ctx.save();
        this.applyViewTransform(ctx);
        
        // Рендерим все видимые объекты
        this.renderCanvas2DObjects(objects, this.visibleObjects);
        
        ctx.restore();
        
        this.metrics.drawCalls = this.visibleObjects.size;
    }
    
    renderCanvas2DDirty(objects) {
        const ctx = this.canvas2dContext;
        
        // Рендерим каждый dirty region отдельно
        for (const region of this.state.dirtyRegions) {
            ctx.save();
            
            // Устанавливаем клип для региона
            ctx.beginPath();
            ctx.rect(region.x, region.y, region.width, region.height);
            ctx.clip();
            
            // Очищаем регион
            ctx.clearRect(region.x, region.y, region.width, region.height);
            
            // Применяем трансформации
            this.applyViewTransform(ctx);
            
            // Рендерим объекты в регионе
            this.renderCanvas2DObjectsInRegion(objects, region);
            
            ctx.restore();
        }
        
        this.metrics.drawCalls = this.state.dirtyRegions.size;
    }
    
    renderCanvas2DObjects(objects, visibleObjectIds) {
        for (const objectId of visibleObjectIds) {
            const object = objects.get(objectId);
            if (!object) continue;
            
            this.renderCanvas2DObject(object);
        }
        
        this.metrics.objectsRendered = visibleObjectIds.size;
    }
    
    renderCanvas2DObjectsInRegion(objects, region) {
        let objectsInRegion = 0;
        
        for (const [objectId, object] of objects) {
            if (this.objectIntersectsRegion(object, region)) {
                this.renderCanvas2DObject(object);
                objectsInRegion++;
            }
        }
        
        this.metrics.objectsRendered += objectsInRegion;
    }
    
    renderCanvas2DObject(object) {
        const ctx = this.canvas2dContext;
        
        if (object.type === 'stroke') {
            this.renderCanvas2DStroke(object);
        }
        // Другие типы объектов...
    }
    
    renderCanvas2DStroke(stroke) {
        const ctx = this.canvas2dContext;
        
        if (!stroke.points || stroke.points.length === 0) return;
        
        // Настройки стиля
        ctx.strokeStyle = stroke.color || '#000000';
        ctx.lineWidth = stroke.brushSize || 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Применяем эффекты если включены
        if (this.options.brushEffects) {
            this.applyBrushEffects(ctx, stroke);
        }
        
        // Рендерим штрих
        if (this.options.smoothInterpolation && stroke.points.length > 2) {
            this.renderSmoothStroke(ctx, stroke.points);
        } else {
            this.renderBasicStroke(ctx, stroke.points);
        }
    }
    
    renderBasicStroke(ctx, points) {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        
        ctx.stroke();
    }
    
    renderSmoothStroke(ctx, points) {
        if (points.length < 3) {
            this.renderBasicStroke(ctx, points);
            return;
        }
        
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        
        // Используем quadratic curves для сглаживания
        for (let i = 1; i < points.length - 1; i++) {
            const current = points[i];
            const next = points[i + 1];
            
            const midX = (current.x + next.x) / 2;
            const midY = (current.y + next.y) / 2;
            
            ctx.quadraticCurveTo(current.x, current.y, midX, midY);
        }
        
        // Последняя точка
        const lastPoint = points[points.length - 1];
        ctx.lineTo(lastPoint.x, lastPoint.y);
        
        ctx.stroke();
    }
    
    applyBrushEffects(ctx, stroke) {
        // Эффекты кисти - можно добавить текстуру, прозрачность и т.д.
        const alpha = stroke.opacity || 1.0;
        ctx.globalAlpha = alpha;
        
        // Эффект давления (если есть данные)
        if (stroke.pressure) {
            ctx.lineWidth = (stroke.brushSize || 3) * stroke.pressure;
        }
    }
    
    /**
     * 🔧 УТИЛИТЫ
     */
    
    applyViewTransform(ctx) {
        if (!ctx) {
            console.error('❌ Context не найден для applyViewTransform');
            return;
        }
        
        const matrix = this.state.viewMatrix;
        if (matrix && matrix.length >= 8) {
            ctx.transform(matrix[0], matrix[1], matrix[3], matrix[4], matrix[6], matrix[7]);
        }
    }
    
    objectIntersectsRegion(object, region) {
        const bounds = this.getObjectBounds(object);
        
        return !(bounds.maxX < region.x ||
                bounds.minX > region.x + region.width ||
                bounds.maxY < region.y ||
                bounds.minY > region.y + region.height);
    }
    
    parseColor(colorString) {
        // Простой парсер цвета
        if (colorString.startsWith('#')) {
            const hex = colorString.slice(1);
            const r = parseInt(hex.slice(0, 2), 16) / 255;
            const g = parseInt(hex.slice(2, 4), 16) / 255;
            const b = parseInt(hex.slice(4, 6), 16) / 255;
            return { r, g, b, a: 1.0 };
        }
        
        // Fallback
        return { r: 0, g: 0, b: 0, a: 1.0 };
    }
    
    createIdentityMatrix() {
        return [
            1, 0, 0,
            0, 1, 0,
            0, 0, 1
        ];
    }
    
    invertMatrix(matrix) {
        // Простая инверсия 3x3 матрицы для 2D трансформаций
        const det = matrix[0] * matrix[4] - matrix[1] * matrix[3];
        
        if (Math.abs(det) < 1e-10) {
            return this.createIdentityMatrix();
        }
        
        return [
            matrix[4] / det,
            -matrix[1] / det,
            0,
            -matrix[3] / det,
            matrix[0] / det,
            0,
            (matrix[3] * matrix[7] - matrix[4] * matrix[6]) / det,
            (matrix[1] * matrix[6] - matrix[0] * matrix[7]) / det,
            1
        ];
    }
    
    transformPoint(point, matrix) {
        return {
            x: matrix[0] * point.x + matrix[3] * point.y + matrix[6],
            y: matrix[1] * point.x + matrix[4] * point.y + matrix[7]
        };
    }
    
    updateFPS() {
        const now = performance.now();
        const deltaTime = now - this.state.lastFrameTime;
        
        if (deltaTime >= 1000) { // Обновляем FPS раз в секунду
            this.state.fps = this.state.frameCount / (deltaTime / 1000);
            this.state.frameCount = 0;
            this.state.lastFrameTime = now;
        }
    }
    
    /**
     * 📊 ПУБЛИЧНЫЙ API
     */
    
    setBoard(board) {
        this.board = board;
    }
    
    scheduleRender() {
        if (this.state.animationFrame) return;
        
        this.state.animationFrame = requestAnimationFrame(() => {
            this.render(this.board?.objects || new Map());
            this.state.animationFrame = null;
        });
    }
    
    invalidateRegion(region) {
        this.addDirtyRegion(region);
        this.scheduleRender();
    }
    
    invalidateObject(object) {
        const bounds = this.getObjectBounds(object);
        this.invalidateRegion(bounds);
    }
    
    forceFullRender() {
        this.render(this.board?.objects || new Map(), true);
    }
    
    getMetrics() {
        return {
            ...this.metrics,
            fps: this.state.fps,
            renderMode: this.renderMode,
            visibleObjects: this.visibleObjects.size
        };
    }
    
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        
        if (this.webglContext) {
            this.webglContext.viewport(0, 0, width, height);
        }
        
        // Обновляем viewport
        this.updateViewport(this.state.viewMatrix);
        
        // Принудительная перерисовка
        this.forceFullRender();
    }
    
    destroy() {
        // Очистка ресурсов
        if (this.state.animationFrame) {
            cancelAnimationFrame(this.state.animationFrame);
        }
        
        if (this.webglContext) {
            // Удаляем шейдеры и буферы
            Object.values(this.shaderPrograms).forEach(program => {
                this.webglContext.deleteProgram(program.program);
            });
            
            Object.values(this.buffers).forEach(buffer => {
                this.webglContext.deleteBuffer(buffer);
            });
        }
        
        // Очищаем кеши
        this.pathCache.clear();
        this.textureCache.clear();
        this.strokeBuffers.clear();
        this.objectBounds.clear();
        
        console.log('🎨 ULTRA BOARD RENDERER уничтожен');
    }
}

// Экспорт
window.UltraBoardRenderer = UltraBoardRenderer;

console.log('🎨 ULTRA BOARD RENDERER загружен и готов к работе!');
