import { App, Plugin, PluginSettingTab, Setting, MarkdownPostProcessorContext, parseYaml, Notice, TFile, requestUrl } from 'obsidian';

// ─── Settings ───────────────────────────────────────────────
interface HESettings {
	defaultTheme: 'dark' | 'light';
	autoRender: boolean;
}
const DEFAULT_SETTINGS: HESettings = { defaultTheme: 'dark', autoRender: true };

// ─── Templates ──────────────────────────────────────────────
type TemplateType = 'compare' | 'timeline' | 'diagram' | 'report' | 'slides';

interface TemplateMeta {
	type: TemplateType;
	title?: string;
	theme?: 'dark' | 'light';
	[key: string]: unknown;
}

// ─── Renderers ──────────────────────────────────────────────
function renderCompare(content: string, meta: TemplateMeta): string {
	const items = content.split('\n---\n').filter(Boolean);
	const cols = items.map((item, i) => {
		const lines = item.trim().split('\n');
		const title = lines[0].replace(/^#\s*/, '');
		const body = lines.slice(1).join('\n');
		return `<div class="he-col"><div class="he-col-title">${escapeHtml(title)}</div><div class="he-col-body">${mdToHtml(body)}</div></div>`;
	}).join('');
	return `<div class="he-compare ${meta.theme || 'dark'}">${cols}</div>`;
}

function renderTimeline(content: string, _meta: TemplateMeta): string {
	const items = content.trim().split('\n').filter(l => l.trim());
	const lis = items.map(line => {
		const match = line.match(/^-\s*\[(.+?)\]\s*(.+)/);
		if (match) {
			return `<li class="he-tl-item"><span class="he-tl-date">${escapeHtml(match[1])}</span><span class="he-tl-text">${escapeHtml(match[2])}</span></li>`;
		}
		return `<li class="he-tl-item"><span class="he-tl-text">${escapeHtml(line.replace(/^-\s*/, ''))}</span></li>`;
	}).join('');
	return `<ul class="he-timeline">${lis}</ul>`;
}

function renderDiagram(content: string, _meta: TemplateMeta): string {
	return `<div class="he-diagram"><pre style="background:#161b22;color:#c9d1d9;padding:16px;border-radius:8px;overflow:auto;font-family:monospace;font-size:13px;line-height:1.5;">${escapeHtml(content)}</pre><p style="color:#8b949e;font-size:12px;text-align:center;margin-top:6px;">Diagram — render as SVG in a future version</p></div>`;
}

function renderReport(content: string, meta: TemplateMeta): string {
	const lines = content.trim().split('\n').filter(Boolean);
	let kpis = '';
	let body = '';
	let inKpi = false;
	for (const line of lines) {
		if (line.startsWith('## ')) { inKpi = true; continue; }
		if (line.startsWith('# ') && inKpi) { inKpi = false; body += `<h3>${escapeHtml(line.replace(/^#\s*/, ''))}</h3>`; continue; }
		if (inKpi) {
			const m = line.match(/^-\s*(\d+[%MBT]?)\s*:\s*(.+)/);
			if (m) {
				kpis += `<div class="he-kpi"><div class="he-kpi-num">${escapeHtml(m[1])}</div><div class="he-kpi-label">${escapeHtml(m[2])}</div></div>`;
				continue;
			}
		}
		body += `<p>${mdToHtml(line)}</p>`;
	}
	const kpiHtml = kpis ? `<div class="he-kpi-row">${kpis}</div>` : '';
	return `<div class="he-report ${meta.theme || 'dark'}">${kpiHtml}<div class="he-report-body">${body}</div></div>`;
}

function renderSlides(content: string, _meta: TemplateMeta): string {
	const slides = content.split('\n---\n').filter(Boolean);
	const slidesHtml = slides.map((slide, i) => {
		const lines = slide.trim().split('\n');
		const title = lines[0].replace(/^#\s*/, '');
		const body = lines.slice(1).join('\n');
		return `<div class="he-slide" data-index="${i}"><h2 class="he-slide-title">${escapeHtml(title)}</h2><div class="he-slide-body">${mdToHtml(body)}</div></div>`;
	}).join('');
	return `<div class="he-slides-container"><div class="he-slides-nav"><button class="he-slide-prev" onclick="this.parentElement.nextElementSibling.querySelector('.he-slide:not([hidden])').previousElementSibling?.scrollIntoView({behavior:'smooth'})">◀</button><button class="he-slide-next" onclick="this.parentElement.nextElementSibling.querySelector('.he-slide:not([hidden])').nextElementSibling?.scrollIntoView({behavior:'smooth'})">▶</button></div><div class="he-slides">${slidesHtml}</div></div>`;
}

// ─── Helpers ────────────────────────────────────────────────
function escapeHtml(s: string): string {
	return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function mdToHtml(md: string): string {
	return escapeHtml(md).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/`(.+?)`/g, '<code style="background:#21262d;padding:2px 6px;border-radius:4px;font-size:0.9em;">$1</code>').replace(/\n/g, '<br>');
}

function processTemplate(content: string, meta: TemplateMeta): string {
	switch (meta.type) {
		case 'compare': return renderCompare(content, meta);
		case 'timeline': return renderTimeline(content, meta);
		case 'diagram': return renderDiagram(content, meta);
		case 'report': return renderReport(content, meta);
		case 'slides': return renderSlides(content, meta);
		default: return `<div style="color:#f85149;padding:12px;border:1px solid #f85149;border-radius:6px;">Unknown template type: ${meta.type}</div>`;
	}
}

// ─── CSS ────────────────────────────────────────────────────
const STYLE_ID = 'he-styles';
function ensureStyles() {
	if (document.getElementById(STYLE_ID)) return;
	const style = document.createElement('style');
	style.id = STYLE_ID;
	style.textContent = `
.he-wrapper { margin: 12px 0; padding: 4px; border-radius: 8px; }
.he-wrapper.dark { background: #0d1117; color: #c9d1d9; }
.he-wrapper.light { background: #ffffff; color: #1f2328; }

/* Compare */
.he-compare { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; padding: 12px; border-radius: 8px; }
.he-compare.dark { background: #161b22; border: 1px solid #30363d; }
.he-compare.light { background: #f6f8fa; border: 1px solid #d0d7de; }
.he-col { padding: 12px; border-radius: 6px; }
.he-compare.dark .he-col { background: #0d1117; }
.he-compare.light .he-col { background: #ffffff; }
.he-col-title { font-weight: 600; font-size: 15px; margin-bottom: 8px; color: #f0883e; }
.he-col-body { font-size: 13px; line-height: 1.6; }

/* Timeline */
.he-timeline { list-style: none; padding: 0; margin: 12px 0; position: relative; }
.he-timeline::before { content: ''; position: absolute; left: 12px; top: 0; bottom: 0; width: 2px; background: #30363d; }
.he-tl-item { position: relative; padding: 8px 0 8px 32px; font-size: 13px; }
.he-tl-item::before { content: ''; position: absolute; left: 6px; top: 14px; width: 12px; height: 12px; border-radius: 50%; background: #58a6ff; border: 2px solid #0d1117; }
.he-tl-date { display: inline-block; font-weight: 600; color: #f0883e; margin-right: 8px; font-size: 12px; }
.he-tl-text { color: #c9d1d9; }

/* KPI */
.he-kpi-row { display: flex; gap: 12px; flex-wrap: wrap; margin: 16px 0; }
.he-kpi { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 14px 18px; text-align: center; flex: 1; min-width: 80px; }
.he-kpi-num { font-size: 24px; font-weight: bold; color: #58a6ff; }
.he-kpi-label { font-size: 12px; color: #8b949e; margin-top: 4px; }

/* Report */
.he-report { padding: 16px; border-radius: 8px; }
.he-report.dark { background: #161b22; border: 1px solid #30363d; }
.he-report.light { background: #f6f8fa; border: 1px solid #d0d7de; }
.he-report-body { font-size: 14px; line-height: 1.7; }

/* Slides */
.he-slides-container { position: relative; }
.he-slides-nav { display: flex; gap: 8px; justify-content: center; margin-bottom: 12px; }
.he-slides-nav button { background: #21262d; border: 1px solid #30363d; color: #c9d1d9; padding: 6px 16px; border-radius: 6px; cursor: pointer; font-size: 16px; }
.he-slides-nav button:hover { background: #30363d; }
.he-slides { max-height: 500px; overflow-y: auto; scroll-behavior: smooth; }
.he-slide { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 24px; margin-bottom: 8px; min-height: 200px; }
.he-slide-title { color: #f0883e; font-size: 20px; margin-bottom: 12px; }
.he-slide-body { font-size: 14px; line-height: 1.7; }
`;
	document.head.appendChild(style);
}

// ─── Code Block Processor ───────────────────────────────────
function processor(source: string, el: HTMLElement, ctx: MarkdownPostProcessorContext) {
	ensureStyles();

	// Parse YAML frontmatter
	let meta: TemplateMeta = { type: 'report', theme: 'dark' };
	let content = source;
	const firstNl = source.indexOf('\n');
	if (firstNl > 0) {
		const firstLine = source.substring(0, firstNl).trim();
		if (firstLine.startsWith('---')) {
			const endIdx = source.indexOf('---', 3);
			if (endIdx > 0) {
				const yamlStr = source.substring(3, endIdx).trim();
				try {
					const parsed = parseYaml(yamlStr) as Partial<TemplateMeta>;
					if (parsed && typeof parsed === 'object') {
						meta = { ...meta, ...parsed };
					}
				} catch {}
				content = source.substring(endIdx + 3).trim();
			}
		} else {
			// First line could be just the type
			const validTypes = ['compare','timeline','diagram','report','slides'];
			if (validTypes.includes(firstLine.toLowerCase())) {
				meta.type = firstLine.toLowerCase() as TemplateType;
				content = source.substring(firstNl + 1).trim();
			}
		}
	}

	const wrapper = el.createEl('div', { cls: `he-wrapper ${meta.theme || 'dark'}` });
	wrapper.innerHTML = processTemplate(content, meta);
}

// ─── Export Command ─────────────────────────────────────────
async function exportNoteAsHTML(app: App) {
	const file = app.workspace.getActiveFile();
	if (!file) { new Notice('No active note'); return; }
	const content = await app.vault.read(file);
	const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${file.basename} — HTML Effectiveness</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #0d1117; color: #c9d1d9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; max-width: 1200px; margin: 0 auto; line-height: 1.6; }
h1 { color: #58a6ff; font-size: 28px; margin-bottom: 16px; }
h2 { color: #f0883e; font-size: 20px; margin: 30px 0 12px; border-bottom: 1px solid #30363d; padding-bottom: 8px; }
h3 { color: #d2a8ff; font-size: 16px; margin: 20px 0 8px; }
p { margin: 8px 0; }
code { background: #21262d; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
pre { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; overflow: auto; }
table { width: 100%; border-collapse: collapse; margin: 12px 0; }
th, td { padding: 8px; border-bottom: 1px solid #30363d; text-align: left; }
th { background: #161b22; color: #8b949e; }
</style>
</head>
<body>
<h1>${file.basename}</h1>
${mdToHtml(content)}
</body>
</html>`;
	const expPath = `${file.parent?.path || ''}/${file.basename}.html`;
	await app.vault.create(expPath, html);
	new Notice(`Exported: ${expPath}`);
}

// ─── Main Plugin ────────────────────────────────────────────
export default class HEExtPlugin extends Plugin {
	settings: HESettings = DEFAULT_SETTINGS;

	async onload() {
		await this.loadSettings();

		// Register code block processor
		this.registerMarkdownCodeBlockProcessor('html-effect', processor);

		// Register commands
		this.addCommand({
			id: 'export-html-effectiveness',
			name: 'Export note as HTML Effectiveness',
			callback: () => exportNoteAsHTML(this.app),
		});

		this.addCommand({
			id: 'insert-compare',
			name: 'Insert Compare template',
			editorCallback: (editor) => {
				editor.replaceSelection('```html-effect\ncompare\n\nLeft column content\n---\nRight column content\n```');
			},
		});

		this.addCommand({
			id: 'insert-timeline',
			name: 'Insert Timeline template',
			editorCallback: (editor) => {
				editor.replaceSelection('```html-effect\ntimeline\n\n- [2026-01] Event one\n- [2026-03] Event two\n- [2026-06] Event three\n```');
			},
		});

		this.addCommand({
			id: 'insert-report',
			name: 'Insert Report template',
			editorCallback: (editor) => {
				editor.replaceSelection('```html-effect\n---\ntype: report\n---\n## \n- 85%: Completion rate\n- $2.5B: Market size\n- +32%: Growth YoY\n\n# Section Title\nReport content goes here...\n```');
			},
		});

		this.addCommand({
			id: 'insert-slides',
			name: 'Insert Slides template',
			editorCallback: (editor) => {
				editor.replaceSelection('```html-effect\nslides\n\n# Slide 1\nContent for first slide\n---\n# Slide 2\nContent for second slide\n---\n# Slide 3\nContent for third slide\n```');
			},
		});

		this.addCommand({
			id: 'insert-diagram',
			name: 'Insert Diagram template',
			editorCallback: (editor) => {
				editor.replaceSelection('```html-effect\ndiagram\n\n                    ┌─────┐\n                    │ App │\n                    └──┬──┘\n                       │\n              ┌────────┼────────┐\n              ▼        ▼        ▼\n           ┌────┐  ┌────┐  ┌────┐\n           │ API│  │ DB │  │ UI │\n           └────┘  └────┘  └────┘\n```');
			},
		});

		// Settings tab
		this.addSettingTab(new HESettingTab(this.app, this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class HESettingTab extends PluginSettingTab {
	plugin: HEExtPlugin;

	constructor(app: App, plugin: HEExtPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.createEl('h2', { text: 'HTML Effectiveness Settings' });
		new Setting(containerEl)
			.setName('Default theme')
			.setDesc('Theme for rendered blocks')
			.addDropdown(dropdown => dropdown
				.addOption('dark', 'Dark')
				.addOption('light', 'Light')
				.setValue(this.plugin.settings.defaultTheme)
				.onChange(async (val) => {
					this.plugin.settings.defaultTheme = val as 'dark' | 'light';
					await this.plugin.saveSettings();
				}));
	}
}
