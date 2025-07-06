/**
 * 对话Agent类 - 管理基于文章内容的AI对话功能
 * 支持多Agent配置、聊天历史管理、变量替换等功能
 */
class ChatAgent {
    /**
     * 创建默认的对话Agent配置
     * @param {number} backendIndex - Backend索引
     * @returns {Object} 默认对话Agent配置
     */
    static createDefaultAgent(backendIndex = 0) {
        return {
            id: 'default-chat',
            name: '默认助手',
            backendIndex: backendIndex,
            temperature: 0.7,
            max_tokens: 8192,
            system_prompt: '你是一位专业的AI助手，专门帮助用户理解和分析文章内容。这篇文章来自 {domain}，请你根据文章的内容与用户进行对话，回答用户关于文章的问题，提供深入的分析和见解。\n\n文章正文如下：\n{content}'
        };
    }

    /**
     * 验证对话Agent配置
     * @param {Object} agent - 对话Agent配置
     * @returns {boolean} 是否有效
     */
    static validateAgent(agent) {
        const requiredFields = ['id', 'name', 'backendIndex', 'temperature', 'max_tokens', 'system_prompt'];
        return requiredFields.every(field => agent.hasOwnProperty(field)) &&
               typeof agent.id === 'string' &&
               typeof agent.name === 'string' &&
               typeof agent.backendIndex === 'number' &&
               typeof agent.temperature === 'number' &&
               typeof agent.max_tokens === 'number' &&
               typeof agent.system_prompt === 'string';
    }

    /**
     * 创建新的对话Agent
     * @param {string} name - Agent名称
     * @param {number} backendIndex - Backend索引
     * @param {Object} config - 配置参数
     * @returns {Object} 新的对话Agent
     */
    static createAgent(name, backendIndex = 0, config = {}) {
        const defaultConfig = {
            temperature: 0.7,
            max_tokens: 8192,
            system_prompt: '你是一位专业的AI助手，请根据用户的问题提供帮助。'
        };

        return {
            id: AgentManager.generateId(),
            name: name || '新对话Agent',
            backendIndex: backendIndex,
            ...defaultConfig,
            ...config
        };
    }

    /**
     * 处理系统提示词中的变量替换
     * @param {string} systemPrompt - 原始系统提示词
     * @param {string} domain - 文章域名
     * @param {string} content - 文章内容
     * @returns {string} 处理后的系统提示词
     */
    static processSystemPrompt(systemPrompt, domain, content) {
        if (!domain || !content) {
            return systemPrompt;
        }

        return systemPrompt
            .replace('{domain}', domain)
            .replace('{content}', content);
    }

    /**
     * 构建对话API请求
     * @param {Object} agent - 对话Agent配置
     * @param {Array} messages - 对话消息历史
     * @param {string} domain - 文章域名
     * @param {string} content - 文章内容
     * @returns {Object} API请求配置
     */
    static buildChatRequest(agent, messages, domain, content) {
        const systemPrompt = this.processSystemPrompt(agent.system_prompt, domain, content);
        
        const requestMessages = [
            { role: 'system', content: systemPrompt },
            ...messages
        ];

        return {
            model: '', // 将由调用方设置
            messages: requestMessages,
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
            console.warn('Invalid chat agent config, using default:', agent);
            return this.createDefaultAgent();
        }

        // 修复无效的backend索引
        if (!AgentManager.isValidBackendIndex(backends, agent.backendIndex)) {
            console.warn(`Invalid backend index ${agent.backendIndex}, using 0`);
            agent.backendIndex = 0;
        }

        // 确保数值参数在合理范围内
        agent.temperature = Math.max(0, Math.min(2, agent.temperature || 0.7));
        agent.max_tokens = Math.max(1, Math.min(32768, agent.max_tokens || 8192));

        return agent;
    }

    /**
     * 从设置中加载对话Agent配置
     * @param {Object} settings - 应用设置
     * @returns {Object} 对话Agent配置
     */
    static loadFromSettings(settings) {
        // 优先使用新的chatAgents配置
        if (settings.chatAgents && settings.chatAgents.length > 0) {
            const currentIndex = Math.max(0, Math.min(settings.currentChatAgent || 0, settings.chatAgents.length - 1));
            return this.validateAndFixAgent(settings.chatAgents[currentIndex], settings.backends);
        }

        // 兼容旧的chat_system_prompt配置
        if (settings.chat_system_prompt) {
            return {
                id: 'legacy-chat',
                name: '默认助手',
                backendIndex: settings.currentBackend || 0,
                temperature: settings.temperature || 0.7,
                max_tokens: 8192,
                system_prompt: settings.chat_system_prompt
            };
        }

        // 使用默认配置
        return this.createDefaultAgent(settings.currentBackend || 0);
    }

    /**
     * 保存对话Agent配置到设置
     * @param {Object} settings - 应用设置
     * @param {Object} agent - 对话Agent配置
     * @param {number} index - Agent索引
     * @returns {Object} 更新后的设置
     */
    static saveToSettings(settings, agent, index = null) {
        // 初始化chatAgents数组
        if (!settings.chatAgents) {
            settings.chatAgents = [];
        }

        // 验证Agent配置
        const validAgent = this.validateAndFixAgent(agent, settings.backends);

        if (index !== null && index >= 0 && index < settings.chatAgents.length) {
            // 更新现有Agent
            settings.chatAgents[index] = validAgent;
        } else {
            // 添加新Agent
            settings.chatAgents.push(validAgent);
            settings.currentChatAgent = settings.chatAgents.length - 1;
        }

        // 确保currentChatAgent索引有效
        settings.currentChatAgent = Math.max(0, Math.min(settings.currentChatAgent || 0, settings.chatAgents.length - 1));

        // 兼容性：同时更新旧的chat_system_prompt字段
        const currentAgent = settings.chatAgents[settings.currentChatAgent];
        if (currentAgent) {
            settings.chat_system_prompt = currentAgent.system_prompt;
        }

        return settings;
    }

    /**
     * 添加新的对话Agent
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
     * 删除对话Agent
     * @param {Object} settings - 应用设置
     * @param {number} index - 要删除的Agent索引
     * @returns {Object} 更新后的设置
     */
    static removeAgent(settings, index) {
        if (!settings.chatAgents || settings.chatAgents.length <= 1) {
            throw new Error('无法删除最后一个对话Agent');
        }

        if (index < 0 || index >= settings.chatAgents.length) {
            throw new Error('无效的Agent索引');
        }

        settings.chatAgents.splice(index, 1);
        
        // 调整currentChatAgent索引
        if (settings.currentChatAgent >= settings.chatAgents.length) {
            settings.currentChatAgent = settings.chatAgents.length - 1;
        }

        // 更新兼容性字段
        const currentAgent = settings.chatAgents[settings.currentChatAgent];
        if (currentAgent) {
            settings.chat_system_prompt = currentAgent.system_prompt;
        }

        return settings;
    }

    /**
     * 克隆对话Agent
     * @param {Object} settings - 应用设置
     * @param {number} index - 要克隆的Agent索引
     * @param {string} newName - 新Agent名称
     * @returns {Object} 更新后的设置
     */
    static cloneAgent(settings, index, newName) {
        if (!settings.chatAgents || index < 0 || index >= settings.chatAgents.length) {
            throw new Error('无效的Agent索引');
        }

        const originalAgent = settings.chatAgents[index];
        const clonedAgent = AgentManager.cloneAgent(originalAgent, newName);
        
        return this.saveToSettings(settings, clonedAgent);
    }

    /**
     * 切换当前对话Agent
     * @param {Object} settings - 应用设置
     * @param {number} index - 新的当前Agent索引
     * @returns {Object} 更新后的设置
     */
    static switchAgent(settings, index) {
        if (!settings.chatAgents || index < 0 || index >= settings.chatAgents.length) {
            throw new Error('无效的Agent索引');
        }

        settings.currentChatAgent = index;
        
        // 更新兼容性字段
        const currentAgent = settings.chatAgents[settings.currentChatAgent];
        if (currentAgent) {
            settings.chat_system_prompt = currentAgent.system_prompt;
        }

        return settings;
    }

    /**
     * 获取当前对话Agent
     * @param {Object} settings - 应用设置
     * @returns {Object} 当前对话Agent配置
     */
    static getCurrentAgent(settings) {
        return this.loadFromSettings(settings);
    }

    /**
     * 获取所有对话Agent
     * @param {Object} settings - 应用设置
     * @returns {Array} 所有对话Agent配置列表
     */
    static getAllAgents(settings) {
        if (!settings.chatAgents || settings.chatAgents.length === 0) {
            return [this.createDefaultAgent(settings.currentBackend || 0)];
        }

        return settings.chatAgents.map(agent => this.validateAndFixAgent(agent, settings.backends));
    }

    /**
     * 初始化默认对话Agent（如果不存在）
     * @param {Object} settings - 应用设置
     * @returns {Object} 更新后的设置
     */
    static initializeDefaultAgents(settings) {
        if (!settings.chatAgents || settings.chatAgents.length === 0) {
            settings.chatAgents = [this.createDefaultAgent(settings.currentBackend || 0)];
            settings.currentChatAgent = 0;
            settings.chat_system_prompt = settings.chatAgents[0].system_prompt;
        }

        return settings;
    }

    /**
     * 修复所有Agent的backend索引（当backend列表发生变化时）
     * @param {Object} settings - 应用设置
     * @returns {Object} 更新后的设置
     */
    static fixAllBackendIndexes(settings) {
        if (!settings.chatAgents) {
            return settings;
        }

        settings.chatAgents = settings.chatAgents.map(agent => 
            AgentManager.fixBackendIndex(agent, settings.backends, settings.currentBackend || 0)
        );

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
            system_prompt: agent.system_prompt
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
            temperature: agentConfig.temperature || 0.7,
            max_tokens: agentConfig.max_tokens || 8192,
            system_prompt: agentConfig.system_prompt || '你是一位专业的AI助手。'
        };

        return this.addAgent(settings, name || agentConfig.name || '导入的Agent', config);
    }
}