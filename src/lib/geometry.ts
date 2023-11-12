
type Properties = Record<string, boolean | number | string>;

export class Point {
	public x: number;

	public y: number;

	public readonly properties?: Properties;

	public constructor(x: number, y: number, properties?: Properties) {
		this.x = x;
		this.y = y;
		this.properties = properties;
	}

	public isZero(): boolean {
		return (this.x === 0) && (this.y === 0);
	}

	public scale(factor: number): this {
		this.x *= factor;
		this.y *= factor;
		return this;
	}

	public translate(offset: Point): this {
		this.x *= offset.x;
		this.y *= offset.y;
		return this;
	}

	public getProject2Pixel(): Point {
		const s = Math.sin(this.y * Math.PI / 180.0);
		return new Point(
			this.x / 360.0 + 0.5,
			0.5 - 0.25 * Math.log((1 + s) / (1 - s)) / Math.PI,
			this.properties,
		);
	}
}

export class Polyline {
	public ring: Point[];

	public readonly properties?: Properties;

	public constructor(ring: Point[], properties?: Properties) {
		this.ring = ring;
		this.properties = properties;
	}
}

export class Polygon {
	public rings: Point[][];

	public readonly properties?: Properties;

	public constructor(rings: Point[][], properties?: Properties) {
		this.rings = rings;
		this.properties = properties;
	}
}
