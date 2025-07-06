# LLM对话功能使用说明

## 功能概述
我们已经成功为Article Translator浏览器插件添加了基于文章内容的LLM对话功能，用户可以就当前文章的内容与AI进行深入讨论。

## 新增功能

### 1. 基于文章内容的对话
- 在原文和译文标签页后面新增了"对话"标签
- AI会基于当前提取的文章内容进行对话
- 支持利用LLM的prompt cache优化性能

### 2. 智能聊天界面
- **消息显示区域**: 显示用户和AI的对话历史
  - 用户消息：蓝色背景，右对齐
  - AI消息：灰色背景，左对齐
- **输入区域**:
  - 多行文本输入框
  - 发送按钮
  - 支持Enter键发送（Shift+Enter换行）
- **智能提示**: 当没有文章内容时，提示用户先提取原文

### 3. 动态系统提示词
- 在设置面板中新增"Chat Settings"部分
- 支持使用变量的系统提示词模板：
  - `{domain}` - 自动替换为文章来源域名
  - `{content}` - 自动替换为文章正文内容
- 默认模板：基于文章内容的专业AI助手

## 技术实现

### 复用现有架构
- 使用现有的Settings类管理配置
- 复用现有的API配置（base_url、api_key、model等）
- 保持与现有错误处理机制的一致性
- 复用翻译功能中的变量替换机制

### 变量替换系统
- 基于翻译功能的`{domain}`和`{content}`变量系统
- 在API调用时动态替换系统提示词中的变量
- 支持prompt cache优化，减少重复内容的token消耗

### 新增文件修改
1. **settings.js**:
   - 添加带变量模板的`chat_system_prompt`配置项
   - 默认包含`{domain}`和`{content}`变量的专业提示词
2. **sidebar.html**:
   - 添加对话标签页和聊天界面HTML
   - 在设置面板添加变量说明
3. **sidebar.js**:
   - 实现基于文章内容的聊天功能
   - 添加变量替换逻辑
   - 智能对话历史管理

### 核心功能函数
- `displayChatMessage()`: 显示消息
- `sendChatMessage()`: 发送用户消息
- `callChatAPI()`: 调用LLM API，包含变量替换
- `updateChatSendButton()`: 更新发送按钮状态
- `updateContent()`: 文章内容更新时清空对话历史
- `switchTab()`: 切换到对话时的智能提示

## 使用方法

1. **配置API**: 在设置中配置LLM后端（base_url、api_key、model）
2. **提取文章**: 点击"提取原文"按钮获取页面内容
3. **自定义提示词**: 在设置中自定义聊天系统提示词（可选）
   - 使用`{domain}`变量插入文章域名
   - 使用`{content}`变量插入文章正文
4. **开始基于文章的对话**:
   - 点击"对话"标签页
   - AI已经了解当前文章内容
   - 在输入框中输入关于文章的问题
   - 点击"发送"按钮或按Enter键

## 对话场景示例

- **内容理解**: "这篇文章的主要观点是什么？"
- **深度分析**: "文章中提到的AI应用领域，哪个最有发展前景？"
- **相关讨论**: "基于这篇文章，你认为AI发展还面临哪些挑战？"
- **内容总结**: "请用3个要点总结这篇文章"
- **扩展思考**: "文章中的观点在实际应用中有什么局限性？"

## 技术实现详解

### 变量替换系统实现

```javascript
// 在callChatAPI函数中的核心逻辑
async function callChatAPI(userMessage) {
    let systemPrompt = settings.chat_system_prompt;
    
    // 动态替换变量
    if (currentContent && currentUrl) {
        systemPrompt = systemPrompt
            .replace('{domain}', new URL(currentUrl).hostname)
            .replace('{content}', currentContent);
    }
    
    // 构建API请求
    const messages = [
        { role: "system", content: systemPrompt },
        ...currentChatMessages,
        { role: "user", content: userMessage }
    ];
}
```

### 智能对话管理

```javascript
// 文章内容更新时自动清空对话历史
function updateContent(content, url) {
    if (currentContent !== content) {
        currentChatMessages = []; // 清空对话历史
        if (chatMessages) {
            chatMessages.innerHTML = '';
        }
    }
    currentContent = content;
    currentUrl = url;
}
```

### 用户体验优化

- **智能提示**: 切换到对话标签时，如果没有文章内容会提示用户先提取原文
- **状态管理**: 发送消息时禁用输入，防止重复发送
- **错误处理**: 复用现有的错误处理机制，保持一致性
- **流式响应**: 支持实时显示AI回复，提升用户体验

## Markdown渲染功能

### 功能概述
Chat UI现在支持markdown渲染，能够美观地显示AI回复中的格式化内容，包括：

- **标题**：H1-H6各级标题
- **列表**：有序列表和无序列表
- **代码**：行内代码和代码块
- **强调**：粗体和斜体文本
- **引用**：块引用
- **表格**：完整的表格支持
- **链接**：可点击的链接
- **分隔线**：水平分隔线

### 技术实现

#### 消息显示逻辑
```javascript
function displayChatMessage(content, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${isUser ? 'user' : 'ai'}`;
    
    // 只对AI消息进行markdown渲染，用户消息保持纯文本
    if (!isUser && typeof marked !== 'undefined') {
        messageDiv.innerHTML = marked.parse(content);
    } else {
        messageDiv.textContent = content;
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
```

#### 流式响应渲染
在流式响应过程中，AI消息会实时渲染markdown：
```javascript
// 流式更新时实时渲染markdown
if (typeof marked !== 'undefined') {
    aiMessageDiv.innerHTML = marked.parse(aiResponse);
} else {
    aiMessageDiv.textContent = aiResponse;
}
```

#### CSS样式优化
为chat消息中的markdown元素添加了专门的样式：
- 标题使用合适的字体大小和间距
- 代码块具有背景色和语法高亮样式
- 表格具有边框和对齐
- 引用块具有左边框装饰
- 用户消息和AI消息的markdown元素颜色适配

### 使用场景
- **代码解释**：AI可以返回格式化的代码示例
- **结构化回答**：使用标题、列表组织答案
- **表格数据**：以表格形式呈现对比数据
- **文档引用**：包含格式化的引用内容

## 特性说明

### 当前支持的功能
✅ 基础的用户-AI对话
✅ 流式响应显示
✅ 复用现有API配置
✅ 可配置的系统提示词
✅ 简洁的消息界面
✅ Enter键快捷发送
✅ Markdown渲染（AI回复支持）

### 暂不支持的功能
❌ 对话历史保存
❌ 消息编辑/删除
❌ 时间戳显示
❌ Token统计
❌ 清空对话功能

## 测试

使用提供的test.html文件可以测试插件的完整功能：
1. 加载test.html页面
2. 打开插件侧边栏
3. 测试原文提取、翻译和对话功能

## 下一步扩展

后续可以根据需求添加：
- 对话历史管理
- 消息编辑和删除
- Token使用统计
- 导入/导出对话
- 多对话会话管理
- 代码块语法高亮
- LaTeX数学公式渲染
- 图片和文件上传支持
- 消息搜索功能

## 更新日志

### v1.1.0 - Markdown渲染支持
- ✅ 添加AI回复的markdown渲染功能
- ✅ 支持标题、列表、代码块、表格等markdown元素
- ✅ 优化chat消息的CSS样式
- ✅ 保持用户消息为纯文本显示
- ✅ 流式响应过程中实时渲染markdown