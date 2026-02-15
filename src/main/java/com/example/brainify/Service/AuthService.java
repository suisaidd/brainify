package com.example.brainify.Service;

import com.example.brainify.Model.User;
import com.example.brainify.Model.UserRole;
import com.example.brainify.Model.VerificationCode;
import com.example.brainify.Repository.UserRepository;
import com.example.brainify.Repository.VerificationCodeRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import org.springframework.beans.factory.annotation.Value;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class AuthService {
    
    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);

    // ВРЕМЕННЫЙ ФЛАГ: true = пропускаем email верификацию (для отладки)
    // Чтобы вернуть обратно: поменять app.skip-email-verification=false в application.properties
    @Value("${app.skip-email-verification:false}")
    private boolean skipEmailVerification;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private VerificationCodeRepository verificationCodeRepository;
    
    @Autowired
    private EmailService emailService;
    
    private final SecureRandom random = new SecureRandom();
    
    // Геттер для флага пропуска email верификации
    public boolean isSkipEmailVerification() {
        return skipEmailVerification;
    }
    
    // Регистрация нового пользователя
    public String registerUser(String name, String email, String phone) throws Exception {
        // Нормализуем email к нижнему регистру
        email = email.toLowerCase().trim();
        logger.info("Starting registration for email: {}", email);
        
        // Проверяем, не существует ли уже пользователь с таким email
        if (userRepository.existsByEmail(email)) {
            throw new Exception("Пользователь с таким email уже существует");
        }
        
        // Очищаем номер телефона от форматирования
        String cleanPhone = cleanPhoneNumber(phone);
        
        // Проверяем, не существует ли уже пользователь с таким телефоном
        if (userRepository.existsByPhone(cleanPhone)) {
            throw new Exception("Пользователь с таким номером телефона уже существует");
        }
        
        // Проверяем лимит попыток
        if (isRateLimited(email)) {
            throw new Exception("Превышен лимит попыток. Попробуйте позже");
        }
        
        // Создаем пользователя
        User newUser = new User(name, email, cleanPhone);
        
        // ВРЕМЕННО: если пропускаем email верификацию — сразу верифицируем пользователя
        if (skipEmailVerification) {
            newUser.setIsVerified(true);
            userRepository.save(newUser);
            logger.info("Registration completed (skip email verification) for user: {}", email);
            return "SKIP_VERIFICATION"; // Специальный маркер для контроллера
        }
        
        // === ОРИГИНАЛЬНЫЙ КОД (вернётся при app.skip-email-verification=false) ===
        userRepository.save(newUser);
        
        // Генерируем и отправляем код верификации
        String code = generateVerificationCode();
        VerificationCode verificationCode = new VerificationCode(email, code, VerificationCode.CodeType.REGISTRATION);
        verificationCodeRepository.save(verificationCode);
        
        // Отправляем email
        try {
            emailService.sendVerificationCode(email, code, VerificationCode.CodeType.REGISTRATION);
            logger.info("Registration initiated for user: {}", email);
        } catch (Exception e) {
            logger.error("Failed to send registration email to {}, but code {} is saved. Error: {}", email, code, e.getMessage());
            return "Код подтверждения создан, но не удалось отправить email. Проверьте настройки почты. Код: " + code;
        }
        return "Код подтверждения отправлен на ваш email";
    }
    
    // Вход пользователя
    public String loginUser(String email) throws Exception {
        // Нормализуем email к нижнему регистру
        email = email.toLowerCase().trim();
        logger.info("Starting login for email: {}", email);
        
        // Проверяем, существует ли пользователь
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            logger.error("User not found for email: {}", email);
            throw new Exception("Пользователь с таким email не найден. Проверьте правильность email или зарегистрируйтесь");
        }
        
        User user = userOpt.get();
        logger.info("User found: id={}, name={}, role={}, isActive={}, isVerified={}", 
                   user.getId(), user.getName(), user.getRole(), user.getIsActive(), user.getIsVerified());
        
        // Проверяем, активен ли пользователь
        if (!user.getIsActive()) {
            logger.error("User account is inactive: {}", email);
            throw new Exception("Аккаунт заблокирован. Обратитесь в поддержку");
        }
        
        // ВРЕМЕННО: если пропускаем email верификацию — пропускаем проверку и отправку кода
        if (skipEmailVerification) {
            // Автоматически верифицируем, если не был верифицирован
            if (!user.getIsVerified()) {
                user.setIsVerified(true);
                userRepository.save(user);
            }
            logger.info("Login completed (skip email verification) for user: {}", email);
            return "SKIP_VERIFICATION"; // Специальный маркер для контроллера
        }
        
        // === ОРИГИНАЛЬНЫЙ КОД (вернётся при app.skip-email-verification=false) ===
        // Проверяем, верифицирован ли пользователь
        if (!user.getIsVerified()) {
            logger.error("User account is not verified: {}", email);
            throw new Exception("Аккаунт не верифицирован. Завершите регистрацию");
        }
        
        // Проверяем лимит попыток
        if (isRateLimited(email)) {
            logger.error("Rate limit exceeded for email: {}", email);
            throw new Exception("Превышен лимит попыток. Попробуйте позже");
        }
        
        // Деактивируем все существующие коды для этого пользователя
        verificationCodeRepository.deactivateAllUserCodes(email, VerificationCode.CodeType.LOGIN, LocalDateTime.now());
        
        // Генерируем и отправляем код для входа
        String code = generateVerificationCode();
        logger.info("Generated code: {} for email: {}", code, email);
        
        VerificationCode verificationCode = new VerificationCode(email, code, VerificationCode.CodeType.LOGIN);
        verificationCodeRepository.save(verificationCode);
        
        // Отправляем email
        try {
            emailService.sendVerificationCode(email, code, VerificationCode.CodeType.LOGIN);
            logger.info("Login code sent for user: {}", email);
        } catch (Exception e) {
            logger.error("Failed to send login email to {}, but code {} is saved. Error: {}", email, code, e.getMessage());
            return "Код для входа создан, но не удалось отправить email. Проверьте настройки почты. Код: " + code;
        }
        return "Код для входа отправлен на ваш email";
    }
    
    // Верификация кода
    public User verifyCode(String email, String code, VerificationCode.CodeType type) throws Exception {
        // Нормализуем email к нижнему регистру
        email = email.toLowerCase().trim();
        logger.info("Verifying code for email: {} and type: {}", email, type);
        
        // Ищем код
        Optional<VerificationCode> codeOpt = verificationCodeRepository
                .findByEmailAndCodeAndType(email, code, type);
        
        logger.info("Code search result: found={}, email={}, code={}, type={}", 
                   codeOpt.isPresent(), email, code, type);
        
        if (codeOpt.isEmpty()) {
            // Попробуем найти все коды для этого email и типа для диагностики
            List<VerificationCode> allCodes = verificationCodeRepository.findByEmailOrderByCreatedAtDesc(email);
            logger.info("All codes for email {}: {}", email, allCodes);
            throw new Exception("Неверный код подтверждения");
        }
        
        VerificationCode verificationCode = codeOpt.get();
        
        // Проверяем, не использован ли код и не истек ли он
        if (!verificationCode.isValid()) {
            throw new Exception("Код подтверждения истек или уже использован");
        }
        
        // Помечаем код как использованный
        verificationCode.markAsUsed();
        verificationCodeRepository.save(verificationCode);
        
        // Деактивируем все остальные коды для этого пользователя и типа
        verificationCodeRepository.deactivateAllUserCodes(email, type, LocalDateTime.now());
        
        // Получаем пользователя
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            throw new Exception("Пользователь не найден");
        }
        
        User user = userOpt.get();
        
        // Если это регистрация, помечаем пользователя как верифицированного
        if (type == VerificationCode.CodeType.REGISTRATION) {
            user.setIsVerified(true);
        }
        
        // Обновляем время последнего входа
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);
        
        logger.info("Code verified successfully for user: {}", email);
        return user;
    }
    
    // Повторная отправка кода
    public String resendCode(String email, VerificationCode.CodeType type) throws Exception {
        // Нормализуем email к нижнему регистру
        email = email.toLowerCase().trim();
        logger.info("Resending code for email: {} and type: {}", email, type);
        
        // Проверяем лимит попыток
        if (isRateLimited(email)) {
            throw new Exception("Превышен лимит попыток. Попробуйте позже");
        }
        
        // Деактивируем все существующие коды для этого пользователя и типа
        verificationCodeRepository.deactivateAllUserCodes(email, type, LocalDateTime.now());
        
        // Генерируем новый код
        String code = generateVerificationCode();
        VerificationCode verificationCode = new VerificationCode(email, code, type);
        verificationCodeRepository.save(verificationCode);
        
        // Отправляем email
        try {
            emailService.sendVerificationCode(email, code, type);
            logger.info("Code resent for user: {}", email);
        } catch (Exception e) {
            logger.error("Failed to resend email to {}, but code {} is saved. Error: {}", email, code, e.getMessage());
            return "Новый код создан, но не удалось отправить email. Проверьте настройки почты. Код: " + code;
        }
        return "Новый код отправлен на ваш email";
    }
    
    // Генерация 6-значного кода
    private String generateVerificationCode() {
        return String.format("%06d", random.nextInt(1000000));
    }
    
    // Проверка лимита попыток (отключена для разработки)
    private boolean isRateLimited(String email) {
        // Отключаем лимиты для удобства разработки
        return false;
    }
    
    // Очистка истекших кодов (можно вызывать по расписанию)
    public void cleanupExpiredCodes() {
        logger.info("Cleaning up expired verification codes");
        verificationCodeRepository.deleteExpiredCodes(LocalDateTime.now());
    }
    
    // Получение пользователя по email
    public Optional<User> getUserByEmail(String email) {
        return userRepository.findByEmail(email);
    }
    
    // Получение пользователя по email (возвращает User или null)
    public User findUserByEmail(String email) {
        return userRepository.findByEmail(email).orElse(null);
    }
    
    // Получение URL для перенаправления в зависимости от роли
    public String getRedirectUrlByRole(UserRole role) {
        switch (role) {
            case STUDENT:
                return "/dashboard-student";
            case TEACHER:
                return "/dashboard";
            case MANAGER:
                return "/admin-role"; // Менеджер может использовать админ панель
            case ADMIN:
                return "/admin-role"; // Админ попадает на админ панель
            default:
                return "/dashboard-student";
        }
    }
    
    // Статистика пользователей
    public long getTotalUsers() {
        return userRepository.count();
    }
    
    public long getVerifiedUsers() {
        return userRepository.findByIsVerifiedTrue().size();
    }
    
    public long getUsersByRole(UserRole role) {
        return userRepository.findByRole(role).size();
    }
    
    // Очистка номера телефона от форматирования
    private String cleanPhoneNumber(String phone) {
        if (phone == null) return null;
        
        // Удаляем все символы кроме цифр и плюса
        String cleaned = phone.replaceAll("[^+\\d]", "");
        
        // Нормализуем российские номера
        if (cleaned.startsWith("+7")) {
            return cleaned;
        } else if (cleaned.startsWith("8")) {
            return "+7" + cleaned.substring(1);
        } else if (cleaned.startsWith("7")) {
            return "+" + cleaned;
        } else if (cleaned.matches("\\d{10}")) {
            // Если 10 цифр без кода страны, добавляем +7
            return "+7" + cleaned;
        }
        
        return cleaned;
    }
} 