// JavaScript для страницы личного кабинета ученика

document.addEventListener('DOMContentLoaded', function() {
    initSidebar();
    initHeaderButtons();
    initSidebarItems();
    initLessonItems();
    initProgressBars();
    initLoadMore();
    loadStudentLessons(); // Загружаем уроки студента
});

// Функция для загрузки уроков студента
async function loadStudentLessons() {
    try {
        // Получаем ID студента из URL или из данных страницы
        const studentId = getCurrentStudentId();
        if (!studentId) {
            console.error('Не удалось получить ID студента');
            return;
        }

        const response = await fetch(`/api/student/${studentId}/lessons`);
        if (!response.ok) {
            throw new Error('Ошибка загрузки уроков');
        }

        const lessons = await response.json();
        console.log('Загруженные уроки:', lessons);
        
        // Обновляем отображение уроков
        renderStudentLessons(lessons);
        
        // Обновляем счетчик уроков
        updateLessonsCount(lessons.length);
        
    } catch (error) {
        console.error('Ошибка загрузки уроков:', error);
        showStudentToast('Ошибка загрузки уроков', 'error');
    }
}

// Функция для получения ID текущего студента
function getCurrentStudentId() {
    // Получаем из data-атрибута body
    const body = document.body;
    const studentId = body.getAttribute('data-student-id');
    
    if (studentId) {
        return studentId;
    }
    
    console.error('ID студента не найден в data-атрибуте');
    return null;
}

// Функция для отображения уроков студента
function renderStudentLessons(lessons) {
    const lessonsGrid = document.getElementById('lessonsGrid');
    const hiddenLessons = document.getElementById('hiddenLessons');
    
    if (!lessonsGrid) {
        console.error('Элемент lessonsGrid не найден');
        return;
    }
    
    // Очищаем существующие уроки
    lessonsGrid.innerHTML = '';
    if (hiddenLessons) {
        hiddenLessons.innerHTML = '';
    }
    
    if (lessons.length === 0) {
        lessonsGrid.innerHTML = `
            <div class="no-lessons-message">
                <i class="fas fa-calendar-times"></i>
                <h3>У вас пока нет уроков</h3>
                <p>Обратитесь к администратору для назначения занятий</p>
            </div>
        `;
        return;
    }
    
    // Разделяем уроки на видимые и скрытые
    const visibleLessons = lessons.slice(0, 4);
    const hiddenLessonsArray = lessons.slice(4);
    
    // Отображаем видимые уроки
    visibleLessons.forEach(lesson => {
        const lessonCard = createLessonCard(lesson);
        lessonsGrid.appendChild(lessonCard);
    });
    
    // Отображаем скрытые уроки
    if (hiddenLessonsArray.length > 0 && hiddenLessons) {
        hiddenLessonsArray.forEach(lesson => {
            const lessonCard = createLessonCard(lesson);
            hiddenLessons.appendChild(lessonCard);
        });
        
        // Показываем кнопку "Показать ещё"
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = 'block';
            loadMoreBtn.querySelector('.btn-text').textContent = `Показать ещё ${hiddenLessonsArray.length} уроков`;
        }
    } else {
        // Скрываем кнопку "Показать ещё"
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = 'none';
        }
    }
}

// Функция для создания карточки урока
function createLessonCard(lesson) {
    const lessonCard = document.createElement('div');
    lessonCard.className = 'lesson-card';
    lessonCard.dataset.lessonId = lesson.id;
    
    // Определяем статус урока
    const status = getLessonStatus(lesson);
    const statusClass = getStatusClass(status);
    const statusText = getStatusText(status);
    
    // Форматируем дату и время
    const lessonDate = new Date(lesson.lessonDate);
    const formattedDate = formatDate(lessonDate);
    const formattedTime = formatTime(lessonDate);
    
    lessonCard.innerHTML = `
        <div class="lesson-status-badge ${statusClass}">${statusText}</div>
        <div class="lesson-info">
            <h4 class="lesson-subject">${lesson.subjectName}</h4>
            <p class="lesson-topic">${lesson.description || 'Тема не указана'}</p>
            <div class="lesson-meta">
                <span class="lesson-date">
                    <i class="fas fa-calendar"></i>
                    ${formattedDate}
                </span>
                <span class="lesson-time">
                    <i class="fas fa-clock"></i>
                    ${formattedTime}
                </span>
            </div>
            <div class="lesson-teacher">
                <i class="fas fa-user"></i>
                ${lesson.teacherName}
            </div>
        </div>
        ${getLessonActions(status, lesson)}
    `;
    
    return lessonCard;
}

// Функция для определения статуса урока
function getLessonStatus(lesson) {
    const now = new Date();
    const lessonDate = new Date(lesson.lessonDate);
    const fifteenMinutesBefore = new Date(lessonDate.getTime() - (15 * 60 * 1000)); // 15 минут до урока
    const oneHourAfter = new Date(lessonDate.getTime() + (60 * 60 * 1000)); // 1 час после урока
    
    if (lesson.status === 'COMPLETED') {
        return 'completed';
    } else if (lesson.status === 'CANCELLED') {
        return 'cancelled';
    } else if (lesson.status === 'MISSED') {
        return 'missed';
    } else if (now >= fifteenMinutesBefore && now <= oneHourAfter) {
        return 'ongoing';
    } else if (now < lessonDate) {
        const diffDays = Math.floor((lessonDate - now) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) {
            return 'today';
        } else if (diffDays === 1) {
            return 'tomorrow';
        } else {
            return 'scheduled';
        }
    } else {
        return 'missed';
    }
}

// Функция для получения CSS класса статуса
function getStatusClass(status) {
    switch (status) {
        case 'completed': return 'completed';
        case 'ongoing': return 'ongoing';
        case 'today': return 'today';
        case 'tomorrow': return 'tomorrow';
        case 'scheduled': return 'scheduled';
        case 'cancelled': return 'cancelled';
        case 'missed': return 'missed';
        default: return 'scheduled';
    }
}

// Функция для получения текста статуса
function getStatusText(status) {
    switch (status) {
        case 'completed': return 'Завершен';
        case 'ongoing': return 'Идет сейчас';
        case 'today': return 'Сегодня';
        case 'tomorrow': return 'Завтра';
        case 'scheduled': return 'Запланирован';
        case 'cancelled': return 'Отменен';
        case 'missed': return 'Пропущен';
        default: return 'Запланирован';
    }
}

// Функция для форматирования даты
function formatDate(date) {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Сегодня';
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Завтра';
    } else {
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }
}

// Функция для форматирования времени
function formatTime(date) {
    const startTime = date.toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const endTime = new Date(date.getTime() + 90 * 60000).toLocaleTimeString('ru-RU', {
        hour: '2-digit',
        minute: '2-digit'
    });
    
    return `${startTime} - ${endTime}`;
}

// Функция для получения действий урока
function getLessonActions(status, lesson) {
    const now = new Date();
    const lessonDate = new Date(lesson.lessonDate);
    const fifteenMinutesBefore = new Date(lessonDate.getTime() - (15 * 60 * 1000));
    const oneHourAfter = new Date(lessonDate.getTime() + (60 * 60 * 1000));
    
    switch (status) {
        case 'ongoing':
            if (now < lessonDate) {
                // Еще не начался, но можно присоединиться
                return `
                    <div class="lesson-actions">
                        <button class="lesson-btn primary" onclick="joinLesson(${lesson.id})">
                            Присоединиться
                        </button>
                    </div>
                `;
            } else if (now <= oneHourAfter) {
                // Урок идет
                return `
                    <div class="lesson-actions">
                        <button class="lesson-btn primary" onclick="joinLesson(${lesson.id})">
                            Присоединиться
                        </button>
                    </div>
                `;
            } else {
                return `
                    <div class="lesson-actions">
                        <button class="lesson-btn disabled" disabled>
                            Урок завершен
                        </button>
                    </div>
                `;
            }
        case 'today':
            if (now < fifteenMinutesBefore) {
                return `
                    <div class="lesson-actions">
                        <button class="lesson-btn disabled" disabled>
                            Доступно за 15 минут
                        </button>
                    </div>
                `;
            } else {
                return `
                    <div class="lesson-actions">
                        <button class="lesson-btn secondary" onclick="prepareForLesson(${lesson.id})">
                            Подготовиться
                        </button>
                    </div>
                `;
            }
        case 'tomorrow':
        case 'scheduled':
            return `
                <div class="lesson-actions">
                    <button class="lesson-btn secondary" onclick="prepareForLesson(${lesson.id})">
                        Подготовиться
                    </button>
                </div>
            `;
        case 'completed':
            return `
                <div class="lesson-grade">
                    <span class="grade excellent">✓</span>
                </div>
            `;
        default:
            return '';
    }
}

// Функция для обновления счетчика уроков
function updateLessonsCount(count) {
    const lessonsCountElement = document.querySelector('.lessons-count');
    if (lessonsCountElement) {
        lessonsCountElement.textContent = `Всего уроков: ${count}`;
    }
}

// Функция для присоединения к уроку
function joinLesson(lessonId) {
    showStudentToast('Переход к проверке оборудования...', 'info');
    // Перенаправляем на страницу проверки оборудования
    window.location.href = `/equipment-check?lessonId=${lessonId}`;
}

// Функция для подготовки к уроку
function prepareForLesson(lessonId) {
    showStudentToast('Открываем материалы для подготовки...', 'info');
    // Здесь можно добавить логику для подготовки к уроку
    setTimeout(() => {
        showStudentToast('Материалы загружены!', 'success');
    }, 1000);
}

// Инициализация бокового меню (упрощенная версия)
function initSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const mobileSidebarToggle = document.querySelector('.mobile-sidebar-toggle');

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
            showStudentToast('У вас 2 новых сообщения от преподавателей', 'info');
        });
    }

    if (profileBtn) {
        profileBtn.addEventListener('click', () => {
            showStudentToast('Страница профиля ученика будет доступна скоро', 'info');
        });
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Вы уверены, что хотите выйти из аккаунта?')) {
                showStudentToast('Выход из системы...', 'info');
                
                fetch('/api/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
                .then(response => {
                    console.log('Student dashboard logout response status:', response.status);
                    // Принудительная очистка кэша браузера
                    if ('caches' in window) {
                        caches.keys().then(names => {
                            names.forEach(name => caches.delete(name));
                        });
                    }
                    // Очистка localStorage и sessionStorage
                    localStorage.clear();
                    sessionStorage.clear();
                    showStudentToast('Выход выполнен успешно', 'success');
                    // Перенаправление с принудительным обновлением
                    setTimeout(() => {
                        window.location.replace('/');
                    }, 1000);
                })
                .catch(error => {
                    console.error('Student dashboard logout error:', error);
                    // Даже если запрос не удался, очищаем всё локально
                    if ('caches' in window) {
                        caches.keys().then(names => {
                            names.forEach(name => caches.delete(name));
                        });
                    }
                    localStorage.clear();
                    sessionStorage.clear();
                    showStudentToast('Выход выполнен', 'info');
                    setTimeout(() => {
                        window.location.replace('/');
                    }, 1000);
                });
            }
        });
    }
}

// Инициализация элементов сайдбара (упрощенная версия)
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
            
            // Показываем уведомление с разным контентом для разделов
            if (itemText === 'Главная') {
                showStudentToast('Добро пожаловать на главную страницу!', 'success');
            } else if (itemText === 'Расписание') {
                showStudentToast('Загружается расписание занятий...', 'info');
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

// Инициализация уроков
function initLessonItems() {
    const lessonItems = document.querySelectorAll('.lesson-item');

    lessonItems.forEach(item => {
        item.addEventListener('click', () => {
            const subject = item.querySelector('.lesson-subject').textContent;
            const teacher = item.querySelector('.lesson-teacher').textContent;
            const time = item.querySelector('.lesson-time').textContent;
            
            showStudentToast(`Урок "${subject}" с ${teacher} в ${time}`, 'info');
        });

        // Hover эффект для статуса урока
        const status = item.querySelector('.lesson-status');
        if (status) {
            item.addEventListener('mouseenter', () => {
                status.style.transform = 'scale(1.1)';
            });
            
            item.addEventListener('mouseleave', () => {
                status.style.transform = 'scale(1)';
            });
        }
    });
}

// Инициализация анимации прогресс-баров
function initProgressBars() {
    const progressBars = document.querySelectorAll('.progress-fill');
    
    // Анимируем прогресс-бары при загрузке страницы
    setTimeout(() => {
        progressBars.forEach((bar, index) => {
            const targetWidth = bar.style.width;
            bar.style.width = '0%';
            
            setTimeout(() => {
                bar.style.width = targetWidth;
            }, index * 200);
        });
    }, 500);

    // Добавляем интерактивность к элементам прогресса
    const progressItems = document.querySelectorAll('.progress-item');
    progressItems.forEach(item => {
        item.addEventListener('click', () => {
            const subject = item.querySelector('.subject-name').textContent;
            const percent = item.querySelector('.progress-percent').textContent;
            showStudentToast(`Прогресс по предмету "${subject}": ${percent}`, 'success');
        });
    });
}

// Функция показа уведомлений для ученика
function showStudentToast(message, type = 'info') {
    // Удаляем предыдущие уведомления
    const existingToasts = document.querySelectorAll('.student-toast');
    existingToasts.forEach(toast => toast.remove());

    const toast = document.createElement('div');
    toast.className = 'student-toast';
    
    // Определяем цвета для разных типов (синяя тема для ученика)
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
            bgColor = 'linear-gradient(135deg, #3b82f6, #1e40af)';
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
        box-shadow: 0 10px 30px rgba(30, 64, 175, 0.3);
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
        hideStudentToast(toast);
    });

    // Автоскрытие через 4 секунды
    setTimeout(() => {
        hideStudentToast(toast);
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
function hideStudentToast(toast) {
    if (!toast || !document.body.contains(toast)) return;
    
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    
    setTimeout(() => {
        if (document.body.contains(toast)) {
            toast.remove();
        }
    }, 300);
}

// Инициализация интерактивности достижений
function initAchievements() {
    const achievementItems = document.querySelectorAll('.achievement-item:not(.locked)');
    
    achievementItems.forEach(item => {
        item.addEventListener('click', () => {
            const achievementName = item.querySelector('.achievement-name').textContent;
            showStudentToast(`Достижение "${achievementName}" получено!`, 'success');
        });
    });

    // Заблокированные достижения
    const lockedItems = document.querySelectorAll('.achievement-item.locked');
    lockedItems.forEach(item => {
        item.addEventListener('click', () => {
            const achievementName = item.querySelector('.achievement-name').textContent;
            showStudentToast(`Достижение "${achievementName}" пока недоступно`, 'warning');
        });
    });
}

// Инициализация домашних заданий
function initHomework() {
    const homeworkItems = document.querySelectorAll('.homework-item');
    
    homeworkItems.forEach(item => {
        item.addEventListener('click', () => {
            const subject = item.querySelector('.homework-subject span').textContent;
            const title = item.querySelector('.homework-title').textContent;
            showStudentToast(`Открываем задание по ${subject}: "${title}"`, 'info');
        });
    });
}

// Инициализация оценок
function initGrades() {
    const gradeItems = document.querySelectorAll('.grade-item');
    
    gradeItems.forEach(item => {
        item.addEventListener('click', () => {
            const subject = item.querySelector('.grade-subject').textContent;
            const task = item.querySelector('.grade-task').textContent;
            const grade = item.querySelector('.grade-value').textContent;
            showStudentToast(`${subject} - ${task}: оценка ${grade}`, 'success');
        });
    });
}

// Инициализация анимаций при загрузке
function initStudentLoadAnimations() {
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
            }
        });
    }
}

// Дополнительные инициализации после загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    initAchievements();
    initHomework();
    initGrades();
    
    // Запускаем анимации при загрузке
    setTimeout(initStudentLoadAnimations, 100);
    
    // Приветственное сообщение для ученика
    setTimeout(() => {
        showStudentToast('Добро пожаловать в личный кабинет ученика!', 'success');
    }, 1000);
}); 