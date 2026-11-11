import test from 'node:test';
import assert from 'node:assert/strict';
import { validUrl, readAppId, validateFeed, selectAd, loadFeed, embedCode } from '../src/assets/data.js';

const ad = id => ({ id, name: '作品', description: '紹介文', url: 'https://example.com/', image: 'assets/images/app.png' });
const feed = () => ({ schemaVersion: 1, registeredAppIds: ['app-a', 'app-b', 'app-c', 'stopped-app'], ads: ['app-a', 'app-b', 'app-c'].map(ad) });

test('公開用HTTPS URLだけを受け付ける', () => {
  assert.ok(validUrl('https://example.com/app?q=test#hello'));
  for (const url of ['http://example.com', 'javascript:alert(1)', 'https://user:pass@example.com', 'https://localhost', 'https://app.localhost',
    'https://127.0.0.1', 'https://2130706433', 'https://[::1]', 'https://app.local', 'https://example.com\n', 'invalid', null]) {
    assert.equal(validUrl(url), false, String(url));
  }
});

test('設置元IDは1個だけ指定できる', () => {
  assert.equal(readAppId('?app=app-a'), 'app-a');
  for (const search of ['', '?app=', '?app=A', '?app=app-a&app=app-b', '?app=../test', '?app=a', `?app=${'a'.repeat(65)}`]) {
    assert.equal(readAppId(search), null, search);
  }
});

test('配信データの型・ID・URL・画像を表示前に検証する', () => {
  assert.deepEqual(validateFeed(feed()), feed());
  for (const modify of [
    data => { data.schemaVersion = 2; },
    data => { data.registeredAppIds.push('app-a'); },
    data => { data.ads.push(ad('unknown-app')); },
    data => { data.ads.push(ad('app-a')); },
    data => { data.ads[0].url = 'javascript:alert(1)'; },
    data => { data.ads[0].image = 'https://example.com/a.png'; },
    data => { data.ads[0].image = 'assets/images/../other.png'; },
    data => { data.ads[0].description = ''; },
    data => { data.ads[0] = null; },
  ]) {
    const data = feed();
    modify(data);
    assert.throws(() => validateFeed(data));
  }
});

test('自分を除外し、固定乱数の境界で各候補を選べる', () => {
  const data = feed();
  assert.equal(selectAd(data, 'app-a', () => 0).id, 'app-b');
  assert.equal(selectAd(data, 'app-a', () => .499999).id, 'app-b');
  assert.equal(selectAd(data, 'app-a', () => .5).id, 'app-c');
  assert.equal(selectAd(data, 'app-a', () => .999999).id, 'app-c');
  assert.equal(selectAd(data, 'stopped-app', () => 0).id, 'app-a');
  assert.equal(selectAd({ ads: [ad('app-a')] }, 'app-a'), null);
  assert.equal(selectAd({ ads: [ad('app-b')] }, 'app-a').id, 'app-b');
  for (const number of [-1, 1, NaN]) assert.throws(() => selectAd(data, 'app-a', () => number));
});

test('データ取得はサイト配下・キャッシュ再利用なし・タイムアウト付き', async () => {
  const result = await loadFeed(new URL('https://example.com/siw-ad/'), { fetcher: async (url, options) => {
    assert.equal(url.href, 'https://example.com/siw-ad/ads.json');
    assert.equal(options.cache, 'no-store');
    assert.equal(options.referrerPolicy, 'no-referrer');
    assert.ok(options.signal instanceof AbortSignal);
    return { ok: true, json: async () => feed() };
  } });
  assert.deepEqual(result, feed());
  await assert.rejects(() => loadFeed(new URL('https://example.com/'), { fetcher: async () => ({ ok: false, status: 404 }) }), /404/);
  await assert.rejects(() => loadFeed(new URL('https://example.com/'), { fetcher: async () => ({ ok: true, json: async () => ({}) }) }));
  await assert.rejects(() => loadFeed(new URL('https://example.com/'), { fetcher: async () => { throw new DOMException('Timeout', 'TimeoutError'); } }));
});

test('生成コードはプロジェクトパスを維持し、不正IDを拒否する', () => {
  assert.match(embedCode('https://example.com/siw-ad/', 'app-a'), /src="https:\/\/example.com\/siw-ad\/embed\/\?app=app-a"/);
  assert.match(embedCode('https://example.com/siw-ad/', 'app-a'), /position:fixed/);
  assert.match(embedCode('https://example.com/siw-ad/', 'app-a'), /safe-area-inset-bottom/);
  assert.match(embedCode('https://example.com/siw-ad/', 'app-a'), /height="72"/);
  assert.doesNotMatch(embedCode('https://example.com/siw-ad/', 'app-a', { fixed: false }), /position:fixed/);
  assert.throws(() => embedCode('https://example.com/', '"><script>'));
});
