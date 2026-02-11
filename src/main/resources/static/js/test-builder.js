/**
 * test-builder.js — Конструктор теста (создание, редактирование, порядок, публикация)
 */
(function () {
    'use strict';

    const page = document.querySelector('.tb-page');
    if (!page) return;

    const templateId = parseInt(page.dataset.templateId, 10);
    const userRole = page.dataset.userRole;

    let currentTemplate = null;
    let questions = [];
    let dragSrcIndex = null;
    let allStudents = []; // cached for filtering

    // ──── DOM ────
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    const headerTitle = $('#headerTitle');
    const statusBadge = $('#statusBadge');
    const testTitle = $('#testTitle');
    const testDescription = $('#testDescription');
    const subjectName = $('#subjectName');
    const statusText = $('#statusText');
    const questionCount = $('#questionCount');
    const questionsList = $('#questionsList');
    const emptyState = $('#emptyState');

    // Модалки
    const questionModal = $('#questionModal');
    const publishModal = $('#publishModal');

    // ──── Init ────
    document.addEventListener('DOMContentLoaded', init);

    function init() {
        if (templateId && templateId > 0) {
            loadTest();
        } else {
            // Для нового теста — показываем empty state
            updateUI();
        }
        setupEventListeners();
    }

    // ──── Event Listeners ────
    function setupEventListeners() {
        $('#btnAddQuestion').addEventListener('click', () => openQuestionModal());
        $('#btnSaveMeta').addEventListener('click', saveMeta);
        $('#btnPublish').addEventListener('click', openPublishModal);

        // Question modal
        $('#modalClose').addEventListener('click', closeQuestionModal);
        $('#modalCancel').addEventListener('click', closeQuestionModal);
        $('#modalSave').addEventListener('click', saveQuestion);

        // Publish modal
        $('#publishClose').addEventListener('click', closePublishModal);
        $('#publishCancel').addEventListener('click', closePublishModal);
        $('#publishConfirm').addEventListener('click', confirmPublish);
        $('#selectAllStudents').addEventListener('change', (e) => {
            // Only toggle visible (not hidden) items
            $$('#publishStudentList .tb-student-item:not([style*="display: none"]) input[type="checkbox"]').forEach(cb => cb.checked = e.target.checked);
        });
        $('#publishStudentSearch').addEventListener('input', filterPublishStudents);

        // Extended answer toggle
        $('#qExtended').addEventListener('change', (e) => {
            const ansField = $('#correctAnswerField');
            if (e.target.checked) {
                ansField.style.display = 'none';
            } else {
                ansField.style.display = '';
            }
        });

        // Image preview
        $('#qImage').addEventListener('change', (e) => {
            const preview = $('#qImagePreview');
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (ev) => { preview.innerHTML = `<img src="${ev.target.result}">`; };
                reader.readAsDataURL(file);
            } else {
                preview.innerHTML = '';
            }
        });

        // Close modals on overlay click
        questionModal.addEventListener('click', (e) => { if (e.target === questionModal) closeQuestionModal(); });
        publishModal.addEventListener('click', (e) => { if (e.target === publishModal) closePublishModal(); });
    }

    // ──── Load test data ────
    async function loadTest() {
        try {
            const res = await fetch(`/test-builder/api/${templateId}`);
            const data = await res.json();
            if (data.error) { toast(data.error, 'error'); return; }
            currentTemplate = data.template;
            questions = data.questions || [];
            populateMeta();
            updateUI();
        } catch (e) {
            toast('Ошибка загрузки теста', 'error');
        }
    }

    function populateMeta() {
        if (!currentTemplate) return;
        testTitle.value = currentTemplate.title || '';
        testDescription.value = currentTemplate.description || '';
        subjectName.textContent = currentTemplate.subjectName || '—';
        const isDraft = currentTemplate.status === 'DRAFT';
        statusText.textContent = isDraft ? 'Черновик' : 'Опубликован';
        statusBadge.textContent = isDraft ? 'Черновик' : 'Опубликован';
        statusBadge.classList.toggle('published', !isDraft);
        headerTitle.textContent = currentTemplate.title || 'Конструктор теста';

        if (!isDraft) {
            $('#btnPublish').style.display = 'none';
            $('#btnAddQuestion').disabled = true;
        }
    }

    // ──── Save metadata ────
    async function saveMeta() {
        if (!templateId || templateId <= 0) { toast('Сначала создайте тест', 'error'); return; }
        try {
            const res = await fetch(`/test-builder/api/${templateId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: testTitle.value.trim(),
                    description: testDescription.value.trim()
                })
            });
            const data = await res.json();
            if (data.error) { toast(data.error, 'error'); return; }
            toast('Сохранено', 'success');
            headerTitle.textContent = testTitle.value.trim() || 'Конструктор теста';
        } catch (e) {
            toast('Ошибка сохранения', 'error');
        }
    }

    // ──── Render questions ────
    function updateUI() {
        questionCount.textContent = questions.length;
        if (questions.length === 0) {
            emptyState.style.display = '';
            renderQuestions();
            return;
        }
        emptyState.style.display = 'none';
        renderQuestions();
    }

    function renderQuestions() {
        // Keep empty state, remove question cards
        questionsList.querySelectorAll('.tb-question-card').forEach(el => el.remove());

        questions.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
        questions.forEach((q, idx) => {
            const card = createQuestionCard(q, idx);
            questionsList.appendChild(card);
        });
    }

    function createQuestionCard(q, idx) {
        const card = document.createElement('div');
        card.className = 'tb-question-card' + (q.isExtendedAnswer ? ' extended' : '');
        card.dataset.questionId = q.id;
        card.dataset.index = idx;
        card.draggable = true;

        let imgThumb = '';
        if (q.imageUrl) {
            imgThumb = `<img src="${q.imageUrl}" class="tb-q-image-thumb" alt="">`;
        }

        const extended = q.isExtendedAnswer
            ? '<span><i class="fas fa-paint-brush"></i> Развёрнутый</span>'
            : '';

        card.innerHTML = `
            <div class="tb-q-number">${q.questionNumber || (idx + 1)}</div>
            <div class="tb-q-body">
                <div class="tb-q-title">Задание ${q.questionNumber}</div>
                <div class="tb-q-text">${escapeHtml(q.questionText)}</div>
                <div class="tb-q-meta">
                    ${extended}
                    ${q.isExtendedAnswer ? '' : `<span><i class="fas fa-check"></i> ${escapeHtml(q.correctAnswer)}</span>`}
                    ${q.imageUrl ? '<span><i class="fas fa-image"></i> Изображение</span>' : ''}
                </div>
            </div>
            ${imgThumb}
            <div class="tb-q-actions">
                <button title="Редактировать" data-action="edit"><i class="fas fa-pen"></i></button>
                <button title="Удалить" class="delete" data-action="delete"><i class="fas fa-trash"></i></button>
            </div>
        `;

        // Actions
        card.querySelector('[data-action="edit"]').addEventListener('click', (e) => {
            e.stopPropagation();
            openQuestionModal(q);
        });
        card.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteQuestion(q.id);
        });

        // Drag & drop
        card.addEventListener('dragstart', (e) => {
            dragSrcIndex = idx;
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
        });
        card.addEventListener('dragend', () => {
            card.classList.remove('dragging');
            dragSrcIndex = null;
        });
        card.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });
        card.addEventListener('drop', (e) => {
            e.preventDefault();
            const dropIdx = parseInt(card.dataset.index, 10);
            if (dragSrcIndex !== null && dragSrcIndex !== dropIdx) {
                reorderQuestions(dragSrcIndex, dropIdx);
            }
        });

        return card;
    }

    // ──── Question modal ────
    function openQuestionModal(q) {
        const isEdit = !!q;
        $('#modalTitle').textContent = isEdit ? 'Редактировать задание' : 'Новое задание';
        $('#editQuestionId').value = isEdit ? q.id : '';
        $('#qNumber').value = isEdit ? q.questionNumber : '';
        $('#qText').value = isEdit ? q.questionText : '';
        $('#qAnswer').value = isEdit ? q.correctAnswer : '';
        $('#qExtended').checked = isEdit && q.isExtendedAnswer;
        $('#qImage').value = '';
        $('#qImagePreview').innerHTML = isEdit && q.imageUrl
            ? `<img src="${q.imageUrl}">` : '';
        $('#correctAnswerField').style.display = (isEdit && q.isExtendedAnswer) ? 'none' : '';
        questionModal.classList.add('open');
    }

    function closeQuestionModal() {
        questionModal.classList.remove('open');
    }

    async function saveQuestion() {
        const editId = $('#editQuestionId').value;
        const isEdit = editId !== '';

        const fd = new FormData();
        fd.append('questionNumber', $('#qNumber').value.trim());
        fd.append('questionText', $('#qText').value.trim());
        fd.append('correctAnswer', $('#qAnswer').value.trim());
        fd.append('isExtendedAnswer', $('#qExtended').checked);

        const imageFile = $('#qImage').files[0];
        if (imageFile) fd.append('image', imageFile);
        if (isEdit && !imageFile && !$('#qImagePreview img')) {
            fd.append('removeImage', 'true');
        }

        try {
            let url, method;
            if (isEdit) {
                url = `/test-builder/api/questions/${editId}`;
                method = 'PUT';
            } else {
                url = `/test-builder/api/${templateId}/questions`;
                method = 'POST';
            }

            const res = await fetch(url, { method, body: fd });
            const data = await res.json();
            if (data.error) { toast(data.error, 'error'); return; }

            if (isEdit) {
                const idx = questions.findIndex(q => String(q.id) === String(editId));
                if (idx >= 0) questions[idx] = data.question;
            } else {
                questions.push(data.question);
            }

            closeQuestionModal();
            updateUI();
            toast(isEdit ? 'Задание обновлено' : 'Задание добавлено', 'success');
        } catch (e) {
            toast('Ошибка сохранения задания', 'error');
        }
    }

    // ──── Delete question ────
    async function deleteQuestion(questionId) {
        if (!confirm('Удалить это задание?')) return;
        try {
            const res = await fetch(`/test-builder/api/questions/${questionId}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.error) { toast(data.error, 'error'); return; }
            questions = questions.filter(q => q.id !== questionId);
            updateUI();
            toast('Задание удалено', 'success');
        } catch (e) {
            toast('Ошибка удаления', 'error');
        }
    }

    // ──── Reorder ────
    async function reorderQuestions(fromIdx, toIdx) {
        const moved = questions.splice(fromIdx, 1)[0];
        questions.splice(toIdx, 0, moved);
        // Update display orders
        questions.forEach((q, i) => q.displayOrder = i + 1);
        renderQuestions();

        try {
            const ids = questions.map(q => q.id);
            await fetch(`/test-builder/api/${templateId}/reorder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ questionIds: ids })
            });
        } catch (e) {
            toast('Ошибка сохранения порядка', 'error');
        }
    }

    // ──── Publish ────
    async function openPublishModal() {
        if (questions.length === 0) {
            toast('Добавьте хотя бы одно задание', 'error');
            return;
        }
        publishModal.classList.add('open');
        const list = $('#publishStudentList');
        const searchInput = $('#publishStudentSearch');
        searchInput.value = '';
        list.innerHTML = '<div class="tb-loading"><i class="fas fa-spinner fa-spin"></i> Загрузка...</div>';
        try {
            const res = await fetch(`/test-builder/api/${templateId}/students`);
            const students = await res.json();
            allStudents = Array.isArray(students) ? students : [];
            if (allStudents.length === 0) {
                list.innerHTML = '<p class="tb-student-no-results">Учеников не найдено</p>';
                return;
            }
            renderStudentList(allStudents, list);
        } catch (e) {
            list.innerHTML = '<p style="padding:12px;color:#e53935;">Ошибка загрузки</p>';
        }
    }

    function renderStudentList(students, container) {
        container.innerHTML = students.map(s => `
            <label class="tb-student-item" data-name="${escapeHtml(s.name).toLowerCase()}" data-email="${escapeHtml(s.email).toLowerCase()}">
                <input type="checkbox" value="${s.id}" checked>
                <div>
                    <div class="tb-student-name">${escapeHtml(s.name)}</div>
                    <div class="tb-student-email">${escapeHtml(s.email)}</div>
                </div>
            </label>
        `).join('');
    }

    function filterPublishStudents() {
        const query = ($('#publishStudentSearch').value || '').trim().toLowerCase();
        const items = $$('#publishStudentList .tb-student-item');
        let visibleCount = 0;
        items.forEach(item => {
            const name = item.dataset.name || '';
            const email = item.dataset.email || '';
            const match = !query || name.includes(query) || email.includes(query);
            item.style.display = match ? '' : 'none';
            if (match) visibleCount++;
        });
        // Show/hide no-results message
        let noRes = $('#publishStudentList .tb-student-no-results');
        if (visibleCount === 0 && items.length > 0) {
            if (!noRes) {
                const p = document.createElement('p');
                p.className = 'tb-student-no-results';
                p.textContent = 'Ничего не найдено';
                $('#publishStudentList').appendChild(p);
            }
        } else if (noRes) {
            noRes.remove();
        }
    }

    function closePublishModal() {
        publishModal.classList.remove('open');
    }

    async function confirmPublish() {
        const checkboxes = $$('#publishStudentList input[type="checkbox"]:checked');
        const studentIds = Array.from(checkboxes).map(cb => parseInt(cb.value, 10));

        if (studentIds.length === 0) {
            toast('Выберите хотя бы одного ученика', 'error');
            return;
        }

        try {
            const res = await fetch(`/test-builder/api/${templateId}/publish`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ studentIds })
            });
            const data = await res.json();
            if (data.error) { toast(data.error, 'error'); return; }

            toast('Тест отправлен ученикам!', 'success');
            closePublishModal();

            // Обновляем статус
            if (currentTemplate) currentTemplate.status = 'PUBLISHED';
            populateMeta();

            // Через 1.5с переходим на дашборд
            setTimeout(() => { window.location.href = '/dashboard'; }, 1500);
        } catch (e) {
            toast('Ошибка публикации', 'error');
        }
    }

    // ──── Helpers ────
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function toast(msg, type) {
        const t = $('#toast');
        t.textContent = msg;
        t.className = 'tb-toast show ' + (type || 'success');
        clearTimeout(t._timer);
        t._timer = setTimeout(() => t.classList.remove('show'), 3000);
    }
})();
