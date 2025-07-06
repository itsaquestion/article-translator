# Article Translator

A Chrome extension that extracts article content and translates it using customizable LLM models.

## Features

- **Article Extraction**: Automatically extracts the main content from web pages, removing ads and irrelevant content
- **Markdown Format**: Preserves article structure using Markdown format
- **Customizable Translation**: 
  - Support for different LLM models (default: gpt-3.5-turbo)
  - Adjustable translation parameters
  - Customizable system and user prompts
- **Real-time Translation**: 
  - Stream translation results as they are generated
  - Stop translation at any time
  - Scroll through previous translations while new content is being generated
- **Markdown Rendering**:
  - View original and translated content as rendered Markdown.
  - Toggle between raw text and rendered view with a switch in the toolbar.
- **Text Appearance**:
  - Customizable font family (including support for Chinese fonts)
  - Adjustable font size
  - Settings persist across sessions

## Installation

1. Clone this repository or download the source code
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Usage

1. **Setup**:
   - Open the extension settings
   - Enter your LLM API credentials (base URL and API key)
   - Customize the model and translation settings if needed

2. **Extracting Articles**:
   - Navigate to any article page
   - Open the side panel
   - Click "Extract Article" to get the main content

3. **Translation**:
   - Click "Translate" to start the translation
   - Use the "Stop" button to halt translation at any time
   - Scroll freely through the translation while it's being generated

4. **Customization**:
   - Adjust font settings for better readability
   - Modify system and user prompts for different translation styles
   - Fine-tune temperature for translation creativity

## Settings

### LLM Settings
- **Base URL**: API endpoint (default: https://api.openai.com/v1)
- **API Key**: Your LLM API key
- **Model Name**: The model to use for translation
- **Temperature**: Controls translation creativity (0-2)

### Translation Settings
- **System Prompt**: Instructions for the translation model
- **User Prompt**: Template for translation requests

### Text Appearance
- **Font Family**: Choose from various fonts including Chinese options
- **Font Size**: Adjust text size (8-24px)

## Technical Details

The extension uses:
- Mozilla's Readability.js for content extraction
- TurndownJS for HTML to Markdown conversion
- Chrome's Side Panel API for the UI
- Streaming API support for real-time translation

## License

MIT License
