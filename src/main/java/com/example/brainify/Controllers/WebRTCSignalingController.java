package com.example.brainify.Controllers;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.util.Map;

/**
 * Контроллер сигнализации WebRTC и реального времени доски.
 * Ретранслирует сигналы между участниками одного урока через STOMP.
 */
@Controller
public class WebRTCSignalingController {

    @MessageMapping("/webrtc/signal/{lessonId}")
    @SendTo("/topic/webrtc/{lessonId}")
    public Map<String, Object> relaySignal(@DestinationVariable Long lessonId,
                                           Map<String, Object> signal) {
        return signal;
    }

    /**
     * Ретранслирует промежуточные события рисования на доске
     * (path-progress, shape-progress, draw-done) для отображения
     * рисования в реальном времени у собеседника.
     */
    @MessageMapping("/whiteboard/draw/{lessonId}")
    @SendTo("/topic/whiteboard/{lessonId}")
    public Map<String, Object> relayDrawing(@DestinationVariable Long lessonId,
                                            Map<String, Object> data) {
        return data;
    }
}
