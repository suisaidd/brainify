// Основной JavaScript файл для Brainify - Новая концепция

console.log('main.js загружен');

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM загружен, инициализация компонентов...');
    
    // Принудительно устанавливаем класс для неавторизованных пользователей по умолчанию
    document.body.classList.add('user-unauthenticated');
    console.log('Установлен класс user-unauthenticated по умолчанию');
    
    // Проверяем, есть ли параметр успешной аутентификации
    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get('auth');
    
    if (authSuccess === 'success') {
        console.log('Обнаружен параметр успешной аутентификации, принудительно обновляем интерфейс');
        // Очищаем URL от параметров
        window.history.replaceState({}, document.title, window.location.pathname);
        // Принудительно проверяем статус аутентификации
        checkAuthStatus();
    } else {
        // Обычная проверка состояния аутентификации
        checkAuthStatus();
    }
    
    // Инициализация всех компонентов
    initMobileMenu();
    initSmoothScrolling();
    initButtonAnimations();
    initNavButtons();
    
    // Проверяем, что кнопки видны сразу после загрузки
    console.log('Проверяем видимость кнопок после инициализации...');
    const unauthorizedButtons = document.querySelectorAll('.unauthorized-buttons');
    console.log('Найдено кнопок для неавторизованных пользователей:', unauthorizedButtons.length);
    
    unauthorizedButtons.forEach((div, index) => {
        console.log(`Кнопка ${index}:`, div.className, 'display:', div.style.display, 'computed:', window.getComputedStyle(div).display);
    });
    
    // Принудительно устанавливаем класс для неавторизованных пользователей по умолчанию
    setTimeout(() => {
        if (!document.body.classList.contains('user-authenticated')) {
            console.log('Принудительно устанавливаем класс user-unauthenticated');
            document.body.classList.add('user-unauthenticated');
        }
        
        // Отладочная информация о кнопках
        const navButtons = document.querySelector('.nav-buttons');
        const mobileNavButtons = document.querySelector('.mobile-nav-buttons');
        
        console.log('nav-buttons найден:', !!navButtons);
        console.log('mobile-nav-buttons найден:', !!mobileNavButtons);
        
        if (navButtons) {
            const children = navButtons.children;
            console.log('Количество дочерних элементов в nav-buttons:', children.length);
            for (let i = 0; i < children.length; i++) {
                console.log(`Дочерний элемент ${i}:`, children[i].className, 'display:', children[i].style.display);
            }
        }
        
        if (mobileNavButtons) {
            const children = mobileNavButtons.children;
            console.log('Количество дочерних элементов в mobile-nav-buttons:', children.length);
            for (let i = 0; i < children.length; i++) {
                console.log(`Дочерний элемент ${i}:`, children[i].className, 'display:', children[i].style.display);
            }
        }
        
        // Если кнопки не видны, принудительно показываем их
        const unauthenticatedButtons = document.querySelectorAll('.unauthorized-buttons');
        let buttonsVisible = false;
        
        unauthenticatedButtons.forEach(div => {
            if (div.style.display !== 'none' && div.offsetParent !== null) {
                buttonsVisible = true;
            }
        });
        
        if (!buttonsVisible) {
            console.log('Кнопки не видны, принудительно показываем их');
            forceShowLoginButtons();
        }
    }, 100);
    
    console.log('Инициализация завершена');
});

// Мобильное меню
function initMobileMenu() {
    const mobileMenuButton = document.querySelector('.mobile-menu-btn');
    const mobileMenu = document.querySelector('.mobile-menu');

    if (mobileMenuButton && mobileMenu) {
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }
    
    // Инициализируем навигацию в мобильном меню отдельно
    initMobileNavButtons();
}

// Инициализация навигационных кнопок в мобильном меню
function initMobileNavButtons() {
    console.log('Инициализация мобильных навигационных кнопок...');
    
    // Мобильные кнопки входа
    const mobileLoginButtons = document.querySelectorAll('.mobile-nav-buttons .nav-btn-login');
    console.log('Найдено мобильных кнопок входа:', mobileLoginButtons.length);
    mobileLoginButtons.forEach(button => {
        button.addEventListener('click', function() {
            window.location.href = '/auth/login';
        });
    });

    // Мобильные кнопки регистрации
    const mobileRegisterButtons = document.querySelectorAll('.mobile-nav-buttons .nav-btn-register');
    console.log('Найдено мобильных кнопок регистрации:', mobileRegisterButtons.length);
    mobileRegisterButtons.forEach(button => {
        button.addEventListener('click', function() {
            window.location.href = '/auth/register';
        });
    });

    // Мобильные кнопки бесплатного урока
    const mobileFreeLessonButtons = document.querySelectorAll('.mobile-nav-buttons .nav-btn-free, .mobile-nav-buttons .free-lesson-btn');
    console.log('Найдено мобильных кнопок бесплатного урока:', mobileFreeLessonButtons.length);
    mobileFreeLessonButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Клик по мобильной кнопке бесплатного урока');
            showFreeLessonModal();
        });
    });
    
    // Мобильные кнопки выхода
    const mobileLogoutButtons = document.querySelectorAll('.mobile-nav-buttons .nav-btn-logout');
    console.log('Найдено мобильных кнопок выхода:', mobileLogoutButtons.length);
    mobileLogoutButtons.forEach(button => {
        button.addEventListener('click', function() {
            console.log('Нажата мобильная кнопка выхода');
            logout();
        });
    });

    // Мобильные кнопки перехода в личный кабинет
    const mobileDashboardButtons = document.querySelectorAll('.mobile-nav-buttons .nav-btn-dashboard');
    console.log('Найдено мобильных кнопок кабинета:', mobileDashboardButtons.length);
    mobileDashboardButtons.forEach(button => {
        button.addEventListener('click', function() {
            const userRole = this.getAttribute('data-role');
            console.log('Нажата мобильная кнопка кабинета. Роль пользователя:', userRole);
            
            // Перенаправляем в зависимости от роли
            switch(userRole) {
                case 'STUDENT':
                    console.log('Мобильное перенаправление на dashboard-student');
                    window.location.href = '/dashboard-student';
                    break;
                case 'TEACHER':
                    console.log('Мобильное перенаправление на dashboard');
                    window.location.href = '/dashboard';
                    break;
                case 'MANAGER':
                case 'ADMIN':
                    console.log('Мобильное перенаправление на admin-role');
                    window.location.href = '/admin-role';
                    break;
                default:
                    console.log('Мобильное универсальное перенаправление на dashboard');
                    window.location.href = '/dashboard';
                    break;
            }
        });
    });

    // Мобильные кнопки для разработчика
    const mobileDevButtons = document.querySelectorAll('.mobile-nav-buttons .nav-btn-dev');
    console.log('Найдено мобильных кнопок разработчика:', mobileDevButtons.length);
    mobileDevButtons.forEach(button => {
        button.addEventListener('click', function() {
            console.log('Нажата мобильная кнопка разработчика - автоматический вход');
            devLogin();
        });
    });

    // Мобильные кнопки для автоматического входа ученика
    const mobileDevStudentButtons = document.querySelectorAll('.mobile-nav-buttons .nav-btn-dev-student');
    console.log('Найдено мобильных кнопок автоматического входа ученика:', mobileDevStudentButtons.length);
    mobileDevStudentButtons.forEach(button => {
        button.addEventListener('click', function() {
            console.log('Нажата мобильная кнопка автоматического входа ученика');
            devStudentLogin();
        });
    });

    // Мобильные кнопки для автоматического входа преподавателя
    const mobileDevTeacherButtons = document.querySelectorAll('.mobile-nav-buttons .nav-btn-dev-teacher');
    console.log('Найдено мобильных кнопок автоматического входа преподавателя:', mobileDevTeacherButtons.length);
    mobileDevTeacherButtons.forEach(button => {
        button.addEventListener('click', function() {
            console.log('Нажата мобильная кнопка автоматического входа преподавателя');
            devTeacherLogin();
        });
    });
}

// Плавная прокрутка для якорных ссылок
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        // Пропускаем элементы сайдбара — у них своя логика переключения вкладок
        if (anchor.classList.contains('sidebar-item')) return;

        const targetId = anchor.getAttribute('href');
        // Пропускаем пустые якоря (href="#")
        if (!targetId || targetId === '#') return;

        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            try {
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            } catch (err) {
                // Невалидный селектор — игнорируем
            }
        });
    });
}

// Анимации для главных кнопок
function initButtonAnimations() {
    const mainButtons = document.querySelectorAll('.main-btn');
    
    mainButtons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateX(10px) scale(1.02)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateX(0) scale(1)';
        });
        
        // Добавляем эффект при клике
        button.addEventListener('click', function(e) {
            // Создаем эффект пульсации
            const ripple = document.createElement('div');
            ripple.style.position = 'absolute';
            ripple.style.borderRadius = '50%';
            ripple.style.background = 'rgba(163, 230, 53, 0.3)';
            ripple.style.transform = 'scale(0)';
            ripple.style.animation = 'ripple 0.6s linear';
            ripple.style.left = (e.clientX - this.offsetLeft) + 'px';
            ripple.style.top = (e.clientY - this.offsetTop) + 'px';
            ripple.style.width = ripple.style.height = '20px';
            
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });
}

// Добавляем CSS анимацию для ripple эффекта
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Анимация появления элементов при скролле
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fade-in');
            }
        });
    }, observerOptions);

    // Наблюдаем за элементами, которые должны анимироваться
    document.querySelectorAll('.main-btn, .feature, .section-title').forEach(el => {
        observer.observe(el);
    });
}

// Показ модального окна для бесплатного урока
function showFreeLessonModal() {
    console.log('Открываем модальное окно бесплатного урока'); // Отладочная информация
    const modal = document.createElement('div');
    modal.className = 'package-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Записаться на бесплатный урок</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="special-offer-modal">
                    <div class="offer-badge-modal">🎁 БЕСПЛАТНЫЙ УРОК</div>
                    <p class="offer-text-modal"><strong>Первое занятие абсолютно БЕСПЛАТНО!</strong></p>
                    <p class="offer-description-modal">Познакомьтесь с нашим преподавателем и методикой без каких-либо обязательств</p>
                </div>
                
                <div class="modal-package-info">
                    <h4>Бесплатная консультация</h4>
                    <p>Оставьте заявку, и мы перезвоним вам в течение 15 минут для записи на бесплатный урок</p>
                </div>
                
                <div class="modal-application-form">
                    <form id="freeLessonForm" class="modal-form-container">
                        <div class="modal-phone-input-container">
                            <span class="modal-phone-prefix">+7</span>
                            <input type="tel" 
                                   id="freeLessonPhone" 
                                   name="phone" 
                                   placeholder="(999) 123-45-67" 
                                   class="modal-phone-input"
                                   maxlength="15"
                                   required>
                        </div>
                        
                        <button type="submit" class="modal-submit-button">
                            ЗАПИСАТЬСЯ НА БЕСПЛАТНЫЙ УРОК
                        </button>
                        
                        <p class="modal-privacy-text">
                            Отправляя форму, вы соглашаетесь с 
                            <a href="#" class="privacy-link">офертой</a> и 
                            <a href="#" class="privacy-link">политикой обработки персональных данных</a> 
                            и даёте согласие на обработку данных
                        </p>
                    </form>
                </div>
            </div>
        </div>
    `;

    // Добавляем стили для модального окна (если их еще нет)
    if (!document.querySelector('#packageModalStyles')) {
        const modalStyles = document.createElement('style');
        modalStyles.id = 'packageModalStyles';
        modalStyles.textContent = `
            .package-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                animation: fadeIn 0.3s ease;
            }
            
            .package-modal .modal-content {
                background: white;
                border-radius: 20px;
                padding: 2rem;
                max-width: 500px;
                width: 90%;
                position: relative;
                animation: slideIn 0.3s ease;
                max-height: 90vh;
                overflow-y: auto;
            }
            
            .package-modal .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 1.5rem;
            }
            
            .package-modal .modal-header h3 {
                margin: 0;
                color: #1e293b;
            }
            
            .package-modal .modal-close {
                background: none;
                border: none;
                font-size: 1.5rem;
                cursor: pointer;
                color: #64748b;
            }
            
            .package-modal .special-offer-modal {
                background: linear-gradient(135deg, #dbeafe, #3b82f6);
                padding: 1.5rem;
                border-radius: 15px;
                text-align: center;
                margin-bottom: 1.5rem;
                border: 2px solid #2563eb;
            }
            
            .package-modal .offer-badge-modal {
                background: linear-gradient(135deg, #2563eb, #1d4ed8);
                color: white;
                padding: 0.5rem 1rem;
                border-radius: 20px;
                font-size: 0.875rem;
                font-weight: 700;
                display: inline-block;
                margin-bottom: 0.75rem;
                letter-spacing: 0.05em;
            }
            
            .package-modal .offer-text-modal {
                font-size: 1.125rem;
                color: #1e40af;
                margin: 0.5rem 0;
            }
            
            .package-modal .offer-description-modal {
                font-size: 0.875rem;
                color: #1e3a8a;
                margin: 0;
            }
            
            .package-modal .modal-package-info {
                background: #f8fafc;
                padding: 1.5rem;
                border-radius: 15px;
                margin-bottom: 1.5rem;
                text-align: center;
            }
            
            .package-modal .modal-package-info h4 {
                color: #a3e635;
                font-size: 1.25rem;
                margin-bottom: 0.5rem;
            }
            
            .package-modal .modal-package-info p {
                color: #64748b;
                margin: 0;
                line-height: 1.6;
            }
            
            .package-modal .modal-form-container {
                display: flex;
                flex-direction: column;
                gap: 1.5rem;
                align-items: center;
            }
            
            .package-modal .modal-phone-input-container {
                position: relative;
                width: 100%;
                max-width: 300px;
                display: flex;
                align-items: center;
                background: #f8fafc;
                border: 2px solid #e2e8f0;
                border-radius: 12px;
                padding: 0;
                overflow: hidden;
                transition: all 0.3s ease;
            }
            
            .package-modal .modal-phone-input-container:focus-within {
                border-color: #a3e635;
                background: white;
                box-shadow: 0 0 0 3px rgba(163, 230, 53, 0.1);
            }
            
            .package-modal .modal-phone-prefix {
                background: linear-gradient(135deg, #a3e635, #84cc16);
                color: white;
                padding: 1rem 1.25rem;
                font-weight: 600;
                font-size: 1rem;
                border-right: 2px solid rgba(255, 255, 255, 0.2);
            }
            
            .package-modal .modal-phone-input {
                flex: 1;
                border: none;
                outline: none;
                padding: 1rem 1.25rem;
                font-size: 1rem;
                background: transparent;
                color: #1e293b;
                font-weight: 500;
            }
            
            .package-modal .modal-phone-input::placeholder {
                color: #94a3b8;
                font-weight: 400;
            }
            
            .package-modal .modal-submit-button {
                width: 100%;
                max-width: 300px;
                background: linear-gradient(135deg, #a3e635, #84cc16);
                color: white;
                border: none;
                padding: 1rem 1.5rem;
                border-radius: 12px;
                font-size: 1rem;
                font-weight: 700;
                letter-spacing: 0.05em;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 8px 25px rgba(163, 230, 53, 0.3);
                position: relative;
                overflow: hidden;
            }
            
            .package-modal .modal-submit-button:hover {
                transform: translateY(-2px);
                box-shadow: 0 12px 35px rgba(163, 230, 53, 0.4);
                background: linear-gradient(135deg, #84cc16, #65a30d);
            }
            
            .package-modal .modal-submit-button::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
                transition: left 0.5s ease;
            }
            
            .package-modal .modal-submit-button:hover::before {
                left: 100%;
            }
            
            .package-modal .modal-privacy-text {
                font-size: 0.75rem;
                color: #64748b;
                line-height: 1.5;
                text-align: center;
                max-width: 300px;
                margin: 0;
            }
            
            .package-modal .privacy-link {
                color: #a3e635;
                text-decoration: none;
                font-weight: 500;
                transition: color 0.3s ease;
            }
            
            .package-modal .privacy-link:hover {
                color: #84cc16;
                text-decoration: underline;
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideIn {
                from { transform: translateY(-50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        `;
        document.head.appendChild(modalStyles);
    }
    
    document.body.appendChild(modal);

    // Обработчики для модального окна
    const closeBtn = modal.querySelector('.modal-close');
    const phoneInput = modal.querySelector('#freeLessonPhone');
    const form = modal.querySelector('#freeLessonForm');
    const submitBtn = modal.querySelector('.modal-submit-button');

    closeBtn.addEventListener('click', () => {
        modal.remove();
    });

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });

    // Форматирование номера телефона
    phoneInput.addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        let formattedValue = '';
        
        if (value.length > 0) {
            if (value.length <= 3) {
                formattedValue = `(${value}`;
            } else if (value.length <= 6) {
                formattedValue = `(${value.slice(0, 3)}) ${value.slice(3)}`;
            } else if (value.length <= 8) {
                formattedValue = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6)}`;
            } else if (value.length <= 10) {
                formattedValue = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 8)}-${value.slice(8)}`;
            } else {
                formattedValue = `(${value.slice(0, 3)}) ${value.slice(3, 6)}-${value.slice(6, 8)}-${value.slice(8, 10)}`;
            }
        }
        
        e.target.value = formattedValue;
    });

    // Обработка отправки формы
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const phoneNumber = phoneInput.value.replace(/\D/g, '');
        
        if (phoneNumber.length !== 10) {
            showToast('Пожалуйста, введите корректный номер телефона', 'error');
            return;
        }
        
        // Показываем состояние загрузки
        submitBtn.disabled = true;
        submitBtn.textContent = 'ОТПРАВЛЯЕМ...';
        submitBtn.style.opacity = '0.7';
        
        setTimeout(() => {
            showToast('Спасибо! Мы перезвоним вам в течение 15 минут для записи на бесплатный урок.', 'success');
            modal.remove();
        }, 2000);
    });
}

// Функция для показа уведомлений
function showToast(message, type = 'info') {
    // Удаляем предыдущие toast
    const existingToasts = document.querySelectorAll('.toast-notification');
    existingToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    
    // Определяем стили по типу
    let bgColor, iconClass;
    switch (type) {
        case 'success':
            bgColor = 'linear-gradient(135deg, #10b981, #059669)';
            iconClass = '✓';
            break;
        case 'error':
            bgColor = 'linear-gradient(135deg, #ef4444, #dc2626)';
            iconClass = '✗';
            break;
        default:
            bgColor = 'linear-gradient(135deg, #3b82f6, #1e40af)';
            iconClass = 'ℹ';
    }
    
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">${iconClass}</span>
            <span class="toast-message">${message}</span>
        </div>
        <button class="toast-close">
            ×
        </button>
    `;
    
    // Стили toast
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${bgColor};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
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
    `;
    
    // Стили для содержимого
    const content = toast.querySelector('.toast-content');
    content.style.cssText = `
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
        font-size: 18px;
        line-height: 1;
    `;
    
    document.body.appendChild(toast);
    
    // Анимация появления
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(0)';
    }, 10);
    
    // Обработчик закрытия
    closeBtn.addEventListener('click', () => hideToast(toast));
    
    // Автоскрытие
    setTimeout(() => hideToast(toast), 5000);
    
    // Hover эффекты
    closeBtn.addEventListener('mouseenter', () => {
        closeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    });
    
    closeBtn.addEventListener('mouseleave', () => {
        closeBtn.style.background = 'none';
    });
}

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

// Инициализация навигационных кнопок
function initNavButtons() {
    console.log('Инициализация навигационных кнопок...');
    
    // Кнопки входа
    const loginButtons = document.querySelectorAll('.nav-btn-login');
    console.log('Найдено кнопок входа:', loginButtons.length);
    loginButtons.forEach(button => {
        button.addEventListener('click', function() {
            window.location.href = '/auth/login';
        });
    });

    // Кнопки регистрации
    const registerButtons = document.querySelectorAll('.nav-btn-register');
    console.log('Найдено кнопок регистрации:', registerButtons.length);
    registerButtons.forEach(button => {
        button.addEventListener('click', function() {
            window.location.href = '/auth/register';
        });
    });

    // Кнопки бесплатного урока
    const freeLessonButtons = document.querySelectorAll('.nav-btn-free, .free-lesson-btn');
    console.log('Найдено кнопок бесплатного урока:', freeLessonButtons.length);
    freeLessonButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Клик по кнопке бесплатного урока');
            showFreeLessonModal();
        });
    });

    // Кнопки выхода
    const logoutButtons = document.querySelectorAll('.nav-btn-logout');
    console.log('Найдено кнопок выхода:', logoutButtons.length);
    logoutButtons.forEach(button => {
        button.addEventListener('click', function() {
            console.log('Нажата кнопка выхода');
            logout();
        });
    });

    // Кнопки перехода в личный кабинет
    const dashboardButtons = document.querySelectorAll('.nav-btn-dashboard');
    console.log('Найдено кнопок кабинета:', dashboardButtons.length);
    dashboardButtons.forEach(button => {
        button.addEventListener('click', function() {
            const userRole = this.getAttribute('data-role');
            console.log('Нажата кнопка кабинета. Роль пользователя:', userRole);
            
            // Перенаправляем в зависимости от роли
            switch(userRole) {
                case 'STUDENT':
                    console.log('Перенаправление на dashboard-student');
                    window.location.href = '/dashboard-student';
                    break;
                case 'TEACHER':
                    console.log('Перенаправление на dashboard');
                    window.location.href = '/dashboard';
                    break;
                case 'MANAGER':
                case 'ADMIN':
                    console.log('Перенаправление на admin-role');
                    window.location.href = '/admin-role';
                    break;
                default:
                    console.log('Универсальное перенаправление на dashboard');
                    window.location.href = '/dashboard'; // Универсальная обработка
                    break;
            }
        });
    });

    // Кнопки для разработчика
    const devButtons = document.querySelectorAll('.nav-btn-dev');
    console.log('Найдено кнопок разработчика:', devButtons.length);
    devButtons.forEach(button => {
        button.addEventListener('click', function() {
            console.log('Нажата кнопка разработчика - автоматический вход');
            devLogin();
        });
    });

    // Кнопки для автоматического входа ученика
    const devStudentButtons = document.querySelectorAll('.nav-btn-dev-student');
    console.log('Найдено кнопок автоматического входа ученика:', devStudentButtons.length);
    devStudentButtons.forEach(button => {
        button.addEventListener('click', function() {
            console.log('Нажата кнопка автоматического входа ученика');
            devStudentLogin();
        });
    });

    // Кнопки для автоматического входа преподавателя
    const devTeacherButtons = document.querySelectorAll('.nav-btn-dev-teacher');
    console.log('Найдено кнопок автоматического входа преподавателя:', devTeacherButtons.length);
    devTeacherButtons.forEach(button => {
        button.addEventListener('click', function() {
            console.log('Нажата кнопка автоматического входа преподавателя');
            devTeacherLogin();
        });
    });
}

// Функция выхода из аккаунта
function logout() {
    console.log('Вызвана функция logout');
    if (confirm('Вы уверены, что хотите выйти из аккаунта?')) {
        console.log('Пользователь подтвердил выход');
        fetch('/api/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            console.log('Ответ от сервера на logout:', response.status);
            // Принудительная очистка кэша браузера
            if ('caches' in window) {
                caches.keys().then(names => {
                    names.forEach(name => caches.delete(name));
                });
            }
            // Очистка localStorage и sessionStorage
            localStorage.clear();
            sessionStorage.clear();
            // Перенаправление с принудительным обновлением
            window.location.replace('/');
        })
        .catch(error => {
            console.error('Ошибка при выходе:', error);
            // Даже если запрос не удался, очищаем всё локально
            if ('caches' in window) {
                caches.keys().then(names => {
                    names.forEach(name => caches.delete(name));
                });
            }
            localStorage.clear();
            sessionStorage.clear();
            window.location.replace('/');
        });
    } else {
        console.log('Пользователь отменил выход');
    }
}

// Простые модальные окна для входа и регистрации
function showLoginModal() {
    const modal = document.createElement('div');
    modal.className = 'auth-modal';
    modal.innerHTML = `
        <div class="auth-modal-content">
            <div class="auth-modal-header">
                <h3>Вход в систему</h3>
                <button class="auth-modal-close">&times;</button>
            </div>
            <div class="auth-modal-body">
                <form class="auth-form">
                    <div class="auth-field">
                        <label>Email или телефон</label>
                        <input type="text" placeholder="Введите email или телефон" required>
                    </div>
                    <div class="auth-field">
                        <label>Пароль</label>
                        <input type="password" placeholder="Введите пароль" required>
                    </div>
                    <button type="submit" class="auth-submit">ВОЙТИ</button>
                    <p class="auth-switch">
                        Нет аккаунта? <a href="#" onclick="showRegisterModal(); this.closest('.auth-modal').remove();">Зарегистрироваться</a>
                    </p>
                </form>
            </div>
        </div>
    `;
    
    addAuthModalStyles();
    document.body.appendChild(modal);
    setupAuthModal(modal);
}

function showRegisterModal() {
    const modal = document.createElement('div');
    modal.className = 'auth-modal';
    modal.innerHTML = `
        <div class="auth-modal-content">
            <div class="auth-modal-header">
                <h3>Регистрация</h3>
                <button class="auth-modal-close">&times;</button>
            </div>
            <div class="auth-modal-body">
                <form class="auth-form">
                    <div class="auth-field">
                        <label>Имя</label>
                        <input type="text" placeholder="Введите ваше имя" required>
                    </div>
                    <div class="auth-field">
                        <label>Email</label>
                        <input type="email" placeholder="Введите email" required>
                    </div>
                    <div class="auth-field">
                        <label>Телефон</label>
                        <input type="tel" placeholder="+7 (999) 123-45-67" required>
                    </div>
                    <div class="auth-field">
                        <label>Пароль</label>
                        <input type="password" placeholder="Придумайте пароль" required>
                    </div>
                    <button type="submit" class="auth-submit">ЗАРЕГИСТРИРОВАТЬСЯ</button>
                    <p class="auth-switch">
                        Уже есть аккаунт? <a href="#" onclick="showLoginModal(); this.closest('.auth-modal').remove();">Войти</a>
                    </p>
                </form>
            </div>
        </div>
    `;
    
    addAuthModalStyles();
    document.body.appendChild(modal);
    setupAuthModal(modal);
}

function addAuthModalStyles() {
    if (document.querySelector('#authModalStyles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'authModalStyles';
    styles.textContent = `
        .auth-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            animation: fadeIn 0.3s ease;
        }
        
        .auth-modal-content {
            background: white;
            border-radius: 20px;
            padding: 2rem;
            max-width: 400px;
            width: 90%;
            animation: slideIn 0.3s ease;
        }
        
        .auth-modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }
        
        .auth-modal-header h3 {
            margin: 0;
            color: #1e293b;
            font-size: 1.5rem;
        }
        
        .auth-modal-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #64748b;
        }
        
        .auth-form {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        
        .auth-field {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        
        .auth-field label {
            font-weight: 600;
            color: #374151;
            font-size: 0.875rem;
        }
        
        .auth-field input {
            padding: 0.75rem;
            border: 2px solid #e2e8f0;
            border-radius: 10px;
            font-size: 1rem;
            transition: border-color 0.3s ease;
        }
        
        .auth-field input:focus {
            outline: none;
            border-color: #a3e635;
        }
        
        .auth-submit {
            background: linear-gradient(135deg, #a3e635, #84cc16);
            color: white;
            border: none;
            padding: 1rem;
            border-radius: 10px;
            font-weight: 700;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 0.5rem;
        }
        
        .auth-submit:hover {
            background: linear-gradient(135deg, #84cc16, #65a30d);
            transform: translateY(-2px);
        }
        
        .auth-switch {
            text-align: center;
            font-size: 0.875rem;
            color: #64748b;
            margin: 1rem 0 0 0;
        }
        
        .auth-switch a {
            color: #a3e635;
            text-decoration: none;
            font-weight: 600;
        }
        
        .auth-switch a:hover {
                         text-decoration: underline;
         }
     `;
     document.head.appendChild(styles);
}

function setupAuthModal(modal) {
    const closeBtn = modal.querySelector('.auth-modal-close');
    const form = modal.querySelector('.auth-form');
    
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Функция авторизации будет реализована позже');
        modal.remove();
    });
}

// Инициализация анимаций при скролле
initScrollAnimations();

// Функция автоматического входа для разработчика
function devLogin() {
    console.log('Выполняется автоматический вход для разработчика');
    
    const loginData = {
        email: '9873262692@mail.ru',
        password: 'dev123456' // Предполагаемый пароль
    };
    
    fetch('/auth/api/dev-login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginData)
    })
    .then(response => {
        console.log('Ответ от сервера на dev login:', response.status);
        if (response.ok) {
            return response.json();
        } else {
            throw new Error('Ошибка входа');
        }
    })
    .then(data => {
        console.log('Успешный вход разработчика:', data);
        // Перенаправляем на главную страницу для обновления состояния
        window.location.href = '/';
    })
    .catch(error => {
        console.error('Ошибка автоматического входа:', error);
        // Показываем уведомление об ошибке
        showToast('Ошибка автоматического входа. Проверьте данные аккаунта разработчика.', 'error');
    });
}

// Функция автоматического входа для ученика
function devStudentLogin() {
    console.log('Выполняется автоматический вход для ученика');
    
    const loginData = {
        email: 'hristovamarina51@gmail.com',
        password: 'dev123456' // Предполагаемый пароль
    };
    
    fetch('/auth/api/dev-login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginData)
    })
    .then(response => {
        console.log('Ответ от сервера на student dev login:', response.status);
        if (response.ok) {
            return response.json();
        } else {
            throw new Error('Ошибка входа');
        }
    })
    .then(data => {
        console.log('Успешный вход ученика:', data);
        // Перенаправляем на главную страницу для обновления состояния
        window.location.href = '/';
    })
    .catch(error => {
        console.error('Ошибка автоматического входа ученика:', error);
        // Показываем уведомление об ошибке
        showToast('Ошибка автоматического входа ученика. Проверьте данные аккаунта.', 'error');
    });
}

// Функция автоматического входа для преподавателя
function devTeacherLogin() {
    console.log('Выполняется автоматический вход для преподавателя');
    
    const loginData = {
        email: '89873262692@mail.ru',
        password: 'dev123456' // Предполагаемый пароль
    };
    
    fetch('/auth/api/dev-login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginData)
    })
    .then(response => {
        console.log('Ответ от сервера на teacher dev login:', response.status);
        if (response.ok) {
            return response.json();
        } else {
            throw new Error('Ошибка входа');
        }
    })
    .then(data => {
        console.log('Успешный вход преподавателя:', data);
        // Перенаправляем на главную страницу для обновления состояния
        window.location.href = '/';
    })
    .catch(error => {
        console.error('Ошибка автоматического входа преподавателя:', error);
        // Показываем уведомление об ошибке
        showToast('Ошибка автоматического входа преподавателя. Проверьте данные аккаунта.', 'error');
    });
}

// Функция проверки состояния аутентификации
async function checkAuthStatus() {
    console.log('Проверка состояния аутентификации...');
    
    try {
        const response = await fetch('/api/auth/status', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('Статус аутентификации:', data);
            
            if (data.authenticated) {
                // Пользователь аутентифицирован - обновляем интерфейс
                updateUIForAuthenticatedUser(data.user);
            } else {
                // Пользователь не аутентифицирован - показываем стандартный интерфейс
                updateUIForUnauthenticatedUser();
            }
        } else {
            console.log('Пользователь не аутентифицирован (статус 401/403)');
            updateUIForUnauthenticatedUser();
        }
    } catch (error) {
        console.error('Ошибка при проверке статуса аутентификации:', error);
        // В случае ошибки показываем стандартный интерфейс
        updateUIForUnauthenticatedUser();
    }
}

// Обновление интерфейса для аутентифицированного пользователя
function updateUIForAuthenticatedUser(user) {
    console.log('Обновление интерфейса для аутентифицированного пользователя:', user);
    
    // Добавляем класс для скрытия неавторизованных кнопок
    document.body.classList.add('user-authenticated');
    document.body.classList.remove('user-unauthenticated');
    
    console.log('Классы body после обновления:', document.body.className);
    
    // Обновляем приветствие
    const welcomeElements = document.querySelectorAll('.user-welcome');
    welcomeElements.forEach(element => {
        element.textContent = `Привет, ${user.name}!`;
    });
    
    // Обновляем data-role для кнопок кабинета
    const dashboardButtons = document.querySelectorAll('.nav-btn-dashboard');
    dashboardButtons.forEach(button => {
        button.setAttribute('data-role', user.role);
    });
    
    // Проверяем видимость кнопок
    const unauthenticatedButtons = document.querySelectorAll('.unauthorized-buttons');
    const authenticatedButtons = document.querySelectorAll('.authorized-buttons');
    
    console.log('Кнопки для неавторизованных пользователей:', unauthenticatedButtons.length);
    console.log('Кнопки для авторизованных пользователей:', authenticatedButtons.length);
    
    unauthenticatedButtons.forEach((div, index) => {
        console.log(`Неавторизованные кнопки ${index}:`, div.style.display);
    });
    
    authenticatedButtons.forEach((div, index) => {
        console.log(`Авторизованные кнопки ${index}:`, div.style.display);
    });
}

// Обновление интерфейса для неаутентифицированного пользователя
function updateUIForUnauthenticatedUser() {
    console.log('Обновление интерфейса для неаутентифицированного пользователя');
    
    // Добавляем класс для показа неавторизованных кнопок
    document.body.classList.add('user-unauthenticated');
    document.body.classList.remove('user-authenticated');
    
    console.log('Классы body после обновления:', document.body.className);
    
    // Проверяем видимость кнопок
    const unauthenticatedButtons = document.querySelectorAll('.unauthorized-buttons');
    const authenticatedButtons = document.querySelectorAll('.authorized-buttons');
    
    console.log('Кнопки для неавторизованных пользователей:', unauthenticatedButtons.length);
    console.log('Кнопки для авторизованных пользователей:', authenticatedButtons.length);
    
    unauthenticatedButtons.forEach((div, index) => {
        console.log(`Неавторизованные кнопки ${index}:`, div.style.display);
    });
    
    authenticatedButtons.forEach((div, index) => {
        console.log(`Авторизованные кнопки ${index}:`, div.style.display);
    });
}

// Функция для принудительного показа кнопок входа (если что-то пошло не так)
function forceShowLoginButtons() {
    console.log('Принудительно показываем кнопки входа');
    
    const unauthenticatedButtons = document.querySelectorAll('.unauthorized-buttons');
    const authenticatedButtons = document.querySelectorAll('.authorized-buttons');
    
    unauthenticatedButtons.forEach(div => {
        div.style.display = 'flex';
    });
    
    authenticatedButtons.forEach(div => {
        div.style.display = 'none';
    });
    
    console.log('Кнопки входа принудительно показаны');
}

// ==================== Перехват клика на «Карта подготовки» для неавторизованных ====================

(function() {
    // Перехват клика на кнопку «Карта подготовки»
    const studyMapBtn = document.getElementById('studyMapBtn');
    if (studyMapBtn) {
        studyMapBtn.addEventListener('click', function(e) {
            // Если пользователь авторизован — пропускаем, переходим по ссылке
            if (document.body.classList.contains('user-authenticated')) return;

            // Блокируем переход
            e.preventDefault();
            showStudyMapAuthModal();
        });
    }

    // Если перенаправили с защищённой страницы — показываем модальное окно
    const params = new URLSearchParams(window.location.search);
    if (params.get('authRequired') === 'true') {
        // Убираем параметр из URL
        window.history.replaceState({}, document.title, window.location.pathname);
        // Показываем модальное окно с небольшой задержкой, чтобы страница успела отрисоваться
        setTimeout(function() {
            showStudyMapAuthModal();
        }, 300);
    }
})();

function showStudyMapAuthModal() {
    // Удаляем предыдущее окно, если есть
    const old = document.getElementById('studyMapAuthModal');
    if (old) old.remove();

    // Добавляем стили (один раз)
    if (!document.getElementById('studyMapAuthStyles')) {
        const style = document.createElement('style');
        style.id = 'studyMapAuthStyles';
        style.textContent = `
            @keyframes smOverlayIn { from { opacity:0 } to { opacity:1 } }
            @keyframes smCardIn   { from { opacity:0;transform:scale(0.9) translateY(30px) } to { opacity:1;transform:scale(1) translateY(0) } }
            .sm-auth-overlay {
                position:fixed;top:0;left:0;width:100%;height:100%;
                background:rgba(0,0,0,0.55);backdrop-filter:blur(6px);
                display:flex;align-items:center;justify-content:center;
                z-index:9999;animation:smOverlayIn 0.25s ease;
            }
            .sm-auth-card {
                background:#fff;border-radius:24px;padding:2.5rem 2rem;max-width:420px;width:90%;
                box-shadow:0 25px 60px rgba(0,0,0,0.25);animation:smCardIn 0.3s ease;text-align:center;
                font-family:'Nunito','Montserrat',sans-serif;
            }
            .sm-auth-icon {
                width:72px;height:72px;border-radius:50%;margin:0 auto 1.5rem;
                background:linear-gradient(135deg,#8b5cf6,#7c3aed);
                display:flex;align-items:center;justify-content:center;
            }
            .sm-auth-icon i { font-size:1.8rem;color:#fff; }
            .sm-auth-card h3 { margin:0 0 0.5rem;font-size:1.4rem;font-weight:700;color:#1e293b; }
            .sm-auth-card p.sm-desc { margin:0 0 2rem;color:#64748b;font-size:0.95rem;line-height:1.5; }
            .sm-auth-actions { display:flex;flex-direction:column;gap:0.75rem; }
            .sm-auth-btn-primary {
                display:flex;align-items:center;justify-content:center;gap:0.5rem;
                padding:0.9rem 1.5rem;border-radius:14px;font-weight:700;font-size:1rem;
                text-decoration:none;color:#fff;
                background:linear-gradient(135deg,#8b5cf6,#7c3aed);
                box-shadow:0 4px 15px rgba(139,92,246,0.35);
                transition:transform 0.2s ease,box-shadow 0.2s ease;
            }
            .sm-auth-btn-primary:hover {
                transform:translateY(-2px);box-shadow:0 8px 25px rgba(139,92,246,0.4);
            }
            .sm-auth-btn-secondary {
                display:flex;align-items:center;justify-content:center;gap:0.5rem;
                padding:0.9rem 1.5rem;border-radius:14px;font-weight:700;font-size:1rem;
                text-decoration:none;color:#7c3aed;
                background:#f5f3ff;border:2px solid #e9e5ff;
                transition:transform 0.2s ease,background 0.2s ease;
            }
            .sm-auth-btn-secondary:hover {
                transform:translateY(-2px);background:#ede9fe;
            }
            .sm-auth-close {
                margin-top:1.5rem;background:none;border:none;color:#94a3b8;
                font-size:0.9rem;cursor:pointer;padding:0.5rem;transition:color 0.2s ease;
            }
            .sm-auth-close:hover { color:#64748b; }
        `;
        document.head.appendChild(style);
    }

    const overlay = document.createElement('div');
    overlay.id = 'studyMapAuthModal';
    overlay.className = 'sm-auth-overlay';

    overlay.innerHTML = `
        <div class="sm-auth-card">
            <div class="sm-auth-icon">
                <i class="fas fa-lock"></i>
            </div>
            <h3>Доступ к карте подготовки</h3>
            <p class="sm-desc">Для доступа к курсам и карте подготовки необходимо войти в аккаунт или зарегистрироваться</p>
            <div class="sm-auth-actions">
                <a href="/auth/login" class="sm-auth-btn-primary">
                    <i class="fas fa-sign-in-alt"></i> Войти
                </a>
                <a href="/auth/register" class="sm-auth-btn-secondary">
                    <i class="fas fa-user-plus"></i> Зарегистрироваться
                </a>
            </div>
            <button class="sm-auth-close" id="studyMapAuthClose">Закрыть</button>
        </div>
    `;

    document.body.appendChild(overlay);

    // Закрытие по кнопке «Закрыть»
    document.getElementById('studyMapAuthClose').addEventListener('click', function() {
        overlay.remove();
    });

    // Закрытие по клику на оверлей
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) overlay.remove();
    });

    // Закрытие по Escape
    function onEsc(e) { if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', onEsc); } }
    document.addEventListener('keydown', onEsc);
} 