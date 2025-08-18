# Изменения для работы с предметами ученика и кнопками

## 🎯 **Основные изменения:**

### 📚 **1. Назначение преподавателя:**
- ✅ Теперь отображаются только предметы из таблицы `user_subject` (предметы ученика)
- ✅ Добавлен новый API `/api/student/{studentId}/subjects` для получения предметов ученика
- ✅ Убрано отображение всех предметов из базы данных

### 🔘 **2. Расписание ученика:**
- ✅ Заменен выбор предмета на 3 кнопки для каждого предмета ученика
- ✅ Кнопки: "Преподаватель", "Уроки", "Расписание"
- ✅ Каждая кнопка работает с конкретным предметом и преподавателем

## 🔧 **Технические изменения:**

### **Новый API для предметов ученика:**
```java
@GetMapping("/api/student/{studentId}/subjects")
public ResponseEntity<Map<String, Object>> getStudentSubjects(
        @PathVariable Long studentId,
        HttpSession session) {
    
    User student = userRepository.findById(studentId).orElse(null);
    if (student == null) {
        return ResponseEntity.badRequest().body(Map.of("error", "Ученик не найден"));
    }

    List<Map<String, Object>> subjectData = student.getSubjects().stream()
        .map(subject -> {
            Map<String, Object> subjectInfo = new HashMap<>();
            subjectInfo.put("id", subject.getId());
            subjectInfo.put("name", subject.getName());
            subjectInfo.put("description", subject.getDescription());
            return subjectInfo;
        })
        .collect(Collectors.toList());
    
    return ResponseEntity.ok(Map.of("subjects", subjectData));
}
```

### **Обновленный API расписания ученика:**
```java
@GetMapping("/api/student/{studentId}/schedule")
public ResponseEntity<Map<String, Object>> getStudentSchedule(
        @PathVariable Long studentId,
        @RequestParam(defaultValue = "0") int weekOffset,
        @RequestParam(required = false) Long subjectId,  // Новый параметр
        HttpSession session) {
    
    // Если указан предмет, фильтруем только по нему
    if (subjectId != null) {
        assignments = assignments.stream()
            .filter(assignment -> assignment.getSubject().getId().equals(subjectId))
            .collect(Collectors.toList());
    }
}
```

### **HTML изменения:**
```html
<!-- Заменен выбор предмета на список предметов ученика -->
<div id="student-subjects" class="student-subjects" style="display: none;">
    <h4>Предметы ученика:</h4>
    <div id="subjects-container" class="subjects-container">
        <!-- Предметы будут добавлены через JavaScript -->
    </div>
</div>
```

### **CSS стили для предметов:**
```css
.student-subjects {
    margin-bottom: 20px;
    padding: 15px;
    background: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #e9ecef;
}

.subject-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    background: white;
    border: 1px solid #e9ecef;
    border-radius: 6px;
    transition: all 0.3s ease;
}

.subject-actions {
    display: flex;
    gap: 8px;
}

.subject-btn.teacher { background: var(--primary-green); }
.subject-btn.lessons { background: var(--secondary-blue); }
.subject-btn.schedule { background: var(--purple); }
```

### **JavaScript функции:**

#### **Загрузка предметов ученика:**
```javascript
async function loadStudentSubjects(studentId) {
    const response = await fetch(`/admin-lessons/api/student/${studentId}/subjects`);
    const data = await response.json();
    
    const subjectsContainer = document.getElementById('subjects-container');
    subjectsContainer.innerHTML = '';
    
    data.subjects.forEach(subject => {
        const subjectItem = document.createElement('div');
        subjectItem.className = 'subject-item';
        subjectItem.innerHTML = `
            <div class="subject-info">
                <div class="subject-name">${subject.name}</div>
                <div class="subject-description">${subject.description || ''}</div>
            </div>
            <div class="subject-actions">
                <button class="subject-btn teacher" onclick="openAssignTeacherModal(${studentId}, ${subject.id})">
                    <i class="fas fa-user-plus"></i> Преподаватель
                </button>
                <button class="subject-btn lessons" onclick="openStudentLessonsModal(${studentId}, ${subject.id})">
                    <i class="fas fa-book"></i> Уроки
                </button>
                <button class="subject-btn schedule" onclick="openStudentScheduleModal(${studentId}, ${subject.id})">
                    <i class="fas fa-calendar"></i> Расписание
                </button>
            </div>
        `;
        subjectsContainer.appendChild(subjectItem);
    });
}
```

#### **Открытие модальных окон с предметом:**
```javascript
function openStudentScheduleModal(studentId, subjectId = null) {
    currentUser = { 
        id: studentId, 
        name: student.name, 
        type: 'student', 
        subjectId: subjectId  // Добавлен subjectId
    };
    
    // Показываем предметы ученика
    document.getElementById('student-subjects').style.display = 'block';
    loadStudentSubjects(studentId);
}
```

#### **Загрузка расписания с предметом:**
```javascript
const url = currentUser.subjectId 
    ? `/admin-lessons/api/student/${currentUser.id}/schedule?weekOffset=${currentWeekOffset}&subjectId=${currentUser.subjectId}`
    : `/admin-lessons/api/student/${currentUser.id}/schedule?weekOffset=${currentWeekOffset}`;
```

## 🎨 **Визуальные улучшения:**

### **Карточки предметов:**
- ✅ **Название предмета** - крупным шрифтом
- ✅ **Описание предмета** - мелким шрифтом
- ✅ **3 кнопки** - разного цвета для разных действий
- ✅ **Hover эффекты** - подсветка при наведении

### **Цветовая схема кнопок:**
- 🟢 **Зеленый** - "Преподаватель" (назначение)
- 🔵 **Синий** - "Уроки" (просмотр)
- 🟣 **Фиолетовый** - "Расписание" (планирование)

## 🔄 **Логика работы:**

### **Для назначения преподавателя:**
1. Открываем модальное окно с предметами ученика
2. Нажимаем "Преподаватель" для конкретного предмета
3. Открывается модальное окно с преподавателями этого предмета
4. Выбираем преподавателя и назначаем

### **Для расписания:**
1. Открываем модальное окно с предметами ученика
2. Нажимаем "Расписание" для конкретного предмета
3. Открывается расписание только для этого предмета и его преподавателя
4. Выбираем время и сохраняем уроки

### **Для уроков:**
1. Открываем модальное окно с предметами ученика
2. Нажимаем "Уроки" для конкретного предмета
3. Открывается список уроков по этому предмету

## 📊 **Преимущества нового подхода:**

### **1. Логичность:**
- ✅ Показываются только предметы ученика
- ✅ Каждый предмет имеет своего преподавателя
- ✅ Разные преподаватели - разное время работы

### **2. Удобство:**
- ✅ Не нужно выбирать предмет из списка
- ✅ Все действия доступны сразу
- ✅ Понятная навигация

### **3. Производительность:**
- ✅ Фильтрация на уровне БД
- ✅ Загрузка только нужных данных
- ✅ Меньше запросов к серверу

## 🚀 **Результат:**

- ✅ **Предметы ученика** - отображаются только из `user_subject`
- ✅ **3 кнопки** - для каждого предмета отдельно
- ✅ **Фильтрация** - расписание по конкретному предмету
- ✅ **Улучшенный UX** - интуитивно понятный интерфейс
- ✅ **Производительность** - оптимизированные запросы

---

*Функционал работы с предметами ученика и кнопками реализован для системы Brainify* 