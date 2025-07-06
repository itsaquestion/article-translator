// UI Elements
let refreshButton;
let translateButton;
let loadingIndicator;
let errorDiv;
let contentArea;
let translationArea;
let contentRendered;
let translationRendered;
let renderMarkdownCheckbox;
let copyButton;
let currentTab = 'content';
let currentContent = '';
let currentUrl = '';
let isTranslating = false;

// Chat Elements
let chatMessages;
let chatInput;
let chatSendBtn;
let chatStopBtn;
let clearChatBtn;
let chatContainer;
let currentChatMessages = [];
let isChatting = false;
let chatController = null;

// 当前正在生成的AI回复相关变量
let currentAiResponse = '';
let currentAiMessageId = '';

// 基于网址的聊天内容存储 (内存中，浏览器关闭后消失)
let chatHistoryByUrl = new Map();

// 当前对话会话所属的URL (在对话开始时锁定，避免切换tab时的混乱)
let currentChatUrl = '';

/**
 * 保存当前聊天历史到指定URL
 * @param {string} url - 网址
 */
function saveChatHistoryForUrl(url) {
    if (url && currentChatMessages.length > 0) {
        chatHistoryByUrl.set(url, [...currentChatMessages]);
    }
}

/**
 * 从指定URL恢复聊天历史
 * @param {string} url - 网址
 */
function restoreChatHistoryForUrl(url) {
    // 设置当前聊天会话的URL
    currentChatUrl = url || '';
    
    if (url && chatHistoryByUrl.has(url)) {
        currentChatMessages = [...chatHistoryByUrl.get(url)];
        
        // 重新渲染聊天界面
        if (chatMessages) {
            chatMessages.innerHTML = '';
            currentChatMessages.forEach(message => {
                displayChatMessage(message.content, message.role === 'user', message.id);
            });
        }
    } else {
        // 如果没有该URL的聊天历史，清空当前聊天
        currentChatMessages = [];
        if (chatMessages) {
            chatMessages.innerHTML = '';
        }
    }
}

/**
 * 清空所有聊天历史 (用于调试或重置)
 */
function clearAllChatHistory() {
    chatHistoryByUrl.clear();
    currentChatMessages = [];
    currentChatUrl = '';
    if (chatMessages) {
        chatMessages.innerHTML = '';
    }
}

/**
 * 处理清除对话按钮点击事件
 * 直接清除所有对话历史
 */
function handleClearChat() {
    clearAllChatHistory();
    showError({
        message: '已清除全部对话',
        type: 'info'
    });
}

/**
 * 重新渲染所有聊天消息
 */
function rerenderChatMessages() {
    if (chatMessages) {
        chatMessages.innerHTML = '';
        currentChatMessages.forEach(message => {
            displayChatMessage(message.content, message.role === 'user', message.id);
        });
    }
}

/**
 * 删除指定消息（仅删除单条消息）
 * @param {string} messageId - 消息ID
 */
function deleteMessage(messageId) {
    const messageIndex = currentChatMessages.findIndex(msg => msg.id === messageId);
    if (messageIndex !== -1) {
        // 删除单条消息
        currentChatMessages.splice(messageIndex, 1);
        // 更新UI
        rerenderChatMessages();
        // 保存历史
        if (currentChatUrl) {
            saveChatHistoryForUrl(currentChatUrl);
        }
        
        showError({
            message: '已删除该消息',
            type: 'info'
        });
    }
}

/**
 * 编辑消息
 * @param {string} messageId - 消息ID
 */
function editMessage(messageId) {
    const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
    if (!messageElement) {
        showError('未找到指定消息');
        return;
    }
    
    const contentElement = messageElement.querySelector('.message-content');
    const actionsElement = messageElement.querySelector('.message-actions');
    const messageData = currentChatMessages.find(msg => msg.id === messageId);
    
    if (!messageData) {
        showError('未找到消息数据');
        return;
    }
    
    // 保存原始内容
    const originalContent = messageData.content;
    
    // 创建编辑界面
    const isUser = messageData.role === 'user';
    contentElement.innerHTML = `
        <div class="edit-container">
            <textarea class="edit-textarea" style="
                width: 100%;
                min-height: 80px;
                padding: 8px;
                border: 1px solid rgb(59, 130, 246);
                border-radius: 4px;
                font-family: inherit;
                font-size: inherit;
                resize: vertical;
                box-sizing: border-box;
            ">${originalContent}</textarea>
            <div class="edit-actions" style="
                display: flex;
                gap: 8px;
                margin-top: 8px;
                justify-content: flex-end;
            ">
                <button class="save-edit-btn" style="
                    padding: 4px 12px;
                    background: rgb(34, 197, 94);
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                ">保存</button>
                <button class="cancel-edit-btn" style="
                    padding: 4px 12px;
                    background: rgb(156, 163, 175);
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 12px;
                ">取消</button>
            </div>
        </div>
    `;
    
    // 隐藏操作按钮
    actionsElement.style.display = 'none';
    
    // 聚焦到文本框
    const textarea = contentElement.querySelector('.edit-textarea');
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    
    // 保存按钮事件
    const saveBtn = contentElement.querySelector('.save-edit-btn');
    saveBtn.addEventListener('click', () => {
        const newContent = textarea.value.trim();
        if (newContent && newContent !== originalContent) {
            // 更新消息数据
            messageData.content = newContent;
            messageData.timestamp = Date.now(); // 更新时间戳
            
            // 恢复显示
            if (!isUser && typeof marked !== 'undefined') {
                contentElement.innerHTML = marked.parse(newContent);
            } else {
                contentElement.textContent = newContent;
            }
            
            // 显示操作按钮
            actionsElement.style.display = 'flex';
            
            // 保存历史
            if (currentChatUrl) {
                saveChatHistoryForUrl(currentChatUrl);
            }
            
            showError({
                message: '消息已更新',
                type: 'info'
            });
        } else {
            // 取消编辑
            cancelEdit();
        }
    });
    
    // 取消按钮事件
    const cancelBtn = contentElement.querySelector('.cancel-edit-btn');
    cancelBtn.addEventListener('click', cancelEdit);
    
    // 取消编辑函数
    function cancelEdit() {
        // 恢复原始内容
        if (!isUser && typeof marked !== 'undefined') {
            contentElement.innerHTML = marked.parse(originalContent);
        } else {
            contentElement.textContent = originalContent;
        }
        
        // 显示操作按钮
        actionsElement.style.display = 'flex';
    }
    
    // ESC键取消编辑
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            cancelEdit();
        }
    });
}

/**
 * 重新生成AI回复
 * @param {string} messageId - AI消息ID
 */
async function regenerateMessage(messageId) {
    if (isChatting) {
        showError('正在对话中，请稍后再试');
        return;
    }
    
    const messageIndex = currentChatMessages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) {
        showError('未找到指定消息');
        return;
    }
    
    // 确保这是一条AI消息
    const targetMessage = currentChatMessages[messageIndex];
    if (targetMessage.role !== 'assistant') {
        showError('只能重新生成AI回复');
        return;
    }
    
    // 删除该AI消息及后续所有消息
    currentChatMessages = currentChatMessages.slice(0, messageIndex);
    rerenderChatMessages();
    
    // 获取上一条用户消息
    const lastUserMessageIndex = currentChatMessages.length - 1;
    if (lastUserMessageIndex >= 0 && currentChatMessages[lastUserMessageIndex].role === 'user') {
        const lastUserMessage = currentChatMessages[lastUserMessageIndex].content;
        
        // 设置生成状态
        isChatting = true;
        updateChatSendButton(true);
        
        try {
            await callChatAPI(lastUserMessage);
        } catch (error) {
            showError(`重新生成失败: ${error.message}`);
            isChatting = false;
            updateChatSendButton(false);
        }
    } else {
        showError('未找到对应的用户消息');
    }
}

/**
 * 处理消息操作按钮点击事件
 * @param {Event} event - 点击事件
 */
function handleMessageAction(event) {
    const button = event.target.closest('.action-btn');
    if (!button) return;
    
    const messageId = button.getAttribute('data-message-id');
    const action = button.getAttribute('data-action');
    
    if (!messageId || !action) return;
    
    switch (action) {
        case 'regenerate':
            regenerateMessage(messageId);
            break;
        case 'delete':
            deleteMessage(messageId);
            break;
        case 'edit':
            editMessage(messageId);
            break;
        default:
            console.warn('未知的操作类型:', action);
    }
}

// Function to display error messages
function showError(error) {
    // Clear previous classes
    errorDiv.className = 'error';
    
    // Set message and type
    if (typeof error === 'string') {
        errorDiv.textContent = error;
    } else {
        errorDiv.textContent = error.message;
        errorDiv.classList.add(error.type);
    }
    
    // Set display and timeout
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, error.type === 'info' ? 2000 : 5000);
}

// Function to clear error messages
function clearError() {
    errorDiv.style.display = 'none';
}

// Function to show loading state (only used for article extraction)
function showLoading() {
    refreshButton.disabled = true;
    loadingIndicator.style.display = 'flex';
}

// Function to hide loading state
function hideLoading() {
    refreshButton.disabled = false;
    loadingIndicator.style.display = 'none';
}

// Function to render markdown
function renderMarkdown() {
    if (renderMarkdownCheckbox.checked) {
        contentRendered.innerHTML = marked.parse(contentArea.value);
        translationRendered.innerHTML = marked.parse(translationArea.value);
        contentRendered.style.display = 'block';
        translationRendered.style.display = 'block';
        contentArea.style.display = 'none';
        translationArea.style.display = 'none';
    } else {
        contentRendered.style.display = 'none';
        translationRendered.style.display = 'none';
        contentArea.style.display = 'block';
        translationArea.style.display = 'block';
    }
}

// Function to update the content
function updateContent(markdown) {
    // 更新原文内容
    currentContent = markdown;
    contentArea.value = markdown;
    renderMarkdown();
    
    // 更新chat输入框的placeholder提示
    updateChatPlaceholder();
}

// Function to apply font settings
async function applyFontSettings() {
    const settings = await Settings.load();
    const areas = [contentArea, translationArea, contentRendered, translationRendered];
    areas.forEach(area => {
        if (area) {
            area.style.fontFamily = settings.font_family;
            area.style.fontSize = `${settings.font_size}px`;
        }
    });
}

// Function to apply text colors
async function applyTextColors() {
    const settings = await Settings.load();
    const areas = [contentArea, translationArea, contentRendered, translationRendered];
    areas.forEach(area => {
        if (area) {
            area.style.color = settings.text_color;
            area.style.backgroundColor = settings.background_color;
        }
    });
}

// Function to switch tabs
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = content.id === `${tabName}-tab` ? 'block' : 'none';
    });

    currentTab = tabName;
    
    // If switching to chat tab, update placeholder
    if (tabName === 'chat') {
        updateChatPlaceholder();
    }
}

// Function to toggle settings panel
function toggleSettings(show) {
    settingsPanel.classList.toggle('active', show);
}

// Function to update translate button state
function updateTranslateButton(isTranslating) {
    const playIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
    const stopIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16"/></svg>`;
    
    translateButton.innerHTML = isTranslating ? stopIcon : playIcon;
    translateButton.title = isTranslating ? '停止翻译' : '开始翻译';
    translateButton.style.color = isTranslating ? 'rgb(220 38 38)' : 'rgb(100 116 139)';
}

// Function to handle translation
async function handleTranslation() {
    if (isTranslating) {
        Settings.stopTranslation();
        isTranslating = false;
        updateTranslateButton(false);
        return;
    }

    if (!currentContent) {
        showError('No content to translate');
        return;
    }

    translationArea.value = '';
    renderMarkdown();
    clearError();
    
    isTranslating = true;
    updateTranslateButton(true);
    switchTab('translation');

    await Settings.translate(
        currentContent,
        currentUrl,
        (chunk) => {
            translationArea.value += chunk;
            renderMarkdown();
        },
        (error) => {
            showError(error);
            isTranslating = false;
            updateTranslateButton(false);
        },
        () => {
            isTranslating = false;
            updateTranslateButton(false);
        }
    );
}

// Function to populate backend selector
async function populateBackendSelector() {
    const settings = await Settings.load();
    const select = document.getElementById('backendSelect');
    select.innerHTML = '';
    
    settings.backends.forEach((backend, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = backend.name;
        select.appendChild(option);
    });
    
				select.value = settings.currentBackend;
}

// Function to populate translation selectors
async function populateTranslationSelectors() {
    const settings = await Settings.load();
    const settingsSelect = document.getElementById('translationSelect');
    const quickSelect = document.getElementById('quickTranslationSelect');
    settingsSelect.innerHTML = '';
    quickSelect.innerHTML = '';
    
    settings.translations.forEach((translation, index) => {
        // Settings panel selector
        const settingsOption = document.createElement('option');
        settingsOption.value = index;
        settingsOption.textContent = translation.name;
        settingsSelect.appendChild(settingsOption);
        
        // Quick selector
        const quickOption = document.createElement('option');
        quickOption.value = index;
        quickOption.textContent = translation.name;
        quickSelect.appendChild(quickOption);
    });
    
    settingsSelect.value = settings.currentTranslation;
    quickSelect.value = settings.currentTranslation;
}

// Function to sync translation selection
async function syncTranslationSelection(index) {
    const settings = await Settings.load();
    settings.currentTranslation = parseInt(index);
    
    // Update both selectors
    document.getElementById('translationSelect').value = index;
    document.getElementById('quickTranslationSelect').value = index;
    
    // Update translation form in settings panel
    const translation = settings.translations[index];
    updateTranslationForm(translation);
    
    // Save settings
    await Settings.save(settings);
}

// Function to update backend settings form
function updateBackendForm(backend) {
				document.getElementById('backendName').value = backend.name;
				document.getElementById('baseUrl').value = backend.base_url;
				document.getElementById('apiKey').value = backend.api_key;
				document.getElementById('model').value = backend.model;
}

// Function to update translation settings form
function updateTranslationForm(translation) {
				document.getElementById('translationName').value = translation.name;
				document.getElementById('systemPrompt').value = translation.system_prompt;
				document.getElementById('userPrompt').value = translation.user_prompt;
}

// Function to get backend settings from form
function getBackendFromForm() {
				return {
								name: document.getElementById('backendName').value.trim(),
								base_url: document.getElementById('baseUrl').value.trim(),
								api_key: document.getElementById('apiKey').value.trim(),
								model: document.getElementById('model').value.trim()
				};
}

// Function to get translation settings from form
function getTranslationFromForm() {
				return {
								name: document.getElementById('translationName').value.trim(),
								system_prompt: document.getElementById('systemPrompt').value.trim(),
								user_prompt: document.getElementById('userPrompt').value.trim()
				};
}

// Function to load settings into form
async function loadSettingsIntoForm() {
    const settings = await Settings.load();
    const currentBackend = settings.backends[settings.currentBackend];
    const currentTranslation = settings.translations[settings.currentTranslation];
    
    // Update backend selector and form
    await populateBackendSelector();
    updateBackendForm(currentBackend);
    
    // Update translation selectors and form
    await populateTranslationSelectors();
    updateTranslationForm(currentTranslation);
    
    // Update other settings
    document.getElementById('temperature').value = settings.temperature;
    document.getElementById('chatSystemPrompt').value = settings.chat_system_prompt;
    document.getElementById('fontFamily').value = settings.font_family;
    document.getElementById('fontSize').value = settings.font_size;
    document.getElementById('textColor').value = settings.text_color;
    document.getElementById('backgroundColor').value = settings.background_color;
    
    await applyFontSettings();
    applyTextColors();
}

// Function to save settings from form
async function saveSettingsFromForm() {
    try {
        const settings = await Settings.load();
        const currentBackendIndex = parseInt(document.getElementById('backendSelect').value);
        const currentTranslationIndex = parseInt(document.getElementById('translationSelect').value);
        
        // Validate current indices
        if (isNaN(currentBackendIndex) || currentBackendIndex < 0 || currentBackendIndex >= settings.backends.length) {
            throw new Error('Invalid backend selected');
        }
        if (isNaN(currentTranslationIndex) || currentTranslationIndex < 0 || currentTranslationIndex >= settings.translations.length) {
            throw new Error('Invalid translation selected');
        }
        
        // Update current backend settings
        settings.backends[currentBackendIndex] = getBackendFromForm();
        settings.currentBackend = currentBackendIndex;
        
        // Update current translation settings
        settings.translations[currentTranslationIndex] = getTranslationFromForm();
        settings.currentTranslation = currentTranslationIndex;
        
        // Update other settings
        const temperature = parseFloat(document.getElementById('temperature').value);
        if (!isNaN(temperature)) {
            settings.temperature = temperature;
        }
        
        const chatSystemPrompt = document.getElementById('chatSystemPrompt').value;
        if (chatSystemPrompt) {
            settings.chat_system_prompt = chatSystemPrompt;
        }
        
        const fontFamily = document.getElementById('fontFamily').value;
        if (fontFamily) {
            settings.font_family = fontFamily;
        }
        
        const fontSize = document.getElementById('fontSize').value;
        if (fontSize) {
            settings.font_size = fontSize;
        }
        
        const textColor = document.getElementById('textColor').value;
        if (textColor) {
            settings.text_color = textColor;
        }
        
        const backgroundColor = document.getElementById('backgroundColor').value;
        if (backgroundColor) {
            settings.background_color = backgroundColor;
        }

        if (await Settings.save(settings)) {
            applyTextColors();
            await populateBackendSelector(); // Refresh backend list
            await populateTranslationSelectors(); // Refresh translation list
            showError('Settings saved successfully');
            await applyFontSettings();
            toggleSettings(false);
        } else {
            throw new Error('Failed to save settings');
        }
    } catch (error) {
        console.error('Save settings error:', error);
        showError(error.message || 'Failed to save settings');
    }
}

// Function to add new backend
async function addNewBackend() {
				const settings = await Settings.load();
				settings.backends.push({
								name: 'New Backend',
								base_url: 'https://api.openai.com/v1',
								api_key: '',
								model: 'gpt-3.5-turbo'
				});
				settings.currentBackend = settings.backends.length - 1;
				
				if (await Settings.save(settings)) {
								await loadSettingsIntoForm();
								showError('New backend added');
				} else {
								showError('Failed to add backend');
				}
}

// Function to remove current backend
async function removeCurrentBackend() {
				const settings = await Settings.load();
				if (settings.backends.length <= 1) {
								showError('Cannot remove last backend');
								return;
				}
				
				const currentBackendIndex = parseInt(document.getElementById('backendSelect').value);
				settings.backends.splice(currentBackendIndex, 1);
				settings.currentBackend = Math.min(currentBackendIndex, settings.backends.length - 1);
				
				if (await Settings.save(settings)) {
								await loadSettingsIntoForm();
								showError('Backend removed');
				} else {
								showError('Failed to remove backend');
				}
}

// Function to add new translation
async function addNewTranslation() {
    const settings = await Settings.load();
    settings.translations.push({
        name: 'New Translation',
        system_prompt: 'You are a professional translator. Translate the following markdown content to Chinese, keeping the markdown format intact.',
        user_prompt: 'Translate the following content from {domain}:\n\n{content}'
    });
    settings.currentTranslation = settings.translations.length - 1;
    
    if (await Settings.save(settings)) {
        await populateTranslationSelectors();
        updateTranslationForm(settings.translations[settings.currentTranslation]);
        showError('New translation added');
    } else {
        showError('Failed to add translation');
    }
}

// Function to remove current translation
async function removeCurrentTranslation() {
    const settings = await Settings.load();
    if (settings.translations.length <= 1) {
        showError('Cannot remove last translation');
        return;
    }
    
    const currentTranslationIndex = parseInt(document.getElementById('translationSelect').value);
    settings.translations.splice(currentTranslationIndex, 1);
    settings.currentTranslation = Math.min(currentTranslationIndex, settings.translations.length - 1);
    
    if (await Settings.save(settings)) {
        await populateTranslationSelectors();
        updateTranslationForm(settings.translations[settings.currentTranslation]);
        showError('Translation removed');
    } else {
        showError('Failed to remove translation');
    }
}

// Function to request content
function requestContent() {
    clearError();
    showLoading();
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            // 保存当前聊天会话的历史（如果URL发生变化）
            const newUrl = tabs[0].url;
            if (currentChatUrl && currentUrl !== newUrl) {
                saveChatHistoryForUrl(currentChatUrl);
            }
            
            // 更新当前URL
            currentUrl = newUrl;
            
            // 立即恢复新URL的聊天历史
            restoreChatHistoryForUrl(currentUrl);
            
            // 发送消息获取页面内容
            chrome.tabs.sendMessage(tabs[0].id, { action: 'getHTML' });
        }
    });
}

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.error) {
        hideLoading();
        showError(message.error);
    } else {
        if (message.status === 'loading') {
            showLoading();
        } else if (message.status === 'complete') {
            hideLoading();
            updateContent(message.markdown);
        }
    }
});

// Chat Functions
/**
 * 生成唯一的消息ID
 * @returns {string} 唯一的消息ID
 */
function generateMessageId() {
    return 'msg-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
}

/**
 * 创建消息操作按钮
 * @param {boolean} isUser - 是否为用户消息
 * @param {string} messageId - 消息ID
 * @returns {HTMLElement} 操作按钮容器
 */
function createMessageActions(isUser, messageId) {
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'message-actions';
    
    if (isUser) {
        // 用户消息：编辑、删除
        actionsDiv.innerHTML = `
            <button class="action-btn edit-btn" title="编辑" data-message-id="${messageId}" data-action="edit">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            </button>
            <button class="action-btn delete-btn" title="删除" data-message-id="${messageId}" data-action="delete">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="m3 6 3 0"/>
                    <path d="m21 6-3 0"/>
                    <path d="m8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    <rect width="18" height="16" x="3" y="6" rx="2"/>
                    <path d="m10 11 0 6"/>
                    <path d="m14 11 0 6"/>
                </svg>
            </button>
        `;
    } else {
        // AI消息：重新生成、编辑、删除
        actionsDiv.innerHTML = `
            <button class="action-btn regenerate-btn" title="重新生成" data-message-id="${messageId}" data-action="regenerate">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                    <path d="M21 3v5h-5"/>
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
                    <path d="M3 21v-5h5"/>
                </svg>
            </button>
            <button class="action-btn edit-btn" title="编辑" data-message-id="${messageId}" data-action="edit">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
            </button>
            <button class="action-btn delete-btn" title="删除" data-message-id="${messageId}" data-action="delete">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="m3 6 3 0"/>
                    <path d="m21 6-3 0"/>
                    <path d="m8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    <rect width="18" height="16" x="3" y="6" rx="2"/>
                    <path d="m10 11 0 6"/>
                    <path d="m14 11 0 6"/>
                </svg>
            </button>
        `;
    }
    
    return actionsDiv;
}

/**
 * 更新最后一条AI消息的样式类
 */
function updateLastAiMessageClass() {
    // 移除所有消息的 last-ai 类
    document.querySelectorAll('.chat-message.ai').forEach(msg => {
        msg.classList.remove('last-ai');
    });
    
    // 只有当最后一条消息是AI消息时，才为其添加 last-ai 类
    const allMessages = document.querySelectorAll('.chat-message');
    if (allMessages.length > 0) {
        const lastMessage = allMessages[allMessages.length - 1];
        if (lastMessage.classList.contains('ai')) {
            lastMessage.classList.add('last-ai');
        }
    }
}

function displayChatMessage(content, isUser = false, messageId = null) {
    const id = messageId || generateMessageId();
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${isUser ? 'user' : 'ai'}`;
    messageDiv.setAttribute('data-message-id', id);
    messageDiv.style.position = 'relative'; // 为绝对定位的按钮提供参考
    
    // 消息内容容器
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // For AI messages, render markdown; for user messages, use plain text
    if (!isUser && typeof marked !== 'undefined') {
        contentDiv.innerHTML = marked.parse(content);
    } else {
        contentDiv.textContent = content;
    }
    
    // 创建操作按钮
    const actionsDiv = createMessageActions(isUser, id);
    
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(actionsDiv);
    chatMessages.appendChild(messageDiv);
    
    // 更新最后一条AI消息的样式
    updateLastAiMessageClass();
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return id;
}

function updateChatSendButton(isSending) {
    chatSendBtn.disabled = isSending;
    chatSendBtn.textContent = isSending ? '发送中...' : '发送';
    
    // 控制停止按钮的显示/隐藏
    if (chatStopBtn) {
        chatStopBtn.style.display = isSending ? 'inline-block' : 'none';
    }
}

/**
 * 更新聊天输入框的placeholder提示
 */
function updateChatPlaceholder() {
    if (chatInput) {
        if (currentContent && currentChatMessages.length === 0) {
            // 有文章内容且没有对话历史时，显示基于文章的提示
            chatInput.placeholder = "基于文章内容开始对话...";
        } else if (currentChatMessages.length > 0) {
            // 已经开始对话后，显示普通提示
            chatInput.placeholder = "输入您的消息...";
        } else {
            // 没有文章内容时，提示先提取文章
            chatInput.placeholder = "请先提取文章内容后开始对话...";
        }
    }
}

/**
 * 停止当前聊天请求
 */
function stopChatMessage() {
    if (chatController && isChatting) {
        chatController.abort();
        chatController = null;
        isChatting = false;
        updateChatSendButton(false);
        
        // 保存被中断的AI回复（如果有内容）
        if (currentAiResponse && currentAiMessageId) {
            currentChatMessages.push({
                id: currentAiMessageId,
                role: 'assistant',
                content: currentAiResponse,
                timestamp: Date.now()
            });
            
            // 清空当前回复变量
            currentAiResponse = '';
            currentAiMessageId = '';
        }
        
        // 保存当前聊天历史到锁定的URL（包括被中断的对话）
        if (currentChatUrl) {
            saveChatHistoryForUrl(currentChatUrl);
        }
        
        showError({type: 'info', message: '聊天已停止'});
    }
}

async function sendChatMessage() {
    const userMessage = chatInput.value.trim();
    if (!userMessage || isChatting) return;
    
    // Display user message and get message ID
    const messageId = displayChatMessage(userMessage, true);
    currentChatMessages.push({
        id: messageId,
        role: 'user',
        content: userMessage,
        timestamp: Date.now()
    });
    
    // 更新placeholder（对话开始后显示普通提示）
    updateChatPlaceholder();
    
    // 保存当前聊天历史到锁定的URL
    if (currentChatUrl) {
        saveChatHistoryForUrl(currentChatUrl);
    }
    
    // Clear input and update UI
    chatInput.value = '';
    isChatting = true;
    updateChatSendButton(true);
    
    try {
        await callChatAPI(userMessage);
    } catch (error) {
        showError(`聊天错误: ${error.message}`);
        isChatting = false;
        updateChatSendButton(false);
    }
}

async function callChatAPI(userMessage) {
    try {
        // Stop any existing chat request
        if (chatController) {
            chatController.abort();
        }
        
        // Create new controller
        chatController = new AbortController();
        
        const settings = await Settings.load();
        const currentBackend = settings.backends[settings.currentBackend];
        
        if (!currentBackend.api_key) {
            throw new Error('API密钥未设置，请前往设置页面配置');
        }
        
        // Prepare system prompt with content and domain
        let systemPrompt = settings.chat_system_prompt;
        if (currentContent && currentUrl) {
            systemPrompt = systemPrompt
                .replace('{domain}', new URL(currentUrl).hostname)
                .replace('{content}', currentContent);
        }
        
        // Prepare messages
        const messages = [
            { role: 'system', content: systemPrompt },
            ...currentChatMessages
        ];
        
        const requestBody = {
            model: currentBackend.model,
            messages: messages,
            temperature: settings.temperature,
            stream: true,
            max_tokens: 8192
        };
        
        const response = await fetch(`${currentBackend.base_url}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentBackend.api_key}`,
                'HTTP-Referer': 'https://imtass.me',
                'X-Title': 'Article Translator'
            },
            body: JSON.stringify(requestBody),
            signal: chatController.signal
        });
        
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.statusText}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        // Create AI message element with ID
        currentAiMessageId = generateMessageId();
        const aiMessageDiv = document.createElement('div');
        aiMessageDiv.className = 'chat-message ai';
        aiMessageDiv.setAttribute('data-message-id', currentAiMessageId);
        aiMessageDiv.style.position = 'relative';
        
        // 创建消息内容容器
        const aiContentDiv = document.createElement('div');
        aiContentDiv.className = 'message-content';
        
        // 创建操作按钮
        const aiActionsDiv = createMessageActions(false, currentAiMessageId);
        
        aiMessageDiv.appendChild(aiContentDiv);
        aiMessageDiv.appendChild(aiActionsDiv);
        chatMessages.appendChild(aiMessageDiv);
        
        // 更新最后一条AI消息的样式
        updateLastAiMessageClass();
        
        currentAiResponse = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;
                    
                    try {
                        const parsed = JSON.parse(data);
                        const content = parsed.choices[0]?.delta?.content;
                        if (content) {
                            currentAiResponse += content;
                            // Render markdown for AI responses during streaming
                            if (typeof marked !== 'undefined') {
                                aiContentDiv.innerHTML = marked.parse(currentAiResponse);
                            } else {
                                aiContentDiv.textContent = currentAiResponse;
                            }
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                        }
                    } catch (e) {
                        console.error('Failed to parse chunk:', e);
                    }
                }
            }
        }
        
        // Add AI response to chat history
        if (currentAiResponse) {
            currentChatMessages.push({
                id: currentAiMessageId,
                role: 'assistant',
                content: currentAiResponse,
                timestamp: Date.now()
            });
            
            // 保存聊天历史到锁定的URL
            if (currentChatUrl) {
                saveChatHistoryForUrl(currentChatUrl);
            }
        }
        
        chatController = null;
        isChatting = false;
        updateChatSendButton(false);
        
        // 清空当前回复变量
        currentAiResponse = '';
        currentAiMessageId = '';
        
    } catch (error) {
        // 即使是中断错误，也要保存已经生成的部分响应
        if (currentAiResponse && error.name === 'AbortError') {
            currentChatMessages.push({
                id: currentAiMessageId,
                role: 'assistant',
                content: currentAiResponse,
                timestamp: Date.now()
            });
            
            // 保存聊天历史到锁定的URL
            if (currentChatUrl) {
                saveChatHistoryForUrl(currentChatUrl);
            }
        }
        
        chatController = null;
        isChatting = false;
        updateChatSendButton(false);
        
        // 清空当前回复变量
        currentAiResponse = '';
        currentAiMessageId = '';
        
        if (error.name === 'AbortError') {
            showError({type: 'info', message: '聊天已停止'});
        } else {
            throw error;
        }
    }
}

// Function to handle copy action
async function handleCopy() {
    try {
        const activeTextArea = currentTab === 'content' ? contentArea : translationArea;
        const text = activeTextArea.value;
        
        if (!text) {
            showError('没有可复制的内容');
            return;
        }

        await navigator.clipboard.writeText(text);
        
        // Visual feedback
        const originalText = copyButton.innerHTML;
        copyButton.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            已复制
        `;
        copyButton.style.color = 'rgb(34 197 94)';
        
        setTimeout(() => {
            copyButton.innerHTML = originalText;
            copyButton.style.color = '';
        }, 2000);
    } catch (error) {
        showError('复制失败');
        console.error('Copy failed:', error);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Add CSS styles for message actions - Updated to fix floating button overlap issue
    const style = document.createElement('style');
    style.textContent = `
        .chat-message {
            margin-bottom: 16px; /* 增加消息间距，为按钮留出空间 */
        }
        
        .message-actions {
            display: none;
            position: absolute;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 6px;
            padding: 4px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            z-index: 10;
            gap: 2px;
        }
        
        /* AI消息按钮：在右下角与气泡重叠 */
        .chat-message.ai .message-actions {
            right: -8px; /* 右下角位置 */
            bottom: -8px; /* 向下移动，与气泡底部重叠 */
        }
        
        /* 用户消息按钮：在左下角与气泡重叠 */
        .chat-message.user .message-actions {
            left: -8px; /* 用户消息按钮在左侧 */
            bottom: -8px; /* 向下移动，与气泡底部重叠 */
        }
        
        .chat-message:hover .message-actions,
        .chat-message.last-ai .message-actions {
            display: flex;
        }
        
        /* 最后一个AI消息的按钮位置在气泡外面 */
        .chat-message.last-ai .message-actions {
            bottom: -32px; /* 向下移动更多，完全在气泡外面 */
        }
        
        .action-btn {
            background: none;
            border: none;
            padding: 4px;
            cursor: pointer;
            border-radius: 4px;
            color: rgb(100, 116, 139);
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 24px;
            min-height: 24px;
        }
        
        .action-btn:hover {
            background: rgb(241, 245, 249);
            color: rgb(51, 65, 85);
        }
        
        .action-btn svg {
            width: 12px;
            height: 12px;
        }
        
        .regenerate-btn:hover {
            color: rgb(34, 197, 94);
        }
        
        .edit-btn:hover {
            color: rgb(59, 130, 246);
        }
        
        .delete-btn:hover {
            color: rgb(239, 68, 68);
        }
        
        /* 减少聊天容器的右边距，因为按钮现在重叠了 */
        .chat-messages {
            padding-right: 16px; /* 减少右边距 */
        }
    `;
    document.head.appendChild(style);
    
    // Initialize UI elements
    refreshButton = document.getElementById('refreshButton');
    translateButton = document.getElementById('translateButton');
    settingsButton = document.getElementById('settingsButton');
    settingsPanel = document.getElementById('settings-panel');
    loadingIndicator = document.getElementById('loading');
    errorDiv = document.getElementById('error');
    contentArea = document.getElementById('contentArea');
    translationArea = document.getElementById('translationArea');
    contentRendered = document.getElementById('content-rendered');
    translationRendered = document.getElementById('translation-rendered');
    renderMarkdownCheckbox = document.getElementById('renderMarkdown');
    copyButton = document.getElementById('copyButton');
    
    // Initialize chat elements
    chatMessages = document.getElementById('chatMessages');
    chatInput = document.getElementById('chatInput');
    chatSendBtn = document.getElementById('chatSendBtn');
    chatStopBtn = document.getElementById('chatStopBtn');
    clearChatBtn = document.getElementById('clearChatBtn');
    chatContainer = document.querySelector('.chat-container');
    
    // Set up tab switching
    document.querySelectorAll('.tab-button').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Set up buttons
    refreshButton.addEventListener('click', requestContent);
    translateButton.addEventListener('click', handleTranslation);
    settingsButton.addEventListener('click', () => toggleSettings(true));
    document.getElementById('closeSettings').addEventListener('click', () => toggleSettings(false));
    document.getElementById('saveSettings').addEventListener('click', saveSettingsFromForm);
    copyButton.addEventListener('click', handleCopy);
    renderMarkdownCheckbox.addEventListener('change', renderMarkdown);
    
    // Set up chat functionality
    chatSendBtn.addEventListener('click', sendChatMessage);
    chatStopBtn.addEventListener('click', stopChatMessage);
    clearChatBtn.addEventListener('click', handleClearChat);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    });
    
    // Set up message action event delegation
    chatMessages.addEventListener('click', handleMessageAction);
    
    // Set up color pickers
    document.getElementById('textColor').addEventListener('change', async (e) => {
        const settings = await Settings.load();
        settings.text_color = e.target.value;
        await Settings.save(settings);
        applyTextColors();
    });
    
    document.getElementById('backgroundColor').addEventListener('change', async (e) => {
        const settings = await Settings.load();
        settings.background_color = e.target.value;
        await Settings.save(settings);
        applyTextColors();
    });
    
    // Set up backend management
    document.getElementById('backendSelect').addEventListener('change', async (e) => {
        const settings = await Settings.load();
        const backend = settings.backends[e.target.value];
        updateBackendForm(backend);
    });
    
    document.getElementById('addBackend').addEventListener('click', addNewBackend);
    document.getElementById('removeBackend').addEventListener('click', removeCurrentBackend);
    
    // Set up translation management
    document.getElementById('translationSelect').addEventListener('change', async (e) => {
        await syncTranslationSelection(e.target.value);
    });
    
    document.getElementById('quickTranslationSelect').addEventListener('change', async (e) => {
        await syncTranslationSelection(e.target.value);
    });
    
    document.getElementById('addTranslation').addEventListener('click', addNewTranslation);
    document.getElementById('removeTranslation').addEventListener('click', removeCurrentTranslation);
    
    // Initialize text areas
    contentArea = document.getElementById('contentArea');
    translationArea = document.getElementById('translationArea');
    
    // Load initial settings
    await loadSettingsIntoForm();
    
    // Start URL monitoring for automatic tab switching
    startUrlMonitoring();
    
    // Initialize chat placeholder
    updateChatPlaceholder();
    
    // Initial content request
    requestContent();
});

// Request when sidebar becomes visible
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        // 当侧边栏重新可见时，立即检查URL变化
        setTimeout(() => {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0] && tabs[0].url !== currentUrl) {
                    handleTabChange();
                }
            });
        }, 100);
    }
});

// 处理标签页变化的函数
function handleTabChange() {
    // 直接调用requestContent来处理所有逻辑
    requestContent();
}

// 定时检查URL变化的函数
function startUrlMonitoring() {
    setInterval(() => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0] && tabs[0].url !== currentUrl) {
                // URL发生变化，触发内容更新
                handleTabChange();
            }
        });
    }, 1000); // 每秒检查一次
}
