// Trainers Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    console.log('Trainers page loaded');
    
    // Инициализация переключения между ОГЭ и ЕГЭ
    initializeExamTypeSwitcher();
    
    // Инициализация обработчиков кнопок тестов
    initializeTestButtons();
    
    // Инициализация обработчиков предметов
    initializeSubjectHandlers();
});

function initializeExamTypeSwitcher() {
    const examTypeBtns = document.querySelectorAll('.exam-type-btn');
    const subjectsGrid = document.getElementById('subjectsGrid');
    
    // Данные предметов для ОГЭ и ЕГЭ (используем точные названия из БД)
    const subjectsData = {
        oge: [
            { id: 'math-oge', name: 'Математика ОГЭ', label: 'Математика ОГЭ' },
            { id: 'russian-oge', name: 'Русский язык ОГЭ', label: 'Русский язык ОГЭ' },
            { id: 'physics-oge', name: 'Физика ОГЭ', label: 'Физика ОГЭ' },
            { id: 'chemistry-oge', name: 'Химия ОГЭ', label: 'Химия ОГЭ' },
            { id: 'biology-oge', name: 'Биология ОГЭ', label: 'Биология ОГЭ' },
            { id: 'geography-oge', name: 'География ОГЭ', label: 'География ОГЭ' },
            { id: 'history-oge', name: 'История ОГЭ', label: 'История ОГЭ' },
            { id: 'social-oge', name: 'Обществознание ОГЭ', label: 'Обществознание ОГЭ' },
            { id: 'literature-oge', name: 'Литература ОГЭ', label: 'Литература ОГЭ' },
            { id: 'english-oge', name: 'Английский язык ОГЭ', label: 'Английский язык ОГЭ' },
            { id: 'informatics-oge', name: 'Информатика ОГЭ', label: 'Информатика ОГЭ' }
        ],
        ege: [
            { id: 'math-ege-basic', name: 'Математика (базовый уровень)', label: 'Математика (базовый уровень)' },
            { id: 'math-ege-profile', name: 'Математика (профильный уровень)', label: 'Математика (профильный уровень)' },
            { id: 'russian-ege', name: 'Русский язык ЕГЭ', label: 'Русский язык ЕГЭ' },
            { id: 'physics-ege', name: 'Физика ЕГЭ', label: 'Физика ЕГЭ' },
            { id: 'chemistry-ege', name: 'Химия ЕГЭ', label: 'Химия ЕГЭ' },
            { id: 'biology-ege', name: 'Биология ЕГЭ', label: 'Биология ЕГЭ' },
            { id: 'geography-ege', name: 'География ЕГЭ', label: 'География ЕГЭ' },
            { id: 'history-ege', name: 'История ЕГЭ', label: 'История ЕГЭ' },
            { id: 'social-ege', name: 'Обществознание ЕГЭ', label: 'Обществознание ЕГЭ' },
            { id: 'literature-ege', name: 'Литература ЕГЭ', label: 'Литература ЕГЭ' },
            { id: 'english-ege', name: 'Английский язык ЕГЭ', label: 'Английский язык ЕГЭ' },
            { id: 'informatics-ege', name: 'Информатика ЕГЭ', label: 'Информатика ЕГЭ' }
        ]
    };
    
    function updateSubjects(examType) {
        // Показываем индикатор загрузки
        subjectsGrid.classList.add('loading');
        
        setTimeout(() => {
            const subjects = subjectsData[examType];
            let html = '';
            
            subjects.forEach(subject => {
                html += `
                    <div class="subject-item" data-subject="${subject.name}" data-exam-type="${examType}">
                        <span>${subject.label}</span>
                    </div>
                `;
            });
            
            subjectsGrid.innerHTML = html;
            subjectsGrid.classList.remove('loading');
            
            // Переинициализируем обработчики для новых элементов
            initializeSubjectHandlers();
        }, 300);
    }
    
    examTypeBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            // Убираем активный класс со всех кнопок
            examTypeBtns.forEach(b => b.classList.remove('active'));
            // Добавляем активный класс к нажатой кнопке
            this.classList.add('active');
            
            // Обновляем предметы
            const examType = this.getAttribute('data-exam');
            updateSubjects(examType);
            
            console.log('Switched to exam type:', examType);
        });
    });
    
    // Инициализация с ОГЭ
    updateSubjects('oge');
}

function initializeTestButtons() {
    const testButtons = document.querySelectorAll('.test-type-btn');
    
    testButtons.forEach(button => {
        button.addEventListener('click', function() {
            const card = this.closest('.test-type-card');
            const testType = card.querySelector('h3').textContent;
            
            console.log('Test type selected:', testType);
            
            // Пока что просто показываем уведомление
            showNotification(`Выбран тип тренировки: ${testType}`, 'info');
            
            // Здесь в будущем будет логика для начала тестирования
            // Например, переход на страницу выбора варианта или начало случайного теста
        });
    });
}

function initializeSubjectHandlers() {
    const subjectItems = document.querySelectorAll('.subject-item');
    
    subjectItems.forEach(item => {
        // Обработчик клика по кнопке предмета
        item.addEventListener('click', function() {
            const subjectName = this.getAttribute('data-subject');
            const examType = this.getAttribute('data-exam-type');
            
            console.log('Selected subject:', subjectName, 'for exam:', examType);
            
            // Переходим на страницу предмета
            window.location.href = `/trainers/${examType}/${subjectName}`;
        });
    });
}


function showNotification(message, type = 'info') {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Стили для уведомления
    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '1rem 1.5rem',
        borderRadius: '10px',
        color: 'white',
        fontWeight: '600',
        zIndex: '10000',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease',
        maxWidth: '300px',
        wordWrap: 'break-word'
    });
    
    // Цвета в зависимости от типа
    const colors = {
        info: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
        success: 'linear-gradient(135deg, #10b981, #059669)',
        warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
        error: 'linear-gradient(135deg, #ef4444, #dc2626)'
    };
    
    notification.style.background = colors[type] || colors.info;
    
    // Добавляем в DOM
    document.body.appendChild(notification);
    
    // Анимация появления
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Автоматическое скрытие через 3 секунды
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Функция для получения всех доступных предметов (для будущего использования)
function getAvailableSubjects() {
    const subjectItems = document.querySelectorAll('.subject-item');
    return Array.from(subjectItems).map(item => ({
        name: item.getAttribute('data-subject'),
        examType: item.getAttribute('data-exam-type'),
        label: item.querySelector('span').textContent
    }));
}

// Функция для получения текущего типа экзамена
function getCurrentExamType() {
    const activeBtn = document.querySelector('.exam-type-btn.active');
    return activeBtn ? activeBtn.getAttribute('data-exam') : 'oge';
}

// Экспорт функций для использования в других скриптах
window.TrainersPage = {
    getAvailableSubjects,
    getCurrentExamType,
    showNotification
};
