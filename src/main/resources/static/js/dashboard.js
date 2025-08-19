// JavaScript для страницы личного кабинета

document.addEventListener('DOMContentLoaded', function() {
    initSidebar();
    initHeaderButtons();
    initSidebarItems();
    initLoadMore();
    initTabSwitching();
    initScheduleControls();
    
    // Инициализируем даты при загрузке страницы
    updateCurrentWeekDisplay();
    
    // Инициализируем состояние кнопок
    updateScheduleButtonsState();
    
    // Загружаем данные преподавателя
    loadTeacherData();
    loadTeacherLessons();
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
    const sidebarItems = document.querySelectorAll('.sidebar-item');
    const pageTitle = document.querySelector('.page-title');

    sidebarItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Убираем активный класс со всех элементов
            sidebarItems.forEach(otherItem => {
                otherItem.classList.remove('active');
            });
            
            // Добавляем активный класс к выбранному элементу
            item.classList.add('active');
            
            // Обновляем заголовок страницы
            const itemText = item.querySelector('span').textContent;
            if (pageTitle) {
                pageTitle.textContent = itemText;
            }
            
            // Показываем уведомление
            showToast(`Переход в раздел "${itemText}"`, 'info');
            
            // Закрываем сайдбар на мобильных устройствах
            if (window.innerWidth <= 768) {
                const sidebar = document.querySelector('.sidebar');
                sidebar.classList.remove('open');
                const overlay = document.querySelector('.sidebar-overlay');
                if (overlay) {
                    overlay.remove();
                }
            }
        });
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

// Инициализация кнопки "Показать ещё"
function initLoadMore() {
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    const hiddenLessons = document.getElementById('hiddenLessons');
    
    if (loadMoreBtn && hiddenLessons) {
        loadMoreBtn.addEventListener('click', function() {
            if (hiddenLessons.classList.contains('hidden')) {
                // Показываем скрытые уроки
                hiddenLessons.classList.remove('hidden');
                hiddenLessons.classList.add('show');
                
                // Обновляем кнопку
                loadMoreBtn.querySelector('.btn-text').textContent = 'Скрыть дополнительные уроки';
                loadMoreBtn.classList.add('rotated');
                
                // Плавный скролл к новым урокам
                setTimeout(() => {
                    hiddenLessons.scrollIntoView({ 
                        behavior: 'smooth', 
                        block: 'start' 
                    });
                }, 100);
                
                showToast('Показаны дополнительные уроки', 'success');
                
            } else {
                // Скрываем уроки
                hiddenLessons.classList.remove('show');
                hiddenLessons.classList.add('hidden');
                
                // Обновляем кнопку
                loadMoreBtn.querySelector('.btn-text').textContent = 'Показать ещё 4 урока';
                loadMoreBtn.classList.remove('rotated');
                
                // Скролл обратно к основным урокам
                document.getElementById('lessonsGrid').scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
                
                showToast('Дополнительные уроки скрыты', 'info');
            }
        });
    }
}

// Запускаем анимации при загрузке
setTimeout(initLoadAnimations, 100);

// Функции для загрузки данных преподавателя
function loadTeacherData() {
    console.log('Загрузка данных преподавателя...');
    
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
        updateDashboardStats(data);
    })
    .catch(error => {
        console.error('Ошибка загрузки данных преподавателя:', error);
        // Показываем пустые значения при ошибке
        updateDashboardStats({
            totalLessons: 0,
            averageRating: 0.0,
            notificationCount: 0
        });
    });
}

function loadTeacherLessons() {
    console.log('Загрузка уроков преподавателя...');
    
    fetch('/api/teacher/lessons', {
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
        showNoLessonsMessage();
    });
}

function updateDashboardStats(data) {
    // Обновляем статистику
    const totalLessonsElement = document.getElementById('totalLessons');
    const averageRatingElement = document.getElementById('averageRating');
    const notificationCountElement = document.getElementById('notificationCount');
    const lessonsCountElement = document.getElementById('lessonsCount');
    
    if (totalLessonsElement) {
        totalLessonsElement.textContent = data.totalLessons || 0;
    }
    
    if (averageRatingElement) {
        averageRatingElement.textContent = (data.averageRating || 0.0).toFixed(1);
    }
    
    if (notificationCountElement) {
        notificationCountElement.textContent = data.notificationCount || 0;
    }
    
    if (lessonsCountElement) {
        lessonsCountElement.textContent = `Всего уроков: ${data.totalLessons || 0}`;
    }
}

function displayTeacherLessons(lessons) {
    const lessonsGrid = document.getElementById('lessonsGrid');
    const noLessonsMessage = document.getElementById('noLessonsMessage');
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    
    if (!lessonsGrid) return;
    
    // Очищаем контейнер
    lessonsGrid.innerHTML = '';
    
    if (!lessons || lessons.length === 0) {
        showNoLessonsMessage();
        return;
    }
    
    // Скрываем сообщение об отсутствии уроков
    if (noLessonsMessage) {
        noLessonsMessage.style.display = 'none';
    }
    
    // Отображаем уроки
    lessons.forEach((lesson, index) => {
        const lessonCard = createLessonCard(lesson);
        lessonsGrid.appendChild(lessonCard);
        
        // Показываем кнопку "Ещё" если уроков больше 4
        if (lessons.length > 4 && index === 3) {
            if (loadMoreContainer) {
                loadMoreContainer.style.display = 'block';
            }
        }
    });
    
    // Если уроков меньше или равно 4, скрываем кнопку "Ещё"
    if (lessons.length <= 4) {
        if (loadMoreContainer) {
            loadMoreContainer.style.display = 'none';
        }
    }
}

function createLessonCard(lesson) {
    const card = document.createElement('div');
    card.className = 'lesson-card teacher-lesson';
    
    // Определяем статус урока
    const status = getLessonStatus(lesson);
    const statusClass = getStatusClass(status);
    const statusText = getStatusText(status);
    
    card.innerHTML = `
        <div class="lesson-status-badge ${statusClass}">${statusText}</div>
        <div class="lesson-info">
            <h4 class="lesson-subject">${lesson.subjectName || 'Предмет не указан'}</h4>
            <p class="lesson-topic">${lesson.description || 'Тема не указана'}</p>
            <div class="lesson-meta">
                <span class="lesson-date">
                    <i class="fas fa-calendar"></i>
                    ${formatLessonDate(lesson.lessonDate)}
                </span>
                <span class="lesson-time">
                    <i class="fas fa-clock"></i>
                    ${formatLessonTime(lesson.lessonDate)}
                </span>
            </div>
            <div class="lesson-student">
                <i class="fas fa-user"></i>
                ${lesson.studentName || 'Ученик не указан'}
            </div>
        </div>
        ${createLessonActions(lesson, status)}
    `;
    
    return card;
}

function getLessonStatus(lesson) {
    const now = new Date();
    const lessonDate = new Date(lesson.lessonDate);
    
    if (lesson.status === 'COMPLETED') {
        return 'completed';
    } else if (lesson.status === 'CANCELLED') {
        return 'cancelled';
    } else if (lessonDate < now) {
        return 'overdue';
    } else if (isToday(lessonDate)) {
        return 'today';
    } else if (isTomorrow(lessonDate)) {
        return 'tomorrow';
    } else {
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
        case 'completed': return 'Завершен';
        case 'cancelled': return 'Отменен';
        case 'overdue': return 'Просрочен';
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

function formatLessonDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
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

function formatLessonTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function isToday(date) {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
}

function isTomorrow(date) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return date.getDate() === tomorrow.getDate() &&
           date.getMonth() === tomorrow.getMonth() &&
           date.getFullYear() === tomorrow.getFullYear();
}

function showNoLessonsMessage() {
    const lessonsGrid = document.getElementById('lessonsGrid');
    const noLessonsMessage = document.getElementById('noLessonsMessage');
    const loadMoreContainer = document.getElementById('loadMoreContainer');
    
    if (lessonsGrid) {
        lessonsGrid.innerHTML = '';
    }
    
    if (noLessonsMessage) {
        noLessonsMessage.style.display = 'block';
    }
    
    if (loadMoreContainer) {
        loadMoreContainer.style.display = 'none';
    }
}

// Функции для действий с уроками
function startLesson(lessonId) {
    console.log('Начинаем урок:', lessonId);
    showToast('Функция начала урока будет реализована позже', 'info');
}

function prepareLesson(lessonId) {
    console.log('Подготовка к уроку:', lessonId);
    showToast('Функция подготовки к уроку будет реализована позже', 'info');
}

// Функции для работы с вкладками
function initTabSwitching() {
    const sidebarItems = document.querySelectorAll('.sidebar-item[data-tab]');
    const tabs = document.querySelectorAll('.dashboard-tab');
    
    sidebarItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetTab = this.getAttribute('data-tab');
            
            // Убираем активный класс со всех элементов
            sidebarItems.forEach(otherItem => {
                otherItem.classList.remove('active');
            });
            tabs.forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Добавляем активный класс к выбранному элементу и вкладке
            this.classList.add('active');
            const targetTabElement = document.getElementById(targetTab);
            if (targetTabElement) {
                targetTabElement.classList.add('active');
            }
            
            // Если переключаемся на расписание, загружаем его
            if (targetTab === 'schedule-tab') {
                loadTeacherSchedule();
            }
            
            // Закрываем сайдбар на мобильных устройствах
            if (window.innerWidth <= 768) {
                const sidebar = document.querySelector('.sidebar');
                sidebar.classList.remove('open');
                const overlay = document.querySelector('.sidebar-overlay');
                if (overlay) {
                    overlay.remove();
                }
            }
        });
    });
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
        });
        prevWeekBtn.setAttribute('data-initialized', 'true');
    }
    
    if (nextWeekBtn && !nextWeekBtn.hasAttribute('data-initialized')) {
        nextWeekBtn.addEventListener('click', () => {
            currentWeekOffset++;
            loadTeacherSchedule();
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
    
    // Проверяем, не является ли слот занятым
    if (currentClass.includes('booked')) {
        showToast('Этот слот занят учеником и не может быть изменен', 'warning');
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
        
        // Запрашиваем подтверждение
        if (!confirm(`Подтвердите изменения:\n${message}\n\nПродолжить?`)) {
            return;
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
    
    // Запрашиваем подтверждение
    if (!confirm('Отменить все несохраненные изменения?')) {
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
                        slot.className = 'schedule-slot booked';
                        slot.innerHTML = `
                            <div class="slot-subject">${lessonAtThisTime.subjectName}</div>
                            <div class="slot-student">${lessonAtThisTime.studentName}</div>
                        `;
                        slot.setAttribute('data-lesson-id', lessonAtThisTime.lessonId);
                        // Занятые слоты не кликабельны
                    } else {
                        // Создаем ячейку с доступным временем
                        slot.className = 'schedule-slot available';
                        slot.innerHTML = 'Доступно';
                        slot.setAttribute('data-schedule-id', scheduleForThisTime.id);
                        
                        // Добавляем обработчик клика для доступных слотов
                        slot.addEventListener('click', () => handleSlotClick(slot));
                        console.log('Добавлен обработчик клика для доступного слота:', dayName, timeSlot);
                    }
                    
                    // Добавляем информацию о часовом поясе
                    if (scheduleForThisTime.teacherCity) {
                        slot.setAttribute('title', `Время указано по ${scheduleForThisTime.teacherCity}`);
                    }
                } else {
                    // Пустой слот - можно кликать для добавления
                    slot.className = 'schedule-slot empty';
                    slot.innerHTML = '';
                    
                    // Добавляем обработчик клика для редактирования
                    slot.addEventListener('click', () => handleSlotClick(slot));
                    console.log('Добавлен обработчик клика для пустого слота:', dayName, timeSlot);
                }
                
                cell.appendChild(slot);
            }
            
            row.appendChild(cell);
        }
        
        scheduleTableBody.appendChild(row);
    });
    
    console.log('Таблица расписания преподавателя с уроками создана');
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