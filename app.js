/*
  GiftFinder - app.js
  -------------------
  Loads products.js, lets the user nope / like / super like each item,
  saves progress in localStorage, and logs positive actions immediately
  to a Google Apps Script endpoint connected to this Google Sheet:
  https://docs.google.com/spreadsheets/d/1ndK65dNkl7bwt-5xMocd3xR9ASWmBu5aCp_2Ds7ulwk/edit?usp=sharing

  TO SET UP GOOGLE APPS SCRIPT
  ----------------------------
  1. Open the Google Sheet above -> Extensions -> Apps Script.
  2. Replace the default code with:

      function doPost(e) {
        var data = JSON.parse(e.postData.contents);
        var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
        sheet.appendRow([
          data.productId,
          data.productTitle,
          data.action
        ]);
        return ContentService
          .createTextOutput(JSON.stringify({ status: 'ok' }))
          .setMimeType(ContentService.MimeType.JSON);
      }

  3. Click Deploy -> New deployment -> Web App.
     - Execute as: Me
     - Who has access: Anyone
  4. Authorize and copy the Web App URL.
  5. Paste it below, replacing the placeholder string.
*/

const SCRIPT_URL = 'PASTE_GOOGLE_APPS_SCRIPT_URL_HERE';
const STORAGE_KEY = 'giftfinder-state';

const DEFAULT_STATE = {
  seenIds: [],
  likedIds: [],
  superLikedIds: [],
  dislikedIds: []
};

const SWIPE_THRESHOLD = 80;
const SUPER_LIKE_THRESHOLD = 70;

let allProducts = [];
let state = { ...DEFAULT_STATE };
let dragStartX = 0;
let dragStartY = 0;
let dragCurX = 0;
let dragCurY = 0;
let isDragging = false;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved === 'object') {
      state = { ...DEFAULT_STATE, ...saved };
    }
  } catch (e) {
    console.warn('GiftFinder: could not parse saved state, starting fresh.', e);
    state = { ...DEFAULT_STATE };
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('GiftFinder: could not save state.', e);
  }
}

function loadProducts() {
  const raw = window.PRODUCT_LIST;
  if (!Array.isArray(raw)) throw new Error('PRODUCT_LIST missing or not an array in products.js');

  const seenIds = new Set();
  const valid = [];
  for (const p of raw) {
    if (!p.id || typeof p.id !== 'string') {
      console.warn('GiftFinder: product missing string id, skipping:', p);
      continue;
    }
    if (seenIds.has(p.id)) {
      console.warn('GiftFinder: duplicate product id "%s", skipping second copy.', p.id);
      continue;
    }
    seenIds.add(p.id);
    valid.push(p);
  }

  return valid;
}

function getDeck() {
  const seen = new Set(state.seenIds);
  return allProducts.filter((product) => !seen.has(product.id));
}

function getCurrentProduct() {
  return getDeck()[0] || null;
}

function getPositiveProducts() {
  const liked = new Set(state.likedIds);
  const superLiked = new Set(state.superLikedIds);

  return allProducts
    .filter((product) => liked.has(product.id) || superLiked.has(product.id))
    .map((product) => ({
      ...product,
      action: superLiked.has(product.id) ? 'super_like' : 'like'
    }));
}

function el(id) {
  const node = document.getElementById(id);
  if (!node) console.warn('GiftFinder: element #%s not found.', id);
  return node;
}

function createThumb(product) {
  if (product.image) {
    const img = document.createElement('img');
    img.src = product.image;
    img.alt = '';
    img.loading = 'lazy';
    return img;
  }

  const placeholder = document.createElement('div');
  placeholder.className = 'like-item-no-img';
  placeholder.textContent = '★';
  return placeholder;
}

function buildPositiveItem(product) {
  const wrap = document.createElement('div');
  wrap.className = 'like-item';

  wrap.appendChild(createThumb(product));

  const info = document.createElement('div');
  info.className = 'like-info';

  const meta = document.createElement('div');
  meta.className = 'like-meta';

  const title = document.createElement('h3');
  title.textContent = product.title || product.url;
  meta.appendChild(title);

  const badge = document.createElement('span');
  badge.className = product.action === 'super_like' ? 'choice-badge is-super' : 'choice-badge';
  badge.textContent = product.action === 'super_like' ? 'Super Like' : 'Like';
  meta.appendChild(badge);

  info.appendChild(meta);

  const link = document.createElement('a');
  link.href = product.url;
  link.textContent = 'View product';
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  info.appendChild(link);

  wrap.appendChild(info);
  return wrap;
}

function renderPositiveList() {
  const list = el('likesList');
  if (!list) return;

  const positive = getPositiveProducts();
  list.innerHTML = '';

  if (positive.length === 0) {
    const p = document.createElement('p');
    p.className = 'likes-empty';
    p.textContent = 'No positive picks yet.';
    list.appendChild(p);
    return;
  }

  positive.forEach((product) => {
    list.appendChild(buildPositiveItem(product));
  });
}

function resetCardSurface(card) {
  card.classList.remove('exit-right', 'exit-left', 'exit-up', 'snap-back', 'hidden');
  card.style.transform = '';
  card.querySelectorAll('.stamp').forEach((stamp) => {
    stamp.style.opacity = '0';
  });
}

function render() {
  const current = getCurrentProduct();
  const cardEl = el('productCard');
  const emptyEl = el('emptyState');
  const loadEl = el('loadingState');

  if (loadEl) loadEl.classList.add('hidden');

  if (current) {
    if (cardEl) {
      resetCardSurface(cardEl);

      const imgEl = el('productImage');
      const noImgEl = cardEl.querySelector('.card-no-image');
      const titleEl = el('productTitle');
      const linkEl = el('productLink');

      if (current.image) {
        if (imgEl) {
          imgEl.src = current.image;
          imgEl.classList.remove('hidden');
        }
        if (noImgEl) noImgEl.classList.add('hidden');
      } else {
        if (imgEl) imgEl.classList.add('hidden');
        if (noImgEl) noImgEl.classList.remove('hidden');
      }

      if (titleEl) titleEl.textContent = current.title || '(no title)';
      if (linkEl) linkEl.href = current.url || '#';
    }
    if (emptyEl) emptyEl.classList.add('hidden');
  } else {
    if (cardEl) cardEl.classList.add('hidden');
    if (emptyEl) emptyEl.classList.remove('hidden');
  }

  renderPositiveList();
}

function sendPositiveChoiceToGoogleSheet(product, action) {
  if (SCRIPT_URL === 'PASTE_GOOGLE_APPS_SCRIPT_URL_HERE') return;

  const payload = {
    productId: product.id,
    productTitle: product.title || product.url,
    action
  };

  fetch(SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  }).catch((err) => {
    console.error('GiftFinder: failed to send positive choice:', err);
  });
}

function animateCard(direction, callback) {
  const card = el('productCard');
  if (!card) {
    callback();
    return;
  }

  card.classList.add(direction);
  setTimeout(callback, 380);
}

function markSeen(product) {
  if (!state.seenIds.includes(product.id)) {
    state.seenIds.push(product.id);
  }
}

function removeId(list, id) {
  return list.filter((item) => item !== id);
}

function nope() {
  const product = getCurrentProduct();
  if (!product) return;

  markSeen(product);
  if (!state.dislikedIds.includes(product.id)) {
    state.dislikedIds.push(product.id);
  }

  saveState();
  animateCard('exit-left', render);
}

function like() {
  const product = getCurrentProduct();
  if (!product) return;

  markSeen(product);
  if (!state.likedIds.includes(product.id)) {
    state.likedIds.push(product.id);
  }
  state.superLikedIds = removeId(state.superLikedIds, product.id);
  state.dislikedIds = removeId(state.dislikedIds, product.id);

  saveState();
  animateCard('exit-right', render);
  sendPositiveChoiceToGoogleSheet(product, 'like');
}

function superLike() {
  const product = getCurrentProduct();
  if (!product) return;

  markSeen(product);
  if (!state.superLikedIds.includes(product.id)) {
    state.superLikedIds.push(product.id);
  }
  state.likedIds = removeId(state.likedIds, product.id);
  state.dislikedIds = removeId(state.dislikedIds, product.id);

  saveState();
  animateCard('exit-up', render);
  sendPositiveChoiceToGoogleSheet(product, 'super_like');
}

function reset() {
  if (!window.confirm('Reset all progress? This cannot be undone.')) return;
  state = { ...DEFAULT_STATE };
  saveState();
  render();
}

function onDragStart(e) {
  if (!getCurrentProduct()) return;

  isDragging = true;
  dragCurX = 0;
  dragCurY = 0;

  const pt = e.touches ? e.touches[0] : e;
  dragStartX = pt.clientX;
  dragStartY = pt.clientY;

  const card = el('productCard');
  if (card) card.style.transition = 'none';
}

function updateStampVisibility(card) {
  const stampLike = card.querySelector('.stamp-like');
  const stampNope = card.querySelector('.stamp-nope');
  const stampSuper = card.querySelector('.stamp-super-like');

  if (stampLike) {
    stampLike.style.opacity = dragCurX > 20 && Math.abs(dragCurX) >= Math.abs(dragCurY)
      ? Math.min(1, dragCurX / 100)
      : '0';
  }

  if (stampNope) {
    stampNope.style.opacity = dragCurX < -20 && Math.abs(dragCurX) >= Math.abs(dragCurY)
      ? Math.min(1, Math.abs(dragCurX) / 100)
      : '0';
  }

  if (stampSuper) {
    stampSuper.style.opacity = dragCurY < -20 && Math.abs(dragCurY) > Math.abs(dragCurX)
      ? Math.min(1, Math.abs(dragCurY) / 100)
      : '0';
  }
}

function onDragMove(e) {
  if (!isDragging) return;
  e.preventDefault();

  const pt = e.touches ? e.touches[0] : e;
  dragCurX = pt.clientX - dragStartX;
  dragCurY = pt.clientY - dragStartY;

  const card = el('productCard');
  if (!card) return;

  card.style.transform = `translate(${dragCurX}px, ${dragCurY}px) rotate(${dragCurX * 0.07}deg)`;
  updateStampVisibility(card);
}

function onDragEnd() {
  if (!isDragging) return;
  isDragging = false;

  const isVerticalIntent = Math.abs(dragCurY) > Math.abs(dragCurX);
  const isHorizontalIntent = Math.abs(dragCurX) >= Math.abs(dragCurY);

  if (dragCurY < -SUPER_LIKE_THRESHOLD && isVerticalIntent) {
    superLike();
    return;
  }

  if (dragCurX > SWIPE_THRESHOLD && isHorizontalIntent) {
    like();
    return;
  }

  if (dragCurX < -SWIPE_THRESHOLD && isHorizontalIntent) {
    nope();
    return;
  }

  const card = el('productCard');
  if (card) {
    card.classList.add('snap-back');
    card.style.transform = '';
    card.querySelectorAll('.stamp').forEach((stamp) => {
      stamp.style.opacity = '0';
    });
    setTimeout(() => card.classList.remove('snap-back'), 320);
  }
}

async function init() {
  loadState();

  el('likeBtn')?.addEventListener('click', like);
  el('superLikeBtn')?.addEventListener('click', superLike);
  el('nopeBtn')?.addEventListener('click', nope);
  el('resetBtn')?.addEventListener('click', reset);

  const card = el('productCard');
  if (card) {
    card.addEventListener('mousedown', onDragStart);
    card.addEventListener('touchstart', onDragStart, { passive: false });
  }

  window.addEventListener('mousemove', onDragMove);
  window.addEventListener('touchmove', onDragMove, { passive: false });
  window.addEventListener('mouseup', onDragEnd);
  window.addEventListener('touchend', onDragEnd);
  try {
    allProducts = loadProducts();
  } catch (err) {
    console.error('GiftFinder:', err);
    const loadEl = el('loadingState');
    const textEl = loadEl?.querySelector('p');
    if (loadEl) loadEl.querySelector('.spinner')?.remove();
    if (textEl) {
      textEl.textContent =
        'Could not load products. Check that products.js is present and PRODUCT_LIST is defined.';
    }
    return;
  }

  render();
}

init();
