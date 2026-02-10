package com.example.brainify.Service;

import com.example.brainify.Model.*;
import com.example.brainify.Repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ChatService {

    @Autowired
    private ChatMessageRepository chatMessageRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private StudentTeacherRepository studentTeacherRepository;

    // Допустимые MIME-типы для вложений
    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
        // Изображения
        "image/jpeg", "image/png", "image/gif", "image/webp",
        // Word
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        // Excel
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        // PDF
        "application/pdf",
        // Текст
        "text/plain"
    );

    private static final long MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

    /**
     * Получить список контактов для текущего пользователя.
     * Логика:
     * - STUDENT: «Техподдержка» (закреплена) + все преподаватели
     * - TEACHER: «Техподдержка» (закреплена) + все ученики
     * - ADMIN/MANAGER: все ученики + все преподаватели + другие админы/менеджеры
     */
    public List<Map<String, Object>> getContacts(User currentUser) {
        List<Map<String, Object>> contacts = new ArrayList<>();

        switch (currentUser.getRole()) {
            case STUDENT -> {
                // Техподдержка — один назначенный админ/менеджер
                User support = getAssignedSupportStaff(currentUser);
                if (support != null) {
                    addSupportContact(contacts, support, currentUser);
                }

                // Преподаватели ученика
                List<StudentTeacher> links = studentTeacherRepository.findByStudentAndIsActiveTrue(currentUser);
                Set<Long> addedTeachers = new HashSet<>();
                for (StudentTeacher st : links) {
                    User teacher = st.getTeacher();
                    if (addedTeachers.add(teacher.getId())) {
                        addContact(contacts, teacher, currentUser, false, "Преподаватель — " + st.getSubject().getName());
                    }
                }
            }
            case TEACHER -> {
                // Техподдержка — один назначенный админ/менеджер
                User support = getAssignedSupportStaff(currentUser);
                if (support != null) {
                    addSupportContact(contacts, support, currentUser);
                }

                // Ученики преподавателя
                List<StudentTeacher> links = studentTeacherRepository.findActiveByTeacher(currentUser);
                Set<Long> addedStudents = new HashSet<>();
                for (StudentTeacher st : links) {
                    User student = st.getStudent();
                    if (addedStudents.add(student.getId())) {
                        addContact(contacts, student, currentUser, false, "Ученик — " + st.getSubject().getName());
                    }
                }
            }
            case ADMIN, MANAGER -> {
                // Все ученики
                List<User> students = userRepository.findByRoleAndIsActiveTrue(UserRole.STUDENT);
                for (User s : students) addContact(contacts, s, currentUser, false, "Ученик");

                // Все преподаватели
                List<User> teachers = userRepository.findByRoleAndIsActiveTrue(UserRole.TEACHER);
                for (User t : teachers) addContact(contacts, t, currentUser, false, "Преподаватель");

                // Другие менеджеры/админы
                List<User> managers = userRepository.findByRole(UserRole.MANAGER);
                List<User> admins = userRepository.findByRole(UserRole.ADMIN);
                for (User m : managers) {
                    if (!m.getId().equals(currentUser.getId()))
                        addContact(contacts, m, currentUser, false, "Менеджер");
                }
                for (User a : admins) {
                    if (!a.getId().equals(currentUser.getId()))
                        addContact(contacts, a, currentUser, false, "Администратор");
                }
            }
        }

        // Сортировка: закреплённые сверху, потом по имени
        contacts.sort((a, b) -> {
            boolean pinA = (boolean) a.get("pinned");
            boolean pinB = (boolean) b.get("pinned");
            if (pinA != pinB) return pinA ? -1 : 1;
            return ((String) a.get("name")).compareToIgnoreCase((String) b.get("name"));
        });

        return contacts;
    }

    /**
     * Найти назначенного админа/менеджера для ученика или преподавателя.
     * 1) Если уже есть переписка с кем-то из поддержки — вернуть его.
     * 2) Иначе — выбрать того, у кого меньше всего назначенных собеседников.
     */
    private User getAssignedSupportStaff(User currentUser) {
        List<User> supportStaff = new ArrayList<>();
        supportStaff.addAll(userRepository.findByRole(UserRole.ADMIN));
        supportStaff.addAll(userRepository.findByRole(UserRole.MANAGER));

        if (supportStaff.isEmpty()) return null;
        if (supportStaff.size() == 1) return supportStaff.get(0);

        // Если уже есть переписка — закрепляем за этим сотрудником
        for (User staff : supportStaff) {
            long msgCount = chatMessageRepository.countMessagesBetween(currentUser.getId(), staff.getId());
            if (msgCount > 0) return staff;
        }

        // Нет переписки — выбираем наименее загруженного
        User leastBusy = supportStaff.get(0);
        long minPartners = Long.MAX_VALUE;

        for (User staff : supportStaff) {
            long partners = chatMessageRepository.countUniqueChatPartners(staff.getId());
            if (partners < minPartners) {
                minPartners = partners;
                leastBusy = staff;
            }
        }

        return leastBusy;
    }

    /**
     * Добавить контакт «Техподдержка» — закреплённый, без настоящего имени.
     */
    private void addSupportContact(List<Map<String, Object>> contacts, User user, User currentUser) {
        Map<String, Object> contact = new LinkedHashMap<>();
        contact.put("id", user.getId());
        contact.put("name", "Техподдержка");
        contact.put("role", "SUPPORT");
        contact.put("roleDisplay", "Поддержка");
        contact.put("subtitle", "Поддержка");
        contact.put("pinned", true);
        contact.put("isSupport", true);

        long unread = chatMessageRepository.countUnreadFrom(user.getId(), currentUser.getId());
        contact.put("unread", unread);

        ChatMessage lastMsg = chatMessageRepository.findLastMessage(currentUser.getId(), user.getId());
        if (lastMsg != null) {
            contact.put("lastMessage", lastMsg.hasFile() ? "📎 " + lastMsg.getFileName() : lastMsg.getContent());
            contact.put("lastMessageTime", lastMsg.getCreatedAt().toString());
        } else {
            contact.put("lastMessage", null);
            contact.put("lastMessageTime", null);
        }

        contacts.add(contact);
    }

    private void addContact(List<Map<String, Object>> contacts, User user, User currentUser,
                            boolean pinned, String subtitle) {
        Map<String, Object> contact = new LinkedHashMap<>();
        contact.put("id", user.getId());
        contact.put("name", user.getName());
        contact.put("role", user.getRole().name());
        contact.put("roleDisplay", user.getRole().getDisplayName());
        contact.put("subtitle", subtitle);
        contact.put("pinned", pinned);
        contact.put("isSupport", false);

        // Непрочитанные
        long unread = chatMessageRepository.countUnreadFrom(user.getId(), currentUser.getId());
        contact.put("unread", unread);

        // Последнее сообщение
        ChatMessage lastMsg = chatMessageRepository.findLastMessage(currentUser.getId(), user.getId());
        if (lastMsg != null) {
            contact.put("lastMessage", lastMsg.hasFile() ? "📎 " + lastMsg.getFileName() : lastMsg.getContent());
            contact.put("lastMessageTime", lastMsg.getCreatedAt().toString());
        } else {
            contact.put("lastMessage", null);
            contact.put("lastMessageTime", null);
        }

        contacts.add(contact);
    }

    /**
     * Получить историю сообщений между двумя пользователями
     */
    public List<Map<String, Object>> getMessages(Long userId1, Long userId2) {
        List<ChatMessage> messages = chatMessageRepository.findMessagesBetweenUsers(userId1, userId2);
        return messages.stream().map(this::messageToMap).collect(Collectors.toList());
    }

    /**
     * Получить новые сообщения (для polling)
     */
    public List<Map<String, Object>> getNewMessages(Long userId1, Long userId2, LocalDateTime after) {
        List<ChatMessage> messages = chatMessageRepository.findNewMessages(userId1, userId2, after);
        return messages.stream().map(this::messageToMap).collect(Collectors.toList());
    }

    private Map<String, Object> messageToMap(ChatMessage msg) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", msg.getId());
        m.put("senderId", msg.getSender().getId());
        m.put("senderName", msg.getSender().getName());
        m.put("receiverId", msg.getReceiver().getId());
        m.put("content", msg.getContent());
        m.put("createdAt", msg.getCreatedAt().toString());
        m.put("isRead", msg.getIsRead());
        m.put("hasFile", msg.hasFile());
        if (msg.hasFile()) {
            m.put("fileName", msg.getFileName());
            m.put("fileType", msg.getFileType());
            m.put("mimeType", msg.getMimeType());
            m.put("fileSize", msg.getFileSize());
            m.put("fileSizeFormatted", msg.getFileSizeFormatted());
            m.put("isImage", msg.isImage());
            m.put("isDocument", msg.isDocument());
        }
        return m;
    }

    /**
     * Отправить текстовое сообщение
     */
    @Transactional
    public Map<String, Object> sendMessage(User sender, Long receiverId, String content) {
        User receiver = userRepository.findById(receiverId)
                .orElseThrow(() -> new RuntimeException("Получатель не найден"));

        ChatMessage msg = new ChatMessage(sender, receiver, content);
        msg = chatMessageRepository.save(msg);
        return messageToMap(msg);
    }

    /**
     * Отправить сообщение с файлом
     */
    @Transactional
    public Map<String, Object> sendMessageWithFile(User sender, Long receiverId, String content,
                                                     MultipartFile file) throws IOException {
        User receiver = userRepository.findById(receiverId)
                .orElseThrow(() -> new RuntimeException("Получатель не найден"));

        // Валидация файла
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new RuntimeException("Файл слишком большой. Максимум: 20 МБ");
        }

        String mimeType = file.getContentType();
        if (mimeType == null || !ALLOWED_MIME_TYPES.contains(mimeType)) {
            throw new RuntimeException("Недопустимый тип файла. Разрешены: изображения, Word, Excel, PDF");
        }

        ChatMessage msg = new ChatMessage(sender, receiver, content);
        msg.setFileData(file.getBytes());
        msg.setFileName(file.getOriginalFilename());
        msg.setMimeType(mimeType);
        msg.setFileSize(file.getSize());

        // Определяем расширение
        String originalName = file.getOriginalFilename();
        if (originalName != null && originalName.contains(".")) {
            msg.setFileType(originalName.substring(originalName.lastIndexOf(".") + 1).toLowerCase());
        }

        msg = chatMessageRepository.save(msg);
        return messageToMap(msg);
    }

    /**
     * Получить файл из сообщения
     */
    public ChatMessage getMessageWithFile(Long messageId) {
        return chatMessageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Сообщение не найдено"));
    }

    /**
     * Пометить сообщения как прочитанные
     */
    @Transactional
    public void markAsRead(Long senderId, Long receiverId) {
        chatMessageRepository.markAsRead(senderId, receiverId);
    }

    /**
     * Общее количество непрочитанных
     */
    public long getTotalUnread(Long userId) {
        return chatMessageRepository.countTotalUnread(userId);
    }
}
