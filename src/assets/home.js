import { loadFeed, embedCode, selectAd } from './data.js';
import { renderAd } from './card.js';

const base = new URL('../', import.meta.url);
const select = document.querySelector('#app-select');
const code = document.querySelector('#embed-code');
const copy = document.querySelector('#copy-code');
const reload = document.querySelector('#reload-preview');
const preview = document.querySelector('#preview');
const status = document.querySelector('#setup-status');
const copyStatus = document.querySelector('#copy-status');
const fixed = document.querySelector('#fixed-position');
const previewHelp = document.querySelector('.preview-help');
let feed;

function updatePreview() {
  const ad = selectAd(feed, null);
  const slot = document.createElement('div');
  slot.className = 'slot';
  if (ad) {
    renderAd(slot, ad, base, { headingTag: 'h3' });
  } else {
    const message = document.createElement('p');
    message.className = 'slot-message';
    message.textContent = '現在掲載中の作品はありません';
    slot.append(message);
  }
  preview.replaceChildren(slot);
  previewHelp.textContent = 'デモでは掲載中の全作品からランダム表示します。実際の配信では自分の作品は除外されます。';
  reload.disabled = feed.ads.length < 2;
  code.value = embedCode(base, select.value, { fixed: fixed.checked });
  copyStatus.textContent = '';
}

select.addEventListener('change', updatePreview);
reload.addEventListener('click', updatePreview);
fixed.addEventListener('change', () => {
  code.value = embedCode(base, select.value, { fixed: fixed.checked });
  copyStatus.textContent = '';
});
copy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(code.value);
    copyStatus.textContent = '埋め込みコードをコピーしました。';
  } catch {
    code.focus();
    code.select();
    copyStatus.textContent = '自動コピーができませんでした。選択したコードをコピーしてください。';
  }
});

try {
  const response = await fetch(new URL('site.json', base), { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`サイト設定の取得に失敗しました (${response.status})。`);
  const site = await response.json();
  document.querySelector('#demo-banner').hidden = !site.demo;
  feed = await loadFeed(base);
  select.replaceChildren();
  if (feed.registeredAppIds.length === 0) {
    const option = new Option('登録済みのアプリはありません', '');
    select.append(option);
    status.textContent = 'まずは作品を登録してください。下の登録手順から始められます。';
  } else {
    for (const id of feed.registeredAppIds) {
      const ad = feed.ads.find(item => item.id === id);
      select.append(new Option(ad ? `${ad.name} / ${id}` : `${id}（掲載停止中）`, id));
    }
    select.disabled = false;
    copy.disabled = false;
    fixed.disabled = false;
    status.textContent = `掲載中 ${feed.ads.length}作品。広告を見る人のログインは不要です。`;
    updatePreview();
  }
} catch (error) {
  console.error('サイトデータの読み込みに失敗しました。', error);
  select.replaceChildren(new Option('読み込みに失敗しました', ''));
  status.textContent = 'ページを再読み込みしてください。改善しない場合は管理者に連絡してください。';
}
