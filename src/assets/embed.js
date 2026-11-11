import { loadFeed, readAppId, selectAd } from './data.js';

const base = new URL('../', import.meta.url);
const slot = document.querySelector('#slot');

function message(text) {
  const element = document.createElement('p');
  element.className = 'slot-message';
  element.setAttribute('role', 'status');
  element.textContent = text;
  slot.replaceChildren(element);
}

function render(ad) {
  const link = document.createElement('a');
  link.className = 'ad-card';
  link.href = ad.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.setAttribute('aria-label', `${ad.name}。${ad.description}（新しいタブで開く）`);

  const media = document.createElement('div');
  media.className = 'ad-media';
  const fallback = document.createElement('span');
  fallback.className = 'image-fallback';
  fallback.textContent = 'SIW / COMMUNITY';
  fallback.setAttribute('aria-hidden', 'true');
  const image = document.createElement('img');
  image.alt = '';
  image.addEventListener('error', () => image.remove(), { once: true });
  image.src = new URL(ad.image, base).href;
  media.append(fallback, image);

  const body = document.createElement('div');
  body.className = 'ad-body';
  const label = document.createElement('p');
  label.className = 'ad-label';
  label.textContent = 'コミュニティのアプリ紹介';
  const name = document.createElement('h1');
  name.textContent = ad.name;
  const description = document.createElement('p');
  description.className = 'ad-description';
  description.textContent = ad.description;
  const arrow = document.createElement('span');
  arrow.className = 'ad-arrow';
  arrow.textContent = '↗';
  arrow.setAttribute('aria-hidden', 'true');
  body.append(label, name, description, arrow);
  link.append(media, body);
  slot.replaceChildren(link);
}

const appId = readAppId(location.search);
if (!appId) {
  message('広告枠の設定を確認してください');
} else {
  try {
    const feed = await loadFeed(base);
    if (!feed.registeredAppIds.includes(appId)) {
      message('広告枠の設定を確認してください');
    } else {
      const ad = selectAd(feed, appId);
      if (ad) render(ad);
      else message('紹介できるアプリはまだありません');
    }
  } catch (error) {
    console.error('広告の読み込みに失敗しました。', error);
    message('紹介を読み込めませんでした');
  }
}
