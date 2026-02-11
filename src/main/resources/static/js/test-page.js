// Test Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const testContent = document.getElementById('testContent');
    const testType = window.testType || 'random';
    
    let currentTestSession = null;
    let currentQuestions = [];
    let currentQuestionIndex = 0;
    let userAnswers = {};
    
    // Инициализация
    testApiConnection();
    initializeTestPage();
    
    function testApiConnection() {
        console.log('Тестируем подключение к API...');
        fetch('/test/api/test')
            .then(response => response.json())
            .then(data => {
                console.log('API работает:', data);
            })
            .catch(error => {
                console.error('Ошибка подключения к API:', error);
            });
    }
    
    function initializeTestPage() {
        showTestConfiguration();
    }
    
    function showTestConfiguration() {
        console.log('Показываем конфигурацию теста');
        const configHTML = `
            <div class="test-config">
                <h2 class="config-title">Настройка теста</h2>
                <form class="config-form" id="testConfigForm">
                    <div class="form-group">
                        <label for="examType">Тип экзамена:</label>
                        <select id="examType" name="examType" class="form-control" required>
                            <option value="">Выберите тип экзамена</option>
                            <option value="oge">ОГЭ</option>
                            <option value="ege">ЕГЭ</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="subject">Предмет:</label>
                        <select id="subject" name="subject" class="form-control" required disabled>
                            <option value="">Сначала выберите тип экзамена</option>
                        </select>
                    </div>
                    
                    ${getTestTypeSpecificFields()}
                    
                    <button type="submit" class="btn-primary" id="startTestBtn" disabled>
                        <i class="fas fa-play"></i>
                        Начать тест
                    </button>
                </form>
            </div>
        `;
        
        testContent.innerHTML = configHTML;
        console.log('HTML добавлен, инициализируем форму');
        initializeConfigForm();
    }
    
    function getTestTypeSpecificFields() {
        switch (testType) {
            case 'random':
                return ''; // Случайный тест не требует дополнительных полей
                
            case 'specific':
                return `
                    <div class="form-group">
                        <label for="taskNumber">Номер задания:</label>
                        <select id="taskNumber" name="taskNumber" class="form-control" required disabled>
                            <option value="">Сначала выберите предмет</option>
                        </select>
                    </div>
                `;
                
            case 'marathon':
                return `
                    <div class="form-group marathon-config">
                        <label>Диапазон номеров заданий:</label>
                        <div class="range-row">
                            <input type="number" id="rangeStart" class="form-control" placeholder="От" min="1">
                            <span class="range-sep">—</span>
                            <input type="number" id="rangeEnd" class="form-control" placeholder="До" min="1">
                        </div>
                        <div class="hint">Можно не указывать диапазон и выбрать номера вручную ниже</div>
                        <div class="task-number-selection" id="taskNumberSelection">
                            <!-- Номера будут загружены динамически -->
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>Количество вопросов:</label>
                        <div class="question-count-selection">
                            <div class="question-count-item" data-count="50">50</div>
                            <div class="question-count-item" data-count="100">100</div>
                            <div class="question-count-item" data-count="150">150</div>
                            <div class="question-count-item" data-count="200">200</div>
                        </div>
                    </div>
                `;
                
            default:
                return '';
        }
    }
    
    function initializeConfigForm() {
        const examTypeSelect = document.getElementById('examType');
        const subjectSelect = document.getElementById('subject');
        const taskNumberSelect = document.getElementById('taskNumber');
        const startTestBtn = document.getElementById('startTestBtn');
        
        console.log('Инициализация формы конфигурации');
        console.log('examTypeSelect:', examTypeSelect);
        console.log('subjectSelect:', subjectSelect);
        
        if (!examTypeSelect || !subjectSelect) {
            console.error('Не найдены необходимые элементы формы');
            return;
        }
        
        // Обработчик изменения типа экзамена
        examTypeSelect.addEventListener('change', function() {
            console.log('Изменен тип экзамена:', this.value);
            if (this.value) {
                loadSubjects(this.value);
                subjectSelect.disabled = false;
            } else {
                subjectSelect.disabled = true;
                subjectSelect.innerHTML = '<option value="">Сначала выберите тип экзамена</option>';
                updateStartButton();
            }
        });
        
        // Обработчик изменения предмета
        subjectSelect.addEventListener('change', function() {
            if (this.value && testType === 'specific') {
                loadTaskNumbers(this.value, examTypeSelect.value);
                taskNumberSelect.disabled = false;
            } else if (this.value && testType === 'marathon') {
                loadTaskNumbersForMarathon(this.value, examTypeSelect.value);
            }
            updateStartButton();
        });
        
        // Обработчик изменения номера задания (для specific теста)
        if (taskNumberSelect) {
            taskNumberSelect.addEventListener('change', updateStartButton);
        }
        
        // Обработчики для марафона
        if (testType === 'marathon') {
            initializeMarathonSelection();
        }
        
        // Обработчик отправки формы
        document.getElementById('testConfigForm').addEventListener('submit', function(e) {
            e.preventDefault();
            startTest();
        });
    }
    
    function loadSubjects(examType) {
        console.log('Загружаем предметы для типа экзамена:', examType);
        const subjectSelect = document.getElementById('subject');
        
        if (!subjectSelect) {
            console.error('Элемент subjectSelect не найден');
            return;
        }
        
        subjectSelect.innerHTML = '<option value="">Загрузка...</option>';
        
        fetch(`/test/api/subjects?examType=${examType}`)
            .then(response => {
                console.log('Ответ сервера:', response.status);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(subjects => {
                console.log('Получены предметы:', subjects);
                subjectSelect.innerHTML = '<option value="">Выберите предмет</option>';
                if (subjects && subjects.length > 0) {
                    subjects.forEach(subject => {
                        const option = document.createElement('option');
                        option.value = subject.id;
                        option.textContent = subject.name;
                        subjectSelect.appendChild(option);
                    });
                } else {
                    subjectSelect.innerHTML = '<option value="">Предметы не найдены</option>';
                }
            })
            .catch(error => {
                console.error('Ошибка при загрузке предметов:', error);
                subjectSelect.innerHTML = '<option value="">Ошибка загрузки</option>';
            });
    }
    
    function loadTaskNumbers(subjectId, examType) {
        const taskNumberSelect = document.getElementById('taskNumber');
        taskNumberSelect.innerHTML = '<option value="">Загрузка...</option>';
        
        fetch(`/test/api/task-numbers?subjectId=${subjectId}&examType=${examType}`)
            .then(response => response.json())
            .then(taskNumbers => {
                taskNumberSelect.innerHTML = '<option value="">Выберите номер задания</option>';
                taskNumbers.forEach(taskNumber => {
                    const option = document.createElement('option');
                    option.value = taskNumber.id;
                    option.textContent = taskNumber.number;
                    taskNumberSelect.appendChild(option);
                });
            })
            .catch(error => {
                console.error('Ошибка при загрузке номеров заданий:', error);
                taskNumberSelect.innerHTML = '<option value="">Ошибка загрузки</option>';
            });
    }
    
    function loadTaskNumbersForMarathon(subjectId, examType) {
        const taskNumberSelection = document.getElementById('taskNumberSelection');
        taskNumberSelection.innerHTML = '<div class="loading-spinner"></div>';
        
        fetch(`/test/api/task-numbers?subjectId=${subjectId}&examType=${examType}`)
            .then(response => response.json())
            .then(taskNumbers => {
                taskNumberSelection.innerHTML = '';
                taskNumbers.forEach(taskNumber => {
                    const item = document.createElement('div');
                    item.className = 'task-number-item';
                    item.dataset.taskNumberId = taskNumber.id;
                    item.textContent = taskNumber.number;
                    item.addEventListener('click', function() {
                        this.classList.toggle('selected');
                        updateStartButton();
                    });
                    taskNumberSelection.appendChild(item);
                });
            })
            .catch(error => {
                console.error('Ошибка при загрузке номеров заданий:', error);
                taskNumberSelection.innerHTML = '<div>Ошибка загрузки</div>';
            });
    }
    
    function initializeMarathonSelection() {
        const questionCountItems = document.querySelectorAll('.question-count-item');
        questionCountItems.forEach(item => {
            item.addEventListener('click', function() {
                questionCountItems.forEach(i => i.classList.remove('selected'));
                this.classList.add('selected');
                updateStartButton();
            });
        });

        const rangeStart = document.getElementById('rangeStart');
        const rangeEnd = document.getElementById('rangeEnd');
        if (rangeStart && rangeEnd) {
            rangeStart.addEventListener('input', () => {
                const val = parseInt(rangeStart.value || '');
                if (!isNaN(val) && val < 1) rangeStart.value = 1;
                updateStartButton();
            });
            rangeEnd.addEventListener('input', () => {
                const val = parseInt(rangeEnd.value || '');
                if (!isNaN(val) && val < 1) rangeEnd.value = 1;
                updateStartButton();
            });
        }
    }
    
    function updateStartButton() {
        const startTestBtn = document.getElementById('startTestBtn');
        let canStart = false;
        
        const examType = document.getElementById('examType').value;
        const subject = document.getElementById('subject').value;
        
        if (examType && subject) {
            switch (testType) {
                case 'random':
                    canStart = true;
                    break;
                case 'specific':
                    const taskNumber = document.getElementById('taskNumber').value;
                    canStart = !!taskNumber;
                    break;
                case 'marathon':
                    const selectedTaskNumbers = document.querySelectorAll('.task-number-item.selected');
                    const selectedQuestionCount = document.querySelector('.question-count-item.selected');
                    const rangeStartVal = document.getElementById('rangeStart')?.value;
                    const rangeEndVal = document.getElementById('rangeEnd')?.value;
                    const hasRange = rangeStartVal && rangeEndVal;
                    canStart = (hasRange || selectedTaskNumbers.length > 0) && selectedQuestionCount;
                    break;
            }
        }
        
        startTestBtn.disabled = !canStart;
    }
    
    function startTest() {
        const formData = {
            testType: testType,
            examType: document.getElementById('examType').value,
            subjectId: document.getElementById('subject').value
        };
        
        if (testType === 'specific') {
            formData.taskNumberId = document.getElementById('taskNumber').value;
        } else if (testType === 'marathon') {
            const selectedTaskNumbers = Array.from(document.querySelectorAll('.task-number-item.selected'))
                .map(item => parseInt(item.dataset.taskNumberId));
            const selectedQuestionCount = document.querySelector('.question-count-item.selected').dataset.count;

            const rangeStartEl = document.getElementById('rangeStart');
            const rangeEndEl = document.getElementById('rangeEnd');
            const rangeStartVal = rangeStartEl && rangeStartEl.value ? parseInt(rangeStartEl.value) : null;
            const rangeEndVal = rangeEndEl && rangeEndEl.value ? parseInt(rangeEndEl.value) : null;

            if (rangeStartVal && rangeEndVal) {
                formData.rangeStart = rangeStartVal;
                formData.rangeEnd = rangeEndVal;
            } else {
                formData.taskNumberIds = selectedTaskNumbers;
            }
            formData.questionCount = parseInt(selectedQuestionCount);
        }
        
        // Показываем загрузку
        testContent.innerHTML = '<div class="loading"><div class="loading-spinner"></div></div>';
        
        fetch('/test/api/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(async response => {
            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || `HTTP ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            
            console.log('Получены задания:', data);
            currentTestSession = data.sessionId;
            currentQuestions = Array.isArray(data.tasks) ? data.tasks : [];
            if (currentQuestions.length === 0) {
                throw new Error('Сервер вернул пустой список заданий');
            }
            currentQuestionIndex = 0;
            userAnswers = {};
            
            // На странице конфигурации больше не рендерим вопросы — редиректим на отдельную страницу запуска
            // Фолбэк: если по какой-то причине карточка не отрисовалась, покажем простой вид
            if (testType === 'specific') {
                window.location.href = `/test/specific/${currentTestSession}`;
            } else if (testType === 'marathon') {
                window.location.href = `/test/marathon/${currentTestSession}`;
            } else {
                window.location.href = `/test/specific/${currentTestSession}`;
            }
        })
        .catch(error => {
            console.error('Ошибка при запуске теста:', error);
            testContent.innerHTML = `
                <div class="test-config">
                    <h2 class="config-title">Ошибка</h2>
                    <p>Не удалось запустить тест: ${error.message}</p>
                    <p>Проверьте, что для выбранных параметров есть активные задания.</p>
                    <button class="btn-primary" onclick="location.reload()">
                        <i class="fas fa-refresh"></i>
                        Попробовать снова
                    </button>
                </div>
            `;
        });
    }
    
    function showQuestion() {
        try {
            if (currentQuestionIndex >= currentQuestions.length) {
                completeTest();
                return;
            }

            const question = currentQuestions[currentQuestionIndex];
            if (!question) {
                throw new Error('Пустой объект вопроса');
            }
            const questionNumber = currentQuestionIndex + 1;
            const totalQuestions = currentQuestions.length;

            const imageHTML = question.hasImage
                ? '<div class="question-image">\n' +
                  `  <img src="/api/tasks/${question.id}/image" alt="Изображение к заданию" class="question-image-img" onload="this.style.display='block'" onerror="this.style.display='none'">` +
                  '\n</div>'
                : '';

            const questionHTML = `
                <div class="test-questions">
                    <div class="question-card">
                        <div class="question-header">
                            <div class="question-number">${questionNumber}</div>
                            <div class="question-difficulty difficulty-${question.difficultyLevel}">
                                <i class="fas fa-star"></i>
                                <span>Сложность ${question.difficultyLevel}</span>
                            </div>
                        </div>
                        
                        <div class="question-text">${question.question || ''}</div>
                        ${imageHTML}
                        <div class="form-group">
                            <label for="answer-${question.id}">Ваш ответ:</label>
                            <textarea id="answer-${question.id}" 
                                      class="answer-input" 
                                      placeholder="Введите ваш ответ..."
                                      data-task-id="${question.id}">${userAnswers[question.id] || ''}</textarea>
                        </div>
                    </div>
                </div>
                
                <div class="test-controls">
                    <div class="controls-content">
                        <div class="test-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${(questionNumber / totalQuestions) * 100}%"></div>
                            </div>
                            <div class="progress-text">${questionNumber} из ${totalQuestions}</div>
                        </div>
                        
                        <div class="test-actions">
                            <button class="btn-secondary" onclick="previousQuestion()" ${currentQuestionIndex === 0 ? 'disabled' : ''}>
                                <i class="fas fa-arrow-left"></i>
                                Назад
                            </button>
                            <button class="btn-secondary" onclick="nextQuestion()" ${currentQuestionIndex === currentQuestions.length - 1 ? 'disabled' : ''}>
                                Вперед
                                <i class="fas fa-arrow-right"></i>
                            </button>
                            <button class="btn-success" onclick="completeTest()">
                                <i class="fas fa-check"></i>
                                Завершить тест
                            </button>
                        </div>
                    </div>
                </div>
            `;

            testContent.innerHTML = questionHTML;
            console.log('Отрисована карточка вопроса #', questionNumber);

            const answerInput = document.getElementById(`answer-${question.id}`);
            if (answerInput) {
                answerInput.addEventListener('input', function() {
                    userAnswers[question.id] = this.value;
                });
            }
        } catch (err) {
            console.error('Ошибка отрисовки вопроса:', err);
            testContent.innerHTML = `
                <div class="test-config">
                    <h2 class="config-title">Ошибка отображения</h2>
                    <pre style="white-space:pre-wrap">${(err && err.message) ? err.message : err}</pre>
                    <pre style="white-space:pre-wrap">${JSON.stringify(currentQuestions[currentQuestionIndex] || {}, null, 2)}</pre>
                </div>
            `;
        }
    }
    
    function nextQuestion() {
        if (currentQuestionIndex < currentQuestions.length - 1) {
            currentQuestionIndex++;
            showQuestion();
        }
    }
    
    function previousQuestion() {
        if (currentQuestionIndex > 0) {
            currentQuestionIndex--;
            showQuestion();
        }
    }
    
    function completeTest() {
        // Отправляем ответы на ВСЕ задания, даже если пользователь не ответил
        const answers = currentQuestions.map(q => ({
            taskId: q.id,
            answer: userAnswers[q.id] || ''
        }));
        
        fetch('/test/api/complete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId: currentTestSession,
                answers: answers
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Переходим на страницу результатов
            window.location.href = `/test/results/${currentTestSession}`;
        })
        .catch(error => {
            console.error('Ошибка при завершении теста:', error);
            alert('Ошибка при завершении теста: ' + error.message);
        });
    }
    
    // Глобальные функции для кнопок
    window.nextQuestion = nextQuestion;
    window.previousQuestion = previousQuestion;
    window.completeTest = completeTest;
    window.forceRenderQuestion = () => showQuestion();
    window.debugStartTest = () => startTest();
});
