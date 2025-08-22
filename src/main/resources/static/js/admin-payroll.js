// Функциональность для административной страницы управления сметами

class AdminPayrollManager {
    constructor() {
        this.currentYear = new URLSearchParams(window.location.search).get('year') || 2025;
        this.currentMonth = new URLSearchParams(window.location.search).get('month') || 1;
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateSelectedValues();
    }

    bindEvents() {
        // Обработка формы выбора месяца
        document.getElementById('monthForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.loadTeachersData();
        });

        // Кнопка создания сметы
        document.getElementById('createPayrollBtn').addEventListener('click', () => {
            this.createPayroll();
        });

        // Кнопка отметки как оплачено
        document.getElementById('markPaidBtn').addEventListener('click', () => {
            this.markAllAsPaid();
        });

        // Обработка кнопок "Оплачено" для отдельных преподавателей
        document.addEventListener('click', (e) => {
            if (e.target.closest('.mark-paid-btn')) {
                const button = e.target.closest('.mark-paid-btn');
                const paymentId = button.dataset.paymentId;
                this.markTeacherAsPaid(paymentId, button);
            }
        });
    }

    updateSelectedValues() {
        // Устанавливаем выбранные значения в форме
        document.getElementById('year').value = this.currentYear;
        document.getElementById('month').value = this.currentMonth;
    }

    async loadTeachersData() {
        const year = document.getElementById('year').value;
        const month = document.getElementById('month').value;

        try {
            const response = await fetch(`/admin/payroll/api/teachers?year=${year}&month=${month}`);
            
            if (!response.ok) {
                throw new Error('Ошибка загрузки данных');
            }

            const teachersData = await response.json();
            this.updateTeachersTable(teachersData);
            
            // Обновляем URL
            const newUrl = `/admin/payroll?year=${year}&month=${month}`;
            window.history.pushState({}, '', newUrl);
            
            this.currentYear = year;
            this.currentMonth = month;
            
        } catch (error) {
            console.error('Ошибка загрузки данных преподавателей:', error);
            this.showError('Ошибка загрузки данных: ' + error.message);
        }
    }

    updateTeachersTable(teachersData) {
        const tbody = document.getElementById('teachersTableBody');
        
        if (!tbody) return;

        tbody.innerHTML = teachersData.map((teacher, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>${teacher.teacherName}</td>
                <td>${teacher.teacherEmail}</td>
                <td>${teacher.teacherPhone}</td>
                <td class="amount-cell">${this.formatCurrency(teacher.currentPayrollAmount)}</td>
                <td class="amount-cell">${this.formatCurrency(teacher.paidAmount)}</td>
                <td>
                    <span class="status-badge ${teacher.paymentStatus === 'paid' ? 'paid' : teacher.paymentStatus === 'pending' ? 'pending' : 'none'}">
                        ${teacher.paymentStatus === 'paid' ? 'Оплачено' : teacher.paymentStatus === 'pending' ? 'Ожидает' : 'Нет сметы'}
                    </span>
                </td>
                <td>
                    ${teacher.paymentStatus === 'pending' ? 
                        `<button class="btn btn-sm btn-warning mark-paid-btn" data-payment-id="${teacher.paymentId}">
                            <i class="fas fa-check"></i>
                            Оплачено
                        </button>` : 
                        teacher.paymentStatus === 'paid' ? 
                        `<span class="text-success">
                            <i class="fas fa-check-circle"></i>
                        </span>` : 
                        ''
                    }
                </td>
            </tr>
        `).join('');

        // Показываем/скрываем кнопку "Отметить как оплачено"
        const hasPendingPayments = teachersData.some(teacher => teacher.paymentStatus === 'pending');
        const markPaidBtn = document.getElementById('markPaidBtn');
        if (markPaidBtn) {
            markPaidBtn.style.display = hasPendingPayments ? 'inline-block' : 'none';
        }
    }

    async createPayroll() {
        const year = document.getElementById('year').value;
        const month = document.getElementById('month').value;

        try {
            // Показываем загрузку
            const createBtn = document.getElementById('createPayrollBtn');
            const originalText = createBtn.innerHTML;
            createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Создание...';
            createBtn.disabled = true;

            const response = await fetch('/admin/payroll/api/create-payroll', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `year=${year}&month=${month}`
            });

            const result = await response.json();

            if (result.success) {
                // Скачиваем файл
                this.downloadExcelFile(result.fileName);
                
                // Обновляем данные
                this.loadTeachersData();
                
                this.showSuccess('Смета успешно создана и скачана');
            } else {
                this.showError('Ошибка создания сметы: ' + result.error);
            }

        } catch (error) {
            console.error('Ошибка создания сметы:', error);
            this.showError('Ошибка создания сметы: ' + error.message);
        } finally {
            // Восстанавливаем кнопку
            const createBtn = document.getElementById('createPayrollBtn');
            createBtn.innerHTML = '<i class="fas fa-file-excel"></i> Сформировать смету';
            createBtn.disabled = false;
        }
    }

    downloadExcelFile(fileName) {
        const link = document.createElement('a');
        link.href = `/admin/payroll/api/download/${fileName}`;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async markTeacherAsPaid(paymentId, button) {
        try {
            // Показываем загрузку
            const originalText = button.innerHTML;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            button.disabled = true;

            const response = await fetch('/admin/payroll/api/mark-paid', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `paymentId=${paymentId}`
            });

            const result = await response.json();

            if (result.success) {
                // Обновляем строку в таблице
                const row = button.closest('tr');
                const statusCell = row.querySelector('.status-badge');
                const actionsCell = row.querySelector('td:last-child');
                
                statusCell.className = 'status-badge paid';
                statusCell.textContent = 'Оплачено';
                
                actionsCell.innerHTML = '<span class="text-success"><i class="fas fa-check-circle"></i></span>';
                
                this.showSuccess('Смета отмечена как оплаченная');
            } else {
                this.showError('Ошибка: ' + result.error);
                // Восстанавливаем кнопку
                button.innerHTML = originalText;
                button.disabled = false;
            }

        } catch (error) {
            console.error('Ошибка отметки как оплачено:', error);
            this.showError('Ошибка: ' + error.message);
            
            // Восстанавливаем кнопку
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    async markAllAsPaid() {
        const pendingButtons = document.querySelectorAll('.mark-paid-btn');
        
        if (pendingButtons.length === 0) {
            this.showError('Нет ожидающих оплаты смет');
            return;
        }

        if (!confirm(`Отметить как оплаченные все ${pendingButtons.length} сметы?`)) {
            return;
        }

        try {
            // Показываем загрузку
            const markPaidBtn = document.getElementById('markPaidBtn');
            const originalText = markPaidBtn.innerHTML;
            markPaidBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Обработка...';
            markPaidBtn.disabled = true;

            // Отмечаем все сметы как оплаченные
            for (const button of pendingButtons) {
                const paymentId = button.dataset.paymentId;
                await this.markTeacherAsPaid(paymentId, button);
            }

            this.showSuccess('Все сметы отмечены как оплаченные');
            
            // Скрываем кнопку
            markPaidBtn.style.display = 'none';

        } catch (error) {
            console.error('Ошибка массовой отметки:', error);
            this.showError('Ошибка: ' + error.message);
        } finally {
            // Восстанавливаем кнопку
            const markPaidBtn = document.getElementById('markPaidBtn');
            markPaidBtn.innerHTML = '<i class="fas fa-check"></i> Отметить как оплачено';
            markPaidBtn.disabled = false;
        }
    }

    formatCurrency(amount) {
        if (!amount || amount === 0) {
            return '0 ₽';
        }
        return `${Number(amount).toLocaleString('ru-RU')} ₽`;
    }

    showSuccess(message) {
        // Простое уведомление об успехе
        alert('✅ ' + message);
    }

    showError(message) {
        // Простое уведомление об ошибке
        alert('❌ ' + message);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    new AdminPayrollManager();
});
