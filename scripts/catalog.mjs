import { readdir, readFile, lstat } from 'node:fs/promises';
import path from 'node:path';
import { validId, validText, validUrl, validImagePath } from '../src/assets/data.js';

const fields = ['id', 'name', 'description', 'url', 'image', 'enabled'];

async function regularFile(root, relative) {
  let current = root;
  for (const segment of relative.split('/')) {
    current = path.join(current, segment);
    const stat = await lstat(current);
    if (stat.isSymbolicLink()) throw new Error(`${relative}: シンボリックリンクは使用できません。`);
  }
  if (!(await lstat(current)).isFile()) throw new Error(`${relative}: 通常のファイルが必要です。`);
  return current;
}

export function checkImage(bytes, filename) {
  if (bytes.length > 500 * 1024) throw new Error(`${filename}: 画像は500 KiB以下にしてください。`);
  const ext = path.extname(filename);
  const png = bytes.length >= 33 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
    bytes.toString('ascii', 12, 16) === 'IHDR' && bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0;
  const jpeg = bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff &&
    bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9;
  const webp = bytes.length >= 20 && bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP' && bytes.readUInt32LE(4) + 8 === bytes.length &&
    ['VP8 ', 'VP8L', 'VP8X'].includes(bytes.toString('ascii', 12, 16));
  if (!(ext === '.png' && png || ['.jpg', '.jpeg'].includes(ext) && jpeg || ext === '.webp' && webp)) {
    throw new Error(`${filename}: 画像の拡張子とファイル形式が一致しません。`);
  }
}

export async function readCatalog(root) {
  if ((await lstat(path.join(root, 'ads'))).isSymbolicLink()) throw new Error('ads: シンボリックリンクは使用できません。');
  const entries = (await readdir(path.join(root, 'ads'))).filter(name => !name.startsWith('.')).sort();
  const records = [];
  const errors = [];
  const ids = new Set();
  for (const name of entries) {
    try {
      if (!name.endsWith('.json')) throw new Error('広告データは.jsonで保存してください。');
      const filename = await regularFile(root, `ads/${name}`);
      const ad = JSON.parse(await readFile(filename, 'utf8'));
      if (!ad || Array.isArray(ad) || typeof ad !== 'object') throw new Error('JSONオブジェクトが必要です。');
      for (const field of fields) if (!Object.hasOwn(ad, field)) throw new Error(`${field}: 必須項目です。`);
      for (const field of Object.keys(ad)) if (!fields.includes(field)) throw new Error(`${field}: 未定義の項目です。`);
      if (!validId(ad.id)) throw new Error('id: 小文字英数字と単語間のハイフンで2〜64文字にしてください。');
      if (ids.has(ad.id)) throw new Error('id: 重複しています。');
      ids.add(ad.id);
      if (`${ad.id}.json` !== name) throw new Error('id: ファイル名と一致させてください。');
      if (!validText(ad.name, 60)) throw new Error('name: 前後の空白を除き、1〜60文字にしてください。');
      if (!validText(ad.description, 140)) throw new Error('description: 前後の空白を除き、1〜140文字にしてください。');
      if (!validUrl(ad.url)) throw new Error('url: 公開用の絶対HTTPS URLにしてください。認証情報・ローカルホスト・IPアドレスは使用できません。');
      if (typeof ad.enabled !== 'boolean') throw new Error('enabled: trueまたはfalseが必要です。');
      if (!validImagePath(ad.image, 'images/')) throw new Error('image: images/配下のPNG・JPEG・WebPを指定してください。');
      const imageFile = await regularFile(root, ad.image);
      checkImage(await readFile(imageFile), ad.image);
      records.push(ad);
    } catch (error) {
      errors.push(`ads/${name}: ${error.message}`);
    }
  }
  if (errors.length) throw new Error(errors.join('\n'));
  return records.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

export function createFeed(records) {
  return {
    schemaVersion: 1,
    registeredAppIds: records.map(ad => ad.id),
    ads: records.filter(ad => ad.enabled).map(({ enabled, image, ...ad }) => ({ ...ad, image: `assets/${image}` })),
  };
}
