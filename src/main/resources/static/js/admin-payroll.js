// Функциональность для административной страницы управления сметами

class AdminPayrollManager {
    constructor() {
        this.currentYear = new URLSearchParams(window.location.search).get('year') || 2025;
        this.currentMonth = new URLSearchParams(window.location.search).get('month') || 1;
        this.currentShift = new URLSearchParams(window.location.search).get('shift') || 'current-payroll';
        this.teachersData = [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateSelectedValues();
        this.loadTeachersData();
        this.initializeSearchAndFilter();
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

        // Кнопка отметки всех как оплачено
        document.getElementById('markAllPaidBtn').addEventListener('click', () => {
            this.markAllAsPaid();
        });

        // Кнопка экспорта
        document.getElementById('exportBtn').addEventListener('click', () => {
            this.exportToExcel();
        });

        // Обработка кнопок "Оплачено" для отдельных преподавателей
        document.addEventListener('click', (e) => {
            if (e.target.closest('.mark-paid-btn')) {
                const button = e.target.closest('.mark-paid-btn');
                const paymentId = button.dataset.paymentId;
                this.markTeacherAsPaid(paymentId, button);
            }
            
            if (e.target.closest('.view-details-btn')) {
                const button = e.target.closest('.view-details-btn');
                const teacherId = button.dataset.teacherId;
                this.showTeacherDetails(teacherId);
            }
        });

        // Обработка закрытия модального окна
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal') || e.target.classList.contains('modal-close')) {
                this.closeDetailsModal();
            }
        });
    }

    initializeSearchAndFilter() {
        // Поиск по имени преподавателя
        const searchInput = document.getElementById('teacherSearch');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.filterTeachers();
            });
        }

        // Фильтр по статусу
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.filterTeachers();
            });
        }
    }

    updateSelectedValues() {
        // Устанавливаем выбранные значения в форме
        document.getElementById('year').value = this.currentYear;
        document.getElementById('month').value = this.currentMonth;
        document.getElementById('shift').value = this.currentShift;
    }

    async loadTeachersData() {
        const year = document.getElementById('year').value;
        const month = document.getElementById('month').value;
        const shift = document.getElementById('shift').value;

        try {
            this.showLoading(true);
            
            const response = await fetch(`/admin/payroll/api/teachers?year=${year}&month=${month}&shift=${shift}`);
            
            if (!response.ok) {
                throw new Error('Ошибка загрузки данных');
            }

            this.teachersData = await response.json();
            this.updateTeachersTable(this.teachersData);
            this.updateStatistics();
            this.updateButtonsState();
            
            // Обновляем URL
            const newUrl = `/admin/payroll?year=${year}&month=${month}&shift=${shift}`;
            window.history.pushState({}, '', newUrl);
            
            this.currentYear = year;
            this.currentMonth = month;
            this.currentShift = shift;
            
            // Обновляем заголовок страницы
            this.updatePageHeader();
            
        } catch (error) {
            console.error('Ошибка загрузки данных преподавателей:', error);
            this.showToast('Ошибка загрузки данных: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    updatePageHeader() {
        const headerSubtitle = document.querySelector('.header-subtitle');
        if (headerSubtitle) {
            const shiftName = this.currentShift === 'current-payroll' ? '• Период 17-31' : '• Период 1-16';
            headerSubtitle.innerHTML = `Формирование и управление зарплатными ведомостями <span>${shiftName}</span>`;
        }
    }

    updateButtonsState() {
        const createPayrollBtn = document.getElementById('createPayrollBtn');
        const markAllPaidBtn = document.getElementById('markAllPaidBtn');
        const exportBtn = document.getElementById('exportBtn');

        // Проверяем, есть ли новые уроки для формирования сметы
        const hasNewLessons = this.teachersData.some(teacher => teacher.currentPayrollAmount > 0);
        const hasPayrollData = this.teachersData.some(teacher => teacher.currentPayrollAmount > 0);
        const hasPendingPayments = this.teachersData.some(teacher => teacher.paymentStatus === 'pending');

        // Кнопка создания сметы - активна только если есть новые уроки
        if (createPayrollBtn) {
            if (hasNewLessons) {
                createPayrollBtn.disabled = false;
                createPayrollBtn.innerHTML = '<i class="fas fa-file-excel"></i> Сформировать смету';
                createPayrollBtn.title = 'Создать смету для новых уроков';
            } else {
                createPayrollBtn.disabled = true;
                createPayrollBtn.innerHTML = '<i class="fas fa-ban"></i> Нет новых уроков';
                createPayrollBtn.title = 'Нет новых уроков для формирования сметы';
            }
        }

        // Кнопка отметки всех как оплачено - только если есть ожидающие оплаты
        if (markAllPaidBtn) {
            markAllPaidBtn.style.display = hasPendingPayments ? 'inline-flex' : 'none';
        }

        // Кнопка экспорта - только если есть данные
        if (exportBtn) {
            exportBtn.style.display = hasPayrollData ? 'inline-flex' : 'none';
        }
    }

    updateStatistics() {
        const totalPayroll = this.teachersData.reduce((sum, teacher) => sum + (teacher.currentPayrollAmount || 0), 0);
        const totalPaid = this.teachersData.reduce((sum, teacher) => sum + (teacher.paidAmount || 0), 0);
        const totalPending = totalPayroll - totalPaid;
        const teachersCount = this.teachersData.length;

        document.getElementById('totalPayroll').textContent = this.formatCurrency(totalPayroll);
        document.getElementById('totalPaid').textContent = this.formatCurrency(totalPaid);
        document.getElementById('totalPending').textContent = this.formatCurrency(totalPending);
        document.getElementById('teachersCount').textContent = teachersCount;
    }

    filterTeachers() {
        const searchTerm = document.getElementById('teacherSearch').value.toLowerCase();
        const statusFilter = document.getElementById('statusFilter').value;

        const filteredData = this.teachersData.filter(teacher => {
            const matchesSearch = teacher.teacherName.toLowerCase().includes(searchTerm);
            const matchesStatus = !statusFilter || teacher.paymentStatus === statusFilter;
            return matchesSearch && matchesStatus;
        });

        this.updateTeachersTable(filteredData);
    }

    updateTeachersTable(teachersData) {
        const tbody = document.getElementById('teachersTableBody');
        
        if (!tbody) return;

        tbody.innerHTML = teachersData.map((teacher, index) => `
            <tr>
                <td>${index + 1}</td>
                <td>
                    <div class="teacher-info">
                        <span class="teacher-name">${teacher.teacherName}</span>
                    </div>
                </td>
                <td>${teacher.teacherEmail}</td>
                <td>${teacher.teacherPhone}</td>
                <td class="amount-cell">
                    <span class="amount">${this.formatCurrency(teacher.currentPayrollAmount)}</span>
                </td>
                <td class="amount-cell">
                    <span class="amount">${this.formatCurrency(teacher.paidAmount)}</span>
                </td>
                <td>
                    <span class="status-badge ${teacher.paymentStatus === 'paid' ? 'paid' : teacher.paymentStatus === 'pending' ? 'pending' : 'none'}">
                        ${teacher.paymentStatus === 'paid' ? 'Оплачено' : teacher.paymentStatus === 'pending' ? 'Ожидает' : 'Нет сметы'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        ${teacher.paymentStatus === 'pending' ? 
                            `<button class="btn btn-sm btn-warning mark-paid-btn" data-payment-id="${teacher.paymentId}" title="Отметить как оплачено">
                                <i class="fas fa-check"></i>
                            </button>` : 
                            teacher.paymentStatus === 'paid' ? 
                            `<span class="text-success" title="Смета оплачена">
                                <i class="fas fa-check-circle"></i>
                            </span>` : 
                            ''
                        }
                        <button class="btn btn-sm btn-info view-details-btn" 
                                data-teacher-id="${teacher.teacherId}"
                                title="Подробности">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Показываем сообщение если нет данных
        if (teachersData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 2rem; color: #718096;">
                        <i class="fas fa-info-circle" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                        Нет данных для отображения
                    </td>
                </tr>
            `;
        }
    }

    async createPayroll() {
        const year = document.getElementById('year').value;
        const month = document.getElementById('month').value;
        const shift = document.getElementById('shift').value;

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
                body: `year=${year}&month=${month}&shift=${shift}`
            });

            const result = await response.json();

            if (result.success) {
                // Скачиваем файл
                this.downloadExcelFile(result.fileName);
                
                // Обновляем данные
                this.loadTeachersData();
                
                this.showToast('Смета успешно создана и скачана', 'success');
            } else {
                this.showToast('Ошибка создания сметы: ' + result.error, 'error');
            }

        } catch (error) {
            console.error('Ошибка создания сметы:', error);
            this.showToast('Ошибка создания сметы: ' + error.message, 'error');
        } finally {
            // Восстанавливаем кнопку
            const createBtn = document.getElementById('createPayrollBtn');
            createBtn.innerHTML = '<i class="fas fa-file-excel"></i> Сформировать смету';
            createBtn.disabled = false;
        }
    }

    async exportToExcel() {
        const year = document.getElementById('year').value;
        const month = document.getElementById('month').value;
        const shift = document.getElementById('shift').value;

        try {
            const response = await fetch(`/admin/payroll/api/teachers?year=${year}&month=${month}&shift=${shift}`);
            const teachersData = await response.json();

            // Создаем CSV данные
            const csvContent = this.convertToCSV(teachersData);
            const shiftName = shift === 'current-payroll' ? '17-31' : '1-16';
            this.downloadCSV(csvContent, `смена_${shiftName}_${year}_${month}.csv`);

            this.showToast('Данные экспортированы в CSV', 'success');
        } catch (error) {
            console.error('Ошибка экспорта:', error);
            this.showToast('Ошибка экспорта: ' + error.message, 'error');
        }
    }

    convertToCSV(data) {
        const headers = ['ФИО', 'Email', 'Телефон', 'Текущая смета', 'Выплачено', 'Статус'];
        const csvRows = [headers.join(',')];

        data.forEach(teacher => {
            const row = [
                teacher.teacherName,
                teacher.teacherEmail,
                teacher.teacherPhone,
                teacher.currentPayrollAmount || 0,
                teacher.paidAmount || 0,
                teacher.paymentStatus === 'paid' ? 'Оплачено' : teacher.paymentStatus === 'pending' ? 'Ожидает' : 'Нет сметы'
            ];
            csvRows.push(row.join(','));
        });

        return csvRows.join('\n');
    }

    downloadCSV(content, fileName) {
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
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
                // Обновляем данные
                await this.loadTeachersData();
                this.showToast('Смета отмечена как оплаченная', 'success');
            } else {
                this.showToast('Ошибка: ' + result.error, 'error');
                // Восстанавливаем кнопку
                button.innerHTML = originalText;
                button.disabled = false;
            }

        } catch (error) {
            console.error('Ошибка отметки как оплачено:', error);
            this.showToast('Ошибка: ' + error.message, 'error');
            
            // Восстанавливаем кнопку
            button.innerHTML = originalText;
            button.disabled = false;
        }
    }

    async markAllAsPaid() {
        const pendingTeachers = this.teachersData.filter(teacher => teacher.paymentStatus === 'pending');
        
        if (pendingTeachers.length === 0) {
            this.showToast('Нет ожидающих оплаты смет', 'error');
            return;
        }

        if (!confirm(`Отметить как оплаченные все ${pendingTeachers.length} сметы?`)) {
            return;
        }

        try {
            // Показываем загрузку
            const markPaidBtn = document.getElementById('markAllPaidBtn');
            const originalText = markPaidBtn.innerHTML;
            markPaidBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Обработка...';
            markPaidBtn.disabled = true;

            // Отмечаем все сметы как оплаченные
            for (const teacher of pendingTeachers) {
                if (teacher.paymentId) {
                    const response = await fetch('/admin/payroll/api/mark-paid', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded',
                        },
                        body: `paymentId=${teacher.paymentId}`
                    });
                    
                    if (!response.ok) {
                        throw new Error(`Ошибка при отметке сметы для ${teacher.teacherName}`);
                    }
                }
            }

            // Обновляем данные
            await this.loadTeachersData();
            this.showToast('Все сметы отмечены как оплаченные', 'success');

        } catch (error) {
            console.error('Ошибка массовой отметки:', error);
            this.showToast('Ошибка: ' + error.message, 'error');
        } finally {
            // Восстанавливаем кнопку
            const markPaidBtn = document.getElementById('markAllPaidBtn');
            markPaidBtn.innerHTML = '<i class="fas fa-check-double"></i> Отметить все как оплачено';
            markPaidBtn.disabled = false;
        }
    }

    async showTeacherDetails(teacherId) {
        const teacher = this.teachersData.find(t => t.teacherId === parseInt(teacherId));
        if (!teacher) {
            this.showToast('Преподаватель не найден', 'error');
            return;
        }

        const modal = document.getElementById('detailsModal');
        const detailsContainer = document.getElementById('teacherDetails');

        const shiftName = this.currentShift === 'current-payroll' ? 'Период 17-31' : 'Период 1-16';

        detailsContainer.innerHTML = `
            <div class="teacher-details">
                <div class="detail-section">
                    <h4><i class="fas fa-user"></i> Информация о преподавателе</h4>
                    <p><strong>ФИО:</strong> ${teacher.teacherName}</p>
                    <p><strong>Email:</strong> ${teacher.teacherEmail}</p>
                    <p><strong>Телефон:</strong> ${teacher.teacherPhone}</p>
                </div>
                <div class="detail-section">
                    <h4><i class="fas fa-calculator"></i> Финансовая информация</h4>
                    <p><strong>Период:</strong> ${shiftName}</p>
                    <p><strong>Текущая смета:</strong> ${this.formatCurrency(teacher.currentPayrollAmount)}</p>
                    <p><strong>Выплачено:</strong> ${this.formatCurrency(teacher.paidAmount)}</p>
                    <p><strong>Остаток к выплате:</strong> ${this.formatCurrency((teacher.currentPayrollAmount || 0) - (teacher.paidAmount || 0))}</p>
                    <p><strong>Статус:</strong> 
                        <span class="status-badge ${teacher.paymentStatus === 'paid' ? 'paid' : teacher.paymentStatus === 'pending' ? 'pending' : 'none'}">
                            ${teacher.paymentStatus === 'paid' ? 'Оплачено' : teacher.paymentStatus === 'pending' ? 'Ожидает' : 'Нет сметы'}
                        </span>
                    </p>
                </div>
            </div>
        `;

        modal.classList.add('show');
    }

    closeDetailsModal() {
        const modal = document.getElementById('detailsModal');
        modal.classList.remove('show');
    }

    formatCurrency(amount) {
        if (!amount || amount === 0) {
            return '0 ₽';
        }
        return `${Number(amount).toLocaleString('ru-RU')} ₽`;
    }

    showLoading(show) {
        const main = document.querySelector('.admin-main');
        if (show) {
            main.style.opacity = '0.6';
            main.style.pointerEvents = 'none';
        } else {
            main.style.opacity = '1';
            main.style.pointerEvents = 'auto';
        }
    }

    showToast(message, type = 'info') {
        // Удаляем существующие toast
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        // Создаем новый toast
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'fas fa-check-circle' : 
                    type === 'error' ? 'fas fa-exclamation-triangle' : 
                    'fas fa-info-circle';
        
        toast.innerHTML = `
            <i class="${icon}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(toast);

        // Автоматически удаляем через 5 секунд
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 5000);
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    new AdminPayrollManager();
});
