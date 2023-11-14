
import { Color as MaplibreColor } from '@maplibre/maplibre-gl-style-spec';

export class Color {
	readonly #values: [number, number, number, number];

	public constructor(...args: [MaplibreColor] | [number, number, number, number] | [number, number, number] | [string]) {
		switch (args.length) {
			case 1:
				if (args[0] instanceof MaplibreColor) {
					const value: MaplibreColor = args[0];
					if (value.a <= 0) {
						this.#values = [0, 0, 0, 0];
						return;
					}

					this.#values = [
						Math.round(255 * value.r / value.a),
						Math.round(255 * value.g / value.a),
						Math.round(255 * value.b / value.a),
						Math.round(255 * value.a),
					];
					return;
				}
				if (typeof args[0] === 'string') {
					const value: string = args[0];
					if (value.startsWith('#')) {
						if (value.length === 7) {
							this.#values = [
								h2d(value.slice(1, 3)),
								h2d(value.slice(3, 5)),
								h2d(value.slice(5, 7)),
								255,
							];
							return;
						} else if (value.length === 9) {
							this.#values = [
								h2d(value.slice(1, 3)),
								h2d(value.slice(3, 5)),
								h2d(value.slice(5, 7)),
								h2d(value.slice(7, 9)),
							];
							return;
						}
					}
				}
				break;
			case 4:
				this.#values = [Number(args[0]), Number(args[1]), Number(args[2]), Number(args[3])];
				return;
			case 3:
				this.#values = [Number(args[0]), Number(args[1]), Number(args[2]), 255];
				return;
			default:
		}
		console.log(args);
		throw Error();

		function h2d(text: string): number {
			return parseInt(text, 16);
		}
	}

	public static get transparent(): Color {
		return new Color(0, 0, 0, 0);
	}

	public get hex(): string {
		return `#${d2h(this.#values[0])}${d2h(this.#values[1])}${d2h(this.#values[2])}${(this.#values[3] === 255) ? '' : d2h(this.#values[3])}`;

		function d2h(num: number): string {
			if (num < 0) num = 0;
			if (num > 255) num = 255;
			const str = Math.round(num).toString(16).toUpperCase();
			return (str.length < 2) ? '0' + str : str;
		}
	}

	public get alpha(): number {
		return this.#values[3];
	}

	public set alpha(v: number) {
		this.#values[3] = v;
	}
}
