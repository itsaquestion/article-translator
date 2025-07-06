// ui.js - Handles DOM manipulation and UI updates for the sidebar

// Store references to DOM elements after initialization
let _elements = {};

/**
 * Initializes the UI module with necessary DOM elements.
 * Must be called once after the DOM is loaded.
 * @param {object} elements - An object containing DOM element references.
 */
function initializeUI(elements) {
    _elements = elements;
}

/**
 * Updates the content area with the given markdown.
 * @param {string} markdown - The markdown content to display.
 */
function updateContent(markdown) {
    if (_elements.contentArea) {
        _elements.contentArea.value = markdown;
    }
}

/**
 * Applies font settings (family and size) to text areas.
 * @param {object} settings - The settings object.
 * @param {string} settings.font_family - The font family to apply.
 * @param {string} settings.font_size - The font size to apply.
 */
function applyFontSettings(settings) {
    const areas = [_elements.contentArea, _elements.translationArea];
    areas.forEach(area => {
        if (area) {
            area.style.fontFamily = settings.font_family;
            area.style.fontSize = `${settings.font_size}px`;
        }
    });
}

/**
 * Applies text and background colors to text areas.
 * @param {object} settings - The settings object.
 * @param {string} settings.text_color - The text color to apply.
 * @param {string} settings.background_color - The background color to apply.
 */
function applyTextColors(settings) {
    const areas = [_elements.contentArea, _elements.translationArea];
    areas.forEach(area => {
        if (area) {
            area.style.color = settings.text_color;
            area.style.backgroundColor = settings.background_color;
        }
    });
}

/**
 * Switches the visible tab in the sidebar.
 * @param {string} tabName - The name of the tab to switch to ('content', 'translation', 'params').
 */
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Update tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        // Use flex for active tabs as per original CSS
        content.style.display = content.id === `${tabName}-tab` ? 'flex' : 'none';
    });
}

/**
 * Shows or hides the settings panel.
 * @param {boolean} show - True to show, false to hide.
 */
function toggleSettings(show) {
    if (_elements.settingsPanel) {
        _elements.settingsPanel.classList.toggle('active', show);
    }
}

/**
 * Updates the appearance and title of the translate button.
 * @param {boolean} isTranslating - Whether a translation is currently in progress.
 */
function updateTranslateButton(isTranslating) {
    if (!_elements.translateButton) return;

    const playIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
    const stopIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16"/></svg>`;

    _elements.translateButton.innerHTML = isTranslating ? stopIcon : playIcon;
    _elements.translateButton.title = isTranslating ? '停止翻译' : '开始翻译';
    _elements.translateButton.style.color = isTranslating ? 'rgb(220 38 38)' : ''; // Reset color when not translating
}

/**
 * Populates the backend selector dropdown in the settings panel.
 * @param {object} settings - The current settings object.
 */
function populateBackendSelector(settings) {
    const select = _elements.backendSelect;
    if (!select) return;
    select.innerHTML = '';

    settings.backends.forEach((backend, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = backend.name;
        select.appendChild(option);
    });

    select.value = settings.currentBackend;
}

/**
 * Populates both translation selector dropdowns (settings panel and quick select).
 * @param {object} settings - The current settings object.
 */
function populateTranslationSelectors(settings) {
    const settingsSelect = _elements.translationSelect;
    const quickSelect = _elements.quickTranslationSelect;
    if (!settingsSelect || !quickSelect) return;

    settingsSelect.innerHTML = '';
    quickSelect.innerHTML = '';

    settings.translations.forEach((translation, index) => {
        const settingsOption = document.createElement('option');
        settingsOption.value = index;
        settingsOption.textContent = translation.name;
        settingsSelect.appendChild(settingsOption);

        const quickOption = document.createElement('option');
        quickOption.value = index;
        quickOption.textContent = translation.name;
        quickSelect.appendChild(quickOption);
    });

    settingsSelect.value = settings.currentTranslation;
    quickSelect.value = settings.currentTranslation;
}

/**
 * Updates the backend settings form fields.
 * @param {object} backend - The backend object to populate the form with.
 */
function updateBackendForm(backend) {
    if (!_elements.backendName) return; // Check if elements exist
    _elements.backendName.value = backend.name;
    _elements.baseUrl.value = backend.base_url;
    _elements.apiKey.value = backend.api_key;
    _elements.model.value = backend.model;
    _elements.extraParams.value = backend.extra_params || '{}';
}

/**
 * Updates the translation settings form fields.
 * @param {object} translation - The translation object to populate the form with.
 */
function updateTranslationForm(translation) {
    if (!_elements.translationName) return; // Check if elements exist
    _elements.translationName.value = translation.name;
    _elements.systemPrompt.value = translation.system_prompt;
    _elements.userPrompt.value = translation.user_prompt;
}

/**
 * Provides visual feedback on the copy button after a successful copy.
 */
function showCopyFeedback() {
    if (!_elements.copyButton) return;
    const copyButton = _elements.copyButton;
    const originalText = copyButton.innerHTML; // Assuming the original includes the SVG and text
    const originalColor = copyButton.style.color;

    copyButton.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        已复制
    `;
    copyButton.style.color = 'rgb(34 197 94)'; // Green color for success

    setTimeout(() => {
        copyButton.innerHTML = originalText;
        copyButton.style.color = originalColor;
    }, 2000);
}

/**
 * Updates the display of the request parameters area.
 * @param {object|null} params - The request parameters object, or null.
 */
function updateRequestParamsArea(params) {
    if (_elements.paramsArea) {
        if (params) {
            _elements.paramsArea.value = JSON.stringify(params, null, 2);
        } else {
            _elements.paramsArea.value = ''; // Clear if no params
        }
    }
}

/**
 * Updates the translation area content.
 * @param {string} text - The text to display in the translation area.
 */
function updateTranslationArea(text) {
    if (_elements.translationArea) {
        _elements.translationArea.value = text;
    }
}

/**
 * Appends text to the translation area (for streaming).
 * @param {string} chunk - The chunk of text to append.
 */
function appendToTranslationArea(chunk) {
    if (_elements.translationArea) {
        _elements.translationArea.value += chunk;
    }
}


// Expose functions globally under the 'UI' namespace
var UI = {
    initializeUI,
    updateContent,
    applyFontSettings,
    applyTextColors,
    switchTab,
    toggleSettings,
    updateTranslateButton,
    populateBackendSelector,
    populateTranslationSelectors,
    updateBackendForm,
    updateTranslationForm,
    showCopyFeedback,
    updateRequestParamsArea,
    updateTranslationArea,
    appendToTranslationArea
};