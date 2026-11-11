import test from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCatalog, createFeed } from '../scripts/catalog.mjs';
import { build } from '../scripts/build.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const original = JSON.parse(await readFile(new URL('../examples/ads/sample-campus.json', import.meta.url)));

async function fixture(t) {
  const directory = await mkdtemp(path.join(tmpdir(), 'siw-ad-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await mkdir(path.join(directory, 'ads'));
  await mkdir(path.join(directory, 'images'));
  await cp(path.join(root, 'examples/images/campus.png'), path.join(directory, 'images/campus.png'));
  await writeFile(path.join(directory, 'ads/sample-campus.json'), JSON.stringify(original));
  return directory;
}

test('停止中のIDは残し、広告データからは除外する', async t => {
  const directory = await fixture(t);
  const stopped = { ...original, id: 'stopped-app', enabled: false };
  await writeFile(path.join(directory, 'ads/stopped-app.json'), JSON.stringify(stopped));
  const feed = createFeed(await readCatalog(directory));
  assert.deepEqual(feed.registeredAppIds, ['sample-campus', 'stopped-app']);
  assert.equal(feed.ads.length, 1);
  assert.equal(feed.ads[0].image, 'assets/images/campus.png');
  assert.equal(Object.hasOwn(feed.ads[0], 'enabled'), false);
});

test('不正な登録データはファイル名と理由付きで失敗する', async t => {
  const cases = [
    ['必須', ad => { delete ad.name; }],
    ['未定義', ad => { ad.extra = true; }],
    ['name', ad => { ad.name = 'a'.repeat(61); }],
    ['description', ad => { ad.description = ' '; }],
    ['url', ad => { ad.url = 'http://example.com/'; }],
    ['enabled', ad => { ad.enabled = 'false'; }],
    ['image', ad => { ad.image = '../outside.png'; }],
    ['image', ad => { ad.image = 'images/a.svg'; }],
    ['ENOENT', ad => { ad.image = 'images/missing.png'; }],
    ['id', ad => { ad.id = 'other-id'; }],
  ];
  for (const [reason, modify] of cases) {
    await t.test(reason, async t => {
      const directory = await fixture(t);
      const ad = { ...original };
      modify(ad);
      await writeFile(path.join(directory, 'ads/sample-campus.json'), JSON.stringify(ad));
      await assert.rejects(() => readCatalog(directory), error => error.message.includes('ads/sample-campus.json') && error.message.includes(reason));
    });
  }
});

test('ID重複・JSON構文不正・シンボリックリンクを拒否する', async t => {
  const directory = await fixture(t);
  await writeFile(path.join(directory, 'ads/zz-copy.json'), JSON.stringify(original));
  await assert.rejects(() => readCatalog(directory), /重複/);
  await rm(path.join(directory, 'ads/zz-copy.json'));
  await writeFile(path.join(directory, 'ads/broken.json'), '{');
  await assert.rejects(() => readCatalog(directory), /ads\/broken.json/);
  await rm(path.join(directory, 'ads/broken.json'));
  await symlink(path.join(root, 'examples/images/campus.png'), path.join(directory, 'images/link.png'));
  await writeFile(path.join(directory, 'ads/sample-campus.json'), JSON.stringify({ ...original, image: 'images/link.png' }));
  await assert.rejects(() => readCatalog(directory), /シンボリックリンク/);
});

test('画像の形式不一致・サイズ超過は停止中でも拒否する', async t => {
  const directory = await fixture(t);
  await writeFile(path.join(directory, 'ads/sample-campus.json'), JSON.stringify({ ...original, enabled: false }));
  await writeFile(path.join(directory, 'images/campus.png'), 'not a PNG');
  await assert.rejects(() => readCatalog(directory), /ファイル形式/);
  await writeFile(path.join(directory, 'images/campus.png'), Buffer.alloc(500 * 1024 + 1));
  await assert.rejects(() => readCatalog(directory), /500 KiB/);
});

test('ビルドは決定的で、停止後のJSONと画像を成果物から除去する', async t => {
  const directory = await fixture(t);
  const output = path.join(directory, 'output');
  await build({ root, catalogRoot: directory, output });
  const first = await readFile(path.join(output, 'ads.json'), 'utf8');
  await build({ root, catalogRoot: directory, output });
  assert.equal(await readFile(path.join(output, 'ads.json'), 'utf8'), first);
  await writeFile(path.join(directory, 'ads/sample-campus.json'), JSON.stringify({ ...original, enabled: false }));
  const feed = await build({ root, catalogRoot: directory, output });
  assert.equal(feed.ads.length, 0);
  assert.deepEqual(feed.registeredAppIds, [original.id]);
  await assert.rejects(() => readFile(path.join(output, 'assets/images/campus.png')), /ENOENT/);
  assert.equal(JSON.parse(await readFile(path.join(output, 'site.json'))).demo, false);
});

test('空の登録データもビルド可能で、サンプルや設計文書は配信しない', async t => {
  const directory = await fixture(t);
  await rm(path.join(directory, 'ads/sample-campus.json'));
  const output = path.join(directory, 'output');
  const feed = await build({ root, catalogRoot: directory, output });
  assert.deepEqual(feed, { schemaVersion: 1, registeredAppIds: [], ads: [] });
  assert.deepEqual((await readdir(output)).sort(), ['.nojekyll', 'ads.json', 'assets', 'embed', 'index.html', 'site.json']);
});
