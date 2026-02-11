/**
 * test-review.js — Просмотр результатов теста (ученик и учитель)
 */
(function () {
    'use strict';

    const page = document.querySelector('.tr-page');
    if (!page) return;

    const attemptId = page.dataset.attemptId;
    const canGrade = page.dataset.canGrade === 'true';

    let reviewData = null;
    let grades = {}; // questionId -> "correct"|"incorrect"

    const $ = (sel) => document.querySelector(sel);

    document.addEventListener('DOMContentLoaded', loadReview);

    async function loadReview() {
        try {
            const res = await fetch(`/test-builder/api/review/${attemptId}`);
            const data = await res.json();
            if (data.error) { toast(data.error, 'error'); return; }
            reviewData = data;
            render();
        } catch (e) {
            toast('Ошибка загрузки', 'error');
        }
    }

    function render() {
        const main = $('#reviewContent');
        const d = reviewData;

        // Score class
        const pct = d.scorePercentage || 0;
        const scoreClass = pct >= 70 ? 'good' : pct >= 40 ? 'medium' : 'bad';

        let gradeBtn = '';
        if (canGrade && d.items.some(i => i.isExtendedAnswer)) {
            if (d.isReviewed) {
                gradeBtn = `<div class="tr-grade-actions"><button class="tr-grade-btn saved" disabled><i class="fas fa-check"></i> Проверено</button></div>`;
            } else {
                gradeBtn = `<div class="tr-grade-actions"><button class="tr-grade-btn save" id="btnSaveGrades"><i class="fas fa-save"></i> Сохранить оценки</button></div>`;
            }
        }

        let html = `
            <div class="tr-summary">
                <div class="tr-score-circle ${scoreClass}">${Math.round(pct)}%</div>
                <div class="tr-summary-info">
                    <h2>${esc(d.templateTitle)}</h2>
                    <p>${esc(d.subjectName)} · ${esc(d.studentName)}</p>
                    <div class="tr-summary-stats">
                        <div class="tr-stat">Верно: <strong>${d.correctAnswers}</strong> из <strong>${d.totalQuestions}</strong></div>
                        <div class="tr-stat">Дата: <strong>${formatDate(d.submittedAt)}</strong></div>
                    </div>
                </div>
                ${gradeBtn}
            </div>
        `;

        for (const item of d.items) {
            const isCorrectBool = item.teacherGrade
                ? item.teacherGrade === 'correct'
                : !!item.isCorrect;
            const needsGrade = item.isExtendedAnswer && canGrade && !d.isReviewed;
            const statusClass = needsGrade ? 'pending-grade'
                : (isCorrectBool ? 'correct' : 'incorrect');

            const statusLabel = needsGrade ? '<span class="tr-q-status pending">Ожидает оценки</span>'
                : isCorrectBool
                    ? '<span class="tr-q-status correct"><i class="fas fa-check-circle"></i> Верно</span>'
                    : '<span class="tr-q-status incorrect"><i class="fas fa-times-circle"></i> Неверно</span>';

            let imageHtml = '';
            if (item.imageUrl) {
                imageHtml = `
                    <div class="tr-q-image-wrap">
                        <img src="${item.imageUrl}" class="tr-q-image" alt="" onclick="openReviewLightbox(this.src)">
                        <div class="tr-q-image-btns">
                            <button type="button" onclick="openReviewLightbox('${item.imageUrl}')" title="Увеличить"><i class="fas fa-search-plus"></i></button>
                            <a href="${item.imageUrl}" download title="Скачать"><i class="fas fa-download"></i></a>
                        </div>
                    </div>`;
            }

            let answersHtml = '';
            if (item.isExtendedAnswer) {
                if (item.drawingData) {
                    answersHtml += `
                        <div class="tr-answer-row user">
                            <span class="tr-answer-label">Ответ ученика:</span>
                            <img src="${item.drawingData}" class="tr-drawing-thumb" data-drawing="${item.drawingData}" alt="Рисунок">
                        </div>`;
                } else if (item.userAnswer) {
                    answersHtml += `<div class="tr-answer-row user"><span class="tr-answer-label">Ответ ученика:</span><span class="tr-answer-value">${esc(item.userAnswer)}</span></div>`;
                } else {
                    answersHtml += `<div class="tr-answer-row user"><span class="tr-answer-label">Ответ ученика:</span><span class="tr-answer-value" style="color:#999">Не отвечено</span></div>`;
                }

                if (needsGrade) {
                    answersHtml += `
                        <div class="tr-grade-controls" data-qid="${item.questionId}">
                            <button class="grade-correct" data-grade="correct"><i class="fas fa-check"></i> Верно</button>
                            <button class="grade-incorrect" data-grade="incorrect"><i class="fas fa-times"></i> Неверно</button>
                        </div>`;
                }
            } else {
                answersHtml += `<div class="tr-answer-row user"><span class="tr-answer-label">Ответ ученика:</span><span class="tr-answer-value">${esc(item.userAnswer || 'Не отвечено')}</span></div>`;
                answersHtml += `<div class="tr-answer-row correct-answer"><span class="tr-answer-label">Правильный ответ:</span><span class="tr-answer-value">${esc(item.correctAnswer)}</span></div>`;
            }

            html += `
                <div class="tr-question ${statusClass}">
                    <div class="tr-q-header">
                        <div class="tr-q-num">${esc(item.questionNumber)}</div>
                        <div class="tr-q-title">Задание ${esc(item.questionNumber)}</div>
                        ${statusLabel}
                    </div>
                    <div class="tr-q-text">${esc(item.questionText)}</div>
                    ${imageHtml}
                    <div class="tr-answers">${answersHtml}</div>
                </div>
            `;
        }

        main.innerHTML = html;

        // Drawing click
        main.querySelectorAll('.tr-drawing-thumb').forEach(img => {
            img.addEventListener('click', () => {
                $('#drawingImage').src = img.dataset.drawing;
                $('#drawingOverlay').classList.add('open');
            });
        });

        // Grade buttons
        main.querySelectorAll('.tr-grade-controls button').forEach(btn => {
            btn.addEventListener('click', () => {
                const container = btn.closest('.tr-grade-controls');
                const qid = container.dataset.qid;
                const grade = btn.dataset.grade;
                grades[qid] = grade;
                container.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });

        // Save grades
        const saveBtn = $('#btnSaveGrades');
        if (saveBtn) {
            saveBtn.addEventListener('click', saveGrades);
        }

        // Drawing overlay close
        const drawingClose = $('#drawingClose');
        if (drawingClose) drawingClose.addEventListener('click', () => $('#drawingOverlay').classList.remove('open'));
        const drawingOverlay = $('#drawingOverlay');
        if (drawingOverlay) drawingOverlay.addEventListener('click', (e) => {
            if (e.target === drawingOverlay) drawingOverlay.classList.remove('open');
        });
    }

    async function saveGrades() {
        const gradesList = Object.entries(grades).map(([qid, grade]) => ({
            questionId: parseInt(qid, 10),
            grade: grade
        }));

        if (gradesList.length === 0) {
            toast('Оцените хотя бы один ответ', 'error');
            return;
        }

        try {
            const res = await fetch(`/test-builder/api/review/${attemptId}/grade`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ grades: gradesList })
            });
            const data = await res.json();
            if (data.error) { toast(data.error, 'error'); return; }

            toast('Оценки сохранены', 'success');
            // Reload
            setTimeout(() => loadReview(), 1000);
        } catch (e) {
            toast('Ошибка сохранения', 'error');
        }
    }

    function esc(str) {
        if (!str) return '';
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    function formatDate(dt) {
        if (!dt) return '—';
        try {
            const d = new Date(dt);
            return d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        } catch (e) { return dt; }
    }

    function toast(msg, type) {
        const t = $('#toast');
        t.textContent = msg;
        t.className = 'tb-toast show ' + (type || 'success');
        clearTimeout(t._timer);
        t._timer = setTimeout(() => t.classList.remove('show'), 3000);
    }
})();

// Lightbox for review images (global)
function openReviewLightbox(src) {
    let lb = document.getElementById('reviewLightbox');
    if (!lb) {
        lb = document.createElement('div');
        lb.id = 'reviewLightbox';
        lb.className = 'image-lightbox';
        lb.innerHTML = `
            <div class="image-lightbox-overlay"></div>
            <div class="image-lightbox-content">
                <img src="" alt="" id="reviewLbImg">
                <div class="image-lightbox-toolbar">
                    <a id="reviewLbDownload" href="" download class="lb-btn"><i class="fas fa-download"></i> Скачать</a>
                    <button class="lb-btn lb-close" onclick="closeReviewLightbox()"><i class="fas fa-times"></i> Закрыть</button>
                </div>
            </div>
        `;
        document.body.appendChild(lb);
        lb.querySelector('.image-lightbox-overlay').addEventListener('click', closeReviewLightbox);
    }
    document.getElementById('reviewLbImg').src = src;
    document.getElementById('reviewLbDownload').href = src;
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeReviewLightbox() {
    const lb = document.getElementById('reviewLightbox');
    if (lb) { lb.classList.remove('open'); document.body.style.overflow = ''; }
}
