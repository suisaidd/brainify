package com.example.brainify.Model;

import jakarta.persistence.*;

@Entity
@Table(name = "block_task_answers")
public class BlockTaskAnswer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "block_id", nullable = false)
    private Long blockId; // ID блока (ChapterBlock или SectionBlock)

    @Column(name = "block_type", nullable = false)
    private String blockType; // "CHAPTER" или "SECTION"

    @Column(name = "correct_answer", columnDefinition = "TEXT")
    private String correctAnswer; // Правильный ответ

    @Column(name = "task_image", columnDefinition = "BYTEA")
    private byte[] taskImage; // Сжатое изображение для задания

    @Column(name = "image_type")
    private String imageType; // jpg, png, etc.

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getBlockId() { return blockId; }
    public void setBlockId(Long blockId) { this.blockId = blockId; }

    public String getBlockType() { return blockType; }
    public void setBlockType(String blockType) { this.blockType = blockType; }

    public String getCorrectAnswer() { return correctAnswer; }
    public void setCorrectAnswer(String correctAnswer) { this.correctAnswer = correctAnswer; }

    public byte[] getTaskImage() { return taskImage; }
    public void setTaskImage(byte[] taskImage) { this.taskImage = taskImage; }

    public String getImageType() { return imageType; }
    public void setImageType(String imageType) { this.imageType = imageType; }
}

