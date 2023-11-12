
export class PixelCoordinate {
	public x: number;

	public y: number;

	public constructor(...args: number[]) {
		if (Array.isArray(args)) {
			if (args.length === 2) {
				[this.x, this.y] = args;
			} else {
				throw Error();
			}
		} else {
			throw Error();
		}
	}

	public isZero(): boolean {
		return (this.x === 0) && (this.y === 0);
	}
}

export class Polyline {
	public ring: PixelCoordinate[];

	public constructor(ring: PixelCoordinate[]) {
		this.ring = ring;
	}
}

export class Polygon {
	public rings: PixelCoordinate[][];

	public constructor(rings: PixelCoordinate[][]) {
		this.rings = rings;
	}
}
