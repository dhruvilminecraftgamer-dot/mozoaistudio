document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');
    const promptInput = document.getElementById('prompt-input');
    const sendButton = document.getElementById('send-button');
    const newChatBtn = document.getElementById('new-chat-btn');
    const chatHistoryList = document.getElementById('chat-history-list');
    const deleteHistoryBtn = document.getElementById('delete-history-btn');
    const deepThinkBtn = document.getElementById('deep-think-mode-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const contextMenu = document.getElementById('context-menu');
    const settingsMenu = document.getElementById('settings-menu');
    const themeMenu = document.getElementById('theme-menu');
    const modelPopup = document.getElementById('model-version-popup');
    const themeMenuBtn = document.getElementById('theme-menu-btn');
    const modelVersionBtn = document.getElementById('model-version-btn');
    const WORKER_URL = "https://chatbotapisafer.mozostudiooffical.workers.dev/";
    let allChats = JSON.parse(localStorage.getItem('mozo_chats') || '[]');
    let currentChatId = localStorage.getItem('mozo_current') || null;
    let isGenerating = false;
    let isDeepThinkMode = false;

    function saveState() {
        localStorage.setItem('mozo_chats', JSON.stringify(allChats));
        localStorage.setItem('mozo_current', currentChatId);
    }

    function getActiveChat() {
        return allChats.find(c => c.id === currentChatId);
    }

    // --- THEME LOGIC ---
    function applyTheme(theme) {
        const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
        localStorage.setItem('mozo_theme', theme);
    }

    function initTheme() {
        const savedTheme = localStorage.getItem('mozo_theme') || 'system';
        applyTheme(savedTheme);
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme(localStorage.getItem('mozo_theme')));
    }

    // --- RENDERING ---
    function renderSidebar() {
        chatHistoryList.innerHTML = '';
        allChats.forEach(chat => {
            const card = document.createElement('div');
            card.className = 'chat-history-card';
            if (chat.id === currentChatId) card.classList.add('active');
            card.dataset.chatId = chat.id;
            const title = document.createElement('span');
            title.textContent = chat.title || 'Chat';
            title.style.whiteSpace = 'nowrap';
            title.style.overflow = 'hidden';
            title.style.textOverflow = 'ellipsis';
            card.appendChild(title);
            const optionsBtn = document.createElement('button');
            optionsBtn.className = 'chat-options-btn';
            optionsBtn.innerHTML = '&#x22EE;';
            optionsBtn.onclick = (e) => {
                e.stopPropagation();
                showContextMenu(optionsBtn, chat.id);
            };
            card.appendChild(optionsBtn);
            card.onclick = () => {
                currentChatId = chat.id;
                renderChat();
            };
            chatHistoryList.appendChild(card);
        });
    }

    function renderChat() {
        chatContainer.innerHTML = '';
        const chat = getActiveChat();
        if (!chat) return;
        chat.messages.forEach(m => {
            const messageWrapper = document.createElement('div');
            messageWrapper.className = `message ${m.role === 'user' ? 'user-message' : 'ai-message'}`;
            appendMessageContent(messageWrapper, m.content);
            chatContainer.appendChild(messageWrapper);
        });
        chatContainer.scrollTop = chatContainer.scrollHeight;
        renderSidebar();
        saveState();
    }

    function appendMessageContent(container, content) {
        const codeBlockRegex = /(```(\w*)\n([\s\S]*?)\n```)/g;
        let lastIndex = 0,
            match;
        while ((match = codeBlockRegex.exec(content)) !== null) {
            if (match.index > lastIndex) container.appendChild(document.createTextNode(content.substring(lastIndex, match.index)));
            container.appendChild(createCodeBlockElement(match[2] || 'text', match[3]));
            lastIndex = codeBlockRegex.lastIndex;
        }
        if (lastIndex < content.length) container.appendChild(document.createTextNode(content.substring(lastIndex)));
    }

    function createCodeBlockElement(language, code) {
        const block = document.createElement('div');
        block.className = 'code-block';
        const header = document.createElement('div');
        header.className = 'code-header';
        const langSpan = document.createElement('span');
        langSpan.className = 'code-header-lang';
        langSpan.textContent = language;
        const buttonsDiv = document.createElement('div');
        buttonsDiv.className = 'code-header-buttons';
        const codeContent = document.createElement('div');
        codeContent.className = 'code-content';
        const previewFrame = document.createElement('iframe');
        previewFrame.className = 'code-preview-iframe';
        if (language.toLowerCase() === 'html') {
            const previewBtn = document.createElement('button');
            previewBtn.textContent = 'Preview';
            previewBtn.onclick = () => {
                const isHidden = previewFrame.style.display === 'none';
                if (isHidden) previewFrame.srcdoc = code;
                previewFrame.style.display = isHidden ? 'block' : 'none';
                previewBtn.textContent = isHidden ? 'Close Preview' : 'Preview';
            };
            buttonsDiv.appendChild(previewBtn);
        }
        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = 'Download';
        downloadBtn.onclick = () => {
            const ext = {
                html: 'html',
                javascript: 'js',
                css: 'css',
                python: 'py'
            } [language.toLowerCase()] || 'txt';
            const blob = new Blob([code], {
                type: 'text/plain'
            });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `code.${ext}`;
            a.click();
            URL.revokeObjectURL(a.href);
        };
        buttonsDiv.appendChild(downloadBtn);
        const copyBtn = document.createElement('button');
        copyBtn.textContent = 'Copy';
        copyBtn.onclick = e => navigator.clipboard.writeText(code).then(() => {
            e.target.textContent = 'Copied!';
            setTimeout(() => e.target.textContent = 'Copy', 2000);
        });
        buttonsDiv.appendChild(copyBtn);
        const collapseBtn = document.createElement('button');
        collapseBtn.textContent = 'Collapse';
        collapseBtn.onclick = () => {
            const isCollapsed = codeContent.style.display === 'none';
            codeContent.style.display = isCollapsed ? 'block' : 'none';
            collapseBtn.textContent = isCollapsed ? 'Collapse' : 'Expand';
            if (!isCollapsed) {
                previewFrame.style.display = 'none';
                const pBtn = buttonsDiv.querySelector('button');
                if (pBtn && pBtn.textContent === 'Close Preview') pBtn.textContent = 'Preview';
            }
        };
        buttonsDiv.appendChild(collapseBtn);
        header.append(langSpan, buttonsDiv);
        const pre = document.createElement('pre');
        const codeEl = document.createElement('code');
        codeEl.textContent = code;
        pre.appendChild(codeEl);
        codeContent.appendChild(pre);
        block.append(header, codeContent, previewFrame);
        return block;
    }

    // --- MENU LOGIC ---
    function hideAllPopups() {
        [contextMenu, settingsMenu, themeMenu, modelPopup].forEach(m => m.style.display = 'none');
    }

    function showPopup(popup, anchor, position = 'up') {
        hideAllPopups();
        const rect = anchor.getBoundingClientRect();
        popup.style.display = 'block';
        if (position === 'up') {
            popup.style.left = `${rect.left}px`;
            popup.style.bottom = `${window.innerHeight - rect.top}px`;
        } else if (position === 'side') {
            popup.style.left = `${rect.right + 5}px`;
            popup.style.top = `${rect.top}px`;
            popup.style.bottom = 'auto';
        } else { // 'down' for context menu
            popup.style.left = `${rect.left}px`;
            popup.style.top = `${rect.bottom}px`;
            popup.style.bottom = 'auto';
        }
    }

    function showContextMenu(anchorElement, chatId) {
        contextMenu.innerHTML = '';
        const actions = {
            'Rename Chat': () => renameChat(chatId),
            'Copy Chat': () => copyChat(chatId),
            'Delete Chat': () => deleteChat(chatId)
        };
        for (const [label, action] of Object.entries(actions)) {
            const btn = document.createElement('button');
            btn.textContent = label;
            btn.onclick = action;
            contextMenu.appendChild(btn);
        }
        showPopup(contextMenu, anchorElement, 'down');
    }

    function renameChat(chatId) {
        const newTitle = prompt("Enter new chat name:");
        if (newTitle?.trim()) {
            const chat = allChats.find(c => c.id === chatId);
            if (chat) {
                chat.title = newTitle.trim();
                saveState();
                renderSidebar();
            }
        }
    }

    function copyChat(chatId) {
        const chat = allChats.find(c => c.id === chatId);
        if (chat) navigator.clipboard.writeText(chat.messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')).then(() => alert('Chat copied!'));
    }

    function deleteChat(chatId) {
        if (!confirm('Delete this chat?')) return;
        allChats = allChats.filter(c => c.id !== chatId);
        if (currentChatId === chatId) {
            currentChatId = allChats[0]?.id || null;
            if (!currentChatId) newChat();
            else renderChat();
        } else {
            saveState();
            renderSidebar();
        }
    }

    // --- CHAT LOGIC ---
    function newChat() {
        const id = Date.now().toString();
        currentChatId = id;
        allChats.unshift({
            id,
            title: 'New Chat',
            messages: []
        });
        renderChat();
    }

    function showThinkingMessage() {
        const msg = document.createElement('div');
        msg.id = 'thinking-msg';
        msg.className = 'thinking-message';
        msg.textContent = 'Mozo is thinking...';
        chatContainer.appendChild(msg);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    function removeThinkingMessage() {
        document.getElementById('thinking-msg')?.remove();
    }

    async function sendMessage() {
        if (isGenerating) return;
        const text = promptInput.value.trim();
        if (!text) return;
        let chat = getActiveChat();
        if (!chat || (chat.title === 'New Chat' && chat.messages.length === 0)) {
            if (!chat) {
                newChat();
                chat = getActiveChat();
            }
            chat.title = text.substring(0, 40) + (text.length > 40 ? '...' : '');
        }
        promptInput.value = '';
        chat.messages.push({
            role: 'user',
            content: text
        });
        renderChat();
        isGenerating = true;
        showThinkingMessage();
        try {
            const payload = {
                messages: [...chat.messages]
            };
            if (isDeepThinkMode) payload.messages[payload.messages.length - 1].content += " in detail";
            const res = await fetch(WORKER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            const aiContent = (data.choices?.[0]?.message?.content) ? data.choices[0].message.content.replace(/OpenAI|GPT/gi, "Mozo AI") : 'Error: ' + (data.error || 'Unknown error');
            chat.messages.push({
                role: 'assistant',
                content: aiContent
            });
        } catch (e) {
            chat.messages.push({
                role: 'assistant',
                content: 'Error: ' + e.message
            });
        } finally {
            isGenerating = false;
            removeThinkingMessage();
            renderChat();
        }
    }

    // --- EVENT LISTENERS ---
    document.addEventListener('click', hideAllPopups);
    [contextMenu, settingsMenu, themeMenu, modelPopup].forEach(m => m.addEventListener('click', e => e.stopPropagation()));
    settingsBtn.addEventListener('click', e => {
        e.stopPropagation();
        showPopup(settingsMenu, settingsBtn, 'up');
    });
    themeMenuBtn.addEventListener('click', e => {
        e.stopPropagation();
        showPopup(themeMenu, themeMenuBtn, 'side');
    });
    modelVersionBtn.addEventListener('click', e => {
        e.stopPropagation();
        showPopup(modelPopup, modelVersionBtn, 'side');
    });
    themeMenu.querySelectorAll('button').forEach(btn => btn.addEventListener('click', () => applyTheme(btn.dataset.theme)));
    sendButton.onclick = sendMessage;
    promptInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    newChatBtn.onclick = newChat;
    deleteHistoryBtn.onclick = () => {
        if (confirm('Delete all chat history?')) {
            allChats = [];
            currentChatId = null;
            saveState();
            renderChat();
            newChat();
        }
    };
    deepThinkBtn.onclick = () => {
        isDeepThinkMode = !isDeepThinkMode;
        deepThinkBtn.classList.add('deep-think-animation');
        deepThinkBtn.textContent = `🧠Deep Think Mode : ${isDeepThinkMode ? "ON" : "OFF"}`;
        deepThinkBtn.style.backgroundColor = isDeepThinkMode ? 'var(--accent-color-hover)' : 'var(--accent-color)';
        deepThinkBtn.addEventListener('animationend', () => deepThinkBtn.classList.remove('deep-think-animation'), {
            once: true
        });
    };

    // --- INITIAL LOAD ---
    initTheme();
    if (!currentChatId || !getActiveChat()) newChat();
    else renderChat();
});
