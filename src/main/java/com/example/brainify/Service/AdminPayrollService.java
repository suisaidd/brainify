package com.example.brainify.Service;

import com.example.brainify.DTO.TeacherPayrollDTO;
import com.example.brainify.Model.PayrollPayment;
import com.example.brainify.Model.User;
import com.example.brainify.Model.UserRole;
import com.example.brainify.Repository.PayrollPaymentRepository;
import com.example.brainify.Repository.UserRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class AdminPayrollService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PayrollService payrollService;

    @Autowired
    private PayrollPaymentRepository payrollPaymentRepository;

    /**
     * Получить список всех преподавателей с их сметами за указанный месяц
     */
    public List<TeacherPayrollDTO> getTeachersPayrollData(int year, int month) {
        List<User> teachers = userRepository.findByRole(UserRole.TEACHER);
        
        return teachers.stream().map(teacher -> {
            // Получаем текущую смету преподавателя
            BigDecimal currentPayrollAmount = payrollService.getPayrollData(
                teacher.getId(), year, month, "current-payroll").getExpected();
            
            // Проверяем, есть ли уже созданный платеж
            Optional<PayrollPayment> existingPayment = payrollPaymentRepository
                .findPendingPaymentByTeacherAndYearAndMonthAndType(teacher, year, month, "current-payroll");
            
            BigDecimal paidAmount = BigDecimal.ZERO;
            String paymentStatus = "none";
            Long paymentId = null;
            
            if (existingPayment.isPresent()) {
                PayrollPayment payment = existingPayment.get();
                paidAmount = payment.getPaidAmount();
                paymentStatus = payment.getPaymentStatus();
                paymentId = payment.getId();
            }
            
            return new TeacherPayrollDTO(
                teacher.getId(),
                teacher.getName(),
                teacher.getEmail(),
                teacher.getPhone(),
                currentPayrollAmount,
                paidAmount,
                paymentStatus,
                paymentId
            );
        }).collect(Collectors.toList());
    }

    /**
     * Создать смету для всех преподавателей за указанный месяц
     */
    public String createPayrollForAllTeachers(int year, int month) throws IOException {
        List<TeacherPayrollDTO> teachersData = getTeachersPayrollData(year, month);
        
        // Фильтруем только тех, у кого есть смета
        List<TeacherPayrollDTO> teachersWithPayroll = teachersData.stream()
            .filter(teacher -> teacher.getCurrentPayrollAmount().compareTo(BigDecimal.ZERO) > 0)
            .collect(Collectors.toList());
        
        if (teachersWithPayroll.isEmpty()) {
            throw new RuntimeException("Нет преподавателей с сметами за указанный месяц");
        }
        
        // Создаем записи о платежах
        for (TeacherPayrollDTO teacherData : teachersWithPayroll) {
            User teacher = userRepository.findById(teacherData.getTeacherId()).orElse(null);
            if (teacher != null) {
                PayrollPayment payment = new PayrollPayment(
                    teacher, year, month, "current-payroll", 
                    teacherData.getCurrentPayrollAmount(), BigDecimal.ZERO
                );
                payrollPaymentRepository.save(payment);
            }
        }
        
        // Создаем Excel файл
        String fileName = createExcelFile(teachersWithPayroll, year, month);
        
        return fileName;
    }

    /**
     * Отметить смету как оплаченную
     */
    public void markPayrollAsPaid(Long paymentId) {
        PayrollPayment payment = payrollPaymentRepository.findById(paymentId)
            .orElseThrow(() -> new RuntimeException("Платеж не найден"));
        
        payment.setPaymentStatus("paid");
        payment.setPaidAmount(payment.getExpectedAmount());
        payment.setPaymentDate(LocalDateTime.now());
        
        payrollPaymentRepository.save(payment);
    }

    /**
     * Создать Excel файл со сметами
     */
    private String createExcelFile(List<TeacherPayrollDTO> teachersData, int year, int month) throws IOException {
        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Смета преподавателей");
        
        // Создаем стили
        CellStyle headerStyle = workbook.createCellStyle();
        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerStyle.setFont(headerFont);
        headerStyle.setAlignment(HorizontalAlignment.CENTER);
        
        // Заголовки
        Row headerRow = sheet.createRow(0);
        String[] headers = {"№", "ФИО", "Email", "Телефон", "Сумма к выплате", "Статус"};
        
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }
        
        // Данные
        int rowNum = 1;
        for (TeacherPayrollDTO teacher : teachersData) {
            Row row = sheet.createRow(rowNum++);
            
            row.createCell(0).setCellValue(rowNum - 1);
            row.createCell(1).setCellValue(teacher.getTeacherName());
            row.createCell(2).setCellValue(teacher.getTeacherEmail());
            row.createCell(3).setCellValue(teacher.getTeacherPhone());
            row.createCell(4).setCellValue(teacher.getCurrentPayrollAmount().doubleValue());
            row.createCell(5).setCellValue("Ожидает оплаты");
        }
        
        // Автоматическая ширина колонок
        for (int i = 0; i < headers.length; i++) {
            sheet.autoSizeColumn(i);
        }
        
        // Сохраняем файл
        String fileName = String.format("payroll_%d_%02d_%s.xlsx", 
            year, month, LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")));
        
        Path uploadDir = Paths.get("uploads", "payroll");
        if (!Files.exists(uploadDir)) {
            Files.createDirectories(uploadDir);
        }
        
        Path filePath = uploadDir.resolve(fileName);
        
        try (FileOutputStream fileOut = new FileOutputStream(filePath.toFile())) {
            workbook.write(fileOut);
        }
        
        workbook.close();
        
        return fileName;
    }

    /**
     * Получить Excel файл как байты для скачивания
     */
    public byte[] getExcelFileBytes(String fileName) throws IOException {
        Path filePath = Paths.get("uploads", "payroll", fileName);
        
        if (!Files.exists(filePath)) {
            throw new RuntimeException("Файл не найден");
        }
        
        return Files.readAllBytes(filePath);
    }
}
