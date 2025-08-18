// JavaScript для страницы личного кабинета

document.addEventListener('DOMContentLoaded', function() {
    initSidebar();
    initHeaderButtons();
    initSidebarItems();
    initLoadMore();
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