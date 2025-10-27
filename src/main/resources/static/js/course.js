/* JavaScript для страниц курса - Brainify */

document.addEventListener('DOMContentLoaded', function() {
    // Инициализация
    initMobileMenu();
    initModuleNavigation();
    initScrollProgress();
    initSmoothScroll();
});

/**
 * Мобильное меню
 */
function initMobileMenu() {
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const courseSidebar = document.getElementById('courseSidebar');
    
    if (mobileMenuToggle && courseSidebar) {
        // Открытие/закрытие меню
        mobileMenuToggle.addEventListener('click', () => {
            courseSidebar.classList.toggle('mobile-open');
            
            // Анимация иконки
            const icon = mobileMenuToggle.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            }
        });
        
        // Закрытие при клике вне меню
        document.addEventListener('click', (e) => {
            if (!courseSidebar.contains(e.target) && !mobileMenuToggle.contains(e.target)) {
                courseSidebar.classList.remove('mobile-open');
                const icon = mobileMenuToggle.querySelector('i');
                if (icon) {
                    icon.classList.remove('fa-times');
                    icon.classList.add('fa-bars');
                }
            }
        });
        
        // Закрытие при клике на ссылку (для мобильных)
        const sidebarLinks = courseSidebar.querySelectorAll('a');
        sidebarLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (window.innerWidth <= 768) {
                    courseSidebar.classList.remove('mobile-open');
                    const icon = mobileMenuToggle.querySelector('i');
                    if (icon) {
                        icon.classList.remove('fa-times');
                        icon.classList.add('fa-bars');
                    }
                }
            });
        });
    }
}

/**
 * Навигация по модулям
 */
function initModuleNavigation() {
    const moduleHeaders = document.querySelectorAll('.module-header');
    
    moduleHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const moduleId = this.getAttribute('data-module-id');
            if (moduleId) {
                // Переключение видимости глав
                const chapters = this.nextElementSibling;
                if (chapters && chapters.classList.contains('course-chapters')) {
                    const isVisible = chapters.style.display !== 'none';
                    chapters.style.display = isVisible ? 'none' : 'block';
                    
                    // Анимация иконки
                    const icon = this.querySelector('i');
                    if (icon) {
                        icon.style.transform = isVisible ? 'rotate(-90deg)' : 'rotate(0deg)';
                    }
                }
            }
        });
    });
}

/**
 * Прогресс скролла
 */
function initScrollProgress() {
    const courseContent = document.querySelector('.course-content');
    
    if (courseContent) {
        let progressBar = document.querySelector('.scroll-progress-bar');
        
        // Создаем прогресс-бар если его нет
        if (!progressBar) {
            progressBar = document.createElement('div');
            progressBar.className = 'scroll-progress-bar';
            progressBar.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 0;
                height: 3px;
                background: linear-gradient(90deg, #10b981, #059669);
                z-index: 9999;
                transition: width 0.2s ease;
            `;
            document.body.appendChild(progressBar);
        }
        
        // Обновление прогресса
        window.addEventListener('scroll', () => {
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            const scrollTop = window.scrollY;
            const scrollPercent = (scrollTop / (documentHeight - windowHeight)) * 100;
            
            progressBar.style.width = scrollPercent + '%';
        });
    }
}

/**
 * Плавная прокрутка
 */
function initSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            e.preventDefault();
            const target = document.querySelector(href);
            
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

/**
 * Анимация появления элементов при скролле
 */
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Наблюдаем за блоками контента
    const contentBlocks = document.querySelectorAll('.content-block');
    contentBlocks.forEach(block => {
        block.style.opacity = '0';
        block.style.transform = 'translateY(20px)';
        block.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
        observer.observe(block);
    });
}

/**
 * Сохранение прогресса (локальное хранилище)
 */
function saveProgress(sectionId) {
    const courseId = getCurrentCourseId();
    if (!courseId) return;
    
    const progressKey = `course_${courseId}_progress`;
    let progress = JSON.parse(localStorage.getItem(progressKey) || '[]');
    
    if (!progress.includes(sectionId)) {
        progress.push(sectionId);
        localStorage.setItem(progressKey, JSON.stringify(progress));
    }
}

/**
 * Получение ID текущего курса
 */
function getCurrentCourseId() {
    const match = window.location.pathname.match(/\/course\/(\d+)/);
    return match ? match[1] : null;
}

/**
 * Уведомления
 */
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 16px 24px;
        background: ${type === 'success' ? 'linear-gradient(135deg, #10b981, #059669)' : '#ef4444'};
        color: white;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        z-index: 10000;
        font-weight: 600;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Добавляем CSS для анимаций уведомлений
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

/**
 * Форматирование кода в блоках
 */
function initCodeFormatting() {
    const codeBlocks = document.querySelectorAll('pre code');
    
    codeBlocks.forEach(block => {
        // Добавляем подсветку синтаксиса (базовая)
        highlightSQL(block);
        
        // Добавляем кнопку копирования
        addCopyButton(block);
    });
}

/**
 * Базовая подсветка SQL
 */
function highlightSQL(element) {
    const keywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'ON', 'GROUP BY', 'ORDER BY', 'HAVING', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'TABLE'];
    let html = element.textContent;
    
    keywords.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        html = html.replace(regex, `<span style="color: #10b981; font-weight: 700;">${keyword}</span>`);
    });
    
    element.innerHTML = html;
}

/**
 * Добавление кнопки копирования
 */
function addCopyButton(codeBlock) {
    const wrapper = codeBlock.parentElement;
    if (!wrapper) return;
    
    const button = document.createElement('button');
    button.className = 'copy-code-btn';
    button.innerHTML = '<i class="fas fa-copy"></i>';
    button.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: 6px;
        color: white;
        cursor: pointer;
        transition: all 0.3s ease;
    `;
    
    button.addEventListener('click', () => {
        navigator.clipboard.writeText(codeBlock.textContent).then(() => {
            button.innerHTML = '<i class="fas fa-check"></i>';
            setTimeout(() => {
                button.innerHTML = '<i class="fas fa-copy"></i>';
            }, 2000);
        });
    });
    
    wrapper.style.position = 'relative';
    wrapper.appendChild(button);
}

/**
 * Экспорт функций для глобального использования
 */
window.courseUtils = {
    showNotification,
    saveProgress,
    getCurrentCourseId
};

