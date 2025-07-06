/**
 * Agent管理器 - 统一管理翻译和对话Agent
 * 提供Agent的CRUD操作和配置管理
 */
class AgentManager {
    /**
     * 生成唯一的Agent ID
     * @returns {string} 唯一ID
     */
    static generateId() {
        return 'agent-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * 创建默认的翻译Agent
     * @param {number} backendIndex - 默认backend索引
     * @returns {Object} 翻译Agent对象
     */
    static createDefaultTranslationAgent(backendIndex = 0) {
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
     * 创建默认的对话Agent
     * @param {number} backendIndex - 默认backend索引
     * @returns {Object} 对话Agent对象
     */
    static createDefaultChatAgent(backendIndex = 0) {
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
     * 验证翻译Agent数据结构
     * @param {Object} agent - 翻译Agent对象
     * @returns {boolean} 是否有效
     */
    static validateTranslationAgent(agent) {
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
     * 验证对话Agent数据结构
     * @param {Object} agent - 对话Agent对象
     * @returns {boolean} 是否有效
     */
    static validateChatAgent(agent) {
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
     * 创建新的翻译Agent
     * @param {string} name - Agent名称
     * @param {number} backendIndex - backend索引
     * @param {Object} config - 配置参数
     * @returns {Object} 新的翻译Agent
     */
    static createTranslationAgent(name, backendIndex = 0, config = {}) {
        const defaultConfig = {
            temperature: 0.3,
            max_tokens: 8192,
            system_prompt: 'You are a professional translator. Translate the following markdown content to Chinese, keeping the markdown format intact.',
            user_prompt: 'Translate the following content from {domain}:\n\n{content}'
        };

        return {
            id: this.generateId(),
            name: name || '新翻译Agent',
            backendIndex: backendIndex,
            ...defaultConfig,
            ...config
        };
    }

    /**
     * 创建新的对话Agent
     * @param {string} name - Agent名称
     * @param {number} backendIndex - backend索引
     * @param {Object} config - 配置参数
     * @returns {Object} 新的对话Agent
     */
    static createChatAgent(name, backendIndex = 0, config = {}) {
        const defaultConfig = {
            temperature: 0.7,
            max_tokens: 8192,
            system_prompt: '你是一位专业的AI助手，请根据用户的问题提供帮助。'
        };

        return {
            id: this.generateId(),
            name: name || '新对话Agent',
            backendIndex: backendIndex,
            ...defaultConfig,
            ...config
        };
    }

    /**
     * 克隆Agent（用于复制现有Agent）
     * @param {Object} agent - 要克隆的Agent
     * @param {string} newName - 新名称
     * @returns {Object} 克隆的Agent
     */
    static cloneAgent(agent, newName) {
        const cloned = { ...agent };
        cloned.id = this.generateId();
        cloned.name = newName || `${agent.name} - 副本`;
        return cloned;
    }

    /**
     * 更新Agent配置
     * @param {Object} agent - 要更新的Agent
     * @param {Object} updates - 更新的字段
     * @returns {Object} 更新后的Agent
     */
    static updateAgent(agent, updates) {
        return { ...agent, ...updates };
    }

    /**
     * 根据ID查找Agent
     * @param {Array} agents - Agent数组
     * @param {string} id - Agent ID
     * @returns {Object|null} 找到的Agent或null
     */
    static findAgentById(agents, id) {
        return agents.find(agent => agent.id === id) || null;
    }

    /**
     * 根据ID查找Agent的索引
     * @param {Array} agents - Agent数组
     * @param {string} id - Agent ID
     * @returns {number} Agent索引，未找到返回-1
     */
    static findAgentIndexById(agents, id) {
        return agents.findIndex(agent => agent.id === id);
    }

    /**
     * 验证backend索引是否有效
     * @param {Array} backends - backend数组
     * @param {number} backendIndex - 要验证的索引
     * @returns {boolean} 是否有效
     */
    static isValidBackendIndex(backends, backendIndex) {
        return Number.isInteger(backendIndex) && 
               backendIndex >= 0 && 
               backendIndex < backends.length;
    }

    /**
     * 修复无效的backend索引
     * @param {Object} agent - Agent对象
     * @param {Array} backends - backend数组
     * @param {number} defaultIndex - 默认索引
     * @returns {Object} 修复后的Agent
     */
    static fixBackendIndex(agent, backends, defaultIndex = 0) {
        if (!this.isValidBackendIndex(backends, agent.backendIndex)) {
            agent.backendIndex = defaultIndex;
        }
        return agent;
    }
}