// Функциональность для вкладки "Вознаграждения" (Сметы)

class PayrollManager {
    constructor() {
        this.currentMonth = this.getCurrentMonth();
        this.currentSection = 'current-payroll';
        this.init();
    }

    init() {
        this.bindEvents();
        this.setActiveMonth(this.currentMonth);
        this.loadPayrollData();
    }

    bindEvents() {
        // Навигация по разделам
        document.querySelectorAll('.payroll-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.target.closest('.payroll-nav-btn').dataset.section;
                this.switchSection(section);
            });
        });

        // Выбор месяца
        document.querySelectorAll('.month-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const month = e.target.closest('.month-item').dataset.month;
                this.selectMonth(month);
            });
        });
    }

    getCurrentMonth() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }

    switchSection(section) {
        // Обновляем активную кнопку
        document.querySelectorAll('.payroll-nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Показываем соответствующий раздел
        document.querySelectorAll('.payroll-section').forEach(sectionEl => {
            sectionEl.classList.remove('active');
        });
        document.getElementById(section).classList.add('active');

        this.currentSection = section;
        
        // Сбрасываем выбор месяца при переключении на смету
        document.querySelectorAll('.month-item').forEach(item => {
            item.classList.remove('active');
        });
        
        this.loadPayrollData();
    }

    selectMonth(month) {
        // Обновляем активный месяц
        document.querySelectorAll('.month-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-month="${month}"]`).classList.add('active');

        this.currentMonth = month;
        
        // Сбрасываем выбор сметы при выборе месяца
        document.querySelectorAll('.payroll-nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Показываем раздел с месячными данными
        document.querySelectorAll('.payroll-section').forEach(sectionEl => {
            sectionEl.classList.remove('active');
        });
        document.getElementById('current-payroll').classList.add('active');
        
        this.currentSection = 'monthly-payroll';
        this.loadPayrollData();
    }

    setActiveMonth(month) {
        const monthElement = document.querySelector(`[data-month="${month}"]`);
        if (monthElement) {
            monthElement.classList.add('active');
        }
    }

    async loadPayrollData() {
        const [year, month] = this.currentMonth.split('-');
        const isCurrentSection = this.currentSection === 'current-payroll';
        const isPastSection = this.currentSection === 'past-payroll';
        const isMonthlyView = this.currentSection === 'monthly-payroll';
        
        try {
            // Показываем загрузку
            this.showLoading(isCurrentSection);
            
            // Определяем тип запроса
            let requestType = this.currentSection;
            if (isMonthlyView) {
                requestType = 'monthly-payroll';
            }
            
            // Загружаем данные с сервера
            const response = await fetch(`/api/payroll?year=${year}&month=${month}&type=${requestType}`);
            
            if (!response.ok) {
                throw new Error('Ошибка загрузки данных');
            }
            
            const data = await response.json();
            
            // Логирование для отладки
            console.log('=== ОТЛАДКА PAYROLL JS ===');
            console.log('Полученные данные:', data);
            console.log('Ключи в данных:', Object.keys(data));
            console.log('Сводка:', data.summary);
            console.log('Ожидаемая сумма:', data.expected);
            console.log('Уроки:', data.lessons);
            console.log('isCurrentSection:', isCurrentSection);
            console.log('isMonthlyView:', isMonthlyView);
            console.log('==========================');
            
            // Обновляем интерфейс
            this.updatePayrollInterface(data, isCurrentSection, isMonthlyView);
            
        } catch (error) {
            console.error('Ошибка загрузки данных сметы:', error);
            this.showError(isCurrentSection);
        }
    }

    showLoading(isCurrentSection) {
        // Определяем, в каком разделе показывать загрузку
        const tableBody = isCurrentSection ? 
            document.getElementById('currentPayrollTableBody') : 
            document.getElementById('pastPayrollTableBody');
        
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 2rem;">
                        <div class="loading-spinner"></div>
                        <p>Загрузка данных сметы...</p>
                    </td>
                </tr>
            `;
        }
    }

    showError(isCurrentSection) {
        // Определяем, в каком разделе показывать ошибку
        const tableBody = isCurrentSection ? 
            document.getElementById('currentPayrollTableBody') : 
            document.getElementById('pastPayrollTableBody');
        
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align: center; padding: 2rem; color: #dc2626;">
                        <i class="fas fa-exclamation-triangle"></i>
                        <p>Ошибка загрузки данных</p>
                    </td>
                </tr>
            `;
        }
    }

    updatePayrollInterface(data, isCurrentSection, isMonthlyView) {
        // Обновляем период сметы
        this.updatePeriodInfo(isCurrentSection, isMonthlyView);
        
        // Обновляем сводку - данные приходят напрямую в объекте data
        this.updateSummary({
            expected: data.expected,
            paid: 0 // Выплаты пока не реализованы
        }, isCurrentSection, isMonthlyView);
        
        // Обновляем таблицу
        this.updateTable(data.lessons, isCurrentSection, isMonthlyView);
    }

    updatePeriodInfo(isCurrentSection, isMonthlyView) {
        const [year, month] = this.currentMonth.split('-');
        const monthNames = [
            'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
            'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'
        ];
        
        const monthName = monthNames[parseInt(month) - 1];
        
        if (isMonthlyView) {
            // Месячный просмотр: весь месяц
            const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
            const periodText = `Месяц: ${monthName} ${year} (01.${month}.${year} - ${lastDay}.${month}.${year})`;
            const element = document.getElementById('currentPeriodText');
            if (element) {
                element.textContent = periodText;
            }
        } else if (isCurrentSection) {
            // Текущая смета: с 17 по последний день месяца
            const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
            const periodText = `Период сметы: 17.${month}.${year} - ${lastDay}.${month}.${year}`;
            const element = document.getElementById('currentPeriodText');
            if (element) {
                element.textContent = periodText;
            }
        } else {
            // Прошлая смета: с 1 по 16 число
            const periodText = `Период сметы: 01.${month}.${year} - 16.${month}.${year}`;
            const element = document.getElementById('pastPeriodText');
            if (element) {
                element.textContent = periodText;
            }
        }
    }

    updateSummary(summary, isCurrentSection, isMonthlyView) {
        console.log('=== ОБНОВЛЕНИЕ СВОДКИ ===');
        console.log('Сводка:', summary);
        console.log('isCurrentSection:', isCurrentSection);
        console.log('isMonthlyView:', isMonthlyView);
        
        // Определяем, какой раздел использовать
        let expectedElement, paidElement;
        
        if (isMonthlyView || isCurrentSection) {
            // Месячный просмотр или текущая смета - используем текущий раздел
            expectedElement = document.getElementById('expectedAmount');
            paidElement = document.getElementById('paidAmount');
            console.log('Используем текущий раздел');
        } else {
            // Прошлая смета - используем прошлый раздел
            expectedElement = document.getElementById('pastExpectedAmount');
            paidElement = document.getElementById('pastPaidAmount');
            console.log('Используем прошлый раздел');
        }
        
        console.log('Элемент ожидаемой суммы:', expectedElement);
        console.log('Элемент выплаченной суммы:', paidElement);
        
        // Проверяем, что данные пришли в правильном формате
        const expected = summary && summary.expected !== undefined ? summary.expected : 0;
        const paid = summary && summary.paid !== undefined ? summary.paid : 0;
        
        console.log('Ожидаемая сумма:', expected);
        console.log('Выплаченная сумма:', paid);
        
        if (expectedElement) {
            expectedElement.textContent = this.formatCurrency(expected);
            console.log('Обновлен элемент ожидаемой суммы:', expectedElement.textContent);
        }
        if (paidElement) {
            paidElement.textContent = this.formatCurrency(paid);
            console.log('Обновлен элемент выплаченной суммы:', paidElement.textContent);
        }
        console.log('========================');
    }

    updateTable(lessons, isCurrentSection, isMonthlyView) {
        // Определяем, какой раздел использовать
        let tableBody, noDataMessage;
        
        if (isMonthlyView || isCurrentSection) {
            // Месячный просмотр или текущая смета - используем текущий раздел
            tableBody = document.getElementById('currentPayrollTableBody');
            noDataMessage = document.getElementById('noCurrentPayrollMessage');
        } else {
            // Прошлая смета - используем прошлый раздел
            tableBody = document.getElementById('pastPayrollTableBody');
            noDataMessage = document.getElementById('noPastPayrollMessage');
        }
        
        if (!tableBody) return;
        
        if (!lessons || lessons.length === 0) {
            tableBody.innerHTML = '';
            if (noDataMessage) {
                noDataMessage.style.display = 'block';
            }
            return;
        }
        
        if (noDataMessage) {
            noDataMessage.style.display = 'none';
        }
        
        tableBody.innerHTML = lessons.map(lesson => this.createLessonRow(lesson)).join('');
    }

    createLessonRow(lesson) {
        const statusClass = this.getStatusClass(lesson.status);
        const statusText = this.getStatusText(lesson.status);
        
        return `
            <tr>
                <td>${this.formatDate(lesson.date)}</td>
                <td>${lesson.subject || '-'}</td>
                <td>${lesson.type || '-'}</td>
                <td>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </td>
                <td>${lesson.student || '-'}</td>
                <td class="amount-cell amount-positive">${this.formatCurrency(lesson.rate || 0)}</td>
                <td class="amount-cell amount-positive">${this.formatCurrency(lesson.bonus || 0)}</td>
                <td class="amount-cell amount-positive">${this.formatCurrency(lesson.compensation || 0)}</td>
                <td class="amount-cell amount-negative">${this.formatCurrency(lesson.penalty || 0)}</td>
            </tr>
        `;
    }

    getStatusClass(status) {
        switch (status) {
            case 'completed':
                return 'completed';
            case 'absent':
                return 'absent';
            case 'cancelled':
                return 'cancelled';
            default:
                return 'completed';
        }
    }

    getStatusText(status) {
        switch (status) {
            case 'completed':
                return 'Проведен';
            case 'absent':
                return 'Не пришел';
            case 'cancelled':
                return 'Отменен';
            default:
                return 'Проведен';
        }
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        try {
            // Проверяем, что dateString является валидной датой
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                console.warn('Invalid date:', dateString);
                return dateString;
            }
            return date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        } catch (error) {
            console.error('Error formatting date:', dateString, error);
            return dateString;
        }
    }

    formatCurrency(amount) {
        if (!amount || amount === 0) {
            return '0 ₽';
        }
        return `${Number(amount).toLocaleString('ru-RU')} ₽`;
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем, что мы на странице dashboard
    if (document.querySelector('.dashboard-body')) {
        new PayrollManager();
    }
});

// Экспорт для использования в других модулях
window.PayrollManager = PayrollManager;
