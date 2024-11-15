class Settings {
    static defaultSettings = {
        base_url: 'https://api.openai.com/v1',
        api_key: '',
        temperature: 0.7,
        model: 'gpt-3.5-turbo',
        system_prompt: 'You are a professional translator. Translate the following markdown content to Chinese, keeping the markdown format intact.',
        user_prompt: 'Translate the following content from {domain}:\n\n{content}'
    };

    static async load() {
        try {
            const result = await chrome.storage.local.get('settings');
            return result.settings || this.defaultSettings;
        } catch (error) {
            console.error('Failed to load settings:', error);
            return this.defaultSettings;
        }
    }

    static async save(settings) {
        try {
            await chrome.storage.local.set({ settings });
            return true;
        } catch (error) {
            console.error('Failed to save settings:', error);
            return false;
        }
    }

    static async getTranslationPrompt(domain, content) {
        const settings = await this.load();
        const userPrompt = settings.user_prompt
            .replace('{domain}', domain)
            .replace('{content}', content);

        return {
            model: settings.model,
            messages: [
                { role: 'system', content: settings.system_prompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: settings.temperature,
            stream: true
        };
    }

    static async translate(content, domain, onChunk, onError, onComplete) {
        try {
            const settings = await this.load();
            if (!settings.api_key) {
                throw new Error('API key not set');
            }

            const prompt = await this.getTranslationPrompt(domain, content);
            const response = await fetch(`${settings.base_url}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${settings.api_key}`
                },
                body: JSON.stringify(prompt)
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
            
            onComplete();
        } catch (error) {
            onError(error.message);
        }
    }
}
