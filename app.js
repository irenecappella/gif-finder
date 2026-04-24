/*
  GiftFinder - app.js
  -------------------
  Loads products.js, keeps local progress and likes in localStorage, and logs
  positive actions plus shared suggestions to a Google Apps Script endpoint
  connected to this Google Sheet:
  https://docs.google.com/spreadsheets/d/1ndK65dNkl7bwt-5xMocd3xR9ASWmBu5aCp_2Ds7ulwk/edit?usp=sharing

  TO SET UP GOOGLE APPS SCRIPT
  ----------------------------
  1. Open the Google Sheet above -> Extensions -> Apps Script.
  2. Replace the default code with:

      function doPost(e) {
        var data = JSON.parse(e.postData.contents);
        var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
        sheet.appendRow([
          new Date(),
          data.eventType || '',
          data.productId || '',
          data.productTitle || '',
          data.action || '',
          data.suggestionUrl || ''
        ]);
        return ContentService
          .createTextOutput(JSON.stringify({ status: 'ok' }))
          .setMimeType(ContentService.MimeType.JSON);
      }

  3. Deploy -> New deployment -> Web App.
  4. Copy the deployed Web App URL and paste it into SCRIPT_URL below.

  NOTE
  ----
  The app is wired to send the right payloads for the Google Sheet above, but
  it still needs your deployed Apps Script Web App URL in SCRIPT_URL to send
  real rows into the sheet.
*/

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxkclQu61_c-uQuGW4e4ufm5VTcEk9950Xc88UGQjl4_rMr3rbcnfq52JqlHBmco0AS/exec';
const STORAGE_KEY = 'giftfinder-state';
const INTRO_SEEN_KEY = 'giftfinder-intro-seen';
const DEFAULT_PALETTE = 'forest';

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
let currentView = 'discover';
let activePalette = window.PALETTES?.[DEFAULT_PALETTE] || null;
let dragStartX = 0;
let dragStartY = 0;
let dragCurX = 0;
let dragCurY = 0;
let isDragging = false;
let isCardTransitioning = false;
const preloadedImages = new Set();

function el(id) {
  const node = document.getElementById(id);
  if (!node) console.warn('GiftFinder: element #%s not found.', id);
  return node;
}

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
  if (!Array.isArray(raw)) {
    throw new Error('PRODUCT_LIST missing or not an array in products.js');
  }

  const seenIds = new Set();
  const valid = [];
  for (const product of raw) {
    if (!product.id || typeof product.id !== 'string') {
      console.warn('GiftFinder: product missing string id, skipping:', product);
      continue;
    }
    if (seenIds.has(product.id)) {
      console.warn('GiftFinder: duplicate product id "%s", skipping second copy.', product.id);
      continue;
    }
    seenIds.add(product.id);
    valid.push(product);
  }

  return valid;
}

function applyPalette() {
  if (!activePalette) return;

  const root = document.documentElement;
  root.style.setProperty('--bg', activePalette.bg);
  root.style.setProperty('--bg-deep', activePalette.bgDeep);
  root.style.setProperty('--ink', activePalette.ink);
  root.style.setProperty('--ink-soft', activePalette.inkSoft);
  root.style.setProperty('--muted', activePalette.muted);
  root.style.setProperty('--green', activePalette.green);
  root.style.setProperty('--green-deep', activePalette.greenDeep);
  root.style.setProperty('--green-soft', activePalette.greenSoft);
  root.style.setProperty('--green-tint', activePalette.greenTint);
  root.style.setProperty('--purple', activePalette.purple);
  root.style.setProperty('--purple-soft', activePalette.purpleSoft);
  root.style.setProperty('--like', activePalette.like);
  root.style.setProperty('--nope', activePalette.nope);
  root.style.setProperty('--superlike', activePalette.superlike);
  root.style.setProperty('--card-bg', activePalette.cardBg);
  root.style.setProperty('--nav-bg', activePalette.navBg);
}

function preloadImage(url) {
  if (!url || preloadedImages.has(url)) return;
  preloadedImages.add(url);
  const img = new Image();
  img.src = url;
}

function preloadUpcomingProducts() {
  getDeck()
    .slice(0, 3)
    .forEach((product) => preloadImage(product.image));
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

function getProductsForAction(action) {
  if (action === 'super_like') {
    const ids = new Set(state.superLikedIds);
    return allProducts.filter((product) => ids.has(product.id)).map((product) => ({
      ...product,
      action: 'super_like'
    }));
  }

  const ids = new Set(state.likedIds);
  return allProducts.filter((product) => ids.has(product.id)).map((product) => ({
    ...product,
    action: 'like'
  }));
}

function productTitle(product) {
  return product.title || product.url || 'Untitled gift';
}

function productBrand(product) {
  if (product.brand) return product.brand;
  try {
    const hostname = new URL(product.url).hostname.replace(/^www\./, '');
    const label = hostname.split('.')[0] || 'GiftFinder';
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch (_err) {
    return 'GiftFinder';
  }
}

function sendToGoogleSheet(payload) {
  if (SCRIPT_URL === 'PASTE_GOOGLE_APPS_SCRIPT_URL_HERE') {
    console.warn('GiftFinder: set SCRIPT_URL in app.js to enable Google Sheet logging.');
    return;
  }

  fetch(SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  }).catch((err) => {
    console.error('GiftFinder: failed to send data to Google Sheet:', err);
  });
}

function sendPositiveChoiceToGoogleSheet(product, action) {
  sendToGoogleSheet({
    eventType: 'positive_action',
    productId: product.id,
    productTitle: productTitle(product),
    action,
    suggestionUrl: ''
  });
}

function sendSuggestionToGoogleSheet(url) {
  sendToGoogleSheet({
    eventType: 'suggestion',
    productId: '',
    productTitle: '',
    action: 'suggestion',
    suggestionUrl: url
  });
}

function setActiveView(viewName) {
  currentView = viewName;

  const views = {
    discover: el('discoverView'),
    likes: el('likesView'),
    suggest: el('suggestView')
  };

  Object.entries(views).forEach(([name, node]) => {
    if (!node) return;
    node.classList.toggle('hidden', name !== viewName);
    node.classList.toggle('view-active', name === viewName);
  });

  document.querySelectorAll('.nav-item').forEach((button) => {
    const isActive = button.dataset.view === viewName;
    button.classList.toggle('nav-item-active', isActive);
  });
}

function shouldShowIntro() {
  return localStorage.getItem(INTRO_SEEN_KEY) !== 'true';
}

function markIntroSeen() {
  localStorage.setItem(INTRO_SEEN_KEY, 'true');
}

function resetApp() {
  const confirmed = window.confirm('Start over and clear all saved likes and progress?');
  if (!confirmed) return;

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(INTRO_SEEN_KEY);

  state = { ...DEFAULT_STATE };
  currentView = 'discover';

  const suggestionInput = el('suggestionUrl');
  const suggestionStatus = el('suggestionStatus');
  if (suggestionInput) suggestionInput.value = '';
  if (suggestionStatus) suggestionStatus.className = 'suggest-status hidden';

  hideIntro();
  setActiveView('discover');
  render();
  showIntro();
}

function showIntro() {
  el('introScreen')?.classList.remove('hidden');
  el('matchOverlay')?.classList.add('hidden');
  document.body.classList.add('has-intro');
}

function hideIntro() {
  el('introScreen')?.classList.add('hidden');
  document.body.classList.remove('has-intro');
}

function createMediaNode(product, imageClass, fallbackClass, fallbackText) {
  if (product.image) {
    const img = document.createElement('img');
    img.src = product.image;
    img.alt = '';
    img.className = imageClass;
    img.loading = 'lazy';
    return img;
  }

  const fallback = document.createElement('div');
  fallback.className = fallbackClass;
  fallback.textContent = fallbackText;
  return fallback;
}

function buildLikesCard(product) {
  const card = document.createElement('article');
  card.className = 'likes-card';

  const mediaWrap = document.createElement('div');
  mediaWrap.className = 'likes-card-media';
  mediaWrap.appendChild(createMediaNode(product, 'likes-card-image', 'likes-card-fallback', '★'));
  card.appendChild(mediaWrap);

  const body = document.createElement('div');
  body.className = 'likes-card-body';

  const topRow = document.createElement('div');
  topRow.className = 'likes-card-top';

  const brand = document.createElement('p');
  brand.className = 'likes-card-brand';
  brand.textContent = productBrand(product);
  topRow.appendChild(brand);

  const badge = document.createElement('span');
  badge.className = product.action === 'super_like' ? 'likes-pill is-super' : 'likes-pill';
  badge.textContent = product.action === 'super_like' ? 'Super Like' : 'Like';
  topRow.appendChild(badge);

  body.appendChild(topRow);

  const title = document.createElement('h3');
  title.className = 'likes-card-title';
  title.textContent = productTitle(product);
  body.appendChild(title);

  const link = document.createElement('a');
  link.className = 'likes-card-link';
  link.href = product.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'View';
  body.appendChild(link);

  card.appendChild(body);
  return card;
}

function buildLikesSection(titleText, descriptionText, items, emptyText) {
  const section = document.createElement('section');
  section.className = 'likes-section';

  const header = document.createElement('div');
  header.className = 'likes-section-header';

  const title = document.createElement('h3');
  title.className = 'likes-section-title';
  title.textContent = titleText;
  header.appendChild(title);

  const copy = document.createElement('p');
  copy.className = 'likes-section-copy';
  copy.textContent = descriptionText;
  header.appendChild(copy);

  section.appendChild(header);

  if (items.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'likes-empty-state';
    empty.innerHTML = `<h3>${emptyText}</h3><p>Start swiping in Discover to build this list.</p>`;
    section.appendChild(empty);
    return section;
  }

  const grid = document.createElement('div');
  grid.className = 'likes-card-grid';
  items.forEach((item) => {
    grid.appendChild(buildLikesCard(item));
  });
  section.appendChild(grid);

  return section;
}

function renderLikesView() {
  const likesList = el('likesList');
  if (!likesList) return;

  likesList.innerHTML = '';
  likesList.appendChild(
    buildLikesSection(
      'Likes',
      'These ones might options.',
      getProductsForAction('like'),
      'No likes yet'
    )
  );
  likesList.appendChild(
    buildLikesSection(
      'Super Likes',
      'If you like it so much, I will think about it',
      getProductsForAction('super_like'),
      'No super likes yet'
    )
  );
}

function resetCardSurface(card) {
  card.classList.remove('exit-right', 'exit-left', 'exit-up', 'snap-back', 'hidden');
  card.style.transform = '';
  card.querySelectorAll('.stamp').forEach((stamp) => {
    stamp.style.opacity = '0';
  });
}

function renderDiscoverView() {
  const current = getCurrentProduct();
  const cardEl = el('productCard');
  const loadingEl = el('loadingState');
  const emptyEl = el('emptyState');

  if (loadingEl) loadingEl.classList.add('hidden');

  if (current) {
    if (cardEl) {
      resetCardSurface(cardEl);

      const imageEl = el('productImage');
      const noImageEl = el('productNoImage');
      const titleEl = el('productTitle');
      const subtitleEl = el('productSubtitle');
      const linkEl = el('productLink');

      if (current.image) {
        if (imageEl) {
          imageEl.src = current.image;
          imageEl.classList.remove('hidden');
        }
        if (noImageEl) noImageEl.classList.add('hidden');
      } else {
        if (imageEl) imageEl.classList.add('hidden');
        if (noImageEl) noImageEl.classList.remove('hidden');
      }

      cardEl.style.background = current.tint || 'var(--card-bg)';
      if (titleEl) titleEl.textContent = productTitle(current);
      if (subtitleEl) subtitleEl.textContent = productBrand(current);
      if (linkEl) linkEl.href = current.url || '#';
    }

    if (emptyEl) emptyEl.classList.add('hidden');
    preloadUpcomingProducts();
  } else {
    if (cardEl) cardEl.classList.add('hidden');
    if (emptyEl) emptyEl.classList.remove('hidden');
  }
}

function render() {
  renderDiscoverView();
  renderLikesView();
}

function animateCard(direction, callback) {
  const card = el('productCard');
  const actions = document.querySelector('.floating-actions');
  if (!card || isCardTransitioning) {
    callback();
    return;
  }

  isCardTransitioning = true;
  actions?.classList.add('is-busy');

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    callback();

    const nextCard = el('productCard');
    if (nextCard && !nextCard.classList.contains('hidden')) {
      nextCard.classList.add('enter-card');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          nextCard.classList.remove('enter-card');
        });
      });
    }

    actions?.classList.remove('is-busy');
    isCardTransitioning = false;
  };

  card.addEventListener('transitionend', finish, { once: true });
  requestAnimationFrame(() => {
    card.classList.add(direction);
  });
  setTimeout(finish, 460);
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
  if (!product || isCardTransitioning) return;

  markSeen(product);
  if (!state.dislikedIds.includes(product.id)) {
    state.dislikedIds.push(product.id);
  }

  saveState();
  animateCard('exit-left', render);
}

function like() {
  const product = getCurrentProduct();
  if (!product || isCardTransitioning) return;

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
  if (!product || isCardTransitioning) return;

  markSeen(product);
  if (!state.superLikedIds.includes(product.id)) {
    state.superLikedIds.push(product.id);
  }
  state.likedIds = removeId(state.likedIds, product.id);
  state.dislikedIds = removeId(state.dislikedIds, product.id);

  saveState();
  animateCard('exit-right', render);
  sendPositiveChoiceToGoogleSheet(product, 'super_like');
}

function handleSuggestionSubmit() {
  const input = el('suggestionUrl');
  const status = el('suggestionStatus');
  const rawValue = input?.value.trim() || '';

  if (!rawValue) {
    if (status) {
      status.textContent = 'Paste a product link first.';
      status.className = 'suggest-status is-error';
    }
    return;
  }

  let normalizedUrl = rawValue;
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = `https://${normalizedUrl}`;
  }

  try {
    new URL(normalizedUrl);
  } catch (_err) {
    if (status) {
      status.textContent = 'Please enter a valid product URL.';
      status.className = 'suggest-status is-error';
    }
    return;
  }

  sendSuggestionToGoogleSheet(normalizedUrl);

  if (input) input.value = '';
  if (status) {
    status.textContent = 'Suggestion shared.';
    status.className = 'suggest-status is-success';
  }
}

function onDragStart(e) {
  if (!getCurrentProduct() || isCardTransitioning) return;

  isDragging = true;
  dragCurX = 0;
  dragCurY = 0;

  const point = e.touches ? e.touches[0] : e;
  dragStartX = point.clientX;
  dragStartY = point.clientY;

  const card = el('productCard');
  if (card) card.style.transition = 'none';
}

function updateStampVisibility(card) {
  const stampLike = card.querySelector('.stamp-like');
  const stampNope = card.querySelector('.stamp-nope');
  const stampSuper = card.querySelector('.stamp-super-like');

  if (stampLike) {
    stampLike.style.opacity =
      dragCurX > 20 && Math.abs(dragCurX) >= Math.abs(dragCurY)
        ? String(Math.min(1, dragCurX / 100))
        : '0';
  }

  if (stampNope) {
    stampNope.style.opacity =
      dragCurX < -20 && Math.abs(dragCurX) >= Math.abs(dragCurY)
        ? String(Math.min(1, Math.abs(dragCurX) / 100))
        : '0';
  }

  if (stampSuper) {
    stampSuper.style.opacity =
      dragCurY < -20 && Math.abs(dragCurY) > Math.abs(dragCurX)
        ? String(Math.min(1, Math.abs(dragCurY) / 100))
        : '0';
  }
}

function onDragMove(e) {
  if (!isDragging) return;
  e.preventDefault();

  const point = e.touches ? e.touches[0] : e;
  dragCurX = point.clientX - dragStartX;
  dragCurY = point.clientY - dragStartY;

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

function wireEvents() {
  el('likeBtn')?.addEventListener('click', like);
  el('superLikeBtn')?.addEventListener('click', superLike);
  el('nopeBtn')?.addEventListener('click', nope);
  el('resetAppBtn')?.addEventListener('click', resetApp);
  el('submitSuggestionBtn')?.addEventListener('click', handleSuggestionSubmit);
  el('introStartBtn')?.addEventListener('click', () => {
    markIntroSeen();
    hideIntro();
    setActiveView('discover');
  });
  const suggestionInput = el('suggestionUrl');
  suggestionInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleSuggestionSubmit();
    }
  });

  document.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', () => {
      setActiveView(button.dataset.view || 'discover');
    });
  });

  const card = el('productCard');
  if (card) {
    card.addEventListener('mousedown', onDragStart);
    card.addEventListener('touchstart', onDragStart, { passive: false });
  }

  window.addEventListener('mousemove', onDragMove);
  window.addEventListener('touchmove', onDragMove, { passive: false });
  window.addEventListener('mouseup', onDragEnd);
  window.addEventListener('touchend', onDragEnd);
}

function init() {
  loadState();
  applyPalette();
  wireEvents();

  try {
    allProducts = loadProducts();
  } catch (err) {
    console.error('GiftFinder:', err);
    const loadingEl = el('loadingState');
    const textEl = loadingEl?.querySelector('p');
    if (loadingEl) loadingEl.querySelector('.spinner')?.remove();
    if (textEl) {
      textEl.textContent =
        'Could not load products. Check that products.js is present and PRODUCT_LIST is defined.';
    }
    return;
  }

  preloadUpcomingProducts();
  setActiveView(currentView);
  render();
  if (shouldShowIntro()) {
    showIntro();
  }
}

init();
