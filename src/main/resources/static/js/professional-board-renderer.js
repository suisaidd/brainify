// Professional Board Renderer - Высокопроизводительный рендеринг

// Базовый класс рендерера
class BaseRenderer {
    constructor(board) {
        this.board = board;
        this.canvas = board.canvas;
        this.config = board.config;
        this.state = board.state;
    }
    
    render() {
        throw new Error('render() должен быть реализован в наследнике');
    }
    
    clear() {
        throw new Error('clear() должен быть реализован в наследнике');
    }
    
    destroy() {
        // Очистка ресурсов
    }
}

// WebGL рендерер для максимальной производительности
class WebGLRenderer extends BaseRenderer {
    constructor(board) {
        super(board);
        this.gl = null;
        this.programs = new Map();
        this.buffers = new Map();
        this.textures = new Map();
        this.frameBuffer = null;
        this.init();
    }
    
    init() {
        // Получение контекста WebGL
        this.gl = this.canvas.getContext('webgl2', {
            alpha: true,
            antialias: this.config.antialiasing,
            preserveDrawingBuffer: true,
            desynchronized: true,
            powerPreference: 'high-performance'
        });
        
        if (!this.gl) {
            console.warn('WebGL2 не поддерживается, переключаемся на Canvas2D');
            this.board.config.renderer = 'canvas2d';
            this.board.modules.renderer = new Canvas2DRenderer(this.board);
            return;
        }
        
        // Инициализация WebGL
        this.setupGL();
        this.createShaders();
        this.createBuffers();
    }
    
    setupGL() {
        const gl = this.gl;
        
        // Настройка viewport
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        
        // Включение смешивания для прозрачности
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        
        // Очистка цветом фона
        const rgb = this.hexToRgb(this.config.backgroundColor);
        gl.clearColor(rgb.r / 255, rgb.g / 255, rgb.b / 255, 1.0);
    }
    
    createShaders() {
        // Вершинный шейдер для линий
        const lineVertexShader = `
            attribute vec2 a_position;
            attribute vec4 a_color;
            
            uniform mat3 u_matrix;
            
            varying vec4 v_color;
            
            void main() {
                vec3 position = u_matrix * vec3(a_position, 1.0);
                gl_Position = vec4(position.xy, 0.0, 1.0);
                v_color = a_color;
            }
        `;
        
        // Фрагментный шейдер для линий
        const lineFragmentShader = `
            precision mediump float;
            
            varying vec4 v_color;
            
            void main() {
                gl_FragColor = v_color;
            }
        `;
        
        // Создание программы для линий
        this.programs.set('line', this.createProgram(lineVertexShader, lineFragmentShader));
        
        // Шейдеры для фигур
        const shapeVertexShader = `
            attribute vec2 a_position;
            
            uniform mat3 u_matrix;
            uniform vec4 u_color;
            
            void main() {
                vec3 position = u_matrix * vec3(a_position, 1.0);
                gl_Position = vec4(position.xy, 0.0, 1.0);
            }
        `;
        
        const shapeFragmentShader = `
            precision mediump float;
            
            uniform vec4 u_color;
            
            void main() {
                gl_FragColor = u_color;
            }
        `;
        
        this.programs.set('shape', this.createProgram(shapeVertexShader, shapeFragmentShader));
    }
    
    createProgram(vertexSource, fragmentSource) {
        const gl = this.gl;
        
        // Компиляция шейдеров
        const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);
        
        // Создание программы
        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Ошибка линковки программы:', gl.getProgramInfoLog(program));
            return null;
        }
        
        // Получение локаций атрибутов и униформ
        const attributes = {};
        const uniforms = {};
        
        const numAttributes = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);
        for (let i = 0; i < numAttributes; i++) {
            const info = gl.getActiveAttrib(program, i);
            attributes[info.name] = gl.getAttribLocation(program, info.name);
        }
        
        const numUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
        for (let i = 0; i < numUniforms; i++) {
            const info = gl.getActiveUniform(program, i);
            uniforms[info.name] = gl.getUniformLocation(program, info.name);
        }
        
        return { program, attributes, uniforms };
    }
    
    compileShader(type, source) {
        const gl = this.gl;
        
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
    
    createBuffers() {
        const gl = this.gl;
        
        // Буфер для линий
        this.buffers.set('line', {
            position: gl.createBuffer(),
            color: gl.createBuffer()
        });
        
        // Буфер для фигур
        this.buffers.set('shape', {
            position: gl.createBuffer()
        });
    }
    
    render() {
        const gl = this.gl;
        
        // Очистка
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        // Матрица трансформации
        const matrix = this.createTransformMatrix();
        
        // Рендеринг сетки
        if (this.config.gridEnabled) {
            this.renderGrid(matrix);
        }
        
        // Рендеринг слоёв
        this.board.layers.forEach(layer => {
            if (layer.visible) {
                this.renderLayer(layer, matrix);
            }
        });
        
        // Рендеринг выделения
        this.renderSelection(matrix);
    }
    
    createTransformMatrix() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const { zoom, panX, panY, rotation } = this.state;
        
        // Создание матрицы трансформации 3x3
        const matrix = new Float32Array(9);
        
        // Масштабирование и перемещение
        const scaleX = 2 / width * zoom;
        const scaleY = -2 / height * zoom;
        const translateX = -1 + (2 * panX / width);
        const translateY = 1 - (2 * panY / height);
        
        // Поворот
        const cos = Math.cos(rotation);
        const sin = Math.sin(rotation);
        
        // Комбинированная матрица
        matrix[0] = scaleX * cos;
        matrix[1] = scaleX * sin;
        matrix[2] = translateX;
        matrix[3] = scaleY * -sin;
        matrix[4] = scaleY * cos;
        matrix[5] = translateY;
        matrix[6] = 0;
        matrix[7] = 0;
        matrix[8] = 1;
        
        return matrix;
    }
    
    renderGrid(matrix) {
        const gl = this.gl;
        const program = this.programs.get('line');
        
        gl.useProgram(program.program);
        
        // Установка матрицы
        gl.uniformMatrix3fv(program.uniforms.u_matrix, false, matrix);
        
        // Генерация линий сетки
        const gridSize = this.config.gridSize * this.state.zoom;
        const positions = [];
        const colors = [];
        
        const startX = -this.state.panX / this.state.zoom;
        const startY = -this.state.panY / this.state.zoom;
        const endX = startX + this.canvas.width / this.state.zoom;
        const endY = startY + this.canvas.height / this.state.zoom;
        
        // Вертикальные линии
        for (let x = Math.floor(startX / gridSize) * gridSize; x <= endX; x += gridSize) {
            positions.push(x, startY, x, endY);
            colors.push(0.9, 0.9, 0.9, 0.5, 0.9, 0.9, 0.9, 0.5);
        }
        
        // Горизонтальные линии
        for (let y = Math.floor(startY / gridSize) * gridSize; y <= endY; y += gridSize) {
            positions.push(startX, y, endX, y);
            colors.push(0.9, 0.9, 0.9, 0.5, 0.9, 0.9, 0.9, 0.5);
        }
        
        // Загрузка данных в буферы
        const lineBuffers = this.buffers.get('line');
        
        gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffers.position);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(program.attributes.a_position);
        gl.vertexAttribPointer(program.attributes.a_position, 2, gl.FLOAT, false, 0, 0);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffers.color);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(program.attributes.a_color);
        gl.vertexAttribPointer(program.attributes.a_color, 4, gl.FLOAT, false, 0, 0);
        
        // Рисование
        gl.drawArrays(gl.LINES, 0, positions.length / 2);
    }
    
    renderLayer(layer, matrix) {
        layer.objects.forEach(object => {
            this.renderObject(object, matrix, layer.opacity);
        });
    }
    
    renderObject(object, matrix, layerOpacity) {
        const opacity = object.opacity * layerOpacity;
        
        switch (object.type) {
            case 'stroke':
                this.renderStroke(object, matrix, opacity);
                break;
            case 'shape':
                this.renderShape(object, matrix, opacity);
                break;
            case 'text':
                this.renderText(object, matrix, opacity);
                break;
            case 'image':
                this.renderImage(object, matrix, opacity);
                break;
            case 'formula':
                this.renderFormula(object, matrix, opacity);
                break;
        }
    }
    
    renderStroke(stroke, matrix, opacity) {
        const gl = this.gl;
        const program = this.programs.get('line');
        
        gl.useProgram(program.program);
        gl.uniformMatrix3fv(program.uniforms.u_matrix, false, matrix);
        
        // Преобразование точек в массивы для WebGL
        const positions = [];
        const colors = [];
        const rgb = this.hexToRgb(stroke.color);
        
        for (let i = 0; i < stroke.points.length - 1; i++) {
            const p1 = stroke.points[i];
            const p2 = stroke.points[i + 1];
            
            positions.push(p1.x, p1.y, p2.x, p2.y);
            colors.push(
                rgb.r / 255, rgb.g / 255, rgb.b / 255, opacity,
                rgb.r / 255, rgb.g / 255, rgb.b / 255, opacity
            );
        }
        
        // Загрузка в буферы
        const lineBuffers = this.buffers.get('line');
        
        gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffers.position);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(program.attributes.a_position);
        gl.vertexAttribPointer(program.attributes.a_position, 2, gl.FLOAT, false, 0, 0);
        
        gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffers.color);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);
        gl.enableVertexAttribArray(program.attributes.a_color);
        gl.vertexAttribPointer(program.attributes.a_color, 4, gl.FLOAT, false, 0, 0);
        
        // Установка толщины линии
        gl.lineWidth(stroke.brushSize);
        
        // Рисование
        gl.drawArrays(gl.LINES, 0, positions.length / 2);
    }
    
    renderShape(shape, matrix, opacity) {
        // Реализация рендеринга фигур
    }
    
    renderText(text, matrix, opacity) {
        // Текст рендерится через Canvas2D и загружается как текстура
    }
    
    renderImage(image, matrix, opacity) {
        // Рендеринг изображений через текстуры
    }
    
    renderFormula(formula, matrix, opacity) {
        // Математические формулы рендерятся через MathJax/KaTeX
    }
    
    renderSelection(matrix) {
        // Рендеринг рамки выделения
    }
    
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }
    
    clear() {
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    }
    
    destroy() {
        const gl = this.gl;
        
        // Удаление программ
        this.programs.forEach(({ program }) => {
            gl.deleteProgram(program);
        });
        
        // Удаление буферов
        this.buffers.forEach(buffers => {
            Object.values(buffers).forEach(buffer => {
                gl.deleteBuffer(buffer);
            });
        });
        
        // Удаление текстур
        this.textures.forEach(texture => {
            gl.deleteTexture(texture);
        });
        
        this.programs.clear();
        this.buffers.clear();
        this.textures.clear();
    }
}

// Canvas2D рендерер (резервный вариант)
class Canvas2DRenderer extends BaseRenderer {
    constructor(board) {
        super(board);
        this.ctx = board.ctx;
        this.offscreenCanvas = null;
        this.offscreenCtx = null;
        this.init();
    }
    
    init() {
        // Создание offscreen canvas для оптимизации
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = this.config.width;
        this.offscreenCanvas.height = this.config.height;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d', {
            alpha: true,
            desynchronized: true
        });
        
        // Настройка контекста
        this.setupContext(this.ctx);
        this.setupContext(this.offscreenCtx);
    }
    
    setupContext(ctx) {
        ctx.imageSmoothingEnabled = this.config.antialiasing;
        ctx.imageSmoothingQuality = 'high';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
    }
    
    render() {
        console.log('🖼️ Canvas2DRenderer.render() запущен');
        const ctx = this.ctx;
        
        if (!ctx) {
            console.error('❌ Контекст Canvas отсутствует!');
            return;
        }
        
        console.log('📐 Canvas размеры:', this.canvas.width, 'x', this.canvas.height, 'DPR:', this.board.dpr);
        
        // Сохранение состояния
        ctx.save();
        
        // Очистка
        ctx.fillStyle = this.config.backgroundColor;
        const clearWidth = this.canvas.width / this.board.dpr;
        const clearHeight = this.canvas.height / this.board.dpr;
        ctx.fillRect(0, 0, clearWidth, clearHeight);
        console.log('🧹 Canvas очищен, размеры:', clearWidth, 'x', clearHeight);
        
        // Применение трансформаций
        ctx.translate(this.state.panX, this.state.panY);
        ctx.scale(this.state.zoom, this.state.zoom);
        
        if (this.state.rotation !== 0) {
            ctx.rotate(this.state.rotation);
        }
        
        // Рендеринг сетки
        if (this.config.gridEnabled) {
            console.log('🔲 Рендерим сетку...');
            this.renderGrid(ctx);
            console.log('✅ Сетка отрендерена');
        } else {
            console.log('⚠️ Сетка отключена в конфигурации');
        }
        
        // Рендеринг слоёв
        this.board.layers.forEach(layer => {
            if (layer.visible) {
                this.renderLayer(layer, ctx);
            }
        });
        
        // Рендеринг выделения
        this.renderSelection(ctx);
        
        // Рендеринг курсоров других пользователей
        if (this.board.modules.collaboration) {
            this.board.modules.collaboration.renderCursors(ctx);
        }
        
        // Восстановление состояния
        ctx.restore();
    }
    
    renderGrid(ctx) {
        ctx.save();
        
        const gridSize = this.config.gridSize;
        const startX = -this.state.panX / this.state.zoom;
        const startY = -this.state.panY / this.state.zoom;
        const endX = startX + this.canvas.width / this.state.zoom;
        const endY = startY + this.canvas.height / this.state.zoom;
        
        ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
        ctx.lineWidth = 0.5 / this.state.zoom;
        
        ctx.beginPath();
        
        // Вертикальные линии
        for (let x = Math.floor(startX / gridSize) * gridSize; x <= endX; x += gridSize) {
            ctx.moveTo(x, startY);
            ctx.lineTo(x, endY);
        }
        
        // Горизонтальные линии
        for (let y = Math.floor(startY / gridSize) * gridSize; y <= endY; y += gridSize) {
            ctx.moveTo(startX, y);
            ctx.lineTo(endX, y);
        }
        
        ctx.stroke();
        ctx.restore();
    }
    
    renderLayer(layer, ctx) {
        ctx.save();
        ctx.globalAlpha = layer.opacity;
        
        if (layer.blendMode !== 'normal') {
            ctx.globalCompositeOperation = layer.blendMode;
        }
        
        layer.objects.forEach(object => {
            this.renderObject(object, ctx);
        });
        
        ctx.restore();
    }
    
    renderObject(object, ctx) {
        ctx.save();
        
        switch (object.type) {
            case 'stroke':
                this.renderStroke(object, ctx);
                break;
            case 'shape':
                this.renderShape(object, ctx);
                break;
            case 'text':
                this.renderText(object, ctx);
                break;
            case 'image':
                this.renderImage(object, ctx);
                break;
            case 'formula':
                this.renderFormula(object, ctx);
                break;
        }
        
        ctx.restore();
    }
    
    renderStroke(stroke, ctx) {
        if (stroke.points.length < 2) return;
        
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.brushSize;
        ctx.globalAlpha = stroke.opacity || 1;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        
        // Простое рисование линий для отладки
        for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
        }
        
        ctx.stroke();
    }
    
    renderShape(shape, ctx) {
        ctx.fillStyle = shape.fillColor || 'transparent';
        ctx.strokeStyle = shape.strokeColor || shape.color;
        ctx.lineWidth = shape.strokeWidth || 2;
        ctx.globalAlpha = shape.opacity || 1;
        
        switch (shape.shapeType) {
            case 'rectangle':
                if (shape.fillColor) {
                    ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
                }
                ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
                break;
                
            case 'circle':
                ctx.beginPath();
                ctx.arc(shape.x, shape.y, shape.radius, 0, Math.PI * 2);
                if (shape.fillColor) {
                    ctx.fill();
                }
                ctx.stroke();
                break;
                
            case 'arrow':
                this.renderArrow(shape, ctx);
                break;
                
            case 'line':
                ctx.beginPath();
                ctx.moveTo(shape.x1, shape.y1);
                ctx.lineTo(shape.x2, shape.y2);
                ctx.stroke();
                break;
        }
    }
    
    renderArrow(arrow, ctx) {
        const dx = arrow.x2 - arrow.x1;
        const dy = arrow.y2 - arrow.y1;
        const angle = Math.atan2(dy, dx);
        const length = Math.sqrt(dx * dx + dy * dy);
        
        // Линия стрелки
        ctx.beginPath();
        ctx.moveTo(arrow.x1, arrow.y1);
        ctx.lineTo(arrow.x2, arrow.y2);
        ctx.stroke();
        
        // Наконечник стрелки
        const headLength = arrow.headSize || 15;
        ctx.beginPath();
        ctx.moveTo(arrow.x2, arrow.y2);
        ctx.lineTo(
            arrow.x2 - headLength * Math.cos(angle - Math.PI / 6),
            arrow.y2 - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(arrow.x2, arrow.y2);
        ctx.lineTo(
            arrow.x2 - headLength * Math.cos(angle + Math.PI / 6),
            arrow.y2 - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
    }
    
    renderText(text, ctx) {
        ctx.font = `${text.fontSize || 16}px ${text.fontFamily || 'Arial'}`;
        ctx.fillStyle = text.color;
        ctx.globalAlpha = text.opacity || 1;
        ctx.textAlign = text.align || 'left';
        ctx.textBaseline = text.baseline || 'top';
        
        // Поддержка многострочного текста
        const lines = text.content.split('\n');
        const lineHeight = text.lineHeight || text.fontSize * 1.2;
        
        lines.forEach((line, index) => {
            ctx.fillText(line, text.x, text.y + index * lineHeight);
        });
    }
    
    renderImage(image, ctx) {
        if (!image.element || !image.element.complete) return;
        
        ctx.globalAlpha = image.opacity || 1;
        
        if (image.rotation) {
            ctx.save();
            ctx.translate(image.x + image.width / 2, image.y + image.height / 2);
            ctx.rotate(image.rotation);
            ctx.drawImage(
                image.element,
                -image.width / 2,
                -image.height / 2,
                image.width,
                image.height
            );
            ctx.restore();
        } else {
            ctx.drawImage(image.element, image.x, image.y, image.width, image.height);
        }
    }
    
    renderFormula(formula, ctx) {
        // Формулы рендерятся как изображения после обработки LaTeX
        if (formula.renderedImage) {
            this.renderImage({
                ...formula,
                element: formula.renderedImage,
                type: 'image'
            }, ctx);
        }
    }
    
    renderSelection(ctx) {
        if (this.board.selectedObjects.size === 0) return;
        
        ctx.save();
        ctx.strokeStyle = '#007AFF';
        ctx.lineWidth = 2 / this.state.zoom;
        ctx.setLineDash([5 / this.state.zoom, 5 / this.state.zoom]);
        
        // Вычисление общей границы выделения
        let minX = Infinity, minY = Infinity;
        let maxX = -Infinity, maxY = -Infinity;
        
        this.board.selectedObjects.forEach(id => {
            const object = this.board.objects.get(id);
            if (object) {
                const bounds = this.getObjectBounds(object);
                minX = Math.min(minX, bounds.x);
                minY = Math.min(minY, bounds.y);
                maxX = Math.max(maxX, bounds.x + bounds.width);
                maxY = Math.max(maxY, bounds.y + bounds.height);
            }
        });
        
        // Рисование рамки выделения
        ctx.strokeRect(minX - 5, minY - 5, maxX - minX + 10, maxY - minY + 10);
        
        // Рисование маркеров изменения размера
        const markerSize = 8 / this.state.zoom;
        ctx.fillStyle = '#007AFF';
        
        // Углы
        ctx.fillRect(minX - markerSize / 2 - 5, minY - markerSize / 2 - 5, markerSize, markerSize);
        ctx.fillRect(maxX - markerSize / 2 + 5, minY - markerSize / 2 - 5, markerSize, markerSize);
        ctx.fillRect(minX - markerSize / 2 - 5, maxY - markerSize / 2 + 5, markerSize, markerSize);
        ctx.fillRect(maxX - markerSize / 2 + 5, maxY - markerSize / 2 + 5, markerSize, markerSize);
        
        // Середины сторон
        ctx.fillRect((minX + maxX) / 2 - markerSize / 2, minY - markerSize / 2 - 5, markerSize, markerSize);
        ctx.fillRect((minX + maxX) / 2 - markerSize / 2, maxY - markerSize / 2 + 5, markerSize, markerSize);
        ctx.fillRect(minX - markerSize / 2 - 5, (minY + maxY) / 2 - markerSize / 2, markerSize, markerSize);
        ctx.fillRect(maxX - markerSize / 2 + 5, (minY + maxY) / 2 - markerSize / 2, markerSize, markerSize);
        
        ctx.restore();
    }
    
    getObjectBounds(object) {
        // Вычисление границ объекта
        switch (object.type) {
            case 'stroke':
                let minX = Infinity, minY = Infinity;
                let maxX = -Infinity, maxY = -Infinity;
                
                object.points.forEach(point => {
                    minX = Math.min(minX, point.x);
                    minY = Math.min(minY, point.y);
                    maxX = Math.max(maxX, point.x);
                    maxY = Math.max(maxY, point.y);
                });
                
                const padding = object.brushSize / 2;
                return {
                    x: minX - padding,
                    y: minY - padding,
                    width: maxX - minX + padding * 2,
                    height: maxY - minY + padding * 2
                };
                
            case 'shape':
                if (object.shapeType === 'circle') {
                    return {
                        x: object.x - object.radius,
                        y: object.y - object.radius,
                        width: object.radius * 2,
                        height: object.radius * 2
                    };
                }
                return {
                    x: object.x,
                    y: object.y,
                    width: object.width,
                    height: object.height
                };
                
            case 'text':
            case 'image':
            case 'formula':
                return {
                    x: object.x,
                    y: object.y,
                    width: object.width || 100,
                    height: object.height || 50
                };
                
            default:
                return { x: 0, y: 0, width: 0, height: 0 };
        }
    }
    
    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    destroy() {
        // Очистка ресурсов
        this.offscreenCanvas = null;
        this.offscreenCtx = null;
    }
}

// Экспорт классов
window.BaseRenderer = BaseRenderer;
window.WebGLRenderer = WebGLRenderer;
window.Canvas2DRenderer = Canvas2DRenderer;
