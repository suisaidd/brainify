package com.example.brainify.Repository;

import com.example.brainify.Model.NoteFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NoteFileRepository extends JpaRepository<NoteFile, Long> {
    
    // Найти все файлы конспекта
    List<NoteFile> findByNoteIdOrderByCreatedAtAsc(Long noteId);
    
    // Найти файлы по типу MIME
    List<NoteFile> findByNoteIdAndMimeTypeStartingWithOrderByCreatedAtAsc(Long noteId, String mimeTypePrefix);
    
    // Подсчитать количество файлов конспекта
    long countByNoteId(Long noteId);
    
    // Подсчитать общий размер файлов конспекта
    @Query("SELECT SUM(nf.fileSize) FROM NoteFile nf WHERE nf.note.id = :noteId")
    Long sumFileSizeByNoteId(@Param("noteId") Long noteId);
}
