// JavaScript для системы аутентификации

// Глобальные переменные
let currentEmail = sessionStorage.getItem('currentEmail') || '';
let currentType = sessionStorage.getItem('currentType') || '';
let countdownTimer = null;
let timeLeft = 600; // 10 минут в секундах

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    initForms();
    initModal();
    initCodeInputs();
    initPhoneFormatting();
});

// Инициализация форм
function initForms() {
    const registrationForm = document.getElementById('registrationForm');
    const loginForm = document.getElementById('loginForm');
    const verificationForm = document.getElementById('verificationForm');

    if (registrationForm) {
        registrationForm.addEventListener('submit', handleRegistration);
    }

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    if (verificationForm) {
        verificationForm.addEventListener('submit', handleVerification);
    }
}

// Обработка регистрации
async function handleRegistration(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('registerBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    // Очищаем предыдущие ошибки
    clearErrors();
    
    // Получаем данные формы
    const formData = {
        name: document.getElementById('name').value.trim(),
        email: document.getElementById('email').value.trim(),
        phone: document.getElementById('phone').value.trim()
    };
    
    // Валидация на клиенте
    if (!validateRegistrationForm(formData)) {
        return;
    }
    
    // Показываем состояние загрузки
    setButtonLoading(submitBtn, btnText, btnLoading, true);
    
    try {
        const response = await fetch('/auth/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Сохраняем данные для верификации
            currentEmail = formData.email;
            currentType = 'REGISTRATION';
            sessionStorage.setItem('currentEmail', currentEmail);
            sessionStorage.setItem('currentType', currentType);
            
            console.log('DEBUG: Сохранение после регистрации:');
            console.log('DEBUG: formData.email =', formData.email);
            console.log('DEBUG: currentEmail =', currentEmail);
            console.log('DEBUG: currentType =', currentType);
            console.log('DEBUG: sessionStorage после сохранения =', {
                email: sessionStorage.getItem('currentEmail'),
                type: sessionStorage.getItem('currentType')
            });
            
            // Показываем модальное окно
            showVerificationModal(formData.email, 'Подтверждение регистрации');
            showToast(data.message, 'success');
            
        } else {
            showToast(data.message, 'error');
        }
        
    } catch (error) {
        console.error('Registration error:', error);
        showToast('Произошла ошибка при регистрации', 'error');
    } finally {
        setButtonLoading(submitBtn, btnText, btnLoading, false);
    }
}

// Обработка входа
async function handleLogin(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('loginBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    // Очищаем предыдущие ошибки
    clearErrors();
    
    // Получаем данные формы
    const formData = {
        email: document.getElementById('email').value.trim()
    };
    
    // Валидация на клиенте
    if (!validateLoginForm(formData)) {
        return;
    }
    
    // Показываем состояние загрузки
    setButtonLoading(submitBtn, btnText, btnLoading, true);
    
    try {
        const response = await fetch('/auth/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Сохраняем данные для верификации
            currentEmail = formData.email;
            currentType = 'LOGIN';
            sessionStorage.setItem('currentEmail', currentEmail);
            sessionStorage.setItem('currentType', currentType);
            
            console.log('DEBUG: Сохранение после входа:');
            console.log('DEBUG: formData.email =', formData.email);
            console.log('DEBUG: currentEmail =', currentEmail);
            console.log('DEBUG: currentType =', currentType);
            console.log('DEBUG: sessionStorage после сохранения =', {
                email: sessionStorage.getItem('currentEmail'),
                type: sessionStorage.getItem('currentType')
            });
            
            // Показываем модальное окно
            showVerificationModal(formData.email, 'Подтверждение входа');
            showToast(data.message, 'success');
            
        } else {
            showToast(data.message, 'error');
        }
        
    } catch (error) {
        console.error('Login error:', error);
        showToast('Произошла ошибка при входе', 'error');
    } finally {
        setButtonLoading(submitBtn, btnText, btnLoading, false);
    }
}

// Обработка верификации кода
async function handleVerification(e) {
    e.preventDefault();
    
    const submitBtn = document.getElementById('verifyBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoading = submitBtn.querySelector('.btn-loading');
    
    // Очищаем предыдущие ошибки
    document.getElementById('codeError').textContent = '';
    
    // Собираем код из отдельных полей
    const codeInputs = document.querySelectorAll('.code-input');
    const code = Array.from(codeInputs).map(input => input.value).join('');
    
    // Валидация кода
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
        showCodeError('Введите 6-значный код');
        return;
    }
    
    // Показываем состояние загрузки
    setButtonLoading(submitBtn, btnText, btnLoading, true);
    
    // Обновляем данные из sessionStorage
    currentEmail = sessionStorage.getItem('currentEmail') || currentEmail;
    currentType = sessionStorage.getItem('currentType') || currentType;
    
    // Подробная отладка
    console.log('DEBUG: sessionStorage.currentEmail =', sessionStorage.getItem('currentEmail'));
    console.log('DEBUG: sessionStorage.currentType =', sessionStorage.getItem('currentType'));
    console.log('DEBUG: currentEmail variable =', currentEmail);
    console.log('DEBUG: currentType variable =', currentType);
    console.log('DEBUG: code =', code);
    
    // Проверяем данные перед отправкой
    console.log('Данные для верификации:', {
        email: currentEmail,
        code: code,
        type: currentType
    });
    
    if (!currentEmail) {
        showCodeError('Ошибка: email не найден. Пожалуйста, повторите вход или регистрацию');
        return;
    }
    
    if (!currentType) {
        showCodeError('Ошибка: тип верификации не найден. Пожалуйста, повторите вход или регистрацию');
        return;
    }
    
    try {
        const requestData = {
            email: currentEmail,
            code: code,
            type: currentType
        };
        
        const requestBody = JSON.stringify(requestData);
        console.log('DEBUG: Request data object =', requestData);
        console.log('DEBUG: Request body JSON =', requestBody);
        console.log('DEBUG: Request body length =', requestBody.length);
        
        const response = await fetch('/auth/api/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: requestBody
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(data.message, 'success');
            
            // Очищаем данные верификации
            sessionStorage.removeItem('currentEmail');
            sessionStorage.removeItem('currentType');
            currentEmail = '';
            currentType = '';
            
            // Закрываем модальное окно
            closeModal();
            
            // Перенаправляем пользователя
            setTimeout(() => {
                window.location.href = data.redirectUrl;
            }, 1500);
            
        } else {
            showCodeError(data.message);
            // Подсвечиваем поля с ошибкой
            codeInputs.forEach(input => {
                input.classList.add('error');
                setTimeout(() => input.classList.remove('error'), 500);
            });
        }
        
    } catch (error) {
        console.error('Verification error:', error);
        showCodeError('Произошла ошибка при проверке кода');
    } finally {
        setButtonLoading(submitBtn, btnText, btnLoading, false);
    }
}

// Повторная отправка кода
async function resendCode() {
    const resendBtn = document.getElementById('resendBtn');
    
    // Обновляем данные из sessionStorage
    currentEmail = sessionStorage.getItem('currentEmail') || currentEmail;
    currentType = sessionStorage.getItem('currentType') || currentType;
    
    if (!currentEmail || !currentType) {
        showToast('Ошибка: данные сессии потеряны', 'error');
        return;
    }
    
    resendBtn.disabled = true;
    resendBtn.textContent = 'Отправка...';
    
    try {
        const response = await fetch('/auth/api/resend', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `email=${encodeURIComponent(currentEmail)}&type=${encodeURIComponent(currentType)}`
        });
        
        const data = await response.json();
        
        if (data.success) {
            showToast(data.message, 'success');
            
            // Сбрасываем таймер
            resetTimer();
            
            // Очищаем поля ввода кода
            document.querySelectorAll('.code-input').forEach(input => {
                input.value = '';
                input.classList.remove('filled', 'error');
            });
            document.querySelectorAll('.code-input')[0].focus();
            
        } else {
            showToast(data.message, 'error');
        }
        
    } catch (error) {
        console.error('Resend error:', error);
        showToast('Произошла ошибка при повторной отправке', 'error');
    } finally {
        resendBtn.disabled = false;
        resendBtn.textContent = 'Отправить повторно';
    }
}

// Инициализация модального окна
function initModal() {
    const modal = document.getElementById('verificationModal');
    const closeBtn = document.getElementById('closeModal');
    const resendBtn = document.getElementById('resendBtn');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    if (resendBtn) {
        resendBtn.addEventListener('click', resendCode);
    }
    
    // Закрытие по клику вне модального окна
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
    
    // Закрытие по ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
            closeModal();
        }
    });
}

// Показ модального окна верификации
function showVerificationModal(email, title) {
    const modal = document.getElementById('verificationModal');
    const emailDisplay = document.getElementById('emailDisplay');
    const modalTitle = modal.querySelector('.modal-header h2');
    
    // Устанавливаем данные
    emailDisplay.textContent = email;
    modalTitle.textContent = title;
    
    // Показываем модальное окно
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    // Фокусируемся на первом поле ввода
    setTimeout(() => {
        const firstInput = modal.querySelector('.code-input');
        if (firstInput) {
            firstInput.focus();
        }
    }, 100);
    
    // Запускаем таймер
    startTimer();
}

// Закрытие модального окна
function closeModal() {
    const modal = document.getElementById('verificationModal');
    
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        
        // Останавливаем таймер
        if (countdownTimer) {
            clearInterval(countdownTimer);
        }
        
        // Очищаем поля
        document.querySelectorAll('.code-input').forEach(input => {
            input.value = '';
            input.classList.remove('filled', 'error');
        });
        
        // Очищаем ошибки
        document.getElementById('codeError').textContent = '';
    }
}

// Инициализация полей ввода кода
function initCodeInputs() {
    const codeInputs = document.querySelectorAll('.code-input');
    
    codeInputs.forEach((input, index) => {
        // Ввод только цифр
        input.addEventListener('input', function(e) {
            const value = e.target.value.replace(/\D/g, '');
            e.target.value = value;
            
            if (value) {
                e.target.classList.add('filled');
                
                // Переход к следующему полю
                if (index < codeInputs.length - 1) {
                    codeInputs[index + 1].focus();
                }
                
                // Автоотправка при заполнении всех полей
                const allFilled = Array.from(codeInputs).every(inp => inp.value);
                if (allFilled) {
                    setTimeout(() => {
                        document.getElementById('verificationForm').dispatchEvent(new Event('submit'));
                    }, 500);
                }
            } else {
                e.target.classList.remove('filled');
            }
        });
        
        // Навигация клавишами
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                codeInputs[index - 1].focus();
            } else if (e.key === 'ArrowLeft' && index > 0) {
                codeInputs[index - 1].focus();
            } else if (e.key === 'ArrowRight' && index < codeInputs.length - 1) {
                codeInputs[index + 1].focus();
            }
        });
        
        // Вставка из буфера обмена
        input.addEventListener('paste', function(e) {
            e.preventDefault();
            const paste = e.clipboardData.getData('text').replace(/\D/g, '');
            
            if (paste.length === 6) {
                paste.split('').forEach((digit, i) => {
                    if (codeInputs[i]) {
                        codeInputs[i].value = digit;
                        codeInputs[i].classList.add('filled');
                    }
                });
                
                // Автоотправка
                setTimeout(() => {
                    document.getElementById('verificationForm').dispatchEvent(new Event('submit'));
                }, 500);
            }
        });
    });
}

// Таймер обратного отсчёта
function startTimer() {
    timeLeft = 600; // 10 минут
    updateTimerDisplay();
    
    countdownTimer = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            clearInterval(countdownTimer);
            showToast('Время действия кода истекло', 'warning');
        }
    }, 1000);
}

function resetTimer() {
    if (countdownTimer) {
        clearInterval(countdownTimer);
    }
    startTimer();
}

function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const display = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    const timerElement = document.getElementById('timeLeft');
    if (timerElement) {
        timerElement.textContent = display;
        
        // Предупреждение о скором истечении
        if (timeLeft <= 60) {
            timerElement.style.color = '#ef4444';
            timerElement.parentElement.style.animation = 'pulse 1s infinite';
        }
    }
}

// Форматирование номера телефона
function initPhoneFormatting() {
    const phoneInput = document.getElementById('phone');
    
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            
            // Добавляем +7 для российских номеров
            if (value.length > 0 && !value.startsWith('7')) {
                if (value.startsWith('8')) {
                    value = '7' + value.substring(1);
                } else {
                    value = '7' + value;
                }
            }
            
            // Форматируем номер
            if (value.length >= 1) {
                let formatted = '+7';
                if (value.length > 1) {
                    formatted += ' (' + value.substring(1, 4);
                }
                if (value.length >= 5) {
                    formatted += ') ' + value.substring(4, 7);
                }
                if (value.length >= 8) {
                    formatted += '-' + value.substring(7, 9);
                }
                if (value.length >= 10) {
                    formatted += '-' + value.substring(9, 11);
                }
                
                e.target.value = formatted;
            }
        });
    }
}

// Валидация форм
function validateRegistrationForm(data) {
    let isValid = true;
    
    // Валидация имени
    if (!data.name || data.name.length < 2) {
        showError('nameError', 'Имя должно содержать минимум 2 символа');
        isValid = false;
    }
    
    // Валидация email
    if (!data.email || !isValidEmail(data.email)) {
        showError('emailError', 'Введите корректный email адрес');
        isValid = false;
    }
    
    // Валидация телефона
    if (!data.phone || !isValidPhone(data.phone)) {
        showError('phoneError', 'Введите корректный номер телефона');
        isValid = false;
    }
    
    return isValid;
}

function validateLoginForm(data) {
    if (!data.email || !isValidEmail(data.email)) {
        showError('emailError', 'Введите корректный email адрес');
        return false;
    }
    return true;
}

// Вспомогательные функции валидации
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhone(phone) {
    // Очищаем от всех символов кроме цифр
    const cleanPhone = phone.replace(/\D/g, '');
    // Проверяем что есть минимум 10 цифр (российский номер без 7/8)
    // или 11 цифр (с кодом страны)
    return cleanPhone.length >= 10 && cleanPhone.length <= 15;
}

// Утилиты для показа ошибок и сообщений
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.color = '#ef4444';
    }
}

function showCodeError(message) {
    const errorElement = document.getElementById('codeError');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.color = '#ef4444';
    }
}

function clearErrors() {
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(element => {
        element.textContent = '';
    });
}

// Управление состоянием кнопок
function setButtonLoading(button, textElement, loadingElement, isLoading) {
    if (isLoading) {
        button.disabled = true;
        textElement.style.display = 'none';
        loadingElement.style.display = 'flex';
    } else {
        button.disabled = false;
        textElement.style.display = 'block';
        loadingElement.style.display = 'none';
    }
}

// Toast уведомления
function showToast(message, type = 'info') {
    // Удаляем предыдущие toast
    const existingToasts = document.querySelectorAll('.auth-toast');
    existingToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = 'auth-toast';
    
    // Определяем стили по типу
    let bgColor, iconClass;
    switch (type) {
        case 'success':
            bgColor = 'linear-gradient(135deg, #10b981, #059669)';
            iconClass = 'fas fa-check-circle';
            break;
        case 'error':
            bgColor = 'linear-gradient(135deg, #ef4444, #dc2626)';
            iconClass = 'fas fa-exclamation-circle';
            break;
        case 'warning':
            bgColor = 'linear-gradient(135deg, #f59e0b, #d97706)';
            iconClass = 'fas fa-exclamation-triangle';
            break;
        default:
            bgColor = 'linear-gradient(135deg, #3b82f6, #1e40af)';
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