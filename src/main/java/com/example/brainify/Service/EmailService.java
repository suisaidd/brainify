package com.example.brainify.Service;

import com.example.brainify.Model.VerificationCode;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

@Service
public class EmailService {
    
    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);
    
    @Autowired
    private JavaMailSender emailSender;
    
    @Value("${spring.mail.username}")
    private String fromEmail;
    
    public void sendVerificationCode(String toEmail, String code, VerificationCode.CodeType type) {
        try {
            MimeMessage message = emailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            
            helper.setFrom(fromEmail);
            helper.setTo(toEmail);
            
            String subject;
            String htmlContent;
            
            if (type == VerificationCode.CodeType.REGISTRATION) {
                subject = "Подтверждение регистрации - Brainify";
                htmlContent = createRegistrationEmailContent(code);
            } else {
                subject = "Код для входа - Brainify";
                htmlContent = createLoginEmailContent(code);
            }
            
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            
            emailSender.send(message);
            logger.info("Verification email sent successfully to: {}", toEmail);
            
        } catch (MessagingException e) {
            logger.error("Failed to send verification email to: {}", toEmail, e);
            throw new RuntimeException("Ошибка отправки email", e);
        }
    }
    
    private String createRegistrationEmailContent(String code) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #3b82f6, #1e40af); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
                    .code { background: white; border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
                    .code-number { font-size: 32px; font-weight: bold; color: #1e40af; letter-spacing: 5px; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
                    .warning { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Добро пожаловать в Brainify!</h1>
                        <p>Подтвердите свою регистрацию</p>
                    </div>
                    <div class="content">
                        <h2>Здравствуйте!</h2>
                        <p>Спасибо за регистрацию на платформе Brainify. Для завершения регистрации введите код подтверждения:</p>
                        
                        <div class="code">
                            <p>Код подтверждения:</p>
                            <div class="code-number">%s</div>
                        </div>
                        
                        <div class="warning">
                            <strong>Важно:</strong> Код действителен в течение 10 минут. Никому не сообщайте этот код.
                        </div>
                        
                        <p>Если вы не регистрировались на Brainify, просто проигнорируйте это письмо.</p>
                    </div>
                    <div class="footer">
                        <p>&copy; 2024 Brainify. Все права защищены.</p>
                        <p>Это автоматическое письмо, не отвечайте на него.</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(code);
    }
    
    private String createLoginEmailContent(String code) {
        return """
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f8fafc; padding: 30px; border-radius: 0 0 10px 10px; }
                    .code { background: white; border: 2px solid #10b981; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
                    .code-number { font-size: 32px; font-weight: bold; color: #059669; letter-spacing: 5px; }
                    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
                    .warning { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Код для входа</h1>
                        <p>Brainify</p>
                    </div>
                    <div class="content">
                        <h2>Добро пожаловать обратно!</h2>
                        <p>Для входа в ваш личный кабинет введите код подтверждения:</p>
                        
                        <div class="code">
                            <p>Код для входа:</p>
                            <div class="code-number">%s</div>
                        </div>
                        
                        <div class="warning">
                            <strong>Важно:</strong> Код действителен в течение 10 минут. Никому не сообщайте этот код.
                        </div>
                        
                        <p>Если вы не пытались войти в систему, обратитесь в службу поддержки.</p>
                    </div>
                    <div class="footer">
                        <p>&copy; 2024 Brainify. Все права защищены.</p>
                        <p>Это автоматическое письмо, не отвечайте на него.</p>
                    </div>
                </div>
            </body>
            </html>
            """.formatted(code);
    }
    
    // Отправка простого текстового email (fallback)
    public void sendSimpleEmail(String toEmail, String subject, String text) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject(subject);
            message.setText(text);
            
            emailSender.send(message);
            logger.info("Simple email sent successfully to: {}", toEmail);
            
        } catch (Exception e) {
            logger.error("Failed to send simple email to: {}", toEmail, e);
            throw new RuntimeException("Ошибка отправки email", e);
        }
    }
} 