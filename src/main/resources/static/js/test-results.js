// Test Results Page JavaScript

// Глобальная функция для раскрытия/скрытия решения
function toggleSolution(headerEl) {
    const card = headerEl.closest('.answer-card');
    const body = card.querySelector('.answer-card-body');
    const icon = headerEl.querySelector('.toggle-icon');
    const label = headerEl.querySelector('.toggle-solution-label');

    if (body.style.display === 'none' || !body.style.display) {
        body.style.display = 'block';
        // Плавное появление
        body.style.maxHeight = '0';
        body.style.opacity = '0';
        body.style.overflow = 'hidden';
        requestAnimationFrame(() => {
            body.style.transition = 'max-height 0.4s ease, opacity 0.3s ease';
            body.style.maxHeight = body.scrollHeight + 200 + 'px';
            body.style.opacity = '1';
        });
        icon.classList.remove('fa-chevron-down');
        icon.classList.add('fa-chevron-up');
        label.textContent = 'Скрыть';
        card.classList.add('expanded');
    } else {
        body.style.transition = 'max-height 0.3s ease, opacity 0.2s ease';
        body.style.maxHeight = '0';
        body.style.opacity = '0';
        setTimeout(() => {
            body.style.display = 'none';
            body.style.overflow = '';
        }, 300);
        icon.classList.remove('fa-chevron-up');
        icon.classList.add('fa-chevron-down');
        label.textContent = 'Подробнее';
        card.classList.remove('expanded');
    }
}

document.addEventListener('DOMContentLoaded', function () {
    initFilters();
    animateEntrance();
});

// === Фильтрация по статусу ===
function initFilters() {
    const tabs = document.querySelectorAll('.filter-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            applyFilter(this.dataset.filter);
        });
    });
}

function applyFilter(filter) {
    const cards = document.querySelectorAll('.answer-card');
    const emptyState = document.getElementById('emptyFilterState');
    let visibleCount = 0;

    cards.forEach(card => {
        const status = card.dataset.status; // 'correct' | 'incorrect'
        const show = filter === 'all' || filter === status;
        card.style.display = show ? '' : 'none';
        if (show) visibleCount++;
    });

    if (emptyState) {
        emptyState.style.display = visibleCount === 0 ? 'flex' : 'none';
    }
}

// === Анимация появления ===
function animateEntrance() {
    // Карточки статистики
    const summaryCards = document.querySelectorAll('.summary-card');
    summaryCards.forEach((card, i) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        setTimeout(() => {
            card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, i * 120);
    });

    // Карточки ответов
    const answerCards = document.querySelectorAll('.answer-card');
    answerCards.forEach((card, i) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(15px)';
        setTimeout(() => {
            card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 300 + i * 60);
    });
}

// === Копирование результатов ===
function copyResults() {
    const correctAnswers = document.querySelector('.summary-card.correct .card-value').textContent;
    const totalQuestions = document.querySelector('.summary-card.total .card-value').textContent;
    const percentage = document.querySelector('.summary-card.percentage .card-value').textContent;

    let text = `Результаты теста:\n`;
    text += `Правильных ответов: ${correctAnswers} из ${totalQuestions}\n`;
    text += `Процент правильных: ${percentage}\n`;

    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showNotification('Результаты скопированы в буфер обмена', 'success');
        });
    }
}

function showNotification(message, type) {
    const n = document.createElement('div');
    n.className = 'results-notification';
    n.textContent = message;
    n.style.cssText = `
        position:fixed;top:20px;right:20px;z-index:9999;
        padding:14px 24px;border-radius:12px;font-weight:600;font-size:0.95rem;
        color:#fff;box-shadow:0 8px 25px rgba(0,0,0,0.15);
        opacity:0;transform:translateY(-10px);transition:all 0.3s ease;
        background:${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6366f1'};
    `;
    document.body.appendChild(n);
    requestAnimationFrame(() => { n.style.opacity = '1'; n.style.transform = 'translateY(0)'; });
    setTimeout(() => {
        n.style.opacity = '0';
        n.style.transform = 'translateY(-10px)';
        setTimeout(() => n.remove(), 300);
    }, 2500);
}
