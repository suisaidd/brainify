let selectedTemplateId = null;
let editingQuestionId = null;
let currentQuestions = [];
let modalElements = {};

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('createBasicTestForm');
    const refreshBtn = document.getElementById('refreshBasicTests');

    modalElements = {
        modal: document.getElementById('testQuestionsModal'),
        backdrop: document.getElementById('testQuestionsBackdrop'),
        title: document.getElementById('modalTestTitle'),
        meta: document.getElementById('modalTestMeta'),
        questionForm: document.getElementById('questionForm'),
        questionNumber: document.getElementById('questionNumber'),
        questionText: document.getElementById('questionText'),
        correctAnswer: document.getElementById('correctAnswer'),
        questionImage: document.getElementById('questionImage'),
        removeImageRow: document.getElementById('removeImageRow'),
        removeImageCheckbox: document.getElementById('removeImageCheckbox'),
        submitQuestionBtn: document.getElementById('submitQuestionBtn'),
        resetQuestionForm: document.getElementById('resetQuestionForm'),
        closeModalBtn: document.getElementById('closeQuestionsModal'),
        questionsList: document.getElementById('questionsList'),
    };

    if (form) {
        form.addEventListener('submit', handleCreateBasicTest);
    }

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => loadBasicTests(true));
    }

    if (modalElements.questionForm) {
        modalElements.questionForm.addEventListener('submit', handleQuestionSubmit);
    }

    if (modalElements.resetQuestionForm) {
        modalElements.resetQuestionForm.addEventListener('click', resetQuestionFormState);
    }

    if (modalElements.closeModalBtn) {
        modalElements.closeModalBtn.addEventListener('click', closeTestModal);
    }

    if (modalElements.backdrop) {
        modalElements.backdrop.addEventListener('click', closeTestModal);
    }

    document.body.addEventListener('click', handleBodyClick);

    loadBasicTests();
});

function handleBodyClick(event) {
    const manageBtn = event.target.closest('.manage-test-btn');
    if (manageBtn) {
        const templateId = manageBtn.getAttribute('data-template-id');
        if (templateId) {
            openTestModal(templateId);
        }
        return;
    }

    const editBtn = event.target.closest('.question-edit-btn');
    if (editBtn) {
        const questionId = parseInt(editBtn.getAttribute('data-question-id'), 10);
        if (!Number.isNaN(questionId)) {
            fillQuestionForm(questionId);
        }
        return;
    }

    const deleteBtn = event.target.closest('.question-delete-btn');
    if (deleteBtn) {
        const questionId = parseInt(deleteBtn.getAttribute('data-question-id'), 10);
        if (!Number.isNaN(questionId)) {
            deleteQuestion(questionId);
        }
    }
}

async function handleCreateBasicTest(event) {
    event.preventDefault();

    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');

    const subjectId = form.subjectId.value;
    const difficultyLevel = form.difficultyLevel.value;
    const title = form.title.value.trim();
    const description = form.description.value.trim();

    if (!subjectId || !difficultyLevel) {
        showAdminToast('Выберите предмет и уровень сложности', 'warning');
        return;
    }

    const payload = {
        subjectId,
        difficultyLevel,
        title: title || null,
        description: description || null
    };

    try {
        toggleLoading(submitButton, true, 'Создание...');

        const response = await fetch('/admin/tests/api/basic', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Не удалось создать тест');
        }

        showAdminToast('Тест успешно создан и назначен ученикам', 'success');
        form.reset();
        form.subjectId.selectedIndex = 0;
        form.difficultyLevel.selectedIndex = 0;

        await loadBasicTests();
    } catch (error) {
        console.error('Ошибка создания теста:', error);
        showAdminToast(error.message, 'error');
    } finally {
        toggleLoading(submitButton, false);
    }
}

async function loadBasicTests(showToast = false) {
    const listContainer = document.getElementById('basicTestsList');
    if (!listContainer) {
        return;
    }

    try {
        listContainer.classList.add('loading');
        listContainer.innerHTML = `<div class="loading-state">
            <div class="spinner"></div>
            <p>Загружаем тесты...</p>
        </div>`;

        const response = await fetch('/admin/tests/api/basic');
        if (!response.ok) {
            throw new Error('Не удалось загрузить список тестов');
        }

        const tests = await response.json();
        renderBasicTests(listContainer, tests);

        if (showToast) {
            showAdminToast('Список тестов обновлён', 'info');
        }
    } catch (error) {
        console.error('Ошибка загрузки тестов:', error);
        showAdminToast(error.message, 'error');
        listContainer.classList.remove('loading');
        listContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-triangle-exclamation"></i>
                <h4>Не удалось загрузить тесты</h4>
                <p>Попробуйте обновить страницу позже.</p>
            </div>
        `;
    }
}

function renderBasicTests(container, tests) {
    container.classList.remove('loading');

    if (!tests || tests.length === 0) {
        container.classList.add('empty');
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h4>Тесты ещё не созданы</h4>
                <p>Создайте первый тест, чтобы ученики могли начать подготовку.</p>
            </div>
        `;
        return;
    }

    container.classList.remove('empty');
    container.innerHTML = tests.map(test => `
        <div class="test-row">
            <div class="test-main">
                <strong>${test.title}</strong>
                <span>${test.subjectName}</span>
            </div>
            <div class="test-meta">
                <span>
                    <i class="fas fa-layer-group"></i>
                    Уровень: ${test.difficultyLevel}
                </span>
                <span>
                    <i class="fas fa-users"></i>
                    Назначено ученикам: ${test.assignedCount}
                </span>
            </div>
            <div class="test-date">
                <span>Создан: ${formatAdminDate(test.createdAt)}</span>
                <span>ID: ${test.id}</span>
            </div>
            <div class="test-actions">
                <button class="admin-btn admin-btn-primary-outline manage-test-btn" data-template-id="${test.id}">
                    <i class="fas fa-edit"></i>
                    Настроить задания
                </button>
            </div>
        </div>
    `).join('');
}

async function openTestModal(templateId) {
    selectedTemplateId = templateId;
    editingQuestionId = null;
    clearQuestionForm();

    try {
        const response = await fetch(`/admin/tests/api/template/${templateId}`);
        if (!response.ok) {
            throw new Error('Не удалось загрузить тест');
        }

        const data = await response.json();
        const template = data.template;
        currentQuestions = data.questions || [];

        if (modalElements.title) {
            modalElements.title.textContent = template.title;
        }
        if (modalElements.meta) {
            const difficulty = template.difficultyLevel ? `Уровень ${template.difficultyLevel}` : 'Без уровня';
            modalElements.meta.textContent = `${template.subjectName} • ${difficulty}`;
        }

        populateQuestionsList(currentQuestions);
        showModal();
    } catch (error) {
        console.error('Ошибка загрузки теста:', error);
        showAdminToast(error.message, 'error');
    }
}

function showModal() {
    if (modalElements.backdrop) {
        modalElements.backdrop.classList.add('open');
    }
    if (modalElements.modal) {
        modalElements.modal.classList.add('open');
        modalElements.modal.setAttribute('aria-hidden', 'false');
    }
}

function closeTestModal() {
    selectedTemplateId = null;
    editingQuestionId = null;
    if (modalElements.backdrop) {
        modalElements.backdrop.classList.remove('open');
    }
    if (modalElements.modal) {
        modalElements.modal.classList.remove('open');
        modalElements.modal.setAttribute('aria-hidden', 'true');
    }
}

function populateQuestionsList(questions) {
    if (!modalElements.questionsList) {
        return;
    }

    if (!questions || questions.length === 0) {
        modalElements.questionsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard"></i>
                <h4>Заданий пока нет</h4>
                <p>Добавьте первое задание, чтобы сформировать тест.</p>
            </div>
        `;
        return;
    }

    modalElements.questionsList.innerHTML = questions.map(question => renderQuestionCard(question)).join('');
}

function renderQuestionCard(question) {
    const imageSection = question.imageUrl ? `
        <div class="question-image">
            <img src="${question.imageUrl}" alt="Изображение задания">
        </div>
    ` : '';

    return `
        <div class="question-card" data-question-id="${question.id}">
            <div class="question-card-body">
                <div class="question-card-header">
                    <span class="question-number">${question.questionNumber}</span>
                </div>
                <div class="question-text">${question.questionText.replace(/\n/g, '<br>')}</div>
                ${imageSection}
                <div class="question-answer"><strong>Ответ:</strong> ${question.correctAnswer.replace(/\n/g, '<br>')}</div>
            </div>
            <div class="question-card-actions">
                <button class="admin-btn admin-btn-tertiary question-edit-btn" data-question-id="${question.id}">
                    <i class="fas fa-pen"></i>
                    Изменить
                </button>
                <button class="admin-btn admin-btn-danger question-delete-btn" data-question-id="${question.id}">
                    <i class="fas fa-trash"></i>
                    Удалить
                </button>
            </div>
        </div>
    `;
}

function fillQuestionForm(questionId) {
    const question = currentQuestions.find(q => q.id === questionId);
    if (!question || !modalElements.questionForm) {
        return;
    }

    editingQuestionId = questionId;
    modalElements.questionNumber.value = question.questionNumber || '';
    modalElements.questionText.value = question.questionText || '';
    modalElements.correctAnswer.value = question.correctAnswer || '';
    modalElements.questionImage.value = '';

    if (question.imagePath) {
        modalElements.removeImageCheckbox.checked = false;
        modalElements.removeImageRow.classList.add('visible');
        modalElements.removeImageRow.dataset.active = 'true';
    } else {
        modalElements.removeImageCheckbox.checked = false;
        modalElements.removeImageRow.classList.remove('visible');
        modalElements.removeImageRow.dataset.active = 'false';
    }

    if (modalElements.submitQuestionBtn) {
        modalElements.submitQuestionBtn.innerHTML = '<i class="fas fa-save"></i> Сохранить изменения';
    }
}

function resetQuestionFormState() {
    editingQuestionId = null;
    if (!modalElements.questionForm) {
        return;
    }
    modalElements.questionForm.reset();
    modalElements.removeImageCheckbox.checked = false;
    modalElements.removeImageRow.classList.remove('visible');
    modalElements.removeImageRow.dataset.active = 'false';
    if (modalElements.submitQuestionBtn) {
        modalElements.submitQuestionBtn.innerHTML = '<i class="fas fa-plus"></i> Добавить задание';
    }
}

function clearQuestionForm() {
    resetQuestionFormState();
}

async function handleQuestionSubmit(event) {
    event.preventDefault();
    if (!selectedTemplateId) {
        showAdminToast('Выберите тест для редактирования', 'warning');
        return;
    }

    const formData = new FormData();
    formData.append('questionNumber', modalElements.questionNumber.value.trim());
    formData.append('questionText', modalElements.questionText.value.trim());
    formData.append('correctAnswer', modalElements.correctAnswer.value.trim());

    const file = modalElements.questionImage.files[0];
    if (file) {
        formData.append('image', file);
    }

    let url;
    let method;

    if (editingQuestionId) {
        url = `/admin/tests/api/questions/${editingQuestionId}`;
        method = 'PUT';
        formData.append('removeImage', modalElements.removeImageCheckbox.checked);
    } else {
        url = `/admin/tests/api/template/${selectedTemplateId}/questions`;
        method = 'POST';
    }

    try {
        const response = await fetch(url, {
            method,
            body: formData
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Не удалось сохранить задание');
        }

        showAdminToast(editingQuestionId ? 'Задание обновлено' : 'Задание добавлено', 'success');
        await openTestModal(selectedTemplateId);
        resetQuestionFormState();
    } catch (error) {
        console.error('Ошибка сохранения задания:', error);
        showAdminToast(error.message, 'error');
    }
}

async function deleteQuestion(questionId) {
    if (!selectedTemplateId) {
        return;
    }

    if (!confirm('Удалить выбранное задание?')) {
        return;
    }

    try {
        const response = await fetch(`/admin/tests/api/questions/${questionId}`, {
            method: 'DELETE'
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Не удалось удалить задание');
        }

        showAdminToast('Задание удалено', 'success');
        await openTestModal(selectedTemplateId);
    } catch (error) {
        console.error('Ошибка удаления задания:', error);
        showAdminToast(error.message, 'error');
    }
}

function formatAdminDate(date) {
    const parsed = date ? new Date(date) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) {
        return '—';
    }

    return parsed.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function toggleLoading(button, isLoading, loadingText) {
    if (!button) return;

    if (isLoading) {
        button.dataset.originalText = button.innerHTML;
        button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${loadingText || 'Загрузка...'}`;
        button.disabled = true;
    } else {
        button.innerHTML = button.dataset.originalText || button.innerHTML;
        button.disabled = false;
    }
}

function showAdminToast(message, type = 'info') {
    const existing = document.querySelector('.admin-toast');
    if (existing) {
        existing.remove();
    }

    const toast = document.createElement('div');
    toast.className = `admin-toast ${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <button type="button" aria-label="Закрыть">
            <i class="fas fa-times"></i>
        </button>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('visible');
    }, 10);

    const closeBtn = toast.querySelector('button');
    closeBtn.addEventListener('click', () => hideToast(toast));

    setTimeout(() => hideToast(toast), 4000);
}

function hideToast(toast) {
    if (!toast) return;
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 200);
}

