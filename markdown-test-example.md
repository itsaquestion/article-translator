# Chat Markdown渲染测试示例

这个文件展示了在Article Translator插件的Chat功能中可以正确渲染的各种markdown元素。

## 测试AI回复示例

当用户询问关于编程的问题时，AI可以返回如下格式的回复：

---

## Python编程基础概念

### 1. 变量和数据类型

Python支持多种数据类型：

- **字符串** (str): `"Hello, World!"`
- **整数** (int): `42`
- **浮点数** (float): `3.14`
- **布尔值** (bool): `True` 或 `False`
- **列表** (list): `[1, 2, 3, 4]`

### 2. 基本语法示例

```python
# 变量定义
name = "Alice"
age = 25
is_student = True

# 函数定义
def greet(name):
    """
    打招呼函数
    """
    return f"Hello, {name}!"

# 调用函数
message = greet(name)
print(message)
```

### 3. 控制结构对比

| 结构类型 | 语法 | 用途 |
|---------|------|------|
| if语句 | `if condition:` | 条件判断 |
| for循环 | `for item in iterable:` | 遍历序列 |
| while循环 | `while condition:` | 条件循环 |

### 4. 重要提示

> **注意**: Python使用缩进来表示代码块，这是Python语法的重要特性。

### 5. 学习建议

1. **从基础开始**: 先掌握变量、数据类型
2. **多练习**: 编写小程序巩固知识
3. **阅读文档**: 查看[Python官方文档](https://docs.python.org/)
4. **加入社区**: 参与开源项目

---

*希望这些信息对您的Python学习有帮助！*

---

## 测试说明

在插件的Chat标签页中，当AI返回上述格式的回复时，应该能看到：

✅ 标题层次清晰
✅ 代码块有背景色和语法高亮
✅ 表格格式整齐
✅ 列表项目清晰
✅ 引用块有左边框
✅ 链接可以点击
✅ 强调文本（粗体、斜体）正确显示