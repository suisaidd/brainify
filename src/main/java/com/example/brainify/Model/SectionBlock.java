package com.example.brainify.Model;

import jakarta.persistence.*;

@Entity
@Table(name = "section_blocks")
public class SectionBlock {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "section_id", nullable = false)
    private CourseSection section;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BlockType type = BlockType.TEXT;

    @Column
    private String title;

    @Column(columnDefinition = "TEXT")
    private String textContent; // для TEXT

    @Column
    private String imageUrl; // для IMAGE

    @Column(name = "initial_sql", columnDefinition = "TEXT")
    private String initialSql; // стартовый SQL код

    @Column(name = "expected_result", columnDefinition = "TEXT")
    private String expectedResultJson; // JSON с ожидаемым результатом для проверки

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    public enum BlockType { TEXT, IMAGE, SQL_TASK }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public CourseSection getSection() { return section; }
    public void setSection(CourseSection section) { this.section = section; }
    public BlockType getType() { return type; }
    public void setType(BlockType type) { this.type = type; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getTextContent() { return textContent; }
    public void setTextContent(String textContent) { this.textContent = textContent; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public String getInitialSql() { return initialSql; }
    public void setInitialSql(String initialSql) { this.initialSql = initialSql; }
    public String getExpectedResultJson() { return expectedResultJson; }
    public void setExpectedResultJson(String expectedResultJson) { this.expectedResultJson = expectedResultJson; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer sortOrder) { this.sortOrder = sortOrder; }
}


