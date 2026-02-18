import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const CACHE_DIR = resolve(import.meta.dirname, '.cache');

interface CachedResponse {
	status: number;
	contentType: string;
	body: string; // base64
}

const originalFetch = globalThis.fetch;

function cachedFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
	const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
	const hash = createHash('sha256').update(url).digest('hex').slice(0, 16);
	const cachePath = resolve(CACHE_DIR, hash + '.json');

	if (existsSync(cachePath)) {
		const cached = JSON.parse(readFileSync(cachePath, 'utf-8')) as CachedResponse;
		const body = Buffer.from(cached.body, 'base64');
		return Promise.resolve(
			new Response(body, {
				status: cached.status,
				headers: { 'content-type': cached.contentType },
			}),
		);
	}

	return originalFetch(input, init).then(async (response) => {
		const buffer = await response.arrayBuffer();
		const contentType = response.headers.get('content-type') ?? 'application/octet-stream';
		const cached: CachedResponse = {
			status: response.status,
			contentType,
			body: Buffer.from(buffer).toString('base64'),
		};
		writeFileSync(cachePath, JSON.stringify(cached));
		return new Response(buffer, {
			status: cached.status,
			headers: { 'content-type': contentType },
		});
	});
}

export function installFetchCache(): void {
	mkdirSync(CACHE_DIR, { recursive: true });
	globalThis.fetch = cachedFetch as typeof fetch;
}

export function uninstallFetchCache(): void {
	globalThis.fetch = originalFetch;
}
