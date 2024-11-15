// UI Elements
let refreshButton;
let loadingIndicator;
let statusElement;
let errorDiv;
let htmlContent;

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
function showLoading() {
    refreshButton.disabled = true;
    loadingIndicator.style.display = 'flex';
    statusElement.textContent = 'Waiting for page to load...';
}

// Function to hide loading state
function hideLoading() {
    refreshButton.disabled = false;
    loadingIndicator.style.display = 'none';
}

// Function to update status
function updateStatus(url) {
    const displayUrl = url.length > 50 ? url.substring(0, 47) + '...' : url;
    statusElement.textContent = `Current: ${displayUrl}`;
}

// Function to update the HTML content
function updateContent(html) {
    htmlContent.value = html;
}

// Function to request HTML content
function requestHTML() {
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
            updateContent(message.html);
        }
        if (message.url) {
            updateStatus(message.url);
        }
    }
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI elements
    refreshButton = document.getElementById('refreshButton');
    loadingIndicator = document.getElementById('loading');
    statusElement = document.getElementById('status');
    errorDiv = document.getElementById('error');
    htmlContent = document.getElementById('htmlContent');
    
    // Set up refresh button
    refreshButton.addEventListener('click', requestHTML);
    
    // Initial content request
    requestHTML();
});

// Request when sidebar becomes visible
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        requestHTML();
    }
});
