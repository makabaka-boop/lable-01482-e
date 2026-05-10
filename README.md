# CodeForge IDE - 在线代码编辑器

## How to Run

### 使用 Docker Compose 运行（推荐）

```bash
# 克隆项目
git clone <repository-url>
cd p-1482

# 构建并启动服务
docker-compose up --build -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f frontend

# 停止服务
docker-compose down
```

### 直接运行（开发模式）

```bash
# 进入前端目录
cd frontend

# 使用 Python 启动简单 HTTP 服务器
python -m http.server 8081

# 或使用 Node.js
npx serve -l 8081
```

### 访问应用

启动成功后，在浏览器中访问：

**🌐 http://localhost:8081**

---

## Services

| 服务 | 端口 | 描述 |
|------|------|------|
| Frontend (CodeForge IDE) | 8081 | 在线代码编辑器前端服务 |

### 服务架构

```
┌─────────────────────────────────────────┐
│           CodeForge IDE                 │
│         http://localhost:8081           │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐    │
│  │       Monaco Editor            │    │
│  │   (代码编辑、语法高亮)          │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │       Pyodide (WASM)           │    │
│  │   (Python 浏览器端运行)         │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │       Piston API               │    │
│  │   (C/C++ 在线编译)             │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

---

## 测试账号

本项目为纯前端应用，**无需登录账号**。

所有数据保存在浏览器本地存储 (localStorage) 中：
- 文件自动保存
- 设置自动持久化
- 支持导出/下载文件

---

## 题目内容

调用智能体，完成任务：制作一个用HTML/CSS/JS 写的可以编译、运行、调试等功能的C/C++、 Python代码的功能齐全的网页版代码编辑器

---

## 项目介绍

**CodeForge IDE** 是一个功能强大的在线代码编辑器，完全在浏览器端运行，支持 Python、C 和 C++ 代码的编写、编译、运行和调试。

### ✨ 核心特性

#### 🖥️ 代码编辑
- **Monaco Editor** - 与 VS Code 相同的编辑器内核
- **语法高亮** - 支持 Python、C、C++ 语法着色
- **智能补全** - 代码自动补全和提示
- **多文件管理** - 标签页式文件管理
- **代码格式化** - 一键格式化代码

#### ⚡ 编译运行
- **Python 运行** - 使用 Pyodide (WebAssembly) 在浏览器内直接运行
- **C/C++ 编译** - 通过 Piston API 在线编译执行
- **标准输入支持** - 支持程序交互式输入
- **实时输出** - 控制台实时显示程序输出

#### 🐛 调试功能
- **断点设置** - 点击行号设置/取消断点
- **单步执行** - Step Over / Step Into / Step Out
- **变量监视** - 实时查看变量值
- **调用堆栈** - 查看函数调用栈

#### 🎨 现代化界面
- **深色主题** - 赛博朋克风格 UI 设计
- **主题切换** - 支持深色/浅色主题
- **响应式布局** - 可调整面板大小
- **快捷键支持** - 丰富的键盘快捷键

### 📋 技术栈

| 技术 | 用途 |
|------|------|
| HTML5 | 页面结构 |
| CSS3 | 样式设计（CSS 变量、Flexbox、Grid） |
| JavaScript (ES6+) | 核心逻辑 |
| Monaco Editor | 代码编辑器 |
| Pyodide | Python WebAssembly 运行时 |
| Piston API | C/C++ 在线编译服务 |
| Nginx | 静态文件服务 |
| Docker | 容器化部署 |

### ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `F5` | 运行代码 |
| `F9` | 切换断点 |
| `F10` | 单步跳过 (Step Over) |
| `F11` | 单步进入 (Step Into) |
| `Shift+F11` | 单步跳出 (Step Out) |
| `Ctrl+S` | 保存文件 |
| `Ctrl+N` | 新建文件 |
| `Ctrl+F` | 查找 |
| `Ctrl+H` | 替换 |
| `Ctrl+/` | 注释/取消注释 |
| `Ctrl+Z` | 撤销 |
| `Ctrl+Y` | 重做 |

### 📁 项目结构

```
p-1482/
├── docker-compose.yml      # Docker Compose 配置
├── .gitignore              # Git 忽略文件
├── README.md               # 项目说明文档
└── frontend/               # 前端项目
    ├── Dockerfile          # Docker 构建文件
    ├── nginx.conf          # Nginx 配置
    ├── index.html          # 主页面
    ├── css/
    │   └── style.css       # 样式文件
    └── js/
        ├── config.js       # 配置文件
        ├── utils.js        # 工具函数
        ├── fileManager.js  # 文件管理
        ├── editor.js       # 编辑器管理
        ├── compiler.js     # 编译器/运行时
        ├── debugger.js     # 调试器
        ├── ui.js           # UI 管理
        └── main.js         # 主入口
```

### 🖼️ 界面预览

启动后，您将看到一个现代化的 IDE 界面，包含：
- **顶部工具栏** - 菜单、运行按钮、语言选择
- **左侧边栏** - 文件管理、调试面板、设置
- **中央编辑区** - Monaco 代码编辑器
- **底部面板** - 控制台、输出、问题列表
- **状态栏** - 语言、光标位置、编码信息

### 📝 使用示例

#### Python 示例
```python
# Hello World
print("Hello, World!")

# 用户输入
name = input("请输入你的名字: ")
print(f"你好, {name}!")
```

#### C 示例
```c
#include <stdio.h>

int main() {
    printf("Hello, World!\n");
    return 0;
}
```

#### C++ 示例
```cpp
#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}
```

### ⚠️ 注意事项

1. **Python 运行**：首次加载可能需要下载 Pyodide 运行时（约 10MB），请耐心等待
2. **C/C++ 编译**：需要网络连接，使用 Piston 在线编译 API
3. **数据存储**：所有文件保存在浏览器 localStorage，清除浏览器数据会丢失文件
4. **浏览器支持**：推荐使用 Chrome、Firefox、Edge 等现代浏览器

### 📄 License

MIT License

---