package com.example.brainify.Controllers;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.util.Map;

/**
 * Контроллер сигнализации WebRTC.
 * Ретранслирует SDP-offer, SDP-answer, ICE-candidate и join/leave
 * между участниками одного урока через STOMP.
 */
@Controller
public class WebRTCSignalingController {

    @MessageMapping("/webrtc/signal/{lessonId}")
    @SendTo("/topic/webrtc/{lessonId}")
    public Map<String, Object> relaySignal(@DestinationVariable Long lessonId,
                                           Map<String, Object> signal) {
        return signal;
    }
}
