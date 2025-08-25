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
import java.util.ArrayList;
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
     * Получить список всех преподавателей с их сметами за указанный месяц и смену
     */
    public List<TeacherPayrollDTO> getTeachersPayrollData(int year, int month, String shift) {
        List<User> teachers = userRepository.findByRole(UserRole.TEACHER);
        
        if (teachers.isEmpty()) {
            return new ArrayList<>();
        }
        
        return teachers.stream().map(teacher -> {
            try {
                // Получаем смету преподавателя для указанной смены
                BigDecimal currentPayrollAmount = payrollService.getPayrollData(
                    teacher.getId(), year, month, shift).getExpected();
                
                // Проверяем, есть ли уже созданные платежи для этой смены
                List<PayrollPayment> existingPayments = payrollPaymentRepository
                    .findAllPaymentsByTeacherAndYearAndMonthAndType(teacher, year, month, shift);
                
                BigDecimal paidAmount = BigDecimal.ZERO;
                String paymentStatus = "none";
                Long paymentId = null;
                BigDecimal alreadyAccountedAmount = BigDecimal.ZERO;
                
                // Обрабатываем все существующие платежи
                for (PayrollPayment payment : existingPayments) {
                    if ("paid".equals(payment.getPaymentStatus())) {
                        paidAmount = paidAmount.add(payment.getPaidAmount());
                        paymentStatus = "paid";
                        paymentId = payment.getId();
                    } else if ("pending".equals(payment.getPaymentStatus())) {
                        paymentStatus = "pending";
                        paymentId = payment.getId();
                    }
                    alreadyAccountedAmount = alreadyAccountedAmount.add(payment.getExpectedAmount());
                }
                
                // Вычитаем уже учтенные уроки
                BigDecimal newPayrollAmount = currentPayrollAmount.subtract(alreadyAccountedAmount);
                if (newPayrollAmount.compareTo(BigDecimal.ZERO) < 0) {
                    newPayrollAmount = BigDecimal.ZERO;
                }
                
                return new TeacherPayrollDTO(
                    teacher.getId(),
                    teacher.getName(),
                    teacher.getEmail(),
                    teacher.getPhone(),
                    newPayrollAmount, // Только новые уроки
                    paidAmount,
                    paymentStatus,
                    paymentId
                );
            } catch (Exception e) {
                // В случае ошибки возвращаем данные с нулевыми суммами
                return new TeacherPayrollDTO(
                    teacher.getId(),
                    teacher.getName(),
                    teacher.getEmail(),
                    teacher.getPhone(),
                    BigDecimal.ZERO,
                    BigDecimal.ZERO,
                    "error",
                    null
                );
            }
        }).collect(Collectors.toList());
    }

    /**
     * Создать смету для всех преподавателей за указанный месяц и смену
     */
    public String createPayrollForAllTeachers(int year, int month, String shift) throws IOException {
        List<TeacherPayrollDTO> teachersData = getTeachersPayrollData(year, month, shift);
        
        // Фильтруем только тех, у кого есть смета
        List<TeacherPayrollDTO> teachersWithPayroll = teachersData.stream()
            .filter(teacher -> teacher.getCurrentPayrollAmount().compareTo(BigDecimal.ZERO) > 0)
            .collect(Collectors.toList());
        
        if (teachersWithPayroll.isEmpty()) {
            throw new RuntimeException("Нет преподавателей с сметами за указанный месяц и смену");
        }
        
        // Создаем записи о платежах или обновляем существующие
        for (TeacherPayrollDTO teacherData : teachersWithPayroll) {
            User teacher = userRepository.findById(teacherData.getTeacherId()).orElse(null);
            if (teacher != null) {
                // Проверяем, есть ли уже платежи для этой смены
                List<PayrollPayment> existingPayments = payrollPaymentRepository
                    .findAllPaymentsByTeacherAndYearAndMonthAndType(teacher, year, month, shift);
                
                if (existingPayments.isEmpty()) {
                    // Создаем новый платеж
                    PayrollPayment payment = new PayrollPayment(
                        teacher, year, month, shift, 
                        teacherData.getCurrentPayrollAmount(), BigDecimal.ZERO
                    );
                    payrollPaymentRepository.save(payment);
                } else {
                    // Проверяем, есть ли уже оплаченные платежи
                    boolean hasPaidPayment = existingPayments.stream()
                        .anyMatch(payment -> "paid".equals(payment.getPaymentStatus()));
                    
                    if (hasPaidPayment) {
                        throw new RuntimeException("Смета для преподавателя " + teacher.getName() + " уже оплачена и не может быть изменена");
                    }
                    
                    // Обновляем последний ожидающий платеж или создаем новый
                    PayrollPayment lastPayment = existingPayments.get(0); // Первый в списке (самый новый)
                    if ("pending".equals(lastPayment.getPaymentStatus())) {
                        // Добавляем новые уроки к существующему платежу
                        BigDecimal newTotal = lastPayment.getExpectedAmount().add(teacherData.getCurrentPayrollAmount());
                        lastPayment.setExpectedAmount(newTotal);
                        payrollPaymentRepository.save(lastPayment);
                    } else {
                        // Создаем новый платеж
                        PayrollPayment payment = new PayrollPayment(
                            teacher, year, month, shift, 
                            teacherData.getCurrentPayrollAmount(), BigDecimal.ZERO
                        );
                        payrollPaymentRepository.save(payment);
                    }
                }
            }
        }
        
        // Создаем Excel файл с правильным именем
        String fileName = createExcelFile(teachersWithPayroll, year, month, shift);
        
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
    private String createExcelFile(List<TeacherPayrollDTO> teachersData, int year, int month, String shift) throws IOException {
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
        String fileName = String.format("payroll_%d_%02d_%s_%s.xlsx", 
            year, month, shift, LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")));
        
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
