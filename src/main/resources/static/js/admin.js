// JavaScript для админ панели

let currentPage = 0;
let pageSize = 10;
let currentSearch = '';
let currentRole = '';
let currentUser = null;
let allSubjects = [];
let currentTeacher = null;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    loadUsers();
    loadStatistics();
    initPhoneInput();
    initEventListeners();
    loadSubjects();
});

// Инициализация обработчиков событий
function initEventListeners() {
    // Поиск по Enter
    document.getElementById('phoneSearch').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchUsers();
        }
    });

    // Автоформатирование телефона
    document.getElementById('phoneSearch').addEventListener('input', formatPhoneInput);
    
    // Фильтр по роли
    document.getElementById('roleFilter').addEventListener('change', function() {
        currentRole = this.value;
        currentPage = 0;
        loadUsers();
    });

    // Закрытие модального окна по клику вне его
    document.getElementById('roleModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeRoleModal();
        }
    });
}

// Форматирование ввода телефона
function formatPhoneInput(e) {
    let value = e.target.value.replace(/\D/g, '');
    
    // Ограничиваем до 11 цифр
    if (value.length > 11) {
        value = value.substring(0, 11);
    }
    
    // Начинаем с 8 если пользователь не ввел 8
    if (value.length > 0 && !value.startsWith('8')) {
        value = '8' + value;
    }
    
    e.target.value = value;
}

// Инициализация поля поиска по телефону
function initPhoneInput() {
    const phoneInput = document.getElementById('phoneSearch');
    phoneInput.placeholder = 'Поиск по номеру телефона (89876543211)';
}

// Загрузка пользователей
async function loadUsers(page = 0, search = '') {
    try {
        showLoading();
        
        const params = new URLSearchParams({
            page: page,
            size: pageSize
        });
        
        if (search) {
            params.append('search', search);
        }
        
        if (currentRole) {
            params.append('role', currentRole);
        }

        const response = await fetch(`/admin-role/api/users?${params}`);
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки данных');
        }

        const data = await response.json();
        
        displayUsers(data.users);
        updatePagination(data);
        
        currentPage = page;
        currentSearch = search;
        
    } catch (error) {
        showToast('Ошибка при загрузке пользователей: ' + error.message, 'error');
        console.error('Error loading users:', error);
    } finally {
        hideLoading();
    }
}

// Отображение пользователей в таблице
function displayUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '';

    if (users.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 2rem; color: #718096;">
                    <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 1rem; display: block;"></i>
                    Пользователи не найдены
                </td>
            </tr>
        `;
        return;
    }

    users.forEach(user => {
        const row = createUserRow(user);
        tbody.appendChild(row);
    });
}

// Создание строки таблицы для пользователя
function createUserRow(user) {
    const tr = document.createElement('tr');
    
    const statusBadge = getStatusBadge(user);
    const roleBadge = getRoleBadge(user.role);
    const formattedDate = formatDate(user.createdAt);
    
    tr.innerHTML = `
        <td>${user.id}</td>
        <td>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <div style="width: 32px; height: 32px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 0.875rem;">
                    ${user.name.charAt(0).toUpperCase()}
                </div>
                ${user.name}
            </div>
        </td>
        <td>
            <a href="mailto:${user.email}" style="color: #667eea; text-decoration: none;">
                ${user.email}
            </a>
        </td>
        <td>
            <a href="tel:${user.phone}" style="color: #667eea; text-decoration: none;">
                ${formatPhoneDisplay(user.phone)}
            </a>
        </td>
        <td>${roleBadge}</td>
        <td>${statusBadge}</td>
        <td>${formattedDate}</td>
        <td>
            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button class="btn btn-primary" onclick="openRoleModal(${user.id}, '${user.name}', '${user.email}', '${user.phone}', '${user.role}')" style="padding: 0.5rem 1rem; font-size: 0.75rem;">
                    <i class="fas fa-edit"></i>
                    Изменить роль
                </button>
                ${(user.role === 'TEACHER' || user.role === 'STUDENT') ? `
                    <button class="btn btn-secondary" onclick="openSubjectsModal(${user.id}, '${user.name}', '${user.email}', '${user.role}')" style="padding: 0.5rem 1rem; font-size: 0.75rem;">
                        <i class="fas fa-book"></i>
                        Предметы
                    </button>
                ` : ''}
            </div>
        </td>
    `;
    
    return tr;
}

// Получение бейджа статуса
function getStatusBadge(user) {
    if (!user.isActive) {
        return '<span class="status-badge status-inactive">Неактивен</span>';
    } else if (!user.isVerified) {
        return '<span class="status-badge status-pending">Не подтвержден</span>';
    } else {
        return '<span class="status-badge status-active">Активен</span>';
    }
}

// Получение бейджа роли
function getRoleBadge(role) {
    const roleClasses = {
        STUDENT: 'role-student',
        TEACHER: 'role-teacher',
        MANAGER: 'role-manager',
        ADMIN: 'role-admin'
    };
    
    const roleNames = {
        STUDENT: 'Ученик',
        TEACHER: 'Учитель',
        MANAGER: 'Менеджер',
        ADMIN: 'Администратор'
    };
    
    const className = roleClasses[role] || 'role-student';
    const displayName = roleNames[role] || role;
    
    return `<span class="user-role-badge ${className}">${displayName}</span>`;
}

// Форматирование отображения телефона
function formatPhoneDisplay(phone) {
    if (!phone) return '';
    
    // Форматируем номер для отображения: +7 (999) 123-45-67
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 11 && cleaned.startsWith('8')) {
        return `+7 (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7, 9)}-${cleaned.substring(9)}`;
    } else if (cleaned.length === 11 && cleaned.startsWith('7')) {
        return `+7 (${cleaned.substring(1, 4)}) ${cleaned.substring(4, 7)}-${cleaned.substring(7, 9)}-${cleaned.substring(9)}`;
    }
    
    return phone;
}

// Форматирование даты
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Обновление пагинации
function updatePagination(data) {
    const paginationInfo = document.getElementById('paginationInfo');
    const paginationControls = document.getElementById('paginationControls');
    
    const start = data.currentPage * data.size + 1;
    const end = Math.min(start + data.size - 1, data.totalElements);
    
    paginationInfo.textContent = `Показано ${start}-${end} из ${data.totalElements} пользователей`;
    
    // Создание кнопок пагинации
    paginationControls.innerHTML = '';
    
    // Кнопка "Предыдущая"
    const prevBtn = createPaginationButton('‹', data.currentPage - 1, data.currentPage === 0);
    paginationControls.appendChild(prevBtn);
    
    // Кнопки страниц
    const startPage = Math.max(0, data.currentPage - 2);
    const endPage = Math.min(data.totalPages - 1, data.currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = createPaginationButton(i + 1, i, false, i === data.currentPage);
        paginationControls.appendChild(pageBtn);
    }
    
    // Кнопка "Следующая"
    const nextBtn = createPaginationButton('›', data.currentPage + 1, data.currentPage >= data.totalPages - 1);
    paginationControls.appendChild(nextBtn);
}

// Создание кнопки пагинации
function createPaginationButton(text, page, disabled, active = false) {
    const button = document.createElement('button');
    button.className = `pagination-btn ${active ? 'active' : ''}`;
    button.textContent = text;
    button.disabled = disabled;
    
    if (!disabled) {
        button.onclick = () => loadUsers(page, currentSearch);
    }
    
    return button;
}

// Поиск пользователей
function searchUsers() {
    const searchInput = document.getElementById('phoneSearch');
    const searchValue = searchInput.value.trim();
    
    if (searchValue && searchValue.length < 3) {
        showToast('Введите минимум 3 символа для поиска', 'info');
        return;
    }
    
    currentSearch = searchValue;
    currentPage = 0;
    loadUsers(currentPage, currentSearch);
}

// Очистка поиска
function clearSearch() {
    document.getElementById('phoneSearch').value = '';
    document.getElementById('roleFilter').value = '';
    currentSearch = '';
    currentRole = '';
    currentPage = 0;
    loadUsers();
}

// Открытие модального окна изменения роли
function openRoleModal(userId, userName, userEmail, userPhone, currentRole) {
    currentUser = { id: userId, role: currentRole };
    
    document.getElementById('modalUserName').textContent = userName;
    document.getElementById('modalUserEmail').textContent = userEmail;
    document.getElementById('modalUserPhone').textContent = formatPhoneDisplay(userPhone);
    document.getElementById('modalCurrentRole').textContent = getRoleDisplayName(currentRole);
    
    // Динамически заполняем селект в зависимости от роли текущего пользователя
    populateRoleSelect(currentRole);
    
    document.getElementById('roleModal').classList.add('show');
}

// Заполнение селекта ролей в зависимости от прав пользователя
function populateRoleSelect(currentUserRole) {
    const roleSelect = document.getElementById('newRole');
    roleSelect.innerHTML = '';
    
    // Базовые роли доступны всем
    roleSelect.innerHTML += '<option value="STUDENT">Ученик</option>';
    roleSelect.innerHTML += '<option value="TEACHER">Учитель</option>';
    
    // Получаем роль текущего пользователя из sessionStorage или глобальной переменной
    const currentUserData = getCurrentUserRole();
    
    // Роль менеджера может назначать только администратор
    if (currentUserData === 'ADMIN') {
        roleSelect.innerHTML += '<option value="MANAGER">Менеджер</option>';
    }
    
    // Устанавливаем текущую роль выбранного пользователя
    roleSelect.value = currentUserRole;
}

// Получение роли текущего авторизованного пользователя
function getCurrentUserRole() {
    const userRoleElement = document.querySelector('.user-role');
    if (userRoleElement) {
        // Сначала пробуем получить из data-атрибута
        const dataRole = userRoleElement.getAttribute('data-role');
        if (dataRole) {
            return dataRole;
        }
        
        // Если data-атрибут не найден, пробуем по тексту
        const roleText = userRoleElement.textContent.trim();
        if (roleText === 'Администратор') return 'ADMIN';
        if (roleText === 'Менеджер') return 'MANAGER';
    }
    
    // Если не удалось определить, считаем менеджером по умолчанию
    return 'MANAGER';
}

// Закрытие модального окна
function closeRoleModal() {
    document.getElementById('roleModal').classList.remove('show');
    currentUser = null;
}

// Получение отображаемого имени роли
function getRoleDisplayName(role) {
    const roleNames = {
        STUDENT: 'Ученик',
        TEACHER: 'Учитель',
        MANAGER: 'Менеджер',
        ADMIN: 'Администратор'
    };
    return roleNames[role] || role;
}

// Сохранение новой роли пользователя
async function saveUserRole() {
    if (!currentUser) {
        showToast('Ошибка: пользователь не выбран', 'error');
        return;
    }
    
    const newRole = document.getElementById('newRole').value;
    
    if (newRole === currentUser.role) {
        showToast('Роль не изменилась', 'info');
        closeRoleModal();
        return;
    }
    
    // Дополнительная клиентская проверка
    const currentUserRole = getCurrentUserRole();
    if (newRole === 'ADMIN') {
        showToast('Роль администратора может быть назначена только через базу данных', 'error');
        return;
    }
    
    if (newRole === 'MANAGER' && currentUserRole !== 'ADMIN') {
        showToast('Только администратор может назначать роль менеджера', 'error');
        return;
    }
    
    try {
        const saveBtn = document.querySelector('#roleModal .btn-primary');
        const originalText = saveBtn.innerHTML;
        saveBtn.innerHTML = '<span class="loading"></span> Сохранение...';
        saveBtn.disabled = true;
        
        const response = await fetch(`/admin-role/api/users/${currentUser.id}/role`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `role=${newRole}`
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast(result.message, 'success');
            closeRoleModal();
            loadUsers(currentPage, currentSearch); // Перезагружаем текущую страницу
            loadStatistics(); // Обновляем статистику
        } else {
            showToast(result.message || 'Ошибка при обновлении роли', 'error');
        }
        
    } catch (error) {
        showToast('Ошибка сети: ' + error.message, 'error');
        console.error('Error updating user role:', error);
    } finally {
        const saveBtn = document.querySelector('#roleModal .btn-primary');
        saveBtn.innerHTML = '<i class="fas fa-save"></i> Сохранить';
        saveBtn.disabled = false;
    }
}

// Загрузка статистики
async function loadStatistics() {
    try {
        // Это упрощенная версия - в реальном проекте можно добавить отдельный API для статистики
        const response = await fetch('/admin-role/api/users?page=0&size=1000');
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки статистики');
        }
        
        const data = await response.json();
        
        // Подсчет по ролям
        const stats = {
            STUDENT: 0,
            TEACHER: 0,
            MANAGER: 0,
            ADMIN: 0
        };
        
        data.users.forEach(user => {
            if (stats.hasOwnProperty(user.role)) {
                stats[user.role]++;
            }
        });
        
        // Обновление счетчиков
        document.getElementById('studentsCount').textContent = stats.STUDENT;
        document.getElementById('teachersCount').textContent = stats.TEACHER;
        document.getElementById('managersCount').textContent = stats.MANAGER;
        document.getElementById('adminsCount').textContent = stats.ADMIN;
        
        // Анимация появления цифр
        animateCounters();
        
    } catch (error) {
        console.error('Error loading statistics:', error);
    }
}

// Анимация счетчиков
function animateCounters() {
    const counters = document.querySelectorAll('.stat-value');
    
    counters.forEach(counter => {
        const target = parseInt(counter.textContent);
        let current = 0;
        const increment = target / 20;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            counter.textContent = Math.floor(current);
        }, 50);
    });
}

// Выход из системы
function logout() {
    if (confirm('Вы уверены, что хотите выйти из аккаунта?')) {
        fetch('/api/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            console.log('Admin logout response status:', response.status);
            // Принудительная очистка кэша браузера
            if ('caches' in window) {
                caches.keys().then(names => {
                    names.forEach(name => caches.delete(name));
                });
            }
            // Очистка localStorage и sessionStorage
            localStorage.clear();
            sessionStorage.clear();
            showToast('Выход выполнен успешно', 'success');
            // Перенаправление с принудительным обновлением
            setTimeout(() => {
                window.location.replace('/');
            }, 1000);
        })
        .catch(error => {
            console.error('Admin logout error:', error);
            // Даже если запрос не удался, очищаем всё локально
            if ('caches' in window) {
                caches.keys().then(names => {
                    names.forEach(name => caches.delete(name));
                });
            }
            localStorage.clear();
            sessionStorage.clear();
            showToast('Выход выполнен', 'info');
            setTimeout(() => {
                window.location.replace('/');
            }, 1000);
        });
    }
}

// Показ индикатора загрузки
function showLoading() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = `
        <tr>
            <td colspan="8" style="text-align: center; padding: 2rem;">
                <span class="loading"></span>
                Загрузка данных...
            </td>
        </tr>
    `;
}

// Скрытие индикатора загрузки
function hideLoading() {
    // Загрузка скрывается автоматически при отображении данных
}

// Показ toast уведомления
function showToast(message, type = 'info') {
    // Удаляем предыдущие уведомления
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Определяем иконку для разных типов
    let icon = 'fas fa-info-circle';
    switch (type) {
        case 'success':
            icon = 'fas fa-check-circle';
            break;
        case 'error':
            icon = 'fas fa-exclamation-circle';
            break;
        case 'warning':
            icon = 'fas fa-exclamation-triangle';
            break;
    }
    
    toast.innerHTML = `
        <i class="${icon}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // Автоматическое скрытие через 5 секунд
    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

// Добавляем CSS для анимации исчезновения toast
const style = document.createElement('style');
style.textContent = `
    @keyframes toastSlideOut {
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// ==================== ФУНКЦИИ ДЛЯ РАБОТЫ С ПРЕДМЕТАМИ ====================

// Загрузка списка предметов
async function loadSubjects() {
    try {
        console.log('Начинаем загрузку предметов...');
        const response = await fetch('/admin-role/api/subjects');
        
        console.log('Ответ сервера:', response.status, response.statusText);
        
        if (!response.ok) {
            throw new Error(`Ошибка загрузки предметов: ${response.status} ${response.statusText}`);
        }
        
        allSubjects = await response.json();
        console.log('Предметы загружены:', allSubjects.length, allSubjects);
        
        if (allSubjects.length === 0) {
            console.warn('Список предметов пуст!');
            showToast('Список предметов пуст. Проверьте базу данных.', 'warning');
        }
    } catch (error) {
        console.error('Ошибка загрузки предметов:', error);
        showToast('Ошибка загрузки списка предметов: ' + error.message, 'error');
    }
}

// Открытие модального окна для назначения предметов
async function openSubjectsModal(userId, userName, userEmail, userRole) {
    try {
        currentTeacher = {
            id: userId,
            name: userName,
            email: userEmail,
            role: userRole
        };
        
        // Заполняем информацию о пользователе
        document.getElementById('modalTeacherName').textContent = userName;
        document.getElementById('modalTeacherEmail').textContent = userEmail;
        
        // Загружаем текущие предметы пользователя
        const response = await fetch(`/admin-role/api/users/${userId}/subjects`);
        let teacherSubjects = [];
        
        if (response.ok) {
            teacherSubjects = await response.json();
        }
        
        // Создаем список предметов с чекбоксами
        const subjectsList = document.getElementById('subjectsList');
        subjectsList.innerHTML = '';
        
        console.log('Создаем список предметов. Всего предметов:', allSubjects.length);
        
        if (allSubjects.length === 0) {
            subjectsList.innerHTML = '<div style="padding: 1rem; text-align: center; color: #666;">Нет доступных предметов</div>';
            return;
        }
        
        allSubjects.forEach(subject => {
            const isSelected = teacherSubjects.some(ts => ts.id === subject.id);
            
            const subjectDiv = document.createElement('div');
            subjectDiv.className = `subject-checkbox ${isSelected ? 'selected' : ''}`;
            
            subjectDiv.innerHTML = `
                <input type="checkbox" 
                       id="subject_${subject.id}" 
                       value="${subject.id}" 
                       ${isSelected ? 'checked' : ''}>
                <label for="subject_${subject.id}">${subject.name}</label>
            `;
            
            // Добавляем обработчик клика на весь div
            subjectDiv.addEventListener('click', function(e) {
                if (e.target.type !== 'checkbox') {
                    const checkbox = this.querySelector('input[type="checkbox"]');
                    checkbox.checked = !checkbox.checked;
                }
                
                // Обновляем стили
                if (this.querySelector('input[type="checkbox"]').checked) {
                    this.classList.add('selected');
                } else {
                    this.classList.remove('selected');
                }
            });
            
            subjectsList.appendChild(subjectDiv);
        });
        
        // Показываем модальное окно
        document.getElementById('subjectsModal').style.display = 'flex';
        
    } catch (error) {
        console.error('Ошибка открытия модального окна предметов:', error);
        showToast('Ошибка загрузки данных пользователя', 'error');
    }
}

// Закрытие модального окна предметов
function closeSubjectsModal() {
    const modal = document.getElementById('subjectsModal');
    modal.style.display = 'none';
    
    // Очищаем данные
    currentTeacher = null;
    
    // Очищаем список предметов
    const subjectsList = document.getElementById('subjectsList');
    if (subjectsList) {
        subjectsList.innerHTML = '';
    }
    
    // Очищаем информацию о преподавателе
    document.getElementById('modalTeacherName').textContent = '';
    document.getElementById('modalTeacherEmail').textContent = '';
}

// Сохранение предметов пользователя
async function saveTeacherSubjects() {
    if (!currentTeacher) {
        showToast('Ошибка: пользователь не выбран', 'error');
        return;
    }
    
    try {
        // Собираем выбранные предметы
        const selectedCheckboxes = document.querySelectorAll('#subjectsList input[type="checkbox"]:checked');
        const selectedSubjectIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.value));
        
        // Отправляем запрос на сервер
        const formData = new FormData();
        selectedSubjectIds.forEach(id => {
            formData.append('subjectIds', id);
        });
        
        const response = await fetch(`/admin-role/api/users/${currentTeacher.id}/subjects`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Ошибка сохранения предметов');
        }
        
        const result = await response.json();
        
        showToast(result.message || 'Предметы успешно назначены', 'success');
        closeSubjectsModal();
        
        // Можно обновить таблицу, если нужно показать количество предметов
        // loadUsers();
        
    } catch (error) {
        console.error('Ошибка сохранения предметов:', error);
        showToast('Ошибка сохранения предметов: ' + error.message, 'error');
    }
} 