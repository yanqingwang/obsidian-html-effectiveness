import { App, Plugin, PluginSettingTab, Setting, MarkdownPostProcessorContext, parseYaml, Notice } from 'obsidian';

interface HESettings {
	defaultTheme: 'dark' | 'light';
}
const DEFAULT_SETTINGS: HESettings = { defaultTheme: 'dark' };

type TemplateType = 'compare' | 'timeline' | 'diagram' | 'report' | 'slides';

interface TemplateMeta {
	type: TemplateType;
	title?: string;
	theme?: 'dark' | 'light';
	[key: string]: unknown;
}

function escapeHtml(s: string): string {
	return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function mdToHtml(md: string): string {
	let s = escapeHtml(md);
	const blocks: string[] = [];
	s = s.replace(/```(\w*)\n([\s\S]*?)```/g, (_m, _lang, code) => {
		blocks.push('<pre><code>' + code + '</code></pre>');
		return '%%CODEBLOCK' + (blocks.length - 1) + '%%';
	});
	const inlines: string[] = [];
	s = s.replace(/`([^`]+)`/g, (_m, code) => {
		inlines.push('<code class="he-inline-code">' + code + '</code>');
		return '%%INLINECODE' + (inlines.length - 1) + '%%';
	});
	s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
	s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
	s = s.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
	s = s.replace(/\n/g, '<br>');
	s = s.replace(/%%INLINECODE(\d+)%%/g, (_m, id) => inlines[parseInt(id)] || '');
	s = s.replace(/%%CODEBLOCK(\d+)%%/g, (_m, id) => blocks[parseInt(id)] || '');
	return s;
}

function htmlToFragment(html: string): DocumentFragment {
	return document.createRange().createContextualFragment(html);
}

function renderCompare(content: string, meta: TemplateMeta): DocumentFragment {
	const items = content.split('\n---\n').filter(Boolean);
	const outer = document.createElement('div');
	outer.className = 'he-compare ' + (meta.theme || 'dark');
	for (const item of items) {
		const lines = item.trim().split('\n');
		const title = lines[0].replace(/^#\s*/, '');
		const body = lines.slice(1).join('\n');
		const col = outer.createDiv({ cls: 'he-col' });
		col.createDiv({ cls: 'he-col-title', text: escapeHtml(title) });
		col.createDiv({ cls: 'he-col-body' }).appendChild(htmlToFragment(mdToHtml(body)));
	}
	return htmlToFragment(outer.outerHTML);
}

function renderTimeline(content: string, _meta: TemplateMeta): DocumentFragment {
	const items = content.trim().split('\n').filter(l => l.trim());
	const ul = document.createElement('ul');
	ul.className = 'he-timeline';
	for (const line of items) {
		const li = document.createElement('li');
		li.className = 'he-tl-item';
		const match = line.match(/^-\s*\[(.+?)\]\s*(.+)/);
		if (match) {
			const spanDate = document.createElement('span');
			spanDate.className = 'he-tl-date';
			spanDate.textContent = escapeHtml(match[1]);
			li.appendChild(spanDate);
			const spanText = document.createElement('span');
			spanText.className = 'he-tl-text';
			spanText.textContent = escapeHtml(match[2]);
			li.appendChild(spanText);
		} else {
			li.textContent = escapeHtml(line.replace(/^-\s*/, ''));
		}
		ul.appendChild(li);
	}
	return htmlToFragment(ul.outerHTML);
}

function renderDiagram(content: string, _meta: TemplateMeta): DocumentFragment {
	const outer = document.createElement('div');
	outer.className = 'he-diagram';
	const pre = outer.createEl('pre', { cls: 'he-diagram-pre', text: escapeHtml(content) });
	const cap = outer.createEl('p', { cls: 'he-diagram-caption', text: 'Diagram — render as SVG in a future version' });
	return htmlToFragment(outer.outerHTML);
}

function renderReport(content: string, meta: TemplateMeta): DocumentFragment {
	const lines = content.trim().split('\n').filter(Boolean);
	let kpis = '';
	let body = '';
	let inKpi = false;
	for (const line of lines) {
		if (line.startsWith('## ')) { inKpi = true; continue; }
		if (line.startsWith('# ') && inKpi) { inKpi = false; body += '<h3 class="he-report-h3">' + escapeHtml(line.replace(/^#\s*/, '')) + '</h3>'; continue; }
		if (inKpi) {
			const m = line.match(/^-\s*(\d+[%MBT]?)\s*:\s*(.+)/);
			if (m) {
				kpis += '<div class="he-kpi"><div class="he-kpi-num">' + escapeHtml(m[1]) + '</div><div class="he-kpi-label">' + escapeHtml(m[2]) + '</div></div>';
				continue;
			}
		}
		body += '<p>' + mdToHtml(line) + '</p>';
	}
	const outer = document.createElement('div');
	outer.className = 'he-report ' + (meta.theme || 'dark');
	if (kpis) outer.insertAdjacentHTML('beforeend', '<div class="he-kpi-row">' + kpis + '</div>');
	outer.insertAdjacentHTML('beforeend', '<div class="he-report-body">' + body + '</div>');
	return htmlToFragment(outer.outerHTML);
}

function renderSlides(container: HTMLElement, content: string, _meta: TemplateMeta): void {
	const slides = content.split('\n---\n').filter(Boolean);
	const slideDivs: HTMLDivElement[] = [];
	let currentIdx = 0;

	const nav = container.createDiv({ cls: 'he-slides-nav' });
	nav.createEl('button', { text: '◀', cls: 'he-slide-btn' })
		.addEventListener('click', () => { if (currentIdx > 0) showSlide(currentIdx - 1); });
	nav.createEl('span', { cls: 'he-slide-counter' });
	nav.createEl('button', { text: '▶', cls: 'he-slide-btn' })
		.addEventListener('click', () => { if (currentIdx < slideDivs.length - 1) showSlide(currentIdx + 1); });

	const slidesWrap = container.createDiv({ cls: 'he-slides' });

	function showSlide(idx: number) {
		slideDivs.forEach((s, i) => s.classList.toggle('he-slide-hidden', i !== idx));
		const counterEl = container.querySelector('.he-slide-counter');
		if (counterEl) counterEl.textContent = (idx + 1) + ' / ' + slideDivs.length;
		currentIdx = idx;
	}

	for (let i = 0; i < slides.length; i++) {
		const lines = slides[i].trim().split('\n');
		const title = lines[0].replace(/^#\s*/, '');
		const body = lines.slice(1).join('\n');
		const sd = slidesWrap.createDiv({ cls: 'he-slide', attr: { 'data-index': String(i) } });
		if (i > 0) sd.classList.add('he-slide-hidden');
		sd.createEl('h2', { cls: 'he-slide-title', text: escapeHtml(title) });
		const sb = sd.createDiv({ cls: 'he-slide-body' });
		sb.appendChild(htmlToFragment(mdToHtml(body)));
		slideDivs.push(sd);
	}

	showSlide(0);
}

function processTemplate(container: HTMLElement, content: string, meta: TemplateMeta): void {
	switch (meta.type) {
		case 'compare':
			container.appendChild(renderCompare(content, meta));
			break;
		case 'timeline':
			container.appendChild(renderTimeline(content, meta));
			break;
		case 'diagram':
			container.appendChild(renderDiagram(content, meta));
			break;
		case 'report':
			container.appendChild(renderReport(content, meta));
			break;
		case 'slides':
			renderSlides(container, content, meta);
			break;
		default:
			const err = container.createDiv({ cls: 'he-error', text: 'Unknown template type: ' + meta.type });
	}
}

function processor(source: string, el: HTMLElement, _ctx: MarkdownPostProcessorContext, defaultTheme: string = 'dark') {
	let meta: TemplateMeta = { type: 'report', theme: defaultTheme === 'light' ? 'light' : 'dark' };
	let content = source;
	const firstNl = source.indexOf('\n');
	if (firstNl > 0) {
		const firstLine = source.substring(0, firstNl).trim();
		if (firstLine.startsWith('---')) {
			const endIdx = source.indexOf('---', 3);
			if (endIdx > 0) {
				const yamlStr = source.substring(3, endIdx).trim();
				try {
					const raw = parseYaml(yamlStr);
					if (raw && typeof raw === 'object') {
						const r = raw as Record<string, unknown>;
						if (r.theme === 'light') meta.theme = 'light';
						if (r.type === 'compare' || r.type === 'timeline' || r.type === 'diagram' || r.type === 'report' || r.type === 'slides') {
							meta.type = r.type as TemplateType;
						}
					}
				} catch {
					/* invalid YAML */
				}
				content = source.substring(endIdx + 3).trim();
			}
		} else {
			const t = firstLine.toLowerCase();
			if (t === 'compare' || t === 'timeline' || t === 'diagram' || t === 'report' || t === 'slides') {
				meta.type = t as TemplateType;
				content = source.substring(firstNl + 1).trim();
			}
		}
	}
	const wrapper = el.createDiv({ cls: 'he-wrapper ' + (meta.theme || 'dark') });
	processTemplate(wrapper, content, meta);
}

async function exportNoteAsHTML(app: App) {
	const file = app.workspace.getActiveFile();
	if (!file) { new Notice('No active note'); return; }
	const content = await app.vault.read(file);
	const expPath = (file.parent ? file.parent.path + '/' : '') + file.basename + '.html';
	await app.vault.create(expPath, content);
	new Notice('Exported: ' + expPath);
}

export default class HEExtPlugin extends Plugin {
	settings: HESettings = DEFAULT_SETTINGS;

	async onload() {
		await this.loadSettings();
		this.registerMarkdownCodeBlockProcessor('html-effect', (source, el, ctx) => {
			processor(source, el, ctx, this.settings.defaultTheme);
		});
		this.addCommand({ id: 'export-note', name: 'Export note as HTML', callback: () => exportNoteAsHTML(this.app) });
		this.addCommand({ id: 'insert-compare', name: 'Insert Compare template', editorCallback: (e) => e.replaceSelection('```html-effect\ncompare\n\nLeft column\n---\nRight column\n```') });
		this.addCommand({ id: 'insert-timeline', name: 'Insert Timeline template', editorCallback: (e) => e.replaceSelection('```html-effect\ntimeline\n\n- [2026-01] Event one\n- [2026-03] Event two\n- [2026-06] Event three\n```') });
		this.addCommand({ id: 'insert-report', name: 'Insert Report template', editorCallback: (e) => e.replaceSelection('```html-effect\n---\ntype: report\n---\n## \n- 85%: Rate\n- $2.5B: Value\n\n# Title\nContent...\n```') });
		this.addCommand({ id: 'insert-slides', name: 'Insert Slides template', editorCallback: (e) => e.replaceSelection('```html-effect\nslides\n\n# Slide 1\nContent\n---\n# Slide 2\nContent\n```') });
		this.addCommand({ id: 'insert-diagram', name: 'Insert Diagram template', editorCallback: (e) => e.replaceSelection('```html-effect\ndiagram\n\n┌─────┐\n│ App │\n└─┬───┘\n  ▼\n┌────┐\n│ DB │\n└────┘\n```') });
		this.addSettingTab(new HESettingTab(this.app, this));
	}

	async loadSettings() {
		const data = await this.loadData();
		if (data && typeof data === 'object' && typeof (data as Record<string, unknown>).defaultTheme === 'string') {
			const t = (data as Record<string, unknown>).defaultTheme;
			if (t === 'light' || t === 'dark') this.settings.defaultTheme = t;
		}
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class HESettingTab extends PluginSettingTab {
	plugin: HEExtPlugin;
	constructor(app: App, plugin: HEExtPlugin) { super(app, plugin); this.plugin = plugin; }

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		new Setting(containerEl).setName('Settings').setHeading();
		new Setting(containerEl)
			.setName('Default theme')
			.setDesc('Theme for rendered blocks')
			.addDropdown(d => d
				.addOption('dark', 'Dark')
				.addOption('light', 'Light')
				.setValue(this.plugin.settings.defaultTheme)
				.onChange(async (v) => {
					this.plugin.settings.defaultTheme = v as 'dark' | 'light';
					await this.plugin.saveSettings();
				}));
	}
}
