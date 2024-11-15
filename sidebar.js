// UI Elements
let refreshButton;
let translateButton;
let loadingIndicator;
let errorDiv;
let contentArea;
let translationArea;
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

// Function to load settings into form
async function loadSettingsIntoForm() {
    const settings = await Settings.load();
    document.getElementById('baseUrl').value = settings.base_url;
    document.getElementById('apiKey').value = settings.api_key;
    document.getElementById('model').value = settings.model;
    document.getElementById('temperature').value = settings.temperature;
    document.getElementById('systemPrompt').value = settings.system_prompt;
    document.getElementById('userPrompt').value = settings.user_prompt;
    document.getElementById('fontFamily').value = settings.font_family;
    document.getElementById('fontSize').value = settings.font_size;
    
    await applyFontSettings();
}

// Function to save settings from form
async function saveSettingsFromForm() {
    const settings = {
        base_url: document.getElementById('baseUrl').value.trim(),
        api_key: document.getElementById('apiKey').value.trim(),
        model: document.getElementById('model').value.trim(),
        temperature: parseFloat(document.getElementById('temperature').value),
        system_prompt: document.getElementById('systemPrompt').value.trim(),
        user_prompt: document.getElementById('userPrompt').value.trim(),
        font_family: document.getElementById('fontFamily').value,
        font_size: document.getElementById('fontSize').value
    };

    if (await Settings.save(settings)) {
        showError('Settings saved successfully');
        await applyFontSettings();
        toggleSettings(false);
    } else {
        showError('Failed to save settings');
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
