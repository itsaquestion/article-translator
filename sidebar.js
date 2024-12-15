// UI Elements
let refreshButton;
let translateButton;
let loadingIndicator;
let errorDiv;
let contentArea;
let translationArea;
let copyButton;
let currentTab = 'content';
let currentContent = '';
let currentUrl = '';
let isTranslating = false;

// Function to display error messages
function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 3000);
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

// Function to update the content
function updateContent(markdown) {
    currentContent = markdown;
    contentArea.value = markdown;
}

// Function to apply font settings
async function applyFontSettings() {
    const settings = await Settings.load();
    const areas = [contentArea, translationArea];
    areas.forEach(area => {
        if (area) {
            area.style.fontFamily = settings.font_family;
            area.style.fontSize = `${settings.font_size}px`;
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
    clearError();
    
    isTranslating = true;
    updateTranslateButton(true);
    switchTab('translation');

    await Settings.translate(
        currentContent,
        currentUrl,
        (chunk) => {
            translationArea.value += chunk;
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

// Function to update backend settings form
function updateBackendForm(backend) {
    document.getElementById('backendName').value = backend.name;
    document.getElementById('baseUrl').value = backend.base_url;
    document.getElementById('apiKey').value = backend.api_key;
    document.getElementById('model').value = backend.model;
}

// Function to get backend settings from form
function getBackendFromForm() {
    return {
								name: document.getElementById('backendName').value.trim(),
        base_url: document.getElementById('baseUrl').value.trim(),
        api_key: document.getElementById('apiKey').value.trim(),
        model: document.getElementById('model').value.trim(),
    };
}

// Function to load settings into form
async function loadSettingsIntoForm() {
				const settings = await Settings.load();
				const currentBackend = settings.backends[settings.currentBackend];
				
				// Update backend selector and form
				await populateBackendSelector();
				updateBackendForm(currentBackend);
				
				// Update other settings
				document.getElementById('temperature').value = settings.temperature;
				document.getElementById('systemPrompt').value = settings.system_prompt;
				document.getElementById('userPrompt').value = settings.user_prompt;
				document.getElementById('fontFamily').value = settings.font_family;
				document.getElementById('fontSize').value = settings.font_size;
				
				await applyFontSettings();
}

// Function to save settings from form
async function saveSettingsFromForm() {
				try {
								const settings = await Settings.load();
								const currentBackendIndex = parseInt(document.getElementById('backendSelect').value);
								
								// Validate current backend index
								if (isNaN(currentBackendIndex) || currentBackendIndex < 0 || currentBackendIndex >= settings.backends.length) {
												throw new Error('Invalid backend selected');
								}
								
								// Update current backend settings
								settings.backends[currentBackendIndex] = getBackendFromForm();
								settings.currentBackend = currentBackendIndex;
								
								// Update other settings
								const temperature = parseFloat(document.getElementById('temperature').value);
								if (!isNaN(temperature)) {
												settings.temperature = temperature;
								}
								
								const systemPrompt = document.getElementById('systemPrompt').value.trim();
								if (systemPrompt) {
												settings.system_prompt = systemPrompt;
								}
								
								const userPrompt = document.getElementById('userPrompt').value.trim();
								if (userPrompt) {
												settings.user_prompt = userPrompt;
								}
								
								const fontFamily = document.getElementById('fontFamily').value;
								if (fontFamily) {
												settings.font_family = fontFamily;
								}
								
								const fontSize = document.getElementById('fontSize').value;
								if (fontSize) {
												settings.font_size = fontSize;
								}

								if (await Settings.save(settings)) {
												await populateBackendSelector(); // Refresh backend list
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
								model: 'gpt-3.5-turbo',
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

// Function to request content
function requestContent() {
    clearError();
    showLoading();
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'getHTML' });
            currentUrl = tabs[0].url;
        } else {
            hideLoading();
            showError('No active tab found');
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
    // Initialize UI elements
    refreshButton = document.getElementById('refreshButton');
    translateButton = document.getElementById('translateButton');
    settingsButton = document.getElementById('settingsButton');
    settingsPanel = document.getElementById('settings-panel');
    loadingIndicator = document.getElementById('loading');
    errorDiv = document.getElementById('error');
    contentArea = document.getElementById('contentArea');
    translationArea = document.getElementById('translationArea');
    copyButton = document.getElementById('copyButton');
    
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
    
    // Set up backend management
    document.getElementById('backendSelect').addEventListener('change', async (e) => {
        const settings = await Settings.load();
        const backend = settings.backends[e.target.value];
        updateBackendForm(backend);
    });
    
    document.getElementById('addBackend').addEventListener('click', addNewBackend);
    document.getElementById('removeBackend').addEventListener('click', removeCurrentBackend);
    
    // Load initial settings
    await loadSettingsIntoForm();
    
    // Initial content request
    requestContent();
});

// Request when sidebar becomes visible
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        requestContent();
    }
});
