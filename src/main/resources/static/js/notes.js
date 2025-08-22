// Функции для работы с конспектами
class NotesManager {
    constructor() {
        this.notes = [];
        this.currentNote = null;
        this.drawingCanvas = null;
        this.drawingContext = null;
        this.editDrawingCanvas = null;
        this.editDrawingContext = null;
        this.isDrawing = false;
        this.isSaving = false;
        this.currentTool = 'pen';
        this.currentColor = '#000000';
        this.brushSize = 3;
        this.uploadedFiles = [];
        this.editUploadedFiles = [];
        
        this.init();
    }
    
    init() {
        console.log('Инициализация NotesManager...');
        this.bindEvents();
        this.loadNotes();
        this.loadSubjects();
        // Инициализируем холсты после загрузки DOM
        setTimeout(() => {
            this.initDrawingCanvas();
            this.initEditDrawingCanvas();
        }, 500);
    }
    
    // Загрузка конспектов
    async loadNotes() {
        try {
            console.log('Загружаем конспекты...');
            const response = await fetch('/api/notes');
            console.log('Ответ сервера:', response.status, response.statusText);
            
            if (response.ok) {
                this.notes = await response.json();
                console.log('Загружено конспектов:', this.notes.length);
                console.log('Конспекты:', this.notes);
                this.renderNotes();
            } else {
                console.error('Ошибка загрузки конспектов:', response.status, response.statusText);
                const errorText = await response.text();
                console.error('Текст ошибки:', errorText);
            }
        } catch (error) {
            console.error('Ошибка загрузки конспектов:', error);
        }
    }
    
    // Загрузка предметов
    async loadSubjects() {
        try {
            const response = await fetch('/api/subjects');
            if (response.ok) {
                const subjects = await response.json();
                this.populateSubjectSelect(subjects);
            } else {
                console.error('Ошибка загрузки предметов');
            }
        } catch (error) {
            console.error('Ошибка загрузки предметов:', error);
        }
    }
    
    // Заполнение селектора предметов
    populateSubjectSelect(subjects) {
        const subjectSelect = document.getElementById('noteSubject');
        const editSubjectSelect = document.getElementById('editNoteSubject');
        
        // Заполняем основной селектор
        if (subjectSelect) {
            subjectSelect.innerHTML = '<option value="">Выберите предмет</option>';
            subjects.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject.id;
                option.textContent = subject.name;
                subjectSelect.appendChild(option);
            });
        }
        
        // Заполняем селектор для редактирования
        if (editSubjectSelect) {
            editSubjectSelect.innerHTML = '<option value="">Выберите предмет</option>';
            subjects.forEach(subject => {
                const option = document.createElement('option');
                option.value = subject.id;
                option.textContent = subject.name;
                editSubjectSelect.appendChild(option);
            });
        }
    }
    
    // Отрисовка списка конспектов
    renderNotes() {
        console.log('Отрисовка конспектов...');
        const notesList = document.getElementById('notesList');
        const noNotesMessage = document.getElementById('noNotesMessage');
        
        console.log('notesList найден:', !!notesList);
        console.log('noNotesMessage найден:', !!noNotesMessage);
        
        if (!notesList) {
            console.error('Контейнер notesList не найден!');
            return;
        }
        
        console.log('Количество конспектов для отображения:', this.notes.length);
        
        if (this.notes.length === 0) {
            console.log('Конспектов нет, показываем сообщение');
            notesList.style.display = 'none';
            if (noNotesMessage) {
                noNotesMessage.style.display = 'block';
            }
            return;
        }
        
        console.log('Отображаем конспекты');
        notesList.style.display = 'block';
        if (noNotesMessage) {
            noNotesMessage.style.display = 'none';
        }
        
        const html = this.notes.map(note => this.createNoteCard(note)).join('');
        console.log('HTML для конспектов:', html);
        notesList.innerHTML = html;
    }
    
    // Создание карточки конспекта
    createNoteCard(note) {
        let createdAt = 'Неизвестно';
        try {
            if (note.createdAt) {
                createdAt = new Date(note.createdAt).toLocaleDateString('ru-RU');
            }
        } catch (error) {
            console.error('Ошибка парсинга даты:', error);
        }
        const contentTypeIcon = this.getContentTypeIcon(note.contentType);
        
        return `
            <div class="note-card" data-note-id="${note.id}" style="cursor: pointer;">
                <div class="note-header">
                    <div class="note-title">${note.title}</div>
                    <div class="note-actions">
                        <button class="note-action-btn edit-note" title="Редактировать">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="note-action-btn delete-note" title="Удалить">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="note-content">
                    <div class="note-subject">
                        <i class="fas fa-book"></i>
                        ${note.subject.name}
                    </div>
                    <div class="note-description">${note.description || 'Описание отсутствует'}</div>
                    <div class="note-meta">
                        <span class="note-type">
                            <i class="fas ${contentTypeIcon}"></i>
                            ${this.getContentTypeName(note.contentType)}
                        </span>
                        <span class="note-date">
                            <i class="fas fa-calendar"></i>
                            ${createdAt}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Получение иконки типа контента
    getContentTypeIcon(contentType) {
        switch (contentType) {
            case 'TEXT': return 'fa-font';
            case 'DRAWING': return 'fa-paint-brush';
            case 'FILE': return 'fa-file';
            case 'MIXED': return 'fa-layer-group';
            default: return 'fa-sticky-note';
        }
    }
    
    // Получение названия типа контента
    getContentTypeName(contentType) {
        switch (contentType) {
            case 'TEXT': return 'Текст';
            case 'DRAWING': return 'Рисунок';
            case 'FILE': return 'Файлы';
            case 'MIXED': return 'Смешанный';
            default: return 'Неизвестно';
        }
    }
    
    // Инициализация холста для рисования
    initDrawingCanvas() {
        this.drawingCanvas = document.getElementById('drawingCanvas');
        if (!this.drawingCanvas) {
            console.log('Холст для рисования не найден');
            return;
        }
        
        this.drawingContext = this.drawingCanvas.getContext('2d');
        
        // Устанавливаем размеры холста
        this.drawingCanvas.width = 600;
        this.drawingCanvas.height = 400;
        
        // Настраиваем контекст
        this.drawingContext.lineCap = 'round';
        this.drawingContext.lineJoin = 'round';
        this.drawingContext.strokeStyle = this.currentColor;
        this.drawingContext.lineWidth = this.brushSize;
        
        this.clearCanvas();
        this.setupDrawingEvents();
        console.log('Холст для рисования инициализирован');
    }
    
    // Инициализация холста для редактирования
    initEditDrawingCanvas() {
        this.editDrawingCanvas = document.getElementById('editDrawingCanvas');
        if (!this.editDrawingCanvas) {
            console.log('Холст для редактирования не найден');
            return;
        }
        
        this.editDrawingContext = this.editDrawingCanvas.getContext('2d');
        
        // Устанавливаем размеры холста
        this.editDrawingCanvas.width = 600;
        this.editDrawingCanvas.height = 400;
        
        // Настраиваем контекст
        this.editDrawingContext.lineCap = 'round';
        this.editDrawingContext.lineJoin = 'round';
        this.editDrawingContext.strokeStyle = this.currentColor;
        this.editDrawingContext.lineWidth = this.brushSize;
        
        this.clearEditCanvas();
        this.setupEditDrawingEvents();
        console.log('Холст для редактирования инициализирован');
    }
    
    // Настройка событий рисования
    setupDrawingEvents() {
        if (!this.drawingCanvas) return;
        
        // События мыши
        this.drawingCanvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.drawingCanvas.addEventListener('mousemove', (e) => this.draw(e));
        this.drawingCanvas.addEventListener('mouseup', () => this.stopDrawing());
        this.drawingCanvas.addEventListener('mouseout', () => this.stopDrawing());
        
        // События касания для мобильных устройств
        this.drawingCanvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startDrawing(e.touches[0]);
        });
        this.drawingCanvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.draw(e.touches[0]);
        });
        this.drawingCanvas.addEventListener('touchend', () => this.stopDrawing());
    }
    
    // Настройка событий рисования для редактирования
    setupEditDrawingEvents() {
        if (!this.editDrawingCanvas) return;
        
        // События мыши
        this.editDrawingCanvas.addEventListener('mousedown', (e) => this.startEditDrawing(e));
        this.editDrawingCanvas.addEventListener('mousemove', (e) => this.editDraw(e));
        this.editDrawingCanvas.addEventListener('mouseup', () => this.stopEditDrawing());
        this.editDrawingCanvas.addEventListener('mouseout', () => this.stopEditDrawing());
        
        // События касания для мобильных устройств
        this.editDrawingCanvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.startEditDrawing(e.touches[0]);
        });
        this.editDrawingCanvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.editDraw(e.touches[0]);
        });
        this.editDrawingCanvas.addEventListener('touchend', () => this.stopEditDrawing());
    }
    
    // Начало рисования
    startDrawing(e) {
        this.isDrawing = true;
        
        const rect = this.drawingCanvas.getBoundingClientRect();
        const scaleX = this.drawingCanvas.width / rect.width;
        const scaleY = this.drawingCanvas.height / rect.height;
        
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        // Начинаем новый путь с текущей позиции
        this.drawingContext.beginPath();
        this.drawingContext.moveTo(x, y);
    }
    
    // Рисование
    draw(e) {
        if (!this.isDrawing) return;
        
        const rect = this.drawingCanvas.getBoundingClientRect();
        const scaleX = this.drawingCanvas.width / rect.width;
        const scaleY = this.drawingCanvas.height / rect.height;
        
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        // Обновляем стили только если изменились
        if (this.drawingContext.lineWidth !== this.brushSize) {
            this.drawingContext.lineWidth = this.brushSize;
        }
        
        if (this.currentTool === 'eraser') {
            if (this.drawingContext.strokeStyle !== '#ffffff') {
                this.drawingContext.strokeStyle = '#ffffff';
            }
        } else {
            if (this.drawingContext.strokeStyle !== this.currentColor) {
                this.drawingContext.strokeStyle = this.currentColor;
            }
        }
        
        // Рисуем линию к текущей позиции
        this.drawingContext.lineTo(x, y);
        this.drawingContext.stroke();
    }
    
    // Остановка рисования
    stopDrawing() {
        this.isDrawing = false;
    }
    
    // Начало рисования в режиме редактирования
    startEditDrawing(e) {
        this.isDrawing = true;
        
        const rect = this.editDrawingCanvas.getBoundingClientRect();
        const scaleX = this.editDrawingCanvas.width / rect.width;
        const scaleY = this.editDrawingCanvas.height / rect.height;
        
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        // Начинаем новый путь с текущей позиции
        this.editDrawingContext.beginPath();
        this.editDrawingContext.moveTo(x, y);
    }
    
    // Рисование в режиме редактирования
    editDraw(e) {
        if (!this.isDrawing) return;
        
        const rect = this.editDrawingCanvas.getBoundingClientRect();
        const scaleX = this.editDrawingCanvas.width / rect.width;
        const scaleY = this.editDrawingCanvas.height / rect.height;
        
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        // Обновляем стили только если изменились
        if (this.editDrawingContext.lineWidth !== this.brushSize) {
            this.editDrawingContext.lineWidth = this.brushSize;
        }
        
        if (this.currentTool === 'eraser') {
            if (this.editDrawingContext.strokeStyle !== '#ffffff') {
                this.editDrawingContext.strokeStyle = '#ffffff';
            }
        } else {
            if (this.editDrawingContext.strokeStyle !== this.currentColor) {
                this.editDrawingContext.strokeStyle = this.currentColor;
            }
        }
        
        // Рисуем линию к текущей позиции
        this.editDrawingContext.lineTo(x, y);
        this.editDrawingContext.stroke();
    }
    
    // Остановка рисования в режиме редактирования
    stopEditDrawing() {
        this.isDrawing = false;
    }
    
    // Привязка событий
    bindEvents() {
        // Кнопка добавления конспекта
        document.addEventListener('click', (e) => {
            if (e.target.closest('#addNoteBtn')) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Клик на кнопку добавления конспекта');
                this.showNoteModal();
            }
        });
        
        // Закрытие модальных окон по клику на крестик
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-close') || e.target.closest('.modal-close')) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Клик на кнопку закрытия, закрываем модальные окна');
                this.closeAllModals();
            }
        });
        
        // Вкладки контента
        const contentTabs = document.querySelectorAll('.content-tab');
        contentTabs.forEach(tab => {
            tab.addEventListener('click', (e) => this.switchContentTab(e));
        });
        
        // Инструменты рисования (делегирование событий)
        document.addEventListener('click', (e) => {
            if (e.target.closest('#drawingPanel .tool-btn')) {
                this.selectTool(e);
            }
        });
        
        // Очистка холста
        document.addEventListener('click', (e) => {
            if (e.target.closest('#clearCanvas')) {
                this.clearCanvas();
            }
        });
        
        // Изменение цвета
        document.addEventListener('change', (e) => {
            if (e.target.id === 'colorPicker') {
                this.changeColor(e);
            }
        });
        
        // Изменение размера кисти
        document.addEventListener('input', (e) => {
            if (e.target.id === 'brushSize') {
                this.changeBrushSize(e);
            }
        });
        
        // Загрузка файлов (делегирование событий)
        document.addEventListener('change', (e) => {
            if (e.target.id === 'fileInput') {
                this.handleFileUpload(e);
            }
        });
        
        // Drag and drop для файлов (делегирование событий)
        document.addEventListener('dragover', (e) => {
            if (e.target.closest('#uploadZone')) {
                this.handleDragOver(e);
            }
        });
        
        document.addEventListener('drop', (e) => {
            if (e.target.closest('#uploadZone')) {
                this.handleDrop(e);
            }
        });
        
        // Сохранение конспекта (делегирование событий)
        document.addEventListener('click', (e) => {
            const saveButton = e.target.closest('#noteModal .modal-footer .primary');
            if (saveButton) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Клик на кнопку сохранения конспекта');
                // Проверяем, что сохранение еще не выполняется
                if (!this.isSaving) {
                    this.saveNote();
                } else {
                    console.log('Сохранение уже выполняется, пропускаем...');
                }
            }
        });
        
        // Делегирование событий для карточек конспектов
        document.addEventListener('click', (e) => {
            if (e.target.closest('.edit-note')) {
                e.stopPropagation();
                const noteCard = e.target.closest('.note-card');
                const noteId = noteCard.dataset.noteId;
                console.log('Редактирование конспекта ID:', noteId);
                if (noteId) {
                    this.editNote(noteId);
                }
            } else if (e.target.closest('.delete-note')) {
                e.stopPropagation();
                const noteCard = e.target.closest('.note-card');
                const noteId = noteCard.dataset.noteId;
                console.log('Удаление конспекта ID:', noteId);
                if (noteId) {
                    this.deleteNote(noteId);
                }
            } else if (e.target.closest('.note-card')) {
                const noteCard = e.target.closest('.note-card');
                const noteId = noteCard.dataset.noteId;
                console.log('Просмотр конспекта ID:', noteId);
                if (noteId) {
                    this.viewNote(noteId);
                }
            }
        });
        
        // Закрытие модальных окон по клику на backdrop
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-backdrop') || e.target.closest('.modal-backdrop')) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Клик на backdrop, закрываем модальные окна');
                this.closeAllModals();
            }
        });
        
        // Вкладки просмотра конспекта
        document.addEventListener('click', (e) => {
            if (e.target.closest('.note-view-tab')) {
                this.switchViewTab(e);
            }
        });
        
        // Инструменты рисования для редактирования
        document.addEventListener('click', (e) => {
            if (e.target.closest('#editDrawingPanel .tool-btn')) {
                this.selectEditTool(e);
            }
        });
        
        // Очистка холста редактирования
        const editClearCanvas = document.getElementById('editClearCanvas');
        if (editClearCanvas) {
            editClearCanvas.addEventListener('click', () => this.clearEditCanvas());
        }
        
        // Изменение цвета для редактирования
        const editColorPicker = document.getElementById('editColorPicker');
        if (editColorPicker) {
            editColorPicker.addEventListener('change', (e) => this.changeEditColor(e));
        }
        
        // Изменение размера кисти для редактирования
        const editBrushSize = document.getElementById('editBrushSize');
        if (editBrushSize) {
            editBrushSize.addEventListener('input', (e) => this.changeEditBrushSize(e));
        }
    }
    
    // Показать модальное окно
    showNoteModal() {
        console.log('Показываем модальное окно...');
        const modal = document.getElementById('noteModal');
        if (modal) {
            // Сбрасываем флаг сохранения
            this.isSaving = false;
            
            // Сначала скрываем все модальные окна
            const allModals = document.querySelectorAll('.modal');
            allModals.forEach(m => {
                m.classList.remove('show');
                m.style.display = 'none';
            });
            
            // Показываем нужное модальное окно
            modal.style.display = 'flex';
            modal.classList.add('show');
            this.resetForm();
            this.clearCanvas();
            console.log('Модальное окно показано');
        } else {
            console.error('Модальное окно не найдено');
        }
    }
    
    // Закрыть модальное окно
    closeNoteModal() {
        console.log('Закрытие модального окна создания конспекта...');
        const modal = document.getElementById('noteModal');
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none';
            this.resetForm();
            console.log('Модальное окно закрыто');
        } else {
            console.error('Модальное окно не найдено');
        }
    }
    
    // Переключение вкладок контента
    switchContentTab(e) {
        const tab = e.target;
        const tabName = tab.dataset.tab;
        
        // Убираем активный класс со всех вкладок и панелей
        document.querySelectorAll('.content-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.content-panel').forEach(p => p.classList.remove('active'));
        
        // Добавляем активный класс к выбранной вкладке и панели
        tab.classList.add('active');
        const panel = document.getElementById(tabName + 'Panel');
        if (panel) {
            panel.classList.add('active');
        }
    }
    
    // Выбор инструмента рисования
    selectTool(e) {
        const btn = e.target.closest('.tool-btn');
        if (!btn) return;
        
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        this.currentTool = btn.dataset.tool;
    }
    
    // Очистка холста
    clearCanvas() {
        if (!this.drawingContext) return;
        
        // Очищаем весь холст
        this.drawingContext.clearRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
        
        // Заполняем белым цветом
        this.drawingContext.fillStyle = '#ffffff';
        this.drawingContext.fillRect(0, 0, this.drawingCanvas.width, this.drawingCanvas.height);
    }
    
    // Изменение цвета
    changeColor(e) {
        this.currentColor = e.target.value;
    }
    
    // Изменение размера кисти
    changeBrushSize(e) {
        this.brushSize = e.target.value;
    }
    
    // Обработка загрузки файлов
    handleFileUpload(e) {
        const files = Array.from(e.target.files);
        this.addFiles(files);
    }
    
    // Обработка drag over
    handleDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    }
    
    // Обработка drop
    handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files);
        this.addFiles(files);
    }
    
    // Добавление файлов
    addFiles(files) {
        files.forEach(file => {
            if (file.size > 10 * 1024 * 1024) { // 10MB лимит
                alert(`Файл ${file.name} слишком большой. Максимальный размер: 10MB`);
                return;
            }
            
            this.uploadedFiles.push(file);
            this.renderUploadedFiles();
        });
    }
    
    // Отрисовка загруженных файлов
    renderUploadedFiles() {
        const container = document.getElementById('uploadedFiles');
        if (!container) return;
        
        container.innerHTML = this.uploadedFiles.map((file, index) => `
            <div class="uploaded-file">
                <div class="file-info">
                    <i class="fas fa-file"></i>
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">${this.formatFileSize(file.size)}</span>
                </div>
                <button class="remove-file" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
        
        // Привязка событий удаления файлов
        container.querySelectorAll('.remove-file').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.remove-file').dataset.index);
                this.uploadedFiles.splice(index, 1);
                this.renderUploadedFiles();
            });
        });
    }
    
    // Форматирование размера файла
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Сохранение конспекта
    async saveNote() {
        // Защита от двойного сохранения
        if (this.isSaving) {
            console.log('Сохранение уже выполняется, пропускаем...');
            return;
        }
        
        this.isSaving = true;
        console.log('Сохранение конспекта...');
        
        const title = document.getElementById('noteTitle').value.trim();
        const subject = document.getElementById('noteSubject').value;
        const description = document.getElementById('noteDescription').value.trim();
        
        console.log('Данные формы:', { title, subject, description });
        
        if (!title || !subject) {
            alert('Пожалуйста, заполните название и выберите предмет');
            this.isSaving = false;
            return;
        }
        
        // Определяем тип контента
        let contentType = 'TEXT';
        let textContent = '';
        let drawingData = '';
        
        const activeTab = document.querySelector('.content-tab.active');
        if (activeTab) {
            const tabType = activeTab.dataset.tab;
            switch (tabType) {
                case 'drawing':
                    contentType = 'DRAWING';
                    drawingData = this.drawingCanvas.toDataURL();
                    break;
                case 'upload':
                    contentType = this.uploadedFiles.length > 0 ? 'FILE' : 'TEXT';
                    break;
                case 'text':
                    contentType = 'TEXT';
                    textContent = document.getElementById('noteText').value;
                    break;
            }
        }
        
        // Если есть и текст, и файлы, то смешанный тип
        if (textContent && this.uploadedFiles.length > 0) {
            contentType = 'MIXED';
        }
        
        try {
            const noteData = {
                title: title,
                subjectId: parseInt(subject),
                description: description,
                contentType: contentType,
                textContent: textContent,
                drawingData: drawingData
            };
            
            const response = await fetch('/api/notes', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(noteData)
            });
            
            if (response.ok) {
                const newNote = await response.json();
                console.log('Конспект создан:', newNote);
                
                // Обновляем список конспектов
                this.notes.unshift(newNote);
                this.renderNotes();
                
                // Загружаем файлы, если они есть
                if (this.uploadedFiles.length > 0) {
                    await this.uploadFiles(newNote.id);
                }
                
                // Закрываем модальное окно ДО показа alert
                this.closeAllModals();
                
                // Показываем уведомление после закрытия модального окна
                setTimeout(() => {
                    alert('Конспект успешно создан!');
                }, 100);
            } else {
                const errorText = await response.text();
                console.error('Ошибка создания конспекта:', response.status, errorText);
                alert('Ошибка при создании конспекта');
            }
        } catch (error) {
            console.error('Ошибка сохранения конспекта:', error);
            alert('Ошибка при создании конспекта');
        } finally {
            this.isSaving = false;
        }
    }
    
    // Загрузка файлов
    async uploadFiles(noteId) {
        for (const file of this.uploadedFiles) {
            const formData = new FormData();
            formData.append('file', file);
            
            try {
                const response = await fetch(`/api/notes/${noteId}/files`, {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    console.error(`Ошибка загрузки файла ${file.name}`);
                }
            } catch (error) {
                console.error(`Ошибка загрузки файла ${file.name}:`, error);
            }
        }
    }
    
    // Редактирование конспекта
    editNote(noteId) {
        // TODO: Реализовать редактирование конспекта
        console.log('Редактирование конспекта:', noteId);
    }
    
    // Удаление конспекта
    async deleteNote(noteId) {
        if (!confirm('Вы уверены, что хотите удалить этот конспект?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/notes/${noteId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.notes = this.notes.filter(note => note.id !== parseInt(noteId));
                this.renderNotes();
                alert('Конспект успешно удален');
            } else {
                alert('Ошибка при удалении конспекта');
            }
        } catch (error) {
            console.error('Ошибка удаления конспекта:', error);
            alert('Ошибка при удалении конспекта');
        }
    }
    
    // Сброс формы
    resetForm() {
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteSubject').value = '';
        document.getElementById('noteDescription').value = '';
        document.getElementById('noteText').value = '';
        
        this.clearCanvas();
        this.uploadedFiles = [];
        this.renderUploadedFiles();
        
        // Сбрасываем вкладки
        document.querySelectorAll('.content-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.content-panel').forEach(p => p.classList.remove('active'));
        
        document.querySelector('.content-tab[data-tab="drawing"]').classList.add('active');
        document.getElementById('drawingPanel').classList.add('active');
    }
    
    // Просмотр конспекта
    async viewNote(noteId) {
        try {
            const response = await fetch(`/api/notes/${noteId}`);
            if (response.ok) {
                const note = await response.json();
                this.currentNote = note;
                this.showViewNoteModal(note);
            } else {
                alert('Ошибка при загрузке конспекта');
            }
        } catch (error) {
            console.error('Ошибка просмотра конспекта:', error);
            alert('Ошибка при загрузке конспекта');
        }
    }
    
    // Показать модальное окно просмотра
    showViewNoteModal(note) {
        const modal = document.getElementById('viewNoteModal');
        if (!modal) return;
        
        // Заполняем заголовок
        document.getElementById('viewNoteTitle').textContent = note.title;
        document.getElementById('viewNoteSubject').innerHTML = `<i class="fas fa-book"></i> ${note.subject.name}`;
        document.getElementById('viewNoteDescription').textContent = note.description || 'Описание отсутствует';
        
        // Заполняем контент
        this.populateViewContent(note);
        
        modal.classList.add('show');
    }
    
    // Заполнить контент просмотра
    populateViewContent(note) {
        // Текстовый контент
        const textContent = document.getElementById('viewNoteText');
        if (note.textContent) {
            textContent.textContent = note.textContent;
        } else {
            textContent.innerHTML = '<div class="note-empty-content"><i class="fas fa-font"></i><p>Текстовый контент отсутствует</p></div>';
        }
        
        // Рисунок
        const drawingContent = document.getElementById('viewNoteDrawing');
        if (note.drawingData) {
            drawingContent.innerHTML = `<img src="${note.drawingData}" alt="Рисунок конспекта">`;
        } else {
            drawingContent.innerHTML = '<div class="note-empty-content"><i class="fas fa-paint-brush"></i><p>Зарисовки отсутствуют</p></div>';
        }
        
        // Файлы
        this.loadNoteFiles(note.id);
    }
    
    // Загрузить файлы конспекта
    async loadNoteFiles(noteId) {
        try {
            const response = await fetch(`/api/notes/${noteId}/files`);
            if (response.ok) {
                const files = await response.json();
                this.renderViewFiles(files);
            }
        } catch (error) {
            console.error('Ошибка загрузки файлов:', error);
        }
    }
    
    // Отрисовка файлов в просмотре
    renderViewFiles(files) {
        const container = document.getElementById('viewNoteFiles');
        if (!container) return;
        
        if (files.length === 0) {
            container.innerHTML = '<div class="note-empty-content"><i class="fas fa-file"></i><p>Файлы отсутствуют</p></div>';
            return;
        }
        
        container.innerHTML = files.map(file => `
            <div class="note-file-card">
                <div class="note-file-icon ${this.getFileIconClass(file)}">
                    <i class="fas ${this.getFileIcon(file)}"></i>
                </div>
                <div class="note-file-name">${file.fileName}</div>
                <div class="note-file-size">${this.formatFileSize(file.fileSize)}</div>
                <div class="note-file-actions">
                    <button class="note-file-btn download" onclick="downloadFile(${file.id})">
                        <i class="fas fa-download"></i> Скачать
                    </button>
                    <button class="note-file-btn delete" onclick="deleteFile(${file.id})">
                        <i class="fas fa-trash"></i> Удалить
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    // Получить класс иконки файла
    getFileIconClass(file) {
        if (file.isImage) return 'image';
        if (file.isPdf) return 'pdf';
        return 'document';
    }
    
    // Получить иконку файла
    getFileIcon(file) {
        if (file.isImage) return 'fa-image';
        if (file.isPdf) return 'fa-file-pdf';
        return 'fa-file-alt';
    }
    
    // Переключение вкладок просмотра
    switchViewTab(e) {
        const tab = e.target.closest('.note-view-tab');
        const tabName = tab.dataset.tab;
        
        // Убираем активный класс со всех вкладок и панелей
        document.querySelectorAll('.note-view-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.note-view-panel').forEach(p => p.classList.remove('active'));
        
        // Добавляем активный класс к выбранной вкладке и панели
        tab.classList.add('active');
        const panel = document.getElementById('view' + tabName.charAt(0).toUpperCase() + tabName.slice(1) + 'Panel');
        if (panel) {
            panel.classList.add('active');
        }
    }
    
    // Закрыть модальное окно просмотра
    closeViewNoteModal() {
        const modal = document.getElementById('viewNoteModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }
    
    // Редактирование конспекта
    async editNote(noteId) {
        try {
            const response = await fetch(`/api/notes/${noteId}`);
            if (response.ok) {
                const note = await response.json();
                this.currentNote = note;
                this.showEditNoteModal(note);
            } else {
                alert('Ошибка при загрузке конспекта');
            }
        } catch (error) {
            console.error('Ошибка редактирования конспекта:', error);
            alert('Ошибка при загрузке конспекта');
        }
    }
    
    // Показать модальное окно редактирования
    showEditNoteModal(note) {
        const modal = document.getElementById('editNoteModal');
        if (!modal) return;
        
        // Заполняем форму
        document.getElementById('editNoteTitle').value = note.title;
        document.getElementById('editNoteDescription').value = note.description || '';
        
        // Устанавливаем предмет
        const subjectSelect = document.getElementById('editNoteSubject');
        subjectSelect.value = note.subject.id;
        
        // Заполняем контент
        if (note.textContent) {
            document.getElementById('editNoteText').value = note.textContent;
        }
        
        if (note.drawingData) {
            this.loadDrawingToCanvas(note.drawingData);
        } else {
            this.clearEditCanvas();
        }
        
        // Загружаем файлы
        this.loadEditNoteFiles(note.id);
        
        modal.classList.add('show');
    }
    
    // Загрузить рисунок на холст
    loadDrawingToCanvas(drawingData) {
        const img = new Image();
        img.onload = () => {
            this.editDrawingContext.clearRect(0, 0, this.editDrawingCanvas.width, this.editDrawingCanvas.height);
            this.editDrawingContext.drawImage(img, 0, 0);
        };
        img.src = drawingData;
    }
    
    // Загрузить файлы для редактирования
    async loadEditNoteFiles(noteId) {
        try {
            const response = await fetch(`/api/notes/${noteId}/files`);
            if (response.ok) {
                const files = await response.json();
                this.editUploadedFiles = files;
                this.renderEditUploadedFiles();
            }
        } catch (error) {
            console.error('Ошибка загрузки файлов:', error);
        }
    }
    
    // Отрисовка файлов для редактирования
    renderEditUploadedFiles() {
        const container = document.getElementById('editUploadedFiles');
        if (!container) return;
        
        container.innerHTML = this.editUploadedFiles.map((file, index) => `
            <div class="uploaded-file">
                <div class="file-info">
                    <i class="fas fa-file"></i>
                    <span class="file-name">${file.fileName}</span>
                    <span class="file-size">${this.formatFileSize(file.fileSize)}</span>
                </div>
                <button class="remove-file" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
        
        // Привязка событий удаления файлов
        container.querySelectorAll('.remove-file').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const index = parseInt(e.target.closest('.remove-file').dataset.index);
                this.editUploadedFiles.splice(index, 1);
                this.renderEditUploadedFiles();
            });
        });
    }
    
    // Закрыть модальное окно редактирования
    closeEditNoteModal() {
        const modal = document.getElementById('editNoteModal');
        if (modal) {
            modal.classList.remove('show');
        }
    }
    
    // Обновить конспект
    async updateNote() {
        if (!this.currentNote) return;
        
        const title = document.getElementById('editNoteTitle').value.trim();
        const subject = document.getElementById('editNoteSubject').value;
        const description = document.getElementById('editNoteDescription').value.trim();
        
        if (!title || !subject) {
            alert('Пожалуйста, заполните название и выберите предмет');
            return;
        }
        
        // Определяем тип контента
        let contentType = 'TEXT';
        let textContent = '';
        let drawingData = '';
        
        const activeTab = document.querySelector('#editNoteModal .content-tab.active');
        if (activeTab) {
            const tabType = activeTab.dataset.tab;
            switch (tabType) {
                case 'drawing':
                    contentType = 'DRAWING';
                    drawingData = this.editDrawingCanvas.toDataURL();
                    break;
                case 'upload':
                    contentType = this.editUploadedFiles.length > 0 ? 'FILE' : 'TEXT';
                    break;
                case 'text':
                    contentType = 'TEXT';
                    textContent = document.getElementById('editNoteText').value;
                    break;
            }
        }
        
        // Если есть и текст, и файлы, то смешанный тип
        if (textContent && this.editUploadedFiles.length > 0) {
            contentType = 'MIXED';
        }
        
        try {
            const noteData = {
                title: title,
                subjectId: parseInt(subject),
                description: description,
                contentType: contentType,
                textContent: textContent,
                drawingData: drawingData
            };
            
            const response = await fetch(`/api/notes/${this.currentNote.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(noteData)
            });
            
            if (response.ok) {
                const updatedNote = await response.json();
                
                // Обновляем конспект в списке
                const index = this.notes.findIndex(n => n.id === this.currentNote.id);
                if (index !== -1) {
                    this.notes[index] = updatedNote;
                    this.renderNotes();
                }
                
                this.closeEditNoteModal();
                alert('Конспект успешно обновлен!');
            } else {
                alert('Ошибка при обновлении конспекта');
            }
        } catch (error) {
            console.error('Ошибка обновления конспекта:', error);
            alert('Ошибка при обновлении конспекта');
        }
    }
    
    // Инструменты для редактирования
    selectEditTool(e) {
        const btn = e.target.closest('.tool-btn');
        if (!btn) return;
        
        document.querySelectorAll('#editDrawingPanel .tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        this.currentTool = btn.dataset.tool;
    }
    
    // Очистка холста редактирования
    clearEditCanvas() {
        if (!this.editDrawingContext) return;
        
        // Очищаем весь холст
        this.editDrawingContext.clearRect(0, 0, this.editDrawingCanvas.width, this.editDrawingCanvas.height);
        
        // Заполняем белым цветом
        this.editDrawingContext.fillStyle = '#ffffff';
        this.editDrawingContext.fillRect(0, 0, this.editDrawingCanvas.width, this.editDrawingCanvas.height);
    }
    
    // Изменение цвета для редактирования
    changeEditColor(e) {
        this.currentColor = e.target.value;
    }
    
    // Изменение размера кисти для редактирования
    changeEditBrushSize(e) {
        this.brushSize = e.target.value;
    }
    
    // Закрыть все модальные окна
    closeAllModals() {
        console.log('Закрытие всех модальных окон...');
        
        // Закрываем все модальные окна
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.remove('show');
            modal.style.display = 'none';
        });
        
        // Сбрасываем формы
        this.resetForm();
        
        console.log('Все модальные окна закрыты');
    }
    
    // Редактировать текущий конспект
    editCurrentNote() {
        if (this.currentNote) {
            this.closeViewNoteModal();
            this.editNote(this.currentNote.id);
        }
    }
}

// Инициализация менеджера конспектов при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM загружен, проверяем элементы конспектов...');
    
    // Проверяем, что мы на странице с конспектами
    const notesList = document.getElementById('notesList');
    const addNoteBtn = document.getElementById('addNoteBtn');
    
    console.log('notesList найден:', !!notesList);
    console.log('addNoteBtn найден:', !!addNoteBtn);
    
    if (notesList && addNoteBtn) {
        console.log('Инициализация NotesManager...');
        window.notesManager = new NotesManager();
    } else {
        console.log('Элементы конспектов не найдены, NotesManager не инициализируется');
    }
});

// Глобальные функции для вызова из HTML
function closeNoteModal() {
    if (window.notesManager) {
        window.notesManager.closeNoteModal();
    }
}

function saveNote() {
    if (window.notesManager) {
        window.notesManager.saveNote();
    }
}

function closeViewNoteModal() {
    if (window.notesManager) {
        window.notesManager.closeViewNoteModal();
    }
}

function closeEditNoteModal() {
    if (window.notesManager) {
        window.notesManager.closeEditNoteModal();
    }
}

function editCurrentNote() {
    if (window.notesManager) {
        window.notesManager.editCurrentNote();
    }
}

function updateNote() {
    if (window.notesManager) {
        window.notesManager.updateNote();
    }
}

function downloadFile(fileId) {
    window.open(`/api/notes/files/${fileId}/download`, '_blank');
}

function deleteFile(fileId) {
    if (confirm('Вы уверены, что хотите удалить этот файл?')) {
        fetch(`/api/notes/files/${fileId}`, {
            method: 'DELETE'
        }).then(response => {
            if (response.ok) {
                // Обновляем отображение файлов
                if (window.notesManager && window.notesManager.currentNote) {
                    window.notesManager.loadNoteFiles(window.notesManager.currentNote.id);
                }
            } else {
                alert('Ошибка при удалении файла');
            }
        }).catch(error => {
            console.error('Ошибка удаления файла:', error);
            alert('Ошибка при удалении файла');
        });
    }
}
