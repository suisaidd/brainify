// Subtopic Tasks Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const showAnswersBtn = document.getElementById('showAnswersBtn');
    const shuffleBtn = document.getElementById('shuffleBtn');
    const tasksGrid = document.getElementById('tasksGrid');
    const taskCards = document.querySelectorAll('.task-card');
    const controlBtns = document.querySelectorAll('.control-btn');
    
    let answersVisible = false;
    let currentFilter = 'all';
    
    // Инициализация
    initializeTaskCards();
    initializeControls();
    
    function initializeTaskCards() {
        taskCards.forEach((card, index) => {
            // Добавляем анимацию появления
            card.style.animationDelay = `${index * 0.1}s`;
            
            // Инициализируем обработчики для каждой карточки
            const showAnswerBtn = card.querySelector('.show-answer-btn');
            const showSolutionBtn = card.querySelector('.show-solution-btn');
            const answerDiv = card.querySelector('.task-answer');
            const solutionDiv = card.querySelector('.task-solution');
            
            if (showAnswerBtn) {
                showAnswerBtn.addEventListener('click', function() {
                    toggleAnswer(card);
                });
            }
            
            if (showSolutionBtn) {
                showSolutionBtn.addEventListener('click', function() {
                    toggleSolution(card);
                });
            }
            
            // Обработка изображений
            const taskImage = card.querySelector('.task-image-img');
            if (taskImage) {
                handleImageLoading(taskImage);
            }
        });
    }
    
    function initializeControls() {
        // Показать/скрыть все ответы
        if (showAnswersBtn) {
            showAnswersBtn.addEventListener('click', function() {
                answersVisible = !answersVisible;
                toggleAllAnswers();
                updateShowAnswersButton();
            });
        }
        
        // Перемешать задания
        if (shuffleBtn) {
            shuffleBtn.addEventListener('click', function() {
                shuffleTasks();
            });
        }
        
        // Фильтры
        controlBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const action = this.getAttribute('data-action');
                if (action) {
                    setActiveControl(this);
                    filterTasks(action);
                }
            });
        });
    }
    
    function toggleAnswer(card) {
        const answerDiv = card.querySelector('.task-answer');
        const solutionDiv = card.querySelector('.task-solution');
        const showAnswerBtn = card.querySelector('.show-answer-btn');
        const showSolutionBtn = card.querySelector('.show-solution-btn');
        
        if (answerDiv && showAnswerBtn) {
            const isVisible = answerDiv.style.display === 'block';
            
            if (isVisible) {
                answerDiv.style.display = 'none';
                if (solutionDiv) solutionDiv.style.display = 'none';
                showAnswerBtn.innerHTML = '<i class="fas fa-eye"></i> Показать ответ';
                showAnswerBtn.style.display = 'inline-flex';
                if (showSolutionBtn) {
                    showSolutionBtn.style.display = 'none';
                }
            } else {
                answerDiv.style.display = 'block';
                if (solutionDiv) solutionDiv.style.display = 'block';
                showAnswerBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Скрыть ответ';
                
                // Плавная анимация появления
                answerDiv.style.opacity = '0';
                answerDiv.style.transform = 'translateY(-10px)';
                setTimeout(() => {
                    answerDiv.style.transition = 'all 0.3s ease';
                    answerDiv.style.opacity = '1';
                    answerDiv.style.transform = 'translateY(0)';
                }, 10);
                
                if (solutionDiv) {
                    solutionDiv.style.opacity = '0';
                    solutionDiv.style.transform = 'translateY(-10px)';
                    setTimeout(() => {
                        solutionDiv.style.transition = 'all 0.3s ease';
                        solutionDiv.style.opacity = '1';
                        solutionDiv.style.transform = 'translateY(0)';
                    }, 10);
                }
            }
        }
    }
    
    function toggleSolution(card) {
        const solutionDiv = card.querySelector('.task-solution');
        const showSolutionBtn = card.querySelector('.show-solution-btn');
        
        if (solutionDiv && showSolutionBtn) {
            const isVisible = solutionDiv.style.display === 'block';
            
            if (isVisible) {
                solutionDiv.style.display = 'none';
                showSolutionBtn.innerHTML = '<i class="fas fa-lightbulb"></i> Показать решение';
            } else {
                solutionDiv.style.display = 'block';
                showSolutionBtn.innerHTML = '<i class="fas fa-lightbulb"></i> Скрыть решение';
                
                // Плавная анимация появления
                solutionDiv.style.opacity = '0';
                solutionDiv.style.transform = 'translateY(-10px)';
                setTimeout(() => {
                    solutionDiv.style.transition = 'all 0.3s ease';
                    solutionDiv.style.opacity = '1';
                    solutionDiv.style.transform = 'translateY(0)';
                }, 10);
            }
        }
    }
    
    function toggleAllAnswers() {
        taskCards.forEach(card => {
            const answerDiv = card.querySelector('.task-answer');
            const solutionDiv = card.querySelector('.task-solution');
            const showAnswerBtn = card.querySelector('.show-answer-btn');
            const showSolutionBtn = card.querySelector('.show-solution-btn');
            
            if (answersVisible) {
                if (answerDiv) {
                    answerDiv.style.display = 'block';
                    answerDiv.style.opacity = '1';
                    answerDiv.style.transform = 'translateY(0)';
                }
                if (solutionDiv) {
                    solutionDiv.style.display = 'block';
                    solutionDiv.style.opacity = '1';
                    solutionDiv.style.transform = 'translateY(0)';
                }
                if (showAnswerBtn) {
                    showAnswerBtn.style.display = 'none';
                    showAnswerBtn.innerHTML = '<i class="fas fa-eye-slash"></i> Скрыть ответ';
                }
                if (showSolutionBtn) {
                    showSolutionBtn.style.display = 'none';
                    showSolutionBtn.innerHTML = '<i class="fas fa-lightbulb"></i> Показать решение';
                }
            } else {
                if (answerDiv) answerDiv.style.display = 'none';
                if (solutionDiv) solutionDiv.style.display = 'none';
                if (showAnswerBtn) {
                    showAnswerBtn.style.display = 'inline-flex';
                    showAnswerBtn.innerHTML = '<i class="fas fa-eye"></i> Показать ответ';
                }
                if (showSolutionBtn) {
                    showSolutionBtn.style.display = 'none';
                    showSolutionBtn.innerHTML = '<i class="fas fa-lightbulb"></i> Показать решение';
                }
            }
        });
    }
    
    function updateShowAnswersButton() {
        if (showAnswersBtn) {
            showAnswersBtn.innerHTML = answersVisible ? 
                '<i class="fas fa-eye-slash"></i> Скрыть ответы' : 
                '<i class="fas fa-eye"></i> Показать ответы';
        }
    }
    
    function shuffleTasks() {
        const cards = Array.from(taskCards);
        cards.sort(() => Math.random() - 0.5);
        
        cards.forEach((card, index) => {
            card.style.order = index;
            const taskNumber = card.querySelector('.task-number');
            if (taskNumber) {
                taskNumber.textContent = index + 1;
            }
        });
        
        // Анимация перемешивания
        tasksGrid.style.transition = 'all 0.5s ease';
        setTimeout(() => {
            tasksGrid.style.transition = '';
        }, 500);
    }
    
    function setActiveControl(activeBtn) {
        controlBtns.forEach(btn => btn.classList.remove('active'));
        activeBtn.classList.add('active');
    }
    
    function filterTasks(filter) {
        currentFilter = filter;
        
        taskCards.forEach(card => {
            const answerDiv = card.querySelector('.task-answer');
            const isAnswered = answerDiv && answerDiv.style.display === 'block';
            
            let shouldShow = true;
            
            switch (filter) {
                case 'show-answered':
                    shouldShow = isAnswered;
                    break;
                case 'show-unanswered':
                    shouldShow = !isAnswered;
                    break;
                case 'show-all':
                default:
                    shouldShow = true;
                    break;
            }
            
            if (shouldShow) {
                card.style.display = 'block';
                card.style.animation = 'fadeInUp 0.5s ease forwards';
            } else {
                card.style.display = 'none';
            }
        });
    }
    
    function handleImageLoading(img) {
        // Добавляем индикатор загрузки
        const imageContainer = img.parentElement;
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'task-image-loading';
        loadingDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка изображения...';
        
        imageContainer.appendChild(loadingDiv);
        
        img.onload = function() {
            loadingDiv.remove();
            img.style.display = 'block';
            img.style.opacity = '0';
            img.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                img.style.opacity = '1';
            }, 10);
        };
        
        img.onerror = function() {
            loadingDiv.remove();
            const errorDiv = document.createElement('div');
            errorDiv.className = 'task-image-placeholder';
            errorDiv.innerHTML = '<i class="fas fa-image"></i><br>Изображение недоступно';
            imageContainer.appendChild(errorDiv);
            img.style.display = 'none';
        };
        
        // Если изображение уже загружено
        if (img.complete && img.naturalHeight !== 0) {
            img.onload();
        }
    }
    
    // Анимация появления карточек при загрузке
    function animateCardsOnLoad() {
        taskCards.forEach((card, index) => {
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }
    
    // Инициализация анимации
    setTimeout(animateCardsOnLoad, 100);
    
    // Обработка ошибок изображений
    document.addEventListener('error', function(e) {
        if (e.target.tagName === 'IMG' && e.target.classList.contains('task-image-img')) {
            const img = e.target;
            const container = img.parentElement;
            
            if (container && !container.querySelector('.task-image-placeholder')) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'task-image-placeholder';
                errorDiv.innerHTML = '<i class="fas fa-image"></i><br>Изображение недоступно';
                container.appendChild(errorDiv);
                img.style.display = 'none';
            }
        }
    }, true);
    
    // Добавляем плавную прокрутку к заданиям
    const taskLinks = document.querySelectorAll('a[href^="#task-"]');
    taskLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Убираем анимацию ввода текста - текст отображается сразу
});
