// JavaScript для страницы частных занятий

document.addEventListener('DOMContentLoaded', function() {
    initPackageButtons();
    initScrollAnimations();
    initFloatingShapes();
    initApplicationForm();
    initFreeLessonButtons();
});

// Инициализация левитирующих фигур
function initFloatingShapes() {
    const shapes = document.querySelectorAll('.shape');
    
    console.log('Найдено фигур:', shapes.length); // Отладочная информация
    
    shapes.forEach((shape, index) => {
        // Принудительно показываем фигуры
        shape.style.display = 'block';
        shape.style.visibility = 'visible';
        
        // Добавляем случайную задержку для более естественного движения
        const randomDelay = Math.random() * 2;
        shape.style.animationDelay = `${randomDelay}s`;
        
        // Добавляем случайное направление движения
        const randomDirection = Math.random() > 0.5 ? 1 : -1;
        shape.style.setProperty('--direction', randomDirection);
        
        console.log(`Фигура ${index + 1}:`, shape.className, shape.style.display); // Отладочная информация
    });
    
    // Проверяем контейнер
    const container = document.querySelector('.floating-shapes');
    if (container) {
        console.log('Контейнер найден:', container);
        container.style.display = 'block';
        container.style.visibility = 'visible';
    } else {
        console.log('Контейнер НЕ найден!');
    }
}

// Инициализация кнопок пакетов
function initPackageButtons() {
    const packageButtons = document.querySelectorAll('.package-btn');
    
    packageButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Получаем информацию о пакете
            const packageCard = this.closest('.package-card');
            const packageName = packageCard.querySelector('h3').textContent;
            const lessonsCount = packageCard.querySelector('.lessons-count').textContent;
            
            // Показываем модальное окно с подробной информацией
            showPackageModal(packageName, lessonsCount);
        });
    });
}

// Инициализация формы заявки
function initApplicationForm() {
    const form = document.getElementById('applicationForm');
    const phoneInput = document.getElementById('phoneNumber');
    const submitButton = form.querySelector('.submit-button');
    
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
        
        // Проверка длины номера
        if (phoneNumber.length !== 10) {
            showError('Пожалуйста, введите корректный номер телефона');
            return;
        }
        
        // Показываем состояние загрузки
        submitButton.disabled = true;
        submitButton.textContent = 'ОТПРАВЛЯЕМ...';
        submitButton.style.opacity = '0.7';
        
        // Имитация отправки (здесь должен быть реальный запрос к серверу)
        setTimeout(() => {
            // Успешная отправка
            submitButton.classList.add('success');
            submitButton.textContent = 'ЗАЯВКА ОТПРАВЛЕНА!';
            submitButton.disabled = false;
            submitButton.style.opacity = '1';
            
            // Показываем сообщение об успехе
            showSuccess('Спасибо! Мы перезвоним вам в течение 15 минут.');
            
            // Очищаем форму
            setTimeout(() => {
                phoneInput.value = '';
                submitButton.classList.remove('success');
                submitButton.textContent = 'ОСТАВИТЬ ЗАЯВКУ';
            }, 3000);
            
        }, 2000);
    });
}

// Показать сообщение об ошибке
function showError(message) {
    const errorDiv = createMessage(message, 'error');
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 4000);
}

// Показать сообщение об успехе
function showSuccess(message) {
    const successDiv = createMessage(message, 'success');
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 5000);
}

// Создать элемент сообщения
function createMessage(text, type) {
    const div = document.createElement('div');
    div.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        color: white;
        font-weight: 600;
        z-index: 10000;
        max-width: 300px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        animation: slideIn 0.3s ease;
        ${type === 'error' 
            ? 'background: linear-gradient(135deg, #ef4444, #dc2626);' 
            : 'background: linear-gradient(135deg, #10b981, #059669);'
        }
    `;
    div.textContent = text;
    
    // Добавляем CSS анимацию
    if (!document.querySelector('#messageAnimation')) {
        const style = document.createElement('style');
        style.id = 'messageAnimation';
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    return div;
}

// Инициализация кнопок бесплатного урока
function initFreeLessonButtons() {
    const freeLessonButtons = document.querySelectorAll('.free-lesson-btn');
    
    console.log('Найдено кнопок бесплатного урока:', freeLessonButtons.length); // Отладочная информация
    
    freeLessonButtons.forEach((button, index) => {
        console.log(`Кнопка ${index + 1}:`, button.textContent.trim()); // Отладочная информация
        button.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Клик по кнопке бесплатного урока'); // Отладочная информация
            showFreeLessonModal();
        });
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
            showError('Пожалуйста, введите корректный номер телефона');
            return;
        }
        
        // Показываем состояние загрузки
        submitBtn.disabled = true;
        submitBtn.textContent = 'ОТПРАВЛЯЕМ...';
        submitBtn.style.opacity = '0.7';
        
        setTimeout(() => {
            showSuccess('Спасибо! Мы перезвоним вам в течение 15 минут для записи на бесплатный урок.');
            modal.remove();
        }, 2000);
    });
}



// Показ модального окна для подробной информации о пакете
function showPackageModal(packageName, lessonsCount) {
    // Создаем модальное окно
    const modal = document.createElement('div');
    modal.className = 'package-modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Пакет: ${packageName}</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="special-offer-modal">
                    <div class="offer-badge-modal">🎁 СПЕЦПРЕДЛОЖЕНИЕ</div>
                    <p class="offer-text-modal"><strong>Первое занятие БЕСПЛАТНО!</strong></p>
                    <p class="offer-description-modal">Попробуйте наш подход без риска</p>
                </div>
                
                <div class="modal-package-info">
                    <h4>${lessonsCount}</h4>
                    <p>Оставьте заявку, и мы перезвоним вам в течение 15 минут, чтобы подробно рассказать про пакет занятий</p>
                </div>
                
                <div class="modal-application-form">
                    <form id="modalApplicationForm" class="modal-form-container">
                        <div class="modal-phone-input-container">
                            <span class="modal-phone-prefix">+7</span>
                            <input type="tel" 
                                   id="modalPhoneNumber" 
                                   name="phone" 
                                   placeholder="(999) 123-45-67" 
                                   class="modal-phone-input"
                                   maxlength="15"
                                   required>
                        </div>
                        
                        <button type="submit" class="modal-submit-button">
                            ОСТАВИТЬ ЗАЯВКУ
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
    
    // Добавляем стили для модального окна
    const modalStyles = document.createElement('style');
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
        
        .modal-content {
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
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }
        
        .modal-header h3 {
            margin: 0;
            color: #1e293b;
        }
        
        .modal-close {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #64748b;
        }
        
        .special-offer-modal {
            background: linear-gradient(135deg, #dbeafe, #3b82f6);
            padding: 1.5rem;
            border-radius: 15px;
            text-align: center;
            margin-bottom: 1.5rem;
            border: 2px solid #2563eb;
        }
        
        .offer-badge-modal {
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
        
        .offer-text-modal {
            font-size: 1.125rem;
            color: #1e40af;
            margin: 0.5rem 0;
        }
        
        .offer-description-modal {
            font-size: 0.875rem;
            color: #1e3a8a;
            margin: 0;
        }
        
        .modal-package-info {
            background: #f8fafc;
            padding: 1.5rem;
            border-radius: 15px;
            margin-bottom: 1.5rem;
            text-align: center;
        }
        
        .modal-package-info h4 {
            color: #a3e635;
            font-size: 1.25rem;
            margin-bottom: 0.5rem;
        }
        
        .modal-package-info p {
            color: #64748b;
            margin: 0;
            line-height: 1.6;
        }
        
        .modal-application-form {
            margin-top: 1.5rem;
        }
        
        .modal-form-container {
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            align-items: center;
        }
        
        .modal-phone-input-container {
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
        
        .modal-phone-input-container:focus-within {
            border-color: #a3e635;
            background: white;
            box-shadow: 0 0 0 3px rgba(163, 230, 53, 0.1);
        }
        
        .modal-phone-prefix {
            background: linear-gradient(135deg, #a3e635, #84cc16);
            color: white;
            padding: 1rem 1.25rem;
            font-weight: 600;
            font-size: 1rem;
            border-right: 2px solid rgba(255, 255, 255, 0.2);
        }
        
        .modal-phone-input {
            flex: 1;
            border: none;
            outline: none;
            padding: 1rem 1.25rem;
            font-size: 1rem;
            background: transparent;
            color: #1e293b;
            font-weight: 500;
        }
        
        .modal-phone-input::placeholder {
            color: #94a3b8;
            font-weight: 400;
        }
        
        .modal-submit-button {
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
        
        .modal-submit-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 35px rgba(163, 230, 53, 0.4);
            background: linear-gradient(135deg, #84cc16, #65a30d);
        }
        
        .modal-submit-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            transition: left 0.5s ease;
        }
        
        .modal-submit-button:hover::before {
            left: 100%;
        }
        
        .modal-privacy-text {
            font-size: 0.75rem;
            color: #64748b;
            line-height: 1.5;
            text-align: center;
            max-width: 300px;
            margin: 0;
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
    document.body.appendChild(modal);
    
    // Обработчики для модального окна
    const closeBtn = modal.querySelector('.modal-close');
    const phoneInput = modal.querySelector('#modalPhoneNumber');
    const form = modal.querySelector('#modalApplicationForm');
    const submitBtn = modal.querySelector('.modal-submit-button');
    
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Форматирование номера телефона в модальном окне
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
    
    // Обработка отправки формы в модальном окне
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const phoneNumber = phoneInput.value.replace(/\D/g, '');
        
        if (phoneNumber.length !== 10) {
            showError('Пожалуйста, введите корректный номер телефона');
            return;
        }
        
        // Показываем состояние загрузки
        submitBtn.disabled = true;
        submitBtn.textContent = 'ОТПРАВЛЯЕМ...';
        submitBtn.style.opacity = '0.7';
        
        setTimeout(() => {
            showSuccess(`Спасибо! Мы перезвоним вам в течение 15 минут для консультации по пакету "${packageName}".`);
            modal.remove();
        }, 2000);
    });
}

// Анимации при скролле
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

    // Наблюдаем за элементами
    document.querySelectorAll('.teacher-card, .package-card, .exam-btn').forEach(el => {
        observer.observe(el);
    });
} 