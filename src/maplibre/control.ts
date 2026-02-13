import type { Map, IControl } from 'maplibre-gl';
import { PANEL_CSS } from './styles.js';
import { renderToSVG } from '../index.js';

export interface SVGExportControlOptions {
	defaultWidth?: number;
	defaultHeight?: number;
	defaultScale?: number;
}

function querySelector(parent: Element, selector: string): HTMLElement {
	const el = parent.querySelector(selector);
	if (!(el instanceof HTMLElement)) throw new Error(`Element not found: ${selector}`);
	return el;
}

export class SVGExportControl implements IControl {
	private map: Map | undefined;
	private container: HTMLDivElement | undefined;
	private styleEl: HTMLStyleElement | undefined;
	private panel: HTMLDivElement | undefined;
	private debounceTimer: ReturnType<typeof setTimeout> | undefined;
	private currentSVG: string | undefined;
	private renderGeneration = 0;
	private options: Required<SVGExportControlOptions>;

	constructor(options?: SVGExportControlOptions) {
		this.options = {
			defaultWidth: options?.defaultWidth ?? 1024,
			defaultHeight: options?.defaultHeight ?? 1024,
			defaultScale: options?.defaultScale ?? 1,
		};
	}

	onAdd(map: Map): HTMLElement {
		this.map = map;

		this.styleEl = document.createElement('style');
		this.styleEl.textContent = PANEL_CSS;
		document.head.appendChild(this.styleEl);

		this.container = document.createElement('div');
		this.container.className = 'maplibregl-ctrl maplibregl-ctrl-group svg-export-control';

		const button = document.createElement('button');
		button.type = 'button';
		button.className = 'svg-export-btn';
		button.title = 'Export SVG';
		button.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>`;
		button.addEventListener('click', () => {
			this.openPanel();
		});

		this.container.appendChild(button);
		return this.container;
	}

	onRemove(): void {
		this.closePanel();
		this.container?.remove();
		this.styleEl?.remove();
		this.map = undefined;
	}

	private openPanel(): void {
		if (this.panel || !this.map) return;

		const mapContainer = this.map.getContainer();
		this.panel = document.createElement('div');
		this.panel.className = 'svg-export-panel';

		this.panel.innerHTML = `
			<div class="panel-header">
				<h3>Export SVG</h3>
				<button class="panel-close" title="Close">\u00d7</button>
			</div>
			<div class="panel-inputs">
				<label>Width<input type="number" class="input-width" value="${String(this.options.defaultWidth)}" min="1" max="8192"></label>
				<label>Height<input type="number" class="input-height" value="${String(this.options.defaultHeight)}" min="1" max="8192"></label>
				<label>Scale<input type="number" class="input-scale" value="${String(this.options.defaultScale)}" min="0.1" max="10" step="0.1"></label>
			</div>
			<div class="preview-container">
				<span class="preview-loading">Rendering preview\u2026</span>
			</div>
			<div class="panel-actions">
				<button class="btn-export" disabled>Export SVG</button>
			</div>
		`;

		querySelector(this.panel, '.panel-close').addEventListener('click', () => {
			this.closePanel();
		});

		this.panel.querySelectorAll('input').forEach((input) => {
			input.addEventListener('input', () => {
				this.schedulePreview();
			});
		});

		querySelector(this.panel, '.btn-export').addEventListener('click', () => {
			this.exportSVG();
		});

		mapContainer.appendChild(this.panel);
		void this.updatePreview();
	}

	private closePanel(): void {
		if (this.debounceTimer) {
			clearTimeout(this.debounceTimer);
			this.debounceTimer = undefined;
		}
		this.renderGeneration++;
		this.panel?.remove();
		this.panel = undefined;
		this.currentSVG = undefined;
	}

	private schedulePreview(): void {
		if (this.debounceTimer) clearTimeout(this.debounceTimer);
		this.debounceTimer = setTimeout(() => {
			void this.updatePreview();
		}, 500);
	}

	private async updatePreview(): Promise<void> {
		if (!this.panel || !this.map) return;

		const generation = this.renderGeneration;
		const panel = this.panel;
		const map = this.map;

		const previewContainer = querySelector(panel, '.preview-container');
		const exportBtn = querySelector(panel, '.btn-export') as HTMLButtonElement;

		previewContainer.innerHTML = '<span class="preview-loading">Rendering preview\u2026</span>';
		exportBtn.disabled = true;

		const width = Number((querySelector(panel, '.input-width') as HTMLInputElement).value);
		const height = Number((querySelector(panel, '.input-height') as HTMLInputElement).value);
		const scale = Number((querySelector(panel, '.input-scale') as HTMLInputElement).value);

		if (!width || !height || !scale || width < 1 || height < 1 || scale < 0.1) {
			previewContainer.innerHTML = '<span class="preview-loading">Invalid input values</span>';
			return;
		}

		try {
			const center = map.getCenter();
			const zoom = map.getZoom();
			const style = map.getStyle();

			const svg = await renderToSVG({
				width,
				height,
				scale,
				style,
				lon: center.lng,
				lat: center.lat,
				zoom,
			});

			if (this.renderGeneration !== generation) return;

			this.currentSVG = svg;

			const iframe = document.createElement('iframe');
			iframe.srcdoc = `<!DOCTYPE html><html><head><style>*{margin:0;padding:0;overflow:hidden;}svg{width:100%;height:100%;}</style></head><body>${svg}</body></html>`;
			previewContainer.innerHTML = '';
			previewContainer.appendChild(iframe);
			exportBtn.disabled = false;
		} catch (error: unknown) {
			if (this.renderGeneration !== generation) return;
			const message = error instanceof Error ? error.message : 'Unknown error';
			previewContainer.innerHTML = `<span class="preview-loading">Error: ${message}</span>`;
		}
	}

	private exportSVG(): void {
		if (!this.currentSVG) return;

		const blob = new Blob([this.currentSVG], { type: 'image/svg+xml' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = 'map-export.svg';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}
}
