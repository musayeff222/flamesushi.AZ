import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultCatalogState } from '../src/catalogDefaults.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
await mkdir(join(root, 'data'), { recursive: true });
await writeFile(join(root, 'catalog.seed.json'), JSON.stringify(defaultCatalogState, null, 2));
console.log('Wrote catalog.seed.json');
