// apiService.js - Handles interaction with the LLM API

class ApiService {
    static controller = null;

    /**
     * Generates the complete request parameters for the LLM API call.
     * @param {string} domain - The domain of the source page.
     * @param {string} content - The markdown content to translate.
     * @param {object} settings - The current application settings.
     * @returns {object} The parameters object for the fetch request.
     */
    static getTranslationPrompt(domain, content, settings) {
        const currentBackend = settings.backends[settings.currentBackend];
        const currentTranslation = settings.translations[settings.currentTranslation];
        const userPrompt = currentTranslation.user_prompt
            .replace('{domain}', domain)
            .replace('{content}', content);

        // Prepare headers
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentBackend.api_key}`,
            // Optional headers, consider making these configurable if needed
            'HTTP-Referer': 'https://github.com/leptonai/article-translator', // Example Referer
            'X-Title': 'Article Translator' // Example Custom Header
        };

        // Prepare body, merging extra params carefully
        let requestBody = {
            model: currentBackend.model,
            messages: [
                { role: 'system', content: currentTranslation.system_prompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: settings.temperature,
            stream: true,
            max_tokens: 8192 // Consider making this configurable
        };

        try {
            if (currentBackend.extra_params && currentBackend.extra_params.trim() !== '{}' && currentBackend.extra_params.trim() !== '') {
                const extraParams = JSON.parse(currentBackend.extra_params);
                // Merge extraParams, ensuring core properties aren't overwritten unintentionally
                // if they exist in extraParams (e.g., model, messages, stream).
                // A safer approach might be to only allow specific extra params or merge selectively.
                requestBody = { ...requestBody, ...extraParams };
            }
        } catch (error) {
            console.error('Failed to parse or merge extra params:', error);
            // Decide if this should throw or just log. Logging for now.
        }

        return {
            endpoint: `${currentBackend.base_url}/chat/completions`,
            headers: headers,
            body: requestBody,
            signal: this.controller ? this.controller.signal : undefined // Add signal here
        };
    }

    /**
     * Aborts the current ongoing translation request.
     */
    static stopTranslation() {
        if (this.controller) {
            this.controller.abort();
            console.log('Translation aborted by user.');
            this.controller = null;
        }
    }

    /**
     * Performs the translation by calling the LLM API.
     * @param {string} domain - The domain of the source page.
     * @param {string} content - The markdown content to translate.
     * @param {function} onChunk - Callback function for each received chunk of translated text.
     * @param {function} onError - Callback function for errors.
     * @param {function} onComplete - Callback function when translation is complete.
     */
    static async translate(domain, content, onChunk, onError, onComplete) {
        // Stop any existing translation first
        this.stopTranslation();

        // Create a new controller for this request
        this.controller = new AbortController();

        try {
            // Load settings needed for the API call
            const settings = await Settings.load(); // Assumes Settings class is available globally
            const currentBackend = settings.backends[settings.currentBackend];

            if (!currentBackend.api_key) {
                throw new Error('API key not set');
            }

            const params = this.getTranslationPrompt(domain, content, settings);

            console.log('API Request Params:', { endpoint: params.endpoint, headers: params.headers, body: params.body });

            const response = await fetch(params.endpoint, {
                method: 'POST',
                headers: params.headers,
                body: JSON.stringify(params.body),
                signal: this.controller.signal // Use the controller's signal
            });

            console.log('API Response Status:', response.status);

            if (!response.ok) {
                 const errorBody = await response.text();
                 console.error('API Error Body:', errorBody);
                 throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            if (!response.body) {
                throw new Error('Response body is null');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                // Check if aborted before reading next chunk
                if (this.controller.signal.aborted) {
                    console.log('Stream reading aborted.');
                    break; // Exit loop if aborted
                }

                const { done, value } = await reader.read();
                if (done) {
                    console.log('Stream finished.');
                    break;
                }

                const chunk = decoder.decode(value);
                // console.log('Raw Chunk:', chunk); // For debugging stream issues
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.substring(6).trim(); // Use substring and trim
                        if (data === '[DONE]') {
                            // console.log('Received [DONE] signal.');
                            continue;
                        }
                        if (!data) continue; // Skip empty data lines

                        try {
                            const parsed = JSON.parse(data);
                            const contentChunk = parsed.choices?.[0]?.delta?.content;
                            if (contentChunk) {
                                onChunk(contentChunk);
                            }
                        } catch (e) {
                            console.error('Failed to parse stream chunk JSON:', data, e);
                            // Decide how to handle parse errors, maybe call onError?
                        }
                    }
                }
            }

            // Only call onComplete if the stream finished naturally (not aborted)
            if (!this.controller.signal.aborted) {
                onComplete();
            }

        } catch (error) {
            console.error('Translation Error:', error);
            if (error.name === 'AbortError') {
                // Don't call onError for user-initiated aborts, maybe just log or specific feedback
                onError({ type: 'info', message: '翻译已停止' });
            } else if (error.message.includes('API key not set')) {
                onError({ type: 'error', message: 'API密钥未设置，请前往设置页面配置' });
            } else if (error.message.includes('API request failed')) {
                onError({
                    type: 'error',
                    message: `API请求失败：${error.message}\n请检查：\n1. API端点/密钥是否正确\n2. 网络连接是否正常\n3. 模型名称是否有效`
                });
            } else {
                onError({
                    type: 'error',
                    message: `翻译时发生错误：${error.message}`
                });
            }
        } finally {
            // Clean up controller regardless of success or failure
            this.controller = null;
            console.log('ApiService controller cleaned up.');
        }
    }
}

// Expose globally
var ApiService = ApiService;