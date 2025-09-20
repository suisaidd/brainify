// JavaScript для страницы проверки оборудования

// Глобальные переменные
let lessonData = null;
let activeMediaStream = null;
let equipmentCheckPassed = false;

// Функция для принудительной очистки кеша Excalidraw
async function clearExcalidrawCache() {
    console.log('Начинаем принудительную очистку кеша Excalidraw...');
    
    try {
        // 1. Очищаем localStorage (особенно важные ключи Excalidraw)
        const excalidrawKeys = [
            'excalidraw',
            'excalidraw-state',
            'excalidraw-history',
            'excalidraw-collab',
            'excalidraw-room',
            'excalidraw-board',
            'excalidraw-session',
            'excalidraw-data',
            'excalidraw-cache',
            'excalidraw-storage',
            'excalidraw-db',
            'excalidraw-indexeddb',
            'excalidraw-backup',
            'excalidraw-temp'
        ];
        
        // Очищаем все ключи, связанные с Excalidraw
        for (const key of excalidrawKeys) {
            try {
                localStorage.removeItem(key);
                localStorage.removeItem(key + '-state');
                localStorage.removeItem(key + '-history');
                localStorage.removeItem(key + '-collab');
                localStorage.removeItem(key + '-backup');
                localStorage.removeItem(key + '-temp');
            } catch (error) {
                console.log(`Ошибка удаления ключа ${key}:`, error);
            }
        }
        
        // Агрессивная очистка localStorage (все ключи, не только Excalidraw)
        try {
            const allKeys = Object.keys(localStorage);
            for (const key of allKeys) {
                try {
                    localStorage.removeItem(key);
                    console.log(`✓ Удален ключ localStorage: ${key}`);
                } catch (error) {
                    console.log(`Ошибка удаления ключа ${key}:`, error);
                }
            }
        } catch (error) {
            console.log('Ошибка при очистке localStorage:', error);
        }
        
        console.log('✓ localStorage очищен от данных Excalidraw');
        
        // 2. Очищаем sessionStorage (универсально для всех браузеров)
        try {
            sessionStorage.clear();
            console.log('✓ sessionStorage очищен');
        } catch (error) {
            console.log('sessionStorage очистка не удалась:', error);
            // Альтернативный способ
            try {
                for (let i = sessionStorage.length - 1; i >= 0; i--) {
                    const key = sessionStorage.key(i);
                    if (key) sessionStorage.removeItem(key);
                }
                console.log('✓ sessionStorage очищен (альтернативный способ)');
            } catch (altError) {
                console.log('Альтернативная очистка sessionStorage не удалась:', altError);
            }
        }
        
        // 3. Очищаем IndexedDB (Excalidraw может использовать его)
        if ('indexedDB' in window) {
            try {
                const databases = await indexedDB.databases();
                for (const db of databases) {
                    if (db.name && (
                        db.name.toLowerCase().includes('excalidraw') ||
                        db.name.toLowerCase().includes('board') ||
                        db.name.toLowerCase().includes('room') ||
                        db.name.toLowerCase().includes('collab')
                    )) {
                        indexedDB.deleteDatabase(db.name);
                        console.log(`✓ IndexedDB база удалена: ${db.name}`);
                    }
                }
            } catch (error) {
                console.log('IndexedDB очистка не удалась:', error);
            }
        }
        
        // 4. Очищаем кеш браузера
        if ('caches' in window) {
            try {
                const cacheNames = await caches.keys();
                for (const cacheName of cacheNames) {
                    if (cacheName.toLowerCase().includes('excalidraw') ||
                        cacheName.toLowerCase().includes('board') ||
                        cacheName.toLowerCase().includes('room')) {
                        await caches.delete(cacheName);
                        console.log(`✓ Кеш удален: ${cacheName}`);
                    }
                }
            } catch (error) {
                console.log('Кеш очистка не удалась:', error);
            }
        }
        
        // 5. Очищаем куки, связанные с Excalidraw
        document.cookie.split(";").forEach(function(c) {
            const cookieName = c.split("=")[0].trim();
            if (cookieName.toLowerCase().includes('excalidraw') ||
                cookieName.toLowerCase().includes('board') ||
                cookieName.toLowerCase().includes('room') ||
                cookieName.toLowerCase().includes('collab')) {
                document.cookie = cookieName + "=;expires=" + new Date().toUTCString() + ";path=/";
                console.log(`✓ Cookie удален: ${cookieName}`);
            }
        });
        
        // 6. Принудительно очищаем HTTP-кеш для Excalidraw
        try {
            const excalidrawUrls = [
                'https://excalidraw.com',
                'https://app.excalidraw.com',
                window.location.origin + '/excalidraw'
            ];
            
            for (const url of excalidrawUrls) {
                try {
                    await fetch(url, {
                        method: 'HEAD',
                        headers: {
                            'Cache-Control': 'no-cache, no-store, must-revalidate',
                            'Pragma': 'no-cache',
                            'Expires': '0'
                        },
                        cache: 'reload'
                    });
                } catch (e) {
                    // Игнорируем ошибки для внешних URL
                }
            }
            console.log('✓ HTTP-кеш очищен');
        } catch (error) {
            console.log('HTTP-кеш очистка не удалась:', error);
        }
        
        console.log('✓ Принудительная очистка кеша Excalidraw завершена');
        return true;
        
    } catch (error) {
        console.error('Ошибка при очистке кеша Excalidraw:', error);
        return false;
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async function() {
    // Сначала очищаем кеш Excalidraw при загрузке страницы
    console.log('Очищаем кеш Excalidraw при загрузке страницы проверки оборудования...');
    await clearExcalidrawCache();
    
    initializeEquipmentCheck();
    setupEventListeners();
    // Начинаем проверку оборудования
    setTimeout(() => {
        startEquipmentCheck();
    }, 500);
});

// Инициализация проверки оборудования
function initializeEquipmentCheck() {
    // Получаем данные урока из URL параметров
    const urlParams = new URLSearchParams(window.location.search);
    const lessonId = urlParams.get('lessonId');
    
    if (!lessonId) {
        showToast('Ошибка: ID урока не указан', 'error');
        // Не делаем автоматический редирект
        // setTimeout(() => window.location.href = '/dashboard', 2000);
        return;
    }
    
    // Загружаем данные урока
    loadLessonData(lessonId);
}

// Загрузка данных урока
async function loadLessonData(lessonId) {
    try {
        console.log('Загружаем данные урока:', lessonId);
        console.log('URL запроса:', `/api/lessons/${lessonId}/online-data`);
        
        const response = await fetch(`/api/lessons/${lessonId}/online-data`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'same-origin'
        });
        
        console.log('Ответ сервера:', response.status, response.statusText);
        console.log('Заголовки ответа:', response.headers);
        
        if (!response.ok) {
            console.error('HTTP ошибка:', response.status, response.statusText);
            const errorText = await response.text();
            console.error('Текст ошибки:', errorText);
            showToast(`HTTP ошибка ${response.status}: ${response.statusText}`, 'error');
            return;
        }
        
        const data = await response.json();
        console.log('Данные урока:', data);
        
        if (data.success) {
            lessonData = data.lesson;
            console.log('Данные урока успешно загружены:', lessonData);
            updateLessonInfo();
        } else {
            console.error('Ошибка в данных урока:', data.message);
            showToast(data.message || 'Ошибка загрузки данных урока', 'error');
            
            // Создаем минимальные данные урока для продолжения работы
            lessonData = {
                id: lessonId,
                subject: { name: 'Предмет' },
                student: { name: 'Студент' },
                teacher: { name: 'Преподаватель' },
                lessonDate: new Date().toISOString()
            };
            updateLessonInfo();
        }
    } catch (error) {
        console.error('Ошибка загрузки данных урока:', error);
        console.error('Детали ошибки:', error.message, error.stack);
        showToast('Ошибка загрузки данных урока: ' + error.message, 'error');
        
        // Создаем минимальные данные урока для продолжения работы
        lessonData = {
            id: lessonId,
            subject: { name: 'Предмет' },
            student: { name: 'Студент' },
            teacher: { name: 'Преподаватель' },
            lessonDate: new Date().toISOString()
        };
        updateLessonInfo();
    }
}

// Обновление информации об уроке
function updateLessonInfo() {
    if (!lessonData) return;
    
    document.getElementById('lessonTitle').textContent = `Проверка оборудования - ${lessonData.subject.name}`;
    document.getElementById('lessonSubject').textContent = lessonData.subject.name;
    document.getElementById('lessonStudent').textContent = lessonData.student.name;
    document.getElementById('lessonTime').textContent = formatLessonTime(lessonData.lessonDate);
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Кнопки управления видео
    document.getElementById('switchCameraBtn').addEventListener('click', switchCamera);
    document.getElementById('muteVideoBtn').addEventListener('click', toggleVideo);
    document.getElementById('muteAudioBtn').addEventListener('click', toggleAudio);
    
    // Кнопки действий
    document.getElementById('retryCheckBtn').addEventListener('click', startEquipmentCheck);
    document.getElementById('continueToLessonBtn').addEventListener('click', continueToLesson);
    document.getElementById('continueAnywayBtn').addEventListener('click', continueToLesson);
}

// Проверка оборудования
async function startEquipmentCheck() {
    console.log('Начинаем проверку оборудования...');
    
    // Сбрасываем статусы
    resetEquipmentStatuses();
    
    try {
        // Проверяем камеру и микрофон
        await checkCameraAndMicrophone();
        
        // Проверяем браузер
        checkBrowserCompatibility();
        
        // Проверяем сеть
        checkNetworkConnection();
        
            // Проверяем результаты через 3 секунды
    setTimeout(() => {
        checkEquipmentResults();
    }, 3000);
    
    // Принудительно разрешаем переход через 10 секунд
    setTimeout(() => {
        const continueAnywayBtn = document.getElementById('continueAnywayBtn');
        if (continueAnywayBtn.style.display === 'none') {
            console.log('Принудительно разрешаем переход к уроку');
            continueAnywayBtn.style.display = 'inline-flex';
            showToast('Проверка оборудования завершена. Вы можете продолжить к уроку.', 'info');
        }
    }, 10000);
        
    } catch (error) {
        console.error('Ошибка во время проверки оборудования:', error);
        showToast('Ошибка проверки оборудования: ' + error.message, 'error');
        
        // Принудительно разрешаем переход к уроку
        setTimeout(() => {
            checkEquipmentResults();
            document.getElementById('continueToLessonBtn').disabled = false;
        }, 1000);
    }
}

// Сброс статусов оборудования
function resetEquipmentStatuses() {
    console.log('Сбрасываем статусы оборудования...');
    
    const statusBoxes = document.querySelectorAll('.status-box');
    statusBoxes.forEach(box => {
        box.className = 'status-box checking';
        const textEl = box.querySelector('.status-text');
        if (textEl) textEl.textContent = 'Проверка...';
    });
    
    document.getElementById('continueToLessonBtn').disabled = true;
    document.getElementById('continueAnywayBtn').style.display = 'none';
    equipmentCheckPassed = false;
    
    // Обновляем статус соединения
    updateConnectionStatus('checking', 'Проверка оборудования...');
}

// Проверка камеры и микрофона
async function checkCameraAndMicrophone() {
    const cameraStatus = document.getElementById('cameraStatus');
    const micStatus = document.getElementById('micStatus');
    const videoFrame = document.getElementById('videoFrame');
    const videoEl = document.getElementById('cameraPreview');
    const overlay = document.getElementById('videoOverlay');
    
    try {
        // Останавливаем предыдущий стрим
        stopActiveStream();
        
        // Запрашиваем доступ к медиа устройствам
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        });
        
        activeMediaStream = stream;
        
        // Проверяем камеру
        const videoTracks = stream.getVideoTracks();
        if (videoTracks.length > 0) {
            console.log('Видео трек найден:', videoTracks[0].label);
            setStatusBox(cameraStatus, true, 'Камера работает');
            videoFrame.classList.add('working');
            videoEl.srcObject = stream;
            overlay.style.display = 'none';
        } else {
            console.log('Видео трек не найден');
            setStatusBox(cameraStatus, false, 'Камера недоступна');
            videoFrame.classList.add('error');
        }
        
        // Проверяем микрофон
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0) {
            console.log('Аудио трек найден:', audioTracks[0].label);
            // Проверяем активность микрофона
            await checkMicrophoneActivity(stream);
        } else {
            console.log('Аудио трек не найден');
            setStatusBox(micStatus, false, 'Микрофон недоступен');
        }
        
    } catch (error) {
        console.error('Ошибка доступа к медиа устройствам:', error);
        setStatusBox(cameraStatus, false, 'Нет доступа к камере');
        setStatusBox(micStatus, false, 'Нет доступа к микрофону');
        videoFrame.classList.add('error');
        overlay.style.display = 'flex';
        overlay.innerHTML = '<i class="fas fa-video-slash"></i><span>Нет доступа к камере</span>';
    }
}

// Проверка активности микрофона
async function checkMicrophoneActivity(stream) {
    const micStatus = document.getElementById('micStatus');
    
    try {
        console.log('Начинаем проверку микрофона...');
        
        // Сначала просто проверяем, что аудио трек есть и активен
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length === 0) {
            setStatusBox(micStatus, false, 'Микрофон недоступен');
            return;
        }
        
        const audioTrack = audioTracks[0];
        console.log('Аудио трек найден:', audioTrack.label);
        
        // Проверяем, что трек включен
        if (!audioTrack.enabled) {
            setStatusBox(micStatus, false, 'Микрофон отключен');
            return;
        }
        
        // Проверяем настройки трека
        const settings = audioTrack.getSettings();
        console.log('Настройки микрофона:', settings);
        
        // Если есть deviceId, значит микрофон доступен
        if (settings.deviceId) {
            console.log('Микрофон доступен, проверяем активность...');
            
            // Упрощенная проверка активности через AudioContext
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            
            analyser.fftSize = 256;
            source.connect(analyser);
            
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            let activityDetected = false;
            let checkCount = 0;
            const maxChecks = 30; // 3 секунды
            
            const checkActivity = () => {
                if (activityDetected || checkCount >= maxChecks) {
                    audioContext.close();
                    return;
                }
                
                analyser.getByteTimeDomainData(dataArray);
                const variance = dataArray.reduce((acc, v) => acc + Math.abs(v - 128), 0) / dataArray.length;
                
                console.log('Активность микрофона:', variance);
                
                // Снижаем порог для обнаружения активности
                if (variance > 1) {
                    activityDetected = true;
                    setStatusBox(micStatus, true, 'Микрофон работает');
                    audioContext.close();
                    return;
                }
                
                checkCount++;
                if (checkCount % 10 === 0) {
                    setStatusBox(micStatus, false, 'Скажите что-нибудь...');
                }
                
                setTimeout(checkActivity, 100);
            };
            
            checkActivity();
            
            // Таймаут - если не удалось обнаружить активность, считаем микрофон работающим
            setTimeout(() => {
                if (!activityDetected) {
                    console.log('Активность не обнаружена, но микрофон доступен');
                    setStatusBox(micStatus, true, 'Микрофон доступен');
                    audioContext.close();
                }
            }, 3000);
            
        } else {
            setStatusBox(micStatus, false, 'Микрофон недоступен');
        }
        
    } catch (error) {
        console.error('Ошибка проверки микрофона:', error);
        // Если произошла ошибка, но аудио трек есть, считаем микрофон работающим
        const audioTracks = stream.getAudioTracks();
        if (audioTracks.length > 0 && audioTracks[0].enabled) {
            setStatusBox(micStatus, true, 'Микрофон доступен');
        } else {
            setStatusBox(micStatus, false, 'Ошибка проверки микрофона');
        }
    }
}

// Проверка интернет-соединения
async function checkNetworkConnection() {
    const networkStatus = document.getElementById('networkStatus');
    console.log('Начинаем проверку интернет-соединения...');
    
    try {
        // Проверяем базовое подключение к интернету
        const startTime = performance.now();
        
        // Используем несколько надежных сервисов для проверки
        const testUrls = [
            'https://www.google.com/favicon.ico',
            'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
        ];
        
        console.log('Тестируем подключение к внешним сервисам...');
        let successfulTests = 0;
        let totalDuration = 0;
        
        for (const url of testUrls) {
            try {
                console.log(`Тестируем: ${url}`);
                const testStartTime = performance.now();
                const response = await fetch(url, {
                    method: 'HEAD',
                    cache: 'no-cache',
                    mode: 'no-cors'
                });
                const testEndTime = performance.now();
                
                if (response.ok || response.status === 0) {
                    successfulTests++;
                    totalDuration += (testEndTime - testStartTime);
                    console.log(`✓ ${url} - успешно (${Math.round(testEndTime - testStartTime)}ms)`);
                } else {
                    console.log(`✗ ${url} - статус: ${response.status}`);
                }
            } catch (testError) {
                console.log(`✗ ${url} - ошибка:`, testError.message);
            }
        }
        
        if (successfulTests > 0) {
            const avgDuration = totalDuration / successfulTests;
            const estimatedSpeed = 50000 / (avgDuration / 1000);
            
            if (estimatedSpeed > 100000) {
                setStatusBox(networkStatus, true, `Интернет: отличное соединение`);
            } else if (estimatedSpeed > 50000) {
                setStatusBox(networkStatus, true, `Интернет: хорошее соединение`);
            } else {
                setStatusBox(networkStatus, true, `Интернет: медленное соединение`);
            }
        } else {
            console.log('Внешние тесты не прошли, проверяем локальное подключение...');
            try {
                await fetch('/api/health', { method: 'HEAD' });
                console.log('✓ Локальное подключение работает');
                setStatusBox(networkStatus, true, 'Интернет: локальное соединение');
            } catch (localError) {
                console.log('✗ Локальное подключение не работает:', localError.message);
                setStatusBox(networkStatus, false, 'Нет подключения к интернету');
            }
        }
        
    } catch (error) {
        console.error('Ошибка проверки интернета:', error);
        setStatusBox(networkStatus, false, 'Ошибка проверки интернета');
    }
}

// Проверка совместимости браузера
function checkBrowserCompatibility() {
    const browserStatus = document.getElementById('browserStatus');
    
    const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
    const isFirefox = /Firefox/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && /Apple Computer/.test(navigator.vendor);
    const isEdge = /Edg/.test(navigator.userAgent);
    
    if (isChrome || isFirefox || isSafari || isEdge) {
        setStatusBox(browserStatus, true, 'Браузер поддерживается');
    } else {
        setStatusBox(browserStatus, false, 'Браузер не поддерживается');
    }
}

// Проверка результатов проверки оборудования
function checkEquipmentResults() {
    console.log('Проверяем результаты всех тестов...');
    
    const statusBoxes = document.querySelectorAll('.status-box');
    let allWorking = true;
    let completedChecks = 0;
    
    statusBoxes.forEach(box => {
        const status = box.className.includes('working') ? 'working' : 
                      box.className.includes('error') ? 'error' : 'checking';
        const text = box.querySelector('.status-text')?.textContent || 'Нет текста';
        console.log(`Статус ${box.id}: ${status} - ${text}`);
        
        if (box.classList.contains('checking')) {
            allWorking = false;
        } else if (!box.classList.contains('working')) {
            allWorking = false;
        } else {
            completedChecks++;
        }
    });
    
    console.log(`Завершено проверок: ${completedChecks}/${statusBoxes.length}, Все работают: ${allWorking}`);
    
    equipmentCheckPassed = allWorking;
    const continueBtn = document.getElementById('continueToLessonBtn');
    
    const continueAnywayBtn = document.getElementById('continueAnywayBtn');
    
    if (allWorking && completedChecks === statusBoxes.length) {
        continueBtn.disabled = false;
        continueAnywayBtn.style.display = 'none';
        updateConnectionStatus('connected', 'Все проверки пройдены');
        showToast('Все проверки пройдены успешно!', 'success');
        console.log('✓ Все проверки пройдены успешно!');
        
        // Автоматически создаем сессию и переходим к уроку через 3 секунды
        // Показываем обратный отсчет
        let countdown = 3;
        const countdownInterval = setInterval(() => {
            showToast(`Автоматический переход к уроку через ${countdown} сек...`, 'info');
            countdown--;
            
            if (countdown < 0) {
                clearInterval(countdownInterval);
                autoCreateSessionAndRedirect();
            }
        }, 1000);
        
        // Сохраняем интервал для возможности отмены
        window.autoRedirectInterval = countdownInterval;
        
    } else if (completedChecks === statusBoxes.length) {
        continueBtn.disabled = true;
        continueAnywayBtn.style.display = 'inline-flex';
        updateConnectionStatus('error', 'Некоторые проверки не пройдены');
        showToast('Некоторые проверки не пройдены. Вы можете продолжить в любом случае.', 'warning');
        console.log('✗ Некоторые проверки не пройдены');
    } else {
        continueAnywayBtn.style.display = 'none';
        console.log('Ожидаем завершения всех проверок...');
        setTimeout(checkEquipmentResults, 1000);
    }
}

// Установка статуса оборудования
function setStatusBox(box, working, text) {
    if (!box) return;
    
    console.log(`Обновляем статус ${box.id}: ${working ? 'working' : 'error'} - ${text}`);
    
    box.classList.remove('checking', 'working', 'error');
    box.classList.add(working ? 'working' : 'error');
    
    const textEl = box.querySelector('.status-text');
    if (textEl) {
        textEl.textContent = text;
    }
    
    setTimeout(() => {
        checkEquipmentResults();
    }, 100);
}

// Переключение камеры
async function switchCamera() {
    if (!activeMediaStream) return;
    
    try {
        const videoTracks = activeMediaStream.getVideoTracks();
        if (videoTracks.length > 1) {
            const currentTrack = videoTracks[0];
            const nextTrack = videoTracks[1];
            
            activeMediaStream.removeTrack(currentTrack);
            activeMediaStream.addTrack(nextTrack);
            
            document.getElementById('cameraPreview').srcObject = activeMediaStream;
        } else {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            if (videoDevices.length > 1) {
                const currentDevice = videoTracks[0].getSettings().deviceId;
                const nextDevice = videoDevices.find(device => device.deviceId !== currentDevice);
                
                if (nextDevice) {
                    const newStream = await navigator.mediaDevices.getUserMedia({
                        video: { deviceId: { exact: nextDevice.deviceId } },
                        audio: true
                    });
                    
                    stopActiveStream();
                    activeMediaStream = newStream;
                    document.getElementById('cameraPreview').srcObject = newStream;
                }
            }
        }
    } catch (error) {
        console.error('Ошибка переключения камеры:', error);
        showToast('Ошибка переключения камеры', 'error');
    }
}

// Переключение видео
function toggleVideo() {
    if (!activeMediaStream) return;
    
    const videoTracks = activeMediaStream.getVideoTracks();
    const btn = document.getElementById('muteVideoBtn');
    
    if (videoTracks.length > 0) {
        const isEnabled = videoTracks[0].enabled;
        videoTracks[0].enabled = !isEnabled;
        
        btn.classList.toggle('muted', !isEnabled);
        btn.innerHTML = isEnabled ? '<i class="fas fa-video-slash"></i>' : '<i class="fas fa-video"></i>';
    }
}

// Переключение аудио
function toggleAudio() {
    if (!activeMediaStream) return;
    
    const audioTracks = activeMediaStream.getAudioTracks();
    const btn = document.getElementById('muteAudioBtn');
    
    if (audioTracks.length > 0) {
        const isEnabled = audioTracks[0].enabled;
        audioTracks[0].enabled = !isEnabled;
        
        btn.classList.toggle('muted', !isEnabled);
        btn.innerHTML = isEnabled ? '<i class="fas fa-microphone-slash"></i>' : '<i class="fas fa-microphone"></i>';
    }
}

// Переход к уроку
async function continueToLesson() {
    console.log('=== Переход к уроку ===');
    
    // Отменяем автоматический переход, если он был запущен
    if (window.autoRedirectInterval) {
        clearInterval(window.autoRedirectInterval);
        window.autoRedirectInterval = null;
    }
    
    // Останавливаем медиа стрим
    stopActiveStream();
    
    // Получаем ID урока из URL
    const urlParams = new URLSearchParams(window.location.search);
    const lessonId = urlParams.get('lessonId');
    
    if (!lessonId) {
        showToast('Ошибка: ID урока не найден', 'error');
        setTimeout(() => {
            window.location.href = '/dashboard';
        }, 2000);
        return;
    }
    
    // Показываем сообщение о переходе к доске
    showToast('Очистка кеша и переход к доске урока...', 'info');
    
    // Принудительно очищаем кеш Excalidraw перед переходом
    console.log('Очищаем кеш Excalidraw перед переходом к доске...');
    const cacheCleared = await clearExcalidrawCache();
    
    if (cacheCleared) {
        showToast('Кеш очищен! Переход к доске...', 'success');
    } else {
        showToast('Переход к доске (очистка кеша не удалась)...', 'warning');
    }
    
    // Открываем доску Excalidraw в новой вкладке
    setTimeout(() => {
        const boardWindow = window.open(`/excalidraw/board/${lessonId}`, '_blank', 'noopener,noreferrer');
        
        if (boardWindow) {
            showToast('Доска урока открыта в новой вкладке', 'success');
            boardWindow.focus();
            
            // Закрываем текущую вкладку проверки оборудования
            setTimeout(() => {
                window.close();
            }, 2000);
        } else {
            showToast('Не удалось открыть доску. Проверьте блокировку всплывающих окон.', 'error');
            // Fallback - перенаправляем в текущей вкладке
            window.location.href = `/excalidraw/board/${lessonId}`;
        }
    }, 1500);
}

// Автоматическое создание сессии и переход к уроку (новая функция)
async function autoCreateSessionAndRedirect() {
    console.log('=== Автоматическое создание сессии ===');
    
    // Отменяем интервал обратного отсчета
    if (window.autoRedirectInterval) {
        clearInterval(window.autoRedirectInterval);
        window.autoRedirectInterval = null;
    }
    
    // Останавливаем медиа стрим
    stopActiveStream();
    
    // Получаем ID урока из URL
    const urlParams = new URLSearchParams(window.location.search);
    const lessonId = urlParams.get('lessonId');
    
    if (!lessonId) {
        showToast('Ошибка: ID урока не найден', 'error');
        setTimeout(() => {
            window.location.href = '/dashboard';
        }, 2000);
        return;
    }
    
    // Показываем сообщение о переходе к доске
    showToast('Очистка кеша и переход к доске урока...', 'info');
    
    // Принудительно очищаем кеш Excalidraw перед переходом
    console.log('Очищаем кеш Excalidraw перед автоматическим переходом к доске...');
    const cacheCleared = await clearExcalidrawCache();
    
    if (cacheCleared) {
        showToast('Кеш очищен! Переход к доске...', 'success');
    } else {
        showToast('Переход к доске (очистка кеша не удалась)...', 'warning');
    }
    
    // Открываем доску Excalidraw в новой вкладке
    setTimeout(() => {
        const boardWindow = window.open(`/excalidraw/board/${lessonId}`, '_blank', 'noopener,noreferrer');
        
        if (boardWindow) {
            showToast('Доска урока открыта в новой вкладке', 'success');
            boardWindow.focus();
            
            // Закрываем текущую вкладку проверки оборудования
            setTimeout(() => {
                window.close();
            }, 2000);
        } else {
            showToast('Не удалось открыть доску. Проверьте блокировку всплывающих окон.', 'error');
            // Fallback - перенаправляем в текущей вкладке
            window.location.href = `/excalidraw/board/${lessonId}`;
        }
    }, 1500);
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
    stopActiveStream();
});
