document.addEventListener('DOMContentLoaded', function() {
    const root = document.getElementById('testRunContent');
    const sessionId = window.testSessionId;
    if (!sessionId) {
        root.innerHTML = '<div class="test-config"><h2 class="config-title">Ошибка</h2><p>Не указан идентификатор сессии.</p></div>';
        return;
    }

    root.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';

    fetch(`/test/api/session/${sessionId}/tasks`)
        .then(async r => { if (!r.ok) { throw new Error(await r.text()); } return r.json(); })
        .then(data => {
            if (data.error) throw new Error(data.error);
            const questions = Array.isArray(data.tasks) ? data.tasks : [];
            if (questions.length === 0) throw new Error('В сессии нет заданий');

            let idx = 0;
            const answers = {};

            function render() {
                const q = questions[idx];
                const total = questions.length;
                const num = q.taskNumber ? `№ ${q.taskNumber}` : '';
                const html = `
                    <div class="test-questions">
                        <div class="question-card">
                            <div class="question-header">
                                <div class="question-number">${idx + 1}</div>
                                <div class="question-number-label">${num}</div>
                                <div class="question-difficulty difficulty-${q.difficultyLevel || 1}">
                                    <i class="fas fa-star"></i>
                                    <span>Сложность ${q.difficultyLevel || 1}</span>
                                </div>
                            </div>
                            <div class="question-text">${q.question || ''}</div>
                            ${q.hasImage ? `<div class="question-image"><img class="question-image-img" src="/api/tasks/${q.id}/image"></div>` : ''}
                            <div class="form-group">
                                <label>Ваш ответ:</label>
                                <textarea class="answer-input" data-task-id="${q.id}">${answers[q.id] || ''}</textarea>
                            </div>
                        </div>
                    </div>
                    <div class="test-controls">
                        <div class="controls-content">
                            <div class="test-progress">
                                <div class="progress-bar"><div class="progress-fill" style="width:${((idx+1)/total)*100}%"></div></div>
                                <div class="progress-text">${idx + 1} из ${total}</div>
                            </div>
                            <div class="test-actions">
                                <button class="btn-secondary" id="btnPrev" ${idx===0?'disabled':''}><i class="fas fa-arrow-left"></i>Назад</button>
                                <button class="btn-secondary" id="btnNext" ${idx===total-1?'disabled':''}>Вперед<i class="fas fa-arrow-right"></i></button>
                                <button class="btn-success" id="btnFinish"><i class="fas fa-check"></i>Завершить тест</button>
                            </div>
                        </div>
                    </div>`;
                root.innerHTML = html;
                // Гарантируем отображение скрытого по умолчанию блока вопросов
                const tq = root.querySelector('.test-questions');
                if (tq) tq.style.display = 'block';
                console.log('test-run: отрисован вопрос', idx + 1, 'из', total);
                const area = root.querySelector('.answer-input');
                if (area) area.addEventListener('input', e => { answers[q.id] = e.target.value; });
                const prev = root.querySelector('#btnPrev');
                const next = root.querySelector('#btnNext');
                const fin = root.querySelector('#btnFinish');
                if (prev) prev.addEventListener('click', () => { if (idx>0){ idx--; render(); } });
                if (next) next.addEventListener('click', () => { if (idx<total-1){ idx++; render(); } });
                if (fin) fin.addEventListener('click', complete);
            }

            function complete() {
                // Отправляем ответы на ВСЕ задания, даже если пользователь не ответил
                const payload = questions.map(q => ({
                    taskId: q.id,
                    answer: answers[q.id] || ''
                }));
                fetch('/test/api/complete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId: sessionId, answers: payload })
                }).then(r => r.json()).then(res => {
                    if (res.error) throw new Error(res.error);
                    window.location.href = `/test/results/${sessionId}`;
                }).catch(err => {
                    root.innerHTML = `<div class="test-config"><h2 class="config-title">Ошибка</h2><p>${err.message}</p></div>`;
                });
            }

            render();
        })
        .catch(err => {
            root.innerHTML = `<div class="test-config"><h2 class="config-title">Ошибка</h2><p>${err.message}</p></div>`;
        });
});


