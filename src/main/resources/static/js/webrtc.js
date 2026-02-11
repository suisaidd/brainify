/**
 * Brainify — WebRTC видеозвонок на доске
 * STOMP сигнализация + peer-to-peer видео/аудио
 *
 * — transceivers для приёма без локальных устройств
 * — буферизация ICE-кандидатов
 * — раздельный запрос аудио/видео (совместимость с Яндекс Браузером Windows)
 * — ресайз панели из всех углов и граней
 * — полноэкранный режим для демонстрации
 */

(function () {
    'use strict';

    // ──── Конфигурация ────
    const ICE_SERVERS = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ];
    const MIN_W = 220, MAX_W = 800, MIN_H = 200, MAX_H = 700;

    // ──── Состояние ────
    let stompClient = null;
    let peerConnection = null;
    let localStream = null;
    let lessonId = null;
    let currentUserId = null;
    let currentUserName = null;
    let micEnabled = true;
    let camEnabled = true;
    let connected = false;
    let hasLocalVideo = false;
    let hasLocalAudio = false;
    let pendingIceCandidates = [];
    let remoteDescriptionSet = false;
    let screenStream = null;
    let screenSharing = false;
    let cameraTrackBeforeScreen = null;
    let isFullscreen = false;

    // ──── Инициализация при загрузке ────
    document.addEventListener('DOMContentLoaded', () => {
        try {
            lessonId = document.getElementById('lessonId')?.value;
            currentUserId = document.getElementById('currentUserId')?.value;
            currentUserName = document.getElementById('currentUserName')?.value;

            if (!lessonId || !currentUserId) {
                console.warn('WebRTC: нет lessonId или currentUserId');
                return;
            }

            initPanel();
            startLocalMedia().then(() => {
                connectStomp();
            }).catch(e => {
                console.warn('WebRTC: ошибка запуска медиа:', e);
                connectStomp();
            });
        } catch (e) {
            console.error('WebRTC: ошибка инициализации:', e);
        }
    });

    // ════════════════════════════════════════
    //  1. Локальные медиа
    //     Запрашиваем аудио и видео РАЗДЕЛЬНО —
    //     Яндекс Браузер на Windows не показывает запрос
    //     если просить оба сразу через { video:true, audio:true }
    // ════════════════════════════════════════

    async function startLocalMedia() {
        let audioStream = null;
        let videoStream = null;

        // Шаг 1: запрашиваем микрофон отдельно
        audioStream = await tryGetMedia({ audio: true });

        // Шаг 2: запрашиваем камеру отдельно
        videoStream = await tryGetMedia({ video: true });

        // Объединяем треки в один стрим
        if (audioStream || videoStream) {
            localStream = new MediaStream();
            if (audioStream) {
                audioStream.getAudioTracks().forEach(t => localStream.addTrack(t));
            }
            if (videoStream) {
                videoStream.getVideoTracks().forEach(t => localStream.addTrack(t));
            }
            hasLocalAudio = localStream.getAudioTracks().length > 0;
            hasLocalVideo = localStream.getVideoTracks().length > 0;
            document.getElementById('localVideo').srcObject = localStream;
            console.log('WebRTC: стрим получен, видео:', hasLocalVideo, ', аудио:', hasLocalAudio);
        } else {
            hasLocalVideo = false;
            hasLocalAudio = false;
            console.warn('WebRTC: нет доступных устройств — работаем в режиме приёма');
        }

        camEnabled = hasLocalVideo;
        micEnabled = hasLocalAudio;
        updateCamBtn();
        updateMicBtn();
    }

    async function tryGetMedia(constraints) {
        try {
            return await navigator.mediaDevices.getUserMedia(constraints);
        } catch (err) {
            console.warn('WebRTC: getUserMedia не удалось', constraints, err.name, err.message);
            return null;
        }
    }

    // ════════════════════════════════════════
    //  2. STOMP сигнализация
    // ════════════════════════════════════════

    function connectStomp() {
        try {
            const socket = new SockJS('/ws');
            stompClient = Stomp.over(socket);
            stompClient.debug = function() {};

            stompClient.connect({}, () => {
                console.log('WebRTC: STOMP подключён');
                stompClient.subscribe(`/topic/webrtc/${lessonId}`, (message) => {
                    try {
                        const signal = JSON.parse(message.body);
                        if (String(signal.senderId) === String(currentUserId)) return;
                        handleSignal(signal);
                    } catch (e) { console.warn('WebRTC: ошибка обработки сигнала:', e); }
                });
                sendSignal({ type: 'join', name: currentUserName });
            }, (err) => {
                console.error('WebRTC: STOMP ошибка', err);
                setTimeout(connectStomp, 5000);
            });
        } catch (e) {
            console.warn('WebRTC: не удалось подключить STOMP:', e);
            setTimeout(connectStomp, 5000);
        }
    }

    function sendSignal(data) {
        if (!stompClient || !stompClient.connected) return;
        data.senderId = currentUserId;
        data.senderName = currentUserName;
        stompClient.send(`/app/webrtc/signal/${lessonId}`, {}, JSON.stringify(data));
    }

    function handleSignal(signal) {
        switch (signal.type) {
            case 'join':
                console.log('WebRTC: участник присоединился —', signal.senderName);
                document.getElementById('remoteLabel').textContent = signal.senderName || 'Собеседник';
                setupAndOffer(signal.senderName);
                break;
            case 'offer':
                handleOffer(signal);
                break;
            case 'answer':
                handleAnswer(signal);
                break;
            case 'ice-candidate':
                handleIceCandidate(signal);
                break;
            case 'leave':
                closePeerConnection();
                showRemotePlaceholder(true, 'Собеседник отключился');
                break;
        }
    }

    // ════════════════════════════════════════
    //  3. WebRTC peer connection
    // ════════════════════════════════════════

    function createPeerConnection() {
        if (peerConnection) closePeerConnection();
        remoteDescriptionSet = false;
        pendingIceCandidates = [];

        peerConnection = new RTCPeerConnection({ iceServers: ICE_SERVERS });

        peerConnection.onicecandidate = (e) => {
            if (e.candidate) sendSignal({ type: 'ice-candidate', candidate: e.candidate });
        };

        peerConnection.ontrack = (event) => {
            console.log('WebRTC: remote track —', event.track.kind);
            const remoteVideo = document.getElementById('remoteVideo');
            if (event.streams && event.streams[0]) {
                if (remoteVideo.srcObject !== event.streams[0]) {
                    remoteVideo.srcObject = event.streams[0];
                }
            } else {
                let stream = remoteVideo.srcObject;
                if (!stream) { stream = new MediaStream(); remoteVideo.srcObject = stream; }
                stream.addTrack(event.track);
            }
            showRemotePlaceholder(false);
            connected = true;
        };

        peerConnection.oniceconnectionstatechange = () => {
            const state = peerConnection?.iceConnectionState;
            console.log('WebRTC: ICE state =', state);
            if (state === 'connected' || state === 'completed') {
                showRemotePlaceholder(false);
                connected = true;
            } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
                showRemotePlaceholder(true, 'Соединение потеряно');
                connected = false;
            }
        };

        if (localStream) {
            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
        }
        ensureTransceivers();
    }

    function ensureTransceivers() {
        if (!peerConnection) return;
        const transceivers = peerConnection.getTransceivers();
        let hasA = false, hasV = false;
        for (const t of transceivers) {
            if (t.receiver?.track?.kind === 'audio') hasA = true;
            if (t.receiver?.track?.kind === 'video') hasV = true;
        }
        if (!hasA) peerConnection.addTransceiver('audio', { direction: hasLocalAudio ? 'sendrecv' : 'recvonly' });
        if (!hasV) peerConnection.addTransceiver('video', { direction: hasLocalVideo ? 'sendrecv' : 'recvonly' });
    }

    async function setupAndOffer(remoteName) {
        createPeerConnection();
        if (remoteName) document.getElementById('remoteLabel').textContent = remoteName;
        try {
            const offer = await peerConnection.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
            await peerConnection.setLocalDescription(offer);
            sendSignal({ type: 'offer', sdp: peerConnection.localDescription });
        } catch (err) { console.error('WebRTC: ошибка createOffer', err); }
    }

    async function handleOffer(signal) {
        createPeerConnection();
        if (signal.senderName) document.getElementById('remoteLabel').textContent = signal.senderName;
        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            remoteDescriptionSet = true;
            flushIceCandidates();
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            sendSignal({ type: 'answer', sdp: peerConnection.localDescription });
        } catch (err) { console.error('WebRTC: ошибка handleOffer', err); }
    }

    async function handleAnswer(signal) {
        if (!peerConnection) return;
        try {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp));
            remoteDescriptionSet = true;
            flushIceCandidates();
        } catch (err) { console.error('WebRTC: ошибка handleAnswer', err); }
    }

    function handleIceCandidate(signal) {
        if (!signal.candidate) return;
        if (peerConnection && remoteDescriptionSet) {
            peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate)).catch(() => {});
        } else {
            pendingIceCandidates.push(signal.candidate);
        }
    }

    function flushIceCandidates() {
        if (!peerConnection) return;
        for (const c of pendingIceCandidates) {
            peerConnection.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
        pendingIceCandidates = [];
    }

    function closePeerConnection() {
        if (peerConnection) {
            peerConnection.ontrack = null;
            peerConnection.onicecandidate = null;
            peerConnection.oniceconnectionstatechange = null;
            peerConnection.close();
            peerConnection = null;
        }
        const rv = document.getElementById('remoteVideo');
        if (rv) rv.srcObject = null;
        connected = false;
        remoteDescriptionSet = false;
        pendingIceCandidates = [];
    }

    function showRemotePlaceholder(show, text) {
        const ph = document.getElementById('remotePlaceholder');
        if (!ph) return;
        if (show) { ph.classList.remove('hidden'); if (text) ph.querySelector('span').textContent = text; }
        else { ph.classList.add('hidden'); }
    }

    // ════════════════════════════════════════
    //  4. Микрофон / Камера
    // ════════════════════════════════════════

    function toggleMic() {
        if (!localStream || !localStream.getAudioTracks().length) return;
        micEnabled = !micEnabled;
        localStream.getAudioTracks().forEach(t => t.enabled = micEnabled);
        updateMicBtn();
    }

    function toggleCam() {
        if (!localStream || !localStream.getVideoTracks().length) return;
        camEnabled = !camEnabled;
        localStream.getVideoTracks().forEach(t => t.enabled = camEnabled);
        updateCamBtn();
    }

    function updateMicBtn() {
        const btn = document.getElementById('toggleMicBtn');
        if (!btn) return;
        if (!hasLocalAudio) {
            btn.classList.remove('active'); btn.classList.add('muted');
            btn.innerHTML = '<i class="fas fa-microphone-slash"></i>';
            btn.title = 'Микрофон недоступен'; return;
        }
        btn.classList.toggle('active', micEnabled);
        btn.classList.toggle('muted', !micEnabled);
        btn.innerHTML = micEnabled ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>';
        btn.title = micEnabled ? 'Выключить микрофон' : 'Включить микрофон';
    }

    function updateCamBtn() {
        const btn = document.getElementById('toggleCamBtn');
        if (!btn) return;
        if (!hasLocalVideo) {
            btn.classList.remove('active'); btn.classList.add('muted');
            btn.innerHTML = '<i class="fas fa-video-slash"></i>';
            btn.title = 'Камера недоступна'; return;
        }
        btn.classList.toggle('active', camEnabled);
        btn.classList.toggle('muted', !camEnabled);
        btn.innerHTML = camEnabled ? '<i class="fas fa-video"></i>' : '<i class="fas fa-video-slash"></i>';
        btn.title = camEnabled ? 'Выключить камеру' : 'Включить камеру';
    }

    // ════════════════════════════════════════
    //  5. Демонстрация экрана
    // ════════════════════════════════════════

    async function toggleScreenShare() {
        if (screenSharing) { stopScreenShare(); return; }
        try {
            screenStream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: 'always' }, audio: false });
            const screenTrack = screenStream.getVideoTracks()[0];
            if (!screenTrack) return;
            screenTrack.addEventListener('ended', () => stopScreenShare());

            if (peerConnection) {
                const videoSender = peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
                if (videoSender) {
                    cameraTrackBeforeScreen = videoSender.track;
                    await videoSender.replaceTrack(screenTrack);
                } else {
                    cameraTrackBeforeScreen = null;
                    peerConnection.addTrack(screenTrack, screenStream);
                    renegotiate();
                }
            }
            document.getElementById('localVideo').srcObject = screenStream;
            screenSharing = true;
            updateScreenBtn();
        } catch (err) {
            console.warn('WebRTC: демонстрация отменена', err.name);
            screenStream = null;
        }
    }

    function stopScreenShare() {
        if (!screenSharing) return;
        if (screenStream) { screenStream.getTracks().forEach(t => t.stop()); screenStream = null; }
        if (peerConnection && cameraTrackBeforeScreen) {
            const vs = peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
            if (vs) vs.replaceTrack(cameraTrackBeforeScreen).catch(() => {});
        }
        if (localStream) document.getElementById('localVideo').srcObject = localStream;
        cameraTrackBeforeScreen = null;
        screenSharing = false;
        updateScreenBtn();
    }

    function updateScreenBtn() {
        const btn = document.getElementById('toggleScreenBtn');
        if (!btn) return;
        btn.classList.toggle('active', screenSharing);
        btn.classList.toggle('screen-active', screenSharing);
        btn.innerHTML = screenSharing ? '<i class="fas fa-stop"></i>' : '<i class="fas fa-desktop"></i>';
        btn.title = screenSharing ? 'Остановить демонстрацию' : 'Демонстрация экрана';
    }

    async function renegotiate() {
        if (!peerConnection || !connected) return;
        try {
            const offer = await peerConnection.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
            await peerConnection.setLocalDescription(offer);
            sendSignal({ type: 'offer', sdp: peerConnection.localDescription });
        } catch (err) { console.error('WebRTC: ошибка renegotiation', err); }
    }

    // ════════════════════════════════════════
    //  6. Полноэкранный режим
    // ════════════════════════════════════════

    function toggleFullscreen() {
        const panel = document.getElementById('videoPanel');
        if (!panel) return;

        isFullscreen = !isFullscreen;
        panel.classList.toggle('fullscreen-mode', isFullscreen);

        // Сохраняем / восстанавливаем позицию
        if (isFullscreen) {
            panel._savedStyle = {
                left: panel.style.left, top: panel.style.top,
                right: panel.style.right, bottom: panel.style.bottom,
                width: panel.style.width, height: panel.style.height
            };
            panel.style.left = '0'; panel.style.top = '0';
            panel.style.right = '0'; panel.style.bottom = '0';
            panel.style.width = '100vw'; panel.style.height = '100vh';
        } else if (panel._savedStyle) {
            Object.assign(panel.style, panel._savedStyle);
            panel._savedStyle = null;
        }

        updateFullscreenBtn();
    }

    function updateFullscreenBtn() {
        const btn = document.getElementById('toggleFullscreenBtn');
        if (!btn) return;
        btn.classList.toggle('active', isFullscreen);
        btn.innerHTML = isFullscreen ? '<i class="fas fa-compress"></i>' : '<i class="fas fa-expand"></i>';
        btn.title = isFullscreen ? 'Выйти из полноэкранного' : 'Во весь экран';
    }

    // ════════════════════════════════════════
    //  7. UI панели — перетаскивание, ресайз из всех углов/граней
    // ════════════════════════════════════════

    function initPanel() {
        const panel = document.getElementById('videoPanel');
        const header = document.getElementById('videoPanelHeader');
        const minimizeBtn = document.getElementById('videoPanelMinimize');

        // ── Перетаскивание ──
        let dragOffsetX = 0, dragOffsetY = 0, dragging = false;

        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('.video-panel-btns') || isFullscreen) return;
            dragging = true;
            const rect = panel.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            panel.style.transition = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            let x = e.clientX - dragOffsetX;
            let y = e.clientY - dragOffsetY;
            x = Math.max(0, Math.min(x, window.innerWidth - panel.offsetWidth));
            y = Math.max(0, Math.min(y, window.innerHeight - panel.offsetHeight));
            panel.style.left = x + 'px';
            panel.style.top = y + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', () => {
            if (dragging) { dragging = false; panel.style.transition = ''; }
        });

        // ── Ресайз из всех углов и граней ──
        let resizing = false, resizeEdge = '', startRect = null, startMX = 0, startMY = 0;

        panel.querySelectorAll('.vp-resize').forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                if (isFullscreen) return;
                resizing = true;
                resizeEdge = handle.dataset.edge;
                startRect = panel.getBoundingClientRect();
                startMX = e.clientX;
                startMY = e.clientY;
                panel.style.transition = 'none';
                e.preventDefault();
                e.stopPropagation();
            });
        });

        document.addEventListener('mousemove', (e) => {
            if (!resizing) return;
            const dx = e.clientX - startMX;
            const dy = e.clientY - startMY;

            let newW = startRect.width;
            let newH = startRect.height;
            let newL = startRect.left;
            let newT = startRect.top;

            if (resizeEdge.includes('e')) newW = startRect.width + dx;
            if (resizeEdge.includes('w')) { newW = startRect.width - dx; newL = startRect.left + dx; }
            if (resizeEdge.includes('s')) newH = startRect.height + dy;
            if (resizeEdge.includes('n')) { newH = startRect.height - dy; newT = startRect.top + dy; }

            // Ограничиваем размеры
            newW = Math.max(MIN_W, Math.min(MAX_W, newW));
            newH = Math.max(MIN_H, Math.min(MAX_H, newH));

            // Корректируем позицию при ресайзе за w/n
            if (resizeEdge.includes('w')) newL = startRect.right - newW;
            if (resizeEdge.includes('n')) newT = startRect.bottom - newH;

            panel.style.width = newW + 'px';
            panel.style.height = newH + 'px';
            panel.style.left = newL + 'px';
            panel.style.top = newT + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
        });

        document.addEventListener('mouseup', () => {
            if (resizing) { resizing = false; panel.style.transition = ''; }
        });

        // ── Свернуть / развернуть ──
        minimizeBtn.addEventListener('click', () => {
            if (isFullscreen) { toggleFullscreen(); }
            panel.classList.toggle('minimized');
            const icon = minimizeBtn.querySelector('i');
            if (panel.classList.contains('minimized')) {
                icon.className = 'fas fa-chevron-up';
                minimizeBtn.title = 'Развернуть';
            } else {
                icon.className = 'fas fa-chevron-down';
                minimizeBtn.title = 'Свернуть';
            }
        });

        // ── Двойной клик по remote видео → полноэкранный ──
        const remoteVideo = document.getElementById('remoteVideo');
        if (remoteVideo) {
            remoteVideo.addEventListener('dblclick', toggleFullscreen);
        }

        // ── Esc для выхода из fullscreen ──
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isFullscreen) toggleFullscreen();
        });

        // ── Кнопки управления ──
        document.getElementById('toggleMicBtn').addEventListener('click', toggleMic);
        document.getElementById('toggleCamBtn').addEventListener('click', toggleCam);
        document.getElementById('toggleScreenBtn').addEventListener('click', toggleScreenShare);
        document.getElementById('toggleFullscreenBtn').addEventListener('click', toggleFullscreen);
    }

    // ════════════════════════════════════════
    //  8. Очистка при закрытии
    // ════════════════════════════════════════

    window.addEventListener('beforeunload', () => {
        sendSignal({ type: 'leave' });
        if (screenStream) { screenStream.getTracks().forEach(t => t.stop()); screenStream = null; }
        closePeerConnection();
        if (localStream) { localStream.getTracks().forEach(t => t.stop()); localStream = null; }
        if (stompClient) { stompClient.disconnect(); stompClient = null; }
    });

})();
