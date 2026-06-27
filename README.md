# HTML Effectiveness for Obsidian

在 Obsidian 中渲染空间化 HTML 内容 + 浏览独立 HTML 文件。基于 [html-effectiveness](https://github.com/Azhi-ss/html-effectiveness) 方法论。

Render spatial HTML content inside notes AND view standalone HTML files within Obsidian. Based on the [html-effectiveness](https://github.com/Azhi-ss/html-effectiveness) methodology.

---

## What It Solves / 解决的问题

### 1. Obsidian 无法直接渲染空间化 HTML 内容
Markdown 是线性的，但对比、时间线、仪表盘等需要**空间布局**的信息用 HTML 才能表达。本插件让你在笔记中用 ````html-effect` 代码块直接渲染这些结构。

### 2. html-effectiveness 生成的 HTML 文件无法在 Obsidian 中查看
AI 生成的 HTML 报告（行业周报、分析报告、数据仪表盘等）在浏览器中打开正常，但在 Obsidian 中只能看到源码。插件提供了专用的 **HTML 文件查看器**，正确渲染这些文件，包括**图片、样式、交互元素**。

### 3. 相对路径图片在 Obsidian 中无法显示
其他 HTML 预览工具在 Obsidian 中打开 HTML 文件时，`src="images/foo.png"` 这类相对路径的图片会加载失败。插件自动将相对路径转换为 Obsidian 可识别的资源 URL，图片正常显示。

---

## Features / 功能

### 🔲 html-effect 代码块（在笔记中直接使用）

| 模板 | 说明 |
|------|------|
| **Compare** — 双栏并排对比 | 左右分栏，适合方案对比、参数对照 |
| **Timeline** — 时间线视图 | 垂直时间线，带日期标记 |
| **Diagram** — ASCII 图示 | 等宽字体文本框，可画简单架构图 |
| **Report** — KPI 报告 | 数据卡片 + 正文，适合仪表盘 |
| **Slides** — 可翻页幻灯片 | 上下翻页，适合演示 |

### 📄 HTML 文件查看器

在 Obsidian 中直接打开 .html 文件，完美渲染：

- **打开方式**：右键 .html 文件 → "Open with HTML Effectiveness"
- **命令面板**："Open current file in HTML viewer"（仅 .html 文件显示）
- **自动关联**：点击 .html 文件自动用本插件打开
- **图片支持**：相对路径图片自动转换为 Obsidian 资源 URL
- **实时刷新**：编辑 .html 文件后视图自动更新
- **交互支持**：iframe sandbox 包含 allow-scripts，支持 JavaScript 交互

### 🚀 其他

- **导出笔记**："Export note as HTML" 命令将当前笔记导出为独立 HTML 文件
- **插入模板**：6 个快捷命令插入常用模板代码块
- **主题适配**：浅色/深色主题切换，跟随 Obsidian 主题

---

## Usage / 使用

### 在笔记中插入 html-effect 代码块

````
```html-effect
compare

左侧内容
---
右侧内容
```
````

````
```html-effect
timeline

- [2026-01] 事件一
- [2026-03] 事件二
- [2026-06] 事件三
```
````

````
```html-effect
---
type: report
---
## 
- 85%: 完成率
- $2.5B: 市场规模

# 报告标题
正文内容...
```
````

### 查看 HTML 文件

在 Obsidian 文件管理器中：
1. **右键** `.html` 文件 → "Open with HTML Effectiveness"
2. 或选中文件后打开**命令面板** → "Open current file in HTML viewer"

---

## Commands / 命令

| Command | Description |
|---------|-------------|
| Open current file in HTML viewer | 在 HTML 查看器中打开当前文件 |
| Export note as HTML | 导出当前笔记为独立 HTML |
| Compare | 插入 Compare 模板 |
| Timeline | 插入 Timeline 模板 |
| Report | 插入 Report 模板 |
| Slides | 插入 Slides 模板 |
| Diagram | 插入 Diagram 模板 |

---

## Installation / 安装

### From Obsidian Community Plugins

Settings → Community Plugins → Browse → Search "HTML Effectiveness"

### Manual / BRAT

1. Install [BRAT](https://obsidian.md/plugins?id=obsidian42-brat)
2. Add the repository: `yanqingwang/obsidian-html-effectiveness`

---

## Development / 开发

```bash
cd html-effectiveness-plugin
npm install
npm run dev    # watch mode
npm run build  # production build
```

---

## License

MIT

Copyright (c) 2026 rosswang (Heart and Road Ltd)
