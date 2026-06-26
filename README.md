# HTML Effectiveness for Obsidian

在 Obsidian 中渲染空间化 HTML 内容——边对比、流程图、幻灯片、报告、时间线。基于 [html-effectiveness](https://github.com/Azhi-ss/html-effectiveness) 方法论。

Render spatial HTML content (compare, diagram, slides, report, timeline) in Obsidian. Based on the [html-effectiveness](https://github.com/Azhi-ss/html-effectiveness) methodology.

## Features / 功能

- **Compare** — 双栏并排对比
- **Timeline** — 时间线视图
- **Diagram** — ASCII 图示渲染
- **Report** — KPI 卡片 + 报告正文
- **Slides** — 可翻页幻灯片

## Usage / 使用

在笔记中插入代码块 ``````html-effect`：

````
```html-effect
compare

Left column
---
Right column
```
````

````
```html-effect
timeline

- [2026-01] Event one
- [2026-03] Event two
- [2026-06] Event three
```
````

````
```html-effect
---
type: report
---
## 
- 85%: Completion rate
- $2.5B: Market size

# Section Title
Content here...
```
````

## Commands / 命令

| Command | Description |
|---------|-------------|
| Export note as HTML Effectiveness | 导出当前笔记为独立 HTML |
| Insert Compare template | 插入边对比模板 |
| Insert Timeline template | 插入时间线模板 |
| Insert Report template | 插入报告模板 |
| Insert Slides template | 插入幻灯片模板 |
| Insert Diagram template | 插入图示模板 |

## Installation / 安装

### From Obsidian Community Plugins (once approved)

Settings → Community Plugins → Browse → Search "HTML Effectiveness"

### Manual / BRAT

1. Install [BRAT](https://obsidian.md/plugins?id=obsidian42-brat)
2. Add the repository: `wangq/html-effectiveness`

## Development / 开发

```bash
cd html-effectiveness-plugin
npm install
npm run dev    # watch mode
npm run build  # production build
```

## License

MIT
