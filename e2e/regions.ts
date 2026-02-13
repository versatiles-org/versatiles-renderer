export interface Region {
	name: string;
	lon: number;
	lat: number;
	zoom: number;
	type: 'vector' | 'satellite';
}

export const regions: Region[] = [
	{ name: 'berlin', lon: 13.357, lat: 52.515, zoom: 14.2, type: 'vector' },
	{ name: 'paris', lon: 2.295, lat: 48.858, zoom: 14.9, type: 'vector' },
	{ name: 'warsaw', lon: 21.013, lat: 52.249, zoom: 14.9, type: 'vector' },
	{ name: 'tokyo', lon: 139.692, lat: 35.69, zoom: 10, type: 'vector' },
	{ name: 'roma', lon: 12.489, lat: 41.89, zoom: 14.9, type: 'vector' },
	{ name: 'sao-paulo', lon: -46.635, lat: -23.548, zoom: 14, type: 'vector' },

	{ name: 'berlin', lon: 13.376, lat: 52.518, zoom: 15, type: 'satellite' },
];
