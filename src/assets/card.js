export function renderAd(container, ad, base, { headingTag = 'h1' } = {}) {
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
  const name = document.createElement(headingTag);
  name.className = 'ad-name';
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
  container.replaceChildren(link);
}
