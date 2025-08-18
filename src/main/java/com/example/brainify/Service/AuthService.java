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

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
public class AuthService {
    
    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);
    private static final int MAX_ATTEMPTS_PER_HOUR = 1000; // Практически нет лимита
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private VerificationCodeRepository verificationCodeRepository;
    
    @Autowired
    private EmailService emailService;
    
    private final SecureRandom random = new SecureRandom();
    
    // Регистрация нового пользователя
    public String registerUser(String name, String email, String phone) throws Exception {
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
        
        // Создаем пользователя (неверифицированного)
        User newUser = new User(name, email, cleanPhone);
        userRepository.save(newUser);
        
        // Генерируем и отправляем код верификации
        String code = generateVerificationCode();
        VerificationCode verificationCode = new VerificationCode(email, code, VerificationCode.CodeType.REGISTRATION);
        verificationCodeRepository.save(verificationCode);
        
        // Отправляем email
        emailService.sendVerificationCode(email, code, VerificationCode.CodeType.REGISTRATION);
        
        logger.info("Registration initiated for user: {}", email);
        return "Код подтверждения отправлен на ваш email";
    }
    
    // Вход пользователя
    public String loginUser(String email) throws Exception {
        logger.info("Starting login for email: {}", email);
        
        // Проверяем, существует ли пользователь
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isEmpty()) {
            throw new Exception("Пользователь с таким email не найден");
        }
        
        User user = userOpt.get();
        
        // Проверяем, активен ли пользователь
        if (!user.getIsActive()) {
            throw new Exception("Аккаунт заблокирован. Обратитесь в поддержку");
        }
        
        // Проверяем, верифицирован ли пользователь
        if (!user.getIsVerified()) {
            throw new Exception("Аккаунт не верифицирован. Завершите регистрацию");
        }
        
        // Проверяем лимит попыток
        if (isRateLimited(email)) {
            throw new Exception("Превышен лимит попыток. Попробуйте позже");
        }
        
        // Генерируем и отправляем код для входа
        String code = generateVerificationCode();
        VerificationCode verificationCode = new VerificationCode(email, code, VerificationCode.CodeType.LOGIN);
        verificationCodeRepository.save(verificationCode);
        
        // Отправляем email
        emailService.sendVerificationCode(email, code, VerificationCode.CodeType.LOGIN);
        
        logger.info("Login code sent for user: {}", email);
        return "Код для входа отправлен на ваш email";
    }
    
    // Верификация кода
    public User verifyCode(String email, String code, VerificationCode.CodeType type) throws Exception {
        logger.info("Verifying code for email: {} and type: {}", email, type);
        
        // Ищем код
        Optional<VerificationCode> codeOpt = verificationCodeRepository
                .findByEmailAndCodeAndType(email, code, type);
        
        if (codeOpt.isEmpty()) {
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
        logger.info("Resending code for email: {} and type: {}", email, type);
        
        // Проверяем лимит попыток
        if (isRateLimited(email)) {
            throw new Exception("Превышен лимит попыток. Попробуйте позже");
        }
        
        // Проверяем, есть ли активный код
        Optional<VerificationCode> existingCode = verificationCodeRepository
                .findValidCodeByEmailAndType(email, type, LocalDateTime.now());
        
        if (existingCode.isPresent()) {
            throw new Exception("Активный код уже отправлен. Проверьте почту или подождите истечения срока действия");
        }
        
        // Генерируем новый код
        String code = generateVerificationCode();
        VerificationCode verificationCode = new VerificationCode(email, code, type);
        verificationCodeRepository.save(verificationCode);
        
        // Отправляем email
        emailService.sendVerificationCode(email, code, type);
        
        logger.info("Code resent for user: {}", email);
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
                return "/student-dashboard";
            case TEACHER:
                return "/dashboard";
            case MANAGER:
                return "/admin-role"; // Менеджер может использовать админ панель
            case ADMIN:
                return "/admin-role"; // Админ попадает на админ панель
            default:
                return "/student-dashboard";
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