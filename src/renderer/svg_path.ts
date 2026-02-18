export type Segment = [number, number][];

export function chainSegments(segments: Segment[]): Segment[] {
	// Phase 1: normalize segments left-to-right, then chain
	normalizeSegments(segments, 0);
	let chains = greedyChain(segments);

	// Phase 2: normalize remaining chains top-to-bottom, then chain again
	normalizeSegments(chains, 1);
	chains = greedyChain(chains);

	return chains;
}

function normalizeSegments(segments: Segment[], coordIndex: number): void {
	for (const seg of segments) {
		const first = seg[0];
		const last = seg[seg.length - 1];
		if (first && last && last[coordIndex]! < first[coordIndex]!) seg.reverse();
	}
}

function greedyChain(segments: Segment[]): Segment[] {
	const byStart = new Map<string, Segment[]>();
	for (const seg of segments) {
		const start = seg[0];
		if (!start) continue;
		const key = String(start[0]) + ',' + String(start[1]);
		let list = byStart.get(key);
		if (!list) {
			list = [];
			byStart.set(key, list);
		}
		list.push(seg);
	}

	const visited = new Set<Segment>();
	const chains: Segment[] = [];
	for (const seg of segments) {
		if (visited.has(seg)) continue;
		visited.add(seg);
		const chain: Segment = [...seg];
		let endPoint = chain[chain.length - 1];
		let candidates = endPoint ? byStart.get(String(endPoint[0]) + ',' + String(endPoint[1])) : undefined;
		while (candidates) {
			let next: Segment | undefined;
			for (const c of candidates) {
				if (!visited.has(c)) {
					next = c;
					break;
				}
			}
			if (!next) break;
			visited.add(next);
			for (let i = 1; i < next.length; i++) chain.push(next[i]!);
			endPoint = chain[chain.length - 1];
			candidates = endPoint ? byStart.get(String(endPoint[0]) + ',' + String(endPoint[1])) : undefined;
		}
		chains.push(chain);
	}

	return chains;
}

export function segmentsToPath(chains: Segment[], close = false): string {
	let d = '';
	for (const chain of chains) {
		const first = chain[0];
		if (!first) continue;
		d += 'M' + formatNum(first[0]) + ',' + formatNum(first[1]);
		let px = first[0];
		let py = first[1];
		for (let i = 1; i < chain.length; i++) {
			const x = chain[i]![0];
			const y = chain[i]![1];
			const dx = x - px;
			const dy = y - py;
			if (dy === 0) {
				const rel = 'h' + formatNum(dx);
				const abs = 'H' + formatNum(x);
				d += rel.length <= abs.length ? rel : abs;
			} else if (dx === 0) {
				const rel = 'v' + formatNum(dy);
				const abs = 'V' + formatNum(y);
				d += rel.length <= abs.length ? rel : abs;
			} else {
				const rel = 'l' + formatNum(dx) + ',' + formatNum(dy);
				const abs = 'L' + formatNum(x) + ',' + formatNum(y);
				d += rel.length <= abs.length ? rel : abs;
			}
			px = x;
			py = y;
		}
		if (close) d += 'z';
	}
	return d;
}

export function formatNum(tenths: number): string {
	if (tenths % 10 === 0) return String(tenths / 10);
	const negative = tenths < 0;
	if (negative) tenths = -tenths;
	const whole = Math.floor(tenths / 10);
	const frac = tenths % 10;
	return (negative ? '-' : '') + String(whole) + '.' + String(frac);
}
