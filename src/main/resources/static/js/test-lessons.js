// Тестовый скрипт для проверки работы системы уроков

// Функция для тестирования создания уроков
async function testCreateLessons() {
    console.log('Начинаем тестирование создания уроков...');
    
    // Тестовые данные
    const testData = {
        studentId: 1, // ID студента
        teacherId: 1, // ID преподавателя
        subjectId: 1, // ID предмета
        selectedSlots: ['MONDAY_14:00_2025-01-13', 'WEDNESDAY_16:00_2025-01-15'], // Тестовые слоты
        repeatWeekly: false,
        recurrenceWeeks: 1
    };
    
    try {
        const response = await fetch('/admin/lessons/api/create-lessons', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });
        
        const result = await response.json();
        console.log('Результат создания уроков:', result);
        
        if (result.status === 'success') {
            console.log('✅ Уроки успешно созданы!');
            return true;
        } else {
            console.error('❌ Ошибка создания уроков:', result.message);
            return false;
        }
    } catch (error) {
        console.error('❌ Ошибка запроса:', error);
        return false;
    }
}

// Функция для тестирования получения уроков студента
async function testGetStudentLessons(studentId = 1) {
    console.log(`Тестируем получение уроков студента ${studentId}...`);
    
    try {
        const response = await fetch(`/api/student/${studentId}/lessons`);
        const lessons = await response.json();
        
        console.log('Полученные уроки:', lessons);
        
        if (Array.isArray(lessons)) {
            console.log(`✅ Успешно получено ${lessons.length} уроков`);
            return lessons;
        } else {
            console.error('❌ Ошибка получения уроков');
            return [];
        }
    } catch (error) {
        console.error('❌ Ошибка запроса:', error);
        return [];
    }
}

// Функция для тестирования получения расписания преподавателя
async function testGetTeacherSchedule(teacherId = 1) {
    console.log(`Тестируем получение расписания преподавателя ${teacherId}...`);
    
    try {
        const response = await fetch(`/admin/lessons/api/teacher/${teacherId}/schedule`);
        const schedule = await response.json();
        
        console.log('Расписание преподавателя:', schedule);
        
        if (schedule && schedule.schedules) {
            console.log(`✅ Успешно получено расписание с ${schedule.schedules.length} слотами`);
            return schedule;
        } else {
            console.error('❌ Ошибка получения расписания');
            return null;
        }
    } catch (error) {
        console.error('❌ Ошибка запроса:', error);
        return null;
    }
}

// Функция для полного тестирования системы
async function runFullTest() {
    console.log('🚀 Запускаем полное тестирование системы уроков...');
    
    // 1. Тестируем получение расписания преподавателя
    console.log('\n📅 Тест 1: Получение расписания преподавателя');
    const schedule = await testGetTeacherSchedule(1);
    
    // 2. Тестируем создание уроков
    console.log('\n📝 Тест 2: Создание уроков');
    const lessonsCreated = await testCreateLessons();
    
    // 3. Тестируем получение уроков студента
    console.log('\n👨‍🎓 Тест 3: Получение уроков студента');
    const studentLessons = await testGetStudentLessons(1);
    
    // 4. Проверяем результаты
    console.log('\n📊 Результаты тестирования:');
    console.log(`- Расписание преподавателя: ${schedule ? '✅' : '❌'}`);
    console.log(`- Создание уроков: ${lessonsCreated ? '✅' : '❌'}`);
    console.log(`- Получение уроков студента: ${studentLessons.length > 0 ? '✅' : '❌'}`);
    
    if (schedule && lessonsCreated && studentLessons.length > 0) {
        console.log('\n🎉 Все тесты пройдены успешно!');
    } else {
        console.log('\n⚠️ Некоторые тесты не прошли. Проверьте логи выше.');
    }
}

// Функция для отладки отображения занятых слотов
function debugOccupiedSlots(teacherId = 1) {
    console.log('🔍 Отладка занятых слотов...');
    
    // Получаем текущую неделю используя функцию из admin-lessons.js
    const currentWeek = window.currentWeek || new Date();
    const weekStart = window.getStartOfWeek ? window.getStartOfWeek(currentWeek) : getStartOfWeekLocal(currentWeek);
    console.log('Неделя начинается с:', weekStart.toISOString());
    
    // Загружаем уроки преподавателя
    fetch(`/admin/lessons/api/teacher/${teacherId}/lessons?weekStart=${weekStart.toISOString()}`)
        .then(response => response.json())
        .then(lessons => {
            console.log('📚 Уроки преподавателя:', lessons);
            
            // Загружаем расписание преподавателя
            return fetch(`/admin/lessons/api/teacher/${teacherId}/schedule`);
        })
        .then(response => response.json())
        .then(schedule => {
            console.log('📅 Расписание преподавателя:', schedule);
            
            // Анализируем каждый слот
            schedule.schedules.forEach(slot => {
                const lessons = window.teacherLessons || [];
                const lesson = lessons.find(lesson => {
                    const lessonDate = new Date(lesson.lessonDate);
                    const lessonDay = getDayOfWeekLocal(lessonDate);
                    const lessonHour = lessonDate.getHours().toString().padStart(2, '0') + ':00';
                    return lessonDay === slot.dayOfWeek && lessonHour === slot.startTime;
                });
                
                if (lesson) {
                    console.log(`🔴 Слот ${slot.dayOfWeek} ${slot.startTime} ЗАНЯТ:`, {
                        studentName: lesson.studentName,
                        subjectName: lesson.subjectName,
                        lessonDate: lesson.lessonDate
                    });
                } else {
                    console.log(`🟢 Слот ${slot.dayOfWeek} ${slot.startTime} свободен`);
                }
            });
        })
        .catch(error => {
            console.error('❌ Ошибка отладки:', error);
        });
}

// Локальная функция для получения начала недели (если нет глобальной)
function getStartOfWeekLocal(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Понедельник
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Локальная функция для получения дня недели (если нет глобальной)
function getDayOfWeekLocal(date) {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return days[date.getDay()];
}

// Функция для проверки отображения в интерфейсе
function checkInterfaceDisplay() {
    console.log('🖥️ Проверка отображения в интерфейсе...');
    
    const slots = document.querySelectorAll('.time-slot');
    console.log(`Найдено ${slots.length} слотов в интерфейсе`);
    
    slots.forEach(slot => {
        const day = slot.dataset.day;
        const hour = slot.dataset.hour;
        const classes = slot.className;
        
        if (classes.includes('occupied') || classes.includes('occupied-by-current') || classes.includes('occupied-by-other')) {
            console.log(`🔴 Слот ${day} ${hour} отображается как занятый:`, classes);
        } else if (classes.includes('existing')) {
            console.log(`🟡 Слот ${day} ${hour} отображается как существующий:`, classes);
        } else if (classes.includes('available')) {
            console.log(`🟢 Слот ${day} ${hour} отображается как доступный:`, classes);
        }
    });
}

// Функция для принудительного обновления отображения
function forceUpdateDisplay() {
    console.log('🔄 Принудительное обновление отображения...');
    
    const activeModal = document.querySelector('.modal.show');
    if (activeModal) {
        const teacherId = activeModal.dataset.teacherId;
        if (teacherId) {
            forceRefreshSchedule(teacherId);
        } else {
            console.error('❌ Не найден ID преподавателя в модальном окне');
        }
    } else {
        console.error('❌ Не найдено активное модальное окно');
    }
}

// Улучшенная функция для полной диагностики системы
async function fullDiagnostic(teacherId = 1) {
    console.log('🔍 === ПОЛНАЯ ДИАГНОСТИКА СИСТЕМЫ УРОКОВ ===');
    
    try {
        // 1. Проверяем текущую неделю
        const currentWeek = window.currentWeek || new Date();
        const weekStart = window.getStartOfWeek ? window.getStartOfWeek(currentWeek) : getStartOfWeekLocal(currentWeek);
        console.log('📅 Текущая неделя начинается с:', weekStart.toISOString());
        
        // 2. Загружаем уроки из API
        console.log('\n📚 === ЗАГРУЗКА УРОКОВ ИЗ API ===');
        const lessonsResponse = await fetch(`/admin/lessons/api/teacher/${teacherId}/lessons?weekStart=${weekStart.toISOString()}`);
        const lessons = await lessonsResponse.json();
        console.log('Ответ API (lessons):', lessons);
        console.log('Количество уроков:', lessons.length);
        
        lessons.forEach((lesson, index) => {
            const lessonDate = new Date(lesson.lessonDate);
            
            // Проверяем валидность даты
            if (isNaN(lessonDate.getTime())) {
                console.log(`⚠️ Урок ${index + 1} имеет невалидную дату:`, lesson.lessonDate);
                return;
            }
            
            console.log(`Урок ${index + 1}:`, {
                id: lesson.id,
                studentName: lesson.studentName,
                subjectName: lesson.subjectName,
                lessonDate: lesson.lessonDate,
                parsedDate: lessonDate.toISOString(),
                dayOfWeek: lessonDate.toLocaleDateString('ru-RU', { weekday: 'long' }),
                time: lessonDate.toTimeString().substring(0, 5)
            });
        });
        
        // 3. Загружаем расписание преподавателя
        console.log('\n📅 === ЗАГРУЗКА РАСПИСАНИЯ ПРЕПОДАВАТЕЛЯ ===');
        const scheduleResponse = await fetch(`/admin/lessons/api/teacher/${teacherId}/schedule`);
        const scheduleData = await scheduleResponse.json();
        console.log('Ответ API (schedule):', scheduleData);
        
        const schedules = scheduleData.schedules || [];
        console.log('Количество слотов расписания:', schedules.length);
        
        schedules.forEach((schedule, index) => {
            console.log(`Слот ${index + 1}:`, {
                id: schedule.id,
                dayOfWeek: schedule.dayOfWeek,
                startTime: schedule.startTime,
                isAvailable: schedule.isAvailable,
                hasLesson: schedule.hasLesson || false
            });
        });
        
        // 4. Анализируем соответствие уроков и расписания
        console.log('\n🔍 === АНАЛИЗ СООТВЕТСТВИЯ УРОКОВ И РАСПИСАНИЯ ===');
        
        lessons.forEach(lesson => {
            const lessonDate = new Date(lesson.lessonDate);
            
            // Проверяем валидность даты
            if (isNaN(lessonDate.getTime())) {
                console.log(`⚠️ Урок ${lesson.id} имеет невалидную дату:`, lesson.lessonDate);
                return;
            }
            
            const lessonDayOfWeek = window.getDayOfWeek ? window.getDayOfWeek(lessonDate) : getDayOfWeekLocal(lessonDate);
            const lessonHour = lessonDate.getHours().toString().padStart(2, '0') + ':00';
            
            console.log(`\nАнализ урока ${lesson.id}:`);
            console.log(`- Дата: ${lessonDate.toISOString()}`);
            console.log(`- День недели: ${lessonDayOfWeek}`);
            console.log(`- Время: ${lessonHour}`);
            
            // Ищем соответствующий слот в расписании
            const matchingSchedule = schedules.find(s => 
                s.dayOfWeek === lessonDayOfWeek && s.startTime === lessonHour
            );
            
            if (matchingSchedule) {
                console.log(`✅ Найден соответствующий слот в расписании:`, matchingSchedule);
            } else {
                console.log(`❌ НЕ НАЙДЕН соответствующий слот в расписании!`);
                console.log(`   Ищем слот: dayOfWeek="${lessonDayOfWeek}", startTime="${lessonHour}"`);
                console.log(`   Доступные слоты:`, schedules.map(s => `${s.dayOfWeek} ${s.startTime}`));
            }
        });
        
        // 5. Проверяем глобальные переменные JavaScript
        console.log('\n🌐 === ПРОВЕРКА ГЛОБАЛЬНЫХ ПЕРЕМЕННЫХ ===');
        console.log('window.selectedTeacherSchedule:', window.selectedTeacherSchedule);
        console.log('window.teacherLessons:', window.teacherLessons);
        console.log('window.currentWeek:', window.currentWeek);
        console.log('window.currentStudentId:', window.currentStudentId);
        
        // 6. Проверяем DOM элементы
        console.log('\n🖥️ === ПРОВЕРКА DOM ЭЛЕМЕНТОВ ===');
        const timeSlots = document.querySelectorAll('.time-slot');
        console.log(`Найдено слотов в DOM: ${timeSlots.length}`);
        
        let occupiedCount = 0;
        let availableCount = 0;
        let existingCount = 0;
        
        timeSlots.forEach(slot => {
            const classes = slot.className;
            if (classes.includes('occupied')) occupiedCount++;
            else if (classes.includes('available')) availableCount++;
            else if (classes.includes('existing')) existingCount++;
        });
        
        console.log(`- Занятые слоты: ${occupiedCount}`);
        console.log(`- Доступные слоты: ${availableCount}`);
        console.log(`- Существующие слоты: ${existingCount}`);
        
        // 7. Выводим рекомендации
        console.log('\n💡 === РЕКОМЕНДАЦИИ ===');
        if (lessons.length === 0) {
            console.log('❌ Проблема: Нет уроков в API ответе');
            console.log('   Решение: Проверьте фильтрацию по дате в API');
        } else if (occupiedCount === 0) {
            console.log('❌ Проблема: Уроки есть в API, но не отображаются как занятые');
            console.log('   Решение: Проверьте логику сопоставления дат и времени');
        } else {
            console.log('✅ Система работает корректно');
        }
        
        return {
            lessons: lessons,
            schedules: schedules,
            occupiedSlotsCount: occupiedCount
        };
        
    } catch (error) {
        console.error('❌ Ошибка диагностики:', error);
        return null;
    }
}

// Простая функция для быстрой проверки проблемы
async function quickCheck(teacherId = 1) {
    console.log('🔍 === БЫСТРАЯ ПРОВЕРКА ===');
    
    try {
        // 1. Получаем текущую неделю
        const currentWeek = window.currentWeek || new Date();
        const weekStart = window.getStartOfWeek ? window.getStartOfWeek(currentWeek) : getStartOfWeekLocal(currentWeek);
        console.log('📅 Текущая неделя:', weekStart.toLocaleDateString('ru-RU'));
        
        // 2. Загружаем уроки
        const lessonsResponse = await fetch(`/admin/lessons/api/teacher/${teacherId}/lessons?weekStart=${weekStart.toISOString()}`);
        const lessons = await lessonsResponse.json();
        console.log(`📚 Найдено уроков: ${lessons.length}`);
        
        if (lessons.length > 0) {
            console.log('Первый урок:', {
                дата: lessons[0].lessonDate,
                студент: lessons[0].studentName,
                предмет: lessons[0].subjectName
            });
        }
        
        // 3. Проверяем DOM
        const occupiedSlots = document.querySelectorAll('.time-slot.occupied, .time-slot.occupied-by-current, .time-slot.occupied-by-other');
        console.log(`🎯 Занятых слотов в интерфейсе: ${occupiedSlots.length}`);
        
        // 4. Результат
        if (lessons.length > 0 && occupiedSlots.length === 0) {
            console.log('❌ ПРОБЛЕМА: Уроки есть, но не отображаются как занятые');
            console.log('💡 Запустите testLessons.fullDiagnostic(' + teacherId + ') для подробного анализа');
        } else if (lessons.length > 0 && occupiedSlots.length > 0) {
            console.log('✅ ВСЕ РАБОТАЕТ: Уроки отображаются корректно');
        } else {
            console.log('ℹ️ Уроков на текущую неделю не найдено');
        }
        
    } catch (error) {
        console.error('❌ Ошибка быстрой проверки:', error);
    }
}

// Функция для анализа результата диагностики
function analyzeResult(result) {
    console.log('🔍 === АНАЛИЗ РЕЗУЛЬТАТА ДИАГНОСТИКИ ===');
    
    if (!result) {
        console.log('❌ Результат диагностики пустой');
        return;
    }
    
    console.log(`📚 Уроков найдено: ${result.lessons.length}`);
    console.log(`📅 Слотов расписания: ${result.schedules.length}`);
    console.log(`🎯 Занятых слотов в интерфейсе: ${result.occupiedSlotsCount}`);
    
    if (result.lessons.length > 0 && result.schedules.length > 0 && result.occupiedSlotsCount === 0) {
        console.log('');
        console.log('❌ ПРОБЛЕМА НАЙДЕНА: Данные есть, но слоты не отображаются как занятые');
        console.log('');
        console.log('🔍 Возможные причины:');
        console.log('1. Неправильное сопоставление дней недели и времени');
        console.log('2. Проблема с форматом дат в уроках');
        console.log('3. Ошибка в логике обновления DOM');
        console.log('');
        console.log('💡 Давайте проверим каждый урок:');
        
        result.lessons.forEach((lesson, index) => {
            const lessonDate = new Date(lesson.lessonDate);
            if (isNaN(lessonDate.getTime())) {
                console.log(`❌ Урок ${index + 1}: НЕВАЛИДНАЯ ДАТА - ${lesson.lessonDate}`);
            } else {
                const dayOfWeek = getDayOfWeekLocal(lessonDate);
                const timeStr = lessonDate.getHours().toString().padStart(2, '0') + ':00';
                
                const matchingSchedule = result.schedules.find(s => 
                    s.dayOfWeek === dayOfWeek && s.startTime === timeStr
                );
                
                console.log(`${matchingSchedule ? '✅' : '❌'} Урок ${index + 1}: ${dayOfWeek} ${timeStr} ${matchingSchedule ? '(есть в расписании)' : '(НЕТ в расписании)'}`);
            }
        });
    }
}

// Обновляем экспорт функций
window.testLessons = {
    createLessons: testCreateLessons,
    getStudentLessons: testGetStudentLessons,
    getTeacherSchedule: testGetTeacherSchedule,
    runFullTest: runFullTest,
    debugOccupiedSlots: debugOccupiedSlots,
    checkInterfaceDisplay: checkInterfaceDisplay,
    forceUpdateDisplay: forceUpdateDisplay,
    fullDiagnostic: fullDiagnostic,
    quickCheck: quickCheck,
    analyzeResult: analyzeResult
};

console.log('🧪 Тестовый скрипт обновлен!');
console.log('Доступные функции:');
console.log('- testLessons.quickCheck(teacherId) - 🚀 БЫСТРАЯ ПРОВЕРКА');
console.log('- testLessons.fullDiagnostic(teacherId) - 🔍 ПОЛНАЯ ДИАГНОСТИКА');
console.log('- testLessons.analyzeResult(result) - 🔍 АНАЛИЗ РЕЗУЛЬТАТА');
console.log('- testLessons.createLessons() - тест создания уроков');
console.log('- testLessons.getStudentLessons() - тест получения уроков студента');
console.log('- testLessons.getTeacherSchedule() - тест получения расписания преподавателя');
console.log('- testLessons.runFullTest() - полное тестирование системы');
console.log('- testLessons.debugOccupiedSlots() - отладка занятых слотов');
console.log('- testLessons.checkInterfaceDisplay() - проверка отображения в интерфейсе');
console.log('- testLessons.forceUpdateDisplay() - принудительное обновление отображения');
console.log('');
console.log('🚨 Для диагностики проблемы с отображением уроков:');
console.log('1. Откройте страницу admin-lessons');
console.log('2. Откройте консоль браузера (F12)');
console.log('3. Выполните: result = await testLessons.fullDiagnostic(ID_ПРЕПОДАВАТЕЛЯ)');
console.log('4. Анализируйте: testLessons.analyzeResult(result)'); 