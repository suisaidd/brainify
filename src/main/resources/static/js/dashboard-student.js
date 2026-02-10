// Dashboard Student JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Инициализация
    initializeDashboard();
    loadStudentData();
    setupEventListeners();
    initializeStudentTestModal();
});

let studentScheduleLessons = [];
let currentWeekOffset = 0;

let teacherTestsInitialized = false;
let studentTestModalElements = {};
let activeTestAssignmentId = null;
let studentQuestionsCache = [];

// Инициализация дашборда
function initializeDashboard() {
    console.log('Инициализация дашборда ученика...');
    
    // Устанавливаем активную вкладку
    const activeTab = document.querySelector('.sidebar-item.active');
    if (activeTab) {
        const tabId = activeTab.getAttribute('data-tab');
        showTab(tabId);
    }
}

// Загрузка данных ученика
async function loadStudentData() {
    try {
        // Загружаем статистику
        await loadStudentStats();
        
        // Загружаем уроки
        await loadStudentLessons();
        
        // Загружаем расписание
        await loadStudentSchedule();

        // Загружаем тесты
        await loadStudentTests();
        
    } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
    }
}

// Загрузка статистики ученика
async function loadStudentStats() {
    try {
        // Получаем ID текущего пользователя из атрибута data
        const studentId = document.body.getAttribute('data-student-id');
        if (!studentId) {
            console.warn('ID ученика не найден');
            return;
        }
        
        // Загружаем уроки ученика
        const response = await fetch(`/api/student/${studentId}/lessons`);
        if (!response.ok) {
            throw new Error('Ошибка загрузки уроков');
        }
        
        const lessons = await response.json();
        
        // Подсчитываем статистику
        const totalLessons = lessons.length;
        const completedLessons = lessons.filter(lesson => lesson.status === 'COMPLETED').length;
        
        // Находим ближайший урок
        const now = new Date();
        const upcomingLessons = lessons
            .filter(lesson => new Date(lesson.lessonDate) > now && lesson.status === 'SCHEDULED')
            .sort((a, b) => new Date(a.lessonDate) - new Date(b.lessonDate));
        
        const nextLesson = upcomingLessons[0];
        
        // Получаем оставшиеся уроки из данных пользователя (если доступно)
        const remainingLessons = document.body.getAttribute('data-remaining-lessons') || upcomingLessons.length;
        
        // Обновляем статистику на странице
        updateStatsDisplay({
            totalLessons: totalLessons,
            completedLessons: completedLessons,
            remainingLessons: parseInt(remainingLessons),
            nextLesson: nextLesson,
            averageRating: 0.0 // Пока не реализовано
        });
        
    } catch (error) {
        console.error('Ошибка загрузки статистики:', error);
    }
}

// Обновление отображения статистики
function updateStatsDisplay(stats) {
    // Уроков посетил
    const attendedLessonsElement = document.getElementById('attendedLessons');
    if (attendedLessonsElement) {
        attendedLessonsElement.textContent = stats.completedLessons;
    }
    
    // Обновляем ближайший урок
    const nextLessonTimeElement = document.getElementById('nextLessonTime');
    if (nextLessonTimeElement) {
        if (stats.nextLesson) {
            const lessonDate = new Date(stats.nextLesson.lessonDate);
            const timeString = lessonDate.toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
            });
            nextLessonTimeElement.textContent = timeString;
        } else {
            nextLessonTimeElement.textContent = '--:--';
        }
    }
    
    // Обновляем остаток занятий в сайдбаре
    const sidebarRemaining = document.getElementById('sidebarRemainingLessons');
    if (sidebarRemaining && stats.remainingLessons !== undefined) {
        sidebarRemaining.textContent = stats.remainingLessons;
    }
}

// Загрузка уроков для главной страницы
async function loadStudentLessons() {
    try {
        const studentId = document.body.getAttribute('data-student-id');
        if (!studentId) {
            console.warn('ID ученика не найден');
            return;
        }
        
        const response = await fetch(`/api/student/${studentId}/lessons`);
        if (!response.ok) {
            throw new Error('Ошибка загрузки уроков');
        }
        
        const lessons = await response.json();
        
        // Разделяем уроки на активные (не закончившиеся) и прошедшие (как у преподавателя)
        const now = new Date();
        const upcomingLessons = [];
        const pastLessons = [];
        const cancelledLessons = [];
        
        lessons.forEach(lesson => {
            const lessonDate = new Date(lesson.lessonDate);
            const oneHourAfter = new Date(lessonDate.getTime() + (60 * 60 * 1000)); // 1 час после урока
            
            // Отмененные уроки идут в архив независимо от даты
            if (lesson.status === 'CANCELLED') {
                cancelledLessons.push(lesson);
            } else if (now <= oneHourAfter) {
                // Урок считается активным, если он еще не прошел 1 час после начала
                upcomingLessons.push(lesson);
            } else {
                // Урок уходит в архив через 1 час после начала
                pastLessons.push(lesson);
            }
        });
        
        // Сортируем активные уроки по дате (ближайшие сначала)
        upcomingLessons.sort((a, b) => new Date(a.lessonDate) - new Date(b.lessonDate));
        
        // Сортируем прошедшие уроки по дате (новые сначала)
        pastLessons.sort((a, b) => new Date(b.lessonDate) - new Date(a.lessonDate));
        
        // Сортируем отмененные уроки по дате (новые сначала)
        cancelledLessons.sort((a, b) => new Date(b.lessonDate) - new Date(a.lessonDate));
        
        // Объединяем прошедшие и отмененные уроки
        const allPastLessons = [...pastLessons, ...cancelledLessons];
        
        displayUpcomingLessons(upcomingLessons);
        displayAllLessons(allPastLessons);
        
        // Также отображаем на главной странице
        displayMainUpcomingLessons(upcomingLessons);
        displayMainAllLessons(allPastLessons);
        
    } catch (error) {
        console.error('Ошибка загрузки уроков:', error);
    }
}

// Отображение ближайших уроков
function displayUpcomingLessons(lessons) {
    const container = document.getElementById('upcomingLessonsList');
    const noLessonsMessage = document.getElementById('noUpcomingLessonsMessage');
    
    if (!container) return;
    
    if (lessons.length === 0) {
        container.style.display = 'none';
        if (noLessonsMessage) {
            noLessonsMessage.style.display = 'block';
        }
        return;
    }
    
    container.style.display = 'block';
    if (noLessonsMessage) {
        noLessonsMessage.style.display = 'none';
    }
    
    // Очищаем контейнер
    container.innerHTML = '';
    
    lessons.forEach(lesson => {
        const lessonElement = createLessonElement(lesson);
        container.appendChild(lessonElement);
    });
}

// Отображение всех уроков
function displayAllLessons(lessons) {
    const container = document.getElementById('allLessonsList');
    const noLessonsMessage = document.getElementById('noAllLessonsMessage');
    
    if (!container) return;
    
    if (lessons.length === 0) {
        container.style.display = 'none';
        if (noLessonsMessage) {
            noLessonsMessage.style.display = 'block';
        }
        return;
    }
    
    container.style.display = 'block';
    if (noLessonsMessage) {
        noLessonsMessage.style.display = 'none';
    }
    
    // Очищаем контейнер
    container.innerHTML = '';
    
    lessons.forEach(lesson => {
        const lessonElement = createLessonElement(lesson);
        container.appendChild(lessonElement);
    });
}

// Отображение ближайших уроков на главной странице
function displayMainUpcomingLessons(lessons) {
    const container = document.getElementById('mainUpcomingLessonsList');
    const noLessonsMessage = document.getElementById('mainNoUpcomingLessonsMessage');
    
    if (!container) return;
    
    if (lessons.length === 0) {
        container.style.display = 'none';
        if (noLessonsMessage) {
            noLessonsMessage.style.display = 'block';
        }
        return;
    }
    
    container.style.display = 'block';
    if (noLessonsMessage) {
        noLessonsMessage.style.display = 'none';
    }
    
    // Очищаем контейнер
    container.innerHTML = '';
    
    lessons.forEach(lesson => {
        const lessonElement = createLessonElement(lesson);
        container.appendChild(lessonElement);
    });
}

// Отображение всех уроков на главной странице
function displayMainAllLessons(lessons) {
    const container = document.getElementById('mainAllLessonsList');
    const noLessonsMessage = document.getElementById('mainNoAllLessonsMessage');
    
    if (!container) return;
    
    if (lessons.length === 0) {
        container.style.display = 'none';
        if (noLessonsMessage) {
            noLessonsMessage.style.display = 'block';
        }
        return;
    }
    
    container.style.display = 'block';
    if (noLessonsMessage) {
        noLessonsMessage.style.display = 'none';
    }
    
    // Очищаем контейнер
    container.innerHTML = '';
    
    lessons.forEach(lesson => {
        const lessonElement = createLessonElement(lesson);
        container.appendChild(lessonElement);
    });
}

// Создание элемента урока
function createLessonElement(lesson) {
    const lessonDiv = document.createElement('div');
    lessonDiv.className = 'lesson-card';
    
    const lessonDate = new Date(lesson.lessonDate);
    const timeString = lessonDate.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });
    const dateString = lessonDate.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
    const dayOfWeek = lessonDate.toLocaleDateString('ru-RU', { weekday: 'long' });
    
    // Определяем статус урока
    const now = new Date();
    let statusClass = 'scheduled';
    let statusText = 'Запланирован';
    let statusIcon = 'fas fa-clock';
    
    if (lesson.status === 'COMPLETED') {
        statusClass = 'completed';
        statusText = 'Проведён';
        statusIcon = 'fas fa-check-circle';
    } else if (lesson.status === 'CANCELLED') {
        statusClass = 'cancelled';
        statusText = 'Отменён';
        statusIcon = 'fas fa-times-circle';
    } else if (lessonDate < now) {
        statusClass = 'overdue';
        statusText = '';
        statusIcon = '';
    }
    
    const fifteenMinutesBefore = new Date(lessonDate.getTime() - 15 * 60 * 1000);
    const oneHourAfter = new Date(lessonDate.getTime() + 60 * 60 * 1000);
    const minutesUntilStart = Math.floor((lessonDate.getTime() - now.getTime()) / 60000);

    let actionButtonHtml = '';

    if (lesson.status === 'SCHEDULED') {
        if (minutesUntilStart > 60) {
            actionButtonHtml = `
                <button class="lesson-btn secondary disabled" disabled>
                    <i class="fas fa-video"></i>
                    Подключиться к занятию
                </button>
            `;
        } else if (minutesUntilStart > 15) {
            actionButtonHtml = `
                <button class="lesson-btn secondary" disabled>
                    <i class="fas fa-clock"></i>
                    Доступно за 15 минут до начала
                </button>
            `;
        } else if (minutesUntilStart >= -60) {
            actionButtonHtml = `
                <button class="lesson-btn primary" onclick="joinLesson(${lesson.id})">
                    <i class="fas fa-video"></i>
                    Подключиться к занятию
                </button>
            `;
        } else {
            actionButtonHtml = `
                <button class="lesson-btn secondary" disabled>
                    <i class="fas fa-check"></i>
                    Урок завершен
                </button>
            `;
        }
    } else if (lesson.status === 'COMPLETED') {
        actionButtonHtml = `
            <button class="lesson-btn success" disabled>
                <i class="fas fa-check"></i>
                Завершён
            </button>
        `;
    } else if (lesson.status === 'CANCELLED') {
        actionButtonHtml = `
            <button class="lesson-btn danger" disabled>
                <i class="fas fa-times"></i>
                Отменён
            </button>
        `;
    } else {
        actionButtonHtml = `
            <button class="lesson-btn secondary" disabled>
                <i class="fas fa-clock"></i>
                Урок завершен
            </button>
        `;
    }
    
    const statusBadgeHtml = statusClass === 'overdue' ? '' : `
        <div class="lesson-status-badge ${statusClass}">
            <i class="${statusIcon}"></i>
            ${statusText}
        </div>
    `;

    lessonDiv.innerHTML = `
        <div class="lesson-duration">
            <i class="fas fa-clock"></i>
            60 мин
        </div>
        
        <div class="lesson-info">
            <div class="lesson-subject">${lesson.subjectName}</div>
            <div class="lesson-meta">
                <div class="lesson-date">
                    <i class="fas fa-calendar"></i>
                    ${dateString}, ${dayOfWeek}
                </div>
                <div class="lesson-time">
                    <i class="fas fa-clock"></i>
                    ${timeString}
                </div>
                <div class="lesson-student">
                    <i class="fas fa-chalkboard-teacher"></i>
                    ${lesson.teacherName}
                </div>
            </div>
            <div class="lesson-time lesson-time-display">
                <i class="fas fa-clock"></i>
                ${timeString}
            </div>
        </div>
        
        ${statusBadgeHtml}
        
        <div class="lesson-actions">
            ${actionButtonHtml}
        </div>
    `;
    
    return lessonDiv;
}

// Загрузка тестов ученика
async function loadStudentTests() {
    try {
        const studentId = document.body.getAttribute('data-student-id');
        if (!studentId) {
            console.warn('ID ученика не найден');
            return;
        }

        const response = await fetch(`/api/student/${studentId}/tests`);
        if (!response.ok) {
            throw new Error('Ошибка загрузки тестов');
        }

        const data = await response.json();

        displayStudentTests(data.basicTests, 'basicTestsList', 'noBasicTestsMessage');
        displayStudentTests(data.intermediateTests, 'intermediateTestsList', 'noIntermediateTestsMessage');
    } catch (error) {
        console.error('Ошибка загрузки тестов:', error);
    }
}

// Отображение тестов
function displayStudentTests(tests, listId, emptyMessageId) {
    const container = document.getElementById(listId);
    const emptyMessage = document.getElementById(emptyMessageId);

    if (!container) {
        return;
    }

    if (!tests || tests.length === 0) {
        container.style.display = 'none';
        if (emptyMessage) {
            emptyMessage.style.display = 'block';
        }
        return;
    }

    container.style.display = 'grid';
    if (emptyMessage) {
        emptyMessage.style.display = 'none';
    }

    container.innerHTML = '';

    tests.forEach(test => {
        const testElement = createTestElement(test);
        container.appendChild(testElement);
    });
}

// Создание элемента теста
function createTestElement(test) {
    const testCard = document.createElement('div');
    testCard.className = 'lesson-card test-card';

    const statusMeta = getTestStatusMeta(test.status);
    const assignedDate = test.assignedAt ? formatDateTime(test.assignedAt) : null;

    let actionButtonHtml;
    if (test.status === 'COMPLETED') {
        actionButtonHtml = `
            <button class="lesson-btn secondary view-test-result-btn" data-assignment-id="${test.assignmentId}">
                <i class="fas fa-chart-line"></i>
                Смотреть результат
            </button>
        `;
    } else {
        actionButtonHtml = `
            <button class="lesson-btn primary start-test-btn" data-assignment-id="${test.assignmentId}">
                <i class="fas fa-pen"></i>
                Пройти тест
            </button>
        `;
    }

    testCard.innerHTML = `
        <div class="test-info">
            <div class="test-subject">
                <i class="fas fa-book-open"></i>
                ${test.subjectName}
            </div>
            <h3 class="test-title">${test.title}</h3>
            <div class="test-meta">
                <span>
                    <i class="fas fa-tag"></i>
                    ${test.category === 'BASIC' ? 'Базовый тест' : 'Промежуточный тест'}
                </span>
                <span>
                    <i class="fas fa-layer-group"></i>
                    ${test.difficultyLevel ? `Уровень ${test.difficultyLevel}` : 'Без уровня'}
                </span>
                <span>
                    <i class="fas fa-user"></i>
                    Автор: ${test.createdBy}
                </span>
            </div>
        </div>
        <div class="test-actions">
            <div class="lesson-status-badge ${statusMeta.className}">
                <i class="${statusMeta.icon}"></i>
                ${statusMeta.label}
            </div>
            <div class="test-assigned">
                <i class="fas fa-calendar-plus"></i>
                ${assignedDate ? `Назначен ${assignedDate}` : 'Дата не указана'}
            </div>
            ${actionButtonHtml}
        </div>
    `;

    return testCard;
}

function getTestStatusMeta(status) {
    switch (status) {
        case 'COMPLETED':
            return { className: 'completed', label: 'Завершён', icon: 'fas fa-check-circle' };
        case 'IN_PROGRESS':
            return { className: 'scheduled', label: 'В процессе', icon: 'fas fa-spinner' };
        default:
            return { className: 'scheduled', label: 'Назначен', icon: 'fas fa-flag' };
    }
}

// Функция для входа в урок
function joinLesson(lessonId) {
    console.log('Вход в урок:', lessonId);
    showToast('Открытие урока в новой вкладке...', 'info');
    
    // Сначала отмечаем вход в урок
    fetch(`/api/student/lessons/${lessonId}/join`, {
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
                        loadStudentLessons();
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

// Загрузка расписания ученика
async function loadStudentSchedule() {
    try {
        const studentId = document.body.getAttribute('data-student-id');
        if (!studentId) {
            console.warn('ID ученика не найден');
            return;
        }
        
        const response = await fetch(`/api/student/${studentId}/lessons`);
        if (!response.ok) {
            throw new Error('Ошибка загрузки расписания');
        }
        
        const lessons = await response.json();
        studentScheduleLessons = lessons || [];
        currentWeekOffset = 0;
        
        // Создаем расписание на основе уроков
        createScheduleTable(studentScheduleLessons);
        
    } catch (error) {
        console.error('Ошибка загрузки расписания:', error);
    }
}

function getWeekStartDate(referenceDate = new Date(), weekOffset = currentWeekOffset) {
    const date = new Date(referenceDate);
    const day = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff + weekOffset * 7);
    date.setHours(0, 0, 0, 0);
    return date;
}

function isSameCalendarDay(dateA, dateB) {
    return dateA.getFullYear() === dateB.getFullYear() &&
           dateA.getMonth() === dateB.getMonth() &&
           dateA.getDate() === dateB.getDate();
}

// Создание таблицы расписания
function createScheduleTable(lessons = studentScheduleLessons) {
    const loadingElement = document.getElementById('schedule-loading');
    const tableContainer = document.getElementById('schedule-table-container');
    const emptyElement = document.getElementById('schedule-empty');
    const scheduleTableBody = document.getElementById('scheduleTableBody');

    if (loadingElement) {
        loadingElement.style.display = 'none';
    }

    if (!scheduleTableBody) {
        return;
    }

    if (!lessons || lessons.length === 0) {
        scheduleTableBody.innerHTML = '';
        if (tableContainer) {
            tableContainer.style.display = 'none';
        }
        if (emptyElement) {
            emptyElement.style.display = 'block';
        }
        updateWeekDates();
        return;
    }

    if (tableContainer) {
        tableContainer.style.display = 'block';
    }
    if (emptyElement) {
        emptyElement.style.display = 'none';
    }

    // Создаем временные слоты (9:00 - 23:00)
    const timeSlots = [];
    for (let hour = 9; hour <= 23; hour++) {
        timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    }

    const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    const weekStart = getWeekStartDate(new Date(), currentWeekOffset);
    const now = new Date();

    scheduleTableBody.innerHTML = '';

    timeSlots.forEach(timeSlot => {
        const row = document.createElement('tr');

        const timeCell = document.createElement('td');
        timeCell.textContent = timeSlot;
        row.appendChild(timeCell);

        days.forEach((day, dayIndex) => {
            const cell = document.createElement('td');
            const slot = document.createElement('div');
            slot.classList.add('schedule-slot', 'empty');

            const slotDate = new Date(weekStart);
            slotDate.setDate(weekStart.getDate() + dayIndex);

            const [hour, minute] = timeSlot.split(':').map(Number);
            slotDate.setHours(hour, minute, 0, 0);

            const lesson = findLessonForDateTime(lessons, slotDate);
            const isPastSlot = slotDate < now;
            const isTodaySlot = isSameCalendarDay(slotDate, now);

            if (lesson) {
                slot.classList.remove('empty');
                slot.dataset.lessonId = lesson.id || '';
                slot.innerHTML = `
                    <div class="slot-subject">${lesson.subjectName}</div>
                    <div class="slot-student">${lesson.teacherName}</div>
                `;

                if (lesson.status === 'CANCELLED') {
                    slot.classList.add('cancelled');
                    slot.innerHTML += `<div class="slot-status-cancelled">Отменён</div>`;
                } else if (isPastSlot || lesson.status === 'COMPLETED') {
                    slot.classList.add('completed');
                } else {
                    slot.classList.add('scheduled');
                }
            } else {
                if (isPastSlot) {
                    slot.classList.add('past-day');
                    slot.textContent = 'Прошедшее время';
                }
            }

            if (isTodaySlot) {
                slot.classList.add('today');
            }

            cell.appendChild(slot);
            row.appendChild(cell);
        });

        scheduleTableBody.appendChild(row);
    });

    updateWeekDates(weekStart);
}

// Поиск урока по дате и времени
function findLessonForDateTime(lessons, targetDate) {
    return lessons.find(lesson => {
        const lessonDate = new Date(lesson.lessonDate);
        return lessonDate.getFullYear() === targetDate.getFullYear() &&
               lessonDate.getMonth() === targetDate.getMonth() &&
               lessonDate.getDate() === targetDate.getDate() &&
               lessonDate.getHours() === targetDate.getHours() &&
               lessonDate.getMinutes() === targetDate.getMinutes();
    });
}

// Обновление дат недели
function updateWeekDates(weekStart = getWeekStartDate(new Date(), currentWeekOffset)) {
    const dayIds = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

    dayIds.forEach((dayId, index) => {
        const dateElement = document.getElementById(`${dayId}-date`);
        if (dateElement) {
            const date = new Date(weekStart);
            date.setDate(weekStart.getDate() + index);
            dateElement.textContent = date.toLocaleDateString('ru-RU', { day: '2-digit' });
        }
    });

    const currentWeekElement = document.getElementById('currentWeek');
    if (currentWeekElement) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        const startLabel = weekStart.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
        const endLabel = weekEnd.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
        currentWeekElement.textContent = `${startLabel} - ${endLabel}`;
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Переключение вкладок в боковом меню
    const sidebarItems = document.querySelectorAll('.sidebar-item[data-tab]');
    sidebarItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Убираем активный класс у всех элементов
            sidebarItems.forEach(si => si.classList.remove('active'));
            
            // Добавляем активный класс к текущему элементу
            this.classList.add('active');
            
            // Показываем соответствующую вкладку
            const tabId = this.getAttribute('data-tab');
            if (tabId) {
                showTab(tabId);
            }
        });
    });
    
    // Кнопка "Сообщения" в шапке → переключает на вкладку сообщений
    const headerMessagesBtn = document.getElementById('headerMessagesBtn');
    if (headerMessagesBtn) {
        headerMessagesBtn.addEventListener('click', function() {
            // Активируем пункт сайдбара
            sidebarItems.forEach(si => si.classList.remove('active'));
            const msgItem = document.querySelector('.sidebar-item[data-tab="messages-tab"]');
            if (msgItem) msgItem.classList.add('active');
            showTab('messages-tab');
        });
    }
    
    // Переключение вкладок уроков
    const lessonTabs = document.querySelectorAll('.lesson-tab');
    lessonTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            if (tabId) {
                showLessonTab(tabId);
            }
        });
    });

    const testTabs = document.querySelectorAll('.test-tab');
    testTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            if (tabId) {
                showTestTab(tabId);
            }
        });
    });
    
    // Навигация по неделям в расписании
    const prevWeekBtn = document.getElementById('prevWeekBtn');
    const nextWeekBtn = document.getElementById('nextWeekBtn');

    if (prevWeekBtn) {
        prevWeekBtn.addEventListener('click', function() {
            currentWeekOffset -= 1;
            createScheduleTable();
        });
    }

    if (nextWeekBtn) {
        nextWeekBtn.addEventListener('click', function() {
            currentWeekOffset += 1;
            createScheduleTable();
        });
    }
    
    // Мобильное меню
    const mobileToggle = document.querySelector('.mobile-sidebar-toggle');
    const sidebar = document.querySelector('.sidebar');
    
    if (mobileToggle && sidebar) {
        mobileToggle.addEventListener('click', function() {
            sidebar.classList.toggle('open');
        });
    }
    
    // Кнопка выхода
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Вы уверены, что хотите выйти?')) {
                window.location.href = '/api/logout';
            }
        });
    }

    document.body.addEventListener('click', function(event) {
        const startBtn = event.target.closest('.start-test-btn');
        if (startBtn) {
            const assignmentId = startBtn.getAttribute('data-assignment-id');
            if (assignmentId) {
                openStudentTestModal(assignmentId);
            }
            return;
        }

        const viewResultBtn = event.target.closest('.view-test-result-btn');
        if (viewResultBtn) {
            showTab('progress-tab');
            loadStudentTestProgress();
        }
    });

    const submitTestBtn = document.getElementById('submitStudentTest');
    if (submitTestBtn) {
        submitTestBtn.addEventListener('click', submitStudentTest);
    }

    const closeTestBtn = document.getElementById('closeStudentTestModal');
    if (closeTestBtn) {
        closeTestBtn.addEventListener('click', closeStudentTestModal);
    }
}

// Показать вкладку
function showTab(tabId) {
    // Скрываем все вкладки
    const tabs = document.querySelectorAll('.dashboard-tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // Показываем выбранную вкладку
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.classList.add('active');
        
        // Обновляем заголовок страницы
        const pageTitle = document.querySelector('.page-title');
        if (pageTitle) {
            const tabTitle = getTabTitle(tabId);
            pageTitle.textContent = tabTitle;
        }

        if (tabId === 'progress-tab') {
            loadStudentTestProgress();
        }
        
        // Инициализируем чат при переключении на вкладку сообщений
        if (tabId === 'messages-tab' && window.brainifyChat) {
            window.brainifyChat.init();
        }
    }
}

// Показать вкладку уроков
function showLessonTab(tabId) {
    // Убираем активный класс у всех вкладок уроков
    const lessonTabs = document.querySelectorAll('.lesson-tab');
    lessonTabs.forEach(tab => tab.classList.remove('active'));
    
    // Скрываем все контенты вкладок уроков
    const lessonTabContents = document.querySelectorAll('.lessons-tab-content');
    lessonTabContents.forEach(content => content.classList.remove('active'));
    
    // Добавляем активный класс к выбранной вкладке
    const activeTab = document.querySelector(`.lesson-tab[data-tab="${tabId}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // Показываем соответствующий контент
    const targetContent = document.getElementById(tabId);
    if (targetContent) {
        targetContent.classList.add('active');
    }
    
    // Также обновляем вкладки на главной странице, если они существуют
    const mainTargetContent = document.getElementById(`main-${tabId}`);
    if (mainTargetContent) {
        mainTargetContent.classList.add('active');
    }
}

// Показать вкладку тестов
function showTestTab(tabId) {
    const testTabs = document.querySelectorAll('.test-tab');
    testTabs.forEach(tab => tab.classList.remove('active'));

    const testContents = document.querySelectorAll('.tests-tab-content');
    testContents.forEach(content => content.classList.remove('active'));

    const activeTab = document.querySelector(`.test-tab[data-tab="${tabId}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }

    const targetContent = document.getElementById(tabId);
    if (targetContent) {
        targetContent.classList.add('active');
    }
}

// Получить заголовок вкладки
function getTabTitle(tabId) {
    const titles = {
        'main-tab': 'Главная',
        'schedule-tab': 'Моё расписание',
        'messages-tab': 'Сообщения',
        'tests-tab': 'Мои тесты',
        'progress-tab': 'Прогресс',
        'profile-tab': 'Настройки'
    };
    
    return titles[tabId] || 'Главная';
}

// Утилиты
function formatDate(date) {
    return new Date(date).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatTime(date) {
    return new Date(date).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDateTime(date) {
    if (!date) {
        return '';
    }

    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
        return '';
    }

    const datePart = parsed.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    const timePart = parsed.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });

    return `${datePart} в ${timePart}`;
}

// Экспорт функций для использования в других скриптах
window.DashboardStudent = {
    loadStudentData,
    showTab,
    formatDate,
    formatTime
};

function initializeStudentTestModal() {
    studentTestModalElements = {
        backdrop: document.getElementById('studentTestBackdrop'),
        modal: document.getElementById('studentTestModal'),
        title: document.getElementById('studentTestTitle'),
        meta: document.getElementById('studentTestMeta'),
        questionsContainer: document.getElementById('studentTestQuestions'),
        resultLabel: document.getElementById('studentTestResult'),
        submitBtn: document.getElementById('submitStudentTest')
    };

    studentTestModalElements.backdrop?.addEventListener('click', closeStudentTestModal);
}

async function openStudentTestModal(assignmentId) {
    const studentId = document.body.getAttribute('data-student-id');
    if (!studentId) {
        showToast('Не удалось определить ученика', 'error');
        return;
    }

    activeTestAssignmentId = assignmentId;
    studentQuestionsCache = [];
    studentTestModalElements.resultLabel.textContent = '';

    if (studentTestModalElements.backdrop) {
        studentTestModalElements.backdrop.classList.add('open');
    }
    if (studentTestModalElements.modal) {
        studentTestModalElements.modal.classList.add('open');
        studentTestModalElements.modal.setAttribute('aria-hidden', 'false');
    }

    if (studentTestModalElements.questionsContainer) {
        studentTestModalElements.questionsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-spinner fa-spin"></i>
                <h4>Загружаем тест...</h4>
            </div>
        `;
    }

    try {
        const response = await fetch(`/api/student/${studentId}/tests/${assignmentId}/detail`);
        if (!response.ok) {
            throw new Error('Не удалось загрузить тест');
        }

        const data = await response.json();
        studentQuestionsCache = data.questions || [];

        if (studentTestModalElements.title) {
            studentTestModalElements.title.textContent = data.assignment.title;
        }
        if (studentTestModalElements.meta) {
            studentTestModalElements.meta.textContent = `${data.assignment.subjectName} • ${data.assignment.category === 'BASIC' ? 'Базовый тест' : 'Промежуточный тест'}`;
        }

        renderStudentTestQuestions(studentQuestionsCache);
    } catch (error) {
        console.error('Ошибка загрузки теста:', error);
        showToast(error.message || 'Не удалось загрузить тест', 'error');
        closeStudentTestModal();
    }
}

function closeStudentTestModal() {
    activeTestAssignmentId = null;
    if (studentTestModalElements.backdrop) {
        studentTestModalElements.backdrop.classList.remove('open');
    }
    if (studentTestModalElements.modal) {
        studentTestModalElements.modal.classList.remove('open');
        studentTestModalElements.modal.setAttribute('aria-hidden', 'true');
    }
}

function renderStudentTestQuestions(questions) {
    if (!studentTestModalElements.questionsContainer) {
        return;
    }

    if (!questions || questions.length === 0) {
        studentTestModalElements.questionsContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-info-circle"></i>
                <h4>Для этого теста пока нет заданий</h4>
                <p>Свяжитесь с преподавателем или администратором.</p>
            </div>
        `;
        studentTestModalElements.submitBtn?.setAttribute('disabled', 'disabled');
        return;
    }

    studentTestModalElements.submitBtn?.removeAttribute('disabled');

    studentTestModalElements.questionsContainer.innerHTML = questions.map((question, index) => `
        <div class="student-test-question" data-question-id="${question.id}">
            <h4>Задание ${index + 1} — ${question.questionNumber}</h4>
            <div class="student-test-question-text">${question.questionText.replace(/\n/g, '<br>')}</div>
            ${question.imageUrl ? `<img src="${question.imageUrl}" alt="Изображение задания">` : ''}
            <textarea placeholder="Ваш ответ" data-question-id="${question.id}" required></textarea>
        </div>
    `).join('');
}

async function submitStudentTest() {
    if (!activeTestAssignmentId) {
        showToast('Тест не выбран', 'warning');
        return;
    }

    const studentId = document.body.getAttribute('data-student-id');
    if (!studentId) {
        showToast('Не удалось определить ученика', 'error');
        return;
    }

    const answerElements = studentTestModalElements.questionsContainer?.querySelectorAll('textarea[data-question-id]') || [];
    if (answerElements.length === 0) {
        showToast('Нет доступных вопросов для отправки', 'warning');
        return;
    }

    const answers = [];
    answerElements.forEach(textarea => {
        answers.push({
            questionId: textarea.getAttribute('data-question-id'),
            answer: textarea.value.trim()
        });
    });

    const payload = { answers };

    try {
        studentTestModalElements.submitBtn?.setAttribute('disabled', 'disabled');
        studentTestModalElements.submitBtn?.classList.add('loading');

        const response = await fetch(`/api/student/${studentId}/tests/${activeTestAssignmentId}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Не удалось проверить ответы');
        }

        const attempt = result.attempt;
        if (studentTestModalElements.resultLabel) {
            studentTestModalElements.resultLabel.textContent = `Результат: ${attempt.correctAnswers} из ${attempt.totalQuestions} (${Number(attempt.scorePercentage ?? 0).toFixed(1)}%)`;
        }

        showToast('Тест успешно проверен', 'success');
        await loadStudentTests();
        await loadStudentTestProgress();
        setTimeout(closeStudentTestModal, 1200);
    } catch (error) {
        console.error('Ошибка проверки теста:', error);
        showToast(error.message || 'Не удалось проверить тест', 'error');
    } finally {
        studentTestModalElements.submitBtn?.removeAttribute('disabled');
        studentTestModalElements.submitBtn?.classList.remove('loading');
    }
}

async function loadStudentTestProgress() {
    const studentId = document.body.getAttribute('data-student-id');
    if (!studentId) {
        return;
    }

    try {
        const response = await fetch(`/api/student/${studentId}/tests/results`);
        if (!response.ok) {
            throw new Error('Не удалось загрузить прогресс по тестам');
        }

        const data = await response.json();
        renderTestProgressList('progressBasicTests', 'progressBasicCount', data.basic);
        renderTestProgressList('progressIntermediateTests', 'progressIntermediateCount', data.intermediate);
    } catch (error) {
        console.error('Ошибка загрузки прогресса тестов:', error);
    }
}

function renderTestProgressList(listId, counterId, items) {
    const container = document.getElementById(listId);
    const counter = document.getElementById(counterId);

    if (counter) {
        counter.textContent = items ? items.length : 0;
    }

    if (!container) {
        return;
    }

    if (!items || items.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard"></i>
                <h4>Пока нет результатов</h4>
                <p>После прохождения тестов ваши результаты появятся здесь.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="tests-progress-item">
            <div class="progress-info">
                <strong>${item.templateTitle}</strong>
                <div class="progress-meta">
                    <span><i class="fas fa-book"></i> ${item.subjectName}</span>
                    <span><i class="fas fa-calendar-check"></i> ${formatDateTime(item.submittedAt)}</span>
                </div>
            </div>
            <div class="progress-score">${item.correctAnswers}/${item.totalQuestions} (${Number(item.scorePercentage ?? 0).toFixed(1)}%)</div>
        </div>
    `).join('');
}
