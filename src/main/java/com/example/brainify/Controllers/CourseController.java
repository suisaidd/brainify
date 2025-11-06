package com.example.brainify.Controllers;

import com.example.brainify.Config.SessionManager;
import com.example.brainify.Model.*;
import com.example.brainify.Repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpSession;
import java.time.LocalDateTime;
import java.util.*;

@Controller
public class CourseController {

    @Autowired private SessionManager sessionManager;
    @Autowired private SubjectRepository subjectRepository;
    @Autowired private CourseModuleRepository moduleRepository;
    @Autowired private CourseChapterRepository chapterRepository;
    @Autowired private CourseSectionRepository sectionRepository;
    @Autowired private SectionProgressRepository progressRepository;
    @Autowired private SectionBlockRepository sectionBlockRepository;
    @Autowired private com.example.brainify.Repository.ChapterBlockRepository chapterBlockRepository;
    @Autowired private com.example.brainify.Service.SqlTaskService sqlTaskService;

    @GetMapping("/course/{subjectId}")
    public String courseOverview(@PathVariable Long subjectId,
                                 @RequestParam(name = "moduleId", required = false) Long moduleId,
                                 Model model, HttpSession session) {
        Optional<Subject> subjectOpt = subjectRepository.findById(subjectId);
        if (subjectOpt.isEmpty()) {
            return "redirect:/study-map";
        }

        User currentUser = sessionManager.getCurrentUser(session);
        model.addAttribute("currentUser", currentUser);
        model.addAttribute("isAuthenticated", currentUser != null);
        model.addAttribute("pageTitle", subjectOpt.get().getName() + " – Курс");

        List<CourseModule> modules = moduleRepository.findBySubjectIdOrderBySortOrderAsc(subjectId);
        Map<Long, List<CourseChapter>> moduleToChapters = new HashMap<>();
        Map<Long, List<CourseSection>> chapterToSections = new HashMap<>();

        for (CourseModule m : modules) {
            List<CourseChapter> chapters = chapterRepository.findByModuleIdOrderBySortOrderAsc(m.getId());
            moduleToChapters.put(m.getId(), chapters);
            for (CourseChapter ch : chapters) {
                chapterToSections.put(ch.getId(), sectionRepository.findByChapterIdOrderBySortOrderAsc(ch.getId()));
            }
        }

        // Счетчики для hero-блока
        int totalModules = modules.size();
        int totalChapters = moduleToChapters.values().stream().mapToInt(List::size).sum();
        int totalSections = chapterToSections.values().stream().mapToInt(List::size).sum();

        // Индексация модулей (для подписи «Модуль N»)
        Map<Long, Integer> moduleIndex = new HashMap<>();
        for (int i = 0; i < modules.size(); i++) {
            moduleIndex.put(modules.get(i).getId(), i);
        }

        CourseModule selectedModule = null;
        if (moduleId != null) {
            for (CourseModule m : modules) { if (m.getId().equals(moduleId)) { selectedModule = m; break; } }
        }
        if (selectedModule == null && !modules.isEmpty()) {
            selectedModule = modules.get(0);
        }

        // Простой флаг доступа для первой незавершенной секции в каждой главе
        Set<Long> unlockedSectionIds = new HashSet<>();
        // Прогресс: завершенные секции для текущего пользователя
        Set<Long> completedSectionIds = new HashSet<>();
        if (currentUser != null) {
            for (Map.Entry<Long, List<CourseSection>> e : chapterToSections.entrySet()) {
                boolean foundIncomplete = false;
                for (CourseSection sct : e.getValue()) {
                    boolean completed = progressRepository.findByUserIdAndSectionId(currentUser.getId(), sct.getId()).isPresent();
                    if (completed) { completedSectionIds.add(sct.getId()); }
                    if (!completed && !foundIncomplete) {
                        unlockedSectionIds.add(sct.getId());
                        foundIncomplete = true;
                    }
                }
                if (!foundIncomplete && !e.getValue().isEmpty()) {
                    unlockedSectionIds.add(e.getValue().get(0).getId());
                }
            }
        }

        // Прогресс по главам и модулям
        Map<Long, Integer> chapterTotalSections = new HashMap<>();
        Map<Long, Integer> chapterCompletedSections = new HashMap<>();
        Set<Long> completedChapterIds = new HashSet<>();
        for (Map.Entry<Long, List<CourseSection>> e : chapterToSections.entrySet()) {
            int total = e.getValue().size();
            int done = 0;
            for (CourseSection sct : e.getValue()) {
                if (completedSectionIds.contains(sct.getId())) done++;
            }
            chapterTotalSections.put(e.getKey(), total);
            chapterCompletedSections.put(e.getKey(), done);
            if (total > 0 && done == total) completedChapterIds.add(e.getKey());
        }

        Map<Long, Integer> moduleTotalChapters = new HashMap<>();
        Map<Long, Integer> moduleCompletedChapters = new HashMap<>();
        Set<Long> completedModuleIds = new HashSet<>();
        for (CourseModule m : modules) {
            List<CourseChapter> chapters = moduleToChapters.getOrDefault(m.getId(), Collections.emptyList());
            int totalCh = chapters.size();
            int doneCh = 0;
            for (CourseChapter ch : chapters) {
                if (completedChapterIds.contains(ch.getId())) doneCh++;
            }
            moduleTotalChapters.put(m.getId(), totalCh);
            moduleCompletedChapters.put(m.getId(), doneCh);
            if (totalCh > 0 && doneCh == totalCh) completedModuleIds.add(m.getId());
        }

        model.addAttribute("subject", subjectOpt.get());
        model.addAttribute("modules", modules);
        model.addAttribute("selectedModule", selectedModule);
        model.addAttribute("moduleToChapters", moduleToChapters);
        model.addAttribute("chapterToSections", chapterToSections);
        model.addAttribute("unlockedSectionIds", unlockedSectionIds);
        model.addAttribute("completedSectionIds", completedSectionIds);
        model.addAttribute("chapterTotalSections", chapterTotalSections);
        model.addAttribute("chapterCompletedSections", chapterCompletedSections);
        model.addAttribute("completedChapterIds", completedChapterIds);
        model.addAttribute("moduleTotalChapters", moduleTotalChapters);
        model.addAttribute("moduleCompletedChapters", moduleCompletedChapters);
        model.addAttribute("completedModuleIds", completedModuleIds);
        model.addAttribute("totalModules", totalModules);
        model.addAttribute("totalChapters", totalChapters);
        model.addAttribute("totalSections", totalSections);
        model.addAttribute("moduleIndex", moduleIndex);

        return "course";
    }

    @GetMapping("/course/{subjectId}/edit")
    public String editCourse(@PathVariable Long subjectId, Model model, HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || currentUser.getRole() == null || !currentUser.getRole().name().equals("ADMIN")) {
            return "redirect:/course/" + subjectId;
        }

        Optional<Subject> subjectOpt = subjectRepository.findById(subjectId);
        if (subjectOpt.isEmpty()) {
            return "redirect:/study-map";
        }

        List<CourseModule> modules = moduleRepository.findBySubjectIdOrderBySortOrderAsc(subjectId);
        Map<Long, List<CourseChapter>> moduleToChapters = new HashMap<>();
        Map<Long, List<CourseSection>> chapterToSections = new HashMap<>();
        for (CourseModule m : modules) {
            List<CourseChapter> chapters = chapterRepository.findByModuleIdOrderBySortOrderAsc(m.getId());
            moduleToChapters.put(m.getId(), chapters);
            for (CourseChapter ch : chapters) {
                chapterToSections.put(ch.getId(), sectionRepository.findByChapterIdOrderBySortOrderAsc(ch.getId()));
            }
        }

        model.addAttribute("pageTitle", "Редактирование курса – " + subjectOpt.get().getName());
        model.addAttribute("currentUser", currentUser);
        model.addAttribute("subject", subjectOpt.get());
        model.addAttribute("modules", modules);
        model.addAttribute("moduleToChapters", moduleToChapters);
        model.addAttribute("chapterToSections", chapterToSections);
        return "course-edit";
    }

    @PostMapping("/admin/course/module")
    public String createModule(@RequestParam Long subjectId,
                               @RequestParam String title,
                               @RequestParam(required = false) String description,
                               @RequestParam(required = false, defaultValue = "0") Integer sortOrder,
                               HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || currentUser.getRole() == null || !currentUser.getRole().name().equals("ADMIN")) {
            return "redirect:/course/" + subjectId;
        }
        Optional<Subject> subj = subjectRepository.findById(subjectId);
        if (subj.isEmpty()) return "redirect:/study-map";
        CourseModule m = new CourseModule();
        m.setSubject(subj.get());
        m.setTitle(title);
        m.setDescription(description);
        m.setSortOrder(sortOrder == null ? 0 : sortOrder);
        moduleRepository.save(m);
        return "redirect:/course/" + subjectId + "/edit";
    }

    @PostMapping("/admin/course/chapter")
    public String createChapter(@RequestParam Long moduleId,
                                @RequestParam String title,
                                @RequestParam(required = false) String content,
                                @RequestParam(required = false, defaultValue = "0") Integer sortOrder,
                                HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || currentUser.getRole() == null || !currentUser.getRole().name().equals("ADMIN")) {
            // Найдем subjectId для редиректа
            Optional<CourseModule> mod = moduleRepository.findById(moduleId);
            Long subjectId = mod.map(CourseModule::getSubject).map(Subject::getId).orElse(0L);
            return "redirect:/course/" + subjectId;
        }
        Optional<CourseModule> mod = moduleRepository.findById(moduleId);
        if (mod.isEmpty()) return "redirect:/study-map";
        CourseChapter ch = new CourseChapter();
        ch.setModule(mod.get());
        ch.setTitle(title);
        ch.setContent(content);
        ch.setSortOrder(sortOrder == null ? 0 : sortOrder);
        chapterRepository.save(ch);
        Long subjectId = mod.get().getSubject().getId();
        return "redirect:/course/" + subjectId + "/edit";
    }

    @PostMapping("/admin/course/chapter/update")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> updateChapter(@RequestBody Map<String, Object> req, HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || !currentUser.getRole().name().equals("ADMIN")) {
            return ResponseEntity.status(403).body(Map.of("success", false));
        }
        Long chapterId = Long.valueOf(String.valueOf(req.get("chapterId")));
        String content = String.valueOf(req.get("content"));
        
        Optional<CourseChapter> chapterOpt = chapterRepository.findById(chapterId);
        if (chapterOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false));
        }
        
        CourseChapter chapter = chapterOpt.get();
        chapter.setContent(content);
        chapterRepository.save(chapter);
        
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/admin/course/section")
    public String createSection(@RequestParam Long chapterId,
                                @RequestParam String title,
                                @RequestParam(required = false) String content,
                                @RequestParam(required = false, defaultValue = "0") Integer sortOrder,
                                HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || currentUser.getRole() == null || !currentUser.getRole().name().equals("ADMIN")) {
            Optional<CourseChapter> ch = chapterRepository.findById(chapterId);
            Long subjectId = ch.map(c -> c.getModule().getSubject().getId()).orElse(0L);
            return "redirect:/course/" + subjectId;
        }
        Optional<CourseChapter> ch = chapterRepository.findById(chapterId);
        if (ch.isEmpty()) return "redirect:/study-map";
        CourseSection s = new CourseSection();
        s.setChapter(ch.get());
        s.setTitle(title);
        s.setContent(content);
        s.setSortOrder(sortOrder == null ? 0 : sortOrder);
        sectionRepository.save(s);
        Long subjectId = ch.get().getModule().getSubject().getId();
        return "redirect:/course/" + subjectId + "/edit";
    }

    @PostMapping("/admin/course/block")
    public String createBlock(@RequestParam Long sectionId,
                              @RequestParam String type,
                              @RequestParam(required = false) String title,
                              @RequestParam(required = false) String textContent,
                              @RequestParam(required = false) String imageUrl,
                              @RequestParam(required = false) String initialSql,
                              @RequestParam(required = false) String expectedResultJson,
                              @RequestParam(required = false, defaultValue = "0") Integer sortOrder,
                              HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || currentUser.getRole() == null || !currentUser.getRole().name().equals("ADMIN")) {
            Optional<CourseSection> sct = sectionRepository.findById(sectionId);
            Long subjectId = sct.map(sec -> sec.getChapter().getModule().getSubject().getId()).orElse(0L);
            return "redirect:/course/" + subjectId;
        }
        Optional<CourseSection> sct = sectionRepository.findById(sectionId);
        if (sct.isEmpty()) return "redirect:/study-map";
        com.example.brainify.Model.SectionBlock b = new com.example.brainify.Model.SectionBlock();
        b.setSection(sct.get());
        try { b.setType(com.example.brainify.Model.SectionBlock.BlockType.valueOf(type)); } catch (Exception ignored) {}
        b.setTitle(title);
        b.setTextContent(textContent);
        b.setImageUrl(imageUrl);
        b.setInitialSql(initialSql);
        b.setExpectedResultJson(expectedResultJson);
        b.setSortOrder(sortOrder == null ? 0 : sortOrder);
        sectionBlockRepository.save(b);
        Long subjectId = sct.get().getChapter().getModule().getSubject().getId();
        return "redirect:/course/" + subjectId + "/edit";
    }

    @PostMapping("/api/admin/course/section/block")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> createSectionBlockJson(@RequestParam Long sectionId,
                                                                      @RequestParam String type,
                                                                      @RequestParam(required = false) String title,
                                                                      @RequestParam(required = false) String textContent,
                                                                      @RequestParam(required = false) String imageUrl,
                                                                      @RequestParam(required = false) String initialSql,
                                                                      @RequestParam(required = false) String expectedResultJson,
                                                                      @RequestParam(required = false, defaultValue = "0") Integer sortOrder,
                                                                      HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || currentUser.getRole() == null || !currentUser.getRole().name().equals("ADMIN")) {
            return ResponseEntity.status(403).body(Map.of("success", false));
        }
        Optional<CourseSection> sct = sectionRepository.findById(sectionId);
        if (sct.isEmpty()) return ResponseEntity.badRequest().body(Map.of("success", false));
        SectionBlock b = new SectionBlock();
        b.setSection(sct.get());
        try { b.setType(SectionBlock.BlockType.valueOf(type)); } catch (Exception ignored) {}
        b.setTitle(title);
        b.setTextContent(textContent);
        b.setImageUrl(imageUrl);
        b.setInitialSql(initialSql);
        b.setExpectedResultJson(expectedResultJson);
        b.setSortOrder(sortOrder == null ? 0 : sortOrder);
        sectionBlockRepository.save(b);
        return ResponseEntity.ok(Map.of("success", true, "id", b.getId()));
    }
    @GetMapping("/course/chapter/{chapterId}")
    public String viewChapter(@PathVariable Long chapterId, Model model, HttpSession session) {
        Optional<CourseChapter> chapterOpt = chapterRepository.findById(chapterId);
        if (chapterOpt.isEmpty()) {
            return "redirect:/study-map";
        }

        CourseChapter chapter = chapterOpt.get();
        CourseModule module = chapter.getModule();
        Subject subject = module.getSubject();

        User currentUser = sessionManager.getCurrentUser(session);
        model.addAttribute("currentUser", currentUser);
        model.addAttribute("isAuthenticated", currentUser != null);
        model.addAttribute("pageTitle", chapter.getTitle());

        // Все главы модуля для навигации
        List<CourseChapter> chapters = chapterRepository.findByModuleIdOrderBySortOrderAsc(module.getId());
        Map<Long, List<CourseSection>> chapterToSections = new HashMap<>();
        for (CourseChapter ch : chapters) {
            chapterToSections.put(ch.getId(), sectionRepository.findByChapterIdOrderBySortOrderAsc(ch.getId()));
        }

        // Разделы текущей главы
        List<CourseSection> sections = sectionRepository.findByChapterIdOrderBySortOrderAsc(chapterId);

        // Прогресс
        Set<Long> unlockedSectionIds = new HashSet<>();
        Set<Long> completedSectionIds = new HashSet<>();
        if (currentUser != null) {
            for (CourseSection s : sections) {
                boolean completed = progressRepository.findByUserIdAndSectionId(currentUser.getId(), s.getId()).isPresent();
                if (completed) {
                    completedSectionIds.add(s.getId());
                }
            }
            // Первый незавершенный раздел разблокирован
            for (CourseSection s : sections) {
                if (!completedSectionIds.contains(s.getId())) {
                    unlockedSectionIds.add(s.getId());
                    break;
                }
            }
        }

        model.addAttribute("subject", subject);
        model.addAttribute("module", module);
        model.addAttribute("chapter", chapter);
        model.addAttribute("chapters", chapters);
        model.addAttribute("chapterToSections", chapterToSections);
        model.addAttribute("blocks", chapterBlockRepository.findByChapterIdOrderBySortOrderAsc(chapterId));

        return "chapter-view";
    }

    @PostMapping("/admin/course/chapter/block")
    public String createChapterBlock(@RequestParam Long chapterId,
                                     @RequestParam String type,
                                     @RequestParam(required = false) String title,
                                     @RequestParam(required = false) String textContent,
                                     @RequestParam(required = false) String imageUrl,
                                     @RequestParam(required = false) String initialSql,
                                     @RequestParam(required = false) String expectedResultJson,
                                     @RequestParam(required = false, defaultValue = "0") Integer sortOrder,
                                     HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || !currentUser.getRole().name().equals("ADMIN")) {
            return "redirect:/course/chapter/" + chapterId;
        }
        
        Optional<CourseChapter> chapterOpt = chapterRepository.findById(chapterId);
        if (chapterOpt.isEmpty()) return "redirect:/study-map";
        
        com.example.brainify.Model.ChapterBlock b = new com.example.brainify.Model.ChapterBlock();
        b.setChapter(chapterOpt.get());
        try { 
            b.setType(com.example.brainify.Model.ChapterBlock.BlockType.valueOf(type)); 
        } catch (Exception ignored) {}
        b.setTitle(title);
        b.setTextContent(textContent);
        b.setImageUrl(imageUrl);
        b.setInitialSql(initialSql);
        b.setExpectedResultJson(expectedResultJson);
        b.setSortOrder(sortOrder == null ? 0 : sortOrder);
        chapterBlockRepository.save(b);
        
        return "redirect:/course/chapter/" + chapterId;
    }

    @PostMapping("/api/admin/course/chapter/block")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> createChapterBlockJson(@RequestParam Long chapterId,
                                                                      @RequestParam String type,
                                                                      @RequestParam(required = false) String title,
                                                                      @RequestParam(required = false) String textContent,
                                                                      @RequestParam(required = false) String imageUrl,
                                                                      @RequestParam(required = false) String initialSql,
                                                                      @RequestParam(required = false) String expectedResultJson,
                                                                      @RequestParam(required = false, defaultValue = "0") Integer sortOrder,
                                                                      HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || currentUser.getRole() == null || !currentUser.getRole().name().equals("ADMIN")) {
            return ResponseEntity.status(403).body(Map.of("success", false));
        }
        Optional<CourseChapter> chapterOpt = chapterRepository.findById(chapterId);
        if (chapterOpt.isEmpty()) return ResponseEntity.badRequest().body(Map.of("success", false));

        ChapterBlock b = new ChapterBlock();
        b.setChapter(chapterOpt.get());
        try { b.setType(ChapterBlock.BlockType.valueOf(type)); } catch (Exception ignored) {}
        b.setTitle(title);
        b.setTextContent(textContent);
        b.setImageUrl(imageUrl);
        b.setInitialSql(initialSql);
        b.setExpectedResultJson(expectedResultJson);
        b.setSortOrder(sortOrder == null ? 0 : sortOrder);
        chapterBlockRepository.save(b);

        return ResponseEntity.ok(Map.of("success", true, "id", b.getId()));
    }

    @GetMapping("/course/section/{sectionId}")
    public String viewSection(@PathVariable Long sectionId, Model model, HttpSession session) {
        Optional<CourseSection> sectionOpt = sectionRepository.findById(sectionId);
        if (sectionOpt.isEmpty()) {
            return "redirect:/study-map";
        }

        CourseSection section = sectionOpt.get();
        CourseChapter chapter = section.getChapter();
        CourseModule module = chapter.getModule();
        Subject subject = module.getSubject();

        User currentUser = sessionManager.getCurrentUser(session);
        model.addAttribute("currentUser", currentUser);
        model.addAttribute("isAuthenticated", currentUser != null);
        model.addAttribute("pageTitle", section.getTitle());

        // Левая карта: все главы и разделы текущего модуля
        List<CourseChapter> chapters = chapterRepository.findByModuleIdOrderBySortOrderAsc(module.getId());
        Map<Long, List<CourseSection>> chapterToSections = new HashMap<>();
        for (CourseChapter ch : chapters) {
            chapterToSections.put(ch.getId(), sectionRepository.findByChapterIdOrderBySortOrderAsc(ch.getId()));
        }

        // Доступ к разделам в рамках глав по незавершенности
        Set<Long> unlockedSectionIds = new HashSet<>();
        if (currentUser != null) {
            for (Map.Entry<Long, List<CourseSection>> e : chapterToSections.entrySet()) {
                boolean foundIncomplete = false;
                for (CourseSection sct : e.getValue()) {
                    boolean completed = progressRepository.findByUserIdAndSectionId(currentUser.getId(), sct.getId()).isPresent();
                    if (!completed && !foundIncomplete) {
                        unlockedSectionIds.add(sct.getId());
                        foundIncomplete = true;
                    }
                }
                if (!foundIncomplete && !e.getValue().isEmpty()) {
                    unlockedSectionIds.add(e.getValue().get(0).getId());
                }
            }
        }

        model.addAttribute("subject", subject);
        model.addAttribute("module", module);
        model.addAttribute("chapter", chapter);
        model.addAttribute("chapters", chapters);
        model.addAttribute("chapterToSections", chapterToSections);
        model.addAttribute("unlockedSectionIds", unlockedSectionIds);
        model.addAttribute("section", section);
        model.addAttribute("blocks", sectionBlockRepository.findBySectionIdOrderBySortOrderAsc(section.getId()));

        return "section-view";
    }

    @PostMapping("/course/sql/execute")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> execSql(@RequestBody Map<String, String> req, HttpSession session) {
        try {
            String sql = req.getOrDefault("sql", "");
            List<Map<String, Object>> rows = sqlTaskService.executeSelect(sql);
            return ResponseEntity.ok(Map.of("success", true, "rows", rows));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @PostMapping("/admin/course/blocks/reorder")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> reorderBlocks(@RequestBody Map<String, Object> req, HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || currentUser.getRole() == null || !currentUser.getRole().name().equals("ADMIN")) {
            return ResponseEntity.status(403).body(Map.of("success", false));
        }
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> items = (List<Map<String, Object>>) req.get("items");
        if (items == null) return ResponseEntity.badRequest().body(Map.of("success", false));
        for (Map<String, Object> it : items) {
            Long id = Long.valueOf(String.valueOf(it.get("id")));
            Integer order = Integer.valueOf(String.valueOf(it.get("sortOrder")));
            sectionBlockRepository.findById(id).ifPresent(b -> { b.setSortOrder(order); sectionBlockRepository.save(b); });
        }
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/course/section/{sectionId}/complete")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> completeSection(@PathVariable Long sectionId, HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return ResponseEntity.status(401).body(Map.of("success", false, "error", "Необходима авторизация"));
        }

        Optional<CourseSection> sectionOpt = sectionRepository.findById(sectionId);
        if (sectionOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Раздел не найден"));
        }

        Optional<SectionProgress> progressOpt = progressRepository.findByUserIdAndSectionId(currentUser.getId(), sectionId);
        if (progressOpt.isEmpty()) {
            SectionProgress p = new SectionProgress();
            p.setUser(currentUser);
            p.setSection(sectionOpt.get());
            p.setCompletedAt(LocalDateTime.now());
            progressRepository.save(p);
        }

        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/admin/course/block/{blockId}/delete")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> deleteSectionBlock(@PathVariable Long blockId, HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || !currentUser.getRole().name().equals("ADMIN")) {
            return ResponseEntity.status(403).body(Map.of("success", false));
        }
        
        sectionBlockRepository.deleteById(blockId);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @PostMapping("/admin/course/chapter/block/{blockId}/delete")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> deleteChapterBlock(@PathVariable Long blockId, HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || !currentUser.getRole().name().equals("ADMIN")) {
            return ResponseEntity.status(403).body(Map.of("success", false));
        }
        
        chapterBlockRepository.deleteById(blockId);
        return ResponseEntity.ok(Map.of("success", true));
    }

    @GetMapping("/api/blocks/{blockId}/data")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> getBlockData(@PathVariable Long blockId,
                                                           @RequestParam(name = "scope", required = false) String scope,
                                                           HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || !currentUser.getRole().name().equals("ADMIN")) {
            return ResponseEntity.status(403).body(Map.of("success", false));
        }
        
        // Если задан scope, ищем строго в указанной сущности, чтобы избежать коллизий ID
        if ("SECTION".equalsIgnoreCase(scope)) {
            Optional<SectionBlock> sectionBlock = sectionBlockRepository.findById(blockId);
            if (sectionBlock.isPresent()) {
                SectionBlock block = sectionBlock.get();
                return ResponseEntity.ok(Map.of(
                    "id", block.getId(),
                    "type", block.getType().name(),
                    "title", block.getTitle() != null ? block.getTitle() : "",
                    "textContent", block.getTextContent() != null ? block.getTextContent() : "",
                    "imageUrl", block.getImageUrl() != null ? block.getImageUrl() : "",
                    "initialSql", block.getInitialSql() != null ? block.getInitialSql() : "",
                    "sortOrder", block.getSortOrder()
                ));
            }
            return ResponseEntity.notFound().build();
        } else if ("CHAPTER".equalsIgnoreCase(scope)) {
            Optional<ChapterBlock> chapterBlock = chapterBlockRepository.findById(blockId);
            if (chapterBlock.isPresent()) {
                ChapterBlock block = chapterBlock.get();
                return ResponseEntity.ok(Map.of(
                    "id", block.getId(),
                    "type", block.getType().name(),
                    "title", block.getTitle() != null ? block.getTitle() : "",
                    "textContent", block.getTextContent() != null ? block.getTextContent() : "",
                    "imageUrl", block.getImageUrl() != null ? block.getImageUrl() : "",
                    "initialSql", block.getInitialSql() != null ? block.getInitialSql() : "",
                    "sortOrder", block.getSortOrder()
                ));
            }
            return ResponseEntity.notFound().build();
        }

        // Fallback: пробуем в обоих (для обратной совместимости)
        Optional<SectionBlock> sectionBlock = sectionBlockRepository.findById(blockId);
        if (sectionBlock.isPresent()) {
            SectionBlock block = sectionBlock.get();
            return ResponseEntity.ok(Map.of(
                "id", block.getId(),
                "type", block.getType().name(),
                "title", block.getTitle() != null ? block.getTitle() : "",
                "textContent", block.getTextContent() != null ? block.getTextContent() : "",
                "imageUrl", block.getImageUrl() != null ? block.getImageUrl() : "",
                "initialSql", block.getInitialSql() != null ? block.getInitialSql() : "",
                "sortOrder", block.getSortOrder()
            ));
        }

        Optional<ChapterBlock> chapterBlock = chapterBlockRepository.findById(blockId);
        if (chapterBlock.isPresent()) {
            ChapterBlock block = chapterBlock.get();
            return ResponseEntity.ok(Map.of(
                "id", block.getId(),
                "type", block.getType().name(),
                "title", block.getTitle() != null ? block.getTitle() : "",
                "textContent", block.getTextContent() != null ? block.getTextContent() : "",
                "imageUrl", block.getImageUrl() != null ? block.getImageUrl() : "",
                "initialSql", block.getInitialSql() != null ? block.getInitialSql() : "",
                "sortOrder", block.getSortOrder()
            ));
        }
        
        return ResponseEntity.notFound().build();
    }

    @PostMapping("/api/blocks/{blockId}/update")
    @ResponseBody
    public ResponseEntity<Map<String, Object>> updateBlock(@PathVariable Long blockId, 
                                                          @RequestParam String type,
                                                          @RequestParam(required = false) String title,
                                                          @RequestParam(required = false) String textContent,
                                                          @RequestParam(required = false) String imageUrl,
                                                          @RequestParam(required = false) String initialSql,
                                                          @RequestParam(required = false, defaultValue = "0") Integer sortOrder,
                                                          @RequestParam(name = "scope", required = false) String scope,
                                                          HttpSession session) {
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null || !currentUser.getRole().name().equals("ADMIN")) {
            return ResponseEntity.status(403).body(Map.of("success", false));
        }
        
        // Если задан scope, обновляем строго в указанной сущности
        if ("SECTION".equalsIgnoreCase(scope)) {
            Optional<SectionBlock> sectionBlock = sectionBlockRepository.findById(blockId);
            if (sectionBlock.isPresent()) {
                SectionBlock block = sectionBlock.get();
                block.setType(SectionBlock.BlockType.valueOf(type));
                block.setTitle(title);
                block.setTextContent(textContent);
                block.setImageUrl(imageUrl);
                block.setInitialSql(initialSql);
                block.setSortOrder(sortOrder);
                sectionBlockRepository.save(block);
                return ResponseEntity.ok(Map.of("success", true));
            }
            return ResponseEntity.notFound().build();
        } else if ("CHAPTER".equalsIgnoreCase(scope)) {
            Optional<ChapterBlock> chapterBlock = chapterBlockRepository.findById(blockId);
            if (chapterBlock.isPresent()) {
                ChapterBlock block = chapterBlock.get();
                block.setType(ChapterBlock.BlockType.valueOf(type));
                block.setTitle(title);
                block.setTextContent(textContent);
                block.setImageUrl(imageUrl);
                block.setInitialSql(initialSql);
                block.setSortOrder(sortOrder);
                chapterBlockRepository.save(block);
                return ResponseEntity.ok(Map.of("success", true));
            }
            return ResponseEntity.notFound().build();
        }

        // Fallback: пробуем последовательно для обратной совместимости
        Optional<SectionBlock> sectionBlock = sectionBlockRepository.findById(blockId);
        if (sectionBlock.isPresent()) {
            SectionBlock block = sectionBlock.get();
            block.setType(SectionBlock.BlockType.valueOf(type));
            block.setTitle(title);
            block.setTextContent(textContent);
            block.setImageUrl(imageUrl);
            block.setInitialSql(initialSql);
            block.setSortOrder(sortOrder);
            sectionBlockRepository.save(block);
            return ResponseEntity.ok(Map.of("success", true));
        }
        
        Optional<ChapterBlock> chapterBlock = chapterBlockRepository.findById(blockId);
        if (chapterBlock.isPresent()) {
            ChapterBlock block = chapterBlock.get();
            block.setType(ChapterBlock.BlockType.valueOf(type));
            block.setTitle(title);
            block.setTextContent(textContent);
            block.setImageUrl(imageUrl);
            block.setInitialSql(initialSql);
            block.setSortOrder(sortOrder);
            chapterBlockRepository.save(block);
            return ResponseEntity.ok(Map.of("success", true));
        }
        
        return ResponseEntity.notFound().build();
    }
}


