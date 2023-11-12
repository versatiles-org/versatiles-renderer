

export class Color {
	readonly #values: [number, number, number, number];

	public constructor(...args: [number, number, number, number] | [number, number, number] | [string]) {
		switch (args.length) {
			case 4:
				this.#values = [Number(args[0]), Number(args[1]), Number(args[2]), Number(args[3])];
				break;
			case 3:
				this.#values = [Number(args[0]), Number(args[1]), Number(args[2]), 255];
				break;
			default:
				throw Error();
		}
	}

	public static get transparent(): Color {
		return new Color(0, 0, 0, 0);
	}

	public get hex(): string {
		return `#${hd(this.#values[0])}${hd(this.#values[1])}${hd(this.#values[2])}${(this.#values[3] === 255) ? '' : hd(this.#values[3])}`;

		function hd(num: number): string {
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
