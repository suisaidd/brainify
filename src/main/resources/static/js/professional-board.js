// Professional Board - Основной файл доски
// Объединяет все модули и обеспечивает инициализацию

// Глобальные переменные
if (typeof board === 'undefined') var board = null;
// Храним реальную ссылку на доску отдельно от Proxy
var _realBoardInstance = null;

// Функция для получения экземпляра доски
function getBoard() {
    console.log('🔍 getBoard() вызвана');
    console.log('  - _realBoardInstance:', !!_realBoardInstance);
    console.log('  - window.professionalBoardInstance:', !!window.professionalBoardInstance);
    
    // Возвращаем реальный экземпляр доски, избегая рекурсии через Proxy
    if (_realBoardInstance) {
        console.log('✅ Возвращаем _realBoardInstance');
        return _realBoardInstance;
    }
    
    // НИКОГДА НЕ ОБРАЩАЕМСЯ К window.board - это может быть Proxy!
    // Проверяем только window.professionalBoardInstance
    if (window.professionalBoardInstance) {
        console.log('✅ Устанавливаем _realBoardInstance из window.professionalBoardInstance');
        _realBoardInstance = window.professionalBoardInstance;
        return _realBoardInstance;
    }
    
    console.log('❌ Доска не найдена, возвращаем null');
    return null;
}

// Функция для установки реального экземпляра доски
function setRealBoardInstance(boardInstance) {
    console.log('🔧 setRealBoardInstance() вызвана с:', !!boardInstance);
    if (boardInstance) {
        console.log('  - Тип:', typeof boardInstance);
        console.log('  - Конструктор:', boardInstance.constructor?.name);
        console.log('  - canvas:', !!boardInstance.canvas);
        console.log('  - modules:', !!boardInstance.modules);
    }
    
    _realBoardInstance = boardInstance;
    if (boardInstance) {
        boardInstance._isRealBoard = true;
        console.log('✅ Реальный экземпляр доски установлен');
    } else {
        console.log('⚠️ Установлен null как экземпляр доски');
    }
}

// Создаем Proxy для board, который автоматически перенаправляет к правильному экземпляру
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
    },
    has: function(target, prop) {
        const boardInstance = getBoard();
        return boardInstance && (prop in boardInstance);
    }
});

// Безопасные функции для работы с доской
function safeBoardOperation(operation, ...args) {
    const boardInstance = getBoard();
    if (!boardInstance) {
        console.warn('Доска не инициализирована для операции:', operation);
        return null;
    }
    
    try {
        if (typeof boardInstance[operation] === 'function') {
            return boardInstance[operation](...args);
        } else {
            console.warn('Операция не найдена:', operation);
            return null;
        }
    } catch (error) {
        console.error('Ошибка операции доски:', operation, error);
        return null;
    }
}

// Безопасный доступ к свойствам доски
function safeBoardProperty(property) {
    const boardInstance = getBoard();
    if (!boardInstance) {
        console.warn('Доска не инициализирована для доступа к свойству:', property);
        return null;
    }
    return boardInstance[property];
}

// Безопасная установка свойств доски
function safeBoardPropertySet(property, value) {
    const boardInstance = getBoard();
    if (!boardInstance) {
        console.warn('Доска не инициализирована для установки свойства:', property);
        return false;
    }
    boardInstance[property] = value;
    return true;
}
// Проверяем глобальные переменные (избегаем конфликтов с HTML)
if (typeof window.currentUser === 'undefined') window.currentUser = null;
if (typeof window.lessonData === 'undefined') window.lessonData = null;
if (typeof window.lessonId === 'undefined') window.lessonId = null;
// Используем window.isTeacher вместо объявления новой переменной для избежания конфликта
if (typeof window.isTeacher === 'undefined') window.isTeacher = false;
if (typeof window.isAdmin === 'undefined') window.isAdmin = false;
if (typeof window.isViewOnly === 'undefined') window.isViewOnly = false;

// Создаем локальные ссылки для обратной совместимости (НЕ перезаписываем если уже есть)
// УДАЛЕНО: var currentUser - используем только window.currentUser для избежания конфликта
// УДАЛЕНО: var lessonData - используем только window.lessonData для избежания конфликта с глобальной переменной
// УДАЛЕНО: var lessonId - используем только window.lessonId для избежания конфликта с глобальной переменной
// Удалено: var isTeacher - используем только window.isTeacher для избежания конфликта
// Удалено: var isAdmin - используем только window.isAdmin для избежания конфликта  
// Удалено: var isViewOnly - используем только window.isViewOnly для избежания конфликта
var webSocketConnected = false;
var reconnectAttempts = 0;
var maxReconnectAttempts = 5;

// Инициализация доски - УДАЛЯЕМ, так как она уже есть в HTML
// document.addEventListener('DOMContentLoaded', function() {
//     console.log('Инициализация Professional Board...');
//     
//     // Получение данных из Thymeleaf (если доступны)
//     try {
//         currentUser = /*[[${currentUser}]]*/ null;
//         lessonData = /*[[${lesson}]]*/ null;
//         isTeacher = /*[[${isTeacher}]]*/ false;
//         isAdmin = /*[[${isAdmin}]]*/ false;
//         isViewOnly = /*[[${isViewOnly}]]*/ false;
//     } catch (e) {
//         console.warn('Ошибка получения данных из Thymeleaf:', e);
//         // Устанавливаем значения по умолчанию
//         currentUser = null;
//         lessonData = null;
//         // isTeacher, isAdmin, isViewOnly уже установлены выше
//     }
//     
//     // Получение ID урока
//     lessonId = lessonData ? lessonData.id : (new URLSearchParams(window.location.search).get('lessonId') || 'demo');
//     
//     console.log('Lesson ID:', lessonId);
//     console.log('Current User:', currentUser);
//     console.log('Lesson Data:', lessonData);
//     console.log('Is Demo:', lessonId === 'demo');
//     console.log('Is Teacher:', isTeacher);
//     console.log('Is Admin:', isAdmin);
//     console.log('Is View Only:', isViewOnly);
//     
//     // Инициализация списка активных пользователей
//     window.activeUsers = new Set();
//     
//     // Инициализация доски
//     initBoard();
//     
//     // Подключение к серверу для совместной работы (только если не демо режим)
//     if (lessonId !== 'demo' && lessonData) {
//         console.log('Подключение к WebSocket для урока:', lessonId);
//         connectWebSocket();
//     } else {
//         console.log('WebSocket не подключается: lessonId =', lessonId, 'lessonData =', lessonData);
//         updateSyncIndicator('disconnected', 'Демо режим');
//     }
//     
//     console.log('Professional Board инициализирована успешно!');
// });

// Подключение WebSocket с улучшенной обработкой ошибок
function connectWebSocket() {
    console.log('🔌 Подключение к WebSocket для урока:', window.lessonId);
    
    updateSyncIndicator('connecting', 'Подключение к серверу...');
    
    if (!window.lessonId || window.lessonId === 'demo') {
        console.log('WebSocket не подключается: демо режим');
        updateSyncIndicator('disconnected', 'Демо режим');
        return;
    }
    
    try {
        const socket = new SockJS('/ws');
        window.stompClient = Stomp.over(socket);
        
        // Отключаем debug логи
        window.stompClient.debug = null;
        
        window.stompClient.connect({}, function(frame) {
            console.log('✅ WebSocket подключен успешно');
            webSocketConnected = true;
            reconnectAttempts = 0; // Сбрасываем счетчик попыток
            
            updateSyncIndicator('connected', 'Подключено');
            
            // Подписываемся на обновления доски
            window.stompClient.subscribe('/topic/board/' + window.lessonId, function(message) {
                handleBoardMessage(JSON.parse(message.body));
            });
            
            // Подписываемся на личные сообщения (состояние доски)
            window.stompClient.subscribe('/user/queue/board/state', function(message) {
                handleBoardStateMessage(JSON.parse(message.body));
            });
            
            // Отправляем сообщение о присоединении
            const userId = window.currentUser ? window.currentUser.id : 1;
            const userName = window.currentUser ? window.currentUser.name : 'Пользователь';
            
            window.stompClient.send("/app/board/" + window.lessonId + "/join", {}, JSON.stringify({
                lessonId: window.lessonId,
                userId: userId,
                userName: userName
            }));
            
            // Запрашиваем текущее состояние доски
            window.stompClient.send("/app/board/" + window.lessonId + "/request-state", {}, JSON.stringify({
                lessonId: window.lessonId,
                userId: userId
            }));
            
        }, function(error) {
            console.error('❌ Ошибка WebSocket подключения:', error);
            webSocketConnected = false;
            
            updateSyncIndicator('disconnected', 'Ошибка подключения');
            
            // Повторное подключение с ограничением попыток
            if (window.lessonId !== 'demo' && reconnectAttempts < maxReconnectAttempts) {
                reconnectAttempts++;
                console.log(`🔄 Повторное подключение... (${reconnectAttempts}/${maxReconnectAttempts})`);
                setTimeout(() => {
                    connectWebSocket();
                }, 5000 * reconnectAttempts); // Увеличиваем задержку с каждой попыткой
            } else if (reconnectAttempts >= maxReconnectAttempts) {
                console.error('❌ Превышено максимальное количество попыток подключения');
                updateSyncIndicator('disconnected', 'Не удалось подключиться');
                showToast('Не удалось подключиться к серверу. Проверьте соединение.', 'error');
            }
        });
    } catch (error) {
        console.error('Критическая ошибка при создании WebSocket:', error);
        updateSyncIndicator('disconnected', 'Ошибка создания соединения');
        showToast('Ошибка создания WebSocket соединения', 'error');
    }
}

// Обработка сообщений доски
function handleBoardMessage(message) {
    if (message.type === 'draw_operation' && board) {
        // Обработка данных рисования от других пользователей
        handleRemoteDrawOperation(message);
    } else if (message.type === 'user_joined') {
        showUserJoined(message.userName);
    } else if (message.type === 'user_left') {
        showUserLeft(message.userName);
    } else if (message.type === 'cursor_position') {
        // Обновление позиции курсора удаленного пользователя
        updateRemoteCursor(message);
    }
}

// Обработка состояния доски при загрузке
function handleBoardStateMessage(message) {
    if (message.type === 'board_state' && board) {
        console.log('🔄 Восстановление состояния доски: ' + message.totalOperations + ' операций');
        
        // Очищаем доску перед восстановлением
        board.clear();
        
        // Восстанавливаем операции по порядку
        if (message.operations && message.operations.length > 0) {
            // Группируем операции по штрихам
            const strokes = groupOperationsIntoStrokes(message.operations);
            console.log('🎨 Сгруппировано штрихов:', strokes.length);
            
            // Восстанавливаем каждый штрих
            strokes.forEach((stroke, index) => {
                // Создаем объект штриха
                const strokeObject = {
                    type: 'stroke',
                    points: stroke.points,
                    color: stroke.color,
                    brushSize: stroke.brushSize,
                    opacity: 1,
                    tool: 'pen',
                    timestamp: stroke.timestamp
                };
                
                // Добавляем на доску
                board.addObject(strokeObject);
            });
            
            // Рендерим доску
            board.render();
            console.log('✅ Состояние доски восстановлено: ' + strokes.length + ' штрихов');
            showToast(`Восстановлено ${strokes.length} штрихов`, 'success');
        }
    } else if (message.type === 'error') {
        console.error('❌ Ошибка получения состояния доски:', message.message);
        showToast('Ошибка получения состояния доски: ' + message.message, 'error');
    }
}

// Группировка операций в штрихи
function groupOperationsIntoStrokes(operations) {
    const strokes = [];
    let currentStroke = null;
    
    operations.forEach(operation => {
        if (operation.operationType === 'start') {
            // Начинаем новый штрих
            if (currentStroke) {
                strokes.push(currentStroke);
            }
            currentStroke = {
                points: [{ x: operation.x, y: operation.y }],
                color: operation.color || '#000000',
                brushSize: operation.brushSize || 3,
                timestamp: operation.timestamp
            };
        } else if (operation.operationType === 'draw' && currentStroke) {
            // Добавляем точку к текущему штриху
            if (operation.x !== null && operation.y !== null) {
                currentStroke.points.push({ x: operation.x, y: operation.y });
            }
        } else if (operation.operationType === 'end' && currentStroke) {
            // Завершаем текущий штрих
            strokes.push(currentStroke);
            currentStroke = null;
        }
    });
    
    // Добавляем последний штрих, если он не завершен
    if (currentStroke) {
        strokes.push(currentStroke);
    }
    
    return strokes;
}

// Обработка удаленных операций рисования
function handleRemoteDrawOperation(data) {
    if (!board || !data.operationType) {
        return;
    }
    
            // Игнорируем собственные операции
        const currentUserId = window.currentUser ? window.currentUser.id : 1;
    
    if (data.userId.toString() === currentUserId.toString()) {
        return;
    }
    
    switch (data.operationType) {
        case 'start':
            // Начало рисования
            if (data.x !== null && data.y !== null) {
                // Создаем новый штрих для удаленного пользователя
                const stroke = {
                    type: 'stroke',
                    points: [{ x: data.x, y: data.y }],
                    color: data.color || '#000000',
                    brushSize: data.brushSize || 3,
                    opacity: 1,
                    tool: 'pen',
                    timestamp: Date.now(),
                    remoteUserId: data.userId,
                    remoteUserName: data.userName
                };
                
                // Сохраняем ссылку на удаленный штрих
                if (!board.remoteStrokes) {
                    board.remoteStrokes = new Map();
                }
                board.remoteStrokes.set(data.userId, stroke);
                
                board.addObject(stroke);
                board.render();
            }
            break;
            
        case 'draw':
            // Продолжение рисования
            if (data.x !== null && data.y !== null) {
                // Находим штрих удаленного пользователя
                if (board.remoteStrokes && board.remoteStrokes.has(data.userId)) {
                    const stroke = board.remoteStrokes.get(data.userId);
                    stroke.points.push({ x: data.x, y: data.y });
                    board.render();
                }
            }
            break;
            
        case 'end':
            // Завершение рисования
            // Удаляем ссылку на удаленный штрих
            if (board.remoteStrokes) {
                board.remoteStrokes.delete(data.userId);
            }
            break;
    }
}

// Функция отправки данных рисования с улучшенной обработкой ошибок
function sendDrawData(drawData) {
    if (!webSocketConnected) {
        // Попытка переподключения
        if (window.lessonId !== 'demo' && reconnectAttempts < maxReconnectAttempts) {
            connectWebSocket();
        }
        return;
    }
    
    if (!window.stompClient) {
        // Попытка переподключения
        if (window.lessonId !== 'demo' && reconnectAttempts < maxReconnectAttempts) {
            connectWebSocket();
        }
        return;
    }
    
    try {
        window.stompClient.send("/app/board/" + window.lessonId + "/draw", {}, JSON.stringify(drawData));
    } catch (error) {
        console.error('❌ Ошибка отправки данных рисования:', error);
        
        // Попытка переподключения при ошибке
        webSocketConnected = false;
        if (window.lessonId !== 'demo' && reconnectAttempts < maxReconnectAttempts) {
            setTimeout(() => {
                connectWebSocket();
            }, 1000);
        }
    }
}

// Функция для принудительного восстановления состояния доски через REST API
async function forceRestoreBoardState() {
    console.log('🚀 === ПРИНУДИТЕЛЬНОЕ ВОССТАНОВЛЕНИЕ СОСТОЯНИЯ ДОСКИ ===');
    
    const boardInstance = getBoard();
    if (!boardInstance) {
        console.error('❌ Доска не инициализирована');
        showToast('Доска не инициализирована', 'error');
        return false;
    }
    
    if (!window.lessonId || window.lessonId === 'demo') {
        console.log('📝 Демо режим - восстановление не требуется');
        return false;
    }
    
    try {
        console.log('🌐 Загружаем состояние через REST API...');
        const response = await fetch(`/api/board/state/${window.lessonId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📥 Получен ответ от API:', data);
        
        if (data.success && data.operations && data.operations.length > 0) {
            console.log(`📊 Получено ${data.operations.length} операций из БД`);
            
            // Очищаем доску
            boardInstance.clear();
            console.log('🧹 Доска очищена для восстановления');
            
            // Группируем операции по штрихам
            const strokes = groupOperationsIntoStrokes(data.operations);
            console.log(`🎨 Сгруппировано ${strokes.length} штрихов`);
            
            // Восстанавливаем каждый штрих
            strokes.forEach((stroke, index) => {
                console.log(`🔄 Восстанавливаем штрих ${index + 1}: ${stroke.points.length} точек`);
                
                const strokeObject = {
                    type: 'stroke',
                    points: stroke.points,
                    color: stroke.color,
                    brushSize: stroke.brushSize,
                    opacity: 1,
                    tool: 'pen',
                    timestamp: stroke.timestamp
                };
                
                boardInstance.addObject(strokeObject);
            });
            
            // Рендерим доску
            boardInstance.render();
            console.log('✅ Восстановление завершено успешно');
            showToast(`Восстановлено ${strokes.length} штрихов (${data.operations.length} операций)`, 'success');
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
}

// Функция для проверки состояния WebSocket и принудительного восстановления
async function checkAndRestoreBoardState() {
    console.log('🔍 === ПРОВЕРКА И ВОССТАНОВЛЕНИЕ СОСТОЯНИЯ ДОСКИ ===');
    
    if (!webSocketConnected) {
        console.log('⚠️ WebSocket не подключен, используем REST API для восстановления');
        return await forceRestoreBoardState();
    }
    
    // Если WebSocket подключен, ждем немного для получения состояния
    console.log('⏳ WebSocket подключен, ждем получения состояния...');
    
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            console.log('⏰ Таймаут ожидания состояния через WebSocket, используем REST API');
            forceRestoreBoardState().then(resolve);
        }, 5000); // Ждем 5 секунд
        
        // Если получили состояние через WebSocket, отменяем таймаут
        const originalHandleBoardStateMessage = handleBoardStateMessage;
        handleBoardStateMessage = function(message) {
            if (message.type === 'board_state') {
                clearTimeout(timeout);
                handleBoardStateMessage = originalHandleBoardStateMessage;
                resolve(true);
            }
            originalHandleBoardStateMessage(message);
        };
    });
}

// Функция инициализации дополнительных компонентов доски
function initBoard() {
    console.log('🔧 Инициализация дополнительных компонентов доски...');
    
    const boardInstance = getBoard();
    if (!boardInstance) {
        console.error('❌ Доска не найдена!');
        return;
    }
    
    try {
        // Настройка событий доски
        setupBoardEvents();
        
        // Инициализация списка активных пользователей
        window.activeUsers = new Set();
        
        console.log('✅ Дополнительные компоненты инициализированы');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации компонентов:', error);
    }
}

// Настройка событий доски
function setupBoardEvents() {
    console.log('🔧 === НАСТРОЙКА СОБЫТИЙ ДОСКИ ===');
    const boardInstance = getBoard();
    if (!boardInstance) {
        console.error('❌ Доска не инициализирована для настройки событий!');
        console.log('🔍 Попытка диагностики:');
        console.log('  - _realBoardInstance:', !!_realBoardInstance);
        console.log('  - window.professionalBoardInstance:', !!window.professionalBoardInstance);
        console.log('  - typeof ProfessionalBoard:', typeof ProfessionalBoard);
        return;
    }
    
    console.log('✅ Доска найдена для настройки событий:', boardInstance.constructor?.name);
    console.log('🔧 Настройка событий доски...');
    
    boardInstance.on('toolChanged', (tool) => {
        console.log('Инструмент изменен:', tool);
        updateToolButtons(tool);
    });
    
    boardInstance.on('historyChanged', (state) => {
        console.log('История изменена:', state);
        const undoBtn = document.getElementById('undoBtn');
        const redoBtn = document.getElementById('redoBtn');
        if (undoBtn) undoBtn.disabled = !state.canUndo;
        if (redoBtn) redoBtn.disabled = !state.canRedo;
    });
    
    boardInstance.on('zoomChanged', (zoom) => {
        console.log('Зум изменен:', zoom);
        const zoomLevel = document.getElementById('zoomLevel');
        if (zoomLevel) zoomLevel.textContent = Math.round(zoom * 100) + '%';
    });
    
    boardInstance.on('cursorMove', (pos) => {
        const cursorPosition = document.getElementById('cursorPosition');
        if (cursorPosition) {
            cursorPosition.textContent = `${Math.round(pos.x)}, ${Math.round(pos.y)}`;
        }
        
        // Отправляем позицию курсора другим пользователям
        if (webSocketConnected && window.stompClient && window.lessonId !== 'demo') {
            const cursorData = {
                type: 'cursor_position',
                x: pos.x,
                y: pos.y,
                userId: window.currentUser ? window.currentUser.id : 1,
                userName: window.currentUser ? window.currentUser.name : 'Пользователь'
            };
            
            try {
                window.stompClient.send("/app/board/" + window.lessonId + "/cursor", {}, JSON.stringify(cursorData));
            } catch (error) {
                console.error('Ошибка отправки позиции курсора:', error);
            }
        }
    });
    
    board.on('drawStart', (stroke) => {
        console.log('Начало рисования:', stroke);
        console.log('🎯 СОБЫТИЕ: НАЧАЛО РИСОВАНИЯ - первая точка:', stroke.points[0]);
        
        // Отправляем данные через WebSocket
        if (window.lessonId !== 'demo') {
            const drawData = {
                type: 'start',
                x: stroke.points[0].x,
                y: stroke.points[0].y,
                color: stroke.color,
                brushSize: stroke.brushSize,
                userId: window.currentUser ? window.currentUser.id : 1,
                userName: window.currentUser ? window.currentUser.name : 'Пользователь'
            };
            console.log('Отправляем данные начала рисования:', drawData);
            sendDrawData(drawData);
        }
    });
    
    board.on('drawing', (point) => {
        console.log('🎨 СОБЫТИЕ: РИСОВАНИЕ - точка:', point);
        
        // Отправляем данные рисования в реальном времени
        if (window.lessonId !== 'demo') {
            const drawData = {
                type: 'draw',
                x: point.x,
                y: point.y,
                color: board.state?.selectedColor || '#000000',
                brushSize: board.state?.brushSize || 5,
                userId: window.currentUser ? window.currentUser.id : 1,
                userName: window.currentUser ? window.currentUser.name : 'Пользователь'
            };
            console.log('Отправляем данные рисования:', drawData);
            sendDrawData(drawData);
        }
    });
    
    board.on('drawEnd', (stroke) => {
        console.log('Конец рисования:', stroke);
        console.log('🏁 СОБЫТИЕ: ЗАВЕРШЕНИЕ РИСОВАНИЯ - всего точек:', stroke.points.length);
        
        // Отправляем данные завершения рисования
        if (window.lessonId !== 'demo') {
            const drawData = {
                type: 'end',
                x: null,
                y: null,
                color: stroke.color,
                brushSize: stroke.brushSize,
                userId: window.currentUser ? window.currentUser.id : 1,
                userName: window.currentUser ? window.currentUser.name : 'Пользователь'
            };
            console.log('Отправляем данные завершения рисования:', drawData);
            sendDrawData(drawData);
        }
    });
    
    board.on('objectAdded', (object) => {
        console.log('Объект добавлен:', object);
    });
    
    console.log('✅ События доски настроены успешно!');
}

// Функция для тестирования рисования из консоли
window.testDrawing = function() {
    console.log('🧪 === ТЕСТИРОВАНИЕ РИСОВАНИЯ ===');
    const boardInstance = getBoard();
    
    if (!boardInstance) {
        console.error('❌ Доска не найдена для тестирования!');
        return false;
    }
    
    console.log('✅ Доска найдена:', boardInstance.constructor?.name);
    console.log('📊 Состояние доски:');
    console.log('  - canvas:', !!boardInstance.canvas);
    console.log('  - ctx:', !!boardInstance.ctx);
    console.log('  - modules:', Object.keys(boardInstance.modules || {}));
    console.log('  - tools:', !!boardInstance.modules?.tools);
    console.log('  - renderer:', !!boardInstance.modules?.renderer);
    
    if (boardInstance.modules?.tools) {
        console.log('🔧 Тестируем инструменты:');
        console.log('  - activeTool:', boardInstance.modules.tools.activeTool?.constructor?.name);
        
        // Попробуем установить инструмент рисования
        try {
            boardInstance.modules.tools.setActiveTool('pen');
            console.log('✅ Инструмент "pen" установлен');
        } catch (error) {
            console.error('❌ Ошибка установки инструмента:', error);
        }
    }
    
    // Попробуем нарисовать тестовую линию
    if (boardInstance.canvas && boardInstance.ctx) {
        console.log('🎨 Тестируем рисование...');
        try {
            const ctx = boardInstance.ctx;
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(50, 50);
            ctx.lineTo(150, 150);
            ctx.stroke();
            console.log('✅ Тестовая линия нарисована!');
            return true;
        } catch (error) {
            console.error('❌ Ошибка рисования:', error);
            return false;
        }
    } else {
        console.error('❌ Canvas или контекст недоступны');
        return false;
    }
};

// Функция выбора инструмента
function selectTool(toolName) {
    console.log('Выбор инструмента:', toolName);
    
    // Убираем активный класс со всех кнопок инструментов
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Добавляем активный класс к выбранному инструменту
    const selectedBtn = document.querySelector(`[data-tool="${toolName}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
        console.log('Инструмент активирован:', toolName);
    } else {
        console.warn('Кнопка инструмента не найдена:', toolName);
    }
}

// Функции управления панелями
function toggleLeftPanel() {
    console.log('toggleLeftPanel вызвана');
    const leftPanel = document.getElementById('leftPanel');
    const toggleBtn = document.getElementById('propertiesToggleBtn');
    
    console.log('leftPanel:', leftPanel);
    console.log('toggleBtn:', toggleBtn);
    console.log('leftPanel.classList:', leftPanel ? leftPanel.classList.toString() : 'null');
    
    if (!leftPanel || !toggleBtn) {
        console.error('Элементы панели не найдены');
        return;
    }
    
    if (leftPanel.classList.contains('show')) {
        leftPanel.classList.remove('show');
        toggleBtn.classList.remove('active');
        console.log('Панель свойств закрыта');
    } else {
        leftPanel.classList.add('show');
        toggleBtn.classList.add('active');
        console.log('Панель свойств открыта');
    }
    
    console.log('После переключения - leftPanel.classList:', leftPanel.classList.toString());
}

function closeLeftPanel() {
    const leftPanel = document.getElementById('leftPanel');
    const toggleBtn = document.getElementById('propertiesToggleBtn');
    if (leftPanel && toggleBtn) {
        leftPanel.classList.remove('show');
        toggleBtn.classList.remove('active');
        console.log('Панель свойств закрыта');
    }
}

// Настройка UI
function setupUI() {
    console.log('Настройка UI...');
    
    // Инструменты
    const toolButtons = document.querySelectorAll('.tool-btn');
    console.log('Найдено кнопок инструментов:', toolButtons.length);
    
    toolButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            console.log('Клик по кнопке инструмента:', this.dataset.tool);
            if (!board) {
                console.error('Доска не инициализирована!');
                return;
            }
            
            const tool = this.dataset.tool;
            const shape = this.dataset.shape;
            
            if (board.modules.tools) {
                board.modules.tools.setActiveTool(tool);
                console.log('Инструмент установлен:', tool);
                
                if (tool === 'shape' && shape) {
                    board.modules.tools.activeTool.setShapeType(shape);
                }
            } else {
                console.error('Модуль инструментов не найден!');
            }
            
            selectTool(tool);
        });
    });
    
    // Цвета
    const colorButtons = document.querySelectorAll('.color-btn');
    console.log('Найдено кнопок цветов:', colorButtons.length);
    
    colorButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            console.log('Выбран цвет:', this.dataset.color);
            if (!getBoard()) return;
            
            document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            if (board.state) board.state.selectedColor = this.dataset.color;
        });
    });
    
    // Выбор цвета
    const colorPicker = document.getElementById('colorPicker');
    if (colorPicker) {
        colorPicker.addEventListener('change', function() {
            console.log('Выбран цвет из пикера:', this.value);
            if (getBoard()) {
                if (board.state) board.state.selectedColor = this.value;
                document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
            }
        });
    }
    
    // Размер кисти
    const brushSize = document.getElementById('brushSize');
    const brushSizeValue = document.getElementById('brushSizeValue');
    
    if (brushSize && brushSizeValue) {
        brushSize.addEventListener('input', function() {
            console.log('Размер кисти изменен:', this.value);
            if (board.state) {
                board.state.brushSize = parseInt(this.value);
                brushSizeValue.textContent = this.value;
                console.log('Новый размер кисти установлен:', board.state.brushSize);
            }
        });
    }
    
    // Прозрачность
    const opacitySlider = document.getElementById('opacitySlider');
    const opacityValue = document.getElementById('opacityValue');
    
    if (opacitySlider && opacityValue) {
        opacitySlider.addEventListener('input', function() {
            console.log('Прозрачность изменена:', this.value);
            if (getBoard()) {
                if (board.state) {
                    board.state.opacity = parseInt(this.value) / 100;
                    opacityValue.textContent = this.value + '%';
                    console.log('Новая прозрачность установлена:', board.state.opacity);
                }
            }
        });
    }
    
    // Зум
    const zoomInBtn = document.getElementById('zoomInBtn');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const resetZoomBtn = document.getElementById('resetZoomBtn');
    
    if (zoomInBtn && getBoard()) {
        zoomInBtn.addEventListener('click', () => {
            console.log('Увеличение зума');
            if (board && board.canvas) {
                board.zoomAt(board.canvas.width / 2, board.canvas.height / 2, board.state.zoom * 1.2);
            }
        });
    }
    
    if (zoomOutBtn && getBoard()) {
        zoomOutBtn.addEventListener('click', () => {
            console.log('Уменьшение зума');
            if (board && board.canvas) {
                board.zoomAt(board.canvas.width / 2, board.canvas.height / 2, board.state.zoom / 1.2);
            }
        });
    }
    
    if (resetZoomBtn && getBoard()) {
        resetZoomBtn.addEventListener('click', () => {
            console.log('Сброс зума');
            if (board && board.canvas) {
                board.zoomAt(board.canvas.width / 2, board.canvas.height / 2, 1);
            }
        });
    }
    
    // История
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    
    if (undoBtn && board) {
        undoBtn.addEventListener('click', () => {
            console.log('Отмена');
            board.undo();
        });
    }
    
    if (redoBtn && board) {
        redoBtn.addEventListener('click', () => {
            console.log('Повтор');
            board.redo();
        });
    }
    
    // Очистка доски
    const clearBoardBtn = document.getElementById('clearBoardBtn');
    if (clearBoardBtn && getBoard()) {
        clearBoardBtn.addEventListener('click', () => {
            console.log('Очистка доски');
            if (confirm('Очистить доску?')) {
                board.clear();
            }
        });
    }
    
    // Сохранение доски
    const saveBoardBtn = document.getElementById('saveBoardBtn');
    if (saveBoardBtn && getBoard()) {
        saveBoardBtn.addEventListener('click', () => {
            console.log('Сохранение доски');
            saveBoard();
        });
    }
    
    // Полный экран
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', toggleFullscreen);
    }
    
    // Завершение урока
    const endLessonBtn = document.getElementById('endLessonBtn');
    if (endLessonBtn) {
        endLessonBtn.addEventListener('click', showEndLessonModal);
    }
    
    // Видео конференция
    const minimizeVideoBtn = document.getElementById('minimizeVideoBtn');
    const muteCallBtn = document.getElementById('muteCallBtn');
    const videoCallBtn = document.getElementById('videoCallBtn');
    
    if (minimizeVideoBtn) {
        minimizeVideoBtn.addEventListener('click', () => {
            const videoWindow = document.getElementById('videoConferenceWindow');
            if (videoWindow) {
                videoWindow.style.display = 'none';
            }
        });
    }
    
    if (muteCallBtn) {
        muteCallBtn.addEventListener('click', function() {
            this.classList.toggle('active');
            const icon = this.querySelector('i');
            if (icon) {
                icon.className = this.classList.contains('active') ? 'fas fa-microphone-slash' : 'fas fa-microphone';
            }
        });
    }
    
    if (videoCallBtn) {
        videoCallBtn.addEventListener('click', function() {
            this.classList.toggle('active');
            const icon = this.querySelector('i');
            if (icon) {
                icon.className = this.classList.contains('active') ? 'fas fa-video-slash' : 'fas fa-video';
            }
        });
    }
    
    // Закрытие модальных окон
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            if (modal) modal.style.display = 'none';
        });
    });
    
    // Кнопки управления панелями
    const propertiesToggleBtn = document.getElementById('propertiesToggleBtn');
    const closePropertiesBtn = document.getElementById('closePropertiesBtn');
    
    console.log('propertiesToggleBtn:', propertiesToggleBtn);
    console.log('closePropertiesBtn:', closePropertiesBtn);
    
    if (propertiesToggleBtn) {
        propertiesToggleBtn.addEventListener('click', toggleLeftPanel);
        console.log('Обработчик для propertiesToggleBtn добавлен');
    } else {
        console.error('Кнопка propertiesToggleBtn не найдена!');
    }
    
    if (closePropertiesBtn) {
        closePropertiesBtn.addEventListener('click', closeLeftPanel);
        console.log('Обработчик для closePropertiesBtn добавлен');
    } else {
        console.error('Кнопка closePropertiesBtn не найдена!');
    }
    
    // Горячие клавиши
    document.addEventListener('keydown', function(event) {
        // Горячие клавиши для инструментов
        if (!event.ctrlKey && !event.altKey && !event.metaKey) {
            switch(event.key.toLowerCase()) {
                case 'p':
                    selectTool('pen');
                    break;
                case 'h':
                    selectTool('highlighter');
                    break;
                case 'e':
                    selectTool('eraser');
                    break;
                case 't':
                    selectTool('text');
                    break;
                case 's':
                    selectTool('shape');
                    break;
                case 'l':
                    selectTool('laser');
                    break;
                case ' ':
                    event.preventDefault();
                    selectTool('hand');
                    break;
                case 'v':
                    selectTool('select');
                    break;
            }
        }
    });
    
    // Обновление списка слоёв
    updateLayersList();
    
    console.log('UI настроен!');
}

// Вспомогательные функции
function updateToolButtons(tool) {
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tool === tool) {
            btn.classList.add('active');
        }
    });
}

function updateLayersList() {
    if (!board) return;
    
    const layersPanel = document.getElementById('layersPanel');
    if (!layersPanel) return;
    
    layersPanel.innerHTML = '';
    
    board.layers.forEach((layer, id) => {
        const layerItem = document.createElement('div');
        layerItem.className = `layer-item ${id === board.activeLayerId ? 'active' : ''}`;
        layerItem.dataset.layer = id;
        
        layerItem.innerHTML = `
            <i class="fas fa-layer-group"></i>
            <span class="layer-name">${layer.name}</span>
            <div class="layer-controls">
                <button class="layer-visibility" onclick="toggleLayerVisibility('${id}')" title="Показать/скрыть">
                    <i class="fas fa-${layer.visible ? 'eye' : 'eye-slash'}"></i>
                </button>
                <button class="layer-menu" onclick="deleteLayer('${id}')" title="Удалить слой">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        layerItem.addEventListener('click', () => {
            board.setActiveLayer(id);
            updateLayersList();
        });
        
        layersPanel.appendChild(layerItem);
    });
}

function addNewLayer() {
    if (!board) return;
    
    const name = prompt('Введите название слоя:');
    if (name) {
        board.modules.layers.createLayer(name);
        updateLayersList();
    }
}

function toggleLayerVisibility(layerId) {
    if (!board) return;
    
    const layer = board.layers.get(layerId);
    if (layer) {
        layer.visible = !layer.visible;
        board.render();
        updateLayersList();
    }
}

function deleteLayer(layerId) {
    if (!board) return;
    
    if (confirm('Удалить слой?')) {
        board.modules.layers.deleteLayer(layerId);
        updateLayersList();
    }
}

function fitToContent() {
    if (!board) return;
    
    // Простая реализация - сброс зума
    board.zoomAt(board.canvas.width / 2, board.canvas.height / 2, 1);
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
}

function toggleVideo() {
    const videoWindow = document.getElementById('videoConferenceWindow');
    if (videoWindow) {
        videoWindow.style.display = videoWindow.style.display === 'none' ? 'block' : 'none';
    }
}

function showEndLessonModal() {
    const modal = document.getElementById('endLessonModal');
    if (modal) modal.style.display = 'flex';
}

function closeEndLessonModal() {
    const modal = document.getElementById('endLessonModal');
    if (modal) modal.style.display = 'none';
}

async function confirmEndLesson() {
    const saveBoard = document.getElementById('saveBoardOnEnd')?.checked || false;
    const exportPDF = document.getElementById('exportBoardOnEnd')?.checked || false;
    
    try {
        // Сохранение доски если нужно
        if (saveBoard && board) {
            await saveBoard();
        }
        
        // Экспорт в PDF если нужно
        if (exportPDF && board) {
            await exportBoard('png');
        }
        
        // Отключение от совместной работы
        if (board && board.modules.collaboration) {
            board.modules.collaboration.disconnect();
        }
        
        // Отправка запроса на завершение урока
        if (window.lessonData && window.lessonId !== 'demo') {
            const response = await fetch(`/api/lessons/${window.lessonId}/end`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    saveBoard: saveBoard,
                    boardContent: saveBoard && board ? await board.exportAs('json') : null
                })
            });
            
            if (response.ok) {
                showToast('Урок успешно завершён', 'success');
                setTimeout(() => {
                    window.location.href = '/dashboard';
                }, 1500);
            } else {
                showToast('Ошибка завершения урока', 'error');
            }
        } else {
            // Для демо режима просто переходим на главную
            window.location.href = '/dashboard';
        }
        
    } catch (error) {
        console.error('Ошибка при завершении урока:', error);
        showToast('Ошибка при завершении урока', 'error');
    }
}

async function saveBoard() {
    // Предотвращаем бесконечную рекурсию
    if (saveBoard._inProgress) {
        console.warn('Сохранение уже выполняется');
        return;
    }
    saveBoard._inProgress = true;
    
    try {
        const boardInstance = getBoard();
        if (!boardInstance) {
            console.error('Доска не инициализирована');
            showToast('Доска не инициализирована', 'error');
            return;
        }
        console.log('Начинаем сохранение доски...');
        
        // Получаем содержимое доски
        let content;
        if (boardInstance.exportAs && typeof boardInstance.exportAs === 'function') {
            content = await boardInstance.exportAs('json');
        } else {
            console.warn('Метод exportAs не доступен, используем пустое содержимое');
            content = { objects: [], version: '1.0' };
        }
        console.log('Содержимое доски получено:', content);
        
        // Получаем заголовок доски
        const title = document.getElementById('boardTitle')?.value || 'Новая доска';
        console.log('Заголовок доски:', title);
        
        const response = await fetch(`/api/board/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify({
                lessonId: (window.lessonId || 'demo'),
                content: content,
                title: title
            })
        });
        
        console.log('Ответ сервера:', response.status, response.statusText);
        
        if (response.ok) {
            const result = await response.json();
            console.log('Результат сохранения:', result);
            if (result.success) {
                showToast(result.message || 'Доска успешно сохранена', 'success');
            } else {
                showToast(result.message || 'Ошибка сохранения', 'error');
            }
        } else {
            const errorText = await response.text();
            console.error('Ошибка сервера:', errorText);
            showToast(`Ошибка сохранения: ${response.status}`, 'error');
        }
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showToast('Ошибка сохранения: ' + error.message, 'error');
    } finally {
        saveBoard._inProgress = false;
    }
}

async function exportBoard(format) {
    if (!board) return;
    
    try {
        const data = await board.exportAs(format);
        
        if (format === 'pdf') {
            // Создание PDF
            const blob = new Blob([data], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `board_${Date.now()}.pdf`;
            a.click();
            URL.revokeObjectURL(url);
        } else if (format === 'png') {
            // Создание PNG
            const url = data;
            const a = document.createElement('a');
            a.href = url;
            a.download = `board_${Date.now()}.png`;
            a.click();
        } else if (format === 'json') {
            // Создание JSON
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `board_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
        }
        
        showToast(`Экспорт в ${format.toUpperCase()} завершён`, 'success');
    } catch (error) {
        console.error('Ошибка экспорта:', error);
        showToast('Ошибка экспорта', 'error');
    }
}

function showToast(message, type = 'info') {
    // Создание контейнера для тостов если его нет
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <i class="material-icons-outlined">${getToastIcon(type)}</i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    // Анимация появления
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);
    
    // Автоматическое удаление
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

function getToastIcon(type) {
    switch (type) {
        case 'success': return 'check_circle';
        case 'error': return 'error';
        case 'warning': return 'warning';
        default: return 'info';
    }
}

// Обработка закрытия страницы
window.addEventListener('beforeunload', function(e) {
    const boardInstance = getBoard();
    const currentLessonId = window.lessonId;
    
    if (boardInstance && currentLessonId && currentLessonId !== 'demo') {
        // Предупреждение о несохранённых изменениях
        e.preventDefault();
        e.returnValue = '';
        
        // Отправляем сообщение о выходе пользователя
        if (webSocketConnected && window.stompClient) {
            try {
                const currentUserData = window.currentUser;
                const userId = currentUserData ? currentUserData.id : 1;
                const userName = currentUserData ? currentUserData.name : 'Пользователь';
                
                window.stompClient.send("/app/board/" + currentLessonId + "/leave", {}, JSON.stringify({
                    lessonId: currentLessonId,
                    userId: userId,
                    userName: userName
                }));
            } catch (error) {
                console.error('Ошибка отправки сообщения о выходе:', error);
            }
        }
    }
});

// Обработка видимости страницы
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        console.log('Страница скрыта');
    } else {
        console.log('Страница видна');
        // При возвращении на страницу проверяем подключение
        const currentLessonId = window.lessonId;
        if (currentLessonId && currentLessonId !== 'demo' && !webSocketConnected) {
            console.log('Повторное подключение к WebSocket...');
            connectWebSocket();
        }
    }
});

// Автосохранение (с проверкой на запуск сохранения)
setInterval(() => {
    const boardInstance = getBoard();
    const currentLessonId = window.lessonId;
    
    if (boardInstance && currentLessonId && currentLessonId !== 'demo' && !saveBoard._inProgress) {
        console.log('💾 Автосохранение...');
        saveBoard().catch(error => {
            console.error('Ошибка автосохранения:', error);
        });
    }
}, 30000); // Каждые 30 секунд

// Обновить индикатор синхронизации
function updateSyncIndicator(status, message) {
    const indicator = document.getElementById('syncIndicator');
    if (!indicator) return;
    
    const icon = indicator.querySelector('.sync-icon');
    const text = indicator.querySelector('.sync-text');
    
    if (status === 'connected') {
        indicator.className = 'sync-indicator connected';
        icon.textContent = '✅';
        text.textContent = message || 'Синхронизировано';
    } else if (status === 'connecting') {
        indicator.className = 'sync-indicator';
        icon.textContent = '🔄';
        text.textContent = message || 'Подключение...';
    } else if (status === 'disconnected') {
        indicator.className = 'sync-indicator disconnected';
        icon.textContent = '❌';
        text.textContent = message || 'Отключено';
    }
}

// Показать уведомление о пользователе
function showUserNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'user-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Удаляем уведомление через 3 секунды
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

// Показать уведомление о присоединении пользователя
function showUserJoined(userName) {
    showUserNotification(`👋 ${userName} присоединился к доске`);
    
    // Добавляем пользователя в список активных
    if (!window.activeUsers) {
        window.activeUsers = new Set();
    }
    window.activeUsers.add(userName);
    updateActiveUsersList();
}

// Показать уведомление о выходе пользователя
function showUserLeft(userName) {
    showUserNotification(`👋 ${userName} покинул доску`);
    
    // Удаляем пользователя из списка активных
    if (window.activeUsers) {
        window.activeUsers.delete(userName);
        updateActiveUsersList();
    }
    
    // Удаляем курсор пользователя
    removeRemoteCursor(userName);
}

// Обновить список активных пользователей
function updateActiveUsersList() {
    const usersList = document.getElementById('activeUsersList');
    if (!usersList) return;
    
    usersList.innerHTML = '';
    
    if (window.activeUsers && window.activeUsers.size > 0) {
        window.activeUsers.forEach(userName => {
            const userItem = document.createElement('div');
            userItem.className = 'active-user';
            userItem.innerHTML = `
                <span class="user-dot"></span>
                <span class="user-name">${userName}</span>
            `;
            usersList.appendChild(userItem);
        });
    } else {
        usersList.innerHTML = '<div class="no-users">Нет других пользователей</div>';
    }
}

// Обновить позицию курсора удаленного пользователя
function updateRemoteCursor(message) {
    if (!message.userName || !message.x || !message.y) return;
    
    // Создаем или обновляем курсор пользователя
    let cursor = document.getElementById(`cursor-${message.userName}`);
    if (!cursor) {
        cursor = document.createElement('div');
        cursor.id = `cursor-${message.userName}`;
        cursor.className = 'remote-cursor';
        cursor.innerHTML = `
            <div class="cursor-dot"></div>
            <div class="cursor-name">${message.userName}</div>
        `;
        document.body.appendChild(cursor);
    }
    
    // Обновляем позицию
    cursor.style.left = message.x + 'px';
    cursor.style.top = message.y + 'px';
    cursor.style.display = 'block';
    
    // Скрываем курсор через 3 секунды неактивности
    clearTimeout(cursor.hideTimeout);
    cursor.hideTimeout = setTimeout(() => {
        cursor.style.display = 'none';
    }, 3000);
}

// Удалить курсор удаленного пользователя
function removeRemoteCursor(userName) {
    const cursor = document.getElementById(`cursor-${userName}`);
    if (cursor) {
        cursor.remove();
    }
}

// ===== ФУНКЦИИ ДИАГНОСТИКИ =====

// Счетчики для логирования восстановления точек
let restoredPointsCount = 0;
let totalPointsToRestore = 0;
let restorationStartTime = 0;

// Функция для диагностики состояния доски и восстановления точек
window.diagnoseBoardRestoration = function() {
    console.log('🔍 === ДИАГНОСТИКА ВОССТАНОВЛЕНИЯ ДОСКИ ===');
    
    console.log('📊 Статистика восстановления:');
    console.log(`  - Всего точек для восстановления: ${totalPointsToRestore}`);
    console.log(`  - Восстановлено точек: ${restoredPointsCount}`);
    console.log(`  - Время последнего восстановления: ${restorationStartTime ? Date.now() - restorationStartTime + 'ms назад' : 'не выполнялось'}`);
    
    console.log('🎨 Состояние Canvas:');
    console.log(`  - Canvas готов: ${!!(board && board.canvas)}`);
    console.log(`  - Размеры canvas: ${board && board.canvas ? board.canvas.width + 'x' + board.canvas.height : 'N/A'}`);
    
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
    console.log(`  - Подключен: ${webSocketConnected}`);
    console.log(`  - StompClient: ${!!window.stompClient}`);
    console.log(`  - StompClient.connected: ${window.stompClient ? window.stompClient.connected : 'N/A'}`);
    
    console.log('📚 Данные урока:');
    console.log(`  - ID урока: ${window.lessonId}`);
    console.log(`  - Текущий пользователь: ${window.currentUser ? window.currentUser.name : 'N/A'}`);
    console.log(`  - Учитель: ${window.isTeacher}`);
    console.log(`  - Админ: ${window.isAdmin}`);
    
    // Проверяем, есть ли точки в базе данных
    if (window.lessonId && window.lessonId !== 'demo') {
        fetch(`/api/board/state/${window.lessonId}`)
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

// Удалена дублирующаяся функция fullSystemDiagnostic - используется версия из online-lesson.js

// Функция для принудительной инициализации доски
window.forceInitializeBoard = function() {
    console.log('🚀 === ПРИНУДИТЕЛЬНАЯ ИНИЦИАЛИЗАЦИЯ ДОСКИ ===');
    
    try {
        const canvas = document.getElementById('boardCanvas');
        if (!canvas) {
            console.error('❌ Canvas не найден!');
            return false;
        }
        
        console.log('✅ Canvas найден:', canvas);
        console.log('  - Размеры:', canvas.offsetWidth, 'x', canvas.offsetHeight);
        console.log('  - В DOM:', canvas.isConnected);
        console.log('  - Display:', getComputedStyle(canvas).display);
        
        // Проверяем доступность класса ProfessionalBoard
        if (typeof ProfessionalBoard === 'undefined') {
            console.error('❌ Класс ProfessionalBoard недоступен!');
            return false;
        }
        
        // Создаем доску если её нет
        if (!_realBoardInstance) {
            console.log('🎨 Создаем новую доску...');
            try {
                const newBoard = new ProfessionalBoard('boardCanvas', {
                    renderer: 'canvas2d',
                    antialiasing: true,
                    gridEnabled: true,
                    gridSize: 20,
                    snapToGrid: false,
                    virtualScrolling: true,
                    maxHistorySize: 50
                });
                
                console.log('✅ Доска создана:', !!newBoard);
                
                // Устанавливаем реальный экземпляр доски
                setRealBoardInstance(newBoard);
                window.professionalBoardInstance = newBoard;
                
            } catch (error) {
                console.error('❌ Ошибка создания доски:', error);
                return false;
            }
        } else {
            console.log('✅ Доска уже существует');
        }
        
        const boardInstance = getBoard();
        if (boardInstance) {
            console.log('🔧 Доска найдена, проверяем состояние...');
            console.log('  - Canvas:', !!boardInstance.canvas);
            console.log('  - Modules:', Object.keys(boardInstance.modules || {}));
            console.log('  - Renderer:', !!boardInstance.modules?.renderer);
            
            // Принудительно рендерим
            if (boardInstance.modules?.renderer) {
                console.log('🎨 Принудительно рендерим...');
                boardInstance.render();
            } else {
                console.warn('⚠️ Рендерер недоступен');
            }
        } else {
            console.error('❌ Доска не найдена после создания');
            return false;
        }
        
        console.log('✅ Принудительная инициализация завершена');
        return true;
        
    } catch (error) {
        console.error('❌ Ошибка принудительной инициализации:', error);
        console.error('Stack trace:', error.stack);
        return false;
    }
};

// Функция для проверки и создания сессии
window.checkAndCreateSession = async function() {
    console.log('🔍 === ПРОВЕРКА И СОЗДАНИЕ СЕССИИ ===');
    
    // Проверяем наличие lessonId из разных источников
    const actualLessonId = window.lessonId || 
                           (window.lessonData && window.lessonData.id) || 
                           (window.lessonData && window.lessonData.id) ||
                           new URLSearchParams(window.location.search).get('lessonId');
    
    console.log('📋 Поиск ID урока для создания сессии:');
    console.log('  - window.lessonId:', window.lessonId);
    console.log('  - window.lessonData.id:', window.lessonData?.id);
    console.log('  - lessonData.id:', window.lessonData?.id);
    console.log('  - из URL:', new URLSearchParams(window.location.search).get('lessonId'));
    console.log('  - итоговый actualLessonId:', actualLessonId);
    
    if (!actualLessonId || actualLessonId === 'demo') {
        console.error('❌ Нет данных урока для создания сессии (lessonId:', actualLessonId, ')');
        showToast('Нет данных урока для создания сессии', 'error');
        return false;
    }
    
    console.log('📋 Данные для создания сессии:');
    console.log('  - lessonId:', actualLessonId);
    console.log('  - window.currentUser:', window.currentUser);
    console.log('  - currentUser:', window.currentUser);
    console.log('  - window.lessonData:', window.lessonData);
    console.log('  - lessonData:', window.lessonData);
    
    // Проверяем, есть ли сессия
    const currentLessonData = window.lessonData;
    if (!currentLessonData || !currentLessonData.session) {
        console.log('📝 Создаем новую сессию для урока...');
        try {
            const response = await fetch(`/api/lessons/${actualLessonId}/create-session`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: window.currentUser?.id || 1,
                    userName: window.currentUser?.name || 'Пользователь'
                })
            });
            
            const data = await response.json();
            if (data.success) {
                console.log('✅ Сессия создана успешно:', data.session);
                // Обновляем все ссылки на данные урока
                if (window.lessonData) window.lessonData.session = data.session;
                if (window.lessonData) window.lessonData.session = data.session;
                return true;
            } else {
                console.error('❌ Ошибка создания сессии:', data.message);
                showToast('Ошибка создания сессии: ' + data.message, 'error');
                return false;
            }
        } catch (error) {
            console.error('❌ Ошибка создания сессии:', error || 'Неизвестная ошибка');
            showToast('Ошибка создания сессии: ' + (error?.message || error || 'Неизвестная ошибка'), 'error');
            return false;
        }
    } else {
        console.log('✅ Сессия уже существует:', currentLessonData.session);
        return true;
    }
};

// Функция для принудительного пересоздания сессии
window.recreateSession = async function() {
    console.log('🔄 === ПЕРЕСОЗДАНИЕ СЕССИИ ===');
    
    // Получаем ID урока из разных источников
    const actualLessonId = window.lessonId || 
                           (window.lessonData && window.lessonData.id) || 
                           (window.lessonData && window.lessonData.id) ||
                           new URLSearchParams(window.location.search).get('lessonId');
    
    console.log('📋 Поиск ID урока:');
    console.log('  - window.lessonId:', window.lessonId);
    console.log('  - window.lessonData.id:', window.lessonData?.id);
    console.log('  - lessonData.id:', window.lessonData?.id);
    console.log('  - из URL:', new URLSearchParams(window.location.search).get('lessonId'));
    console.log('  - итоговый actualLessonId:', actualLessonId);
    
    if (!actualLessonId || actualLessonId === 'demo') {
        console.error('❌ Нет данных урока для пересоздания сессии');
        showToast('Нет данных урока для пересоздания сессии', 'error');
        return false;
    }
    
    try {
        // Удаляем старую сессию
        const currentLessonData = window.lessonData;
        if (currentLessonData && currentLessonData.session) {
            console.log('🗑️ Удаляем старую сессию...');
            try {
                await fetch(`/api/lessons/${actualLessonId}/delete-session`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                console.log('🗑️ Старая сессия удалена');
            } catch (deleteError) {
                console.warn('⚠️ Ошибка удаления старой сессии:', deleteError);
            }
        }
        
        // Создаем новую сессию
        console.log('🆕 Создаем новую сессию...');
        const response = await fetch(`/api/lessons/${actualLessonId}/create-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: (window.currentUser || currentUser)?.id || 1,
                userName: (window.currentUser || currentUser)?.name || 'Пользователь'
            })
        });
        
        const data = await response.json();
        if (data.success) {
            console.log('✅ Сессия пересоздана успешно:', data.session);
            // Обновляем все ссылки на данные урока
            if (window.lessonData) window.lessonData.session = data.session;
            if (lessonData) lessonData.session = data.session;
            return true;
        } else {
            console.error('❌ Ошибка пересоздания сессии:', data.message);
            showToast('Ошибка пересоздания сессии: ' + data.message, 'error');
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
    
    const actualLessonId = window.lessonId;
    if (!actualLessonId || actualLessonId === 'demo') {
        console.error('❌ Нет данных урока для восстановления');
        return false;
    }
    
    // Сначала диагностируем текущее состояние
    window.diagnoseBoardRestoration();
    
    // Очищаем доску
    if (board && board.canvas) {
        const ctx = board.canvas.getContext('2d');
        ctx.clearRect(0, 0, board.canvas.width, board.canvas.height);
        console.log('🧹 Доска очищена для восстановления');
    }
    
    // Загружаем состояние через REST API
    try {
        console.log('🌐 Загружаем состояние через REST API...');
        const response = await fetch(`/api/board/state/${actualLessonId}`);
        const data = await response.json();
        
        if (data.success && data.operations && data.operations.length > 0) {
            console.log(`📥 Получено ${data.operations.length} операций из БД`);
            
            // Восстанавливаем операции
            data.operations.forEach((operation, index) => {
                if (operation && operation.operationType) {
                    // Здесь нужно вызвать функцию восстановления из board
                    if (board && board.restoreOperation) {
                        board.restoreOperation(operation);
                    }
                    
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

// Инициализация обработчиков диагностики
document.addEventListener('DOMContentLoaded', function() {
    // Кнопка диагностики
    const diagnoseBtn = document.getElementById('diagnoseBtn');
    if (diagnoseBtn) {
        diagnoseBtn.addEventListener('click', function() {
            console.log('🔍 Запуск диагностики восстановления доски...');
            
            // Проверяем наличие функции диагностики
            if (typeof window.diagnoseBoardRestoration === 'function') {
                window.diagnoseBoardRestoration();
            } else {
                console.log('⚠️ Функция diagnoseBoardRestoration не найдена');
                console.log('🔍 === БАЗОВАЯ ДИАГНОСТИКА ===');
                console.log('🎨 board:', !!getBoard());
                console.log('📚 lessonData:', !!window.lessonData);
                console.log('🔌 WebSocket:', !!window.stompClient);
            }
            
            showToast('Диагностика выполнена, смотрите консоль', 'info');
        });
    }
    
    // Кнопка полной диагностики
    const fullDiagnoseBtn = document.getElementById('fullDiagnoseBtn');
    if (fullDiagnoseBtn) {
        fullDiagnoseBtn.addEventListener('click', async function() {
            console.log('🔬 Запуск полной диагностики системы...');
            
            // Проверяем наличие функции диагностики
            if (typeof window.fullSystemDiagnostic === 'function') {
                await window.fullSystemDiagnostic();
            } else {
                // Fallback диагностика для Professional Board
                console.log('🔬 === ДИАГНОСТИКА PROFESSIONAL BOARD ===');
                console.log('🌐 URL:', window.location.href);
                console.log('📚 lessonData:', !!window.lessonData);
                console.log('👤 currentUser:', !!window.currentUser);
                const boardInstance = getBoard();
                console.log('🎨 board:', !!boardInstance);
                if (boardInstance) {
                    console.log('  - canvas:', !!boardInstance.canvas);
                    console.log('  - размеры:', boardInstance.canvas?.width, 'x', boardInstance.canvas?.height);
                    console.log('  - renderer:', !!boardInstance.modules?.renderer);
                    console.log('  - config:', boardInstance.config);
                }
                console.log('🔌 WebSocket:', !!window.stompClient);
                console.log('🔬 === КОНЕЦ ДИАГНОСТИКИ ===');
            }
            
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
                if (window.stompClient) {
                    window.stompClient.disconnect();
                }
                setTimeout(() => {
                    connectWebSocket();
                }, 1000);
            } else {
                showToast('Ошибка пересоздания сессии', 'error');
            }
        });
    }
    
    // Кнопка принудительного восстановления
    const forceRestoreBtn = document.getElementById('forceRestoreBtn');
    if (forceRestoreBtn) {
        forceRestoreBtn.addEventListener('click', async function() {
            console.log('🔄 Принудительное восстановление состояния доски...');
            showToast('Восстанавливаем состояние доски...', 'info');
            const result = await forceRestoreBoardState();
            if (result) {
                showToast('Состояние доски восстановлено успешно', 'success');
            } else {
                showToast('Не удалось восстановить состояние доски', 'error');
            }
        });
    }
    
    // Кнопка тестирования соединения
    const testConnectionBtn = document.getElementById('testConnectionBtn');
    if (testConnectionBtn) {
        testConnectionBtn.addEventListener('click', async function() {
            console.log('🔍 Тестирование соединения...');
            showToast('Тестируем соединение...', 'info');
            
            try {
                // Тестируем REST API
                const response = await fetch(`/api/board/test-db`);
                const data = await response.json();
                
                if (data.success) {
                    showToast('Соединение с сервером работает', 'success');
                    console.log('Тест соединения:', data);
                } else {
                    showToast('Ошибка соединения с сервером', 'error');
                }
            } catch (error) {
                showToast('Ошибка тестирования соединения: ' + error.message, 'error');
            }
        });
    }
    
    // Кнопка тестирования доски
    const testBoardBtn = document.getElementById('testBoardBtn');
    if (testBoardBtn) {
        testBoardBtn.addEventListener('click', function() {
            console.log('🧪 Тестирование доски...');
            showToast('Тестируем доску...', 'info');
            
            // Проверяем, что доска инициализирована
            const boardInstance = getBoard();
            if (!boardInstance) {
                console.error('❌ Доска не инициализирована!');
                showToast('Доска не инициализирована!', 'error');
                
                // Попытка принудительной инициализации
                if (typeof window.forceInitializeBoard === 'function') {
                    console.log('🔄 Попытка принудительной инициализации...');
                    const success = window.forceInitializeBoard();
                    if (success) {
                        showToast('Доска инициализирована принудительно!', 'success');
                    } else {
                        showToast('Не удалось инициализировать доску', 'error');
                    }
                }
                return;
            }
            
            // Тестируем функции доски
            console.log('✅ Доска найдена:', boardInstance);
            console.log('✅ Canvas:', !!boardInstance.canvas);
            console.log('✅ Модули:', Object.keys(boardInstance.modules || {}));
            
            // Проверяем canvas
            if (boardInstance.canvas) {
                const ctx = boardInstance.canvas.getContext('2d');
                if (ctx) {
                    // Рисуем тестовую линию
                    ctx.strokeStyle = '#ff0000';
                    ctx.lineWidth = 5;
                    ctx.beginPath();
                    ctx.moveTo(50, 50);
                    ctx.lineTo(150, 150);
                    ctx.stroke();
                    
                    // Рисуем тестовый круг
                    ctx.strokeStyle = '#00ff00';
                    ctx.beginPath();
                    ctx.arc(200, 100, 30, 0, 2 * Math.PI);
                    ctx.stroke();
                    
                    console.log('✅ Тестовые фигуры нарисованы!');
                    showToast('Тест доски прошел успешно! Нарисованы тестовые фигуры.', 'success');
                } else {
                    console.error('❌ Не удалось получить контекст canvas');
                    showToast('Ошибка: нет доступа к контексту canvas', 'error');
                }
            } else {
                console.error('❌ Canvas не найден в доске');
                showToast('Ошибка: canvas не найден', 'error');
            }
        });
    }
    
    // Показываем подсказку о новых функциях при загрузке
    setTimeout(() => {
        console.log('💡 Подсказки по отладке:');
        console.log('  - Нажмите кнопку 🐛 для диагностики восстановления');
        console.log('  - Нажмите кнопку 🔬 для полной диагностики системы');
        console.log('  - Нажмите кнопку 🔄 для пересоздания сессии');
        console.log('  - Нажмите кнопку 🎨 для тестирования доски');
        console.log('  - В консоли доступны функции:');
        console.log('    * window.diagnoseBoardRestoration() - диагностика восстановления');
        console.log('    * window.fullSystemDiagnostic() - полная диагностика');
        console.log('    * window.forceRestoreWithLogging() - принудительное восстановление');
        console.log('    * window.checkAndCreateSession() - проверка/создание сессии');
        console.log('    * window.recreateSession() - пересоздание сессии');
    }, 2000);
});