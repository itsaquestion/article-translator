// utils.js

// Store references to DOM elements after initialization
let _errorDiv;
let _loadingIndicator;
let _refreshButton;
let _loadingTextElement;

/**
 * Initializes the utility functions with necessary DOM elements.
 * Must be called once after the DOM is loaded.
 * @param {object} elements - An object containing DOM element references.
 * @param {HTMLElement} elements.errorDiv - The element to display errors.
 * @param {HTMLElement} elements.loadingIndicator - The loading indicator element.
 * @param {HTMLElement} elements.refreshButton - The refresh button element.
 */
function initializeUtils(elements) {
    _errorDiv = elements.errorDiv;
    _loadingIndicator = elements.loadingIndicator;
    _refreshButton = elements.refreshButton;
    if (_loadingIndicator) {
        _loadingTextElement = _loadingIndicator.querySelector('#loadingText');
    }
}

/**
 * Displays an error message.
 * @param {string|{message: string, type?: 'info'|'warning'|'error'}} error - The error string or an object with message and type.
 */
function showError(error) {
    if (!_errorDiv) return;

    // Clear previous type classes
    _errorDiv.classList.remove('info', 'warning', 'error'); // Remove all potential type classes

    let message;
    let type = 'error'; // Default type

    if (typeof error === 'string') {
        message = error;
    } else if (error && typeof error.message === 'string') {
        message = error.message;
        type = error.type === 'info' || error.type === 'warning' ? error.type : 'error';
    } else {
        message = 'An unknown error occurred.'; // Fallback message
    }

    _errorDiv.textContent = message;
    _errorDiv.classList.add(type); // Add the determined type class

    _errorDiv.style.display = 'block';

    // Auto-hide after a delay
    const timeout = (type === 'info') ? 2000 : 5000;
    setTimeout(() => {
        if (_errorDiv) _errorDiv.style.display = 'none';
    }, timeout);
}

/**
 * Clears any currently displayed error message.
 */
function clearError() {
    if (_errorDiv) _errorDiv.style.display = 'none';
}

/**
 * Shows the loading indicator.
 * @param {string} [message='Processing...'] - Optional message to display.
 */
function showLoading(message = 'Processing...') {
    if (_refreshButton) _refreshButton.disabled = true;
    if (_loadingIndicator) {
        if (_loadingTextElement) {
            _loadingTextElement.textContent = message;
        }
        _loadingIndicator.style.display = 'flex'; // Use flex as per original CSS
    }
}

/**
 * Hides the loading indicator.
 */
function hideLoading() {
    if (_refreshButton) _refreshButton.disabled = false;
    if (_loadingIndicator) _loadingIndicator.style.display = 'none';
}

// Expose functions globally under the 'Utils' namespace
// This avoids module system issues in simple Chrome extensions
var Utils = {
    initializeUtils,
    showError,
    clearError,
    showLoading,
    hideLoading
};