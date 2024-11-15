// Listen for messages from the sidebar
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    try {
        if (request.action === 'getHTML') {
            // Get the complete HTML of the page
            const html = document.documentElement.outerHTML;
            // Send it to the sidebar
            chrome.runtime.sendMessage({ html: html });
        }
    } catch (error) {
        // Send any errors to the sidebar
        chrome.runtime.sendMessage({ error: error.toString() });
    }
});
