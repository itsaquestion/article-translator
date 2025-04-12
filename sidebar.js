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

// Function to apply text colors
async function applyTextColors() {
    const settings = await Settings.load();
    const areas = [contentArea, translationArea];
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
    
    // Initial content request
    requestContent();
});

// Request when sidebar becomes visible
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        requestContent();
    }
});
