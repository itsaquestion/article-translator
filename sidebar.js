// UI Elements
let refreshButton;
let translateButton;
let loadingIndicator;
let statusElement;
let errorDiv;
let contentArea;
let translationArea;
let currentTab = 'content';
let currentContent = '';
let currentUrl = '';

// Function to display error messages
function showError(message) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

// Function to clear error messages
function clearError() {
    errorDiv.style.display = 'none';
}

// Function to show loading state
function showLoading(message = 'Extracting...') {
    refreshButton.disabled = true;
    translateButton.disabled = true;
    loadingIndicator.style.display = 'flex';
    loadingIndicator.querySelector('span').textContent = message;
    statusElement.textContent = 'Waiting...';
}

// Function to hide loading state
function hideLoading() {
    refreshButton.disabled = false;
    translateButton.disabled = false;
    loadingIndicator.style.display = 'none';
}

// Function to update status
function updateStatus(url) {
    currentUrl = url;
    const displayUrl = url.length > 50 ? url.substring(0, 47) + '...' : url;
    statusElement.textContent = `Current: ${displayUrl}`;
}

// Function to update the content
function updateContent(markdown) {
    currentContent = markdown;
    contentArea.value = markdown;
}

// Function to switch tabs
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}-tab`);
    });

    currentTab = tabName;
}

// Function to handle translation
async function handleTranslation() {
    if (!currentContent) {
        showError('No content to translate');
        return;
    }

    showLoading('Translating...');
    translationArea.value = '';
    switchTab('translation');

    await Settings.translate(
        currentContent,
        currentUrl,
        (chunk) => {
            translationArea.value += chunk;
            translationArea.scrollTop = translationArea.scrollHeight;
        },
        (error) => {
            hideLoading();
            showError(error);
        },
        () => {
            hideLoading();
        }
    );
}

// Function to load settings into form
async function loadSettingsIntoForm() {
    const settings = await Settings.load();
    document.getElementById('baseUrl').value = settings.base_url;
    document.getElementById('apiKey').value = settings.api_key;
    document.getElementById('temperature').value = settings.temperature;
    document.getElementById('systemPrompt').value = settings.system_prompt;
    document.getElementById('userPrompt').value = settings.user_prompt;
}

// Function to save settings from form
async function saveSettingsFromForm() {
    const settings = {
        base_url: document.getElementById('baseUrl').value.trim(),
        api_key: document.getElementById('apiKey').value.trim(),
        temperature: parseFloat(document.getElementById('temperature').value),
        system_prompt: document.getElementById('systemPrompt').value.trim(),
        user_prompt: document.getElementById('userPrompt').value.trim()
    };

    if (await Settings.save(settings)) {
        statusElement.textContent = 'Settings saved successfully';
        setTimeout(() => {
            if (statusElement.textContent === 'Settings saved successfully') {
                statusElement.textContent = currentUrl ? `Current: ${currentUrl}` : '';
            }
        }, 2000);
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
        if (message.url) {
            updateStatus(message.url);
        }
    }
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Initialize UI elements
    refreshButton = document.getElementById('refreshButton');
    translateButton = document.getElementById('translateButton');
    loadingIndicator = document.getElementById('loading');
    statusElement = document.getElementById('status');
    errorDiv = document.getElementById('error');
    contentArea = document.getElementById('contentArea');
    translationArea = document.getElementById('translationArea');
    
    // Set up tab switching
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => switchTab(tab.dataset.tab));
    });

    // Set up buttons
    refreshButton.addEventListener('click', requestContent);
    translateButton.addEventListener('click', handleTranslation);
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
