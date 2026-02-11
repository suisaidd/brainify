// JavaScript для страницы личного кабинета

document.addEventListener('DOMContentLoaded', function() {
    initSidebar();
    initHeaderButtons();
    initSidebarItems();
    initLessonTabs();
    initTabSwitching();
    initScheduleControls();

    
    // Инициализируем даты при загрузке страницы
    updateCurrentWeekDisplay();
    
    // Инициализируем состояние кнопок
    updateScheduleButtonsState();
    
    // Загружаем данные преподавателя
    loadTeacherData();
    loadTeacherLessons();
    
    // Инициализируем навигацию базы знаний
    initKnowledgeBaseNavigation();

    const refreshTeacherTestsBtn = document.getElementById('refreshTeacherTests');
    if (refreshTeacherTestsBtn) {
        refreshTeacherTestsBtn.addEventListener('click', () => loadTeacherTestsSection(true));
    }

    initializeTeacherTestModal();
});
// Инициализация проверки оборудования
let activeMediaStream = null;
let teacherTestsInitialized = false;
let teacherSelectedTemplateId = null;
let teacherEditingQuestionId = null;
let teacherQuestionsCache = [];
let teacherTestModalElements = {};

function initEquipmentCheck() {
    updateTimeStatus();
    // Автоматически запускаем проверки
    setTimeout(() => {
        startMediaChecks();
        testNetworkSpeed();
    }, 500);
}

async function startMediaChecks() {
    const videoFrame = document.getElementById('videoFrame');
    const overlay = document.getElementById('videoOverlay');
    const videoEl = document.getElementById('cameraPreview');
    const camBox = document.getElementById('cameraStatus');
    const micBox = document.getElementById('micStatus');
    
    try {
        // Останавливаем предыдущий стрим, если был
        stopActiveStream();
        
        // Сначала запрашиваем только камеру
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        
        // Камера ок
        if (videoEl) {
            videoEl.srcObject = videoStream;
        }
        if (overlay) overlay.style.display = 'none';
        if (videoFrame) {
            videoFrame.classList.remove('red');
            videoFrame.classList.add('green');
        }
        if (camBox) setStatusBox(camBox, true, 'Камера работает успешно');

        // Теперь запрашиваем микрофон отдельно с явным запросом разрешения
        try {
            console.log('Запрашиваем доступ к микрофону...');
            const audioStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                } 
            });
            
            console.log('Доступ к микрофону получен:', audioStream.getAudioTracks().length, 'треков');
            
            // Объединяем потоки
            const combinedStream = new MediaStream([
                ...videoStream.getVideoTracks(),
                ...audioStream.getAudioTracks()
            ]);
            
            activeMediaStream = combinedStream;
            
            // Проверяем микрофон
            const hasAudio = combinedStream.getAudioTracks && combinedStream.getAudioTracks().length > 0;
            if (hasAudio) {
                console.log('Аудио треки найдены, начинаем проверку активности...');
                // Инициализируем проверку микрофона
                setStatusBox(micBox, false, 'Скажите что-нибудь');
                checkMicrophoneActivity(combinedStream);
            } else {
                console.log('Аудио треки не найдены');
                setStatusBox(micBox, false, 'Микрофон не найден');
            }
        } catch (audioErr) {
            console.error('Ошибка доступа к микрофону:', audioErr);
            setStatusBox(micBox, false, 'Нет доступа к микрофону');
            // Камера работает, но микрофон недоступен
            activeMediaStream = videoStream;
        }
    } catch (err) {
        console.error('Ошибка доступа к камере:', err);
        if (videoFrame) {
            videoFrame.classList.remove('green');
            videoFrame.classList.add('red');
        }
        if (overlay) {
            overlay.style.display = 'flex';
            overlay.textContent = 'Нет доступа к камере';
        }
        if (camBox) setStatusBox(camBox, false, 'Нет доступа к камере');
        if (micBox) setStatusBox(micBox, false, 'Нет доступа к микрофону');
        showToast('Предоставьте доступ к камере и микрофону в браузере', 'warning');
    }
}

function checkMicrophoneActivity(stream) {
    const micBox = document.getElementById('micStatus');
    if (!micBox) return;
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        source.connect(analyser);
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let activityDetected = false;
        let checkCount = 0;
        const maxChecks = 200; // Максимум 20 секунд проверки
        
        const checkActivity = () => {
            if (activityDetected || checkCount >= maxChecks) {
                audioContext.close();
                return;
            }
            
            analyser.getByteTimeDomainData(dataArray);
            const variance = dataArray.reduce((acc, v) => acc + Math.abs(v - 128), 0) / dataArray.length;
            
            console.log('Уровень звука:', variance.toFixed(2));
            
            if (variance > 3) { // Сниженный порог для более чувствительного обнаружения
                activityDetected = true;
                console.log('Звук обнаружен! Мгновенно переключаем на зелёный');
                setStatusBox(micBox, true, 'Микрофон работает успешно');
                audioContext.close();
                return;
            }
            
            checkCount++;
            // Обновляем текст каждые 2 секунды для привлечения внимания
            if (checkCount % 20 === 0) {
                setStatusBox(micBox, false, 'Скажите что-нибудь');
            }
            
            setTimeout(checkActivity, 100);
        };
        
        console.log('Начинаем мониторинг микрофона...');
        checkActivity();
        
        // Если через 20 секунд звук не обнаружен
        setTimeout(() => {
            if (!activityDetected) {
                console.log('Звук не обнаружен за 20 секунд');
                setStatusBox(micBox, false, 'Микрофон не работает');
                audioContext.close();
            }
        }, 20000);
        
    } catch (error) {
        console.error('Ошибка проверки микрофона:', error);
        setStatusBox(micBox, false, 'Ошибка проверки микрофона');
    }
}

function stopActiveStream() {
    if (activeMediaStream) {
        activeMediaStream.getTracks().forEach(t => t.stop());
        activeMediaStream = null;
    }
}

function setStatusBox(box, ok, text) {
    if (!box) return;
    box.classList.remove('red', 'green');
    box.classList.add(ok ? 'green' : 'red');
    const textEl = box.querySelector('.status-text');
    if (textEl) {
        textEl.innerHTML = `${ok ? '<i class="fas fa-check"></i>' : '<i class="fas fa-times"></i>'} ${text}`;
    }
}

async function testNetworkSpeed() {
    const statusBox = document.getElementById('networkStatus');
    const testUrl = 'https://speed.cloudflare.com/__down?bytes=2000000';
    try {
        const start = performance.now();
        const res = await fetch(testUrl, { cache: 'no-store' });
        const reader = res.body.getReader();
        let received = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            received += value.length;
        }
        const ms = performance.now() - start;
        const mbits = (received * 8) / (ms / 1000) / 1e6;
        const ok = mbits >= 5; // порог 5 Мбит/с
        setStatusBox(statusBox, ok, ok ? `Скорость интернета нормальная (${mbits.toFixed(1)} Мбит/с)` : `Низкая скорость (${mbits.toFixed(1)} Мбит/с)`);
    } catch (e) {
        console.error('Network test error:', e);
        setStatusBox(statusBox, false, 'Ошибка проверки интернета');
    }
}

function updateTimeStatus() {
    const box = document.getElementById('timeStatus');
    const now = new Date();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const timeStr = now.toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setStatusBox(box, true, `${timeStr}, часовой пояс: ${tz}`);
}

setInterval(() => {
    if (document.getElementById('equipment-tab')?.classList.contains('active')) {
        updateTimeStatus();
    }
}, 1000);

// Функции для работы с конспектами
function loadTeacherNotes() {
    console.log('Загрузка конспектов преподавателя...');
    
    // Используем NotesManager для загрузки конспектов
    if (window.notesManager) {
        console.log('NotesManager найден, загружаем конспекты...');
        window.notesManager.loadNotes();
    } else {
        console.log('NotesManager не найден, инициализируем...');
        // Если NotesManager еще не инициализирован, инициализируем его
        if (document.getElementById('notesList') && document.getElementById('addNoteBtn')) {
            window.notesManager = new NotesManager();
        }
    }
}

// Функции для работы с учениками
function loadTeacherStudents() {
    console.log('Загрузка учеников преподавателя...');
    
    const studentsList = document.getElementById('studentsList');
    const noStudentsMessage = document.getElementById('noStudentsMessage');
    
    if (!studentsList) return;
    
    // Показываем загрузку
    studentsList.innerHTML = `
        <div class="loading-students">
            <div class="loading-spinner"></div>
            <p>Загрузка учеников...</p>
        </div>
    `;
    
    fetch('/api/teacher/students', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        } else {
            throw new Error('Ошибка загрузки учеников');
        }
    })
    .then(students => {
        console.log('Ученики загружены:', students);
        
        if (!students || students.length === 0) {
            if (noStudentsMessage) noStudentsMessage.style.display = 'block';
            studentsList.innerHTML = '';
            return;
        }
        
        if (noStudentsMessage) noStudentsMessage.style.display = 'none';
        
        studentsList.innerHTML = students.map(student => `
            <div class="student-card">
                <div class="student-info">
                    <div class="student-avatar" style="background: linear-gradient(135deg, ${getRandomGradient()})">
                        ${student.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="student-details">
                        <h4>${student.name}</h4>
                        <p class="student-email">
                            <i class="fas fa-envelope"></i>
                            ${student.email}
                        </p>
                        <p class="student-phone">
                            <i class="fas fa-phone"></i>
                            ${student.phone || 'Телефон не указан'}
                        </p>
                        <div class="student-stats">
                            <span class="stat-item">
                                <i class="fas fa-graduation-cap"></i>
                                ${student.lessonsCount || 0} уроков
                            </span>
                            <span class="stat-item">
                                <i class="fas fa-book"></i>
                                ${student.remainingLessons || 0} осталось
                            </span>
                        </div>
                        <div class="student-subjects">
                            ${student.subjects && student.subjects.length > 0 ? 
                                student.subjects.map(subject => `<span class="subject-tag">${subject}</span>`).join('') : 
                                '<span class="no-subjects">Предметы не указаны</span>'
                            }
                        </div>
                    </div>
                </div>
                <div class="student-actions">
                    <button class="message-btn" onclick="sendMessage(${student.id})">
                        <i class="fas fa-envelope"></i>
                        Написать сообщение
                    </button>
                    <button class="view-profile-btn" onclick="viewStudentProfile(${student.id})">
                        <i class="fas fa-user"></i>
                        Профиль
                    </button>
                    <button class="view-tests-btn" onclick="viewStudentTests(${student.id})">
                        <i class="fas fa-clipboard-check"></i>
                        Тесты
                    </button>
                </div>
            </div>
        `).join('');
    })
    .catch(error => {
        console.error('Ошибка загрузки учеников:', error);
        if (noStudentsMessage) noStudentsMessage.style.display = 'block';
        studentsList.innerHTML = '';
        showToast('Ошибка загрузки учеников', 'error');
    });
}

// Функция для генерации случайного градиента для аватара
function getRandomGradient() {
    const gradients = [
        '#667eea, #764ba2',
        '#f093fb, #f5576c',
        '#4facfe, #00f2fe',
        '#43e97b, #38f9d7',
        '#fa709a, #fee140',
        '#a8edea, #fed6e3',
        '#ffecd2, #fcb69f',
        '#ff9a9e, #fecfef',
        '#a18cd1, #fbc2eb',
        '#fad0c4, #ffd1ff'
    ];
    return gradients[Math.floor(Math.random() * gradients.length)];
}

// Функции для модального окна конспектов
function openNoteModal() {
    const modal = document.getElementById('noteModal');
    if (modal) {
        modal.style.display = 'flex';
        resetNoteForm();
    }
}

function closeNoteModal() {
    const modal = document.getElementById('noteModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function resetNoteForm() {
    document.getElementById('noteTitle').value = '';
    document.getElementById('noteSubject').value = '';
    document.getElementById('noteDescription').value = '';
    document.getElementById('noteText').value = '';
    
    // Очищаем холст
    const canvas = document.getElementById('drawingCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    // Очищаем загруженные файлы
    document.getElementById('uploadedFiles').innerHTML = '';
    
    // Переключаемся на первую вкладку
    switchContentTab('drawing');
}

function initContentTabs() {
    const tabs = document.querySelectorAll('.content-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.getAttribute('data-tab');
            switchContentTab(targetTab);
        });
    });
}

function switchContentTab(tabName) {
    // Убираем активный класс со всех вкладок и панелей
    document.querySelectorAll('.content-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.content-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // Добавляем активный класс к выбранной вкладке и панели
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}Panel`).classList.add('active');
}

// Функции для рисования
let isDrawing = false;
let currentTool = 'pen';
let currentColor = '#000000';
let currentSize = 3;

function initDrawingCanvas() {
    const canvas = document.getElementById('drawingCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Инициализация инструментов
    const toolBtns = document.querySelectorAll('.tool-btn[data-tool]');
    toolBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            currentTool = btn.getAttribute('data-tool');
            toolBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    
    // Цвет
    const colorPicker = document.getElementById('colorPicker');
    if (colorPicker) {
        colorPicker.addEventListener('change', (e) => {
            currentColor = e.target.value;
        });
    }
    
    // Размер кисти
    const brushSize = document.getElementById('brushSize');
    if (brushSize) {
        brushSize.addEventListener('change', (e) => {
            currentSize = parseInt(e.target.value);
        });
    }
    
    // Очистка холста
    const clearBtn = document.getElementById('clearCanvas');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        });
    }
    
    // События мыши
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);
    
    // События касания для мобильных
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouch);
    canvas.addEventListener('touchend', stopDrawing);
}

function startDrawing(e) {
    isDrawing = true;
    draw(e);
}

function draw(e) {
    if (!isDrawing) return;
    
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.lineWidth = currentSize;
    ctx.lineCap = 'round';
    ctx.strokeStyle = currentTool === 'eraser' ? '#ffffff' : currentColor;
    
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
}

function stopDrawing() {
    isDrawing = false;
    const canvas = document.getElementById('drawingCanvas');
    const ctx = canvas.getContext('2d');
    ctx.beginPath();
}

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 
                                    e.type === 'touchmove' ? 'mousemove' : 'mouseup', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
}

// Функции для загрузки файлов
function initFileUpload() {
    const fileInput = document.getElementById('fileInput');
    const uploadZone = document.getElementById('uploadZone');
    
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
    
    if (uploadZone) {
        uploadZone.addEventListener('dragover', handleDragOver);
        uploadZone.addEventListener('drop', handleDrop);
    }
}

function handleFileSelect(e) {
    const files = Array.from(e.target.files);
    addFilesToList(files);
}

function handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#a3e635';
    e.currentTarget.style.background = '#f0fdf4';
}

function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.style.borderColor = '#e2e8f0';
    e.currentTarget.style.background = 'transparent';
    
    const files = Array.from(e.dataTransfer.files);
    addFilesToList(files);
}

function addFilesToList(files) {
    const uploadedFiles = document.getElementById('uploadedFiles');
    
    files.forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.innerHTML = `
            <i class="fas fa-file"></i>
            <span class="file-name">${file.name}</span>
            <button class="remove-file" onclick="removeFile(this)">Удалить</button>
        `;
        uploadedFiles.appendChild(fileItem);
    });
}

function removeFile(btn) {
    btn.parentElement.remove();
}

// Функции для сохранения конспекта
function saveNote() {
    const title = document.getElementById('noteTitle').value;
    const subject = document.getElementById('noteSubject').value;
    const description = document.getElementById('noteDescription').value;
    
    if (!title || !subject) {
        showToast('Заполните обязательные поля', 'warning');
        return;
    }
    
    // Получаем данные с активной вкладки
    let content = '';
    const activeTab = document.querySelector('.content-tab.active').getAttribute('data-tab');
    
    switch (activeTab) {
        case 'drawing':
            const canvas = document.getElementById('drawingCanvas');
            content = canvas.toDataURL();
            break;
        case 'text':
            content = document.getElementById('noteText').value;
            break;
        case 'upload':
            const files = document.querySelectorAll('.file-item .file-name');
            content = Array.from(files).map(f => f.textContent).join(', ');
            break;
    }
    
    console.log('Сохранение конспекта:', { title, subject, description, content, type: activeTab });
    
    // Здесь будет отправка на сервер
    showToast('Конспект сохранен успешно', 'success');
    closeNoteModal();
    
    // Перезагружаем список конспектов
    loadTeacherNotes();
}

// Функция для отправки сообщения ученику
function sendMessage(studentId) {
    console.log('Отправка сообщения ученику:', studentId);
    showToast('Функция сообщений будет реализована позже', 'info');
}

// Функция для просмотра профиля ученика
function viewStudentProfile(studentId) {
    console.log('Просмотр профиля ученика:', studentId);
    showToast('Функция просмотра профиля будет реализована позже', 'info');
}

// Функция для просмотра тестов ученика
async function viewStudentTests(studentId) {
    try {
        const response = await fetch(`/api/teacher/tests/student/${studentId}/tests`);
        if (!response.ok) {
            throw new Error('Не удалось загрузить тесты ученика');
        }

        const data = await response.json();
        openStudentTestsModal(data);
    } catch (error) {
        console.error('Ошибка загрузки тестов ученика:', error);
        showToast('Не удалось загрузить тесты ученика', 'error');
    }
}

// Открытие модального окна с тестами ученика
function openStudentTestsModal(data) {
    const modal = document.getElementById('studentTestsModal');
    if (!modal) {
        // Создаём модальное окно, если его нет
        const modalHtml = `
            <div id="studentTestsModal" class="modal">
                <div class="modal-content student-tests-modal-content">
                    <div class="modal-header">
                        <h2>Тесты ученика: ${data.studentName || 'Неизвестно'}</h2>
                        <button class="modal-close" onclick="closeStudentTestsModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body" id="studentTestsModalBody">
                        <!-- Контент будет загружен динамически -->
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    const modalBody = document.getElementById('studentTestsModalBody');
    if (!modalBody) return;

    if (!data.results || data.results.length === 0) {
        modalBody.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard"></i>
                <h3>Решённых тестов пока нет</h3>
                <p>Ученик ещё не решил ни одного теста.</p>
            </div>
        `;
    } else {
        modalBody.innerHTML = `
            <div class="student-tests-results-list">
                ${data.results.map(result => {
                    const pct = Number(result.scorePercentage).toFixed(1);
                    const needsReview = result.isReviewed === false;
                    const reviewLabel = needsReview ? '<i class="fas fa-edit"></i> Проверить ответы' : '<i class="fas fa-eye"></i> Подробнее';
                    return `
                    <div class="student-test-result-card ${needsReview ? 'needs-review' : ''}">
                        <div class="student-test-result-header">
                            <h3>${result.templateTitle}</h3>
                            <span class="test-category-badge ${result.category === 'BASIC' ? 'basic' : 'intermediate'}">
                                ${result.category === 'BASIC' ? 'Базовый тест' : 'Промежуточный тест'}
                            </span>
                            ${needsReview ? '<span class="needs-review-badge"><i class="fas fa-clock"></i> Ждёт проверки</span>' : ''}
                        </div>
                        <div class="student-test-result-info">
                            <div class="result-info-item">
                                <i class="fas fa-book"></i>
                                <span>${result.subjectName}</span>
                            </div>
                            ${result.difficultyLevel ? `
                                <div class="result-info-item">
                                    <i class="fas fa-layer-group"></i>
                                    <span>Уровень ${result.difficultyLevel}</span>
                                </div>
                            ` : ''}
                            <div class="result-info-item">
                                <i class="fas fa-calendar-check"></i>
                                <span>${formatDateTime(result.submittedAt)}</span>
                            </div>
                        </div>
                        <div class="student-test-result-score">
                            <div class="score-circle ${getScoreClass(result.scorePercentage)}">
                                <span class="score-value">${pct}%</span>
                            </div>
                            <div class="score-details">
                                <span>${result.correctAnswers} из ${result.totalQuestions} правильных ответов</span>
                                ${result.reviewUrl ? `<a href="${result.reviewUrl}" target="_blank" class="review-link-btn ${needsReview ? 'needs-review' : ''}">${reviewLabel}</a>` : ''}
                            </div>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        `;
    }

    document.getElementById('studentTestsModal').style.display = 'flex';
}

function closeStudentTestsModal() {
    const modal = document.getElementById('studentTestsModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function getScoreClass(score) {
    if (score >= 80) return 'excellent';
    if (score >= 60) return 'good';
    if (score >= 40) return 'average';
    return 'poor';
}

// Инициализация модального окна конспектов
document.addEventListener('DOMContentLoaded', function() {
    // Привязываем обработчики для модального окна конспектов
    const addNoteBtn = document.getElementById('addNoteBtn');
    if (addNoteBtn) {
        addNoteBtn.addEventListener('click', openNoteModal);
    }
    
    // Привязываем обработчики для модального окна
    const noteModal = document.getElementById('noteModal');
    if (noteModal) {
        const closeBtn = noteModal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeNoteModal);
        }
        
        // Закрытие по клику вне модального окна
        noteModal.addEventListener('click', (e) => {
            if (e.target === noteModal) {
                closeNoteModal();
            }
        });
    }
    
    // Инициализация вкладок контента
    initContentTabs();
    
    // Инициализация холста для рисования
    initDrawingCanvas();
    
    // Инициализация загрузки файлов
    initFileUpload();
});


// Инициализация бокового меню
function initSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const mobileSidebarToggle = document.querySelector('.mobile-sidebar-toggle');
    const mainContent = document.querySelector('.main-content');

    // Переключение сайдбара на мобильных устройствах
    function toggleSidebar() {
        sidebar.classList.toggle('open');
        
        // Добавляем оверлей для мобильных устройств
        if (window.innerWidth <= 768) {
            const overlay = document.querySelector('.sidebar-overlay');
            if (sidebar.classList.contains('open') && !overlay) {
                createSidebarOverlay();
            } else if (!sidebar.classList.contains('open') && overlay) {
                overlay.remove();
            }
        }
    }

    // Создание оверлея для мобильных устройств
    function createSidebarOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        document.body.appendChild(overlay);
        
        // Плавное появление
        setTimeout(() => {
            overlay.style.opacity = '1';
        }, 10);

        // Закрытие при клике на оверлей
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.remove();
            }, 300);
        });
    }

    // Обработчики событий
    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', toggleSidebar);
    }

    if (mobileSidebarToggle) {
        mobileSidebarToggle.addEventListener('click', toggleSidebar);
    }

    // Закрытие сайдбара при изменении размера экрана
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('open');
            const overlay = document.querySelector('.sidebar-overlay');
            if (overlay) {
                overlay.remove();
            }
        }
        
        // Обновляем индикатор текущего времени при изменении размера окна
        setTimeout(updateCurrentTimeIndicator, 100);
    });

    // Закрытие сайдбара при клике вне его на мобильных устройствах
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && 
            !sidebar.contains(e.target) && 
            !mobileSidebarToggle.contains(e.target) &&
            sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
            const overlay = document.querySelector('.sidebar-overlay');
            if (overlay) {
                overlay.remove();
            }
        }
    });
}

// Инициализация кнопок в хедере
function initHeaderButtons() {
    const messageBtn = document.querySelector('.header-btn[title="Сообщения"]');
    const profileBtn = document.querySelector('.header-btn[title="Профиль"]');
    const logoutBtn = document.querySelector('.logout-btn');

    if (messageBtn) {
        messageBtn.addEventListener('click', () => {
            showToast('Раздел сообщений будет реализован позже', 'info');
        });
    }

    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            showToast('Страница профиля будет реализована позже', 'info');
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Вы уверены, что хотите выйти из аккаунта?')) {
                showToast('Выход из системы...', 'info');
                
                fetch('/api/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => {
                    console.log('Dashboard logout response status:', response.status);
                    // Принудительная очистка кэша браузера
                    if ('caches' in window) {
                        caches.keys().then(names => {
                            names.forEach(name => caches.delete(name));
                        });
                    }
                    // Очистка localStorage и sessionStorage
                    localStorage.clear();
                    sessionStorage.clear();
                    showToast('Выход выполнен успешно', 'success');
                    // Перенаправление с принудительным обновлением
                    setTimeout(() => {
                        window.location.replace('/');
                    }, 1000);
                })
                .catch(error => {
                    console.error('Dashboard logout error:', error);
                    // Даже если запрос не удался, очищаем всё локально
                    if ('caches' in window) {
                        caches.keys().then(names => {
                            names.forEach(name => caches.delete(name));
                        });
                    }
                    localStorage.clear();
                    sessionStorage.clear();
                    showToast('Выход выполнен', 'info');
                    setTimeout(() => {
                        window.location.replace('/');
                    }, 1000);
                });
            }
        });
    }
}

// Инициализация элементов сайдбара
function initSidebarItems() {
    // Логика переключения вкладок перенесена в initTabSwitching / switchToTab
}



// Функция показа уведомлений
function showToast(message, type = 'info') {
    // Удаляем предыдущие уведомления
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());

    const toast = document.createElement('div');
    toast.className = 'toast';
    
    // Определяем цвета для разных типов
    let bgColor, borderColor, iconClass;
    switch (type) {
        case 'success':
            bgColor = 'linear-gradient(135deg, #10b981, #059669)';
            borderColor = '#10b981';
            iconClass = 'fas fa-check-circle';
            break;
        case 'error':
            bgColor = 'linear-gradient(135deg, #ef4444, #dc2626)';
            borderColor = '#ef4444';
            iconClass = 'fas fa-exclamation-circle';
            break;
        case 'warning':
            bgColor = 'linear-gradient(135deg, #f59e0b, #d97706)';
            borderColor = '#f59e0b';
            iconClass = 'fas fa-exclamation-triangle';
            break;
        default: // info
            bgColor = 'linear-gradient(135deg, #3b82f6, #2563eb)';
            borderColor = '#3b82f6';
            iconClass = 'fas fa-info-circle';
    }

    toast.innerHTML = `
        <div class="toast-content">
            <i class="${iconClass}"></i>
            <span>${message}</span>
        </div>
        <button class="toast-close">
            <i class="fas fa-times"></i>
        </button>
    `;

    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        min-width: 300px;
        max-width: 400px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        opacity: 0;
        transform: translateX(100%);
        transition: all 0.3s ease;
        border-left: 4px solid ${borderColor};
    `;

    // Стили для содержимого
    const toastContent = toast.querySelector('.toast-content');
    toastContent.style.cssText = `
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex: 1;
    `;

    // Стили для кнопки закрытия
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.style.cssText = `
        background: none;
        border: none;
        color: white;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 50%;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.3s ease;
    `;

    document.body.appendChild(toast);

    // Анимация появления
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 10);

    // Обработчик закрытия
    closeBtn.addEventListener('click', () => {
        hideToast(toast);
    });

    // Автоскрытие через 4 секунды
    setTimeout(() => {
        hideToast(toast);
    }, 4000);

    // Hover эффекты
    closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    });

    closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.background = 'none';
    });
}

// Функция скрытия уведомления
function hideToast(toast) {
    if (!toast || !document.body.contains(toast)) return;
    
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    
    setTimeout(() => {
        if (document.body.contains(toast)) {
            toast.remove();
        }
    }, 300);
}

// Функция обновления времени (для демонстрации)
function updateTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Можно добавить отображение времени в хедер
    const timeElement = document.querySelector('.current-time');
    if (timeElement) {
        timeElement.textContent = timeString;
    }
}

// Обновляем время каждую минуту
setInterval(updateTime, 60000);
updateTime();

// Автоматическое обновление расписания каждую минуту для обновления прошедших слотов
setInterval(() => {
    // Проверяем, открыта ли вкладка расписания
    const scheduleTab = document.getElementById('schedule-tab');
    if (scheduleTab && scheduleTab.classList.contains('active')) {
        // Обновляем только отображение, не перезагружая данные с сервера
        updateScheduleDisplay();
        // Обновляем индикатор текущего времени
        updateCurrentTimeIndicator();
    }
    
    // Обновляем кнопки уроков каждую минуту для появления кнопки "Подключиться к уроку"
    updateLessonButtons();
}, 60000);

// Обновляем индикатор текущего времени каждые 30 секунд для более плавного движения
setInterval(() => {
    // Проверяем, открыта ли вкладка расписания
    const scheduleTab = document.getElementById('schedule-tab');
    if (scheduleTab && scheduleTab.classList.contains('active')) {
        updateCurrentTimeIndicator();
    }
}, 30000);

// Инициализация анимаций при загрузке
function initLoadAnimations() {
    const cards = document.querySelectorAll('.dashboard-card');
    
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// Инициализация вкладок уроков
function initLessonTabs() {
    const lessonTabs = document.querySelectorAll('.lesson-tab');
    const lessonTabContents = document.querySelectorAll('.lessons-tab-content');
    
    lessonTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Убираем активный класс со всех вкладок
            lessonTabs.forEach(otherTab => {
                otherTab.classList.remove('active');
            });
            lessonTabContents.forEach(content => {
                content.classList.remove('active');
            });
            
            // Добавляем активный класс к выбранной вкладке
            this.classList.add('active');
            const targetContent = document.getElementById(targetTab);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}

// Запускаем анимации при загрузке
setTimeout(initLoadAnimations, 100);

// Функции для загрузки данных преподавателя
function loadTeacherData() {
    console.log('Загрузка данных преподавателя...');
    
    // Загружаем данные статистики
    fetch('/api/teacher/dashboard-data', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        } else {
            throw new Error('Ошибка загрузки данных');
        }
    })
    .then(data => {
        console.log('Данные преподавателя загружены:', data);
        
        // Загружаем статистику отмен
        return fetch('/api/teacher/cancellation-stats', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (response.ok) {
                return response.json();
            } else {
                throw new Error('Ошибка загрузки статистики отмен');
            }
        })
        .then(cancellationStats => {
            // Добавляем статистику отмен к данным
            data.cancellationStats = cancellationStats;
            
            // Загружаем уроки для определения ближайшего
            return fetch('/api/teacher/all-lessons', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => {
                if (response.ok) {
                    return response.json();
                } else {
                    throw new Error('Ошибка загрузки уроков');
                }
            })
            .then(lessons => {
                // Находим ближайший урок (уроки уже отсортированы по возрастанию даты)
                const now = new Date();
                let nextLesson = null;
                
                for (let i = 0; i < lessons.length; i++) {
                    const lesson = lessons[i];
                    const lessonDate = createDateFromInput(lesson.lessonDate);
                    if (lessonDate && lessonDate > now) {
                        nextLesson = lesson;
                        break; // Первый урок в будущем - ближайший
                    }
                }
                
                // Обновляем данные с информацией о ближайшем уроке
                if (nextLesson) {
                    const nextLessonDate = createDateFromInput(nextLesson.lessonDate);
                    data.nextLessonTime = nextLessonDate.toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                } else {
                    data.nextLessonTime = '--:--';
                }
                
                updateDashboardStats(data);
            });
        });
    })
    .catch(error => {
        console.error('Ошибка загрузки данных преподавателя:', error);
        // Показываем пустые значения при ошибке
        updateDashboardStats({
            totalLessons: 0,
            nextLessonTime: '--:--',
            notificationCount: 0,
            cancellationStats: {
                cancellationsThisMonth: 0,
                freeCancellationsLeft: 5,
                totalUnpaidPenalty: 0,
                unpaidPenaltiesCount: 0
            }
        });
    });
}

function loadTeacherLessons() {
    console.log('Загрузка уроков преподавателя...');
    
    fetch('/api/teacher/all-lessons', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        } else {
            throw new Error('Ошибка загрузки уроков');
        }
    })
    .then(data => {
        console.log('Уроки преподавателя загружены:', data);
        displayTeacherLessons(data);
    })
    .catch(error => {
        console.error('Ошибка загрузки уроков преподавателя:', error);
        showNoCurrentLessonsMessage();
        showNoPastLessonsMessage();
    });
}

function updateDashboardStats(data) {
    // Обновляем статистику
    const totalLessonsElement = document.getElementById('totalLessons');
    const nextLessonTimeElement = document.getElementById('nextLessonTime');
    const notificationCountElement = document.getElementById('notificationCount');
    
    if (totalLessonsElement) {
        totalLessonsElement.textContent = data.totalLessons || 0;
    }
    
    if (nextLessonTimeElement) {
        nextLessonTimeElement.textContent = data.nextLessonTime || '--:--';
    }
    
    if (notificationCountElement) {
        notificationCountElement.textContent = data.notificationCount || 0;
    }
    
    // Обновляем статистику отмен, если есть
    if (data.cancellationStats) {
        const stats = data.cancellationStats;
        
        // Можно добавить отображение статистики отмен в дашборд
        console.log('Статистика отмен:', {
            отменВМесяце: stats.cancellationsThisMonth,
            бесплатныхОсталось: stats.freeCancellationsLeft,
            неоплаченныхШтрафов: stats.unpaidPenaltiesCount,
            суммаШтрафов: stats.totalUnpaidPenalty
        });
        
        // Уведомление о штрафах убрано по требованию пользователя
    }
}

function displayTeacherLessons(lessons) {
    if (!lessons || lessons.length === 0) {
        showNoCurrentLessonsMessage();
        showNoPastLessonsMessage();
        return;
    }
    
    // Разделяем уроки на текущие, прошедшие и отмененные
    const now = new Date();
    const currentLessons = [];
    const pastLessons = [];
    const cancelledLessons = [];
    
    lessons.forEach(lesson => {
        const lessonDate = createDateFromInput(lesson.lessonDate);
        const oneHourAfter = new Date(lessonDate.getTime() + (60 * 60 * 1000)); // 1 час после урока
        
        // Отмененные уроки идут в архив независимо от даты
        if (lesson.status === 'CANCELLED') {
            cancelledLessons.push(lesson);
        } else if (lessonDate && now <= oneHourAfter) {
            // Урок считается текущим, если он еще не прошел 1 час после начала
            currentLessons.push(lesson);
        } else {
            // Урок уходит в архив через 1 час после начала
            pastLessons.push(lesson);
        }
    });
    
    // Сортируем текущие уроки по дате (ближайшие сначала)
    currentLessons.sort((a, b) => {
        const dateA = createDateFromInput(a.lessonDate);
        const dateB = createDateFromInput(b.lessonDate);
        return dateA - dateB;
    });
    
    // Сортируем прошедшие уроки по дате (новые сначала)
    pastLessons.sort((a, b) => {
        const dateA = createDateFromInput(a.lessonDate);
        const dateB = createDateFromInput(b.lessonDate);
        return dateA - dateB;
    });
    
    // Сортируем отмененные уроки по дате (новые сначала)
    cancelledLessons.sort((a, b) => {
        const dateA = createDateFromInput(a.lessonDate);
        const dateB = createDateFromInput(b.lessonDate);
        return dateA - dateB;
    });
    
    // Отображаем текущие уроки
    displayCurrentLessons(currentLessons);
    
    // Отображаем прошедшие уроки (включая отмененные)
    displayPastLessons([...pastLessons, ...cancelledLessons]);
}

function displayCurrentLessons(lessons) {
    const currentLessonsList = document.getElementById('currentLessonsList');
    const noCurrentLessonsMessage = document.getElementById('noCurrentLessonsMessage');
    
    if (!currentLessonsList) return;
    
    // Очищаем контейнер
    currentLessonsList.innerHTML = '';
    
    if (!lessons || lessons.length === 0) {
        showNoCurrentLessonsMessage();
        return;
    }
    
    // Скрываем сообщение об отсутствии уроков
    if (noCurrentLessonsMessage) {
        noCurrentLessonsMessage.style.display = 'none';
    }
    
    // Отображаем уроки
    lessons.forEach(lesson => {
        const lessonCard = createNewLessonCard(lesson, 'current');
        currentLessonsList.appendChild(lessonCard);
    });
}

function displayPastLessons(lessons) {
    const pastLessonsList = document.getElementById('pastLessonsList');
    const noPastLessonsMessage = document.getElementById('noPastLessonsMessage');
    
    if (!pastLessonsList) return;
    
    // Очищаем контейнер
    pastLessonsList.innerHTML = '';
    
    if (!lessons || lessons.length === 0) {
        showNoPastLessonsMessage();
        return;
    }
    
    // Скрываем сообщение об отсутствии уроков
    if (noPastLessonsMessage) {
        noPastLessonsMessage.style.display = 'none';
    }
    
    // Отображаем уроки
    lessons.forEach(lesson => {
        const lessonCard = createNewLessonCard(lesson, 'past');
        pastLessonsList.appendChild(lessonCard);
    });
}

function createNewLessonCard(lesson, type) {
    const card = document.createElement('div');
    card.className = 'lesson-card';
    
    // Определяем статус урока
    const status = getLessonStatus(lesson);
    const statusClass = getStatusClass(status);
    const statusText = getStatusText(status);
    
    // Форматируем дату и время
    const formattedDate = formatLessonDate(lesson.lessonDate);
    const formattedTime = formatLessonTime(lesson.lessonDate);
    
    card.innerHTML = `
        <div class="lesson-duration">55 мин.</div>
        <div class="lesson-info">
            <h3 class="lesson-subject">${lesson.subjectName || 'Предмет не указан'}</h3>
            <p class="lesson-student">${lesson.studentName || 'Ученик не указан'}</p>
            <p class="lesson-date">${formattedDate}</p>
            <p class="lesson-time">${formattedTime}</p>
        </div>
        <div class="lesson-actions">
            ${type === 'current' ? createCurrentLessonActions(lesson, status) : createPastLessonActions(lesson, status)}
        </div>
    `;
    
    return card;
}

function createCurrentLessonActions(lesson, status) {
    const lessonDate = createDateFromInput(lesson.lessonDate);
    const now = new Date();
    const fifteenMinutesBefore = new Date(lessonDate.getTime() - (15 * 60 * 1000)); // 15 минут до урока
    const oneHourAfter = new Date(lessonDate.getTime() + (60 * 60 * 1000)); // 1 час после урока
    const canJoin = now >= fifteenMinutesBefore && now <= oneHourAfter; // Активность: 15 минут до + 1 час после
    
    console.log('createCurrentLessonActions для урока', lesson.id, {
        status: status,
        lessonDate: lessonDate,
        now: now,
        fifteenMinutesBefore: fifteenMinutesBefore,
        oneHourAfter: oneHourAfter,
        canJoin: canJoin,
        nowTime: now.getTime(),
        lessonDateTime: lessonDate.getTime(),
        fifteenMinutesBeforeTime: fifteenMinutesBefore.getTime(),
        oneHourAfterTime: oneHourAfter.getTime()
    });
    
    if (status === 'today') {
        let buttons = `
            <button class="lesson-btn secondary" onclick="rescheduleLesson(${lesson.id})">
                <i class="fas fa-calendar-alt"></i>
                Перенести
            </button>
            <button class="lesson-btn danger" onclick="cancelLesson(${lesson.id})">
                <i class="fas fa-times"></i>
                Отменить
            </button>
        `;
        
        if (canJoin) {
            // Проверяем, вошел ли уже преподаватель в урок
            if (lesson.teacherJoinedAt) {
                buttons += `
                    <button class="lesson-btn success" disabled>
                        <i class="fas fa-check"></i>
                        В уроке
                    </button>
                `;
            } else {
                buttons += `
                    <button class="lesson-btn primary" onclick="joinLesson(${lesson.id})">
                        <i class="fas fa-sign-in-alt"></i>
                        Подключиться к уроку
                    </button>
                `;
            }
        } else if (now < fifteenMinutesBefore) {
            buttons += `
                <button class="lesson-btn disabled" disabled>
                    <i class="fas fa-clock"></i>
                    Доступно за 15 минут
                </button>
            `;
        } else if (now > oneHourAfter) {
            buttons += `
                <button class="lesson-btn disabled" disabled>
                    <i class="fas fa-clock"></i>
                    Урок завершен
                </button>
            `;
        }
        
        return buttons;
    } else if (status === 'scheduled' || status === 'tomorrow') {
        return `
            <button class="lesson-btn secondary" onclick="rescheduleLesson(${lesson.id})">
                <i class="fas fa-calendar-alt"></i>
                Перенести
            </button>
            <button class="lesson-btn danger" onclick="cancelLesson(${lesson.id})">
                <i class="fas fa-times"></i>
                Отменить
            </button>
        `;
    } else {
        return '';
    }
}

function createPastLessonActions(lesson, status) {
    if (status === 'completed') {
        return `
            <span class="lesson-status-badge completed">Проведён</span>
        `;
    } else if (status === 'cancelled') {
        return `
            <span class="lesson-status-badge cancelled">Отменён</span>
        `;
    } else {
        return `
            <span class="lesson-status-badge completed">Успешно</span>
        `;
    }
}

function getLessonStatus(lesson) {
    const now = new Date();
    const lessonDate = createDateFromInput(lesson.lessonDate);
    const oneHourAfter = new Date(lessonDate.getTime() + (60 * 60 * 1000)); // 1 час после урока
    
    if (!lessonDate) {
        console.log('getLessonStatus: нет даты урока', lesson.id);
        return 'scheduled'; // По умолчанию, если дата не может быть обработана
    }
    
    console.log('getLessonStatus для урока', lesson.id, {
        lessonStatus: lesson.status,
        lessonDate: lessonDate,
        now: now,
        oneHourAfter: oneHourAfter,
        isToday: isToday(lessonDate),
        nowTime: now.getTime(),
        lessonDateTime: lessonDate.getTime(),
        oneHourAfterTime: oneHourAfter.getTime()
    });
    
    if (lesson.status === 'COMPLETED') {
        return 'completed';
    } else if (lesson.status === 'CANCELLED') {
        return 'cancelled';
    } else if (now <= oneHourAfter && isToday(lessonDate)) {
        // Урок сегодня и еще не прошел час после начала
        console.log('getLessonStatus: возвращаем today (урок сегодня, не прошел час)');
        return 'today';
    } else if (lessonDate < now && now > oneHourAfter) {
        // Урок прошел больше часа назад
        console.log('getLessonStatus: возвращаем overdue (урок прошел больше часа назад)');
        return 'overdue';
    } else if (isToday(lessonDate)) {
        console.log('getLessonStatus: возвращаем today (урок сегодня)');
        return 'today';
    } else if (isTomorrow(lessonDate)) {
        console.log('getLessonStatus: возвращаем tomorrow');
        return 'tomorrow';
    } else {
        console.log('getLessonStatus: возвращаем scheduled');
        return 'scheduled';
    }
}

function getStatusClass(status) {
    switch (status) {
        case 'completed': return 'completed';
        case 'cancelled': return 'cancelled';
        case 'overdue': return 'overdue';
        case 'today': return 'upcoming';
        case 'tomorrow': return 'scheduled';
        default: return 'scheduled';
    }
}

function getStatusText(status) {
    switch (status) {
        case 'completed': return 'Проведён';
        case 'cancelled': return 'Отменён';
        case 'overdue': return 'Успешно';
        case 'today': return 'Сегодня';
        case 'tomorrow': return 'Завтра';
        default: return 'Запланирован';
    }
}

function createLessonActions(lesson, status) {
    if (status === 'completed') {
        return `
            <div class="lesson-rating">
                <span class="rating-stars">
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                    <i class="fas fa-star"></i>
                </span>
                <span class="rating-value">${lesson.rating || '5.0'}</span>
            </div>
        `;
    } else if (status === 'today') {
        return `
            <div class="lesson-actions">
                <button class="lesson-btn primary" onclick="startLesson(${lesson.id})">Начать урок</button>
            </div>
        `;
    } else if (status === 'scheduled' || status === 'tomorrow') {
        return `
            <div class="lesson-actions">
                <button class="lesson-btn secondary" onclick="prepareLesson(${lesson.id})">Подготовиться</button>
            </div>
        `;
    } else {
        return '';
    }
}

function formatLessonDate(dateInput) {
    const date = createDateFromInput(dateInput);
    
    if (!date || isNaN(date.getTime())) {
        console.error('Неверная дата:', dateInput);
        return 'Дата не указана';
    }
    
    if (isToday(date)) {
        return 'Сегодня';
    } else if (isTomorrow(date)) {
        return 'Завтра';
    } else {
        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }
}

function formatLessonTime(dateInput) {
    const date = createDateFromInput(dateInput);
    
    if (!date || isNaN(date.getTime())) {
        console.error('Неверная дата для времени:', dateInput);
        return 'Время не указано';
    }
    
    return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function isToday(date) {
    if (!date || isNaN(date.getTime())) {
        return false;
    }
    
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
}

function isTomorrow(date) {
    if (!date || isNaN(date.getTime())) {
        return false;
    }
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.getDate() === tomorrow.getDate() &&
           date.getMonth() === tomorrow.getMonth() &&
           date.getFullYear() === tomorrow.getFullYear();
}

// Вспомогательная функция для создания даты из разных форматов
function createDateFromInput(dateInput) {
    if (!dateInput) {
        return null;
    }
    
    // Если это массив (LocalDateTime из Java)
    if (Array.isArray(dateInput)) {
        const [year, month, day, hour, minute, second, nano] = dateInput;
        const date = new Date(year, month - 1, day, hour, minute, second);
        return date;
    }
    
    // Если это объект с полями (возможно, другой формат)
    if (typeof dateInput === 'object' && dateInput !== null) {
        if (dateInput.year && dateInput.month && dateInput.day) {
            const date = new Date(dateInput.year, dateInput.month - 1, dateInput.day, 
                           dateInput.hour || 0, dateInput.minute || 0, dateInput.second || 0);
            return date;
        }
    }
    
    // Если это строка
    if (typeof dateInput === 'string') {
        const date = new Date(dateInput);
        return date;
    }
    
    // Если это уже Date объект
    if (dateInput instanceof Date) {
        return dateInput;
    }
    
    return null;
}

function showNoCurrentLessonsMessage() {
    const currentLessonsList = document.getElementById('currentLessonsList');
    const noCurrentLessonsMessage = document.getElementById('noCurrentLessonsMessage');
    
    if (currentLessonsList) {
        currentLessonsList.innerHTML = '';
    }
    
    if (noCurrentLessonsMessage) {
        noCurrentLessonsMessage.style.display = 'block';
    }
}

function showNoPastLessonsMessage() {
    const pastLessonsList = document.getElementById('pastLessonsList');
    const noPastLessonsMessage = document.getElementById('noPastLessonsMessage');
    
    if (pastLessonsList) {
        pastLessonsList.innerHTML = '';
    }
    
    if (noPastLessonsMessage) {
        noPastLessonsMessage.style.display = 'block';
    }
}

// Функции для действий с уроками
function joinLesson(lessonId) {
    console.log('Вход в урок:', lessonId);
    showToast('Открытие урока в новой вкладке...', 'info');
    
    // Сначала отмечаем вход в урок
    fetch(`/api/lessons/${lessonId}/join`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Открываем урок в новой вкладке
            const lessonWindow = window.open(`/equipment-check?lessonId=${lessonId}`, '_blank', 'noopener,noreferrer');
            
            if (lessonWindow) {
                showToast('Урок открыт в новой вкладке', 'success');
                
                // Фокусируемся на новой вкладке
                lessonWindow.focus();
                
                // Добавляем обработчик закрытия окна урока
                const checkClosed = setInterval(() => {
                    if (lessonWindow.closed) {
                        clearInterval(checkClosed);
                        showToast('Урок завершен', 'info');
                        // Обновляем данные на дашборде
                        loadTeacherLessons();
                    }
                }, 1000);
            } else {
                showToast('Не удалось открыть урок. Проверьте блокировку всплывающих окон.', 'error');
            }
        } else {
            showToast(data.message || 'Не удалось войти в урок', 'error');
        }
    })
    .catch(error => {
        console.error('Ошибка при входе в урок:', error);
        showToast('Ошибка при входе в урок', 'error');
    });
}

function rescheduleLesson(lessonId) {
    console.log('Перенос урока:', lessonId);
    
    // Получаем информацию о переносе урока
    fetch(`/api/teacher/lesson/${lessonId}/reschedule-info`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showToast(data.error, 'error');
            return;
        }
        
        // Показываем модальное окно переноса
        showRescheduleModal(data);
    })
    .catch(error => {
        console.error('Ошибка при получении информации о переносе:', error);
        showToast('Ошибка при получении информации о переносе', 'error');
    });
}

function showRescheduleModal(rescheduleInfo) {
    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.className = 'reschedule-modal';
    
    const penaltyText = rescheduleInfo.penaltyAmount > 0 
        ? `<div class="penalty-warning">
             <i class="fas fa-exclamation-triangle"></i>
             <strong>Внимание!</strong> За перенос этого урока будет взиматься штраф ${rescheduleInfo.penaltyAmount}₽
             <br><small>${rescheduleInfo.penaltyReason}</small>
           </div>`
        : `<div class="no-penalty">
             <i class="fas fa-check-circle"></i>
             Перенос урока бесплатен
           </div>`;
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Перенос урока</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="lesson-info-summary">
                    <div class="info-item">
                        <strong>Предмет:</strong> ${rescheduleInfo.subjectName}
                    </div>
                    <div class="info-item">
                        <strong>Ученик:</strong> ${rescheduleInfo.studentName}
                    </div>
                    <div class="info-item">
                        <strong>Текущая дата и время:</strong> ${new Date(rescheduleInfo.lessonDate).toLocaleString('ru-RU')}
                    </div>
                    <div class="info-item">
                        <strong>До урока осталось:</strong> ${rescheduleInfo.hoursUntilLesson} часов
                    </div>
                </div>
                
                ${penaltyText}
                
                <div class="schedule-preview">
                    <div class="schedule-nav">
                        <button class="schedule-nav-btn" onclick="changeRescheduleWeek(-1)">
                            <i class="fas fa-chevron-left"></i>
                            Предыдущая неделя
                        </button>
                        <div class="current-week-display" id="currentWeekDisplay">
                            <!-- Текущая неделя будет отображаться здесь -->
                        </div>
                        <button class="schedule-nav-btn" onclick="changeRescheduleWeek(1)">
                            Следующая неделя
                            <i class="fas fa-chevron-right"></i>
                        </button>
                    </div>
                    <div class="schedule-mini-table" id="scheduleMiniTable">
                        <!-- Мини-расписание будет загружено здесь -->
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="modal-btn secondary" onclick="closeRescheduleModal()">Отмена</button>
                <button class="modal-btn primary" onclick="confirmReschedule(${rescheduleInfo.lessonId})" id="confirmRescheduleBtn" disabled>
                    <i class="fas fa-calendar-alt"></i>
                    Подтвердить перенос
                </button>
            </div>
        </div>
    `;
    
    // Добавляем стили для модального окна
    if (!document.querySelector('#rescheduleModalStyles')) {
        const styles = document.createElement('style');
        styles.id = 'rescheduleModalStyles';
        styles.textContent = `
            .reschedule-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }
            
            .reschedule-modal .modal-content {
                background: white;
                border-radius: 12px;
                max-width: 800px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            }
            
            .reschedule-modal .modal-header {
                padding: 1.5rem;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .reschedule-modal .modal-header h3 {
                margin: 0;
                color: #1e293b;
                font-size: 1.25rem;
            }
            
            .reschedule-modal .modal-close {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: #64748b;
                padding: 0.25rem;
                border-radius: 4px;
                transition: background 0.3s ease;
            }
            
            .reschedule-modal .modal-close:hover {
                background: #f1f5f9;
            }
            
            .reschedule-modal .modal-body {
                padding: 1.5rem;
            }
            
            .schedule-preview {
                margin: 1.5rem 0;
            }
            
            .schedule-preview h4 {
                margin: 0 0 1rem 0;
                color: #1e293b;
                font-size: 1.1rem;
            }
            
            .schedule-mini-table {
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                overflow: hidden;
                max-height: 300px;
                overflow-y: auto;
            }
            
            .schedule-mini-table table {
                width: 100%;
                border-collapse: collapse;
                font-size: 0.875rem;
            }
            
            .schedule-mini-table th {
                background: #f8fafc;
                padding: 0.5rem;
                text-align: center;
                font-weight: 600;
                color: #374151;
                border-bottom: 1px solid #e2e8f0;
            }
            
            .schedule-mini-table td {
                padding: 0.25rem;
                border: 1px solid #e2e8f0;
                text-align: center;
                cursor: pointer;
                transition: all 0.2s ease;
                min-height: 30px;
                vertical-align: middle;
            }
            
            .schedule-mini-table .time-slot {
                background: #f8fafc;
                font-weight: 600;
                color: #374151;
                font-size: 0.75rem;
            }
            
            .schedule-mini-table .available-slot {
                background: #dcfce7;
                color: #166534;
                cursor: pointer;
            }
            
            .schedule-mini-table .available-slot:hover {
                background: #bbf7d0;
                transform: scale(1.05);
            }
            
            .schedule-mini-table .empty-slot {
                background: #f8fafc;
                color: #64748b;
                cursor: pointer;
            }
            
            .schedule-mini-table .empty-slot:hover {
                background: #e2e8f0;
                transform: scale(1.05);
            }
            
            .schedule-mini-table .selected-slot {
                background: #3b82f6;
                color: white;
                font-weight: 600;
            }
            
            .schedule-mini-table .booked-slot {
                background: #fecaca;
                color: #dc2626;
                cursor: not-allowed;
                opacity: 0.7;
            }
            
            .schedule-mini-table .cancelled-slot {
                background: #f1f5f9;
                color: #64748b;
                cursor: not-allowed;
                opacity: 0.7;
            }
            
            .schedule-mini-table .past-slot {
                background: #9ca3af;
                color: #6b7280;
                cursor: not-allowed;
                opacity: 0.5;
            }
            
            .reschedule-modal .modal-footer {
                padding: 1.5rem;
                border-top: 1px solid #e2e8f0;
                display: flex;
                gap: 1rem;
                justify-content: flex-end;
            }
            
            .modal-btn {
                padding: 0.75rem 1.5rem;
                border-radius: 8px;
                border: none;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .modal-btn.primary {
                background: #3b82f6;
                color: white;
            }
            
            .modal-btn.primary:hover:not(:disabled) {
                background: #2563eb;
                transform: translateY(-2px);
            }
            
            .modal-btn.primary:disabled {
                background: #9ca3af;
                cursor: not-allowed;
                transform: none;
            }
            
            .modal-btn.secondary {
                background: #f1f5f9;
                color: #64748b;
            }
            
            .modal-btn.secondary:hover {
                background: #e2e8f0;
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(modal);
    
    // Обработчики для модального окна
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.addEventListener('click', closeRescheduleModal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeRescheduleModal();
        }
    });
    
    // Инициализируем переменную для отслеживания недели
    window.currentRescheduleWeek = 0;
    
    // Загружаем мини-расписание
    loadMiniSchedule(rescheduleInfo.lessonId);
}

function closeRescheduleModal() {
    const modal = document.querySelector('.reschedule-modal');
    if (modal) {
        modal.remove();
    }
}

function loadMiniSchedule(lessonId) {
    // Загружаем расписание преподавателя для выбора нового времени
    const weekOffset = window.currentRescheduleWeek || 0;
    fetch(`/api/teacher/schedule?weekOffset=${weekOffset}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data && data.schedules) {
            displayMiniSchedule(data.schedules, data.lessons, lessonId);
            updateWeekDisplay(weekOffset);
        }
    })
    .catch(error => {
        console.error('Ошибка загрузки расписания:', error);
        showToast('Ошибка загрузки расписания', 'error');
    });
}

function changeRescheduleWeek(direction) {
    window.currentRescheduleWeek = (window.currentRescheduleWeek || 0) + direction;
    
    // Получаем lessonId из кнопки подтверждения
    const confirmBtn = document.getElementById('confirmRescheduleBtn');
    const lessonId = confirmBtn ? confirmBtn.getAttribute('onclick').match(/\d+/)[0] : null;
    
    if (lessonId) {
        loadMiniSchedule(lessonId);
    }
}

function updateWeekDisplay(weekOffset) {
    const weekDisplay = document.getElementById('currentWeekDisplay');
    if (!weekDisplay) return;
    
    const now = new Date();
    const weekStart = new Date(now);
    
    // Получаем понедельник текущей недели
    const dayOfWeek = now.getDay();
    let daysToMonday;
    if (dayOfWeek === 0) {
        daysToMonday = 6;
    } else {
        daysToMonday = dayOfWeek - 1;
    }
    weekStart.setDate(now.getDate() - daysToMonday);
    weekStart.setHours(0, 0, 0, 0);
    
    // Добавляем смещение недели
    weekStart.setDate(weekStart.getDate() + (weekOffset * 7));
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const formatDate = (date) => {
        return date.toLocaleDateString('ru-RU', { 
            day: 'numeric', 
            month: 'short' 
        });
    };
    
    weekDisplay.innerHTML = `
        <div class="week-range">
            <strong>${formatDate(weekStart)} - ${formatDate(weekEnd)}</strong>
        </div>
        <div class="week-label">
            ${weekOffset === 0 ? 'Текущая неделя' : 
              weekOffset > 0 ? `Через ${weekOffset} недель` : 
              `На ${Math.abs(weekOffset)} недель назад`}
        </div>
    `;
}

function displayMiniSchedule(schedulesData, lessonsData, lessonId) {
    const miniTable = document.getElementById('scheduleMiniTable');
    if (!miniTable) return;
    
    // Очищаем содержимое контейнера
    miniTable.innerHTML = '';
    
    // Создаем мини-таблицу расписания
    const table = document.createElement('table');
    
    // Получаем даты для текущей недели
    const weekDates = getWeekDates(window.currentRescheduleWeek || 0);
    
    // Заголовки дней недели
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `
        <th class="time-slot">Время</th>
        <th>Пн<br><small>${weekDates[0]}</small></th>
        <th>Вт<br><small>${weekDates[1]}</small></th>
        <th>Ср<br><small>${weekDates[2]}</small></th>
        <th>Чт<br><small>${weekDates[3]}</small></th>
        <th>Пт<br><small>${weekDates[4]}</small></th>
        <th>Сб<br><small>${weekDates[5]}</small></th>
        <th>Вс<br><small>${weekDates[6]}</small></th>
    `;
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Тело таблицы
    const tbody = document.createElement('tbody');
    
    // Временные слоты (с 12:00 до 22:00)
    const timeSlots = [];
    for (let hour = 12; hour <= 22; hour++) {
        timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    
    // Маппинг дней недели
    const dayMapping = {
        'MONDAY': 0,
        'TUESDAY': 1,
        'WEDNESDAY': 2,
        'THURSDAY': 3,
        'FRIDAY': 4,
        'SATURDAY': 5,
        'SUNDAY': 6
    };
    
    timeSlots.forEach(timeSlot => {
        const row = document.createElement('tr');
        
        // Ячейка времени
        const timeCell = document.createElement('td');
        timeCell.className = 'time-slot';
        timeCell.textContent = timeSlot;
        row.appendChild(timeCell);
        
        // Ячейки для каждого дня недели
        for (let day = 0; day < 7; day++) {
            const cell = document.createElement('td');
            
            // Находим день недели по индексу
            const dayName = Object.keys(dayMapping).find(key => dayMapping[key] === day);
            
            if (dayName) {
                const hour = parseInt(timeSlot.split(':')[0]);
                
                // Проверяем, есть ли урок в это время
                const lessonAtThisTime = findLessonAtTime(lessonsData, dayName, timeSlot);
                
                if (lessonAtThisTime) {
                    // Занятый слот
                    if (lessonAtThisTime.status === 'CANCELLED') {
                        cell.className = 'cancelled-slot';
                        cell.textContent = 'Отменён';
                    } else {
                        cell.className = 'booked-slot';
                        cell.textContent = 'Занято';
                    }
                } else {
                    // Проверяем, есть ли доступное время в расписании
                    const scheduleForThisTime = schedulesData.find(schedule => {
                        return schedule.dayOfWeek === dayName && 
                               isTimeInRange(timeSlot, schedule.startTime, schedule.endTime) && 
                               schedule.isAvailable;
                    });
                    
                    if (scheduleForThisTime) {
                        // Доступное время (зеленое)
                        cell.className = 'available-slot';
                        cell.textContent = 'Доступно';
                        cell.setAttribute('data-day', dayName);
                        cell.setAttribute('data-time', timeSlot);
                        cell.addEventListener('click', () => selectTimeSlot(cell, dayName, timeSlot));
                    } else {
                        // Пустое время (белое)
                        cell.className = 'empty-slot';
                        cell.textContent = 'Пусто';
                        cell.setAttribute('data-day', dayName);
                        cell.setAttribute('data-time', timeSlot);
                        cell.addEventListener('click', () => selectTimeSlot(cell, dayName, timeSlot));
                    }
                }
            }
            
            row.appendChild(cell);
        }
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    miniTable.appendChild(table);
}

function selectTimeSlot(cell, dayName, timeSlot) {
    // Убираем выделение со всех ячеек
    const allCells = document.querySelectorAll('.schedule-mini-table td');
    allCells.forEach(c => c.classList.remove('selected-slot'));
    
    // Выделяем выбранную ячейку
    cell.classList.add('selected-slot');
    
    // Активируем кнопку подтверждения
    const confirmBtn = document.getElementById('confirmRescheduleBtn');
    if (confirmBtn) {
        confirmBtn.disabled = false;
    }
    
    // Сохраняем выбранное время
    window.selectedRescheduleTime = {
        day: dayName,
        time: timeSlot
    };
}

function confirmReschedule(lessonId) {
    if (!window.selectedRescheduleTime) {
        showToast('Пожалуйста, выберите новое время для урока', 'warning');
        return;
    }
    
    // Создаем новую дату на основе выбранного времени
    const { day, time } = window.selectedRescheduleTime;
    const newDate = createDateFromDayAndTime(day, time);
    
    if (!newDate) {
        showToast('Ошибка при создании новой даты', 'error');
        return;
    }
    
    // Показываем индикатор загрузки
    const confirmBtn = document.getElementById('confirmRescheduleBtn');
    const originalText = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Перенос...';
    confirmBtn.disabled = true;
    
    fetch(`/api/teacher/lesson/${lessonId}/reschedule`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            reason: 'Перенос урока',
            newDate: newDate.toISOString()
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('Урок успешно перенесен', 'success');
            closeRescheduleModal();
            
            // Перезагружаем уроки
            loadTeacherLessons();
            
            // Если есть штраф, показываем уведомление
            if (data.penaltyAmount > 0) {
                setTimeout(() => {
                    showToast(`Внимание! За перенос урока взимается штраф ${data.penaltyAmount}₽`, 'warning');
                }, 1000);
            }
        } else {
            showToast(data.error || 'Ошибка при переносе урока', 'error');
            // Восстанавливаем кнопку
            confirmBtn.innerHTML = originalText;
            confirmBtn.disabled = false;
        }
    })
    .catch(error => {
        console.error('Ошибка при переносе урока:', error);
        showToast('Ошибка при переносе урока', 'error');
        // Восстанавливаем кнопку
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
    });
}

function createDateFromDayAndTime(dayName, timeSlot) {
    const now = new Date();
    const weekStart = new Date(now);
    
    // Получаем понедельник текущей недели
    const dayOfWeek = now.getDay();
    let daysToMonday;
    if (dayOfWeek === 0) {
        daysToMonday = 6;
    } else {
        daysToMonday = dayOfWeek - 1;
    }
    weekStart.setDate(now.getDate() - daysToMonday);
    weekStart.setHours(0, 0, 0, 0);
    
    // Добавляем смещение недели
    const weekOffset = window.currentRescheduleWeek || 0;
    weekStart.setDate(weekStart.getDate() + (weekOffset * 7));
    
    // Маппинг дней недели
    const dayMapping = {
        'MONDAY': 0,
        'TUESDAY': 1,
        'WEDNESDAY': 2,
        'THURSDAY': 3,
        'FRIDAY': 4,
        'SATURDAY': 5,
        'SUNDAY': 6
    };
    
    const dayIndex = dayMapping[dayName];
    if (dayIndex === undefined) return null;
    
    // Создаем дату для выбранного дня
    const targetDate = new Date(weekStart);
    targetDate.setDate(weekStart.getDate() + dayIndex);
    
    // Добавляем время
    const [hour, minute] = timeSlot.split(':').map(Number);
    targetDate.setHours(hour, minute, 0, 0);
    
    return targetDate;
}

// Вспомогательные функции для работы с расписанием
function findLessonAtTime(lessonsData, dayName, timeSlot) {
    if (!lessonsData || !Array.isArray(lessonsData)) return null;
    
    const [hour, minute] = timeSlot.split(':').map(Number);
    const targetTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
    
    return lessonsData.find(lesson => {
        const lessonDate = new Date(lesson.lessonDate);
        const lessonDay = getDayOfWeek(lessonDate);
        const lessonTime = lessonDate.toTimeString().substring(0, 8);
        
        return lessonDay === dayName && lessonTime === targetTime;
    });
}

function isTimeInRange(timeSlot, startTime, endTime) {
    const [hour, minute] = timeSlot.split(':').map(Number);
    const slotTime = hour * 60 + minute;
    
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMinute;
    
    const [endHour, endMinute] = endTime.split(':').map(Number);
    const endMinutes = endHour * 60 + endMinute;
    
    return slotTime >= startMinutes && slotTime < endMinutes;
}

function getDayOfWeek(date) {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[date.getDay()];
}

function getWeekDates(weekOffset) {
    const now = new Date();
    const weekStart = new Date(now);
    
    // Получаем понедельник текущей недели
    const dayOfWeek = now.getDay();
    let daysToMonday;
    if (dayOfWeek === 0) {
        daysToMonday = 6;
    } else {
        daysToMonday = dayOfWeek - 1;
    }
    weekStart.setDate(now.getDate() - daysToMonday);
    weekStart.setHours(0, 0, 0, 0);
    
    // Добавляем смещение недели
    weekStart.setDate(weekStart.getDate() + (weekOffset * 7));
    
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        weekDates.push(date.getDate());
    }
    
    return weekDates;
}

function cancelLesson(lessonId) {
    console.log('Отмена урока:', lessonId);
    
    // Получаем информацию об отмене урока
    fetch(`/api/teacher/lesson/${lessonId}/cancellation-info`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showToast(data.error, 'error');
            return;
        }
        
        // Показываем модальное окно отмены
        showCancellationModal(data);
    })
    .catch(error => {
        console.error('Ошибка при получении информации об отмене:', error);
        showToast('Ошибка при получении информации об отмене', 'error');
    });
}

function showCancellationModal(cancellationInfo) {
    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.className = 'cancellation-modal';
    
    const penaltyText = cancellationInfo.penaltyAmount > 0 
        ? `<div class="penalty-warning">
             <i class="fas fa-exclamation-triangle"></i>
             <strong>Внимание!</strong> За отмену этого урока будет взиматься штраф ${cancellationInfo.penaltyAmount}₽
             <br><small>${cancellationInfo.penaltyReason}</small>
           </div>`
        : `<div class="no-penalty">
             <i class="fas fa-check-circle"></i>
             Отмена урока бесплатна
           </div>`;
    
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Отмена урока</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="lesson-info-summary">
                    <div class="info-item">
                        <strong>Предмет:</strong> ${cancellationInfo.subjectName}
                    </div>
                    <div class="info-item">
                        <strong>Ученик:</strong> ${cancellationInfo.studentName}
                    </div>
                    <div class="info-item">
                        <strong>Дата и время:</strong> ${new Date(cancellationInfo.lessonDate).toLocaleString('ru-RU')}
                    </div>
                    <div class="info-item">
                        <strong>До урока осталось:</strong> ${cancellationInfo.hoursUntilLesson >= 0 ? cancellationInfo.hoursUntilLesson + ' часов' : 'Урок уже прошел'}
                    </div>
                </div>
                
                <div class="cancellation-stats">
                    <div class="stat-item">
                        <span class="stat-label">Отмен в этом месяце:</span>
                        <span class="stat-value">${cancellationInfo.cancellationsThisMonth}/5</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Бесплатных отмен осталось:</span>
                        <span class="stat-value">${cancellationInfo.freeCancellationsLeft}</span>
                    </div>
                </div>
                
                ${penaltyText}
                
                <div class="reason-input">
                    <label for="cancellation-reason">Причина отмены:</label>
                    <textarea id="cancellation-reason" placeholder="Укажите причину отмены урока..." rows="3"></textarea>
                </div>
            </div>
            <div class="modal-footer">
                <button class="modal-btn secondary" onclick="closeCancellationModal()">Отмена</button>
                <button class="modal-btn danger" onclick="confirmCancellation(${cancellationInfo.lessonId})">
                    <i class="fas fa-times"></i>
                    Подтвердить отмену
                </button>
            </div>
        </div>
    `;
    
    // Добавляем стили для модального окна
    if (!document.querySelector('#cancellationModalStyles')) {
        const styles = document.createElement('style');
        styles.id = 'cancellationModalStyles';
        styles.textContent = `
            .cancellation-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }
            
            .cancellation-modal .modal-content {
                background: white;
                border-radius: 12px;
                max-width: 500px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            }
            
            .cancellation-modal .modal-header {
                padding: 1.5rem;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .cancellation-modal .modal-header h3 {
                margin: 0;
                color: #1e293b;
                font-size: 1.25rem;
            }
            
            .cancellation-modal .modal-close {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: #64748b;
                padding: 0.25rem;
                border-radius: 4px;
                transition: background 0.3s ease;
            }
            
            .cancellation-modal .modal-close:hover {
                background: #f1f5f9;
            }
            
            .cancellation-modal .modal-body {
                padding: 1.5rem;
            }
            
            .lesson-info-summary {
                background: #f8fafc;
                border-radius: 8px;
                padding: 1rem;
                margin-bottom: 1rem;
            }
            
            .info-item {
                margin-bottom: 0.5rem;
                display: flex;
                justify-content: space-between;
            }
            
            .info-item:last-child {
                margin-bottom: 0;
            }
            
            .cancellation-stats {
                display: flex;
                gap: 1rem;
                margin-bottom: 1rem;
            }
            
            .stat-item {
                flex: 1;
                background: #f1f5f9;
                padding: 0.75rem;
                border-radius: 6px;
                text-align: center;
            }
            
            .stat-label {
                display: block;
                font-size: 0.875rem;
                color: #64748b;
                margin-bottom: 0.25rem;
            }
            
            .stat-value {
                display: block;
                font-weight: 600;
                color: #1e293b;
                font-size: 1.125rem;
            }
            
            .penalty-warning {
                background: #fef2f2;
                border: 1px solid #fecaca;
                color: #dc2626;
                padding: 1rem;
                border-radius: 8px;
                margin-bottom: 1rem;
                text-align: center;
            }
            
            .penalty-warning i {
                font-size: 1.5rem;
                margin-bottom: 0.5rem;
                display: block;
            }
            
            .no-penalty {
                background: #dcfce7;
                border: 1px solid #bbf7d0;
                color: #166534;
                padding: 1rem;
                border-radius: 8px;
                margin-bottom: 1rem;
                text-align: center;
            }
            
            .no-penalty i {
                font-size: 1.5rem;
                margin-bottom: 0.5rem;
                display: block;
            }
            
            .reason-input {
                margin-bottom: 1rem;
            }
            
            .reason-input label {
                display: block;
                margin-bottom: 0.5rem;
                font-weight: 600;
                color: #374151;
            }
            
            .reason-input textarea {
                width: 100%;
                padding: 0.75rem;
                border: 1px solid #d1d5db;
                border-radius: 6px;
                font-family: inherit;
                font-size: 0.875rem;
                resize: vertical;
                min-height: 80px;
            }
            
            .reason-input textarea:focus {
                outline: none;
                border-color: #a3e635;
                box-shadow: 0 0 0 3px rgba(163, 230, 53, 0.1);
            }
            
            .cancellation-modal .modal-footer {
                padding: 1.5rem;
                border-top: 1px solid #e2e8f0;
                display: flex;
                gap: 1rem;
                justify-content: flex-end;
            }
            
            .modal-btn {
                padding: 0.75rem 1.5rem;
                border-radius: 8px;
                border: none;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }
            
            .modal-btn.secondary {
                background: #f1f5f9;
                color: #64748b;
            }
            
            .modal-btn.secondary:hover {
                background: #e2e8f0;
            }
            
            .modal-btn.danger {
                background: #dc2626;
                color: white;
            }
            
            .modal-btn.danger:hover {
                background: #b91c1c;
                transform: translateY(-2px);
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(modal);
    
    // Обработчики для модального окна
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.addEventListener('click', closeCancellationModal);
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeCancellationModal();
        }
    });
}

function closeCancellationModal() {
    const modal = document.querySelector('.cancellation-modal');
    if (modal) {
        modal.remove();
    }
}

function confirmCancellation(lessonId) {
    const reasonTextarea = document.querySelector('#cancellation-reason');
    const reason = reasonTextarea ? reasonTextarea.value.trim() : '';
    
    if (!reason) {
        showToast('Пожалуйста, укажите причину отмены', 'warning');
        return;
    }
    
    // Показываем индикатор загрузки
    const confirmBtn = document.querySelector('.cancellation-modal .modal-btn.danger');
    const originalText = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отмена...';
    confirmBtn.disabled = true;
    
    fetch(`/api/teacher/lesson/${lessonId}/cancel`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason: reason })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showToast('Урок успешно отменен', 'success');
            closeCancellationModal();
            
            // Перезагружаем уроки
            loadTeacherLessons();
            
            // Если есть штраф, показываем уведомление
            if (data.penaltyAmount > 0) {
                setTimeout(() => {
                    showToast(`Внимание! За отмену урока взимается штраф ${data.penaltyAmount}₽`, 'warning');
                }, 1000);
            }
        } else {
            showToast(data.error || 'Ошибка при отмене урока', 'error');
            // Восстанавливаем кнопку
            confirmBtn.innerHTML = originalText;
            confirmBtn.disabled = false;
        }
    })
    .catch(error => {
        console.error('Ошибка при отмене урока:', error);
        showToast('Ошибка при отмене урока', 'error');
        // Восстанавливаем кнопку
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
    });
}

// Функции для работы с вкладками
function switchToTab(targetTab) {
    const sidebarItems = document.querySelectorAll('.sidebar-item[data-tab]');
    const tabs = document.querySelectorAll('.dashboard-tab');
    
    sidebarItems.forEach(otherItem => otherItem.classList.remove('active'));
    tabs.forEach(tab => tab.classList.remove('active'));
    
    const sidebarItem = document.querySelector(`.sidebar-item[data-tab="${targetTab}"]`);
    if (sidebarItem) sidebarItem.classList.add('active');
    
    const targetTabElement = document.getElementById(targetTab);
    if (targetTabElement) targetTabElement.classList.add('active');
    
    // Обновляем заголовок
    const pageTitle = document.querySelector('.page-title');
    if (pageTitle && sidebarItem) {
        const span = sidebarItem.querySelector('span');
        if (span) pageTitle.textContent = span.textContent;
    }
    
    if (targetTab === 'schedule-tab') loadTeacherSchedule();
    if (targetTab === 'equipment-tab') initEquipmentCheck();
    if (targetTab === 'notes-tab') loadTeacherNotes();
    if (targetTab === 'students-tab') loadTeacherStudents();
    if (targetTab === 'tests-tab') loadTeacherTestsSection();
    if (targetTab === 'messages-tab' && window.brainifyChat) window.brainifyChat.init();
    
    if (window.innerWidth <= 768) {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.classList.remove('open');
        const overlay = document.querySelector('.sidebar-overlay');
        if (overlay) overlay.remove();
    }
}

function initTabSwitching() {
    const sidebarItems = document.querySelectorAll('.sidebar-item[data-tab]');
    
    sidebarItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            switchToTab(this.getAttribute('data-tab'));
        });
    });
    
    // Кнопка "Сообщения" в шапке → переключает на вкладку сообщений
    const headerMessagesBtn = document.getElementById('headerMessagesBtn');
    if (headerMessagesBtn) {
        headerMessagesBtn.addEventListener('click', function() {
            switchToTab('messages-tab');
        });
    }
}

// Функции для работы с расписанием
let currentWeekStart = new Date();
let currentWeekOffset = 0;



function initScheduleControls() {
    const prevWeekBtn = document.getElementById('prevWeekBtn');
    const nextWeekBtn = document.getElementById('nextWeekBtn');
    const saveScheduleBtn = document.getElementById('save-schedule-btn');
    const resetScheduleBtn = document.getElementById('reset-schedule-btn');
    
    // Проверяем, не были ли уже добавлены обработчики
    if (prevWeekBtn && !prevWeekBtn.hasAttribute('data-initialized')) {
        prevWeekBtn.addEventListener('click', () => {
            currentWeekOffset--;
            loadTeacherSchedule();
            // Обновляем индикатор после загрузки расписания
            setTimeout(updateCurrentTimeIndicator, 100);
        });
        prevWeekBtn.setAttribute('data-initialized', 'true');
    }
    
    if (nextWeekBtn && !nextWeekBtn.hasAttribute('data-initialized')) {
        nextWeekBtn.addEventListener('click', () => {
            currentWeekOffset++;
            loadTeacherSchedule();
            // Обновляем индикатор после загрузки расписания
            setTimeout(updateCurrentTimeIndicator, 100);
        });
        nextWeekBtn.setAttribute('data-initialized', 'true');
    }
    
    if (saveScheduleBtn && !saveScheduleBtn.hasAttribute('data-initialized')) {
        saveScheduleBtn.addEventListener('click', saveScheduleChanges);
        saveScheduleBtn.setAttribute('data-initialized', 'true');
    }
    
    if (resetScheduleBtn && !resetScheduleBtn.hasAttribute('data-initialized')) {
        resetScheduleBtn.addEventListener('click', resetScheduleChanges);
        resetScheduleBtn.setAttribute('data-initialized', 'true');
    }
}

// Обработчик клика по слоту
function handleSlotClick(slot) {
    const currentClass = slot.className;
    
    console.log('Клик по слоту:', {
        className: currentClass,
        day: slot.getAttribute('data-day'),
        hour: slot.getAttribute('data-hour')
    });
    
    // Проверяем, не является ли слот занятым, прошедшим или отмененным
    if (currentClass.includes('booked')) {
        showToast('Этот слот занят учеником и не может быть изменен', 'warning');
        return;
    }
    
    if (currentClass.includes('cancelled')) {
        showToast('Этот урок отменен и не может быть изменен', 'warning');
        return;
    }
    
    if (currentClass.includes('past')) {
        showToast('Этот слот относится к прошедшему времени и не может быть изменен', 'warning');
        return;
    }
    
    if (currentClass.includes('empty')) {
        // Пустой слот - делаем доступным для добавления
        slot.className = 'schedule-slot selected';
        slot.innerHTML = '<i class="fas fa-plus"></i><br>Добавить';
        showToast('Слот помечен для добавления в расписание', 'info');
    } else if (currentClass.includes('selected')) {
        // Выбранный слот - возвращаем в пустой
        slot.className = 'schedule-slot empty';
        slot.innerHTML = '';
        showToast('Слот убран из списка для добавления', 'info');
    } else if (currentClass.includes('available')) {
        // Доступный слот - помечаем для удаления
        slot.className = 'schedule-slot to-delete';
        slot.innerHTML = '<i class="fas fa-trash"></i><br>Удалить';
        showToast('Слот помечен для удаления из расписания', 'warning');
    } else if (currentClass.includes('to-delete')) {
        // Слот для удаления - возвращаем в доступный
        slot.className = 'schedule-slot available';
        slot.innerHTML = 'Доступно';
        showToast('Слот убран из списка для удаления', 'info');
    }
    
    // Обновляем состояние кнопок после изменения
    updateScheduleButtonsState();
}

// Функция для обновления состояния кнопок управления расписанием
function updateScheduleButtonsState() {
    const selectedSlots = document.querySelectorAll('.schedule-slot.selected');
    const slotsToDelete = document.querySelectorAll('.schedule-slot.to-delete');
    const saveBtn = document.getElementById('save-schedule-btn');
    const resetBtn = document.getElementById('reset-schedule-btn');
    
    const hasChanges = selectedSlots.length > 0 || slotsToDelete.length > 0;
    
    if (saveBtn) {
        if (hasChanges) {
            saveBtn.disabled = false;
            saveBtn.classList.remove('disabled');
            let btnText = 'Сохранить изменения';
            if (selectedSlots.length > 0) {
                btnText += ` (+${selectedSlots.length})`;
            }
            if (slotsToDelete.length > 0) {
                btnText += ` (-${slotsToDelete.length})`;
            }
            saveBtn.innerHTML = `<i class="fas fa-save"></i> ${btnText}`;
        } else {
            saveBtn.disabled = true;
            saveBtn.classList.add('disabled');
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Нет изменений';
        }
    }
    
    if (resetBtn) {
        if (hasChanges) {
            resetBtn.disabled = false;
            resetBtn.classList.remove('disabled');
            resetBtn.innerHTML = '<i class="fas fa-undo"></i> Отменить изменения';
        } else {
            resetBtn.disabled = true;
            resetBtn.classList.add('disabled');
            resetBtn.innerHTML = '<i class="fas fa-undo"></i> Нет изменений';
        }
    }
}

// Сохранение изменений расписания
async function saveScheduleChanges() {
    try {
        const selectedSlots = [];
        const slotsToDelete = [];
        
        // Собираем все слоты
        const slots = document.querySelectorAll('.schedule-slot');
        
        slots.forEach(slot => {
            const slotId = slot.getAttribute('data-slot-id');
            const day = slot.getAttribute('data-day');
            const hour = slot.getAttribute('data-hour');
            
            // Проверяем, не является ли слот прошедшим или отмененным
            if (day && hour !== null) {
                const dayIndex = getDayIndex(day);
                const isPast = isPastDay(dayIndex) || isPastTime(dayIndex, parseInt(hour));
                const isCancelled = slot.className.includes('cancelled');
                
                if (isPast) {
                    console.log('Пропускаем прошедший слот:', day, hour);
                    return; // Пропускаем прошедшие слоты
                }
                
                if (isCancelled) {
                    console.log('Пропускаем отмененный слот:', day, hour);
                    return; // Пропускаем отмененные слоты
                }
            }
            
            if (slot.className.includes('selected')) {
                // Новые слоты для добавления
                const startHour = parseInt(hour);
                const endHour = startHour + 1;
                
                // Исправляем проблему с 24:00 -> 00:00
                const startTime = `${startHour.toString().padStart(2, '0')}:00`;
                const endTime = endHour === 24 ? '00:00' : `${endHour.toString().padStart(2, '0')}:00`;
                
                selectedSlots.push({
                    dayOfWeek: day,
                    startTime: startTime,
                    endTime: endTime
                });
            } else if (slot.className.includes('to-delete')) {
                // Слоты для удаления
                const scheduleId = slot.getAttribute('data-schedule-id');
                if (scheduleId) {
                    const startHour = parseInt(hour);
                    const endHour = startHour + 1;
                    
                    // Исправляем проблему с 24:00 -> 00:00
                    const startTime = `${startHour.toString().padStart(2, '0')}:00`;
                    const endTime = endHour === 24 ? '00:00' : `${endHour.toString().padStart(2, '0')}:00`;
                    
                    slotsToDelete.push({
                        id: scheduleId,
                        dayOfWeek: day,
                        startTime: startTime,
                        endTime: endTime
                    });
                }
            }
        });
        
        // Проверяем, есть ли изменения для сохранения
        if (selectedSlots.length === 0 && slotsToDelete.length === 0) {
            showToast('Нет изменений для сохранения', 'info');
            return;
        }
        
        // Показываем информацию о том, что будет сохранено
        let message = '';
        if (selectedSlots.length > 0) {
            message += `Добавить: ${selectedSlots.length} слот(ов). `;
        }
        if (slotsToDelete.length > 0) {
            message += `Удалить: ${slotsToDelete.length} слот(ов). `;
        }
        
        const scheduleData = {
            selectedSlots: selectedSlots,
            slotsToDelete: slotsToDelete
        };
        
        const response = await fetch('/api/teacher/schedule', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(scheduleData)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast(`Расписание успешно обновлено! ${message}`, 'success');
            loadTeacherSchedule(); // Перезагружаем расписание
        } else {
            throw new Error(result.message || 'Ошибка сохранения');
        }
    } catch (error) {
        console.error('Ошибка сохранения расписания:', error);
        showToast('Ошибка сохранения: ' + error.message, 'error');
    }
}

// Отмена изменений расписания
function resetScheduleChanges() {
    // Проверяем, есть ли изменения для отмены
    const selectedSlots = document.querySelectorAll('.schedule-slot.selected');
    const slotsToDelete = document.querySelectorAll('.schedule-slot.to-delete');
    
    if (selectedSlots.length === 0 && slotsToDelete.length === 0) {
        showToast('Нет изменений для отмены', 'info');
        return;
    }
    

    
    loadTeacherSchedule(); // Перезагружаем расписание
    showToast('Все изменения отменены', 'info');
}

function loadTeacherSchedule() {
    console.log('Загрузка расписания преподавателя...');
    
    const scheduleLoading = document.getElementById('schedule-loading');
    const scheduleTableContainer = document.getElementById('schedule-table-container');
    const scheduleEmpty = document.getElementById('schedule-empty');
    
    // Показываем загрузчик
    if (scheduleLoading) scheduleLoading.style.display = 'flex';
    if (scheduleTableContainer) scheduleTableContainer.style.display = 'none';
    if (scheduleEmpty) scheduleEmpty.style.display = 'none';
    
    // Обновляем отображение текущей недели
    updateCurrentWeekDisplay();
    
    // Загружаем расписание (теперь оно содержит и уроки)
    fetch(`/api/teacher/schedule?weekOffset=${currentWeekOffset}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => {
        if (response.ok) {
            return response.json();
        } else {
            return response.text().then(text => {
                console.error('Ошибка сервера:', text);
                throw new Error(`Ошибка загрузки данных: ${response.status}`);
            });
        }
    })
    .then((scheduleData) => {
        console.log('Расписание загружено:', scheduleData);
        
        if (scheduleData && scheduleData.schedules) {
            displayTeacherScheduleWithLessons(scheduleData.schedules, scheduleData.lessons);
            
            // Отображаем информацию о часовом поясе
            if (scheduleData.teacherCity) {
                const timezoneInfo = document.getElementById('timezone-info');
                if (timezoneInfo) {
                    timezoneInfo.textContent = `Время указано по ${scheduleData.teacherCity}`;
                    timezoneInfo.style.display = 'block';
                }
            }
            
            // Обновляем состояние кнопок после загрузки расписания
            updateScheduleButtonsState();
        } else {
            console.error('Неверный формат данных расписания:', scheduleData);
            showScheduleEmpty();
        }
    })
    .catch(error => {
        console.error('Ошибка загрузки данных:', error);
        showScheduleEmpty();
        showToast('Ошибка загрузки данных: ' + error.message, 'error');
    })
    .finally(() => {
        if (scheduleLoading) scheduleLoading.style.display = 'none';
    });
}

function updateCurrentWeekDisplay() {
    const currentWeekElement = document.getElementById('currentWeek');
    if (currentWeekElement) {
        const weekStart = getWeekStart();
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        
        const startStr = weekStart.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
        const endStr = weekEnd.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
        
        currentWeekElement.textContent = `${startStr} - ${endStr}`;
    }
}

function getWeekStart() {
    const now = new Date();
    const weekStart = new Date(now);
    
    // Получаем понедельник текущей недели
    // В JavaScript: 0 = воскресенье, 1 = понедельник, ..., 6 = суббота
    const dayOfWeek = now.getDay();
    
    // Вычисляем количество дней до понедельника
    let daysToMonday;
    if (dayOfWeek === 0) { // Воскресенье
        daysToMonday = 6; // До понедельника текущей недели (6 дней назад)
    } else {
        daysToMonday = dayOfWeek - 1; // До понедельника текущей недели
    }
    
    // Устанавливаем на понедельник текущей недели
    weekStart.setDate(now.getDate() - daysToMonday);
    
    // Добавляем смещение недель
    weekStart.setDate(weekStart.getDate() + (currentWeekOffset * 7));
    
    // Устанавливаем время на начало дня
    weekStart.setHours(0, 0, 0, 0);
    
    return weekStart;
}

function updateDayDates() {
    const weekStart = getWeekStart();
    
    const dayNames = ['monday-date', 'tuesday-date', 'wednesday-date', 'thursday-date', 'friday-date', 'saturday-date', 'sunday-date'];
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(weekStart.getDate() + i);
        
        const dayElement = document.getElementById(dayNames[i]);
        if (dayElement) {
            dayElement.textContent = date.getDate();
        }
    }
}



function displayTeacherSchedule(scheduleData) {
    displayTeacherScheduleWithLessons(scheduleData, []);
}

function displayTeacherScheduleWithLessons(schedulesData, lessonsData) {
    const scheduleTableContainer = document.getElementById('schedule-table-container');
    const scheduleEmpty = document.getElementById('schedule-empty');
    const scheduleTableBody = document.getElementById('scheduleTableBody');
    
    if (!scheduleTableBody) return;
    
    // Очищаем таблицу
    scheduleTableBody.innerHTML = '';
    
    console.log('Отображение расписания преподавателя с уроками:', schedulesData, lessonsData);
    
    // Обновляем даты в заголовках после загрузки данных
    updateDayDates();
    
    // Скрываем сообщение об отсутствии расписания
    if (scheduleEmpty) scheduleEmpty.style.display = 'none';
    if (scheduleTableContainer) scheduleTableContainer.style.display = 'block';
    
    // Создаем временные слоты (с 12:00 до 23:00, чтобы избежать проблем с 24:00)
    const timeSlots = [];
    for (let hour = 12; hour <= 22; hour++) {
        timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    
    // Маппинг дней недели
    const dayMapping = {
        'MONDAY': 0,
        'TUESDAY': 1,
        'WEDNESDAY': 2,
        'THURSDAY': 3,
        'FRIDAY': 4,
        'SATURDAY': 5,
        'SUNDAY': 6
    };
    
    // Создаем строки таблицы
    timeSlots.forEach(timeSlot => {
        const row = document.createElement('tr');
        
        // Добавляем ячейку времени
        const timeCell = document.createElement('td');
        timeCell.textContent = timeSlot;
        row.appendChild(timeCell);
        
        // Добавляем ячейки для каждого дня недели
        for (let day = 0; day < 7; day++) {
            const cell = document.createElement('td');
            
            // Находим день недели по индексу
            const dayName = Object.keys(dayMapping).find(key => dayMapping[key] === day);
            
            if (dayName) {
                // Создаем слот для каждого времени
                const slot = document.createElement('div');
                slot.className = 'schedule-slot empty';
                slot.setAttribute('data-day', dayName);
                slot.setAttribute('data-hour', timeSlot.split(':')[0]);
                slot.setAttribute('data-slot-id', `${dayName}_${timeSlot.split(':')[0]}`);
                
                // Проверяем, является ли день или время прошедшим
                const dayIndex = getDayIndex(dayName);
                const hour = parseInt(timeSlot.split(':')[0]);
                const isPast = isPastDay(dayIndex) || isPastTime(dayIndex, hour);
                
                // Ищем расписание для этого дня и времени
                const scheduleForThisTime = schedulesData.find(schedule => {
                    return schedule.dayOfWeek === dayName && 
                           isTimeInRange(timeSlot, schedule.startTime, schedule.endTime) && 
                           schedule.isAvailable;
                });
                
                if (scheduleForThisTime) {
                    // Проверяем, есть ли урок в это время
                    const lessonAtThisTime = findLessonAtTime(lessonsData, dayName, timeSlot);
                    
                    if (lessonAtThisTime) {
                        // Создаем ячейку с уроком
                        if (lessonAtThisTime.status === 'CANCELLED') {
                            // Отмененный урок
                            slot.className = 'schedule-slot cancelled';
                            slot.innerHTML = `
                                <div class="slot-subject">${lessonAtThisTime.subjectName}</div>
                                <div class="slot-student">${lessonAtThisTime.studentName}</div>
                                <div class="slot-status-cancelled">Отменён</div>
                            `;
                        } else if (isPast) {
                            slot.className = 'schedule-slot past';
                            slot.innerHTML = `
                                <div class="slot-subject">${lessonAtThisTime.subjectName}</div>
                                <div class="slot-student">${lessonAtThisTime.studentName}</div>
                                <div style="font-size: 0.6rem; opacity: 0.8;">Прошедший урок</div>
                            `;
                        } else {
                            slot.className = 'schedule-slot booked';
                            slot.innerHTML = `
                                <div class="slot-subject">${lessonAtThisTime.subjectName}</div>
                                <div class="slot-student">${lessonAtThisTime.studentName}</div>
                            `;
                        }
                        slot.setAttribute('data-lesson-id', lessonAtThisTime.lessonId);
                        // Занятые, прошедшие и отмененные слоты не кликабельны
                    } else {
                        // Создаем ячейку с доступным временем
                        if (isPast) {
                            slot.className = 'schedule-slot past';
                            slot.innerHTML = 'Прошедшее время';
                        } else {
                            slot.className = 'schedule-slot available';
                            slot.innerHTML = 'Доступно';
                            slot.setAttribute('data-schedule-id', scheduleForThisTime.id);
                            
                            // Добавляем обработчик клика только для непрошедших доступных слотов
                            slot.addEventListener('click', () => handleSlotClick(slot));
                            console.log('Добавлен обработчик клика для доступного слота:', dayName, timeSlot);
                        }
                    }
                    
                    // Добавляем информацию о часовом поясе
                    if (scheduleForThisTime.teacherCity) {
                        slot.setAttribute('title', `Время указано по ${scheduleForThisTime.teacherCity}`);
                    }
                } else {
                    // Пустой слот - можно кликать для добавления
                    if (isPast) {
                        slot.className = 'schedule-slot past';
                        slot.innerHTML = 'Прошедшее время';
                    } else {
                        slot.className = 'schedule-slot empty';
                        slot.innerHTML = '';
                        
                        // Добавляем обработчик клика только для непрошедших пустых слотов
                        slot.addEventListener('click', () => handleSlotClick(slot));
                        console.log('Добавлен обработчик клика для пустого слота:', dayName, timeSlot);
                    }
                }
                
                cell.appendChild(slot);
            }
            
            row.appendChild(cell);
        }
        
        scheduleTableBody.appendChild(row);
    });
    
    console.log('Таблица расписания преподавателя с уроками создана');
    
    // Создаем и обновляем индикатор текущего времени
    createCurrentTimeIndicator();
    updateCurrentTimeIndicator();
}

function findLessonAtTime(lessonsData, dayOfWeek, timeSlot) {
    if (!lessonsData || !Array.isArray(lessonsData)) return null;
    
    const targetHour = parseInt(timeSlot.split(':')[0]);
    
    return lessonsData.find(lesson => {
        return lesson.dayOfWeek === dayOfWeek && 
               parseInt(lesson.startTime.split(':')[0]) === targetHour;
    });
}

function isTimeInRange(timeSlot, startTime, endTime) {
    const slotTime = timeSlot;
    
    // Обрабатываем случай с 00:00 (полночь)
    if (endTime === '00:00') {
        return slotTime >= startTime && slotTime <= '23:59';
    }
    
    return slotTime >= startTime && slotTime < endTime;
}

// Функция для проверки, является ли день прошедшим
function isPastDay(dayIndex) {
    const now = new Date();
    const weekStart = getWeekStart();
    const targetDate = new Date(weekStart);
    targetDate.setDate(weekStart.getDate() + dayIndex);
    
    // Устанавливаем время на конец дня (23:59:59)
    targetDate.setHours(23, 59, 59, 999);
    
    return targetDate < now;
}

// Функция для проверки, является ли время прошедшим
function isPastTime(dayIndex, hour) {
    const now = new Date();
    const weekStart = getWeekStart();
    const targetDate = new Date(weekStart);
    targetDate.setDate(weekStart.getDate() + dayIndex);
    targetDate.setHours(hour, 0, 0, 0);
    
    return targetDate < now;
}

// Функция для получения индекса дня недели
function getDayIndex(dayName) {
    const dayMapping = {
        'MONDAY': 0,
        'TUESDAY': 1,
        'WEDNESDAY': 2,
        'THURSDAY': 3,
        'FRIDAY': 4,
        'SATURDAY': 5,
        'SUNDAY': 6
    };
    return dayMapping[dayName] || 0;
}

// Функция для создания и управления индикатором текущего времени
function createCurrentTimeIndicator() {
    const tableWrapper = document.querySelector('.schedule-table-wrapper');
    if (!tableWrapper) return;
    
    // Удаляем существующие индикаторы
    const existingIndicators = tableWrapper.querySelectorAll('.current-time-indicator');
    existingIndicators.forEach(indicator => indicator.remove());
    
    // Создаем индикатор для всей недели
    const indicator = document.createElement('div');
    indicator.className = 'current-time-indicator';
    tableWrapper.appendChild(indicator);
    
    return indicator;
}

// Функция для обновления позиции индикатора текущего времени
function updateCurrentTimeIndicator() {
    const indicator = document.querySelector('.current-time-indicator');
    if (!indicator) return;
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Получаем начало недели
    const weekStart = getWeekStart();
    
    // Вычисляем, является ли текущий день в пределах отображаемой недели
    const daysDiff = Math.floor((now - weekStart) / (1000 * 60 * 60 * 24));
    
    // Проверяем, находится ли текущее время в пределах отображаемого диапазона (12:00-22:00)
    if (currentHour < 12 || currentHour > 22 || daysDiff < 0 || daysDiff > 6) {
        indicator.style.display = 'none';
        return;
    }
    
    // Показываем индикатор
    indicator.style.display = 'block';
    
    // Вычисляем позицию по вертикали (время)
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    const startTimeInMinutes = 12 * 60; // 12:00
    const endTimeInMinutes = 23 * 60; // 23:00
    
    // Вычисляем процентное положение времени в диапазоне
    const timeProgress = Math.max(0, Math.min(1, (currentTimeInMinutes - startTimeInMinutes) / (endTimeInMinutes - startTimeInMinutes)));
    
    // Получаем высоту таблицы для вычисления позиции
    const table = document.querySelector('.schedule-table');
    if (!table) return;
    
    const tableHeight = table.offsetHeight;
    const headerHeight = table.querySelector('thead').offsetHeight;
    const bodyHeight = tableHeight - headerHeight;
    
    // Вычисляем позицию по вертикали
    const verticalPosition = headerHeight + (bodyHeight * timeProgress);
    
    // Получаем размеры таблицы для горизонтального позиционирования
    const tableWidth = table.offsetWidth;
    const timeColumnWidth = table.querySelector('.time-column').offsetWidth;
    
    // Устанавливаем позицию индикатора через всю неделю
    indicator.style.top = `${verticalPosition}px`;
    indicator.style.left = `${timeColumnWidth}px`;
    indicator.style.width = `${tableWidth - timeColumnWidth}px`;
    
    // Определяем, является ли текущий день прошедшим
    const isPastDay = daysDiff < 0;
    
    // Обновляем класс для прошедших дней
    if (isPastDay) {
        indicator.classList.add('past-day');
    } else {
        indicator.classList.remove('past-day');
    }
    
    // Добавляем подсказку с текущим временем
    const dayNames = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    const currentDayName = dayNames[now.getDay()];
    indicator.title = `Текущее время: ${now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} (${currentDayName})`;
}

// Функция больше не нужна, так как используем schedule-slot

function openScheduleDetails(startTime, endTime) {
    console.log('Открытие деталей расписания:', startTime, '-', endTime);
    showToast(`Время работы: ${startTime} - ${endTime}`, 'info');
}

function createLessonCell(lesson) {
    const lessonDiv = document.createElement('div');
    lessonDiv.className = 'lesson-cell booked-lesson';
    
    // Добавляем данные урока в стиле admin-lessons
    lessonDiv.innerHTML = `
        <div class="lesson-subject">${lesson.subjectName || 'Предмет не указан'}</div>
        <div class="lesson-student">${lesson.studentName || 'Ученик не указан'}</div>
    `;
    
    // Добавляем обработчик клика
    lessonDiv.addEventListener('click', () => {
        openLessonDetails(lesson);
    });
    
    return lessonDiv;
}

function showScheduleEmpty() {
    const scheduleTableContainer = document.getElementById('schedule-table-container');
    const scheduleEmpty = document.getElementById('schedule-empty');
    
    if (scheduleTableContainer) scheduleTableContainer.style.display = 'none';
    if (scheduleEmpty) scheduleEmpty.style.display = 'block';
}

// Функция для обновления отображения расписания без перезагрузки данных
function updateScheduleDisplay() {
    const slots = document.querySelectorAll('.schedule-slot');
    
    slots.forEach(slot => {
        const dayName = slot.getAttribute('data-day');
        const hour = parseInt(slot.getAttribute('data-hour'));
        
        if (dayName && hour !== null) {
            const dayIndex = getDayIndex(dayName);
            const isPast = isPastDay(dayIndex) || isPastTime(dayIndex, hour);
            const currentClass = slot.className;
            
            // Если слот стал прошедшим, обновляем его
            if (isPast && !currentClass.includes('past') && !currentClass.includes('booked') && !currentClass.includes('cancelled')) {
                slot.className = 'schedule-slot past';
                slot.innerHTML = 'Прошедшее время';
                
                // Удаляем обработчик клика
                const newSlot = slot.cloneNode(true);
                slot.parentNode.replaceChild(newSlot, slot);
            }
        }
    });
}

// Функция для обновления кнопок уроков
function updateLessonButtons() {
    const lessonCards = document.querySelectorAll('.lesson-card');
    
    lessonCards.forEach(card => {
        const lessonActions = card.querySelector('.lesson-actions');
        if (lessonActions) {
            // Получаем данные урока из карточки
            const lessonId = card.querySelector('[onclick*="joinLesson"]')?.getAttribute('onclick')?.match(/joinLesson\((\d+)\)/)?.[1];
            const lessonDate = card.querySelector('.lesson-time')?.textContent;
            
            if (lessonId && lessonDate) {
                // Пересоздаем кнопки с обновленной логикой
                const lesson = {
                    id: parseInt(lessonId),
                    lessonDate: lessonDate
                };
                
                // Определяем статус урока
                const status = getLessonStatus(lesson);
                
                // Пересоздаем действия
                const newActions = createCurrentLessonActions(lesson, status);
                lessonActions.innerHTML = newActions;
            }
        }
    });
}

function openLessonDetails(lesson) {
    console.log('Открытие деталей урока:', lesson);
    
    // Создаем модальное окно с деталями урока
    const modal = document.createElement('div');
    modal.className = 'lesson-details-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Детали урока</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="lesson-detail-item">
                    <strong>Предмет:</strong> ${lesson.subjectName || 'Не указан'}
                </div>
                <div class="lesson-detail-item">
                    <strong>Ученик:</strong> ${lesson.studentName || 'Не указан'}
                </div>
                <div class="lesson-detail-item">
                    <strong>Дата и время:</strong> ${new Date(lesson.lessonDate).toLocaleString('ru-RU')}
                </div>
                <div class="lesson-detail-item">
                    <strong>Статус:</strong> ${getStatusText(lesson.status)}
                </div>
                <div class="lesson-detail-item">
                    <strong>Описание:</strong> ${lesson.description || 'Описание отсутствует'}
                </div>
            </div>
            <div class="modal-footer">
                <button class="modal-btn secondary" onclick="this.closest('.lesson-details-modal').remove()">Закрыть</button>
                ${lesson.status !== 'COMPLETED' && lesson.status !== 'CANCELLED' ? 
                    `<button class="modal-btn primary" onclick="startLessonFromSchedule(${lesson.id})">Начать урок</button>` : 
                    ''
                }
            </div>
        </div>
    `;
    
    // Добавляем стили для модального окна
    if (!document.querySelector('#lessonDetailsModalStyles')) {
        const styles = document.createElement('style');
        styles.id = 'lessonDetailsModalStyles';
        styles.textContent = `
            .lesson-details-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            }
            
            .lesson-details-modal .modal-content {
                background: white;
                border-radius: 12px;
                max-width: 500px;
                width: 90%;
                max-height: 90vh;
                overflow-y: auto;
            }
            
            .lesson-details-modal .modal-header {
                padding: 1.5rem;
                border-bottom: 1px solid #e2e8f0;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .lesson-details-modal .modal-header h3 {
                margin: 0;
                color: #1e293b;
            }
            
            .lesson-details-modal .modal-close {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: #64748b;
            }
            
            .lesson-details-modal .modal-body {
                padding: 1.5rem;
            }
            
            .lesson-detail-item {
                margin-bottom: 1rem;
                padding: 0.75rem;
                background: #f8fafc;
                border-radius: 8px;
            }
            
            .lesson-details-modal .modal-footer {
                padding: 1.5rem;
                border-top: 1px solid #e2e8f0;
                display: flex;
                gap: 1rem;
                justify-content: flex-end;
            }
            
            .modal-btn {
                padding: 0.75rem 1.5rem;
                border-radius: 8px;
                border: none;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
            }
            
            .modal-btn.primary {
                background: linear-gradient(135deg, #a3e635, #84cc16);
                color: white;
            }
            
            .modal-btn.secondary {
                background: #e2e8f0;
                color: #64748b;
            }
            
            .modal-btn:hover {
                transform: translateY(-2px);
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(modal);
    
    // Обработчики для модального окна
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function startLessonFromSchedule(lessonId) {
    console.log('Начинаем урок из расписания:', lessonId);
    showToast('Функция начала урока будет реализована позже', 'info');
    // Закрываем модальное окно
    const modal = document.querySelector('.lesson-details-modal');
    if (modal) modal.remove();
}

// Добавляем функцию для тестирования расписания
window.testSchedule = function() {
    console.log('Тестирование загрузки расписания...');
    loadTeacherSchedule();
};

/**
 * Инициализация навигации по разделам базы знаний
 */
function initKnowledgeBaseNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const targetSection = this.getAttribute('data-section');
            
            // Убираем активный класс со всех элементов
            navItems.forEach(nav => nav.classList.remove('active'));
            contentSections.forEach(section => section.classList.remove('active'));
            
            // Добавляем активный класс к выбранному элементу
            this.classList.add('active');
            
            // Показываем соответствующий раздел
            const targetContent = document.getElementById(targetSection);
            if (targetContent) {
                targetContent.classList.add('active');
                
                // Плавная прокрутка к началу контента
                targetContent.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }
        });
    });
}

async function loadTeacherTestsSection(forceReload = false) {
    try {
        if (!teacherTestsInitialized || forceReload) {
            await loadTeacherTestSubjects();
            initTeacherTestForm();
            teacherTestsInitialized = true;

            // Bind refresh results button
            const refreshResultsBtn = document.getElementById('refreshTeacherResults');
            if (refreshResultsBtn && !refreshResultsBtn.dataset.bound) {
                refreshResultsBtn.dataset.bound = 'true';
                refreshResultsBtn.addEventListener('click', () => loadTeacherResults());
            }
        }

        await loadTeacherIntermediateTests(forceReload);
        loadTeacherResults();
    } catch (error) {
        console.error('Ошибка загрузки тестов преподавателя:', error);
        showToast('Не удалось загрузить тесты', 'error');
    }
}

async function loadTeacherTestSubjects() {
    const subjectSelect = document.getElementById('teacherTestSubject');
    if (!subjectSelect) {
        return;
    }

    subjectSelect.innerHTML = '<option value="" disabled selected>Загрузка предметов...</option>';

    try {
        const response = await fetch('/api/teacher/tests/subjects');
        if (!response.ok) {
            throw new Error('Не удалось загрузить список предметов');
        }

        const subjects = await response.json();

        if (!subjects || subjects.length === 0) {
            subjectSelect.innerHTML = '<option value="" disabled selected>Предметы не назначены</option>';
            return;
        }

        subjectSelect.innerHTML = '<option value="" disabled selected>Выберите предмет</option>' +
            subjects.map(subject => `<option value="${subject.id}">${subject.name}</option>`).join('');
    } catch (error) {
        console.error('Ошибка загрузки предметов преподавателя:', error);
        subjectSelect.innerHTML = '<option value="" disabled selected>Ошибка загрузки предметов</option>';
        showToast('Не удалось загрузить список предметов', 'error');
    }
}

function initTeacherTestForm() {
    const form = document.getElementById('teacherTestForm');
    if (!form || form.dataset.initialized === 'true') {
        return;
    }

    const subjectSelect = document.getElementById('teacherTestSubject');
    if (subjectSelect) {
        subjectSelect.addEventListener('change', async () => {
            await loadStudentsForSubject(subjectSelect.value);
        });
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const titleInput = document.getElementById('teacherTestTitle');
        const submitButton = form.querySelector('button[type="submit"]');

        if (!subjectSelect || !subjectSelect.value) {
            showToast('Выберите предмет для теста', 'warning');
            return;
        }

        const selectedStudentIds = getSelectedStudentIds();
        if (!selectedStudentIds || selectedStudentIds.length === 0) {
            showToast('Выберите хотя бы одного ученика', 'warning');
            return;
        }

        const payload = {
            subjectId: subjectSelect.value,
            title: titleInput?.value?.trim() || null,
            studentIds: selectedStudentIds
        };

        try {
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Создание...';
            }

            const response = await fetch('/api/teacher/tests/intermediate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Не удалось создать тест');
            }

            showToast('Тест создан! Переход в конструктор...', 'success');

            const createdTemplateId = result.templateId;
            if (createdTemplateId) {
                // Переходим на страницу конструктора теста
                setTimeout(() => {
                    window.location.href = `/test-builder/${createdTemplateId}`;
                }, 500);
            } else {
                form.reset();
                subjectSelect.selectedIndex = 0;
                await loadTeacherIntermediateTests(true);
            }
        } catch (error) {
            console.error('Ошибка создания теста преподавателя:', error);
            showToast(error.message || 'Не удалось создать тест', 'error');
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.innerHTML = '<i class="fas fa-paper-plane"></i> Создать тест';
            }
        }
    });

    form.dataset.initialized = 'true';
}

async function loadStudentsForSubject(subjectId) {
    const container = document.getElementById('teacherTestStudentsContainer');
    if (!container || !subjectId) {
        return;
    }

    container.innerHTML = '<div class="students-select-loading">Загрузка учеников...</div>';

    try {
        const response = await fetch(`/api/teacher/tests/students/${subjectId}`);
        if (!response.ok) {
            throw new Error('Не удалось загрузить учеников');
        }

        const students = await response.json();
        
        if (!students || students.length === 0) {
            container.innerHTML = '<div class="students-select-empty">Нет учеников по этому предмету</div>';
            return;
        }

        container.innerHTML = `
            <div class="students-search-box">
                <i class="fas fa-search"></i>
                <input type="text" class="students-search-input" placeholder="Поиск по имени или email...">
            </div>
            <div class="students-select-list">
                ${students.map(student => `
                    <label class="student-checkbox-item" data-name="${(student.name || '').toLowerCase()}" data-email="${(student.email || '').toLowerCase()}">
                        <input type="checkbox" value="${student.id}" class="student-checkbox">
                        <span class="student-checkbox-label">
                            <strong>${student.name}</strong>
                            <span class="student-checkbox-email">${student.email}</span>
                        </span>
                    </label>
                `).join('')}
            </div>
            <div class="students-select-actions">
                <button type="button" class="students-select-all-btn">Выбрать всех</button>
                <button type="button" class="students-select-none-btn">Снять выбор</button>
            </div>
        `;

        // Поиск учеников
        const searchInput = container.querySelector('.students-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const q = searchInput.value.trim().toLowerCase();
                container.querySelectorAll('.student-checkbox-item').forEach(item => {
                    const name = item.dataset.name || '';
                    const email = item.dataset.email || '';
                    item.style.display = (!q || name.includes(q) || email.includes(q)) ? '' : 'none';
                });
            });
        }

        // Обработчики для кнопок выбора всех/ничего
        const selectAllBtn = container.querySelector('.students-select-all-btn');
        const selectNoneBtn = container.querySelector('.students-select-none-btn');
        const checkboxes = container.querySelectorAll('.student-checkbox');

        if (selectAllBtn) {
            selectAllBtn.addEventListener('click', () => {
                container.querySelectorAll('.student-checkbox-item:not([style*="display: none"]) .student-checkbox').forEach(cb => cb.checked = true);
            });
        }

        if (selectNoneBtn) {
            selectNoneBtn.addEventListener('click', () => {
                checkboxes.forEach(cb => cb.checked = false);
            });
        }
    } catch (error) {
        console.error('Ошибка загрузки учеников:', error);
        container.innerHTML = '<div class="students-select-error">Ошибка загрузки учеников</div>';
    }
}

function getSelectedStudentIds() {
    const checkboxes = document.querySelectorAll('.student-checkbox:checked');
    return Array.from(checkboxes).map(cb => parseInt(cb.value));
}

async function loadTeacherIntermediateTests(showToastOnSuccess = false) {
    const listContainer = document.getElementById('teacherTestsList');
    if (!listContainer) {
        return;
    }

    listContainer.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Загружаем тесты...</p>
        </div>
    `;

    try {
        const response = await fetch('/api/teacher/tests/intermediate');
        if (!response.ok) {
            throw new Error('Не удалось загрузить тесты');
        }

        const tests = await response.json();
        renderTeacherTests(listContainer, tests);

        if (showToastOnSuccess) {
            showToast('Список тестов обновлён', 'info');
        }
    } catch (error) {
        console.error('Ошибка загрузки тестов преподавателя:', error);
        listContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-triangle-exclamation"></i>
                <h3>Не удалось загрузить тесты</h3>
                <p>Попробуйте обновить страницу позже.</p>
            </div>
        `;
        showToast(error.message || 'Ошибка загрузки тестов', 'error');
    }
}

function renderTeacherTests(container, tests) {
    if (!container) return;

    if (!tests || tests.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h3>Тестов пока нет</h3>
                <p>Создайте первый тест, чтобы ученики получили доступ к заданиям.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = tests.map(test => `
        <div class="teacher-test-row">
            <div class="teacher-test-main">
                <strong>${test.title}</strong>
                <span>${test.subjectName}</span>
            </div>
            <div class="teacher-test-meta">
                <span>
                    <i class="fas fa-users"></i>
                    Назначено ученикам: ${test.assignments}
                </span>
            </div>
            <div class="teacher-test-date">
                <span>Создан: ${formatTeacherTestDate(test.createdAt)}</span>
                <span>ID: ${test.id}</span>
            </div>
            <div class="teacher-test-actions">
                <a href="/test-builder/${test.id}" class="lesson-btn primary" style="text-decoration:none">
                    <i class="fas fa-edit"></i>
                    Редактировать
                </a>
            </div>
        </div>
    `).join('');
}

function formatTeacherTestDate(date) {
    if (!date) {
        return '—';
    }

    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
        return '—';
    }

    return parsed.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ==================== РЕЗУЛЬТАТЫ УЧЕНИКОВ ====================

async function loadTeacherResults() {
    const container = document.getElementById('teacherResultsList');
    if (!container) return;

    container.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Загружаем результаты...</p></div>`;

    try {
        const response = await fetch('/api/teacher/tests/results');
        if (!response.ok) throw new Error('Ошибка загрузки');
        const students = await response.json();
        renderTeacherResultsList(container, students);
    } catch (e) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Не удалось загрузить</h3><p>Попробуйте обновить позже.</p></div>`;
    }
}

function renderTeacherResultsList(container, students) {
    if (!students || students.length === 0) {
        container.innerHTML = `<div class="empty-state"><i class="fas fa-clipboard-check"></i><h3>Результатов пока нет</h3><p>Когда ученики пройдут ваши тесты, результаты появятся здесь.</p></div>`;
        return;
    }

    container.innerHTML = students.map(student => {
        const results = student.results || [];
        const needsReviewCount = results.filter(r => r.isReviewed === false).length;

        return `
            <div class="tr-student-group">
                <div class="tr-student-header">
                    <div class="tr-student-avatar">${(student.studentName || '?').charAt(0).toUpperCase()}</div>
                    <div class="tr-student-info">
                        <strong>${student.studentName || 'Ученик'}</strong>
                        <span>${student.studentEmail || ''}</span>
                    </div>
                    ${needsReviewCount > 0 ? `<span class="tr-needs-review-count"><i class="fas fa-clock"></i> ${needsReviewCount} ${needsReviewCount === 1 ? 'ответ' : 'ответов'} ждёт проверки</span>` : ''}
                </div>
                <div class="tr-student-results">
                    ${results.map(r => {
                        const pct = Number(r.scorePercentage || 0).toFixed(1);
                        const needsReview = r.isReviewed === false;
                        const scoreColor = needsReview ? '#ff9800' : (pct >= 70 ? '#4CAF50' : pct >= 40 ? '#ff9800' : '#e53935');
                        return `
                        <div class="tr-result-row ${needsReview ? 'needs-review' : ''}">
                            <div class="tr-result-title">
                                <strong>${r.templateTitle || 'Тест'}</strong>
                                <span>${r.subjectName || ''}</span>
                            </div>
                            <div class="tr-result-score" style="color:${scoreColor}">
                                ${r.correctAnswers}/${r.totalQuestions} (${pct}%)
                            </div>
                            <div class="tr-result-date">${formatTeacherTestDate(r.submittedAt)}</div>
                            <div class="tr-result-action">
                                ${needsReview
                                    ? `<a href="${r.reviewUrl}" target="_blank" class="tr-review-btn needs-review"><i class="fas fa-edit"></i> Проверить</a>`
                                    : (r.reviewUrl ? `<a href="${r.reviewUrl}" target="_blank" class="tr-review-btn"><i class="fas fa-eye"></i> Подробнее</a>` : '')}
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>`;
    }).join('');
}

function initializeTeacherTestModal() {
    teacherTestModalElements = {
        backdrop: document.getElementById('teacherTestBackdrop'),
        modal: document.getElementById('teacherTestModal'),
        title: document.getElementById('teacherModalTitle'),
        meta: document.getElementById('teacherModalMeta'),
        form: document.getElementById('teacherQuestionForm'),
        number: document.getElementById('teacherQuestionNumber'),
        text: document.getElementById('teacherQuestionText'),
        answer: document.getElementById('teacherCorrectAnswer'),
        image: document.getElementById('teacherQuestionImage'),
        removeImageRow: document.getElementById('teacherRemoveImageRow'),
        removeImageCheckbox: document.getElementById('teacherRemoveImageCheckbox'),
        submitBtn: document.getElementById('teacherSubmitQuestionBtn'),
        resetBtn: document.getElementById('teacherResetQuestionForm'),
        closeBtn: document.getElementById('closeTeacherTestModal'),
        list: document.getElementById('teacherQuestionsList')
    };

    if (!teacherTestModalElements.modal) {
        return;
    }

    teacherTestModalElements.form?.addEventListener('submit', submitTeacherQuestion);
    teacherTestModalElements.resetBtn?.addEventListener('click', resetTeacherQuestionForm);
    teacherTestModalElements.closeBtn?.addEventListener('click', closeTeacherTestModal);
    teacherTestModalElements.backdrop?.addEventListener('click', closeTeacherTestModal);

    document.body.addEventListener('click', handleTeacherModalClicks);
}

function handleTeacherModalClicks(event) {
    const manageBtn = event.target.closest('.teacher-test-manage');
    if (manageBtn) {
        const templateId = manageBtn.getAttribute('data-template-id');
        if (templateId) {
            openTeacherTestModal(templateId);
        }
        return;
    }

    const editBtn = event.target.closest('.teacher-question-edit');
    if (editBtn) {
        const questionId = parseInt(editBtn.getAttribute('data-question-id'), 10);
        if (!Number.isNaN(questionId)) {
            fillTeacherQuestionForm(questionId);
        }
        return;
    }

    const deleteBtn = event.target.closest('.teacher-question-delete');
    if (deleteBtn) {
        const questionId = parseInt(deleteBtn.getAttribute('data-question-id'), 10);
        if (!Number.isNaN(questionId)) {
            deleteTeacherQuestion(questionId);
        }
    }
}

async function openTeacherTestModal(templateId) {
    teacherSelectedTemplateId = templateId;
    teacherEditingQuestionId = null;
    clearTeacherQuestionForm();

    try {
        const response = await fetch(`/api/teacher/tests/template/${templateId}`);
        if (!response.ok) {
            throw new Error('Не удалось загрузить тест');
        }

        const data = await response.json();
        teacherQuestionsCache = data.questions || [];

        if (teacherTestModalElements.title) {
            teacherTestModalElements.title.textContent = data.template.title;
        }
        if (teacherTestModalElements.meta) {
            teacherTestModalElements.meta.textContent = `${data.template.subjectName}`;
        }

        populateTeacherQuestionsList(teacherQuestionsCache);
        showTeacherTestModal();
    } catch (error) {
        console.error('Ошибка загрузки теста преподавателя:', error);
        showToast(error.message || 'Не удалось загрузить тест', 'error');
    }
}

function showTeacherTestModal() {
    teacherTestModalElements.backdrop?.classList.add('open');
    teacherTestModalElements.modal?.classList.add('open');
    teacherTestModalElements.modal?.setAttribute('aria-hidden', 'false');
}

function closeTeacherTestModal() {
    teacherSelectedTemplateId = null;
    teacherEditingQuestionId = null;
    teacherTestModalElements.backdrop?.classList.remove('open');
    teacherTestModalElements.modal?.classList.remove('open');
    teacherTestModalElements.modal?.setAttribute('aria-hidden', 'true');
}

function populateTeacherQuestionsList(questions) {
    if (!teacherTestModalElements.list) {
        return;
    }

    if (!questions || questions.length === 0) {
        teacherTestModalElements.list.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard"></i>
                <h4>Заданий пока нет</h4>
                <p>Добавьте первое задание, чтобы ученики получили доступ.</p>
            </div>
        `;
        return;
    }

    teacherTestModalElements.list.innerHTML = questions.map(renderTeacherQuestionCard).join('');
}

function renderTeacherQuestionCard(question) {
    const imageSection = question.imageUrl ? `
        <div class="teacher-question-image">
            <img src="${question.imageUrl}" alt="Изображение задания">
        </div>
    ` : '';

    return `
        <div class="teacher-question-card" data-question-id="${question.id}">
            <div class="teacher-question-body">
                <span class="question-number">${question.questionNumber}</span>
                <div class="question-text">${question.questionText.replace(/\n/g, '<br>')}</div>
                ${imageSection}
                <div class="question-answer"><strong>Ответ:</strong> ${question.correctAnswer.replace(/\n/g, '<br>')}</div>
            </div>
            <div class="teacher-question-actions">
                <button class="lesson-btn secondary teacher-question-edit" data-question-id="${question.id}">
                    <i class="fas fa-pen"></i>
                    Изменить
                </button>
                <button class="lesson-btn danger teacher-question-delete" data-question-id="${question.id}">
                    <i class="fas fa-trash"></i>
                    Удалить
                </button>
            </div>
        </div>
    `;
}

function fillTeacherQuestionForm(questionId) {
    const question = teacherQuestionsCache.find(q => q.id === questionId);
    if (!question || !teacherTestModalElements.form) {
        return;
    }

    teacherEditingQuestionId = questionId;
    teacherTestModalElements.number.value = question.questionNumber || '';
    teacherTestModalElements.text.value = question.questionText || '';
    teacherTestModalElements.answer.value = question.correctAnswer || '';
    teacherTestModalElements.image.value = '';

    if (question.imagePath) {
        teacherTestModalElements.removeImageRow.classList.add('visible');
        teacherTestModalElements.removeImageCheckbox.checked = false;
    } else {
        teacherTestModalElements.removeImageRow.classList.remove('visible');
        teacherTestModalElements.removeImageCheckbox.checked = false;
    }

    teacherTestModalElements.submitBtn.innerHTML = '<i class="fas fa-save"></i> Сохранить изменения';
}

function resetTeacherQuestionForm() {
    teacherEditingQuestionId = null;
    teacherTestModalElements.form?.reset();
    teacherTestModalElements.image.value = '';
    teacherTestModalElements.removeImageCheckbox.checked = false;
    teacherTestModalElements.removeImageRow.classList.remove('visible');
    teacherTestModalElements.submitBtn.innerHTML = '<i class="fas fa-plus"></i> Добавить задание';
}

function clearTeacherQuestionForm() {
    resetTeacherQuestionForm();
}

async function submitTeacherQuestion(event) {
    event.preventDefault();
    if (!teacherSelectedTemplateId) {
        showToast('Выберите тест', 'warning');
        return;
    }

    const formData = new FormData();
    formData.append('questionNumber', teacherTestModalElements.number.value.trim());
    formData.append('questionText', teacherTestModalElements.text.value.trim());
    formData.append('correctAnswer', teacherTestModalElements.answer.value.trim());

    const file = teacherTestModalElements.image.files[0];
    if (file) {
        formData.append('image', file);
    }

    let url;
    let method;
    if (teacherEditingQuestionId) {
        url = `/api/teacher/tests/questions/${teacherEditingQuestionId}`;
        method = 'PUT';
        formData.append('removeImage', teacherTestModalElements.removeImageCheckbox.checked);
    } else {
        url = `/api/teacher/tests/template/${teacherSelectedTemplateId}/questions`;
        method = 'POST';
    }

    try {
        const response = await fetch(url, {
            method,
            body: formData
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Не удалось сохранить задание');
        }

        showToast(teacherEditingQuestionId ? 'Задание обновлено' : 'Задание создано', 'success');
        await openTeacherTestModal(teacherSelectedTemplateId);
        resetTeacherQuestionForm();
    } catch (error) {
        console.error('Ошибка сохранения задания преподавателя:', error);
        showToast(error.message || 'Не удалось сохранить задание', 'error');
    }
}

async function deleteTeacherQuestion(questionId) {
    if (!teacherSelectedTemplateId) {
        return;
    }

    if (!confirm('Удалить выбранное задание?')) {
        return;
    }

    try {
        const response = await fetch(`/api/teacher/tests/questions/${questionId}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Не удалось удалить задание');
        }

        showToast('Задание удалено', 'success');
        await openTeacherTestModal(teacherSelectedTemplateId);
    } catch (error) {
        console.error('Ошибка удаления задания преподавателя:', error);
        showToast(error.message || 'Не удалось удалить задание', 'error');
    }
}
