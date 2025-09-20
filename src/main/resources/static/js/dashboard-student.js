// Dashboard Student JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Инициализация
    initializeDashboard();
    loadStudentData();
    setupEventListeners();
});

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
        
        // Разделяем уроки на ближайшие и все уроки
        const now = new Date();
        const upcomingLessons = lessons.filter(lesson => {
            const lessonDate = new Date(lesson.lessonDate);
            return lessonDate > now && lesson.status === 'SCHEDULED';
        }).sort((a, b) => new Date(a.lessonDate) - new Date(b.lessonDate));
        
        const allLessons = lessons.sort((a, b) => new Date(b.lessonDate) - new Date(a.lessonDate));
        
        displayUpcomingLessons(upcomingLessons);
        displayAllLessons(allLessons);
        
        // Также отображаем на главной странице
        displayMainUpcomingLessons(upcomingLessons);
        displayMainAllLessons(allLessons);
        
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
        statusText = 'Пропущен';
        statusIcon = 'fas fa-exclamation-triangle';
    }
    
    // Определяем, можно ли войти в урок
    const canJoin = lesson.status === 'SCHEDULED' && 
                   lessonDate > now && 
                   (lessonDate - now) <= 15 * 60 * 1000; // 15 минут до урока
    
    lessonDiv.innerHTML = `
        <div class="lesson-duration">
            <i class="fas fa-clock"></i>
            60 мин
        </div>
        
        <div class="lesson-info">
            <div class="lesson-subject">${lesson.subjectName}</div>
            <div class="lesson-topic">${lesson.topic || 'Тема не указана'}</div>
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
        </div>
        
        <div class="lesson-status-badge ${statusClass}">
            <i class="${statusIcon}"></i>
            ${statusText}
        </div>
        
        <div class="lesson-actions">
            ${canJoin ? `
                <button class="lesson-btn primary" onclick="joinLesson(${lesson.id})">
                    <i class="fas fa-video"></i>
                    Войти в урок
                </button>
            ` : lesson.status === 'SCHEDULED' ? `
                <button class="lesson-btn secondary" disabled>
                    <i class="fas fa-clock"></i>
                    Скоро начнётся
                </button>
            ` : lesson.status === 'COMPLETED' ? `
                <button class="lesson-btn success" disabled>
                    <i class="fas fa-check"></i>
                    Завершён
                </button>
            ` : `
                <button class="lesson-btn danger" disabled>
                    <i class="fas fa-times"></i>
                    Отменён
                </button>
            `}
        </div>
    `;
    
    return lessonDiv;
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
        
        // Создаем расписание на основе уроков
        createScheduleTable(lessons);
        
    } catch (error) {
        console.error('Ошибка загрузки расписания:', error);
    }
}

// Создание таблицы расписания
function createScheduleTable(lessons) {
    const loadingElement = document.getElementById('schedule-loading');
    const tableContainer = document.getElementById('schedule-table-container');
    const emptyElement = document.getElementById('schedule-empty');
    
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }
    
    if (lessons.length === 0) {
        if (tableContainer) {
            tableContainer.style.display = 'none';
        }
        if (emptyElement) {
            emptyElement.style.display = 'block';
        }
        return;
    }
    
    if (tableContainer) {
        tableContainer.style.display = 'block';
    }
    if (emptyElement) {
        emptyElement.style.display = 'none';
    }
    
    // Создаем временные слоты (9:00 - 21:00)
    const timeSlots = [];
    for (let hour = 9; hour <= 21; hour++) {
        timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    
    const tbody = document.getElementById('scheduleTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    timeSlots.forEach(timeSlot => {
        const row = document.createElement('tr');
        
        // Добавляем колонку времени
        const timeCell = document.createElement('td');
        timeCell.textContent = timeSlot;
        row.appendChild(timeCell);
        
        // Добавляем колонки для каждого дня недели
        const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
        
        days.forEach(day => {
            const cell = document.createElement('td');
            cell.className = 'schedule-slot';
            
            // Ищем урок в это время и день
            const lesson = findLessonForTimeAndDay(lessons, timeSlot, day);
            
            if (lesson) {
                cell.className += ' lesson-cell';
                cell.innerHTML = `
                    <div class="slot-subject">${lesson.subjectName}</div>
                    <div class="slot-student">${lesson.teacherName}</div>
                `;
            }
            
            row.appendChild(cell);
        });
        
        tbody.appendChild(row);
    });
    
    // Обновляем даты в заголовках
    updateWeekDates();
}

// Поиск урока по времени и дню
function findLessonForTimeAndDay(lessons, timeSlot, day) {
    const [hour, minute] = timeSlot.split(':').map(Number);
    
    return lessons.find(lesson => {
        const lessonDate = new Date(lesson.lessonDate);
        const lessonDay = lessonDate.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
        const lessonHour = lessonDate.getHours();
        const lessonMinute = lessonDate.getMinutes();
        
        return lessonDay === day && lessonHour === hour && lessonMinute === minute;
    });
}

// Обновление дат недели
function updateWeekDates() {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1);
    
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    days.forEach((day, index) => {
        const dateElement = document.getElementById(`${day}-date`);
        if (dateElement) {
            const date = new Date(monday);
            date.setDate(monday.getDate() + index);
            dateElement.textContent = date.getDate().toString().padStart(2, '0');
        }
    });
    
    // Обновляем заголовок текущей недели
    const currentWeekElement = document.getElementById('currentWeek');
    if (currentWeekElement) {
        const weekStart = monday.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
        const weekEnd = new Date(monday.getTime() + 6 * 24 * 60 * 60 * 1000)
            .toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
        currentWeekElement.textContent = `${weekStart} - ${weekEnd}`;
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Переключение вкладок в боковом меню
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    sidebarItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
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
    
    // Навигация по неделям в расписании
    const prevWeekBtn = document.getElementById('prevWeekBtn');
    const nextWeekBtn = document.getElementById('nextWeekBtn');
    
    if (prevWeekBtn) {
        prevWeekBtn.addEventListener('click', function() {
            // TODO: Реализовать навигацию по неделям
            console.log('Предыдущая неделя');
        });
    }
    
    if (nextWeekBtn) {
        nextWeekBtn.addEventListener('click', function() {
            // TODO: Реализовать навигацию по неделям
            console.log('Следующая неделя');
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

// Получить заголовок вкладки
function getTabTitle(tabId) {
    const titles = {
        'main-tab': 'Главная',
        'schedule-tab': 'Моё расписание',
        'lessons-tab': 'Мои уроки',
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

// Экспорт функций для использования в других скриптах
window.DashboardStudent = {
    loadStudentData,
    showTab,
    formatDate,
    formatTime
};
