package com.example.brainify.Controllers;

import com.example.brainify.Config.SessionManager;
import com.example.brainify.Model.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import jakarta.servlet.http.HttpSession;

@Controller
public class EquipmentCheckController {

    @Autowired
    private SessionManager sessionManager;

    @GetMapping("/equipment-check")
    public String equipmentCheckPage(
            @RequestParam(required = false) Long lessonId,
            Model model, 
            HttpSession session) {
        
        // Проверяем, авторизован ли пользователь
        User currentUser = sessionManager.getCurrentUser(session);
        if (currentUser == null) {
            return "redirect:/auth/login";
        }
        
        model.addAttribute("pageTitle", "Проверка оборудования - Brainify");
        model.addAttribute("currentUser", currentUser);
        model.addAttribute("lessonId", lessonId);
        
        return "equipment-check";
    }
}
