import type { Feature as MapLibreFeature, Point2D as MapLibrePoint2D } from '@maplibre/maplibre-gl-style-spec';

// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
interface Properties {
	[_: string]: unknown;
}


// eslint-disable-next-line @typescript-eslint/consistent-indexed-object-style
interface Patterns {
	[_: string]: {
		'min': string;
		'mid': string;
		'max': string;
	};
}

type Geometry = Point2D[][];
type Bbox = [number, number, number, number];

export class Point2D implements MapLibrePoint2D {
	public x: number;

	public y: number;

	public constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}

	public isZero(): boolean {
		return (this.x === 0) && (this.y === 0);
	}

	public scale(factor: number): this {
		this.x *= factor;
		this.y *= factor;
		return this;
	}

	public translate(offset: Point2D): this {
		this.x += offset.x;
		this.y += offset.y;
		return this;
	}

	public getProject2Pixel(): Point2D {
		const s = Math.sin(this.y * Math.PI / 180.0);
		return new Point2D(
			this.x / 360.0 + 0.5,
			0.5 - 0.25 * Math.log((1 + s) / (1 - s)) / Math.PI,
		);
	}
}

export class Feature implements MapLibreFeature {
	public readonly type: 'LineString' | 'Point' | 'Polygon';

	public readonly id: unknown;

	public readonly properties: Properties;

	public readonly patterns?: Patterns;

	public readonly geometry: Geometry;

	public constructor(opt: {
		type: 'LineString' | 'Point' | 'Polygon';
		id?: unknown;
		properties: Properties;
		patterns?: Patterns;
		geometry: Geometry;
	}) {
		this.type = opt.type;
		this.id = opt.id;
		this.properties = opt.properties;
		this.patterns = opt.patterns;
		this.geometry = opt.geometry;
	}

	public getBbox(): Bbox {
		let xMin = 1e10;
		let yMin = 1e10;
		let xMax = -1e10;
		let yMax = -1e10;
		this.geometry.forEach(ring => {
			ring.forEach(point => {
				if (xMin > point.x) xMin = point.x;
				if (yMin > point.y) yMin = point.y;
				if (xMax < point.x) xMax = point.x;
				if (yMax < point.y) yMax = point.y;
			});
		});
		return [xMin, yMin, xMax, yMax];
	}

	public doesOverlap(bbox: Bbox): boolean {
		const featureBbox = this.getBbox();
		if (featureBbox[0] > bbox[2]) return false;
		if (featureBbox[1] > bbox[3]) return false;
		if (featureBbox[2] < bbox[0]) return false;
		if (featureBbox[3] < bbox[1]) return false;
		return true;
	}
}
