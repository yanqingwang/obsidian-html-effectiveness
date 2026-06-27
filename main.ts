import { App, Plugin, PluginSettingTab, Setting, MarkdownPostProcessorContext, parseYaml, Notice, ItemView, WorkspaceLeaf, TFile } from 'obsidian';

const VIEW_TYPE = 'html-effectiveness-view';

interface HESettings {
	defaultTheme: 'dark' | 'light';
}
const DEFAULT_SETTINGS: HESettings = { defaultTheme: 'dark' };

type TemplateType = 'compare' | 'timeline' | 'diagram' | 'report' | 'slides';

function escapeHtml(s: string): string {
	return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function applyMd(parent: HTMLElement, text: string): void {
	const parts = escapeHtml(text).split(/\n/g);
	for (let i = 0; i < parts.length; i++) {
		if (i > 0) parent.createEl('br');
		if (parts[i]) parent.createSpan({ text: parts[i] });
	}
}

function buildCompare(parent: HTMLElement, content: string, theme: string): void {
	const outer = parent.createDiv({ cls: 'he-compare ' + theme });
	const items = content.split('\n---\n').filter(Boolean);
	for (const item of items) {
		const lines = item.trim().split('\n');
		const title = lines.shift()?.replace(/^#\s*/, '') || '';
		const col = outer.createDiv({ cls: 'he-col' });
		col.createDiv({ cls: 'he-col-title', text: escapeHtml(title) });
		const body = col.createDiv({ cls: 'he-col-body' });
		applyMd(body, lines.join('\n'));
	}
}

function buildTimeline(parent: HTMLElement, content: string): void {
	const ul = parent.createEl('ul', { cls: 'he-timeline' });
	const items = content.trim().split('\n').filter(l => l.trim());
	for (const line of items) {
		const li = ul.createEl('li', { cls: 'he-tl-item' });
		const m = line.match(/^-\s*\[(.+?)\]\s*(.+)/);
		if (m) {
			li.createSpan({ cls: 'he-tl-date', text: escapeHtml(m[1]) });
			li.createSpan({ cls: 'he-tl-text', text: escapeHtml(m[2]) });
		} else {
			li.createSpan({ cls: 'he-tl-text', text: escapeHtml(line.replace(/^-\s*/, '')) });
		}
	}
}

function buildDiagram(parent: HTMLElement, content: string): void {
	const d = parent.createDiv({ cls: 'he-diagram' });
	d.createEl('pre', { cls: 'he-diagram-pre', text: escapeHtml(content) });
	d.createEl('p', { cls: 'he-diagram-caption', text: 'Diagram - render as SVG in a future version' });
}

function buildReport(parent: HTMLElement, content: string, theme: string): void {
	const outer = parent.createDiv({ cls: 'he-report ' + theme });
	const lines = content.trim().split('\n').filter(Boolean);
	let inKpi = false;
	let kpiRow: HTMLElement | null = null;
	const bodyDiv = outer.createDiv({ cls: 'he-report-body' });
	for (const line of lines) {
		if (line.startsWith('## ')) {
			inKpi = true;
			kpiRow = outer.createDiv({ cls: 'he-kpi-row' });
			continue;
		}
		if (line.startsWith('# ') && inKpi) {
			inKpi = false;
			bodyDiv.createEl('h3', { cls: 'he-report-h3', text: escapeHtml(line.replace(/^#\s*/, '')) });
			continue;
		}
		if (inKpi && kpiRow) {
			const km = line.match(/^-\s*(\d+[%MBT]?)\s*:\s*(.+)/);
			if (km) {
				const k = kpiRow.createDiv({ cls: 'he-kpi' });
				k.createDiv({ cls: 'he-kpi-num', text: escapeHtml(km[1]) });
				k.createDiv({ cls: 'he-kpi-label', text: escapeHtml(km[2]) });
				continue;
			}
		}
		const p = bodyDiv.createEl('p');
		applyMd(p, line);
	}
}

function buildSlides(parent: HTMLElement, content: string): void {
	const slides = content.split('\n---\n').filter(Boolean);
	const slideDivs: HTMLDivElement[] = [];
	let currentIdx = 0;
	const nav = parent.createDiv({ cls: 'he-slides-nav' });
	nav.createEl('button', { text: chr(0x25C0), cls: 'he-slide-btn' })
		.addEventListener('click', () => { if (currentIdx > 0) showSlide(currentIdx - 1); });
	const counter = nav.createSpan({ cls: 'he-slide-counter' });
	nav.createEl('button', { text: chr(0x25B6), cls: 'he-slide-btn' })
		.addEventListener('click', () => { if (currentIdx < slideDivs.length - 1) showSlide(currentIdx + 1); });
	const wrap = parent.createDiv({ cls: 'he-slides' });
	function showSlide(idx: number) {
		slideDivs.forEach((s, i) => s.classList.toggle('he-slide-hidden', i !== idx));
		counter.textContent = (idx + 1) + ' / ' + slideDivs.length;
		currentIdx = idx;
	}
	for (let i = 0; i < slides.length; i++) {
		const lines = slides[i].trim().split('\n');
		const title = lines.shift()?.replace(/^#\s*/, '') || '';
		const sd = wrap.createDiv({ cls: 'he-slide', attr: { 'data-index': String(i) } });
		if (i > 0) sd.classList.add('he-slide-hidden');
		sd.createEl('h2', { cls: 'he-slide-title', text: escapeHtml(title) });
		const sb = sd.createDiv({ cls: 'he-slide-body' });
		applyMd(sb, lines.join('\n'));
		slideDivs.push(sd);
	}
	showSlide(0);
}

function chr(c: number): string { return String.fromCharCode(c); }

function processor(source: string, el: HTMLElement, _ctx: MarkdownPostProcessorContext, defaultTheme: string): void {
	let type: TemplateType = 'report';
	let theme = defaultTheme === 'light' ? 'light' : 'dark';
	let content = source;
	const nl = source.indexOf('\n');
	if (nl > 0) {
		const fl = source.substring(0, nl).trim();
		if (fl.startsWith('---')) {
			const end = source.indexOf('---', 3);
			if (end > 0) {
				const yml = source.substring(3, end).trim();
				try {
					const r = parseYaml(yml);
					if (r && typeof r === 'object') {
						const o = r as Record<string, unknown>;
						if (o.theme === 'light') theme = 'light';
						if (typeof o.type === 'string') {
							const t = o.type as string;
							if (t === 'compare' || t === 'timeline' || t === 'diagram' || t === 'report' || t === 'slides') type = t;
						}
					}
				} catch { /* ignore */ }
				content = source.substring(end + 3).trim();
			}
		} else {
			const t = fl.toLowerCase();
			if (t === 'compare' || t === 'timeline' || t === 'diagram' || t === 'report' || t === 'slides') {
				type = t;
				content = source.substring(nl + 1).trim();
			}
		}
	}
	const w = el.createDiv({ cls: 'he-wrapper ' + theme });
	switch (type) {
		case 'compare': buildCompare(w, content, theme); break;
		case 'timeline': buildTimeline(w, content); break;
		case 'diagram': buildDiagram(w, content); break;
		case 'report': buildReport(w, content, theme); break;
		case 'slides': buildSlides(w, content); break;
	}
}

async function exportNoteAsHTML(app: App): Promise<void> {
	const file = app.workspace.getActiveFile();
	if (!file) { new Notice('No active note'); return; }
	const content = await app.vault.read(file);
	const path = (file.parent ? file.parent.path + '/' : '') + file.basename + '.html';
	await app.vault.create(path, content);
	new Notice('Exported: ' + path);
}

class HEHTMLView extends ItemView {
	file: TFile | null = null;
	private iframe: HTMLIFrameElement | null = null;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType(): string {
		return VIEW_TYPE;
	}

	getDisplayText(): string {
		return this.file ? this.file.basename : 'HTML Preview';
	}

	getIcon(): string {
		return 'eye';
	}

	async setFile(file: TFile): Promise<void> {
		this.file = file;
		await this.loadContent();
	}

	private async loadContent(): Promise<void> {
		if (!this.file) return;
		const content = await this.app.vault.read(this.file);
		const container = this.contentEl;
		container.empty();
		container.addClass('he-htmlview-container');
		this.iframe = document.createElement('iframe');
		this.iframe.setAttribute('sandbox', 'allow-same-origin');
		this.iframe.setAttribute('srcdoc', content);
		this.iframe.className = 'he-htmlview-iframe';
		container.appendChild(this.iframe);
	}

	async onOpen(): Promise<void> {
		const state = this.leaf.getViewState();
		if (state?.state?.file) {
			const file = this.app.vault.getFileByPath(state.state.file);
			if (file) await this.setFile(file);
		}
	}

	async onClose(): Promise<void> {
		this.iframe = null;
		this.file = null;
	}
}

export default class HEExtPlugin extends Plugin {
	settings: HESettings = DEFAULT_SETTINGS;
	private views: HEHTMLView[] = [];

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerView(VIEW_TYPE, (leaf) => {
			const view = new HEHTMLView(leaf);
			this.views.push(view);
			return view;
		});
		this.registerExtensions(['html'], VIEW_TYPE);

		this.registerEvent(this.app.workspace.on('layout-change', () => {
			this.views = this.views.filter(v => !v.leaf.isDead());
		}));

		this.registerEvent(this.app.workspace.on('file-open', (file) => {
			if (file && file instanceof TFile && file.extension === 'html') {
				const leaf = this.app.workspace.getLeaf(false);
				if (leaf && leaf.view instanceof HEHTMLView) {
					void (leaf.view as HEHTMLView).setFile(file);
				}
			}
		}));

		this.registerEvent(this.app.vault.on('modify', (file) => {
			if (file instanceof TFile && file.extension === 'html') {
				for (const view of this.views) {
					if (view.file?.path === file.path) {
						void view.setFile(file);
					}
				}
			}
		}));

		this.registerMarkdownCodeBlockProcessor('html-effect', (src, el, ctx) => {
			processor(src, el, ctx, this.settings.defaultTheme);
		});

		this.addCommand({ id: 'export-note', name: 'Export note as HTML', callback: () => exportNoteAsHTML(this.app) });
		this.addCommand({ id: 'compare', name: 'Compare', editorCallback: (e) => e.replaceSelection('```html-effect\ncompare\n\nLeft\n---\nRight\n```') });
		this.addCommand({ id: 'timeline', name: 'Timeline', editorCallback: (e) => e.replaceSelection('```html-effect\ntimeline\n\n- [2026-01] Event\n- [2026-06] Another\n```') });
		this.addCommand({ id: 'report', name: 'Report', editorCallback: (e) => e.replaceSelection('```html-effect\n---\ntype: report\n---\n## \n- 85%: Rate\n\n# Title\nContent\n```') });
		this.addCommand({ id: 'slides', name: 'Slides', editorCallback: (e) => e.replaceSelection('```html-effect\nslides\n\n# One\nContent\n---\n# Two\nContent\n```') });
		this.addCommand({ id: 'diagram', name: 'Diagram', editorCallback: (e) => e.replaceSelection('```html-effect\ndiagram\n\n\xe2\x94\x8c\xe2\x94\x80\xe2\x94\x80\xe2\x94\x80\xe2\x94\x90\n\xe2\x94\x82App\xe2\x94\x82\n\xe2\x94\x94\xe2\x94\xac\xe2\x94\x80\xe2\x94\x98\n  \xe2\x96\xbc\n\xe2\x94\x8c\xe2\x94\x80\xe2\x94\x80\xe2\x94\x90\n\xe2\x94\x82DB\xe2\x94\x82\n\xe2\x94\x94\xe2\x94\x80\xe2\x94\x80\xe2\x94\x98\n```') });
		this.addSettingTab(new HESettingTab(this.app, this));
	}

	async loadSettings(): Promise<void> {
		const data = await this.loadData();
		if (data && typeof data === 'object') {
			const o = data as Record<string, unknown>;
			if (o.defaultTheme === 'light') this.settings.defaultTheme = 'light';
		}
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}

class HESettingTab extends PluginSettingTab {
	plugin: HEExtPlugin;
	constructor(app: App, plugin: HEExtPlugin) { super(app, plugin); this.plugin = plugin; }
	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		new Setting(containerEl).setName('Display').setHeading();
		new Setting(containerEl).setName('Default theme').setDesc('Theme for rendered blocks')
			.addDropdown(d => d.addOption('dark', 'Dark').addOption('light', 'Light')
				.setValue(this.plugin.settings.defaultTheme)
				.onChange(async (v) => {
					this.plugin.settings.defaultTheme = v as 'dark' | 'light';
					await this.plugin.saveSettings();
				}));
	}
}
