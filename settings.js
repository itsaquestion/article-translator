class Settings {
    static defaultSettings = {
        currentBackend: 0,
        backends: [{
            name: 'Default OpenAI',
            base_url: 'https://api.openai.com/v1',
            api_key: '',
            model: 'gpt-4o-mini'
        }],
        currentTranslation: 0,
        translations: [{
            name: 'Default Translation',
            system_prompt: 'You are a professional translator. Translate the following markdown content to Chinese, keeping the markdown format intact.',
            user_prompt: 'Translate the following content from {domain}:\n\n{content}'
        }],
        temperature: 0.7,
        font_family: 'system-ui, -apple-system, sans-serif',
        font_size: '12'
    };

    static controller = null;

    static async ensureSettingsValid(settings) {
        // Ensure all required properties exist with defaults if missing
        const defaults = this.defaultSettings;
        settings.currentBackend = settings.currentBackend ?? defaults.currentBackend;
        settings.backends = settings.backends ?? [...defaults.backends];
        settings.currentTranslation = settings.currentTranslation ?? defaults.currentTranslation;
        settings.translations = settings.translations ?? [...defaults.translations];
        settings.temperature = settings.temperature ?? defaults.temperature;
        settings.font_family = settings.font_family ?? defaults.font_family;
        settings.font_size = settings.font_size ?? defaults.font_size;

        // Ensure each backend has all required fields
        settings.backends = settings.backends.map(backend => ({
            name: backend.name ?? 'Unnamed Backend',
            base_url: backend.base_url ?? defaults.backends[0].base_url,
            api_key: backend.api_key ?? '',
            model: backend.model ?? defaults.backends[0].model
        }));

        // Ensure each translation setting has all required fields
        settings.translations = settings.translations.map(translation => ({
            name: translation.name ?? 'Unnamed Translation',
            system_prompt: translation.system_prompt ?? defaults.translations[0].system_prompt,
            user_prompt: translation.user_prompt ?? defaults.translations[0].user_prompt
        }));

        // Ensure current indices are valid
        settings.currentBackend = Math.min(settings.currentBackend, settings.backends.length - 1);
        settings.currentTranslation = Math.min(settings.currentTranslation, settings.translations.length - 1);

        return settings;
    }

    static async load() {
        try {
            const result = await chrome.storage.local.get('settings');
            const settings = result.settings || this.defaultSettings;
            return await this.ensureSettingsValid(settings);
        } catch (error) {
            console.error('Failed to load settings:', error);
            return this.defaultSettings;
        }
    }

    static async save(settings) {
        try {
            const validSettings = await this.ensureSettingsValid(settings);
            await chrome.storage.local.set({ settings: validSettings });
            return true;
        } catch (error) {
            console.error('Failed to save settings:', error);
            return false;
        }
    }

    static async getTranslationPrompt(domain, content) {
        const settings = await this.load();
        const currentTranslation = settings.translations[settings.currentTranslation];
        const userPrompt = currentTranslation.user_prompt
            .replace('{domain}', domain)
            .replace('{content}', content);

        return {
            model: settings.backends[settings.currentBackend].model,
            messages: [
                { role: 'system', content: currentTranslation.system_prompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: settings.temperature,
            stream: true,
            max_tokens: 8192
        };
    }

    static stopTranslation() {
        if (this.controller) {
            this.controller.abort();
            this.controller = null;
        }
    }

    static async translate(content, domain, onChunk, onError, onComplete) {
        try {
            // Stop any existing translation
            this.stopTranslation();
            
            // Create new controller for this translation
            this.controller = new AbortController();
            
            const settings = await this.load();
            const currentBackend = settings.backends[settings.currentBackend];
            
            if (!currentBackend.api_key) {
                throw new Error('API key not set');
            }

            const prompt = await this.getTranslationPrompt(domain, content);
            const response = await fetch(`${currentBackend.base_url}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentBackend.api_key}`,
                    'HTTP-Referer': 'https://imtass.me',
                    'X-Title': 'Article Translator'
                },
                body: JSON.stringify(prompt),
                signal: this.controller.signal
            });

            if (!response.ok) {
                throw new Error(`API request failed: ${response.statusText}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;
                        
                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices[0]?.delta?.content;
                            if (content) onChunk(content);
                        } catch (e) {
                            console.error('Failed to parse chunk:', e);
                        }
                    }
                }
            }
            
            this.controller = null;
            onComplete();
        } catch (error) {
            this.controller = null;
            if (error.name === 'AbortError') {
                onError('Translation stopped');
            } else {
                onError(error.message);
            }
        }
    }
}
