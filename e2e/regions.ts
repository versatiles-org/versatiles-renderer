export interface Region {
	name: string;
	lon: number;
	lat: number;
	zoom: number;
}

export const regions: Region[] = [
	{ name: 'berlin', lon: 13.408, lat: 52.519, zoom: 10 },
	{ name: 'paris', lon: 2.349, lat: 48.865, zoom: 10 },
	{ name: 'warsaw', lon: 21.012, lat: 52.230, zoom: 10 },
	{ name: 'germany', lon: 10.452, lat: 51.166, zoom: 5 },
	{ name: 'france', lon: 2.214, lat: 46.228, zoom: 5 },
	{ name: 'poland', lon: 19.145, lat: 51.919, zoom: 5 },
	{ name: 'japan', lon: 138.253, lat: 36.205, zoom: 4 },
	{ name: 'eu', lon: 9.0, lat: 50.0, zoom: 3 },
	{ name: 'south-america', lon: -58.0, lat: -15.0, zoom: 3 },
	{ name: 'australia', lon: 133.775, lat: -25.274, zoom: 3 },
];
