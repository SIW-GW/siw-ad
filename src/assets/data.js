export const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function validId(value) {
  return typeof value === 'string' && value.length >= 2 && value.length <= 64 && ID_PATTERN.test(value);
}

export function validText(value, limit) {
  return typeof value === 'string' && value.trim() === value && value.length > 0 && [...value].length <= limit;
}

export function validUrl(value) {
  if (typeof value !== 'string' || value.trim() !== value || !value.startsWith('https://')) return false;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return url.protocol === 'https:' && !url.username && !url.password &&
      host.includes('.') && !host.endsWith('.') && !host.endsWith('.localhost') &&
      !host.endsWith('.local') && !host.endsWith('.internal') &&
      !/^\d+\.\d+\.\d+\.\d+$/.test(host) && !host.includes(':');
  } catch {
    return false;
  }
}

export function validImagePath(value, prefix) {
  return typeof value === 'string' && value.startsWith(prefix) &&
    value.split('/').every(part => /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(part) && part !== '..') &&
    /\.(png|jpe?g|webp)$/.test(value);
}

export function readAppId(search) {
  const values = new URLSearchParams(search).getAll('app');
  return values.length === 1 && validId(values[0]) ? values[0] : null;
}

export function validateFeed(feed) {
  if (!feed || feed.schemaVersion !== 1 || !Array.isArray(feed.registeredAppIds) || !Array.isArray(feed.ads)) {
    throw new Error('未対応または不正な広告データです。');
  }
  const ids = new Set(feed.registeredAppIds);
  if (ids.size !== feed.registeredAppIds.length || !feed.registeredAppIds.every(validId)) {
    throw new Error('登録IDが不正です。');
  }
  const seen = new Set();
  for (const ad of feed.ads) {
    if (!ad || !ids.has(ad.id) || seen.has(ad.id) || !validText(ad.name, 60) ||
      !validText(ad.description, 140) || !validUrl(ad.url) || !validImagePath(ad.image, 'assets/images/')) {
      throw new Error('広告レコードが不正です。');
    }
    seen.add(ad.id);
  }
  return feed;
}

export function selectAd(feed, appId, random = Math.random) {
  const candidates = feed.ads.filter(ad => ad.id !== appId);
  if (candidates.length === 0) return null;
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) throw new Error('乱数の範囲が不正です。');
  return candidates[Math.floor(value * candidates.length)];
}

export async function loadFeed(base, { fetcher = fetch, signal = AbortSignal.timeout(10_000) } = {}) {
  const response = await fetcher(new URL('ads.json', base), { cache: 'no-store', signal, referrerPolicy: 'no-referrer' });
  if (!response.ok) throw new Error(`広告データの取得に失敗しました (${response.status})。`);
  return validateFeed(await response.json());
}

export function embedCode(base, appId, { fixed = true } = {}) {
  if (!validId(appId)) throw new Error('アプリIDが不正です。');
  const url = new URL('embed/', base);
  url.searchParams.set('app', appId);
  const frame = `<iframe\n  src="${url.href}"\n  title="コミュニティのアプリ紹介"\n  width="320" height="72"\n  loading="lazy" referrerpolicy="no-referrer"\n  style="display:block;width:100%;max-width:720px;margin-inline:auto;border:0;"\n></iframe>`;
  if (!fixed) return frame;
  return `<!-- 本文がバナーに隠れないための余白。bodyの末尾に設置します -->\n<div aria-hidden="true" style="height:calc(72px + env(safe-area-inset-bottom, 0px));"></div>\n<aside aria-label="コミュニティのアプリ紹介"\n  style="position:fixed;inset-inline:0;bottom:0;z-index:20;background:#f6f5ef;padding-bottom:env(safe-area-inset-bottom, 0px);">\n${frame}\n</aside>`;
}
