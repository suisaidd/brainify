#!/bin/bash

echo "=== ТЕСТИРОВАНИЕ УРОКОВ 222 И 217 ==="
echo "Время: $(date)"
echo

echo "1. Тестируем урок 222..."
curl -s "http://localhost:8082/board?lessonId=222" > /dev/null
echo "   Запрос к уроку 222 отправлен"

echo "2. Ждем 2 секунды..."
sleep 2

echo "3. Тестируем урок 217..."
curl -s "http://localhost:8082/board?lessonId=217" > /dev/null
echo "   Запрос к уроку 217 отправлен"

echo
echo "=== ТЕСТИРОВАНИЕ ЗАВЕРШЕНО ==="
echo "Проверьте логи приложения для анализа сессий"
