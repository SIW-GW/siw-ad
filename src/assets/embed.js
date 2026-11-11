import { loadFeed, readAppId, selectAd } from './data.js';
import { renderAd } from './card.js';

const base = new URL('../', import.meta.url);
const slot = document.querySelector('#slot');

function message(text) {
  const element = document.createElement('p');
  element.className = 'slot-message';
  element.setAttribute('role', 'status');
  element.textContent = text;
  slot.replaceChildren(element);
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
      if (ad) renderAd(slot, ad, base);
      else message('紹介できるアプリはまだありません');
    }
  } catch (error) {
    console.error('広告の読み込みに失敗しました。', error);
    message('紹介を読み込めませんでした');
  }
}
