// Function to extract and convert content
function extractContent() {
    try {
        // Create a clone of the document
        const documentClone = document.cloneNode(true);
        
        // Create a new Readability object
        const reader = new Readability(documentClone, {
            keepClasses: false,
            debug: false
        });
        
        // Parse the content
        const article = reader.parse();
        
        // Create TurndownService instance with custom rules
        const turndownService = new TurndownService({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced'
        });

        // Remove links but keep text
        turndownService.addRule('removeLinks', {
            filter: ['a'],
            replacement: function(content) {
                return content;
            }
        });

        // Remove images completely
        turndownService.addRule('removeImages', {
            filter: ['img'],
            replacement: function() {
                return '';
            }
        });
        
        // Combine title and content
        const titleMarkdown = article.title ? `# ${article.title}\n\n` : '';
        const contentMarkdown = turndownService.turndown(article.content);
        const fullMarkdown = titleMarkdown + contentMarkdown;
        
        // Send the result
        chrome.runtime.sendMessage({ 
            markdown: fullMarkdown,
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
            extractContent();
        } else {
            chrome.runtime.sendMessage({ 
                status: 'loading',
                url: window.location.href
            });
        }
    }
});

// Extract content automatically when page is fully loaded
document.addEventListener('readystatechange', () => {
    if (document.readyState === 'complete') {
        extractContent();
    }
});

// Also extract when DOM content is loaded (backup)
document.addEventListener('DOMContentLoaded', () => {
    if (document.readyState === 'complete') {
        extractContent();
    }
});
