// Test Results Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Анимация появления карточек
    animateCards();
    
    // Инициализация интерактивности
    initializeInteractivity();
});

function animateCards() {
    const cards = document.querySelectorAll('.summary-card, .solution-card');
    
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

function initializeInteractivity() {
    // Добавляем эффекты при наведении на карточки решений
    const solutionCards = document.querySelectorAll('.solution-card');
    
    solutionCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    // Добавляем анимацию для таблицы результатов
    const tableRows = document.querySelectorAll('.results-table tbody tr');
    
    tableRows.forEach((row, index) => {
        row.style.opacity = '0';
        row.style.transform = 'translateX(-20px)';
        
        setTimeout(() => {
            row.style.transition = 'all 0.4s ease';
            row.style.opacity = '1';
            row.style.transform = 'translateX(0)';
        }, index * 50);
    });
    
    // Добавляем интерактивность для кнопок действий
    const actionButtons = document.querySelectorAll('.btn');
    
    actionButtons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });
}

// Функция для копирования результатов (если нужно)
function copyResults() {
    const resultsText = generateResultsText();
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(resultsText).then(() => {
            showNotification('Результаты скопированы в буфер обмена', 'success');
        });
    } else {
        // Fallback для старых браузеров
        const textArea = document.createElement('textarea');
        textArea.value = resultsText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showNotification('Результаты скопированы в буфер обмена', 'success');
    }
}

function generateResultsText() {
    const correctAnswers = document.querySelector('.summary-card.correct .card-value').textContent;
    const totalQuestions = document.querySelector('.summary-card.total .card-value').textContent;
    const percentage = document.querySelector('.summary-card.percentage .card-value').textContent;
    
    let text = `Результаты теста:\n`;
    text += `Правильных ответов: ${correctAnswers} из ${totalQuestions}\n`;
    text += `Процент правильных: ${percentage}\n\n`;
    
    const tableRows = document.querySelectorAll('.results-table tbody tr');
    tableRows.forEach((row, index) => {
        const question = row.querySelector('.question-cell').textContent;
        const userAnswer = row.querySelector('.user-answer-cell').textContent;
        const correctAnswer = row.querySelector('.correct-answer-cell').textContent;
        const result = row.querySelector('.result-cell').textContent.trim();
        
        text += `${index + 1}. ${question}\n`;
        text += `Ваш ответ: ${userAnswer}\n`;
        text += `Правильный ответ: ${correctAnswer}\n`;
        text += `Результат: ${result}\n\n`;
    });
    
    return text;
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Стили для уведомления
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#dc2626' : '#3b82f6'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        z-index: 1000;
        opacity: 0;
        transform: translateY(-20px);
        transition: all 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Анимация появления
    setTimeout(() => {
        notification.style.opacity = '1';
        notification.style.transform = 'translateY(0)';
    }, 10);
    
    // Автоматическое скрытие
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Функция для печати результатов
function printResults() {
    window.print();
}

// Функция для экспорта результатов в PDF (заглушка)
function exportToPDF() {
    showNotification('Функция экспорта в PDF будет добавлена в следующих версиях', 'info');
}

// Добавляем обработчики для дополнительных функций
document.addEventListener('DOMContentLoaded', function() {
    // Добавляем кнопку копирования результатов (если нужно)
    const actionsContent = document.querySelector('.actions-content');
    if (actionsContent) {
        const copyButton = document.createElement('button');
        copyButton.className = 'btn btn-outline';
        copyButton.innerHTML = '<i class="fas fa-copy"></i> Копировать результаты';
        copyButton.onclick = copyResults;
        actionsContent.appendChild(copyButton);
    }
    
    // Добавляем анимацию для прогресс-бара (если есть)
    const progressBars = document.querySelectorAll('.progress-fill');
    progressBars.forEach(bar => {
        const width = bar.style.width;
        bar.style.width = '0%';
        setTimeout(() => {
            bar.style.transition = 'width 1s ease';
            bar.style.width = width;
        }, 500);
    });
    
    // Добавляем эффект печати для текста (опционально)
    const questionTexts = document.querySelectorAll('.solution-question p');
    questionTexts.forEach((text, index) => {
        if (index < 3) { // Только для первых 3 вопросов
            const originalText = text.textContent;
            text.textContent = '';
            setTimeout(() => {
                typeWriter(text, originalText, 30);
            }, index * 200);
        }
    });
});

function typeWriter(element, text, speed = 50) {
    let i = 0;
    
    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    
    type();
}


