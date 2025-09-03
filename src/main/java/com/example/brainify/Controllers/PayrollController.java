package com.example.brainify.Controllers;

import com.example.brainify.DTO.PayrollSummaryDTO;
import com.example.brainify.Model.User;
import com.example.brainify.Service.PayrollService;
import com.example.brainify.Config.SessionManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpSession;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/payroll")
public class PayrollController {

    @Autowired
    private PayrollService payrollService;
    
    @Autowired
    private SessionManager sessionManager;

    @GetMapping
    public ResponseEntity<?> getPayrollData(
            @RequestParam int year,
            @RequestParam int month,
            @RequestParam String type,
            HttpSession session) {
        
        try {
            // Получаем ID преподавателя из сессии
            User currentUser = sessionManager.getCurrentUser(session);
            if (currentUser == null) {
                Map<String, String> error = new HashMap<>();
                error.put("error", "Пользователь не авторизован");
                return ResponseEntity.status(401).body(error);
            }
            
            Long teacherId = currentUser.getId();
            
            // Логирование для отладки
            System.out.println("Запрос сметы: год=" + year + ", месяц=" + month + ", тип=" + type + ", преподаватель=" + teacherId);
            
            PayrollSummaryDTO payrollData = payrollService.getPayrollData(teacherId, year, month, type);
            
            // Логирование результата
            System.out.println("=== PAYROLL CONTROLLER ===");
            System.out.println("Найдено уроков: " + (payrollData.getLessons() != null ? payrollData.getLessons().size() : 0));
            System.out.println("Ожидаемая сумма: " + payrollData.getExpected());
            System.out.println("Выплаченная сумма: " + payrollData.getPaid());
            System.out.println("==========================");
            
            return ResponseEntity.ok(payrollData);
            
        } catch (Exception e) {
            System.err.println("Ошибка при загрузке данных сметы: " + e.getMessage());
            e.printStackTrace();
            
            Map<String, String> error = new HashMap<>();
            error.put("error", "Ошибка при загрузке данных сметы: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }

    @GetMapping("/test")
    public ResponseEntity<?> getTestPayrollData() {
        try {
            // Возвращаем тестовые данные для демонстрации
            Map<String, Object> testData = new HashMap<>();
            
            // Сводка
            Map<String, Object> summary = new HashMap<>();
            summary.put("expected", 15000);
            summary.put("paid", 13500);
            testData.put("summary", summary);
            
            // Тестовые уроки
            @SuppressWarnings("unchecked")
            Map<String, Object>[] lessons = new Map[5];
            
            lessons[0] = new HashMap<>();
            lessons[0].put("date", "2024-12-15");
            lessons[0].put("subject", "Математика");
            lessons[0].put("type", "ЕГЭ");
            lessons[0].put("status", "completed");
            lessons[0].put("student", "Иванов Иван");
            lessons[0].put("rate", 600);
            lessons[0].put("bonus", 40);
            lessons[0].put("compensation", 0);
            lessons[0].put("penalty", 0);
            
            lessons[1] = new HashMap<>();
            lessons[1].put("date", "2024-12-14");
            lessons[1].put("subject", "Физика");
            lessons[1].put("type", "ЕГЭ");
            lessons[1].put("status", "absent");
            lessons[1].put("student", "Петров Петр");
            lessons[1].put("rate", 600);
            lessons[1].put("bonus", 0);
            lessons[1].put("compensation", 0);
            lessons[1].put("penalty", 0);
            
            lessons[2] = new HashMap<>();
            lessons[2].put("date", "2024-12-13");
            lessons[2].put("subject", "Химия");
            lessons[2].put("type", "ОГЭ");
            lessons[2].put("status", "cancelled");
            lessons[2].put("student", "Сидоров Сидор");
            lessons[2].put("rate", 0);
            lessons[2].put("bonus", 0);
            lessons[2].put("compensation", 450);
            lessons[2].put("penalty", 0);
            
            lessons[3] = new HashMap<>();
            lessons[3].put("date", "2024-12-12");
            lessons[3].put("subject", "Математика");
            lessons[3].put("type", "ЕГЭ Профиль");
            lessons[3].put("status", "completed");
            lessons[3].put("student", "Козлов Козел");
            lessons[3].put("rate", 650);
            lessons[3].put("bonus", 40);
            lessons[3].put("compensation", 0);
            lessons[3].put("penalty", 0);
            
            lessons[4] = new HashMap<>();
            lessons[4].put("date", "2024-12-11");
            lessons[4].put("subject", "Биология");
            lessons[4].put("type", "ЕГЭ");
            lessons[4].put("status", "completed");
            lessons[4].put("student", "Волков Волк");
            lessons[4].put("rate", 600);
            lessons[4].put("bonus", 0);
            lessons[4].put("compensation", 0);
            lessons[4].put("penalty", 120);
            
            testData.put("lessons", lessons);
            
            return ResponseEntity.ok(testData);
            
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Ошибка при загрузке тестовых данных: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}
