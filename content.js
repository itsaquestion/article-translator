// Function to send HTML content
function sendHTML() {
    try {
        const html = document.documentElement.outerHTML;
        chrome.runtime.sendMessage({ 
            html: html,
            status: 'complete',
            url: window.location.href
        });
    } catch (error) {
        chrome.runtime.sendMessage({ 
            error: error.toString(),
            status: 'error',
            url: window.location.href
        });
    }
}

// Listen for messages from the sidebar
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getHTML') {
        if (document.readyState === 'complete') {
            sendHTML();
        } else {
            chrome.runtime.sendMessage({ 
                status: 'loading',
                url: window.location.href
            });
        }
    }
});

// Send HTML automatically when page is fully loaded
document.addEventListener('readystatechange', () => {
    if (document.readyState === 'complete') {
        sendHTML();
    }
});

// Also send HTML when DOM content is loaded (backup)
document.addEventListener('DOMContentLoaded', () => {
    if (document.readyState === 'complete') {
        sendHTML();
    }
});
