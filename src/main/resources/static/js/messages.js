/**
 * Brainify — Модуль чата (сообщения)
 * Универсальный для ученика, преподавателя и админа
 */

(function() {
    'use strict';

    let currentChatUserId = null;
    let lastMessageTime = null;
    let pollingInterval = null;
    let unreadPollingInterval = null;
    let contactsPollingInterval = null;
    let contacts = [];
    let selectedFile = null;
    let initialized = false; // Защита от повторной инициализации

    const POLL_DELAY = 3000;
    const UNREAD_POLL_DELAY = 10000;
    const CONTACTS_POLL_DELAY = 8000;

    // ---- Инициализация ----
    function initChat() {
        if (initialized) {
            // Повторный вызов — просто обновляем контакты
            loadContacts();
            return;
        }
        initialized = true;
        loadContacts();
        startUnreadPolling();
        startContactsPolling();
        setupInputHandlers();
    }

    // ---- Контакты ----
    async function loadContacts() {
        const list = document.getElementById('chatContactsList');
        if (!list) return;

        // Показываем загрузку только если список пуст
        if (!contacts.length) {
            list.innerHTML = '<div class="chat-loading"><i class="fas fa-spinner fa-spin"></i> Загрузка...</div>';
        }

        try {
            const resp = await fetch('/api/chat/contacts');
            if (!resp.ok) throw new Error('Ошибка загрузки');
            contacts = await resp.json();
            renderContacts(contacts);
        } catch (e) {
            if (!contacts.length) {
                list.innerHTML = '<div class="chat-loading">Не удалось загрузить контакты</div>';
            }
            console.error('Chat contacts error:', e);
        }
    }

    function renderContacts(list) {
        const container = document.getElementById('chatContactsList');
        if (!container) return;

        if (!list.length) {
            container.innerHTML = '<div class="chat-loading">Нет контактов</div>';
            return;
        }

        container.innerHTML = list.map(c => {
            const isSupport = c.isSupport === true;
            const avatarContent = isSupport ? '<i class="fas fa-headset"></i>' : getInitials(c.name);
            const avatarClass = isSupport ? 'support' : getAvatarClass(c.role);
            const timeStr = c.lastMessageTime ? formatShortTime(c.lastMessageTime) : '';
            const lastMsg = c.lastMessage
                ? escapeHtml(c.lastMessage.length > 35 ? c.lastMessage.slice(0, 35) + '…' : c.lastMessage)
                : '<span style="opacity:.5">Нет сообщений</span>';
            const unreadDot = c.unread > 0 ? '<span class="contact-unread-dot"></span>' : '';
            const pinned = c.pinned ? ' pinned' : '';
            const active = c.id === currentChatUserId ? ' active' : '';

            return `
                <div class="chat-contact-item${pinned}${active}" data-user-id="${c.id}" onclick="window.brainifyChat.openChat(${c.id})">
                    <div class="contact-avatar-wrap">
                        <div class="contact-avatar ${avatarClass}">${avatarContent}</div>
                        ${unreadDot}
                    </div>
                    <div class="contact-info">
                        <div class="contact-name">${escapeHtml(c.name)}</div>
                        <div class="contact-subtitle">${escapeHtml(c.subtitle || c.roleDisplay)}</div>
                        <div class="contact-last-msg">${lastMsg}</div>
                    </div>
                    <div class="contact-meta">
                        <span class="contact-time">${timeStr}</span>
                    </div>
                </div>`;
        }).join('');
    }

    function filterContacts(query) {
        if (!query) {
            renderContacts(contacts);
            return;
        }
        const q = query.toLowerCase();
        const filtered = contacts.filter(c =>
            c.name.toLowerCase().includes(q) ||
            (c.subtitle && c.subtitle.toLowerCase().includes(q))
        );
        renderContacts(filtered);
    }

    // ---- Открыть чат ----
    async function openChat(userId) {
        currentChatUserId = userId;
        lastMessageTime = null;
        stopPolling();

        // Обновляем active в списке
        document.querySelectorAll('.chat-contact-item').forEach(el => {
            el.classList.toggle('active', parseInt(el.dataset.userId) === userId);
        });

        // Мобильная версия — показать область чата
        const container = document.querySelector('.chat-container');
        if (container) container.classList.add('chat-open');

        // Находим контакт
        const contact = contacts.find(c => c.id === userId);

        // Обновляем шапку
        const headerName = document.getElementById('chatHeaderName');
        const headerSub = document.getElementById('chatHeaderSub');
        const headerAvatar = document.getElementById('chatHeaderAvatar');
        if (headerName) headerName.textContent = contact ? contact.name : '';
        if (headerSub) headerSub.textContent = contact ? (contact.subtitle || contact.roleDisplay) : '';
        if (headerAvatar && contact) {
            const isSupport = contact.isSupport === true;
            headerAvatar.className = 'contact-avatar ' + (isSupport ? 'support' : getAvatarClass(contact.role));
            headerAvatar.innerHTML = isSupport ? '<i class="fas fa-headset"></i>' : getInitials(contact.name);
        }

        // Показываем область чата, скрываем пустое состояние
        const emptyState = document.getElementById('chatEmptyState');
        const chatActive = document.getElementById('chatActiveArea');
        if (emptyState) emptyState.style.display = 'none';
        if (chatActive) chatActive.style.display = 'flex';

        // Загружаем сообщения
        await loadMessages(userId);

        // Запускаем polling
        startPolling(userId);

        // Убираем точку непрочитанных для этого контакта
        const item = document.querySelector(`.chat-contact-item[data-user-id="${userId}"]`);
        if (item) {
            const dot = item.querySelector('.contact-unread-dot');
            if (dot) dot.remove();
        }

        // Обновляем данные контакта
        if (contact) contact.unread = 0;
    }

    function closeChat() {
        const container = document.querySelector('.chat-container');
        if (container) container.classList.remove('chat-open');
    }

    // ---- Сообщения ----
    async function loadMessages(userId) {
        const msgContainer = document.getElementById('chatMessages');
        if (!msgContainer) return;
        msgContainer.innerHTML = '<div class="chat-loading"><i class="fas fa-spinner fa-spin"></i> Загрузка...</div>';

        try {
            const resp = await fetch(`/api/chat/messages/${userId}`);
            if (!resp.ok) throw new Error('Ошибка');
            const messages = await resp.json();
            renderMessages(messages);
            if (messages.length) {
                lastMessageTime = messages[messages.length - 1].createdAt;
            }
        } catch (e) {
            msgContainer.innerHTML = '<div class="chat-loading">Не удалось загрузить сообщения</div>';
            console.error('Chat messages error:', e);
        }
    }

    function renderMessages(messages) {
        const container = document.getElementById('chatMessages');
        if (!container) return;

        const myId = getCurrentUserId();

        if (!messages.length) {
            container.innerHTML = '<div class="chat-loading" style="opacity:0.5">Напишите первое сообщение</div>';
            return;
        }

        let html = '';
        let lastDate = '';

        messages.forEach(msg => {
            const msgDate = formatDate(msg.createdAt);
            if (msgDate !== lastDate) {
                html += `<div class="chat-date-divider"><span>${msgDate}</span></div>`;
                lastDate = msgDate;
            }

            const isSent = msg.senderId === myId;
            const cls = isSent ? 'sent' : 'received';
            const time = formatTime(msg.createdAt);

            html += `<div class="chat-msg ${cls}" data-msg-id="${msg.id}">`;
            if (msg.content) {
                html += `<div class="chat-msg-bubble">${escapeHtml(msg.content)}</div>`;
            }
            if (msg.hasFile) {
                html += renderFileAttachment(msg);
            }
            html += `<span class="chat-msg-time">${time}</span></div>`;
        });

        container.innerHTML = html;
        scrollToBottom();
    }

    function renderFileAttachment(msg) {
        if (msg.isImage) {
            return `<img class="chat-msg-image" src="/api/chat/file/${msg.id}" alt="${escapeHtml(msg.fileName)}" onclick="window.open('/api/chat/file/${msg.id}', '_blank')">`;
        }
        const icon = getFileIcon(msg.mimeType);
        return `
            <a class="chat-msg-file" href="/api/chat/file/${msg.id}" target="_blank" download>
                <i class="chat-msg-file-icon ${icon}"></i>
                <div class="chat-msg-file-info">
                    <div class="chat-msg-file-name">${escapeHtml(msg.fileName)}</div>
                    <div class="chat-msg-file-size">${msg.fileSizeFormatted || ''}</div>
                </div>
                <i class="fas fa-download" style="color:#94a3b8"></i>
            </a>`;
    }

    function appendMessages(newMessages) {
        const container = document.getElementById('chatMessages');
        if (!container || !newMessages.length) return;

        const loading = container.querySelector('.chat-loading');
        if (loading) loading.remove();

        const myId = getCurrentUserId();
        const existingIds = new Set();
        container.querySelectorAll('.chat-msg[data-msg-id]').forEach(el => {
            existingIds.add(el.dataset.msgId);
        });

        let added = false;
        newMessages.forEach(msg => {
            // Пропускаем дубликаты
            if (existingIds.has(String(msg.id))) return;

            const isSent = msg.senderId === myId;
            const cls = isSent ? 'sent' : 'received';
            const time = formatTime(msg.createdAt);

            let contentHtml = '';
            if (msg.content) {
                contentHtml += `<div class="chat-msg-bubble">${escapeHtml(msg.content)}</div>`;
            }
            if (msg.hasFile) {
                contentHtml += renderFileAttachment(msg);
            }

            const div = document.createElement('div');
            div.className = `chat-msg ${cls}`;
            div.dataset.msgId = msg.id;
            div.innerHTML = `${contentHtml}<span class="chat-msg-time">${time}</span>`;
            container.appendChild(div);
            added = true;
        });

        if (added) scrollToBottom();

        if (newMessages.length) {
            lastMessageTime = newMessages[newMessages.length - 1].createdAt;
        }
    }

    // ---- Отправка ----
    async function sendMessage() {
        const textarea = document.getElementById('chatInput');
        if (!textarea || !currentChatUserId) return;

        const content = textarea.value.trim();

        if (selectedFile) {
            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('content', content);

            try {
                const resp = await fetch(`/api/chat/send/${currentChatUserId}/file`, {
                    method: 'POST',
                    body: formData
                });
                if (!resp.ok) {
                    const err = await resp.json();
                    alert(err.error || 'Ошибка отправки');
                    return;
                }
                const msg = await resp.json();
                appendMessages([msg]);
                textarea.value = '';
                clearFilePreview();
                updateContactLastMessage(currentChatUserId, msg);
            } catch (e) {
                console.error('Send file error:', e);
                alert('Ошибка отправки файла');
            }
            return;
        }

        if (!content) return;

        try {
            const resp = await fetch(`/api/chat/send/${currentChatUserId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content })
            });
            if (!resp.ok) {
                const err = await resp.json();
                alert(err.error || 'Ошибка отправки');
                return;
            }
            const msg = await resp.json();
            appendMessages([msg]);
            textarea.value = '';
            textarea.style.height = 'auto';
            updateContactLastMessage(currentChatUserId, msg);
        } catch (e) {
            console.error('Send error:', e);
        }
    }

    function updateContactLastMessage(userId, msg) {
        const item = document.querySelector(`.chat-contact-item[data-user-id="${userId}"]`);
        if (!item) return;
        const lastMsgEl = item.querySelector('.contact-last-msg');
        if (lastMsgEl) {
            const text = msg.hasFile ? '📎 ' + msg.fileName : msg.content;
            lastMsgEl.textContent = text && text.length > 35 ? text.slice(0, 35) + '…' : text;
        }
        const timeEl = item.querySelector('.contact-time');
        if (timeEl) {
            timeEl.textContent = formatShortTime(msg.createdAt);
        }
    }

    // ---- Файлы ----
    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        const maxSize = 20 * 1024 * 1024;
        if (file.size > maxSize) {
            alert('Файл слишком большой. Максимум: 20 МБ');
            e.target.value = '';
            return;
        }

        selectedFile = file;
        showFilePreview(file);
    }

    function showFilePreview(file) {
        const preview = document.getElementById('chatFilePreview');
        const nameEl = document.getElementById('chatFilePreviewName');
        if (preview && nameEl) {
            nameEl.textContent = file.name;
            preview.classList.add('visible');
        }
    }

    function clearFilePreview() {
        selectedFile = null;
        const preview = document.getElementById('chatFilePreview');
        const input = document.getElementById('chatFileInput');
        if (preview) preview.classList.remove('visible');
        if (input) input.value = '';
    }

    // ---- Polling ----
    function startPolling(userId) {
        stopPolling();
        pollingInterval = setInterval(async () => {
            if (!lastMessageTime || currentChatUserId !== userId) return;
            try {
                const resp = await fetch(`/api/chat/messages/${userId}/new?after=${encodeURIComponent(lastMessageTime)}`);
                if (!resp.ok) return;
                const newMsgs = await resp.json();
                if (newMsgs.length) {
                    appendMessages(newMsgs);
                }
            } catch (e) { /* ignore */ }
        }, POLL_DELAY);
    }

    function stopPolling() {
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
    }

    function startUnreadPolling() {
        updateUnreadBadge();
        if (unreadPollingInterval) clearInterval(unreadPollingInterval);
        unreadPollingInterval = setInterval(updateUnreadBadge, UNREAD_POLL_DELAY);
    }

    function startContactsPolling() {
        if (contactsPollingInterval) clearInterval(contactsPollingInterval);
        contactsPollingInterval = setInterval(async () => {
            // Обновляем контакты, чтобы показывать новые точки непрочитанных
            try {
                const resp = await fetch('/api/chat/contacts');
                if (!resp.ok) return;
                const newContacts = await resp.json();
                contacts = newContacts;

                // Обновляем точки непрочитанных в DOM
                newContacts.forEach(c => {
                    const item = document.querySelector(`.chat-contact-item[data-user-id="${c.id}"]`);
                    if (!item) return;

                    const wrap = item.querySelector('.contact-avatar-wrap');
                    if (!wrap) return;

                    const existingDot = wrap.querySelector('.contact-unread-dot');

                    // Не показываем точку для текущего открытого чата
                    if (c.id === currentChatUserId) {
                        if (existingDot) existingDot.remove();
                        return;
                    }

                    if (c.unread > 0 && !existingDot) {
                        const dot = document.createElement('span');
                        dot.className = 'contact-unread-dot';
                        wrap.appendChild(dot);
                    } else if (c.unread === 0 && existingDot) {
                        existingDot.remove();
                    }

                    // Обновляем последнее сообщение
                    const lastMsgEl = item.querySelector('.contact-last-msg');
                    if (lastMsgEl && c.lastMessage) {
                        const text = c.lastMessage.length > 35 ? c.lastMessage.slice(0, 35) + '…' : c.lastMessage;
                        lastMsgEl.innerHTML = escapeHtml(text);
                    }
                    const timeEl = item.querySelector('.contact-time');
                    if (timeEl && c.lastMessageTime) {
                        timeEl.textContent = formatShortTime(c.lastMessageTime);
                    }
                });
            } catch (e) { /* ignore */ }
        }, CONTACTS_POLL_DELAY);
    }

    async function updateUnreadBadge() {
        try {
            const resp = await fetch('/api/chat/unread');
            if (!resp.ok) return;
            const data = await resp.json();
            const badge = document.getElementById('notificationCount');
            if (badge) {
                badge.textContent = data.unread || 0;
                badge.style.display = data.unread > 0 ? 'flex' : 'none';
            }
        } catch (e) { /* ignore */ }
    }

    // ---- Обработчики ввода ----
    function setupInputHandlers() {
        const textarea = document.getElementById('chatInput');
        if (textarea) {
            textarea.addEventListener('input', () => {
                textarea.style.height = 'auto';
                textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
            });
            textarea.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
        }

        const sendBtn = document.getElementById('chatSendBtn');
        if (sendBtn) sendBtn.addEventListener('click', sendMessage);

        const fileInput = document.getElementById('chatFileInput');
        if (fileInput) fileInput.addEventListener('change', handleFileSelect);

        const attachBtn = document.getElementById('chatAttachBtn');
        if (attachBtn) attachBtn.addEventListener('click', () => {
            const fi = document.getElementById('chatFileInput');
            if (fi) fi.click();
        });

        const removeFileBtn = document.getElementById('chatFileRemoveBtn');
        if (removeFileBtn) removeFileBtn.addEventListener('click', clearFilePreview);

        const searchInput = document.getElementById('chatSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => filterContacts(e.target.value));
        }

        const backBtn = document.getElementById('chatBackBtn');
        if (backBtn) backBtn.addEventListener('click', closeChat);
    }

    // ---- Утилиты ----
    function getCurrentUserId() {
        const body = document.body;
        return parseInt(body.dataset.studentId || body.dataset.teacherId || body.dataset.userId || body.dataset.currentUserId || '0');
    }

    function getInitials(name) {
        if (!name) return '?';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
        return name[0].toUpperCase();
    }

    function getAvatarClass(role) {
        switch(role) {
            case 'MANAGER': return 'manager';
            case 'ADMIN': return 'admin';
            case 'TEACHER': return 'teacher';
            default: return '';
        }
    }

    function getFileIcon(mimeType) {
        if (!mimeType) return 'fas fa-file';
        if (mimeType.includes('word')) return 'fas fa-file-word';
        if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'fas fa-file-excel';
        if (mimeType.includes('pdf')) return 'fas fa-file-pdf';
        if (mimeType.startsWith('image/')) return 'fas fa-file-image';
        return 'fas fa-file';
    }

    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function formatTime(isoStr) {
        try {
            const d = new Date(isoStr);
            return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
        } catch { return ''; }
    }

    function formatDate(isoStr) {
        try {
            const d = new Date(isoStr);
            const today = new Date();
            if (d.toDateString() === today.toDateString()) return 'Сегодня';
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            if (d.toDateString() === yesterday.toDateString()) return 'Вчера';
            return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
        } catch { return ''; }
    }

    function formatShortTime(isoStr) {
        try {
            const d = new Date(isoStr);
            const today = new Date();
            if (d.toDateString() === today.toDateString()) {
                return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
            }
            return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
        } catch { return ''; }
    }

    function scrollToBottom() {
        const container = document.getElementById('chatMessages');
        if (container) {
            requestAnimationFrame(() => {
                container.scrollTop = container.scrollHeight;
            });
        }
    }

    // ---- Public API ----
    window.brainifyChat = {
        init: initChat,
        openChat,
        closeChat,
        loadContacts
    };

    // Авто-инициализация при загрузке
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('chatContactsList')) {
            initChat();
        }
    });
})();
