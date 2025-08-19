// ===== СКРИПТ ДЛЯ СТРАНИЦЫ УПРАВЛЕНИЯ РАСПИСАНИЕМ =====

// Глобальные переменные
let studentsData = [];
let teachersData = [];
let subjectsData = [];
let currentUser = null;
let currentWeekOffset = 0;
let currentScheduleData = {};



// Инициализация при загрузке DOM
document.addEventListener('DOMContentLoaded', function() {
    // Инициализация компонентов
    initTabs();
    initModals();
    initNotifications();
    
    // Загрузка данных
    loadInitialData();
    
    // Обработчики событий
    initEventHandlers();
    
    // Инициализация модальных окон
    initModals();
});

// ===== ИНИЦИАЛИЗАЦИЯ КОМПОНЕНТОВ =====

function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            
            // Убираем активный класс со всех кнопок и контента
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Добавляем активный класс к выбранной кнопке и контенту
            button.classList.add('active');
            document.getElementById(tabId + '-tab').classList.add('active');
            
            // Загружаем данные для активной вкладки
            if (tabId === 'students') {
                loadStudents();
            } else if (tabId === 'teachers') {
                loadTeachers();
            }
        });
    });
}

function initModals() {
    // Обработчики закрытия модальных окон
    const modalCloseButtons = document.querySelectorAll('.modal-close, [data-modal]');
    modalCloseButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const modalId = button.getAttribute('data-modal');
            if (modalId) {
                closeModal(modalId);
            }
        });
    });
    
    // Закрытие по клику на фон
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
    
    // Обработчики для расписания
    initScheduleHandlers();
    
    // Дополнительные обработчики для кнопок отмены
    document.addEventListener('click', (e) => {
        if (e.target.matches('[data-modal]')) {
            e.preventDefault();
            e.stopPropagation();
            const modalId = e.target.getAttribute('data-modal');
            closeModal(modalId);
        }
    });
    
    // Закрытие модальных окон по клавише Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const openModal = document.querySelector('.modal.show');
            if (openModal) {
                closeModal(openModal.id);
            }
        }
    });
}

function initScheduleHandlers() {
    // Навигация по неделям
    document.getElementById('prev-week').addEventListener('click', () => {
        currentWeekOffset--;
        updateScheduleTable();
    });
    
    document.getElementById('next-week').addEventListener('click', () => {
        currentWeekOffset++;
        updateScheduleTable();
    });
    
    // Чекбокс повторения
    document.getElementById('repeat-weekly').addEventListener('change', function() {
        const weeksContainer = document.getElementById('weeks-input-container');
        weeksContainer.style.display = this.checked ? 'flex' : 'none';
    });
    
    // Сохранение расписания
    document.getElementById('save-schedule').addEventListener('click', saveSchedule);
    
    // Обработчик кнопки "Отмена" в модальном окне расписания
    const cancelButtons = document.querySelectorAll('[data-modal="schedule-modal"]');
    cancelButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            closeModal('schedule-modal');
        });
    });
}

function initEventHandlers() {
    // Дополнительные обработчики событий
    // Обработчики для кнопок назначения преподавателей теперь добавляются в addStudentCardEventHandlers()
}

function initNotifications() {
    // Создаем контейнер для уведомлений, если его нет
    if (!document.getElementById('notification-container')) {
        const container = document.createElement('div');
        container.id = 'notification-container';
        document.body.appendChild(container);
    }
}

// ===== ЗАГРУЗКА ДАННЫХ =====

async function loadInitialData() {
    try {
        // Загружаем предметы
        await loadSubjects();
        
        // Загружаем учеников (по умолчанию активная вкладка)
        await loadStudents();
        
    } catch (error) {
        showNotification('Ошибка загрузки данных', 'error');
    }
}

async function loadSubjects() {
    try {
        const response = await fetch('/admin-lessons/api/subjects');
        const data = await response.json();
        
        if (data.subjects) {
            subjectsData = data.subjects;
        } else {
            throw new Error(data.error || 'Ошибка загрузки предметов');
        }
    } catch (error) {
        showNotification('Ошибка загрузки предметов', 'error');
    }
}

async function loadStudents() {
    const loadingElement = document.getElementById('students-loading');
    const containerElement = document.getElementById('students-container');
    const emptyElement = document.getElementById('students-empty');
    
    try {
        // Показываем загрузчик
        loadingElement.style.display = 'flex';
        containerElement.style.display = 'none';
        emptyElement.style.display = 'none';
        
        const response = await fetch('/admin-lessons/api/students');
        const data = await response.json();
        
        if (data.students) {
            studentsData = data.students;
            
            if (studentsData.length > 0) {
                renderStudentCards();
                containerElement.style.display = 'grid';
            } else {
                emptyElement.style.display = 'block';
            }
        } else {
            throw new Error(data.error || 'Ошибка загрузки учеников');
        }
    } catch (error) {
        showNotification('Ошибка загрузки учеников', 'error');
        emptyElement.style.display = 'block';
    } finally {
        loadingElement.style.display = 'none';
    }
}

async function loadTeachers() {
    const loadingElement = document.getElementById('teachers-loading');
    const containerElement = document.getElementById('teachers-container');
    const emptyElement = document.getElementById('teachers-empty');
    
    try {
        // Показываем загрузчик
        loadingElement.style.display = 'flex';
        containerElement.style.display = 'none';
        emptyElement.style.display = 'none';
        
        const response = await fetch('/admin-lessons/api/teachers');
        const data = await response.json();
        
        if (data.teachers) {
            teachersData = data.teachers;
            
            if (teachersData.length > 0) {
                renderTeacherCards();
                containerElement.style.display = 'grid';
            } else {
                emptyElement.style.display = 'block';
            }
        } else {
            throw new Error(data.error || 'Ошибка загрузки преподавателей');
        }
    } catch (error) {
        showNotification('Ошибка загрузки преподавателей', 'error');
        emptyElement.style.display = 'block';
    } finally {
        loadingElement.style.display = 'none';
    }
}

// ===== ОТРИСОВКА КАРТОЧЕК =====

function renderStudentCards() {
    const container = document.getElementById('students-container');
    container.innerHTML = '';
    
    studentsData.forEach(student => {
        const card = createStudentCard(student);
        container.appendChild(card);
    });
    
    // Добавляем обработчики событий после создания карточек
    addStudentCardEventHandlers();
}

function addStudentCardEventHandlers() {
    // Добавляем обработчики для кнопок назначения преподавателей
    const assignButtons = document.querySelectorAll('.card-btn-secondary[data-student-id]');
    assignButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const studentId = this.getAttribute('data-student-id');
            openAssignTeacherModal(parseInt(studentId));
        });
    });
}

function renderTeacherCards() {
    const container = document.getElementById('teachers-container');
    container.innerHTML = '';
    
    teachersData.forEach(teacher => {
        const card = createTeacherCard(teacher);
        container.appendChild(card);
    });
}

function createStudentCard(student) {
    const card = document.createElement('div');
    card.className = 'user-card';
    
    const initials = student.name.split(' ').map(word => word[0]).join('');
    
    // Формируем список предметов с кнопками уроков
    let subjectsHtml = '';
    if (student.subjects && student.subjects.length > 0) {
        subjectsHtml = student.subjects.map(subject => `
            <div class="subject-item">
                <div class="subject-info">
                    <div class="subject-name">${subject.name}</div>
                    <div class="subject-description">${subject.description || ''}</div>
                </div>
                <button class="card-btn-lessons" onclick="openTeacherScheduleForSubject(${student.id}, ${subject.id})">
                    <i class="fas fa-calendar-alt"></i>
                    Уроки
                </button>
            </div>
        `).join('');
    } else {
        subjectsHtml = '<div class="subject-item">Предметы не выбраны</div>';
    }
    
    card.innerHTML = `
        <div class="user-card-header">
            <div class="user-avatar">${initials}</div>
            <div class="user-info">
                <h3>${student.name}</h3>
                <p>Ученик</p>
            </div>
        </div>
        <div class="user-card-body">
            <div class="user-details">
                <div class="user-detail">
                    <i class="fas fa-envelope"></i>
                    <span>${student.email}</span>
                </div>
                <div class="user-detail">
                    <i class="fas fa-phone"></i>
                    <span>${student.phone}</span>
                </div>
                <div class="user-detail">
                    <i class="fas fa-graduation-cap"></i>
                    <span>Осталось уроков: ${student.remainingLessons || 0}</span>
                </div>
            </div>
            <div class="student-subjects">
                <h4>Предметы ученика:</h4>
                ${subjectsHtml}
            </div>
        </div>
        <div class="user-card-actions">
            <button class="card-btn card-btn-secondary" data-student-id="${student.id}">
                <i class="fas fa-user-plus"></i>
                Назначить преподавателя
            </button>
        </div>
    `;
    
    return card;
}

function createTeacherCard(teacher) {
    const card = document.createElement('div');
    card.className = 'user-card';
    
    const initials = teacher.name.split(' ').map(word => word[0]).join('');
    
    // Формируем список предметов
    let subjectsHtml = '';
    if (teacher.subjects && teacher.subjects.length > 0) {
        subjectsHtml = teacher.subjects.map(subject => 
            `<span class="subject-tag">${subject}</span>`
        ).join('');
    } else {
        subjectsHtml = '<span class="subject-tag">Предметы не назначены</span>';
    }
    
    card.innerHTML = `
        <div class="user-card-header">
            <div class="user-avatar">${initials}</div>
            <div class="user-info">
                <h3>${teacher.name}</h3>
                <p>Преподаватель</p>
            </div>
            <div class="status-badge ${teacher.isActive ? 'status-active' : 'status-inactive'}">
                ${teacher.isActive ? 'Активен' : 'Неактивен'}
            </div>
        </div>
        <div class="user-card-body">
            <div class="user-details">
                <div class="user-detail">
                    <i class="fas fa-envelope"></i>
                    <span>${teacher.email}</span>
                </div>
                <div class="user-detail">
                    <i class="fas fa-phone"></i>
                    <span>${teacher.phone}</span>
                </div>
            </div>
            <div class="teacher-subjects">
                <h4>Предметы:</h4>
                <div class="subjects-list">
                    ${subjectsHtml}
                </div>
            </div>
        </div>
        <div class="user-card-actions">
            <button class="card-btn card-btn-primary" onclick="openTeacherScheduleModal(${teacher.id})">
                <i class="fas fa-calendar-alt"></i>
                Расписание
            </button>
        </div>
    `;
    
    return card;
}

// ===== МОДАЛЬНЫЕ ОКНА =====

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    
    if (modal) {
        // Сначала устанавливаем базовые стили
        modal.style.display = 'flex';
        modal.style.opacity = '0';
        modal.style.visibility = 'visible';
        modal.style.zIndex = '1000';
        
        // Принудительно устанавливаем стили
        document.body.style.overflow = 'hidden';
        
        // Добавляем класс show для анимации
        setTimeout(() => {
            modal.classList.add('show');
            modal.style.opacity = '1';
        }, 10);
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
        
        // Принудительно скрываем модальное окно
        modal.style.display = 'none';
        modal.style.opacity = '0';
        modal.style.visibility = 'hidden';
        
        // Сброс состояния модального окна
        if (modalId === 'schedule-modal') {
            resetScheduleModal();
        }
    }
}

// ===== НАЗНАЧЕНИЕ ПРЕПОДАВАТЕЛЕЙ =====

async function openAssignTeacherModal(studentId) {
    try {
        const student = studentsData.find(s => s.id === studentId);
        if (!student) {
            return;
        }
        
        // Устанавливаем имя ученика
        const studentNameElement = document.getElementById('assign-student-name');
        if (studentNameElement) {
            studentNameElement.textContent = student.name;
        }
        
        // Очищаем список
        const teachersList = document.getElementById('teachers-list');
        if (teachersList) {
            teachersList.innerHTML = '<p style="color: #6c757d; text-align: center;">Загрузка предметов...</p>';
        }
        
        // Сначала открываем модальное окно
        openModal('assign-teacher-modal');
        
        // Теперь загружаем предметы ученика
        try {
            const subjectsResponse = await fetch(`/admin-lessons/api/student/${studentId}/subjects`);
            
            if (!subjectsResponse.ok) {
                throw new Error(`HTTP error! status: ${subjectsResponse.status}`);
            }
            
            const subjectsData = await subjectsResponse.json();
            
            if (subjectsData.subjects && subjectsData.subjects.length > 0) {
                // Создаем интерфейс для каждого предмета ученика
                for (const subject of subjectsData.subjects) {
                    const subjectDiv = createSubjectCard(subject, studentId);
                    teachersList.appendChild(subjectDiv);
                }
            } else {
                teachersList.innerHTML = '<p style="color: #6c757d; text-align: center;">У ученика нет выбранных предметов</p>';
            }
        } catch (error) {
            showNotification('Ошибка загрузки предметов ученика', 'error');
            teachersList.innerHTML = '<p style="color: #f44336; text-align: center;">Ошибка загрузки данных</p>';
        }
        
    } catch (error) {
        // Обработка ошибок
    }
}

function createSubjectCard(subject, studentId) {
    const div = document.createElement('div');
    div.className = 'subject-card';
    
    // Получаем текущего преподавателя для этого предмета
    getCurrentTeacher(studentId, subject.id).then(currentTeacher => {
        const currentTeacherDiv = div.querySelector('.current-teacher-info');
        if (currentTeacher) {
            currentTeacherDiv.innerHTML = `
                <strong>Текущий преподаватель:</strong> ${currentTeacher.name} (${currentTeacher.email})
            `;
        } else {
            currentTeacherDiv.innerHTML = '<strong>Преподаватель не назначен</strong>';
        }
    });
    
    div.innerHTML = `
        <div class="subject-header">
            <h4>${subject.name}</h4>
            <div class="current-teacher-info">
                <strong>Загрузка...</strong>
            </div>
        </div>
        <div class="teacher-selection">
            <button class="select-teacher-btn" onclick="toggleTeacherDropdown(${studentId}, ${subject.id}, this)">
                <i class="fas fa-user-plus"></i>
                Назначить преподавателя
            </button>
            <div class="teacher-dropdown" id="dropdown-${studentId}-${subject.id}" style="display: none;">
                <div class="dropdown-content">
                    <div class="loading-teachers">Загрузка преподавателей...</div>
                </div>
            </div>
        </div>
    `;
    
    return div;
}

// Функция для получения текущего преподавателя
async function getCurrentTeacher(studentId, subjectId) {
    try {
        const response = await fetch(`/admin-lessons/api/student/${studentId}/teacher-for-subject/${subjectId}`);
        const data = await response.json();
        return data.teacher || null;
    } catch (error) {
        console.error('Ошибка получения текущего преподавателя:', error);
        return null;
    }
}

// Функция для переключения выпадающего списка преподавателей
async function toggleTeacherDropdown(studentId, subjectId, button) {
    const dropdownId = `dropdown-${studentId}-${subjectId}`;
    const dropdown = document.getElementById(dropdownId);
    
    // Закрываем все другие выпадающие списки
    document.querySelectorAll('.teacher-dropdown').forEach(dd => {
        if (dd.id !== dropdownId) {
            dd.style.display = 'none';
        }
    });
    
    if (dropdown.style.display === 'none') {
        // Открываем выпадающий список
        dropdown.style.display = 'block';
        
        // Загружаем преподавателей, если еще не загружены
        const dropdownContent = dropdown.querySelector('.dropdown-content');
        if (dropdownContent.querySelector('.loading-teachers')) {
            await loadTeachersForDropdown(studentId, subjectId, dropdownContent);
        }
    } else {
        // Закрываем выпадающий список
        dropdown.style.display = 'none';
    }
}

// Функция для загрузки преподавателей в выпадающий список
async function loadTeachersForDropdown(studentId, subjectId, dropdownContent) {
    try {
        const response = await fetch(`/admin-lessons/api/teachers/by-subject/${subjectId}`);
        const data = await response.json();
        
        if (data.teachers && data.teachers.length > 0) {
            const teachersHtml = data.teachers.map(teacher => `
                <div class="teacher-option" onclick="selectTeacher(${studentId}, ${teacher.id}, ${subjectId})">
                    <div class="teacher-info">
                        <div class="teacher-name">${teacher.name}</div>
                        <div class="teacher-email">${teacher.email}</div>
                    </div>
                    <div class="teacher-select-icon">
                        <i class="fas fa-check"></i>
                    </div>
                </div>
            `).join('');
            
            dropdownContent.innerHTML = teachersHtml;
        } else {
            dropdownContent.innerHTML = '<div class="no-teachers">Нет доступных преподавателей для этого предмета</div>';
        }
    } catch (error) {
        console.error('Ошибка загрузки преподавателей:', error);
        dropdownContent.innerHTML = '<div class="error-loading">Ошибка загрузки преподавателей</div>';
    }
}

// Функция для выбора преподавателя
async function selectTeacher(studentId, teacherId, subjectId) {
    try {
        const teacher = teachersData.find(t => t.id === teacherId);
        const subject = subjectsData.find(s => s.id === subjectId);
        const student = studentsData.find(s => s.id === studentId);
        
        const formData = new FormData();
        formData.append('studentId', studentId);
        formData.append('teacherId', teacherId);
        formData.append('subjectId', subjectId);
        
        const response = await fetch('/admin-lessons/api/assign-teacher', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            const teacherName = teacher ? teacher.name : 'Преподаватель';
            const subjectName = subject ? subject.name : 'Предмет';
            const studentName = student ? student.name : 'Ученик';
            
            showNotification(`Преподаватель ${teacherName} успешно назначен ученику ${studentName} по предмету ${subjectName}`, 'success');
            
            // Закрываем выпадающий список
            const dropdownId = `dropdown-${studentId}-${subjectId}`;
            document.getElementById(dropdownId).style.display = 'none';
            
            // Обновляем информацию о текущем преподавателе
            const currentTeacherDiv = document.querySelector(`#dropdown-${studentId}-${subjectId}`).closest('.subject-card').querySelector('.current-teacher-info');
            currentTeacherDiv.innerHTML = `<strong>Текущий преподаватель:</strong> ${teacherName} (${teacher.email})`;
            
            // Обновляем данные учеников
            await loadStudents();
            
            // Закрываем модальное окно назначения преподавателя
            closeModal('assign-teacher-modal');
        } else {
            throw new Error(data.message || 'Ошибка назначения преподавателя');
        }
    } catch (error) {
        console.error('Ошибка назначения преподавателя:', error);
        showNotification(error.message || 'Ошибка назначения преподавателя', 'error');
    }
}

async function assignTeacher(studentId, teacherId, subjectId) {
    try {
        // Получаем информацию о преподавателе и предмете для уведомления
        const teacher = teachersData.find(t => t.id === teacherId);
        const subject = subjectsData.find(s => s.id === subjectId);
        const student = studentsData.find(s => s.id === studentId);
        
        const formData = new FormData();
        formData.append('studentId', studentId);
        formData.append('teacherId', teacherId);
        formData.append('subjectId', subjectId);
        
        const response = await fetch('/admin-lessons/api/assign-teacher', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            const teacherName = teacher ? teacher.name : 'Преподаватель';
            const subjectName = subject ? subject.name : 'Предмет';
            const studentName = student ? student.name : 'Ученик';
            
            showNotification(`Преподаватель ${teacherName} успешно назначен ученику ${studentName} по предмету ${subjectName}`, 'success');
            
            // Обновляем данные учеников
            await loadStudents();
            
            // Закрываем модальное окно назначения преподавателя
            closeModal('assign-teacher-modal');
        } else {
            throw new Error(data.message || 'Ошибка назначения преподавателя');
        }
    } catch (error) {
        console.error('Ошибка назначения преподавателя:', error);
        showNotification(error.message || 'Ошибка назначения преподавателя', 'error');
    }
}

async function removeTeacher(studentId, subjectId) {
    try {
        const student = studentsData.find(s => s.id === studentId);
        const subject = subjectsData.find(s => s.id === subjectId);
        
        if (!student || !subject) {
            showNotification('Ошибка: не найдены данные ученика или предмета', 'error');
            return;
        }
        
        const confirmMessage = `Вы уверены, что хотите снять назначение преподавателя для ученика ${student.name} по предмету ${subject.name}?`;
        if (!confirm(confirmMessage)) {
            return;
        }
        
        // Отправляем запрос на снятие назначения
        const response = await fetch('/admin-lessons/api/remove-teacher', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                studentId: studentId,
                subjectId: subjectId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Назначение преподавателя снято для ученика ${student.name} по предмету ${subject.name}`, 'success');
            
            // Обновляем данные учеников
            await loadStudents();
            
            // Закрываем модальное окно назначения преподавателя
            closeModal('assign-teacher-modal');
        } else {
            throw new Error(data.message || 'Ошибка снятия назначения преподавателя');
        }
    } catch (error) {
        console.error('Ошибка снятия назначения преподавателя:', error);
        showNotification(error.message || 'Ошибка снятия назначения преподавателя', 'error');
    }
}

// ===== ЗАГРУЗКА ПРЕДМЕТОВ УЧЕНИКА =====

// Функция больше не нужна, так как предметы загружаются сразу в карточку ученика

// ===== МОДАЛЬНЫЕ ОКНА ДЛЯ ПРЕДМЕТОВ =====

function openTeacherScheduleForSubject(studentId, subjectId) {
    const student = studentsData.find(s => s.id === studentId);
    const subject = subjectsData.find(sub => sub.id === subjectId);
    if (!student || !subject) return;
    
    // Открываем расписание ученика для выбранного предмета
    openStudentScheduleModal(studentId, subjectId);
}

function openStudentScheduleModal(studentId, subjectId) {
    const student = studentsData.find(s => s.id === studentId);
    const subject = subjectsData.find(sub => sub.id === subjectId);
    if (!student || !subject) return;
    
    currentUser = { id: studentId, name: student.name, type: 'student', subjectId: subjectId };
    currentWeekOffset = 0;
    
    document.getElementById('schedule-modal-title').textContent = `Расписание: ${student.name} - ${subject.name}`;
    
    // Показываем информацию о расписании
    document.getElementById('schedule-info').style.display = 'block';
    document.getElementById('schedule-user-name').textContent = `Расписание ученика: ${student.name}`;
    document.getElementById('schedule-user-type').textContent = `Предмет: ${subject.name}`;
    
    // Инициализируем таблицу расписания
    initScheduleTable();
    loadScheduleData();
    
    openModal('schedule-modal');
}

// Функция для открытия модального окна назначения преподавателя по предмету (удалена, так как дублирует основную функцию)

async function loadTeachersForSubject(subjectId) {
    try {
        const response = await fetch(`/admin-lessons/api/teachers/by-subject/${subjectId}`);
        const data = await response.json();
        
        const teachersContainer = document.getElementById('teachers-list');
        teachersContainer.innerHTML = '';
        
        if (data.teachers && data.teachers.length > 0) {
            data.teachers.forEach(teacher => {
                const teacherItem = document.createElement('div');
                teacherItem.className = 'teacher-item';
                teacherItem.innerHTML = `
                    <div class="teacher-info">
                        <div class="teacher-name">${teacher.name}</div>
                        <div class="teacher-email">${teacher.email}</div>
                    </div>
                    <button class="assign-btn" onclick="assignTeacher(${teacher.id})">
                        Назначить
                    </button>
                `;
                teachersContainer.appendChild(teacherItem);
            });
        } else {
            teachersContainer.innerHTML = '<p style="color: #6c757d; text-align: center;">Нет доступных преподавателей для этого предмета</p>';
        }
    } catch (error) {
        console.error('Ошибка загрузки преподавателей:', error);
        showNotification('Ошибка загрузки преподавателей', 'error');
    }
}

// ===== РАСПИСАНИЕ =====

function openTeacherScheduleModal(teacherId) {
    const teacher = teachersData.find(t => t.id === teacherId);
    if (!teacher) return;
    
    currentUser = { id: teacherId, name: teacher.name, type: 'teacher' };
    currentWeekOffset = 0;
    
    document.getElementById('schedule-modal-title').textContent = `Расписание: ${teacher.name}`;
    
    // Показываем информацию о расписании
    document.getElementById('schedule-info').style.display = 'block';
    document.getElementById('schedule-user-name').textContent = `Расписание преподавателя: ${teacher.name}`;
    document.getElementById('schedule-user-type').textContent = 'Преподаватель';
    
    // Инициализируем таблицу расписания
    initScheduleTable();
    loadScheduleData();
    
    openModal('schedule-modal');
}

// Функция больше не нужна, так как расписание открывается через преподавателя

function initScheduleTable() {
    const tableBody = document.getElementById('schedule-table-body');
    tableBody.innerHTML = '';
    
    const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];
    const hours = [];
    
    // Создаем слоты с 12:00 до 00:00 (24:00)
    for (let hour = 12; hour <= 23; hour++) {
        hours.push(hour);
    }
    
    hours.forEach(hour => {
        const row = document.createElement('tr');
        
        // Ячейка времени
        const timeCell = document.createElement('td');
        timeCell.className = 'time-cell';
        timeCell.textContent = `${hour.toString().padStart(2, '0')}:00`;
        row.appendChild(timeCell);
        
        // Ячейки для каждого дня недели
        days.forEach(day => {
            const cell = document.createElement('td');
            const slot = document.createElement('button');
            slot.className = 'schedule-slot available';
            slot.setAttribute('data-day', day);
            slot.setAttribute('data-hour', hour);
            slot.setAttribute('data-slot-id', `${day}_${hour}`);
            
            slot.addEventListener('click', () => handleSlotClick(slot));
            
            cell.appendChild(slot);
            row.appendChild(cell);
        });
        
        tableBody.appendChild(row);
    });
    
    updateWeekDisplay();
}

function updateWeekDisplay() {
    const currentDate = new Date();
    currentDate.setDate(currentDate.getDate() + (currentWeekOffset * 7));
    
    const weekStart = new Date(currentDate);
    // Исправляем логику для правильного вычисления понедельника
    const dayOfWeek = currentDate.getDay();
    let daysToMonday;
    if (dayOfWeek === 0) { // Воскресенье
        daysToMonday = 6; // До понедельника этой недели (6 дней назад)
    } else {
        daysToMonday = dayOfWeek - 1; // До понедельника этой недели
    }
    weekStart.setDate(currentDate.getDate() - daysToMonday);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Воскресенье
    
    const formatDate = (date) => {
        return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    };
    
    document.getElementById('current-week-display').textContent = 
        `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
}

function updateScheduleTable() {
    updateWeekDisplay();
    loadScheduleData();
}

async function loadScheduleData() {
    try {
        if (currentUser.type === 'teacher') {
            // Загружаем расписание преподавателя
            const response = await fetch(`/admin-lessons/api/teacher/${currentUser.id}/schedule?weekOffset=${currentWeekOffset}`);
            const data = await response.json();
            
            if (data.schedules) {
                // Очищаем все слоты до доступных
                const slots = document.querySelectorAll('.schedule-slot');
                slots.forEach(slot => {
                    slot.className = 'schedule-slot available';
                    slot.innerHTML = '';
                });
                
                // Устанавливаем рабочие слоты (желтые)
                data.schedules.forEach(schedule => {
                    if (schedule.isAvailable) {
                        const day = schedule.dayOfWeek;
                        const hour = schedule.startTime.split(':')[0];
                        const slotId = `${day}_${hour}`;
                        const slot = document.querySelector(`[data-slot-id="${slotId}"]`);
                        
                        if (slot) {
                            slot.className = 'schedule-slot working';
                            slot.setAttribute('data-original-class', 'schedule-slot working');
                            slot.innerHTML = 'Рабочий час';
                        }
                    }
                });
                
                // Устанавливаем занятые слоты (красные) с информацией об учениках
                if (data.lessons) {
                    data.lessons.forEach(lesson => {
                        const day = lesson.dayOfWeek;
                        const hour = lesson.startTime.split(':')[0];
                        const slotId = `${day}_${hour}`;
                        const slot = document.querySelector(`[data-slot-id="${slotId}"]`);
                        
                        if (slot) {
                            slot.className = 'schedule-slot lesson-booked';
                            slot.setAttribute('data-original-class', 'schedule-slot lesson-booked');
                            slot.setAttribute('data-lesson-id', lesson.lessonId);
                            slot.innerHTML = `
                                <div class="slot-subject">${lesson.subjectName}</div>
                                <div class="slot-student">${lesson.studentName}</div>
                            `;
                        }
                    });
                }
            }
        } else if (currentUser.type === 'student') {
            // Загружаем расписание ученика
            const url = currentUser.subjectId 
                ? `/admin-lessons/api/student/${currentUser.id}/schedule?weekOffset=${currentWeekOffset}&subjectId=${currentUser.subjectId}`
                : `/admin-lessons/api/student/${currentUser.id}/schedule?weekOffset=${currentWeekOffset}`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.availableSlots) {
                // Очищаем все слоты до недоступных (серых)
                const slots = document.querySelectorAll('.schedule-slot');
                slots.forEach(slot => {
                    slot.className = 'schedule-slot occupied-others';
                    slot.disabled = true;
                    slot.innerHTML = '';
                });
                
                // Устанавливаем доступные слоты (желтые) - те, которые у преподавателя открыты
                data.availableSlots.forEach(slotData => {
                    const day = slotData.dayOfWeek;
                    const hour = slotData.startTime.split(':')[0];
                    const slotId = `${day}_${hour}`;
                    const slot = document.querySelector(`[data-slot-id="${slotId}"]`);
                    
                    if (slot) {
                        slot.className = 'schedule-slot working';
                        slot.disabled = false;
                        slot.innerHTML = 'Доступно';
                    }
                });
                
                // Устанавливаем забронированные слоты (фиолетовые) с информацией о предметах
                if (data.bookedSlots) {
                    data.bookedSlots.forEach(slotData => {
                        const day = slotData.dayOfWeek;
                        const hour = slotData.startTime.split(':')[0];
                        const slotId = `${day}_${hour}`;
                        const slot = document.querySelector(`[data-slot-id="${slotId}"]`);
                        
                        if (slot) {
                            slot.className = 'schedule-slot occupied-current';
                            slot.disabled = false;
                            slot.innerHTML = `
                                <div class="slot-subject">${slotData.subjectName}</div>
                                <div class="slot-student">Мой урок</div>
                            `;
                        }
                    });
                }
                
                // Устанавливаем слоты, занятые другими учениками (серые и не кликабельные)
                if (data.occupiedByOthers) {
                    data.occupiedByOthers.forEach(slotData => {
                        const day = slotData.dayOfWeek;
                        const hour = slotData.startTime.split(':')[0];
                        const slotId = `${day}_${hour}`;
                        const slot = document.querySelector(`[data-slot-id="${slotId}"]`);
                        
                        if (slot) {
                            slot.className = 'schedule-slot occupied-others';
                            slot.disabled = true;
                            slot.innerHTML = `
                                <div class="slot-subject">${slotData.subjectName}</div>
                                <div class="slot-student">${slotData.studentName}</div>
                            `;
                        }
                    });
                }
            }
        }
    } catch (error) {
        console.error('Ошибка загрузки расписания:', error);
        showNotification('Ошибка загрузки расписания', 'error');
    }
}

function handleSlotClick(slot) {
    const currentClass = slot.className;
    
    if (currentUser.type === 'teacher') {
        // Логика для преподавателя
        if (currentClass.includes('available')) {
            // Первый клик - выбираем для добавления
            slot.className = 'schedule-slot selected';
        } else if (currentClass.includes('selected')) {
            // Второй клик - снимаем выбор
            slot.className = 'schedule-slot available';
        } else if (currentClass.includes('working')) {
            // Клик по рабочему слоту - помечаем для удаления
            slot.className = 'schedule-slot to-delete';
        } else if (currentClass.includes('to-delete')) {
            // Клик по слоту для удаления - возвращаем в рабочий
            slot.className = 'schedule-slot working';
        } else if (currentClass.includes('lesson-booked')) {
            // Клик по занятому уроку - помечаем для удаления урока
            slot.className = 'schedule-slot lesson-booked to-delete';
            showNotification('Урок помечен для удаления. Нажмите "Сохранить" для подтверждения.', 'warning');
        } else if (currentClass.includes('lesson-booked to-delete')) {
            // Клик по слоту урока для удаления - возвращаем в исходное состояние
            slot.className = 'schedule-slot lesson-booked';
            showNotification('Удаление урока отменено.', 'info');
        }
    } else if (currentUser.type === 'student') {
        // Логика для ученика
        if (currentClass.includes('working')) {
            // Клик по доступному слоту - выбираем для бронирования
            slot.className = 'schedule-slot selected';
        } else if (currentClass.includes('selected')) {
            // Клик по выбранному слоту - снимаем выбор
            slot.className = 'schedule-slot working';
        } else if (currentClass.includes('occupied-current')) {
            // Клик по своему уроку - помечаем для отмены
            slot.className = 'schedule-slot to-delete';
        } else if (currentClass.includes('to-delete')) {
            // Клик по слоту для отмены - возвращаем в свой урок
            slot.className = 'schedule-slot occupied-current';
        }
        // Слоты occupied-others (занятые другими) не кликабельны
    }
}

async function saveSchedule() {
    try {
        if (currentUser.type === 'teacher') {
            // Сохранение расписания преподавателя
            const selectedSlots = [];
            const slotsToDelete = [];
            const lessonsToDelete = [];
            
            // Если есть уроки для удаления, запрашиваем подтверждение
            const lessonsToDeleteCount = document.querySelectorAll('.schedule-slot.lesson-booked.to-delete').length;
            if (lessonsToDeleteCount > 0) {
                const confirmMessage = `Вы уверены, что хотите удалить ${lessonsToDeleteCount} урок(ов)? Это действие нельзя отменить.`;
                if (!confirm(confirmMessage)) {
                    showNotification('Удаление уроков отменено.', 'info');
                    return;
                }
            }
            
            const slots = document.querySelectorAll('.schedule-slot');
            slots.forEach(slot => {
                const slotId = slot.getAttribute('data-slot-id');
                
                if (slot.className.includes('selected')) {
                    // Новые слоты для добавления
                    const [day, hour] = slotId.split('_');
                    selectedSlots.push({
                        dayOfWeek: day,
                        startTime: `${hour}:00`
                    });
                } else if (slot.className.includes('to-delete')) {
                    // Проверяем, был ли это слот с уроком или рабочий слот
                    const originalClass = slot.getAttribute('data-original-class');
                    if (originalClass && originalClass.includes('lesson-booked') || slot.className.includes('lesson-booked')) {
                        // Это урок для удаления
                        const [day, hour] = slotId.split('_');
                        lessonsToDelete.push({
                            dayOfWeek: day,
                            startTime: `${hour}:00`
                        });
                    } else {
                        // Это рабочий слот для удаления
                        const [day, hour] = slotId.split('_');
                        slotsToDelete.push({
                            dayOfWeek: day,
                            startTime: `${hour}:00`
                        });
                    }
                }
            });
            
            const scheduleData = {
                selectedSlots: selectedSlots,
                slotsToDelete: slotsToDelete,
                lessonsToDelete: lessonsToDelete
            };
            
            const response = await fetch(`/admin-lessons/api/teacher/${currentUser.id}/schedule`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(scheduleData)
            });
            
            const result = await response.json();
            
            if (result.status === 'success') {
                showNotification('Расписание успешно сохранено', 'success');
                // Перезагружаем расписание для отображения желтых слотов
                await loadScheduleData();
                // Закрываем модальное окно после успешного сохранения
                closeModal('schedule-modal');
            } else {
                throw new Error(result.message || 'Ошибка сохранения');
            }
            
        } else if (currentUser.type === 'student') {
            // Сохранение уроков ученика
            const selectedSlots = [];
            const slotsToDelete = [];
            
            // Проверяем, выбран ли предмет
            if (!currentUser.subjectId) {
                showNotification('Предмет не выбран', 'error');
                return;
            }
            
            const subject = subjectsData.find(sub => sub.id === currentUser.subjectId);
            if (!subject) {
                showNotification('Предмет не найден', 'error');
                return;
            }
            
            const slots = document.querySelectorAll('.schedule-slot');
            slots.forEach(slot => {
                const slotId = slot.getAttribute('data-slot-id');
                
                if (slot.className.includes('selected')) {
                    selectedSlots.push(slotId);
                } else if (slot.className.includes('to-delete')) {
                    slotsToDelete.push(slotId);
                }
            });
            
            // Если есть новые слоты для бронирования
            if (selectedSlots.length > 0) {
                const repeatWeekly = document.getElementById('repeat-weekly').checked;
                const weeksCount = repeatWeekly ? parseInt(document.getElementById('weeks-count').value) : 1;
                
                const lessonData = {
                    studentId: currentUser.id,
                    subjectId: currentUser.subjectId,
                    subjectName: subject.name,
                    selectedSlots: selectedSlots,
                    repeatWeekly: repeatWeekly,
                    recurrenceWeeks: weeksCount,
                    weekOffset: currentWeekOffset
                };
                
                const response = await fetch('/admin-lessons/api/create-lessons', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(lessonData)
                });
                
                const result = await response.json();
                
                if (result.status !== 'success') {
                    throw new Error(result.message || 'Ошибка создания уроков');
                }
            }
            
            // Если есть слоты для отмены
            if (slotsToDelete.length > 0) {
                // Получаем уроки для отмены
                const response = await fetch(`/admin-lessons/api/student/${currentUser.id}/lessons-to-cancel`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        slotsToDelete: slotsToDelete,
                        weekOffset: currentWeekOffset
                    })
                });
                
                const result = await response.json();
                
                if (result.status !== 'success') {
                    throw new Error(result.message || 'Ошибка отмены уроков');
                }
            }
            
            showNotification('Расписание успешно обновлено', 'success');
            // Закрываем модальное окно после успешного сохранения
            closeModal('schedule-modal');
        }
        
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        showNotification(error.message || 'Ошибка сохранения', 'error');
    }
}

function resetScheduleModal() {
    currentUser = null;
    currentWeekOffset = 0;
    currentScheduleData = {};
    
    // Сброс чекбокса повторения
    document.getElementById('repeat-weekly').checked = false;
    document.getElementById('weeks-input-container').style.display = 'none';
    document.getElementById('weeks-count').value = 4;
}

// ===== УВЕДОМЛЕНИЯ =====

function showNotification(message, type = 'success') {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    notification.innerHTML = `
        <div class="notification-content">
            <i class="notification-icon ${icons[type]}"></i>
            <div class="notification-message">${message}</div>
        </div>
    `;
    
    container.appendChild(notification);
    
    // Автоматическое удаление через 5 секунд
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}



// ===== ЭКСПОРТ ФУНКЦИЙ ДЛЯ ГЛОБАЛЬНОГО ДОСТУПА =====
window.openAssignTeacherModal = openAssignTeacherModal;
window.openTeacherScheduleForSubject = openTeacherScheduleForSubject;
window.openTeacherScheduleModal = openTeacherScheduleModal;
window.openStudentScheduleModal = openStudentScheduleModal;
window.assignTeacher = assignTeacher;
window.removeTeacher = removeTeacher;
window.toggleTeacherDropdown = toggleTeacherDropdown;
window.selectTeacher = selectTeacher;




 