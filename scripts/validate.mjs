import { fileURLToPath } from 'node:url';
import { readCatalog } from './catalog.mjs';

try {
  const records = await readCatalog(fileURLToPath(new URL('../', import.meta.url)));
  console.log(`広告データ検証OK: ${records.length}件（掲載中 ${records.filter(ad => ad.enabled).length}件）`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
