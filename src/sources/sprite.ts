import type { StyleSpecification } from '@maplibre/maplibre-gl-style-spec';

export interface SpriteEntry {
	width: number;
	height: number;
	x: number;
	y: number;
	pixelRatio: number;
	sheetDataUri: string;
	sheetWidth: number;
	sheetHeight: number;
}

export type SpriteAtlas = Map<string, SpriteEntry>;

interface SpriteJsonEntry {
	width: number;
	height: number;
	x: number;
	y: number;
	pixelRatio?: number;
}

export async function loadSpriteAtlas(style: StyleSpecification): Promise<SpriteAtlas> {
	const atlas: SpriteAtlas = new Map();
	const sprite = style.sprite;
	if (!sprite) return atlas;

	const sources: { id: string; url: string }[] = [];
	if (typeof sprite === 'string') {
		sources.push({ id: 'default', url: sprite });
	} else if (Array.isArray(sprite)) {
		for (const s of sprite) {
			sources.push({
				id: (s as { id: string; url: string }).id,
				url: (s as { id: string; url: string }).url,
			});
		}
	}

	await Promise.all(
		sources.map(async ({ id, url }) => {
			try {
				const [jsonResponse, imageResponse] = await Promise.all([
					fetch(`${url}.json`),
					fetch(`${url}.png`),
				]);
				if (!jsonResponse.ok || !imageResponse.ok) return;

				const json = (await jsonResponse.json()) as Record<string, SpriteJsonEntry>;
				const imageBuffer = await imageResponse.arrayBuffer();
				const base64 =
					typeof Buffer !== 'undefined'
						? Buffer.from(imageBuffer).toString('base64')
						: btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
				const sheetDataUri = `data:image/png;base64,${base64}`;

				// Estimate sheet dimensions from sprite entries
				let sheetWidth = 0;
				let sheetHeight = 0;
				for (const entry of Object.values(json)) {
					sheetWidth = Math.max(sheetWidth, entry.x + entry.width);
					sheetHeight = Math.max(sheetHeight, entry.y + entry.height);
				}

				const prefix = id === 'default' ? '' : `${id}:`;
				for (const [name, entry] of Object.entries(json)) {
					atlas.set(`${prefix}${name}`, {
						width: entry.width,
						height: entry.height,
						x: entry.x,
						y: entry.y,
						pixelRatio: entry.pixelRatio ?? 1,
						sheetDataUri,
						sheetWidth,
						sheetHeight,
					});
				}
			} catch {
				// Silently skip failed sprite loads
			}
		}),
	);

	return atlas;
}
