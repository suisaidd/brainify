package com.example.brainify.Controllers;

import com.example.brainify.DTO.TeacherPayrollDTO;
import com.example.brainify.Model.User;
import com.example.brainify.Model.UserRole;
import com.example.brainify.Service.AdminPayrollService;
import com.example.brainify.Config.SessionManager;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import jakarta.servlet.http.HttpSession;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/admin/payroll")
public class AdminPayrollController {

    @Autowired
    private AdminPayrollService adminPayrollService;

    @Autowired
    private SessionManager sessionManager;

    /**
     * Страница управления сметами преподавателей
     */
    @GetMapping
    public String adminPayrollPage(@RequestParam(defaultValue = "2025") int year,
                                  @RequestParam(defaultValue = "1") int month,
                                  @RequestParam(defaultValue = "current-payroll") String shift,
                                  Model model,
                                  HttpSession session) {
        
        System.out.println("AdminPayrollController: Попытка доступа к /admin/payroll");
        System.out.println("AdminPayrollController: Session ID: " + (session != null ? session.getId() : "null"));
        
        // Проверяем права доступа администратора
        User currentUser = sessionManager.getCurrentUser(session);
        System.out.println("AdminPayrollController: Current user: " + (currentUser != null ? currentUser.getName() + " (role: " + currentUser.getRole() + ")" : "null"));
        
        if (currentUser == null) {
            System.out.println("AdminPayrollController: Пользователь не авторизован, редирект на /login");
            return "redirect:/login";
        }
        
        if (!UserRole.ADMIN.equals(currentUser.getRole())) {
            System.out.println("AdminPayrollController: Пользователь не администратор, редирект на /dashboard");
            return "redirect:/dashboard";
        }
        
        System.out.println("AdminPayrollController: Доступ разрешен для администратора");
        
        try {
            System.out.println("AdminPayrollController: Загружаем данные преподавателей для " + year + "/" + month + " смена: " + shift);
            List<TeacherPayrollDTO> teachersData = adminPayrollService.getTeachersPayrollData(year, month, shift);
            System.out.println("AdminPayrollController: Загружено " + teachersData.size() + " преподавателей");
            
            model.addAttribute("teachersData", teachersData);
            model.addAttribute("selectedYear", year);
            model.addAttribute("selectedMonth", month);
            model.addAttribute("selectedShift", shift);
            
            // Добавляем названия месяцев
            String[] monthNames = {
                "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
                "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
            };
            model.addAttribute("monthNames", monthNames);
            
            System.out.println("AdminPayrollController: Данные успешно добавлены в модель");
            
        } catch (Exception e) {
            System.err.println("AdminPayrollController: Ошибка при загрузке данных: " + e.getMessage());
            e.printStackTrace();
            model.addAttribute("error", "Ошибка загрузки данных: " + e.getMessage());
        }
        
        System.out.println("AdminPayrollController: Возвращаем шаблон admin/payroll");
        return "admin/payroll";
    }

    /**
     * API для получения данных о сметах преподавателей
     */
    @GetMapping("/api/teachers")
    @ResponseBody
    public ResponseEntity<List<TeacherPayrollDTO>> getTeachersPayrollData(
            @RequestParam(defaultValue = "2025") int year,
            @RequestParam(defaultValue = "1") int month,
            @RequestParam(defaultValue = "current-payroll") String shift,
            HttpSession session) {
        
        // Проверяем права доступа администратора
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || !UserRole.ADMIN.equals(currentUser.getRole())) {
            return ResponseEntity.status(403).build();
        }
        
        try {
            List<TeacherPayrollDTO> teachersData = adminPayrollService.getTeachersPayrollData(year, month, shift);
            return ResponseEntity.ok(teachersData);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * API для создания сметы и скачивания Excel файла
     */
    @PostMapping("/api/create-payroll")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> createPayroll(
            @RequestParam int year,
            @RequestParam int month,
            @RequestParam String shift,
            HttpSession session) {
        
        // Проверяем права доступа администратора
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || !UserRole.ADMIN.equals(currentUser.getRole())) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", "Доступ запрещен");
            return ResponseEntity.status(403).body(errorResponse);
        }
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            String fileName = adminPayrollService.createPayrollForAllTeachers(year, month, shift);
            response.put("success", true);
            response.put("fileName", fileName);
            response.put("message", "Смета успешно создана");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * API для скачивания Excel файла
     */
    @GetMapping("/api/download/{fileName}")
    public ResponseEntity<byte[]> downloadExcelFile(@PathVariable String fileName, HttpSession session) {
        // Проверяем права доступа администратора
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || !UserRole.ADMIN.equals(currentUser.getRole())) {
            return ResponseEntity.status(403).build();
        }
        
        try {
            byte[] fileBytes = adminPayrollService.getExcelFileBytes(fileName);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", fileName);
            
            return ResponseEntity.ok()
                    .headers(headers)
                    .body(fileBytes);
                    
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * API для отметки сметы как оплаченной
     */
    @PostMapping("/api/mark-paid")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> markPayrollAsPaid(@RequestParam Long paymentId, HttpSession session) {
        // Проверяем права доступа администратора
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || !UserRole.ADMIN.equals(currentUser.getRole())) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("success", false);
            errorResponse.put("error", "Доступ запрещен");
            return ResponseEntity.status(403).body(errorResponse);
        }
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            adminPayrollService.markPayrollAsPaid(paymentId);
            response.put("success", true);
            response.put("message", "Смета отмечена как оплаченная");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }

    /**
     * Тестовый endpoint для проверки доступа
     */
    @GetMapping("/test")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> testAccess(HttpSession session) {
        System.out.println("AdminPayrollController: Тестовый endpoint /admin/payroll/test");
        
        User currentUser = sessionManager.getCurrentUser(session);
        Map<String, Object> response = new HashMap<>();
        
        if (currentUser == null) {
            response.put("status", "error");
            response.put("message", "Пользователь не авторизован");
            return ResponseEntity.ok(response);
        }
        
        response.put("status", "success");
        response.put("user", currentUser.getName());
        response.put("role", currentUser.getRole().toString());
        response.put("isAdmin", UserRole.ADMIN.equals(currentUser.getRole()));
        
        return ResponseEntity.ok(response);
    }
}
