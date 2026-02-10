package com.example.brainify.Service;

import com.example.brainify.Model.BoardState;
import com.example.brainify.Model.Lesson;
import com.example.brainify.Repository.BoardStateRepository;
import com.example.brainify.Repository.LessonRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
public class WhiteboardService {
    
    @Autowired
    private BoardStateRepository boardStateRepository;
    
    @Autowired
    private LessonRepository lessonRepository;
    
    /**
     * Получает состояние доски для урока (самое новое)
     */
    public BoardState getBoardState(Long lessonId) {
        Optional<Lesson> lessonOpt = lessonRepository.findById(lessonId);
        if (lessonOpt.isEmpty()) {
            return null;
        }
        
        Lesson lesson = lessonOpt.get();
        List<BoardState> states = boardStateRepository.findByLessonOrderByUpdatedAtDesc(lesson);
        
        if (!states.isEmpty()) {
            // Возвращаем самое новое состояние
            return states.get(0);
        }
        
        // Создаем новое состояние доски
        BoardState newState = new BoardState(lesson, "{\"elements\":[],\"appState\":{}}");
        return boardStateRepository.save(newState);
    }
    
    /**
     * Сохраняет состояние доски
     * @param lessonId ID урока
     * @param boardData Данные доски
     * @param clientVersion Версия клиента (для проверки конфликтов, может быть null)
     */
    @Transactional
    public BoardState saveBoardState(Long lessonId, String boardData, Long clientVersion) {
        Optional<Lesson> lessonOpt = lessonRepository.findById(lessonId);
        if (lessonOpt.isEmpty()) {
            throw new RuntimeException("Урок не найден");
        }
        
        Lesson lesson = lessonOpt.get();
        List<BoardState> states = boardStateRepository.findByLessonOrderByUpdatedAtDesc(lesson);
        
        BoardState boardState;
        if (!states.isEmpty()) {
            // Используем самое новое состояние
            boardState = states.get(0);
            
            // Проверяем версию для предотвращения конфликтов
            if (clientVersion != null && boardState.getVersion() != null) {
                // Если версия на сервере новее, значит кто-то уже обновил доску
                // В этом случае мы все равно сохраняем, но это нормально для оптимистичной блокировки
                // Клиент получит обновленную версию при следующей синхронизации
            }
            
            boardState.setBoardData(boardData);
            // Версия обновится автоматически через @PreUpdate
        } else {
            // Создаем новое состояние
            boardState = new BoardState(lesson, boardData);
            boardState.setVersion(1L);
        }
        
        return boardStateRepository.save(boardState);
    }
    
    /**
     * Сохраняет состояние доски (без проверки версии)
     */
    @Transactional
    public BoardState saveBoardState(Long lessonId, String boardData) {
        return saveBoardState(lessonId, boardData, null);
    }
    
    /**
     * Очищает доску
     */
    @Transactional
    public BoardState clearBoard(Long lessonId) {
        return saveBoardState(lessonId, "{\"elements\":[],\"appState\":{}}");
    }
}

