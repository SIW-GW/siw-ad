import { loadFeed, embedCode } from './data.js';

const base = new URL('../', import.meta.url);
const select = document.querySelector('#app-select');
const code = document.querySelector('#embed-code');
const copy = document.querySelector('#copy-code');
const reload = document.querySelector('#reload-preview');
const preview = document.querySelector('#preview');
const status = document.querySelector('#setup-status');
const copyStatus = document.querySelector('#copy-status');
const fixed = document.querySelector('#fixed-position');

function updatePreview() {
  const url = new URL('embed/', base);
  url.searchParams.set('app', select.value);
  const frame = document.createElement('iframe');
  frame.src = url.href;
  frame.title = 'コミュニティのアプリ紹介プレビュー';
  frame.width = '320';
  frame.height = '72';
  frame.referrerPolicy = 'no-referrer';
  preview.replaceChildren(frame);
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
  const feed = await loadFeed(base);
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
    reload.disabled = false;
    fixed.disabled = false;
    status.textContent = `掲載中 ${feed.ads.length}作品。広告を見る人のログインは不要です。`;
    updatePreview();
  }
} catch (error) {
  console.error('サイトデータの読み込みに失敗しました。', error);
  select.replaceChildren(new Option('読み込みに失敗しました', ''));
  status.textContent = 'ページを再読み込みしてください。改善しない場合は管理者に連絡してください。';
}
