import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export type GameClass = {
	ClassName: string;
	[key: string]: unknown;
};

export type NativeClassEntry = {
	NativeClass: string;
	Classes: GameClass[];
};

export type DocsData = NativeClassEntry[];

let _cache: DocsData | undefined;

export async function getDocs(): Promise<DocsData> {
	if (_cache) return _cache;

	const docsPath = fileURLToPath(
		new URL('../data/Docs/en-US.json', import.meta.url),
	);

	const raw = await readFile(docsPath, { encoding: 'utf-16le' });
	_cache = JSON.parse(Buffer.from(raw).toString('utf-8').trim()) as DocsData;
	return _cache;
}

export function findClasses(data: DocsData, nativeClassFragment: string): GameClass[] {
	return data
		.filter((entry) => entry.NativeClass.includes(nativeClassFragment))
		.flatMap((entry) => entry.Classes);
}
