package com.example.brainify.Controllers;

import com.example.brainify.DTO.TeacherPayrollDTO;
import com.example.brainify.Service.AdminPayrollService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Controller
@RequestMapping("/admin/payroll")
public class AdminPayrollController {

    @Autowired
    private AdminPayrollService adminPayrollService;

    /**
     * Страница управления сметами преподавателей
     */
    @GetMapping
    public String adminPayrollPage(@RequestParam(defaultValue = "2025") int year,
                                  @RequestParam(defaultValue = "1") int month,
                                  Model model) {
        try {
            List<TeacherPayrollDTO> teachersData = adminPayrollService.getTeachersPayrollData(year, month);
            model.addAttribute("teachersData", teachersData);
            model.addAttribute("selectedYear", year);
            model.addAttribute("selectedMonth", month);
            
            // Добавляем названия месяцев
            String[] monthNames = {
                "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
                "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"
            };
            model.addAttribute("monthNames", monthNames);
            
        } catch (Exception e) {
            model.addAttribute("error", "Ошибка загрузки данных: " + e.getMessage());
        }
        
        return "admin/payroll";
    }

    /**
     * API для получения данных о сметах преподавателей
     */
    @GetMapping("/api/teachers")
    @ResponseBody
    public ResponseEntity<List<TeacherPayrollDTO>> getTeachersPayrollData(
            @RequestParam(defaultValue = "2025") int year,
            @RequestParam(defaultValue = "1") int month) {
        
        try {
            List<TeacherPayrollDTO> teachersData = adminPayrollService.getTeachersPayrollData(year, month);
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
            @RequestParam int month) {
        
        Map<String, Object> response = new HashMap<>();
        
        try {
            String fileName = adminPayrollService.createPayrollForAllTeachers(year, month);
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
    public ResponseEntity<byte[]> downloadExcelFile(@PathVariable String fileName) {
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
    public ResponseEntity<Map<String, Object>> markPayrollAsPaid(@RequestParam Long paymentId) {
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
}
