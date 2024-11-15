// Function to display error messages
function showError(message) {
    const errorDiv = document.getElementById('error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
}

// Function to clear error messages
function clearError() {
    const errorDiv = document.getElementById('error');
    errorDiv.style.display = 'none';
}

// Function to update the HTML content
function updateContent(html) {
    document.getElementById('htmlContent').value = html;
}

// Function to request HTML content
function requestHTML() {
    clearError();
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.tabs.sendMessage(tabs[0].id, { action: 'getHTML' });
        } else {
            showError('No active tab found');
        }
    });
}

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.error) {
        showError(message.error);
    } else if (message.html) {
        updateContent(message.html);
    }
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Set up refresh button
    document.getElementById('refreshButton').addEventListener('click', requestHTML);
    
    // Initial content request
    requestHTML();
});

// Request when sidebar becomes visible
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        requestHTML();
    }
});
