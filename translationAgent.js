/**
 * 翻译Agent类 - 管理文章翻译功能
 * 支持多Agent配置、变量替换、流式翻译等功能
 */
class TranslationAgent {
    /**
     * 创建默认的翻译Agent配置
     * @param {number} backendIndex - Backend索引
     * @returns {Object} 默认翻译Agent配置
     */
    static createDefaultAgent(backendIndex = 0) {
        return {
            id: 'default-translation',
            name: '默认翻译',
            backendIndex: backendIndex,
            temperature: 0.3,
            max_tokens: 8192,
            system_prompt: 'You are a professional translator. Translate the following markdown content to Chinese, keeping the markdown format intact.',
            user_prompt: 'Translate the following content from {domain}:\n\n{content}'
        };
    }

    /**
     * 验证翻译Agent配置
     * @param {Object} agent - 翻译Agent配置
     * @returns {boolean} 是否有效
     */
    static validateAgent(agent) {
        const requiredFields = ['id', 'name', 'backendIndex', 'temperature', 'max_tokens', 'system_prompt', 'user_prompt'];
        return requiredFields.every(field => agent.hasOwnProperty(field)) &&
               typeof agent.id === 'string' &&
               typeof agent.name === 'string' &&
               typeof agent.backendIndex === 'number' &&
               typeof agent.temperature === 'number' &&
               typeof agent.max_tokens === 'number' &&
               typeof agent.system_prompt === 'string' &&
               typeof agent.user_prompt === 'string';
    }

    /**
     * 创建新的翻译Agent
     * @param {string} name - Agent名称
     * @param {number} backendIndex - Backend索引
     * @param {Object} config - 配置参数
     * @returns {Object} 新的翻译Agent
     */
    static createAgent(name, backendIndex = 0, config = {}) {
        const defaultConfig = {
            temperature: 0.3,
            max_tokens: 8192,
            system_prompt: 'You are a professional translator. Translate the following markdown content to Chinese, keeping the markdown format intact.',
            user_prompt: 'Translate the following content from {domain}:\n\n{content}'
        };

        return {
            id: AgentManager.generateId(),
            name: name || '新翻译Agent',
            backendIndex: backendIndex,
            ...defaultConfig,
            ...config
        };
    }

    /**
     * 处理用户提示词中的变量替换
     * @param {string} userPrompt - 原始用户提示词
     * @param {string} domain - 文章域名
     * @param {string} content - 文章内容
     * @returns {string} 处理后的用户提示词
     */
    static processUserPrompt(userPrompt, domain, content) {
        if (!domain || !content) {
            return userPrompt;
        }

        return userPrompt
            .replace('{domain}', domain)
            .replace('{content}', content);
    }

    /**
     * 构建翻译API请求
     * @param {Object} agent - 翻译Agent配置
     * @param {string} domain - 文章域名
     * @param {string} content - 文章内容
     * @returns {Object} API请求配置
     */
    static buildTranslationRequest(agent, domain, content) {
        const userPrompt = this.processUserPrompt(agent.user_prompt, domain, content);
        
        return {
            model: '', // 将由调用方设置
            messages: [
                { role: 'system', content: agent.system_prompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: agent.temperature,
            max_tokens: agent.max_tokens,
            stream: true
        };
    }

    /**
     * 验证并修复Agent配置
     * @param {Object} agent - Agent配置
     * @param {Array} backends - 可用的Backend列表
     * @returns {Object} 修复后的Agent配置
     */
    static validateAndFixAgent(agent, backends) {
        if (!this.validateAgent(agent)) {
            console.warn('Invalid translation agent config, using default:', agent);
            return this.createDefaultAgent();
        }

        // 修复无效的backend索引
        if (!AgentManager.isValidBackendIndex(backends, agent.backendIndex)) {
            console.warn(`Invalid backend index ${agent.backendIndex}, using 0`);
            agent.backendIndex = 0;
        }

        // 确保数值参数在合理范围内
        agent.temperature = Math.max(0, Math.min(2, agent.temperature || 0.3));
        agent.max_tokens = Math.max(1, Math.min(32768, agent.max_tokens || 8192));

        return agent;
    }

    /**
     * 从设置中加载翻译Agent配置
     * @param {Object} settings - 应用设置
     * @returns {Object} 翻译Agent配置
     */
    static loadFromSettings(settings) {
        // 优先使用新的translationAgents配置
        if (settings.translationAgents && settings.translationAgents.length > 0) {
            const currentIndex = Math.max(0, Math.min(settings.currentTranslationAgent || 0, settings.translationAgents.length - 1));
            return this.validateAndFixAgent(settings.translationAgents[currentIndex], settings.backends);
        }

        // 兼容旧的translations配置
        if (settings.translations && settings.translations.length > 0) {
            const currentIndex = Math.max(0, Math.min(settings.currentTranslation || 0, settings.translations.length - 1));
            const translation = settings.translations[currentIndex];
            return {
                id: 'legacy-translation-' + currentIndex,
                name: translation.name || '默认翻译',
                backendIndex: settings.currentBackend || 0,
                temperature: settings.temperature || 0.3,
                max_tokens: 8192,
                system_prompt: translation.system_prompt,
                user_prompt: translation.user_prompt
            };
        }

        // 使用默认配置
        return this.createDefaultAgent(settings.currentBackend || 0);
    }

    /**
     * 保存翻译Agent配置到设置
     * @param {Object} settings - 应用设置
     * @param {Object} agent - 翻译Agent配置
     * @param {number} index - Agent索引
     * @returns {Object} 更新后的设置
     */
    static saveToSettings(settings, agent, index = null) {
        // 初始化translationAgents数组
        if (!settings.translationAgents) {
            settings.translationAgents = [];
        }

        // 验证Agent配置
        const validAgent = this.validateAndFixAgent(agent, settings.backends);

        if (index !== null && index >= 0 && index < settings.translationAgents.length) {
            // 更新现有Agent
            settings.translationAgents[index] = validAgent;
        } else {
            // 添加新Agent
            settings.translationAgents.push(validAgent);
            settings.currentTranslationAgent = settings.translationAgents.length - 1;
        }

        // 确保currentTranslationAgent索引有效
        settings.currentTranslationAgent = Math.max(0, Math.min(settings.currentTranslationAgent || 0, settings.translationAgents.length - 1));

        // 兼容性：同时更新旧的translations字段
        this.syncToLegacySettings(settings);

        return settings;
    }

    /**
     * 同步到旧的translations设置格式（向后兼容）
     * @param {Object} settings - 应用设置
     */
    static syncToLegacySettings(settings) {
        if (!settings.translationAgents) {
            return;
        }

        settings.translations = settings.translationAgents.map(agent => ({
            name: agent.name,
            system_prompt: agent.system_prompt,
            user_prompt: agent.user_prompt
        }));

        settings.currentTranslation = settings.currentTranslationAgent || 0;
    }

    /**
     * 添加新的翻译Agent
     * @param {Object} settings - 应用设置
     * @param {string} name - Agent名称
     * @param {Object} config - Agent配置
     * @returns {Object} 更新后的设置
     */
    static addAgent(settings, name, config = {}) {
        const newAgent = this.createAgent(name, settings.currentBackend || 0, config);
        return this.saveToSettings(settings, newAgent);
    }

    /**
     * 删除翻译Agent
     * @param {Object} settings - 应用设置
     * @param {number} index - 要删除的Agent索引
     * @returns {Object} 更新后的设置
     */
    static removeAgent(settings, index) {
        if (!settings.translationAgents || settings.translationAgents.length <= 1) {
            throw new Error('无法删除最后一个翻译Agent');
        }

        if (index < 0 || index >= settings.translationAgents.length) {
            throw new Error('无效的Agent索引');
        }

        settings.translationAgents.splice(index, 1);
        
        // 调整currentTranslationAgent索引
        if (settings.currentTranslationAgent >= settings.translationAgents.length) {
            settings.currentTranslationAgent = settings.translationAgents.length - 1;
        }

        // 更新兼容性字段
        this.syncToLegacySettings(settings);

        return settings;
    }

    /**
     * 克隆翻译Agent
     * @param {Object} settings - 应用设置
     * @param {number} index - 要克隆的Agent索引
     * @param {string} newName - 新Agent名称
     * @returns {Object} 更新后的设置
     */
    static cloneAgent(settings, index, newName) {
        if (!settings.translationAgents || index < 0 || index >= settings.translationAgents.length) {
            throw new Error('无效的Agent索引');
        }

        const originalAgent = settings.translationAgents[index];
        const clonedAgent = AgentManager.cloneAgent(originalAgent, newName);
        
        return this.saveToSettings(settings, clonedAgent);
    }

    /**
     * 切换当前翻译Agent
     * @param {Object} settings - 应用设置
     * @param {number} index - 新的当前Agent索引
     * @returns {Object} 更新后的设置
     */
    static switchAgent(settings, index) {
        if (!settings.translationAgents || index < 0 || index >= settings.translationAgents.length) {
            throw new Error('无效的Agent索引');
        }

        settings.currentTranslationAgent = index;
        
        // 更新兼容性字段
        this.syncToLegacySettings(settings);

        return settings;
    }

    /**
     * 获取当前翻译Agent
     * @param {Object} settings - 应用设置
     * @returns {Object} 当前翻译Agent配置
     */
    static getCurrentAgent(settings) {
        return this.loadFromSettings(settings);
    }

    /**
     * 获取所有翻译Agent
     * @param {Object} settings - 应用设置
     * @returns {Array} 所有翻译Agent配置列表
     */
    static getAllAgents(settings) {
        if (!settings.translationAgents || settings.translationAgents.length === 0) {
            return [this.createDefaultAgent(settings.currentBackend || 0)];
        }

        return settings.translationAgents.map(agent => this.validateAndFixAgent(agent, settings.backends));
    }

    /**
     * 初始化默认翻译Agent（如果不存在）
     * @param {Object} settings - 应用设置
     * @returns {Object} 更新后的设置
     */
    static initializeDefaultAgents(settings) {
        if (!settings.translationAgents || settings.translationAgents.length === 0) {
            settings.translationAgents = [this.createDefaultAgent(settings.currentBackend || 0)];
            settings.currentTranslationAgent = 0;
            this.syncToLegacySettings(settings);
        }

        return settings;
    }

    /**
     * 修复所有Agent的backend索引（当backend列表发生变化时）
     * @param {Object} settings - 应用设置
     * @returns {Object} 更新后的设置
     */
    static fixAllBackendIndexes(settings) {
        if (!settings.translationAgents) {
            return settings;
        }

        settings.translationAgents = settings.translationAgents.map(agent => 
            AgentManager.fixBackendIndex(agent, settings.backends, settings.currentBackend || 0)
        );

        this.syncToLegacySettings(settings);
        return settings;
    }

    /**
     * 从旧的translations配置迁移到新的translationAgents格式
     * @param {Object} settings - 应用设置
     * @returns {Object} 更新后的设置
     */
    static migrateFromLegacySettings(settings) {
        if (settings.translationAgents && settings.translationAgents.length > 0) {
            // 已经是新格式，无需迁移
            return settings;
        }

        if (!settings.translations || settings.translations.length === 0) {
            // 没有旧配置，初始化默认配置
            return this.initializeDefaultAgents(settings);
        }

        // 迁移旧配置
        settings.translationAgents = settings.translations.map((translation, index) => ({
            id: 'migrated-translation-' + index,
            name: translation.name || `翻译设置${index + 1}`,
            backendIndex: settings.currentBackend || 0,
            temperature: settings.temperature || 0.3,
            max_tokens: 8192,
            system_prompt: translation.system_prompt,
            user_prompt: translation.user_prompt
        }));

        settings.currentTranslationAgent = settings.currentTranslation || 0;
        
        // 确保索引有效
        settings.currentTranslationAgent = Math.max(0, Math.min(settings.currentTranslationAgent, settings.translationAgents.length - 1));

        return settings;
    }

    /**
     * 导出Agent配置
     * @param {Object} agent - 要导出的Agent配置
     * @returns {Object} 可导出的Agent配置
     */
    static exportAgent(agent) {
        return {
            name: agent.name,
            temperature: agent.temperature,
            max_tokens: agent.max_tokens,
            system_prompt: agent.system_prompt,
            user_prompt: agent.user_prompt
        };
    }

    /**
     * 导入Agent配置
     * @param {Object} settings - 应用设置
     * @param {Object} agentConfig - 导入的Agent配置
     * @param {string} name - 新Agent名称
     * @returns {Object} 更新后的设置
     */
    static importAgent(settings, agentConfig, name) {
        const config = {
            temperature: agentConfig.temperature || 0.3,
            max_tokens: agentConfig.max_tokens || 8192,
            system_prompt: agentConfig.system_prompt || 'You are a professional translator.',
            user_prompt: agentConfig.user_prompt || 'Translate the following content:\n\n{content}'
        };

        return this.addAgent(settings, name || agentConfig.name || '导入的翻译Agent', config);
    }

    /**
     * 获取翻译提示词（兼容旧接口）
     * @param {Object} settings - 应用设置
     * @param {string} domain - 文章域名
     * @param {string} content - 文章内容
     * @returns {Object} 翻译请求配置
     */
    static getTranslationPrompt(settings, domain, content) {
        const agent = this.getCurrentAgent(settings);
        const backend = settings.backends[agent.backendIndex];
        
        const request = this.buildTranslationRequest(agent, domain, content);
        request.model = backend ? backend.model : 'gpt-3.5-turbo';
        
        return request;
    }
}