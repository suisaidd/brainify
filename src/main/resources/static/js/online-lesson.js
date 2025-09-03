// JavaScript для страницы онлайн-урока

// Защита от дублирования переменных
if (typeof window.isTeacher !== 'undefined') {
    console.warn('⚠️ Переменная isTeacher уже определена, используем существующую');
} else {
    // Определяем isTeacher только если она не существует
    window.isTeacher = false;
}

// Глобальные переменные
let lessonData = null;
let activeMediaStream = null;

// WebSocket переменные
let stompClient = null;
let isConnected = false;
let reconnectAttempts = 0;
let maxReconnectAttempts = 5;
let reconnectInterval = null;

// Переменные для доски
let canvas = null;
let ctx = null;
let isDrawing = false;
let currentTool = 'pen';
let currentColor = '#000000';
let currentBrushSize = 3;
let lastDrawTime = 0;
const drawThrottle = 16; // ~60 FPS

// Переменные для бесконечной доски
let zoom = 1;
let panX = 0;
let panY = 0;
let isPanning = false;
let lastPanX = 0;
let lastPanY = 0;
let isSelecting = false;
let selectedElements = [];

// Переменные для видеоконференции
let peerConnections = {};
let localStream = null;
let roomId = null;
let userId = null;
let userName = null;

// Переменные для синхронизации
let boardStateReceived = false;
let connectedUsers = {};
let autoRestoreInterval = null;
let lastSequenceNumber = 0; // Отслеживаем последний номер последовательности

// Глобальные переменные для сбора точек рисунка
let currentDrawingPoints = [];

// Счетчики для логирования восстановления точек
let restoredPointsCount = 0;
let totalPointsToRestore = 0;
let restorationStartTime = 0;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 === НАЧАЛО ИНИЦИАЛИЗАЦИИ СТРАНИЦЫ ===');
    console.log('📅 Время загрузки:', new Date().toISOString());
    console.log('🔗 URL:', window.location.href);
    
    initializeLesson();
    setupEventListeners();
    
    // Инициализируем доску и видеоконференцию
    setTimeout(async () => {
        console.log('⏰ Таймер инициализации сработал');
        console.log('📚 lessonData доступен:', !!lessonData);
        
        if (lessonData) {
            console.log('🎯 Начинаем инициализацию компонентов...');
            console.log('📋 Данные урока:', {
                id: lessonData.id,
                subject: lessonData.subject?.name,
                teacher: lessonData.teacher?.name,
                student: lessonData.student?.name,
                currentUserId: lessonData.currentUserId
            });
            
            initializeBoard();
            initializeIndicators();
            initializeVideoConference();
            
            // Проверяем и создаем сессию если нужно
            console.log('🔍 Проверка сессии...');
            const sessionResult = await window.checkAndCreateSession();
            console.log('📊 Результат проверки сессии:', sessionResult);
            
            // Немедленно загружаем состояние доски независимо от WebSocket
            console.log('🔄 Немедленная загрузка состояния доски');
            const loadResult = await loadBoardStateImmediately();
            console.log('📊 Результат загрузки состояния:', loadResult);
            
            // Подключаем WebSocket после загрузки состояния доски
            console.log('🔌 Подключение WebSocket...');
            connectWebSocket();
            
            // Принудительно загружаем состояние доски через 2 секунды как fallback
            setTimeout(() => {
                console.log('🔄 Принудительная загрузка состояния доски (fallback)');
                requestBoardState();
            }, 2000);
            
            // Дополнительная проверка синхронизации через 5 секунд
            setTimeout(() => {
                console.log('🔍 Дополнительная проверка синхронизации');
                checkAndRestoreSync();
            }, 5000);
        } else {
            console.error('❌ lessonData не доступен для инициализации');
        }
    }, 500); // Уменьшаем задержку для быстрой инициализации
    
    // Добавляем обработчик фокуса окна для восстановления состояния
    window.addEventListener('focus', function() {
        console.log('Окно получило фокус, проверяем синхронизацию');
        setTimeout(() => {
            checkAndRestoreSync();
        }, 500);
    });
});

// Инициализация урока
function initializeLesson() {
    // Получаем данные урока из URL параметров
    const urlParams = new URLSearchParams(window.location.search);
    const lessonId = urlParams.get('lessonId');
    
    if (!lessonId) {
        showToast('Ошибка: ID урока не указан', 'error');
        setTimeout(() => window.location.href = '/dashboard', 2000);
        return;
    }
    
    // Загружаем данные урока
    loadLessonData(lessonId);
}

// Загрузка данных урока
async function loadLessonData(lessonId) {
    console.log('📚 === ЗАГРУЗКА ДАННЫХ УРОКА ===');
    console.log('🆔 ID урока:', lessonId);
    
    try {
        console.log('🌐 Отправляем запрос к API...');
        const response = await fetch(`/api/lessons/${lessonId}/online-data`);
        console.log('📥 Получен ответ от API, статус:', response.status);
        
        const data = await response.json();
        console.log('📋 Данные ответа:', data);
        
        if (data.success) {
            lessonData = data.lesson;
            console.log('✅ Данные урока загружены успешно');
            console.log('📊 Структура lessonData:', {
                id: lessonData.id,
                subject: lessonData.subject,
                teacher: lessonData.teacher,
                student: lessonData.student,
                currentUserId: lessonData.currentUserId,
                session: lessonData.session
            });
            
            // Инициализируем userName сразу после загрузки lessonData
            userName = lessonData.teacher ? lessonData.teacher.name : lessonData.student.name;
            console.log('👤 userName initialized:', userName);
            
            updateLessonInfo();
            updateConnectionStatus('connected', 'Подключено к уроку');
        } else {
            console.error('❌ Ошибка загрузки данных урока:', data.message);
            showToast(data.message || 'Ошибка загрузки данных урока', 'error');
            setTimeout(() => window.location.href = '/dashboard', 2000);
        }
    } catch (error) {
        console.error('❌ Ошибка загрузки данных урока:', error);
        showToast('Ошибка загрузки данных урока', 'error');
        setTimeout(() => window.location.href = '/dashboard', 2000);
    }
}

// Обновление информации об уроке
function updateLessonInfo() {
    if (!lessonData) return;
    
    document.getElementById('lessonTitle').textContent = `Урок: ${lessonData.subject.name}`;
    document.getElementById('lessonSubject').textContent = lessonData.subject.name;
    document.getElementById('lessonStudent').textContent = lessonData.student.name;
    document.getElementById('lessonTime').textContent = formatLessonTime(lessonData.lessonDate);
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Кнопки хедера
    document.getElementById('fullscreenBtn').addEventListener('click', toggleFullscreen);
    document.getElementById('endLessonBtn').addEventListener('click', showEndLessonModal);
    
    // Кнопки управления звонком
    document.getElementById('muteCallBtn').addEventListener('click', toggleCallMute);
    document.getElementById('videoCallBtn').addEventListener('click', toggleCallVideo);
    document.getElementById('minimizeVideoBtn').addEventListener('click', minimizeVideoWindow);
    
    // Кнопки управления доской
    document.getElementById('clearBoardBtn').addEventListener('click', clearBoard);
    document.getElementById('saveBoardBtn').addEventListener('click', saveBoard);
    document.getElementById('restoreBoardBtn').addEventListener('click', restoreBoardState);
    
    // Кнопка диагностики
    const diagnoseBtn = document.getElementById('diagnoseBtn');
    if (diagnoseBtn) {
        diagnoseBtn.addEventListener('click', function() {
            console.log('🔍 Запуск диагностики восстановления доски...');
            window.diagnoseBoardRestoration();
            showToast('Диагностика выполнена, смотрите консоль', 'info');
        });
    }
    
    // Кнопка полной диагностики
    const fullDiagnoseBtn = document.getElementById('fullDiagnoseBtn');
    if (fullDiagnoseBtn) {
        fullDiagnoseBtn.addEventListener('click', async function() {
            console.log('🔬 Запуск полной диагностики системы...');
            await window.fullSystemDiagnostic();
            showToast('Полная диагностика выполнена, смотрите консоль', 'info');
        });
    }
    
    // Кнопка пересоздания сессии
    const recreateSessionBtn = document.getElementById('recreateSessionBtn');
    if (recreateSessionBtn) {
        recreateSessionBtn.addEventListener('click', async function() {
            console.log('🔄 Пересоздание сессии...');
            const result = await window.recreateSession();
            if (result) {
                showToast('Сессия пересоздана успешно', 'success');
                // Переподключаем WebSocket
                if (stompClient) {
                    stompClient.disconnect();
                }
                setTimeout(() => {
                    connectWebSocket();
                }, 1000);
            } else {
                showToast('Ошибка пересоздания сессии', 'error');
            }
        });
    }
    
    // Добавляем обработчик для принудительного восстановления (двойной клик на кнопке восстановления)
    const restoreBtn = document.getElementById('restoreBoardBtn');
    if (restoreBtn) {
        restoreBtn.addEventListener('dblclick', function() {
            console.log('🚀 Запуск принудительного восстановления с логированием...');
            window.forceRestoreWithLogging();
        });
    }
    
    // Показываем подсказку о новых функциях при загрузке
    setTimeout(() => {
        console.log('💡 Подсказки по отладке:');
        console.log('  - Нажмите кнопку 🐛 для диагностики восстановления');
        console.log('  - Нажмите кнопку 🔬 для полной диагностики системы');
        console.log('  - Нажмите кнопку 🔄 для пересоздания сессии');
        console.log('  - Двойной клик на кнопке восстановления для принудительного восстановления с логированием');
        console.log('  - В консоли доступны функции:');
        console.log('    * window.diagnoseBoardRestoration() - диагностика восстановления');
        console.log('    * window.fullSystemDiagnostic() - полная диагностика');
        console.log('    * window.forceRestoreWithLogging() - принудительное восстановление');
        console.log('    * window.checkAndCreateSession() - проверка/создание сессии');
        console.log('    * window.recreateSession() - пересоздание сессии');
    }, 2000);
    
    // Кнопки зума
    document.getElementById('zoomInBtn').addEventListener('click', zoomIn);
    document.getElementById('zoomOutBtn').addEventListener('click', zoomOut);
    document.getElementById('resetZoomBtn').addEventListener('click', resetZoom);
    
    // Инструменты доски
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            setActiveTool(this.dataset.tool);
        });
    });
    
    // Цвет и размер кисти
    document.getElementById('colorPicker').addEventListener('change', function() {
        currentColor = this.value;
    });
    
    document.getElementById('brushSize').addEventListener('input', function() {
        currentBrushSize = parseInt(this.value);
        document.querySelector('.brush-size-value').textContent = currentBrushSize;
    });
    
    // Горячие клавиши
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // Модальные окна
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // Закрытие модальных окон по клику на backdrop
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
        backdrop.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
}

// Функция для рисования сетки
function drawGrid() {
    if (!canvas || !ctx) return;
    
    const gridSize = 20; // Размер клетки сетки
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.save();
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    
    // Вертикальные линии
    for (let x = 0; x <= width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
    }
    
    // Горизонтальные линии  
    for (let y = 0; y <= height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
    }
    
    ctx.stroke();
    ctx.restore();
}

// Инициализация доски
function initializeBoard() {
    console.log('🎨 === ИНИЦИАЛИЗАЦИЯ ДОСКИ ===');
    console.log('🔍 Поиск canvas элемента...');
    
    canvas = document.getElementById('boardCanvas');
    if (!canvas) {
        console.error('❌ Canvas элемент не найден!');
        console.log('🔍 Доступные элементы с id:');
        document.querySelectorAll('[id]').forEach(el => {
            console.log(`  - ${el.id}: ${el.tagName}`);
        });
        return;
    }
    
    console.log('✅ Canvas элемент найден:', canvas);
    console.log('📏 Размеры canvas до инициализации:', canvas.offsetWidth, 'x', canvas.offsetHeight);
    
    ctx = canvas.getContext('2d', { 
        alpha: false, // Отключаем альфа-канал для лучшей производительности
        desynchronized: true // Улучшаем производительность
    });
    if (!ctx) {
        console.error('❌ Не удалось получить контекст canvas!');
        return;
    }
    
    console.log('✅ Контекст canvas получен:', ctx);
    
    // Оптимизация рендеринга
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Инициализируем начальный фон и сетку
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    console.log('🎨 Начальный фон установлен');
    
    // Рисуем начальную сетку
    drawGrid();
    console.log('🔲 Сетка нарисована');
    
    console.log('Canvas найден, размеры:', canvas.offsetWidth, 'x', canvas.offsetHeight);
    
    // Устанавливаем размер canvas для бесконечной доски
    function resizeCanvas() {
        const container = canvas.parentElement;
        const newWidth = container.clientWidth;
        const newHeight = container.clientHeight;
        
        console.log('Изменение размера canvas:', newWidth, 'x', newHeight);
        
        // Сохраняем текущее содержимое
        let imageData = null;
        if (canvas.width > 0 && canvas.height > 0) {
            try {
                imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            } catch (e) {
                console.log('Не удалось сохранить содержимое canvas:', e);
            }
        }
        
        // Устанавливаем размеры для бесконечной доски
        canvas.width = 10000; // Фиксированный размер для бесконечной доски
        canvas.height = 10000;
        
        // Восстанавливаем настройки после изменения размера
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        console.log('Новые размеры canvas:', canvas.width, 'x', canvas.height);
        
        // Восстанавливаем содержимое доски
        if (boardStateReceived && window.boardStateData) {
            console.log('Восстанавливаем состояние после изменения размера');
            // Сначала рисуем фон и сетку
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            drawGrid();
            restoreBoardFromState(window.boardStateData);
        } else if (imageData) {
            try {
                ctx.putImageData(imageData, 0, 0);
                console.log('Восстановлено содержимое canvas');
            } catch (e) {
                console.log('Не удалось восстановить содержимое canvas:', e);
            }
        } else {
            // Если нет данных для восстановления, рисуем чистую доску с сеткой
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            drawGrid();
        }
        
        // Обновляем трансформацию
        updateCanvasTransform();
    }
    
    // Первоначальная настройка размера
    resizeCanvas();
    
    // Оптимизированный обработчик изменения размера окна с debounce
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(resizeCanvas, 100);
    });
    
    // Настройка событий мыши для бесконечной доски
    canvas.addEventListener('mousedown', handleMouseDown, { passive: false });
    canvas.addEventListener('mousemove', handleMouseMove, { passive: false });
    canvas.addEventListener('mouseup', handleMouseUp, { passive: false });
    canvas.addEventListener('mouseout', handleMouseUp, { passive: false });
    
    // Настройка событий колеса мыши для зума
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    
    // Настройка событий касания
    canvas.addEventListener('touchstart', handleTouch, { passive: false });
    canvas.addEventListener('touchmove', handleTouch, { passive: false });
    canvas.addEventListener('touchend', handleMouseUp, { passive: false });
    
    // Устанавливаем начальные настройки рисования
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentBrushSize;
    
    console.log('=== ДОСКА ИНИЦИАЛИЗИРОВАНА ===');
}

// Обработка касаний для бесконечной доски
function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    if (e.type === 'touchstart') {
        handleMouseDown({ clientX: x, clientY: y });
    } else if (e.type === 'touchmove') {
        handleMouseMove({ clientX: x, clientY: y });
    }
}

// Обработка событий мыши для бесконечной доски
function handleMouseDown(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Преобразуем координаты с учетом зума и панорамирования
    const worldX = (x - panX) / zoom;
    const worldY = (y - panY) / zoom;
    
    if (currentTool === 'hand') {
        // Режим перемещения
        isPanning = true;
        lastPanX = x;
        lastPanY = y;
        canvas.style.cursor = 'grabbing';
        document.querySelector('.board-viewport').setAttribute('data-tool', 'hand');
    } else if (currentTool === 'select') {
        // Режим выбора
        isSelecting = true;
        document.querySelector('.board-viewport').setAttribute('data-tool', 'select');
        // Здесь можно добавить логику выбора элементов
    } else {
        // Режим рисования
        isDrawing = true;
        document.querySelector('.board-viewport').setAttribute('data-tool', currentTool);
        startDrawing(e);
    }
}

function handleMouseMove(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Обновляем индикатор позиции
    updatePositionIndicator(x, y);
    
    if (isPanning) {
        // Перемещение доски
        const deltaX = x - lastPanX;
        const deltaY = y - lastPanY;
        
        panX += deltaX;
        panY += deltaY;
        
        lastPanX = x;
        lastPanY = y;
        
        updateCanvasTransform();
    } else if (isSelecting) {
        // Логика выбора элементов
        // Здесь можно добавить выделение элементов
    } else if (isDrawing) {
        // Рисование
        const worldX = (x - panX) / zoom;
        const worldY = (y - panY) / zoom;
        draw(e);
    }
}

function handleMouseUp(e) {
    if (isPanning) {
        isPanning = false;
        canvas.style.cursor = 'grab';
        document.querySelector('.board-viewport').setAttribute('data-tool', 'hand');
    } else if (isSelecting) {
        isSelecting = false;
        document.querySelector('.board-viewport').setAttribute('data-tool', 'select');
    } else if (isDrawing) {
        stopDrawing();
        document.querySelector('.board-viewport').setAttribute('data-tool', currentTool);
    }
}

// Обработка колеса мыши для зума
function handleWheel(e) {
    e.preventDefault();
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, zoom * zoomFactor));
    
    // Зум к позиции мыши
    const zoomRatio = newZoom / zoom;
    panX = mouseX - (mouseX - panX) * zoomRatio;
    panY = mouseY - (mouseY - panY) * zoomRatio;
    
    zoom = newZoom;
    updateCanvasTransform();
    updateZoomIndicator();
    
    // Показываем подсказку о зуме
    showToast(`Масштаб: ${Math.round(zoom * 100)}%`, 'info');
}

// Обновление трансформации canvas
function updateCanvasTransform() {
    if (!canvas) return;
    
    // Ограничиваем панорамирование, чтобы доска не уходила слишком далеко
    const maxPan = 5000;
    panX = Math.max(-maxPan, Math.min(maxPan, panX));
    panY = Math.max(-maxPan, Math.min(maxPan, panY));
    
    canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    canvas.style.transformOrigin = '0 0';
}

// Обновление индикатора зума
function updateZoomIndicator() {
    const zoomLevel = document.getElementById('zoomLevel');
    if (zoomLevel) {
        zoomLevel.textContent = Math.round(zoom * 100) + '%';
    }
}

// Обновление индикатора позиции
function updatePositionIndicator(x, y) {
    const positionIndicator = document.getElementById('cursorPosition');
    if (positionIndicator) {
        const worldX = Math.round((x - panX) / zoom);
        const worldY = Math.round((y - panY) / zoom);
        positionIndicator.textContent = `${worldX}, ${worldY}`;
    }
}

// Функции зума
function zoomIn() {
    const newZoom = Math.min(5, zoom * 1.2);
    zoom = newZoom;
    updateCanvasTransform();
    updateZoomIndicator();
    showToast(`Масштаб: ${Math.round(zoom * 100)}%`, 'info');
}

function zoomOut() {
    const newZoom = Math.max(0.1, zoom / 1.2);
    zoom = newZoom;
    updateCanvasTransform();
    updateZoomIndicator();
    showToast(`Масштаб: ${Math.round(zoom * 100)}%`, 'info');
}

function resetZoom() {
    zoom = 1;
    panX = 0;
    panY = 0;
    updateCanvasTransform();
    updateZoomIndicator();
    showToast('Масштаб сброшен', 'success');
}

// Обработка горячих клавиш
function handleKeyboardShortcuts(e) {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
            case '=':
            case '+':
                e.preventDefault();
                zoomIn();
                break;
            case '-':
                e.preventDefault();
                zoomOut();
                break;
            case '0':
                e.preventDefault();
                resetZoom();
                break;
        }
    } else {
        switch (e.key.toLowerCase()) {
            case 'h':
                setActiveTool('hand');
                break;
            case 'v':
                setActiveTool('select');
                break;
            case 'p':
                setActiveTool('pen');
                break;
            case 'e':
                setActiveTool('eraser');
                break;
            case 't':
                setActiveTool('text');
                break;
            case 's':
                setActiveTool('shape');
                break;
        }
    }
}

// Начало рисования
function startDrawing(e) {
    console.log('Начало рисования:', e);
    isDrawing = true;
    currentDrawingPoints = []; // Очищаем массив точек
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Преобразуем координаты с учетом зума и панорамирования
    const worldX = (x - panX) / zoom;
    const worldY = (y - panY) / zoom;
    
    console.log('Координаты начала рисования:', worldX, worldY);
    
    // Настраиваем контекст для рисования
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = currentBrushSize;
    
    // Начинаем новый путь
    ctx.beginPath();
    ctx.moveTo(worldX, worldY);
    
    // Добавляем точку начала
    currentDrawingPoints.push({
        type: 'start',
        x: worldX,
        y: worldY,
        color: currentColor,
        brushSize: currentBrushSize,
        timestamp: Date.now()
    });
    
    // Отправляем начальную точку
    sendDrawData('start', worldX, worldY);
}

// Рисование с улучшенным throttling и оптимизацией
function draw(e) {
    if (!isDrawing) return;
    
    const now = Date.now();
    if (now - lastDrawTime < drawThrottle) return;
    lastDrawTime = now;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Преобразуем координаты с учетом зума и панорамирования
    const worldX = (x - panX) / zoom;
    const worldY = (y - panY) / zoom;
    
    // Проверяем валидность координат
    if (!isValidCoordinate(worldX) || !isValidCoordinate(worldY)) {
        console.log('Некорректные координаты:', worldX, worldY);
        return;
    }
    
    // Рисуем локально для плавности
    ctx.lineWidth = currentBrushSize;
    ctx.lineCap = 'round';
    ctx.strokeStyle = currentColor;
    
    ctx.lineTo(worldX, worldY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(worldX, worldY);
    
    // Добавляем точку в массив
    currentDrawingPoints.push({
        type: 'draw',
        x: worldX,
        y: worldY,
        color: currentColor,
        brushSize: currentBrushSize,
        timestamp: Date.now()
    });
    
    // Отправляем точку в реальном времени
    sendDrawData('draw', worldX, worldY);
}

// Остановка рисования
function stopDrawing() {
    if (!isDrawing) return;
    
    isDrawing = false;
    
    // Завершаем текущий путь
    ctx.beginPath();
    
    // Добавляем точку завершения
    currentDrawingPoints.push({
        type: 'end',
        x: null,
        y: null,
        color: currentColor,
        brushSize: currentBrushSize,
        timestamp: Date.now()
    });
    
    // Отправляем конечную точку
    sendDrawData('end', null, null);
    
    // Очищаем массив точек
    currentDrawingPoints = [];
    
    console.log('Рисование завершено');
}

// WebSocket подключение с улучшенным переподключением
function connectWebSocket() {
    console.log('🔌 === ПОДКЛЮЧЕНИЕ WEBSOCKET ===');
    console.log('📚 lessonData:', lessonData);
    console.log('🆔 ID урока для WebSocket:', lessonData?.id);
    
    if (!lessonData || !lessonData.id) {
        console.error('❌ Нет данных урока для WebSocket подключения');
        return;
    }

    // Если уже подключены, не подключаемся повторно
    if (isConnected && stompClient && stompClient.connected) {
        console.log('✅ WebSocket уже подключен');
        return;
    }

    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);
    
    // Настройка логирования
    stompClient.debug = null; // Отключаем debug логи в продакшене
    
    stompClient.connect({}, function (frame) {
        console.log('WebSocket подключен: ' + frame);
        isConnected = true;
        reconnectAttempts = 0;
        updateConnectionStatus('connected', 'Синхронизация активна');
        
        // Подписываемся на обновления доски
        stompClient.subscribe('/topic/board/' + lessonData.id, function (message) {
            try {
                const data = JSON.parse(message.body);
                console.log('Получено WebSocket сообщение:', data);
                handleWebSocketMessage(data);
            } catch (error) {
                console.error('Ошибка парсинга WebSocket сообщения:', error);
            }
        });
        
        // Подписываемся на личные сообщения (состояние доски)
        stompClient.subscribe('/user/topic/board/' + lessonData.id + '/state', function (message) {
            try {
                console.log('Получено состояние доски:', message.body);
                const data = JSON.parse(message.body);
                handleBoardState(data);
            } catch (error) {
                console.error('Ошибка парсинга состояния доски:', error);
            }
        });
        
        // Подписываемся на ошибки
        stompClient.subscribe('/user/topic/errors', function (message) {
            try {
                const data = JSON.parse(message.body);
                console.error('WebSocket ошибка:', data.error);
                showToast('Ошибка синхронизации: ' + data.error, 'error');
            } catch (error) {
                console.error('Ошибка парсинга ошибки WebSocket:', error);
            }
        });
        
        // Отправляем сообщение о подключении только после успешного подключения
        try {
            const currentUserId = getCurrentUserId();
            const currentUserName = userName || (lessonData.teacher ? lessonData.teacher.name : lessonData.student.name) || 'Unknown User';
            
            stompClient.send("/app/board/" + lessonData.id + "/join", {}, JSON.stringify({
                userId: currentUserId.toString(),
                userName: currentUserName,
                timestamp: Date.now()
            }));
            
            console.log('Сообщение о подключении отправлено');
        } catch (error) {
            console.error('Ошибка отправки сообщения о подключении:', error);
        }
        
        // Запрашиваем состояние доски сразу после подключения
        setTimeout(() => {
            console.log('Запрашиваем состояние доски после подключения');
            requestBoardState();
        }, 500); // Увеличиваем задержку для стабильности
        
        showToast('Доска синхронизирована', 'success');
        
        // Запускаем автоматическое восстановление каждые 5 секунд
        startAutoRestore();
        
    }, function (error) {
        console.error('Ошибка WebSocket подключения:', error || 'Неизвестная ошибка');
        isConnected = false;
        updateConnectionStatus('disconnected', 'Синхронизация потеряна: ' + (error?.message || error || 'Неизвестная ошибка'));
        
        // Попытка переподключения
        if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000); // Экспоненциальная задержка
            
            showToast(`Переподключение... (${reconnectAttempts}/${maxReconnectAttempts})`, 'warning');
            
            setTimeout(() => {
                connectWebSocket();
            }, delay);
        } else {
            showToast('Не удалось восстановить соединение', 'error');
        }
    });
}

// Обработка WebSocket сообщений с поддержкой новой системы board_operations
function handleWebSocketMessage(data) {
    console.log('WebSocket message received:', data);
    
    if (!data || !data.type) {
        console.warn('Получено сообщение без типа:', data);
        return;
    }
    
    // Проверяем, что canvas готов
    if (!canvas || !ctx) {
        console.warn('Canvas не готов для обработки сообщения:', data.type);
        return;
    }
    
    switch (data.type) {
        case 'user_joined':
            handleUserJoined(data);
            break;
            
        case 'user_left':
            handleUserLeft(data);
            break;
            
        case 'draw_operation':
            handleDrawOperation(data);
            break;
            
        case 'complete_drawing':
            handleCompleteDrawing(data);
            break;
            
        case 'complete_drawing_saved':
            console.log('Рисунок сохранен:', data.pointsCount + ' точек');
            break;
            
        case 'board_state':
            handleBoardState(data);
            break;
            
        case 'board_update':
            handleBoardUpdate(data);
            break;
            
        case 'board_cleared':
            handleBoardCleared(data);
            break;
            
        case 'lesson_ended':
            handleLessonEnded(data);
            break;
            
        case 'cursor_position':
            handleCursorPosition(data);
            break;
            
        case 'error':
            console.error('WebSocket error:', data.message);
            showToast('Ошибка синхронизации: ' + data.message, 'error');
            break;
            
        default:
            console.log('Неизвестный тип сообщения:', data.type);
    }
}

// Обработка подключения пользователя
function handleUserJoined(data) {
    connectedUsers[data.userId] = {
        id: data.userId,
        name: data.userName,
        role: data.userRole
    };
    
    showToast(`${data.userName} присоединился к уроку`, 'info');
    updateConnectedUsersList(data.connectedUsers);
    
    // Если это новый пользователь, запрашиваем актуальное состояние доски
    if (boardStateReceived && canvas && ctx) {
        console.log('Новый пользователь присоединился, запрашиваем актуальное состояние доски');
        setTimeout(() => {
            requestBoardState();
        }, 300);
    }
}

// Обработка отключения пользователя
function handleUserLeft(data) {
    delete connectedUsers[data.userId];
    
    showToast(`${data.userName} покинул урок`, 'info');
    updateConnectedUsersList(data.connectedUsers);
}

// Обработка операции рисования от других пользователей
function handleDrawOperation(data) {
    if (!canvas || !ctx) {
        console.error('Canvas не инициализирован для draw operation');
        return;
    }
    
    const { x, y, operationType, color, brushSize, userId, userName, sequenceNumber } = data;
    
    console.log('=== ОБРАБОТКА DRAW OPERATION ===');
    console.log('Данные:', { x, y, operationType, color, brushSize, userId, userName, sequenceNumber });
    
    // Не обрабатываем собственные данные
    if (userId && userId.toString() === getCurrentUserId()) {
        console.log('Пропускаем собственную операцию');
        return;
    }
    
    // Проверяем sequenceNumber для правильного порядка
    if (sequenceNumber && sequenceNumber <= lastSequenceNumber) {
        console.log('Пропускаем старую операцию, sequenceNumber:', sequenceNumber);
        return;
    }
    
    if (sequenceNumber) {
        lastSequenceNumber = sequenceNumber;
    }
    
    console.log('Выполняем операцию типа:', operationType);
    
    // Улучшенная проверка валидности координат с преобразованием типов
    let validX = x;
    let validY = y;
    
    if (operationType === 'draw') {
        // Преобразуем координаты в числа
        validX = parseFloat(x);
        validY = parseFloat(y);
        
        if (isNaN(validX) || isNaN(validY)) {
            console.log('Пропускаем операцию draw с невалидными координатами:', x, y);
            return;
        }
        
        // Проверяем, что координаты в пределах canvas (учитываем размер бесконечной доски)
        if (validX < 0 || validY < 0 || validX > 10000 || validY > 10000) {
            console.log('Координаты вне пределов canvas:', validX, validY);
            return;
        }
    }
    
    // Применяем операцию на canvas с использованием requestAnimationFrame для плавности
    requestAnimationFrame(() => {
        applyDrawOperation(operationType, validX, validY, color, brushSize);
    });
    
    console.log('=== DRAW OPERATION ЗАВЕРШЕН ===');
}

// Обработка состояния доски (все операции рисования)
function handleBoardState(data) {
    if (!canvas || !ctx) {
        console.error('Canvas не инициализирован для board state');
        return;
    }
    
    console.log('=== ОБРАБОТКА BOARD STATE ===');
    console.log('Получено операций:', data.operations ? data.operations.length : 0);
    console.log('Полные данные состояния:', data);
    
    // Очищаем canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Восстанавливаем все операции рисования
    if (data.operations && Array.isArray(data.operations)) {
        console.log('Восстанавливаем ' + data.operations.length + ' операций');
        
        // Сортируем операции по sequenceNumber для правильного порядка
        data.operations.sort((a, b) => {
            const seqA = a.sequenceNumber || 0;
            const seqB = b.sequenceNumber || 0;
            return seqA - seqB;
        });
        
        // Показываем прогресс восстановления для большого количества операций
        const totalOperations = data.operations.length;
        const showProgress = totalOperations > 100;
        
        if (showProgress) {
            showToast(`Восстанавливаем ${totalOperations} операций...`, 'info');
        }
        
        // Восстанавливаем операции последовательно для правильного порядка
        data.operations.forEach((operation, index) => {
            const { x, y, operationType, color, brushSize } = operation;
            
            // Показываем прогресс каждые 100 операций
            if (showProgress && index % 100 === 0) {
                const progress = Math.round((index / totalOperations) * 100);
                console.log(`Прогресс восстановления: ${progress}% (${index}/${totalOperations})`);
            }
            
            if (operationType === 'start' || operationType === 'draw') {
                // Проверяем координаты с преобразованием типов
                const numX = parseFloat(x);
                const numY = parseFloat(y);
                
                if (!isNaN(numX) && !isNaN(numY)) {
                    applyDrawOperation(operationType, numX, numY, color, brushSize);
                } else {
                    console.log('Пропускаем операцию с невалидными координатами:', x, y);
                }
            } else if (operationType === 'end') {
                applyDrawOperation(operationType, null, null, color, brushSize);
            }
        });
        
        // Обновляем последний номер последовательности
        if (data.operations.length > 0) {
            const lastOp = data.operations[data.operations.length - 1];
            if (lastOp && lastOp.sequenceNumber) {
                lastSequenceNumber = lastOp.sequenceNumber;
                console.log('Обновлен lastSequenceNumber:', lastSequenceNumber);
            }
        }
        
        // Показываем завершение восстановления
        if (showProgress) {
            showToast(`Восстановлено ${totalOperations} операций рисования`, 'success');
        }
    }
    
    boardStateReceived = true;
    console.log('=== BOARD STATE ВОССТАНОВЛЕН ===');
}

// Обработка завершения урока
function handleLessonEnded(data) {
    console.log('Урок завершен:', data.message);
    showToast(data.message, 'info');
    
    // Очищаем canvas
    if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    // Отключаем WebSocket
    if (stompClient) {
        stompClient.disconnect();
    }
    
    // Показываем сообщение о завершении
    setTimeout(() => {
        alert('Урок завершен. Все операции рисования очищены.');
        window.location.href = '/dashboard';
    }, 2000);
}

// Проверка валидности координаты
function isValidCoordinate(coord) {
    return coord !== null && 
           coord !== undefined && 
           !isNaN(coord) && 
           coord !== 'null' && 
           coord !== '' &&
           isFinite(coord);
}

// Применение операции рисования на canvas (оптимизированная версия с подробным логированием)
function applyDrawOperation(opType, x, y, color, brushSize) {
    // Увеличиваем счетчик восстановленных точек
    if (opType === 'draw' || opType === 'start') {
        restoredPointsCount++;
        
        // Логируем каждую 100-ю точку для отслеживания прогресса
        if (restoredPointsCount % 100 === 0) {
            const elapsed = Date.now() - restorationStartTime;
            const progress = totalPointsToRestore > 0 ? Math.round((restoredPointsCount / totalPointsToRestore) * 100) : 0;
            console.log(`🔄 Восстановлено точек: ${restoredPointsCount}/${totalPointsToRestore} (${progress}%) за ${elapsed}ms`);
        }
    }
    
    // Подробное логирование для отладки
    if (restoredPointsCount <= 10 || restoredPointsCount % 500 === 0) {
        console.log(`📍 Точка #${restoredPointsCount}: ${opType} в (${x}, ${y}) цвет: ${color} размер: ${brushSize}`);
    }
    
    // Проверяем валидность координат для операций draw
    if (opType === 'draw') {
        // Преобразуем координаты в числа
        const numX = parseFloat(x);
        const numY = parseFloat(y);
        
        if (isNaN(numX) || isNaN(numY)) {
            console.warn(`❌ Пропускаем операцию draw с невалидными координатами: x=${x}, y=${y}`);
            return;
        }
        
        // Проверяем, что координаты в пределах canvas (учитываем размер бесконечной доски)
        if (numX < 0 || numY < 0 || numX > 10000 || numY > 10000) {
            console.warn(`❌ Пропускаем операцию вне пределов canvas: x=${numX}, y=${numY}`);
            return;
        }
        
        // Используем преобразованные координаты
        x = numX;
        y = numY;
    }
    
    // Применяем операцию с оптимизацией рендеринга
    ctx.save();
    ctx.lineWidth = brushSize || currentBrushSize;
    ctx.lineCap = 'round';
    ctx.strokeStyle = color || currentColor;
    
    if (opType === 'start') {
        ctx.beginPath();
        ctx.moveTo(x, y);
    } else if (opType === 'draw') {
        ctx.lineTo(x, y);
        ctx.stroke();
    } else if (opType === 'end') {
        ctx.beginPath();
    }
    
    ctx.restore();
}

// Получение ID текущего пользователя
function getCurrentUserId() {
    console.log('getCurrentUserId called, lessonData:', lessonData);
    
    if (lessonData && lessonData.currentUserId) {
        console.log('Using currentUserId:', lessonData.currentUserId);
        return lessonData.currentUserId.toString();
    }
    
    // Fallback: получаем из teacher или student
    if (lessonData && lessonData.teacher && lessonData.teacher.id) {
        console.log('Using teacher.id:', lessonData.teacher.id);
        return lessonData.teacher.id.toString();
    }
    
    if (lessonData && lessonData.student && lessonData.student.id) {
        console.log('Using student.id:', lessonData.student.id);
        return lessonData.student.id.toString();
    }
    
    // Если ничего не найдено, возвращаем значение по умолчанию
    console.log('No user ID found, returning default value 1');
    return '1';
}

// Получение имени текущего пользователя
function getCurrentUserName() {
    if (userName) {
        return userName;
    }
    
    if (lessonData && lessonData.teacher && lessonData.teacher.name) {
        return lessonData.teacher.name;
    }
    
    if (lessonData && lessonData.student && lessonData.student.name) {
        return lessonData.student.name;
    }
    
    return 'Unknown User';
}

// Обработка очистки доски
function handleBoardCleared(data) {
    if (!canvas || !ctx) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    showToast(`Доска очищена пользователем ${data.userName}`, 'info');
}

// Обработка сохранения доски
function handleBoardSaved(data) {
    showToast(`Доска сохранена пользователем ${data.userName}`, 'success');
}

// Обработка состояния доски (улучшенная версия)
function handleBoardState(data) {
    console.log('=== ПОЛУЧЕНО СОСТОЯНИЕ ДОСКИ ===');
    console.log('Полные данные:', data);
    
    if (data.error) {
        console.error('Ошибка получения состояния доски:', data.error);
        showToast('Ошибка получения состояния доски: ' + data.error, 'error');
        return;
    }
    
    boardStateReceived = true;
    
    // Проверяем тип данных состояния
    let boardStateData;
    let hasDrawOperations = false;
    
    if (data.hasDrawOperations && data.boardState) {
        // Если это массив операций рисования
        try {
            boardStateData = JSON.parse(data.boardState);
            hasDrawOperations = true;
            console.log('Получен массив операций рисования:', boardStateData.length, 'операций');
        } catch (e) {
            console.error('Ошибка парсинга массива операций:', e);
            boardStateData = {};
        }
    } else if (data.boardState && typeof data.boardState === 'object') {
        // Если это объект с операциями
        boardStateData = data.boardState;
        console.log('Получен объект с операциями:', Object.keys(boardStateData).length, 'операций');
    } else {
        // Если это пустое состояние
        boardStateData = {};
        console.log('Состояние доски пустое');
    }
    
    // Сохраняем состояние в глобальную переменную
    window.boardStateData = boardStateData;
    
    // Восстанавливаем состояние
    if (canvas && ctx) {
        if (hasDrawOperations && Array.isArray(boardStateData)) {
            // Восстанавливаем из массива операций
            restoreBoardFromOperationsArray(boardStateData);
        } else if (Object.keys(boardStateData).length > 0) {
            // Восстанавливаем из объекта операций
            restoreBoardFromState(boardStateData);
        } else {
            // Очищаем доску
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            console.log('Доска очищена (пустое состояние)');
        }
    }
    
    // Обновляем список подключенных пользователей
    if (data.connectedUsers) {
        updateConnectedUsersList(data.connectedUsers);
    }
    
    console.log('=== ОБРАБОТКА СОСТОЯНИЯ ДОСКИ ЗАВЕРШЕНА ===');
}

// Восстановление состояния доски из массива операций (с подробным логированием)
function restoreBoardFromOperationsArray(operationsArray) {
    if (!canvas || !ctx) {
        console.error('❌ Canvas не инициализирован для восстановления из массива');
        return;
    }
    
    console.log('🔄 === НАЧАЛО ВОССТАНОВЛЕНИЯ ДОСКИ ИЗ МАССИВА ОПЕРАЦИЙ ===');
    console.log('📊 Количество операций:', operationsArray.length);
    console.log('🎨 Canvas размеры:', canvas.width, 'x', canvas.height);
    
    // Инициализируем счетчики для логирования
    restorationStartTime = Date.now();
    restoredPointsCount = 0;
    totalPointsToRestore = operationsArray.length;
    
    // Очищаем доску
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    console.log('🧹 Доска очищена');
    
    // Восстанавливаем операции по порядку
    let validOperations = 0;
    let invalidOperations = 0;
    
    operationsArray.forEach((operation, index) => {
        if (operation && operation.operationType) {
            const opType = operation.operationType;
            const x = operation.x;
            const y = operation.y;
            const color = operation.color;
            const brushSize = operation.brushSize;
            
            // Проверяем валидность операции
            if (opType === 'draw' && (!isValidCoordinate(x) || !isValidCoordinate(y))) {
                console.warn(`⚠️ Невалидная операция #${index}: ${opType} в (${x}, ${y})`);
                invalidOperations++;
                return;
            }
            
            // Применяем операцию
            applyDrawOperation(opType, x, y, color, brushSize);
            validOperations++;
            
            // Показываем прогресс каждые 100 операций
            if (index % 100 === 0) {
                const progress = Math.round((index / operationsArray.length) * 100);
                console.log(`📊 Прогресс восстановления: ${index + 1}/${operationsArray.length} (${progress}%)`);
            }
        } else {
            console.warn(`⚠️ Пропущена невалидная операция #${index}:`, operation);
            invalidOperations++;
        }
    });
    
    const totalTime = Date.now() - restorationStartTime;
    console.log(`✅ Восстановление из массива завершено: ${validOperations} валидных, ${invalidOperations} невалидных операций за ${totalTime}ms`);
    console.log(`📍 Всего восстановлено точек: ${restoredPointsCount}`);
    console.log('🎉 === ВОССТАНОВЛЕНИЕ ДОСКИ ИЗ МАССИВА ОПЕРАЦИЙ ЗАВЕРШЕНО ===');
}

// Восстановление состояния доски из данных (оптимизированная версия с подробным логированием)
function restoreBoardFromState(boardState) {
    if (!canvas || !ctx) {
        console.error('❌ Canvas не инициализирован для восстановления');
        return;
    }
    
    console.log('🔄 === НАЧАЛО ВОССТАНОВЛЕНИЯ ДОСКИ ===');
    console.log('📊 Размер boardState:', Object.keys(boardState).length);
    console.log('🎨 Canvas размеры:', canvas.width, 'x', canvas.height);
    
    // Инициализируем счетчики для логирования
    restorationStartTime = Date.now();
    restoredPointsCount = 0;
    
    // Очищаем доску
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    console.log('🧹 Доска очищена');
    
    // Восстанавливаем все операции рисования
    if (boardState && typeof boardState === 'object' && Object.keys(boardState).length > 0) {
        const operations = Object.values(boardState);
        totalPointsToRestore = operations.length;
        
        console.log(`📈 Восстанавливаем ${operations.length} операций рисования`);
        
        // Сортируем операции по sequenceNumber для правильного порядка
        operations.sort((a, b) => {
            const seqA = a.sequenceNumber || 0;
            const seqB = b.sequenceNumber || 0;
            return seqA - seqB;
        });
        
        console.log('📋 Операции отсортированы по sequenceNumber');
        
        // Восстанавливаем операции последовательно
        let validOperations = 0;
        let invalidOperations = 0;
        
        operations.forEach((operation, index) => {
            if (operation && operation.operationType) {
                const opType = operation.operationType;
                const x = operation.x;
                const y = operation.y;
                const color = operation.color;
                const brushSize = operation.brushSize;
                
                // Проверяем валидность операции
                if (opType === 'draw' && (!isValidCoordinate(x) || !isValidCoordinate(y))) {
                    console.warn(`⚠️ Невалидная операция #${index}: ${opType} в (${x}, ${y})`);
                    invalidOperations++;
                    return;
                }
                
                // Применяем операцию
                applyDrawOperation(opType, x, y, color, brushSize);
                validOperations++;
                
                // Показываем прогресс каждые 100 операций
                if (index % 100 === 0) {
                    const progress = Math.round((index / operations.length) * 100);
                    console.log(`📊 Прогресс: ${index + 1}/${operations.length} (${progress}%)`);
                }
            } else {
                console.warn(`⚠️ Пропущена невалидная операция #${index}:`, operation);
                invalidOperations++;
            }
        });
        
        // Обновляем последний номер последовательности
        const lastOp = operations[operations.length - 1];
        if (lastOp && lastOp.sequenceNumber) {
            lastSequenceNumber = lastOp.sequenceNumber;
            console.log('🔢 Обновлен lastSequenceNumber:', lastSequenceNumber);
        }
        
        const totalTime = Date.now() - restorationStartTime;
        console.log(`✅ Восстановление завершено: ${validOperations} валидных, ${invalidOperations} невалидных операций за ${totalTime}ms`);
        console.log(`📍 Всего восстановлено точек: ${restoredPointsCount}`);
        
    } else {
        console.log('📭 boardState пустой или не объект:', boardState);
    }
    
    console.log('🎉 === ВОССТАНОВЛЕНИЕ ДОСКИ ЗАВЕРШЕНО ===');
}

// Группировка операций по пользователям для оптимизации
function groupOperationsByUser(operations) {
    const grouped = {};
    
    operations.forEach(operation => {
        const userId = operation.userId || 'unknown';
        if (!grouped[userId]) {
            grouped[userId] = [];
        }
        grouped[userId].push(operation);
    });
    
    return grouped;
}

// Обновление списка подключенных пользователей
function updateConnectedUsersList(users) {
    connectedUsers = users;
    // Здесь можно добавить отображение списка пользователей в UI
    console.log('Подключенные пользователи:', users);
}

// Запрос состояния доски
function requestBoardState() {
    if (!isConnected || !stompClient || !stompClient.connected || !lessonData) {
        console.log('WebSocket не подключен, используем REST API для загрузки состояния');
        loadBoardStateViaRestAPI();
        return;
    }
    
    console.log('Запрашиваем состояние доски для урока:', lessonData.id);
    
    try {
        stompClient.send("/app/board/" + lessonData.id + "/request-state", {}, JSON.stringify({
            timestamp: Date.now(),
            userId: getCurrentUserId(),
            userName: userName || (lessonData.teacher ? lessonData.teacher.name : lessonData.student.name) || 'Unknown User'
        }));
        console.log('Запрос состояния доски отправлен');
    } catch (error) {
        console.error('Ошибка запроса состояния доски:', error);
        // Fallback на REST API
        loadBoardStateViaRestAPI();
    }
}

// Загрузка состояния доски через REST API (fallback)
async function loadBoardStateViaRestAPI() {
    if (!lessonData || !lessonData.id) {
        console.error('Нет данных урока для загрузки состояния');
        return;
    }
    
    try {
        console.log('Загружаем состояние доски через REST API для урока:', lessonData.id);
        
        const response = await fetch(`/api/board/state/${lessonData.id}`);
        const data = await response.json();
        
        if (data.success) {
            console.log('Состояние доски загружено через REST API:', data.totalOperations + ' операций');
            handleBoardState(data);
        } else {
            console.error('Ошибка загрузки состояния доски:', data.message);
            showToast('Ошибка загрузки состояния доски: ' + data.message, 'error');
        }
    } catch (error) {
        console.error('Ошибка загрузки состояния доски через REST API:', error);
        showToast('Ошибка загрузки состояния доски', 'error');
    }
}

// Отправка данных рисования с улучшенной обработкой координат и оптимизацией
function sendDrawData(type, x, y) {
    console.log('sendDrawData called:', { type, x, y, isConnected, hasStompClient: !!stompClient, hasLessonData: !!lessonData });
    
    // Улучшенная проверка валидности координат для операций draw
    if (type === 'draw') {
        const numX = parseFloat(x);
        const numY = parseFloat(y);
        
        if (isNaN(numX) || isNaN(numY)) {
            console.log('Invalid coordinates for draw operation:', x, y);
            return;
        }
        
        // Используем преобразованные координаты
        x = numX;
        y = numY;
    }
    
    const userId = getCurrentUserId();
    const currentUserName = getCurrentUserName();
    
    const drawData = {
        type: type,
        x: type === 'end' ? null : (x !== null ? Number(x) : null),
        y: type === 'end' ? null : (y !== null ? Number(y) : null),
        color: currentColor,
        brushSize: currentBrushSize,
        timestamp: Date.now(),
        userId: userId,
        userName: currentUserName
    };
    
    console.log('Prepared drawData:', drawData);
    
    // Проверяем состояние подключения перед отправкой
    if (!isConnected || !stompClient || !stompClient.connected || !lessonData) {
        console.log('Cannot send drawData - WebSocket not connected:', {
            isConnected,
            hasStompClient: !!stompClient,
            stompClientConnected: stompClient ? stompClient.connected : false,
            hasLessonData: !!lessonData,
            lessonDataId: lessonData ? lessonData.id : 'undefined'
        });
        
        // Пытаемся переподключиться
        if (!isConnected && !stompClient) {
            console.log('Attempting to reconnect WebSocket...');
            connectWebSocket();
        }
        return;
    }
    
    // Отправляем через WebSocket
    try {
        console.log('Sending drawData via WebSocket');
        stompClient.send("/app/board/" + lessonData.id + "/draw", {}, JSON.stringify(drawData));
        console.log('DrawData sent successfully');
        
    } catch (error) {
        console.error('Error sending drawData:', error);
        showToast('Ошибка отправки данных рисования', 'error');
        
        // Пытаемся переподключиться при ошибке
        if (error.message && error.message.includes('connection')) {
            console.log('Connection error detected, attempting reconnect...');
            setTimeout(() => {
                connectWebSocket();
            }, 1000);
        }
    }
}

// Сохранение содержимого доски
function saveBoardContent() {
    if (!canvas) {
        console.warn('Canvas не инициализирован');
        return;
    }
    
    if (!isConnected || !stompClient) {
        console.warn('WebSocket соединение не установлено, сохраняем локально');
        // Сохраняем локально в localStorage как fallback
        try {
            const imageData = canvas.toDataURL('image/png');
            localStorage.setItem('board_backup_' + (lessonData?.id || 'unknown'), imageData);
            console.log('Содержимое доски сохранено локально');
        } catch (error) {
            console.error('Ошибка локального сохранения доски:', error);
        }
        return;
    }
    
    try {
        const imageData = canvas.toDataURL('image/png');
        const saveData = {
            boardContent: imageData,
            timestamp: Date.now()
        };
        
        stompClient.send("/app/board/" + lessonData.id + "/save", {}, JSON.stringify(saveData));
        console.log('Содержимое доски сохранено');
    } catch (error) {
        console.error('Ошибка сохранения доски:', error);
        showToast('Ошибка сохранения доски', 'error');
    }
}

// Восстановление доски из локального хранилища
function restoreBoardFromLocalStorage() {
    if (!canvas || !ctx || !lessonData) {
        console.warn('Canvas или данные урока не инициализированы');
        return;
    }
    
    try {
        const backupKey = 'board_backup_' + lessonData.id;
        const backupData = localStorage.getItem(backupKey);
        
        if (backupData) {
            const img = new Image();
            img.onload = function() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                console.log('Доска восстановлена из локального хранилища');
                showToast('Доска восстановлена из локального хранилища', 'success');
            };
            img.src = backupData;
        } else {
            console.log('Локальная резервная копия не найдена');
        }
    } catch (error) {
        console.error('Ошибка восстановления доски из локального хранилища:', error);
    }
}

// Установка активного инструмента
function setActiveTool(tool) {
    currentTool = tool;
    
    // Обновляем активную кнопку
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tool="${tool}"]`).classList.add('active');
    
    // Настраиваем курсор и контекст в зависимости от инструмента
    const boardViewport = document.querySelector('.board-viewport');
    
    switch (tool) {
        case 'pen':
            canvas.style.cursor = 'crosshair';
            boardViewport.setAttribute('data-tool', 'pen');
            ctx.globalCompositeOperation = 'source-over';
            break;
        case 'eraser':
            canvas.style.cursor = 'crosshair';
            boardViewport.setAttribute('data-tool', 'eraser');
            ctx.globalCompositeOperation = 'destination-out';
            break;
        case 'text':
            canvas.style.cursor = 'text';
            boardViewport.setAttribute('data-tool', 'text');
            break;
        case 'shape':
            canvas.style.cursor = 'crosshair';
            boardViewport.setAttribute('data-tool', 'shape');
            break;
        case 'hand':
            canvas.style.cursor = 'grab';
            boardViewport.setAttribute('data-tool', 'hand');
            break;
        case 'select':
            canvas.style.cursor = 'default';
            boardViewport.setAttribute('data-tool', 'select');
            break;
    }
    
    // Показываем подсказку
    showToast(`Инструмент: ${getToolName(tool)}`, 'info');
}

// Получение названия инструмента
function getToolName(tool) {
    const toolNames = {
        'pen': 'Ручка',
        'eraser': 'Ластик',
        'text': 'Текст',
        'shape': 'Фигуры',
        'hand': 'Перемещение',
        'select': 'Выбор'
    };
    return toolNames[tool] || tool;
}

// Очистка доски с синхронизацией
function clearBoard() {
    if (confirm('Очистить доску?')) {
        if (isConnected && stompClient && lessonData) {
            stompClient.send("/app/board/" + lessonData.id + "/clear", {}, JSON.stringify({
                timestamp: Date.now()
            }));
        } else {
            if (canvas && ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                console.log('Доска очищена локально (WebSocket не подключен)');
            }
        }
        showToast('Доска очищена', 'info');
    }
}

// Сохранение доски
function saveBoard() {
    try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const dataURL = canvas.toDataURL('image/png');
        
        // Сохраняем изображение
        const link = document.createElement('a');
        link.download = `brainify-board-${lessonData.id}-${Date.now()}.png`;
        link.href = dataURL;
        link.click();
        
        showToast('Доска сохранена', 'success');
    } catch (error) {
        console.error('Ошибка сохранения доски:', error);
        showToast('Ошибка сохранения доски', 'error');
    }
}

// Полноэкранный режим доски
function toggleBoardFullscreen() {
    const boardContainer = document.querySelector('.board-container');
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        boardContainer.requestFullscreen();
    }
}

// Инициализация индикаторов
function initializeIndicators() {
    updateZoomIndicator();
    updatePositionIndicator(0, 0);
    
    // Устанавливаем начальный инструмент
    setActiveTool('pen');
}

// Инициализация видеоконференции
function initializeVideoConference() {
    if (!lessonData || !lessonData.session) {
        console.error('Нет данных урока или сессии для видеоконференции');
        return;
    }
    
    roomId = lessonData.session.roomId;
    userId = lessonData.teacher ? lessonData.teacher.id : lessonData.student.id;
    userName = lessonData.teacher ? lessonData.teacher.name : lessonData.student.name;
    
    console.log('Инициализируем видеоконференцию:', { roomId, userId, userName });
    
    // Запрашиваем доступ к медиа устройствам
    requestMediaAccess();
    
    // Настраиваем перетаскивание окна видеоконференции
    setupVideoWindowDrag();
    
    showToast('Видеоконференция инициализирована', 'success');
}

// Запрос доступа к медиа устройствам
async function requestMediaAccess() {
    try {
        // Проверяем, является ли пользователь техподдержкой (администратором)
        const isAdmin = lessonData.currentUserRole === 'ADMIN';
        
        let mediaConstraints = {
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        };
        
        // Для техподдержки включаем только микрофон, для остальных - камеру и микрофон
        if (!isAdmin) {
            mediaConstraints.video = {
                width: { ideal: 1280 },
                height: { ideal: 720 }
            };
        }
        
        const stream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
        
        activeMediaStream = stream;
        addLocalVideo(isAdmin);
        
        // Обновляем кнопки управления
        updateMediaButtons(isAdmin);
        
    } catch (error) {
        console.error('Ошибка доступа к медиа устройствам:', error);
        showToast('Ошибка доступа к камере/микрофону', 'error');
    }
}

// Добавление локального видео
function addLocalVideo(isAdmin = false) {
    if (!activeMediaStream) return;
    
    const videoGrid = document.getElementById('videoGrid');
    const videoItem = document.createElement('div');
    videoItem.className = 'video-item';
    
    if (isAdmin) {
        // Для техподдержки показываем только аудио индикатор
        videoItem.innerHTML = `
            <div class="audio-indicator">
                <i class="fas fa-microphone"></i>
                <div class="audio-wave"></div>
            </div>
            <div class="participant-name">Техподдержка (${userName})</div>
        `;
    } else {
        // Для остальных показываем видео
        videoItem.innerHTML = `
            <video autoplay playsinline muted></video>
            <div class="participant-name">Вы (${userName})</div>
        `;
        
        const video = videoItem.querySelector('video');
        video.srcObject = activeMediaStream;
    }
    
    videoGrid.appendChild(videoItem);
}

// Обновление кнопок управления медиа
function updateMediaButtons(isAdmin) {
    const videoBtn = document.getElementById('videoCallBtn');
    const muteBtn = document.getElementById('muteCallBtn');
    
    if (isAdmin) {
        // Для техподдержки скрываем кнопку видео
        if (videoBtn) {
            videoBtn.style.display = 'none';
        }
        
        // Обновляем иконку микрофона
        if (muteBtn) {
            muteBtn.innerHTML = '<i class="fas fa-microphone"></i>';
            muteBtn.title = 'Отключить микрофон';
        }
    } else {
        // Для остальных показываем обе кнопки
        if (videoBtn) {
            videoBtn.style.display = 'block';
        }
    }
}

// Настройка перетаскивания окна видеоконференции
function setupVideoWindowDrag() {
    const videoWindow = document.getElementById('videoConferenceWindow');
    const header = videoWindow.querySelector('.video-window-header');
    
    let isDragging = false;
    let startX, startY, startLeft, startTop;
    
    header.addEventListener('mousedown', function(e) {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        startLeft = parseInt(videoWindow.style.left) || 0;
        startTop = parseInt(videoWindow.style.top) || 0;
        
        videoWindow.style.cursor = 'grabbing';
    });
    
    document.addEventListener('mousemove', function(e) {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        videoWindow.style.left = (startLeft + deltaX) + 'px';
        videoWindow.style.top = (startTop + deltaY) + 'px';
    });
    
    document.addEventListener('mouseup', function() {
        isDragging = false;
        videoWindow.style.cursor = 'move';
    });
}

// Управление звонком
function toggleCallMute() {
    if (!activeMediaStream) return;
    
    const audioTracks = activeMediaStream.getAudioTracks();
    const btn = document.getElementById('muteCallBtn');
    
    if (audioTracks.length > 0) {
        const isEnabled = audioTracks[0].enabled;
        audioTracks[0].enabled = !isEnabled;
        
        btn.classList.toggle('muted', !isEnabled);
        btn.innerHTML = isEnabled ? '<i class="fas fa-microphone-slash"></i>' : '<i class="fas fa-microphone"></i>';
    }
}

function toggleCallVideo() {
    if (!activeMediaStream) return;
    
    const videoTracks = activeMediaStream.getVideoTracks();
    const btn = document.getElementById('videoCallBtn');
    
    if (videoTracks.length > 0) {
        const isEnabled = videoTracks[0].enabled;
        videoTracks[0].enabled = !isEnabled;
        
        btn.classList.toggle('muted', !isEnabled);
        btn.innerHTML = isEnabled ? '<i class="fas fa-video-slash"></i>' : '<i class="fas fa-video"></i>';
    }
}

function minimizeVideoWindow() {
    const videoWindow = document.getElementById('videoConferenceWindow');
    videoWindow.style.display = videoWindow.style.display === 'none' ? 'block' : 'none';
}

// Полноэкранный режим
function toggleFullscreen() {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        document.documentElement.requestFullscreen();
    }
}

// Модальные окна
function showEndLessonModal() {
    document.getElementById('endLessonModal').style.display = 'flex';
}

function closeEndLessonModal() {
    document.getElementById('endLessonModal').style.display = 'none';
}

function confirmEndLesson() {
    const saveBoard = document.getElementById('saveBoardContent').checked;
    const sendFeedback = document.getElementById('sendFeedback').checked;
    
    endLesson(saveBoard, sendFeedback);
}

// Функция завершения урока
async function endLesson(saveBoard, sendFeedback) {
    try {
        let boardContent = null;
        
        // Сохраняем содержимое доски если нужно
        if (saveBoard && canvas) {
            try {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                boardContent = JSON.stringify(imageData);
            } catch (error) {
                console.error('Ошибка сохранения доски:', error);
            }
        }
        
        // Отправляем сообщение об отключении
        if (isConnected && stompClient) {
            const currentUserId = getCurrentUserId();
            const currentUserName = userName || (lessonData.teacher ? lessonData.teacher.name : lessonData.student.name) || 'Unknown User';
            
            stompClient.send("/app/board/" + lessonData.id + "/leave", {}, JSON.stringify({
                userId: currentUserId.toString(),
                userName: currentUserName,
                timestamp: Date.now()
            }));
        }
        
        // Останавливаем медиа стрим
        stopActiveStream();
        
        // Отправляем данные о завершении урока
        const response = await fetch(`/api/lessons/${lessonData.id}/end`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                saveBoard: saveBoard,
                sendFeedback: sendFeedback,
                boardContent: boardContent,
                lessonNotes: ''
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast('Урок успешно завершен', 'success');
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 2000);
        } else {
            showToast(data.message || 'Ошибка завершения урока', 'error');
        }
        
    } catch (error) {
        console.error('Ошибка завершения урока:', error);
        showToast('Ошибка завершения урока', 'error');
    }
}

// Остановка активного медиа стрима
function stopActiveStream() {
    if (activeMediaStream) {
        activeMediaStream.getTracks().forEach(track => track.stop());
        activeMediaStream = null;
    }
}

// Обновление статуса соединения
function updateConnectionStatus(status, text) {
    const statusEl = document.getElementById('connectionStatus');
    if (statusEl) {
        statusEl.className = `connection-status ${status}`;
        statusEl.querySelector('span').textContent = text;
        console.log(`Статус соединения обновлен: ${status} - ${text}`);
    }
}

// Форматирование времени урока
function formatLessonTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Показ уведомлений
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${getToastIcon(type)}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

// Функция для тестирования восстановления доски
function testBoardRestore() {
    console.log('=== ТЕСТ ВОССТАНОВЛЕНИЯ ДОСКИ ===');
    console.log('Canvas готов:', !!canvas);
    console.log('Context готов:', !!ctx);
    console.log('Состояние получено:', boardStateReceived);
    console.log('Данные состояния:', window.boardStateData);
    
    if (canvas && ctx && window.boardStateData) {
        console.log('Восстанавливаем состояние для теста');
        restoreBoardFromState(window.boardStateData);
    } else {
        console.log('Не удается восстановить - недостаточно данных');
    }
}

// Добавляем функцию в глобальную область для отладки
window.testBoardRestore = testBoardRestore;

// Простая функция для принудительной синхронизации
function forceBoardSync() {
    console.log('=== ПРИНУДИТЕЛЬНАЯ СИНХРОНИЗАЦИЯ ДОСКИ ===');
    
    if (isConnected && stompClient && stompClient.connected && lessonData) {
        // Запрашиваем актуальное состояние с сервера
        requestBoardState();
        showToast('Синхронизация выполнена', 'success');
    } else {
        console.log('WebSocket не подключен для синхронизации');
        // Пытаемся переподключиться
        if (!isConnected) {
            console.log('Пытаемся переподключиться для синхронизации...');
            connectWebSocket();
        }
        showToast('Переподключение к серверу...', 'warning');
    }
}

// Функция для проверки и восстановления синхронизации
function checkAndRestoreSync() {
    console.log('=== ПРОВЕРКА СИНХРОНИЗАЦИИ ===');
    
    if (!isConnected || !stompClient || !stompClient.connected) {
        console.log('WebSocket не подключен, переподключаемся...');
        connectWebSocket();
        return;
    }
    
    if (!boardStateReceived) {
        console.log('Состояние доски не получено, запрашиваем...');
        requestBoardState();
        return;
    }
    
    // Проверяем, что canvas готов
    if (!canvas || !ctx) {
        console.log('Canvas не готов, переинициализируем...');
        initializeBoard();
        return;
    }
    
    console.log('Синхронизация в порядке');
}

// Функция для принудительного восстановления состояния доски
async function restoreBoardState() {
    console.log('=== ПРИНУДИТЕЛЬНОЕ ВОССТАНОВЛЕНИЕ СОСТОЯНИЯ ДОСКИ ===');
    
    if (!lessonData || !lessonData.id) {
        console.error('Нет данных урока для восстановления');
        showToast('Ошибка: нет данных урока', 'error');
        return;
    }
    
    // Очищаем доску
    if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        console.log('Доска очищена для восстановления');
    }
    
    // Показываем уведомление о начале восстановления
    showToast('Восстанавливаем состояние доски...', 'info');
    
    try {
        // Используем немедленную загрузку через REST API
        const success = await loadBoardStateImmediately();
        
        if (success) {
            console.log('Восстановление состояния завершено успешно');
            showToast('Состояние доски восстановлено', 'success');
        } else {
            console.log('Восстановление состояния завершено, но данных нет');
            showToast('Нет данных для восстановления', 'info');
        }
    } catch (error) {
        console.error('Ошибка восстановления состояния:', error || 'Неизвестная ошибка');
        showToast('Не удалось восстановить состояние доски: ' + (error?.message || error || 'Неизвестная ошибка'), 'error');
        
        // Fallback на WebSocket если REST API не сработал
        if (isConnected && stompClient) {
            console.log('Пробуем восстановление через WebSocket...');
            requestBoardState();
        }
    }
}

// Добавляем функции в глобальную область
window.forceBoardSync = forceBoardSync;
window.restoreBoardState = restoreBoardState;
window.restoreBoardFromLocalStorage = restoreBoardFromLocalStorage;
window.saveBoardContent = saveBoardContent;
window.checkWebSocketConnection = checkWebSocketConnection;
window.forceReconnect = forceReconnect;
window.loadBoardStateViaRestAPI = loadBoardStateViaRestAPI;
window.checkAndRestoreSync = checkAndRestoreSync;
window.diagnoseSystem = diagnoseSystem;
window.getCurrentUserId = getCurrentUserId;
window.getCurrentUserName = getCurrentUserName;

// Функция для диагностики состояния доски и восстановления точек
window.diagnoseBoardRestoration = function() {
    console.log('🔍 === ДИАГНОСТИКА ВОССТАНОВЛЕНИЯ ДОСКИ ===');
    
    console.log('📊 Статистика восстановления:');
    console.log(`  - Всего точек для восстановления: ${totalPointsToRestore}`);
    console.log(`  - Восстановлено точек: ${restoredPointsCount}`);
    console.log(`  - Время последнего восстановления: ${restorationStartTime ? Date.now() - restorationStartTime + 'ms назад' : 'не выполнялось'}`);
    
    console.log('🎨 Состояние Canvas:');
    console.log(`  - Canvas готов: ${!!(canvas && ctx)}`);
    console.log(`  - Размеры canvas: ${canvas ? canvas.width + 'x' + canvas.height : 'N/A'}`);
    console.log(`  - Состояние доски получено: ${boardStateReceived}`);
    
    console.log('📋 Данные состояния:');
    console.log(`  - boardStateData: ${window.boardStateData ? 'доступен' : 'недоступен'}`);
    if (window.boardStateData) {
        if (Array.isArray(window.boardStateData)) {
            console.log(`  - Тип: массив из ${window.boardStateData.length} элементов`);
        } else if (typeof window.boardStateData === 'object') {
            console.log(`  - Тип: объект с ${Object.keys(window.boardStateData).length} ключами`);
        }
    }
    
    console.log('🔗 WebSocket состояние:');
    console.log(`  - Подключен: ${isConnected}`);
    console.log(`  - StompClient: ${!!stompClient}`);
    console.log(`  - Последний sequenceNumber: ${lastSequenceNumber}`);
    
    console.log('📚 Данные урока:');
    console.log(`  - ID урока: ${lessonData ? lessonData.id : 'N/A'}`);
    console.log(`  - Текущий пользователь: ${getCurrentUserName()} (ID: ${getCurrentUserId()})`);
    
    // Проверяем, есть ли точки в базе данных
    if (lessonData && lessonData.id) {
        fetch(`/api/board/state/${lessonData.id}`)
            .then(response => response.json())
            .then(data => {
                console.log('🗄️ Данные из базы:');
                console.log(`  - Успешно: ${data.success}`);
                console.log(`  - Операций в БД: ${data.totalOperations || 0}`);
                if (data.operations && data.operations.length > 0) {
                    console.log(`  - Первые 3 операции:`);
                    data.operations.slice(0, 3).forEach((op, i) => {
                        console.log(`    ${i + 1}. ${op.operationType} в (${op.x}, ${op.y}) цвет: ${op.color}`);
                    });
                }
            })
            .catch(error => {
                console.error('❌ Ошибка получения данных из БД:', error);
            });
    }
    
    console.log('🎯 === ДИАГНОСТИКА ЗАВЕРШЕНА ===');
};

// Функция для полной диагностики системы
window.fullSystemDiagnostic = async function() {
    console.log('🔬 === ПОЛНАЯ ДИАГНОСТИКА СИСТЕМЫ ===');
    
    // 1. Проверяем URL и параметры
    console.log('🌐 URL и параметры:');
    console.log(`  - URL: ${window.location.href}`);
    console.log(`  - lessonId из URL: ${new URLSearchParams(window.location.search).get('lessonId')}`);
    
    // 2. Проверяем данные урока
    console.log('📚 Данные урока:');
    console.log(`  - lessonData: ${!!lessonData}`);
    if (lessonData) {
        console.log(`  - ID: ${lessonData.id}`);
        console.log(`  - Предмет: ${lessonData.subject?.name}`);
        console.log(`  - Учитель: ${lessonData.teacher?.name} (ID: ${lessonData.teacher?.id})`);
        console.log(`  - Ученик: ${lessonData.student?.name} (ID: ${lessonData.student?.id})`);
        console.log(`  - Текущий пользователь ID: ${lessonData.currentUserId}`);
        console.log(`  - Сессия: ${lessonData.session ? 'есть' : 'нет'}`);
        if (lessonData.session) {
            console.log(`    - Room ID: ${lessonData.session.roomId}`);
        }
    }
    
    // 3. Проверяем Canvas
    console.log('🎨 Canvas состояние:');
    console.log(`  - Canvas элемент: ${!!canvas}`);
    console.log(`  - Context: ${!!ctx}`);
    if (canvas) {
        console.log(`  - Размеры: ${canvas.width}x${canvas.height}`);
        console.log(`  - Offset размеры: ${canvas.offsetWidth}x${canvas.offsetHeight}`);
        console.log(`  - Видимый: ${canvas.offsetWidth > 0 && canvas.offsetHeight > 0}`);
    }
    
    // 4. Проверяем WebSocket
    console.log('🔌 WebSocket состояние:');
    console.log(`  - isConnected: ${isConnected}`);
    console.log(`  - stompClient: ${!!stompClient}`);
    console.log(`  - stompClient.connected: ${stompClient ? stompClient.connected : 'N/A'}`);
    
    // 5. Проверяем API
    if (lessonData && lessonData.id) {
        console.log('🌐 Проверка API...');
        try {
            const response = await fetch(`/api/board/state/${lessonData.id}`);
            const data = await response.json();
            console.log('📥 Ответ API:');
            console.log(`  - Статус: ${response.status}`);
            console.log(`  - Успешно: ${data.success}`);
            console.log(`  - Операций: ${data.totalOperations || 0}`);
            console.log(`  - Данные:`, data);
        } catch (error) {
            console.error('❌ Ошибка API:', error);
        }
    }
    
    // 6. Проверяем localStorage
    console.log('💾 localStorage:');
    if (lessonData && lessonData.id) {
        const backupKey = 'board_backup_' + lessonData.id;
        const backup = localStorage.getItem(backupKey);
        console.log(`  - Резервная копия: ${backup ? 'есть' : 'нет'}`);
    }
    
    // 7. Проверяем глобальные переменные
    console.log('🌍 Глобальные переменные:');
    console.log(`  - boardStateReceived: ${boardStateReceived}`);
    console.log(`  - restoredPointsCount: ${restoredPointsCount}`);
    console.log(`  - totalPointsToRestore: ${totalPointsToRestore}`);
    console.log(`  - window.boardStateData: ${!!window.boardStateData}`);
    
    console.log('🎯 === ПОЛНАЯ ДИАГНОСТИКА ЗАВЕРШЕНА ===');
};

// Функция для проверки и создания сессии
window.checkAndCreateSession = async function() {
    console.log('🔍 === ПРОВЕРКА И СОЗДАНИЕ СЕССИИ ===');
    
    if (!lessonData || !lessonData.id) {
        console.error('❌ Нет данных урока для создания сессии');
        return false;
    }
    
    // Проверяем, есть ли сессия
    if (!lessonData.session) {
        console.log('📝 Создаем новую сессию для урока...');
        try {
            const response = await fetch(`/api/lessons/${lessonData.id}/create-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: getCurrentUserId(),
                    userName: getCurrentUserName()
                })
            });
            
            const data = await response.json();
            if (data.success) {
                console.log('✅ Сессия создана успешно:', data.session);
                lessonData.session = data.session;
                return true;
            } else {
                console.error('❌ Ошибка создания сессии:', data.message);
                return false;
            }
        } catch (error) {
            console.error('❌ Ошибка создания сессии:', error || 'Неизвестная ошибка');
            showToast('Ошибка создания сессии: ' + (error?.message || error || 'Неизвестная ошибка'), 'error');
            return false;
        }
    } else {
        console.log('✅ Сессия уже существует:', lessonData.session);
        return true;
    }
};

// Функция для принудительного пересоздания сессии
window.recreateSession = async function() {
    console.log('🔄 === ПЕРЕСОЗДАНИЕ СЕССИИ ===');
    
    if (!lessonData || !lessonData.id) {
        console.error('❌ Нет данных урока для пересоздания сессии');
        return false;
    }
    
    try {
        // Удаляем старую сессию
        if (lessonData.session) {
            console.log('🗑️ Удаляем старую сессию...');
            await fetch(`/api/lessons/${lessonData.id}/delete-session`, {
                method: 'DELETE'
            });
        }
        
        // Создаем новую сессию
        console.log('🆕 Создаем новую сессию...');
        const response = await fetch(`/api/lessons/${lessonData.id}/create-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: getCurrentUserId(),
                userName: getCurrentUserName()
            })
        });
        
        const data = await response.json();
        if (data.success) {
            console.log('✅ Сессия пересоздана успешно:', data.session);
            lessonData.session = data.session;
            return true;
        } else {
            console.error('❌ Ошибка пересоздания сессии:', data.message);
            return false;
        }
    } catch (error) {
        console.error('❌ Ошибка пересоздания сессии:', error || 'Неизвестная ошибка');
        showToast('Ошибка пересоздания сессии: ' + (error?.message || error || 'Неизвестная ошибка'), 'error');
        return false;
    }
};

// Функция для принудительного восстановления с подробным логированием
window.forceRestoreWithLogging = async function() {
    console.log('🚀 === ПРИНУДИТЕЛЬНОЕ ВОССТАНОВЛЕНИЕ С ЛОГИРОВАНИЕМ ===');
    
    if (!lessonData || !lessonData.id) {
        console.error('❌ Нет данных урока для восстановления');
        return false;
    }
    
    // Сначала диагностируем текущее состояние
    window.diagnoseBoardRestoration();
    
    // Очищаем доску
    if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        console.log('🧹 Доска очищена для восстановления');
    }
    
    // Загружаем состояние через REST API
    try {
        console.log('🌐 Загружаем состояние через REST API...');
        const response = await fetch(`/api/board/state/${lessonData.id}`);
        const data = await response.json();
        
        if (data.success && data.operations && data.operations.length > 0) {
            console.log(`📥 Получено ${data.operations.length} операций из БД`);
            
            // Восстанавливаем операции
            data.operations.forEach((operation, index) => {
                if (operation && operation.operationType) {
                    applyDrawOperation(
                        operation.operationType,
                        operation.x,
                        operation.y,
                        operation.color,
                        operation.brushSize
                    );
                    
                    if (index % 100 === 0) {
                        console.log(`📊 Восстановлено ${index + 1}/${data.operations.length} операций`);
                    }
                }
            });
            
            console.log('✅ Восстановление завершено успешно');
            showToast(`Восстановлено ${data.operations.length} операций`, 'success');
            return true;
        } else {
            console.log('📭 Нет операций для восстановления');
            showToast('Нет данных для восстановления', 'info');
            return false;
        }
    } catch (error) {
        console.error('❌ Ошибка восстановления:', error);
        showToast('Ошибка восстановления: ' + error.message, 'error');
        return false;
    }
};

// Простые функции для быстрой отладки
window.debugWebSocket = function() {
    console.log('=== DEBUG WEBSOCKET ===');
    console.log('isConnected:', isConnected);
    console.log('stompClient:', stompClient);
    console.log('stompClient.connected:', stompClient ? stompClient.connected : 'N/A');
    console.log('lessonData:', lessonData);
    console.log('lessonData.id:', lessonData ? lessonData.id : 'N/A');
    console.log('boardStateReceived:', boardStateReceived);
    console.log('canvas ready:', !!(canvas && ctx));
    console.log('lastSequenceNumber:', lastSequenceNumber);
    console.log('=======================');
};

window.debugCanvas = function() {
    console.log('=== DEBUG CANVAS ===');
    console.log('canvas:', canvas);
    console.log('ctx:', ctx);
    console.log('isDrawing:', isDrawing);
    console.log('currentTool:', currentTool);
    console.log('currentColor:', currentColor);
    console.log('currentBrushSize:', currentBrushSize);
    console.log('zoom:', zoom);
    console.log('panX:', panX);
    console.log('panY:', panY);
    console.log('=======================');
};

window.reconnectWebSocket = function() {
    console.log('Принудительное переподключение...');
    if (stompClient) {
        try {
            stompClient.disconnect();
        } catch (error) {
            console.log('Ошибка при отключении:', error);
        }
    }
    isConnected = false;
    setTimeout(() => {
        connectWebSocket();
    }, 1000);
};

window.testBoardAPI = async function() {
    console.log('Тестирование REST API...');
    try {
        const response = await fetch('/api/board/test-db');
        const data = await response.json();
        console.log('REST API результат:', data);
        return data;
    } catch (error) {
        console.error('Ошибка REST API:', error);
    }
};

// Функция для тестирования загрузки состояния доски
window.testBoardStateLoad = async function() {
    console.log('=== ТЕСТИРОВАНИЕ ЗАГРУЗКИ СОСТОЯНИЯ ДОСКИ ===');
    
    if (!lessonData || !lessonData.id) {
        console.error('Нет данных урока для тестирования');
        return;
    }
    
    try {
        console.log('Тестируем загрузку состояния для урока:', lessonData.id);
        
        const response = await fetch(`/api/board/state/${lessonData.id}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Результат загрузки состояния:', data);
        
        if (data.success) {
            console.log('Найдено операций:', data.totalOperations);
            if (data.operations && data.operations.length > 0) {
                console.log('Первые 5 операций:');
                data.operations.slice(0, 5).forEach((op, index) => {
                    console.log(`  ${index + 1}. ${op.operationType} в (${op.x}, ${op.y}) цвет: ${op.color}`);
                });
            }
        }
        
        return data;
    } catch (error) {
        console.error('Ошибка тестирования загрузки состояния:', error);
        return null;
    }
};

// Функция для принудительной загрузки состояния доски
window.forceLoadBoardState = async function() {
    console.log('=== ПРИНУДИТЕЛЬНАЯ ЗАГРУЗКА СОСТОЯНИЯ ДОСКИ ===');
    const success = await loadBoardStateImmediately();
    if (success) {
        console.log('Принудительная загрузка завершена успешно');
    } else {
        console.log('Принудительная загрузка завершена, но данных нет');
    }
    return success;
};

// Автоматическое восстановление состояния доски
function startAutoRestore() {
    if (autoRestoreInterval) {
        clearInterval(autoRestoreInterval);
    }
    
    // Оптимизация: увеличиваем интервал до 10 секунд для снижения нагрузки
    autoRestoreInterval = setInterval(() => {
        if (isConnected && stompClient && stompClient.connected && lessonData && boardStateReceived) {
            // Проверяем состояние подключения перед запросом
            if (stompClient.connected) {
                console.log('Автоматическая проверка состояния доски');
                requestBoardState();
            } else {
                console.log('WebSocket не подключен, переподключаемся...');
                connectWebSocket();
            }
        }
    }, 10000);
    
    console.log('Автоматическое восстановление запущено');
}

// Проверка состояния WebSocket подключения
function checkWebSocketConnection() {
    const status = {
        isConnected: isConnected,
        hasStompClient: !!stompClient,
        stompClientConnected: stompClient ? stompClient.connected : false,
        hasLessonData: !!lessonData,
        lessonDataId: lessonData ? lessonData.id : 'undefined',
        boardStateReceived: boardStateReceived,
        canvasReady: !!(canvas && ctx),
        lastSequenceNumber: lastSequenceNumber
    };
    
    console.log('WebSocket connection status:', status);
    return status;
}

// Диагностика состояния системы
function diagnoseSystem() {
    console.log('=== ДИАГНОСТИКА СИСТЕМЫ ===');
    
    const wsStatus = checkWebSocketConnection();
    console.log('WebSocket статус:', wsStatus);
    
    console.log('Canvas состояние:', {
        canvas: !!canvas,
        ctx: !!ctx,
        isDrawing: isDrawing,
        currentTool: currentTool,
        currentColor: currentColor,
        currentBrushSize: currentBrushSize
    });
    
    console.log('Доска состояние:', {
        zoom: zoom,
        panX: panX,
        panY: panY,
        boardStateReceived: boardStateReceived,
        connectedUsers: Object.keys(connectedUsers).length
    });
    
    console.log('Урок данные:', {
        lessonId: lessonData ? lessonData.id : 'undefined',
        teacher: lessonData ? lessonData.teacher : 'undefined',
        student: lessonData ? lessonData.student : 'undefined',
        currentUserId: getCurrentUserId(),
        currentUserName: getCurrentUserName()
    });
    
    return {
        websocket: wsStatus,
        canvas: {
            ready: !!(canvas && ctx),
            isDrawing: isDrawing,
            tool: currentTool
        },
        board: {
            stateReceived: boardStateReceived,
            zoom: zoom,
            users: Object.keys(connectedUsers).length
        },
        lesson: {
            id: lessonData ? lessonData.id : 'undefined',
            userId: getCurrentUserId(),
            userName: getCurrentUserName()
        }
    };
}

// Функция для принудительного переподключения
function forceReconnect() {
    console.log('Принудительное переподключение WebSocket');
    
    if (stompClient) {
        try {
            stompClient.disconnect();
        } catch (error) {
            console.log('Ошибка при отключении:', error);
        }
    }
    
    isConnected = false;
    reconnectAttempts = 0;
    
    setTimeout(() => {
        connectWebSocket();
    }, 1000);
}

// Остановка автоматического восстановления
function stopAutoRestore() {
    if (autoRestoreInterval) {
        clearInterval(autoRestoreInterval);
        autoRestoreInterval = null;
        console.log('Автоматическое восстановление остановлено');
    }
}

// Получение иконки для уведомления
function getToastIcon(type) {
    switch (type) {
        case 'success': return 'check-circle';
        case 'error': return 'exclamation-circle';
        case 'warning': return 'exclamation-triangle';
        default: return 'info-circle';
    }
}

// Очистка при закрытии страницы
window.addEventListener('beforeunload', function() {
    // Останавливаем автоматическое восстановление
    stopAutoRestore();
    
    // Отправляем сообщение об отключении
    if (isConnected && stompClient && lessonData) {
        const currentUserId = getCurrentUserId();
        const currentUserName = userName || (lessonData.teacher ? lessonData.teacher.name : lessonData.student.name) || 'Unknown User';
        
        stompClient.send("/app/board/" + lessonData.id + "/leave", {}, JSON.stringify({
            userId: currentUserId.toString(),
            userName: currentUserName,
            timestamp: Date.now()
        }));
    }
    
    stopActiveStream();
});

// Функция экспорта доски в PNG
function exportBoardToPNG() {
    if (!canvas) {
        console.error('Canvas не инициализирован');
        showToast('Ошибка: Canvas не инициализирован', 'error');
        return;
    }
    
    try {
        // Создаем временный canvas для экспорта
        const exportCanvas = document.createElement('canvas');
        const exportCtx = exportCanvas.getContext('2d');
        
        // Устанавливаем размеры
        exportCanvas.width = canvas.width;
        exportCanvas.height = canvas.height;
        
        // Копируем содержимое
        exportCtx.drawImage(canvas, 0, 0);
        
        // Конвертируем в PNG
        const dataURL = exportCanvas.toDataURL('image/png');
        
        // Создаем ссылку для скачивания
        const link = document.createElement('a');
        link.download = `board_${lessonData?.id || 'unknown'}_${Date.now()}.png`;
        link.href = dataURL;
        
        // Скачиваем файл
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('Доска экспортирована в PNG', 'success');
        console.log('Доска экспортирована в PNG');
        
    } catch (error) {
        console.error('Ошибка экспорта доски:', error);
        showToast('Ошибка экспорта доски: ' + error.message, 'error');
    }
}

// Функция завершения урока (новая версия)
function endLesson() {
    if (!confirm('Вы уверены, что хотите завершить урок? Все операции рисования будут очищены.')) {
        return;
    }
    
    if (isConnected && stompClient && lessonData) {
        const endData = {
            userId: getCurrentUserId(),
            userName: userName || (lessonData.teacher ? lessonData.teacher.name : lessonData.student.name) || 'Unknown User',
            timestamp: Date.now()
        };
        
        stompClient.send("/app/board/" + lessonData.id + "/end-lesson", {}, JSON.stringify(endData));
        console.log('Запрос на завершение урока отправлен');
    } else {
        console.warn('WebSocket не подключен, завершаем урок локально');
        handleLessonEnded({
            message: 'Урок завершен локально. Все операции рисования очищены.'
        });
    }
}

// Добавляем обработчики для новых функций
document.addEventListener('DOMContentLoaded', function() {
    // Обработчик кнопки завершения урока
    const endLessonBtn = document.getElementById('endLessonBtn');
    if (endLessonBtn) {
        endLessonBtn.addEventListener('click', endLesson);
    }
    
    // Обработчик кнопки экспорта
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportBoardToPNG);
    }
    
    // Добавляем кнопку экспорта, если её нет
    if (!exportBtn) {
        const toolbar = document.querySelector('.top-bar-center');
        if (toolbar) {
            const exportButton = document.createElement('button');
            exportButton.className = 'tool-btn';
            exportButton.id = 'exportBtn';
            exportButton.title = 'Экспорт в PNG';
            exportButton.innerHTML = '<i class="material-icons-outlined">download</i>';
            exportButton.addEventListener('click', exportBoardToPNG);
            toolbar.appendChild(exportButton);
        }
    }
});

// Добавляем функции в глобальную область
window.exportBoardToPNG = exportBoardToPNG;
window.endLesson = endLesson;

// Отправка полного рисунка целиком
function sendCompleteDrawing(drawingPoints) {
    if (!isConnected || !stompClient || !lessonData || drawingPoints.length === 0) {
        console.warn('Не удается отправить рисунок:', {
            isConnected,
            hasStompClient: !!stompClient,
            hasLessonData: !!lessonData,
            pointsCount: drawingPoints.length
        });
        return;
    }
    
    const drawingData = {
        drawingPoints: drawingPoints,
        userId: getCurrentUserId(),
        userName: userName || (lessonData.teacher ? lessonData.teacher.name : lessonData.student.name) || 'Unknown User',
        timestamp: Date.now()
    };
    
    console.log('Отправляем полный рисунок:', drawingPoints.length + ' точек');
    
    stompClient.send("/app/board/" + lessonData.id + "/complete-drawing", {}, JSON.stringify(drawingData));
}

// Обработка полного рисунка от других пользователей
function handleCompleteDrawing(data) {
    if (!canvas || !ctx) {
        console.error('Canvas не инициализирован для complete drawing');
        return;
    }
    
    const { drawingPoints, userId, userName } = data;
    
    console.log('=== ОБРАБОТКА COMPLETE DRAWING ===');
    console.log('Получено точек:', drawingPoints ? drawingPoints.length : 0);
    console.log('От пользователя:', userName);
    
    // Не обрабатываем собственные данные
    if (userId.toString() === getCurrentUserId()) {
        console.log('Пропускаем собственный рисунок');
        return;
    }
    
    // Применяем все точки рисунка
    if (drawingPoints && Array.isArray(drawingPoints)) {
        drawingPoints.forEach(point => {
            const { x, y, type, color, brushSize } = point;
            
            if (type === 'draw' && (!isValidCoordinate(x) || !isValidCoordinate(y))) {
                console.log('Пропускаем точку с невалидными координатами:', x, y);
                return;
            }
            
            applyDrawOperation(type, x, y, color, brushSize);
        });
    }
    
    console.log('=== COMPLETE DRAWING ЗАВЕРШЕН ===');
}

// Немедленная загрузка состояния доски при инициализации (с подробным логированием)
async function loadBoardStateImmediately() {
    if (!lessonData || !lessonData.id) {
        console.error('❌ Нет данных урока для немедленной загрузки состояния');
        return false;
    }
    
    console.log('🚀 === НЕМЕДЛЕННАЯ ЗАГРУЗКА СОСТОЯНИЯ ДОСКИ ===');
    console.log('📚 Загружаем состояние доски для урока:', lessonData.id);
    
    // Проверяем, что canvas готов
    if (!canvas || !ctx) {
        console.log('⏳ Canvas не готов, ждем инициализации...');
        // Ждем до 3 секунд пока canvas инициализируется
        for (let i = 0; i < 30; i++) {
            await new Promise(resolve => setTimeout(resolve, 100));
            if (canvas && ctx) {
                console.log('✅ Canvas готов, продолжаем загрузку состояния');
                break;
            }
        }
        
        if (!canvas || !ctx) {
            console.error('❌ Canvas не инициализирован после ожидания');
            return false;
        }
    }
    
    try {
        console.log('🌐 Отправляем запрос к API для загрузки состояния...');
        
        const response = await fetch(`/api/board/state/${lessonData.id}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📥 Получен ответ от API:', data);
        
        if (data.success && data.operations && data.operations.length > 0) {
            console.log(`🎯 Состояние доски загружено немедленно: ${data.totalOperations} операций`);
            console.log(`📊 Тип данных: ${Array.isArray(data.operations) ? 'массив' : 'объект'}`);
            
            // Сохраняем данные состояния глобально
            window.boardStateData = data;
            boardStateReceived = true;
            
            // Очищаем доску перед восстановлением
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            console.log('🧹 Доска очищена для восстановления');
            
            // Инициализируем счетчики для логирования
            restorationStartTime = Date.now();
            restoredPointsCount = 0;
            totalPointsToRestore = data.operations.length;
            
            console.log(`🔄 Начинаем восстановление ${data.operations.length} операций...`);
            
            // Восстанавливаем операции последовательно
            let validOperations = 0;
            let invalidOperations = 0;
            
            data.operations.forEach((operation, index) => {
                if (operation && operation.operationType) {
                    const opType = operation.operationType;
                    const x = operation.x;
                    const y = operation.y;
                    const color = operation.color;
                    const brushSize = operation.brushSize;
                    
                    // Проверяем валидность операции
                    if (opType === 'draw' && (!isValidCoordinate(x) || !isValidCoordinate(y))) {
                        console.warn(`⚠️ Невалидная операция #${index}: ${opType} в (${x}, ${y})`);
                        invalidOperations++;
                        return;
                    }
                    
                    // Применяем операцию
                    applyDrawOperation(opType, x, y, color, brushSize);
                    validOperations++;
                    
                    // Показываем прогресс каждые 100 операций
                    if (index % 100 === 0) {
                        const progress = Math.round((index / data.operations.length) * 100);
                        console.log(`📊 Прогресс восстановления: ${index + 1}/${data.operations.length} (${progress}%)`);
                    }
                } else {
                    console.warn(`⚠️ Пропущена невалидная операция #${index}:`, operation);
                    invalidOperations++;
                }
            });
            
            // Обновляем последний номер последовательности
            if (data.operations.length > 0) {
                const lastOp = data.operations[data.operations.length - 1];
                if (lastOp && lastOp.sequenceNumber) {
                    lastSequenceNumber = lastOp.sequenceNumber;
                    console.log('🔢 Обновлен lastSequenceNumber при немедленной загрузке:', lastSequenceNumber);
                }
            }
            
            const totalTime = Date.now() - restorationStartTime;
            console.log(`✅ Немедленное восстановление завершено: ${validOperations} валидных, ${invalidOperations} невалидных операций за ${totalTime}ms`);
            console.log(`📍 Всего восстановлено точек: ${restoredPointsCount}`);
            
            showToast(`Загружено ${data.totalOperations} операций рисования`, 'success');
            return true;
        } else {
            console.log('📭 Нет сохраненных операций для урока:', lessonData.id);
            return false;
        }
    } catch (error) {
        console.error('❌ Ошибка немедленной загрузки состояния доски:', error || 'Неизвестная ошибка');
        // Не показываем ошибку пользователю, так как это может быть нормально для нового урока
        // Но логируем подробности для отладки
        if (error?.message) {
            console.error('Детали ошибки:', error.message);
        }
        return false;
    }
}
