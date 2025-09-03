// JavaScript для страницы активных уроков администратора

// Глобальные переменные
let activeLessons = [];
let selectedLesson = null;
let refreshInterval = null;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
    setupEventListeners();
    loadActiveLessons();
    
    // Автообновление каждые 30 секунд
    refreshInterval = setInterval(loadActiveLessons, 30000);
});

// Инициализация страницы
function initializePage() {
    console.log('Инициализация страницы активных уроков...');
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Кнопка обновления
    document.getElementById('refreshBtn').addEventListener('click', function() {
        loadActiveLessons();
        showToast('Список уроков обновлен', 'success');
    });
    
    // Кнопка завершения просроченных уроков
    document.getElementById('completeExpiredBtn').addEventListener('click', function() {
        completeExpiredLessons();
    });
    
    // Фильтры
    document.getElementById('subjectFilter').addEventListener('change', filterLessons);
    document.getElementById('statusFilter').addEventListener('change', filterLessons);
    
    // Модальное окно
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    document.getElementById('cancelJoinBtn').addEventListener('click', closeModal);
    document.getElementById('confirmJoinBtn').addEventListener('click', joinLesson);
    
    // Закрытие модального окна при клике вне его
    document.getElementById('joinLessonModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeModal();
        }
    });
}

// Завершение просроченных уроков
async function completeExpiredLessons() {
    try {
        console.log('Запуск завершения просроченных уроков...');
        
        const response = await fetch('/admin-role/api/complete-expired-lessons', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Результат завершения уроков:', data);
        
        if (data.success) {
            showToast(data.message || 'Просроченные уроки завершены', 'success');
            // Обновляем список уроков
            loadActiveLessons();
        } else {
            throw new Error(data.error || 'Ошибка завершения уроков');
        }
        
    } catch (error) {
        console.error('Ошибка завершения просроченных уроков:', error);
        showToast('Ошибка завершения уроков: ' + error.message, 'error');
    }
}

// Загрузка активных уроков
async function loadActiveLessons() {
    try {
        console.log('Загрузка активных уроков...');
        
        const response = await fetch('/admin-role/api/active-lessons', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            credentials: 'same-origin'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Данные активных уроков:', data);
        
        if (data.success) {
            activeLessons = data.sessions;
            updateStats();
            renderLessons();
            updateFilters();
        } else {
            throw new Error(data.error || 'Ошибка загрузки данных');
        }
        
    } catch (error) {
        console.error('Ошибка загрузки активных уроков:', error);
        showToast('Ошибка загрузки активных уроков: ' + error.message, 'error');
        showLoadingError();
    }
}

// Обновление статистики
function updateStats() {
    const totalActiveLessons = activeLessons.length;
    const totalParticipants = activeLessons.reduce((total, lesson) => {
        let participants = 0;
        if (lesson.teacherJoinedAt) participants++;
        if (lesson.studentJoinedAt) participants++;
        return total + participants;
    }, 0);
    
    const avgSessionTime = activeLessons.length > 0 ? 
        Math.round(activeLessons.reduce((total, lesson) => {
            const startTime = new Date(lesson.sessionStartedAt);
            const now = new Date();
            return total + (now - startTime) / (1000 * 60); // в минутах
        }, 0) / activeLessons.length) : 0;
    
    document.getElementById('totalActiveLessons').textContent = totalActiveLessons;
    document.getElementById('totalParticipants').textContent = totalParticipants;
    document.getElementById('avgSessionTime').textContent = avgSessionTime;
}

// Отрисовка уроков
function renderLessons() {
    const lessonsGrid = document.getElementById('lessonsGrid');
    const noLessons = document.getElementById('noLessons');
    
    if (activeLessons.length === 0) {
        lessonsGrid.style.display = 'none';
        noLessons.style.display = 'block';
        return;
    }
    
    lessonsGrid.style.display = 'grid';
    noLessons.style.display = 'none';
    
    lessonsGrid.innerHTML = activeLessons.map(lesson => createLessonCard(lesson)).join('');
    
    // Добавляем обработчики событий для кнопок
    activeLessons.forEach(lesson => {
        const joinBtn = document.querySelector(`[data-lesson-id="${lesson.sessionId}"] .join-btn`);
        const viewBtn = document.querySelector(`[data-lesson-id="${lesson.sessionId}"] .view-btn`);
        
        if (joinBtn) {
            joinBtn.addEventListener('click', () => showJoinModal(lesson));
        }
        
        if (viewBtn) {
            viewBtn.addEventListener('click', () => viewLesson(lesson));
        }
    });
}

// Создание карточки урока
function createLessonCard(lesson) {
    const lessonData = lesson.lesson;
    const sessionDuration = calculateSessionDuration(lesson.sessionStartedAt);
    const teacherJoined = lesson.teacherJoinedAt !== null;
    const studentJoined = lesson.studentJoinedAt !== null;
    
    const isExpired = getTimeUntilExpiration(lesson.sessionStartedAt).includes('ПРОСРОЧЕН');
    const cardClass = isExpired ? 'lesson-card expired' : `lesson-card ${lesson.status.toLowerCase()}`;
    const statusText = isExpired ? 'ПРОСРОЧЕН' : lesson.status;
    const statusClass = isExpired ? 'lesson-status expired' : `lesson-status ${lesson.status.toLowerCase()}`;
    
    return `
        <div class="${cardClass}" data-lesson-id="${lesson.sessionId}">
            <div class="${statusClass}">${statusText}</div>
            
            <div class="lesson-header">
                <div class="lesson-subject">${lessonData.subject}</div>
                <div class="lesson-time">
                    <i class="fas fa-clock"></i>
                    ${formatLessonTime(lessonData.lessonDate)}
                </div>
            </div>
            
            <div class="lesson-participants">
                <div class="participant">
                    <div class="participant-icon teacher">
                        <i class="fas fa-chalkboard-teacher"></i>
                    </div>
                    <div class="participant-info">
                        <div class="participant-name">${lessonData.teacher}</div>
                        <div class="participant-status ${teacherJoined ? 'joined' : 'not-joined'}">
                            ${teacherJoined ? 'Присоединился' : 'Не присоединился'}
                        </div>
                    </div>
                </div>
                
                <div class="participant">
                    <div class="participant-icon student">
                        <i class="fas fa-user-graduate"></i>
                    </div>
                    <div class="participant-info">
                        <div class="participant-name">${lessonData.student}</div>
                        <div class="participant-status ${studentJoined ? 'joined' : 'not-joined'}">
                            ${studentJoined ? 'Присоединился' : 'Не присоединился'}
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="lesson-session-info">
                <div class="session-duration">
                    <i class="fas fa-play-circle"></i>
                    Длительность: ${sessionDuration}
                </div>
                <div class="session-time-left">
                    <i class="fas fa-clock"></i>
                    ${getTimeUntilExpiration(lesson.sessionStartedAt)}
                </div>
                <div class="session-id">
                    ID: ${lesson.roomId}
                </div>
            </div>
            
            <div class="lesson-actions">
                <button class="join-btn">
                    <i class="fas fa-sign-in-alt"></i>
                    Присоединиться
                </button>
                <button class="view-btn">
                    <i class="fas fa-eye"></i>
                    Просмотр
                </button>
            </div>
        </div>
    `;
}

// Показать модальное окно присоединения
function showJoinModal(lesson) {
    selectedLesson = lesson;
    const modal = document.getElementById('joinLessonModal');
    const lessonInfo = document.getElementById('modalLessonInfo');
    
    lessonInfo.innerHTML = `
        <div style="margin-bottom: 12px;">
            <strong>Предмет:</strong> ${lesson.lesson.subject}
        </div>
        <div style="margin-bottom: 12px;">
            <strong>Преподаватель:</strong> ${lesson.lesson.teacher}
        </div>
        <div style="margin-bottom: 12px;">
            <strong>Ученик:</strong> ${lesson.lesson.student}
        </div>
        <div style="margin-bottom: 12px;">
            <strong>Время урока:</strong> ${formatLessonTime(lesson.lesson.lessonDate)}
        </div>
        <div style="margin-bottom: 12px;">
            <strong>Длительность сессии:</strong> ${calculateSessionDuration(lesson.sessionStartedAt)}
        </div>
        <div>
            <strong>ID комнаты:</strong> <code>${lesson.roomId}</code>
        </div>
    `;
    
    modal.classList.add('show');
}

// Закрыть модальное окно
function closeModal() {
    const modal = document.getElementById('joinLessonModal');
    modal.classList.remove('show');
    selectedLesson = null;
}

// Присоединиться к уроку
function joinLesson() {
    if (!selectedLesson) {
        showToast('Ошибка: урок не выбран', 'error');
        return;
    }
    
    console.log('Присоединяемся к уроку:', selectedLesson);
    
    // Переходим к странице онлайн-урока с правами администратора
    window.location.href = `/online-lesson?lessonId=${selectedLesson.lesson.id}&admin=true`;
}

// Просмотр урока (только просмотр без присоединения)
function viewLesson(lesson) {
    console.log('Просмотр урока:', lesson);
    // Можно открыть в новом окне или показать детальную информацию
    window.open(`/online-lesson?lessonId=${lesson.lesson.id}&view=true`, '_blank');
}

// Фильтрация уроков
function filterLessons() {
    const subjectFilter = document.getElementById('subjectFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    
    const filteredLessons = activeLessons.filter(lesson => {
        const subjectMatch = !subjectFilter || lesson.lesson.subject === subjectFilter;
        
        let statusMatch = true;
        if (statusFilter) {
            if (statusFilter === 'EXPIRED') {
                // Проверяем, просрочен ли урок
                const start = new Date(lesson.sessionStartedAt);
                const expirationTime = new Date(start.getTime() + 90 * 60 * 1000);
                statusMatch = new Date() > expirationTime;
            } else {
                statusMatch = lesson.status === statusFilter;
            }
        }
        
        return subjectMatch && statusMatch;
    });
    
    renderFilteredLessons(filteredLessons);
}

// Отрисовка отфильтрованных уроков
function renderFilteredLessons(filteredLessons) {
    const lessonsGrid = document.getElementById('lessonsGrid');
    const noLessons = document.getElementById('noLessons');
    
    if (filteredLessons.length === 0) {
        lessonsGrid.style.display = 'none';
        noLessons.style.display = 'block';
        noLessons.innerHTML = `
            <i class="fas fa-filter"></i>
            <h3>Нет уроков по выбранным фильтрам</h3>
            <p>Попробуйте изменить параметры фильтрации.</p>
        `;
        return;
    }
    
    lessonsGrid.style.display = 'grid';
    noLessons.style.display = 'none';
    
    lessonsGrid.innerHTML = filteredLessons.map(lesson => createLessonCard(lesson)).join('');
    
    // Добавляем обработчики событий для отфильтрованных уроков
    filteredLessons.forEach(lesson => {
        const joinBtn = document.querySelector(`[data-lesson-id="${lesson.sessionId}"] .join-btn`);
        const viewBtn = document.querySelector(`[data-lesson-id="${lesson.sessionId}"] .view-btn`);
        
        if (joinBtn) {
            joinBtn.addEventListener('click', () => showJoinModal(lesson));
        }
        
        if (viewBtn) {
            viewBtn.addEventListener('click', () => viewLesson(lesson));
        }
    });
}

// Обновление фильтров
function updateFilters() {
    const subjectFilter = document.getElementById('subjectFilter');
    const subjects = [...new Set(activeLessons.map(lesson => lesson.lesson.subject))];
    
    // Очищаем существующие опции (кроме первой)
    while (subjectFilter.children.length > 1) {
        subjectFilter.removeChild(subjectFilter.lastChild);
    }
    
    // Добавляем новые опции
    subjects.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject;
        option.textContent = subject;
        subjectFilter.appendChild(option);
    });
}

// Показать ошибку загрузки
function showLoadingError() {
    const lessonsGrid = document.getElementById('lessonsGrid');
    const noLessons = document.getElementById('noLessons');
    
    lessonsGrid.style.display = 'none';
    noLessons.style.display = 'block';
    noLessons.innerHTML = `
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Ошибка загрузки</h3>
        <p>Не удалось загрузить активные уроки. Попробуйте обновить страницу.</p>
    `;
}

// Вспомогательные функции
function calculateSessionDuration(startTime) {
    const start = new Date(startTime);
    const now = new Date();
    const diffMs = now - start;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    
    if (diffHours > 0) {
        return `${diffHours}ч ${diffMins % 60}м`;
    } else {
        return `${diffMins}м`;
    }
}

function getTimeUntilExpiration(startTime) {
    const start = new Date(startTime);
    const now = new Date();
    const expirationTime = new Date(start.getTime() + 90 * 60 * 1000); // +90 минут (55 мин урок + 35 мин доп. время)
    const timeLeft = expirationTime - now;
    
    if (timeLeft <= 0) {
        return '<span style="color: #e53e3e; font-weight: bold;">ПРОСРОЧЕН</span>';
    }
    
    const minutesLeft = Math.floor(timeLeft / (1000 * 60));
    const hoursLeft = Math.floor(minutesLeft / 60);
    
    if (hoursLeft > 0) {
        return `Завершится через: ${hoursLeft}ч ${minutesLeft % 60}м`;
    } else {
        return `Завершится через: ${minutesLeft}м`;
    }
}

function formatLessonTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icon = getToastIcon(type);
    toast.innerHTML = `
        <i class="fas fa-${icon}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

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
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});
