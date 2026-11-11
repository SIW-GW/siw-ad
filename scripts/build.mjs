import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCatalog, createFeed } from './catalog.mjs';
import { validateFeed } from '../src/assets/data.js';

export async function build({ root, catalogRoot = root, output = path.join(root, 'dist'), demo = false }) {
  const records = await readCatalog(catalogRoot);
  const feed = validateFeed(createFeed(records));
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await cp(path.join(root, 'src'), output, { recursive: true });
  for (const ad of records.filter(ad => ad.enabled)) {
    const destination = path.join(output, 'assets', ad.image);
    await mkdir(path.dirname(destination), { recursive: true });
    await cp(path.join(catalogRoot, ad.image), destination);
  }
  await writeFile(path.join(output, 'ads.json'), `${JSON.stringify(feed, null, 2)}\n`);
  await writeFile(path.join(output, 'site.json'), `${JSON.stringify({ demo })}\n`);
  await writeFile(path.join(output, '.nojekyll'), '');
  for (const file of ['index.html', 'embed/index.html', 'assets/home.js', 'assets/embed.js', 'assets/style.css', 'ads.json']) {
    await readFile(path.join(output, file));
  }
  return feed;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const demo = process.argv.includes('--demo');
  try {
    const feed = await build({ root, demo, catalogRoot: demo ? path.join(root, 'examples') : root,
      output: path.join(root, demo ? '.preview/demo' : 'dist') });
    console.log(`${demo ? 'デモ' : '本番'}ビルドOK: ${feed.ads.length}件`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
