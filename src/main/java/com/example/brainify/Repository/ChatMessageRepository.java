package com.example.brainify.Repository;

import com.example.brainify.Model.ChatMessage;
import com.example.brainify.Model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    // Получить сообщения между двумя пользователями (отсортированные по времени)
    @Query("SELECT m FROM ChatMessage m " +
           "WHERE (m.sender.id = :userId1 AND m.receiver.id = :userId2) " +
           "   OR (m.sender.id = :userId2 AND m.receiver.id = :userId1) " +
           "ORDER BY m.createdAt ASC")
    List<ChatMessage> findMessagesBetweenUsers(@Param("userId1") Long userId1,
                                                @Param("userId2") Long userId2);

    // Получить новые сообщения после определённого времени (для polling)
    @Query("SELECT m FROM ChatMessage m " +
           "WHERE ((m.sender.id = :userId1 AND m.receiver.id = :userId2) " +
           "    OR (m.sender.id = :userId2 AND m.receiver.id = :userId1)) " +
           "  AND m.createdAt > :after " +
           "ORDER BY m.createdAt ASC")
    List<ChatMessage> findNewMessages(@Param("userId1") Long userId1,
                                       @Param("userId2") Long userId2,
                                       @Param("after") LocalDateTime after);

    // Пометить все сообщения от пользователя как прочитанные
    @Modifying
    @Transactional
    @Query("UPDATE ChatMessage m SET m.isRead = true " +
           "WHERE m.sender.id = :senderId AND m.receiver.id = :receiverId AND m.isRead = false")
    void markAsRead(@Param("senderId") Long senderId, @Param("receiverId") Long receiverId);

    // Количество непрочитанных сообщений от конкретного пользователя
    @Query("SELECT COUNT(m) FROM ChatMessage m " +
           "WHERE m.sender.id = :senderId AND m.receiver.id = :receiverId AND m.isRead = false")
    long countUnreadFrom(@Param("senderId") Long senderId, @Param("receiverId") Long receiverId);

    // Общее количество непрочитанных сообщений для пользователя
    @Query("SELECT COUNT(m) FROM ChatMessage m WHERE m.receiver.id = :userId AND m.isRead = false")
    long countTotalUnread(@Param("userId") Long userId);

    // Последнее сообщение между двумя пользователями
    @Query("SELECT m FROM ChatMessage m " +
           "WHERE (m.sender.id = :userId1 AND m.receiver.id = :userId2) " +
           "   OR (m.sender.id = :userId2 AND m.receiver.id = :userId1) " +
           "ORDER BY m.createdAt DESC LIMIT 1")
    ChatMessage findLastMessage(@Param("userId1") Long userId1, @Param("userId2") Long userId2);

    // Все уникальные собеседники пользователя (кто писал или кому писал)
    @Query("SELECT DISTINCT u FROM User u WHERE u.id IN (" +
           "  SELECT m.receiver.id FROM ChatMessage m WHERE m.sender.id = :userId " +
           "  UNION " +
           "  SELECT m.sender.id FROM ChatMessage m WHERE m.receiver.id = :userId" +
           ")")
    List<User> findChatPartners(@Param("userId") Long userId);

    // Количество сообщений между двумя пользователями (для проверки существования переписки)
    @Query("SELECT COUNT(m) FROM ChatMessage m " +
           "WHERE (m.sender.id = :userId1 AND m.receiver.id = :userId2) " +
           "   OR (m.sender.id = :userId2 AND m.receiver.id = :userId1)")
    long countMessagesBetween(@Param("userId1") Long userId1, @Param("userId2") Long userId2);

    // Количество уникальных собеседников пользователя
    @Query("SELECT COUNT(DISTINCT CASE " +
           "WHEN m.sender.id = :userId THEN m.receiver.id " +
           "ELSE m.sender.id END) " +
           "FROM ChatMessage m " +
           "WHERE m.sender.id = :userId OR m.receiver.id = :userId")
    long countUniqueChatPartners(@Param("userId") Long userId);
}
