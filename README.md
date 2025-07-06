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
- **AI Chat Interface**:
  - Engage in conversations about the extracted article content
  - AI understands the context of the current page
  - Markdown rendering for AI responses
  - Customizable system prompts with variable support
- **Smart Chat History**:
  - **URL-based History**: Each webpage maintains its own independent chat history
  - **Auto Save & Restore**: Automatically saves and restores chat when switching pages
  - **Memory Storage**: Chat history stored in browser memory, automatically cleared when browser closes
  - **Real-time Switching**: Chat history updates within 1 second when navigating between pages
- **Markdown Rendering**:
  - View original and translated content as rendered Markdown
  - Toggle between raw text and rendered view with a switch in the toolbar
  - AI chat responses support full Markdown formatting
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

4. **AI Chat**:
   - Click the "Chat" tab to start discussing the article
   - AI automatically understands the current article content
   - Ask questions, request analysis, or seek clarification about the content
   - Chat history is automatically saved per URL and restored when returning

5. **Multi-page Research**:
   - Switch between different web pages while maintaining separate chat histories
   - Each URL maintains its own independent conversation
   - Chat history automatically updates when switching pages
   - No manual refresh needed - everything happens automatically

6. **Customization**:
   - Adjust font settings for better readability
   - Modify system and user prompts for different translation styles
   - Customize chat system prompts with `{domain}` and `{content}` variables
   - Fine-tune temperature for translation creativity

## Settings

### LLM Settings
- **Base URL**: API endpoint (default: https://api.openai.com/v1)
- **API Key**: Your LLM API key
- **Model Name**: The model to use for translation and chat
- **Temperature**: Controls response creativity (0-2)

### Translation Settings
- **System Prompt**: Instructions for the translation model
- **User Prompt**: Template for translation requests

### Chat Settings
- **Chat System Prompt**: Instructions for the AI chat assistant
- **Variable Support**: Use `{domain}` for website domain and `{content}` for article content

### Text Appearance
- **Font Family**: Choose from various fonts including Chinese options
- **Font Size**: Adjust text size (8-24px)

## Technical Details

The extension uses:
- Mozilla's Readability.js for content extraction
- TurndownJS for HTML to Markdown conversion
- Chrome's Side Panel API for the UI
- Streaming API support for real-time translation and chat
- Marked.js for Markdown rendering in chat interface
- URL-based chat history management with automatic polling mechanism
- Chrome tabs API for detecting page navigation and URL changes

### Chat History Implementation
- **Memory Storage**: Chat histories stored in JavaScript Map object
- **Auto-detection**: 1-second polling interval to detect URL changes
- **Instant Switching**: Chat history switches automatically without manual refresh
- **Privacy-focused**: All data cleared when browser closes, no persistent storage

## License

MIT License
