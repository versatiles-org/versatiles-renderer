export interface Region {
	name: string;
	lon: number;
	lat: number;
	zoom: number;
}

export const regions: Region[] = [
	{ name: 'berlin', lon: 13.357, lat: 52.515, zoom: 14.2 },
	{ name: 'paris', lon: 2.295, lat: 48.858, zoom: 14.9 },
	{ name: 'warsaw', lon: 21.013, lat: 52.249, zoom: 14.9 },
	{ name: 'tokyo', lon: 139.692, lat: 35.69, zoom: 10 },
	{ name: 'roma', lon: 12.489, lat: 41.89, zoom: 15 },
	{ name: 'sao-paulo', lon: -46.635, lat: -23.548, zoom: 14 },
];
