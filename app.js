/*
  GiftFinder — app.js
  ───────────────────
  Loads products.json, lets the user like / nope each item,
  saves progress in localStorage, and submits liked products
  to a Google Apps Script endpoint.

  TO SET UP GOOGLE APPS SCRIPT
  ─────────────────────────────
  1. Open Google Sheets → Extensions → Apps Script.
  2. Replace the default code with:

      function doPost(e) {
        var data = JSON.parse(e.postData.contents);
        var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
        sheet.appendRow([
          new Date(),
          data.personCode,
          data.likedIds.join(', '),
          data.likedTitles.join(', ')
        ]);
        return ContentService
          .createTextOutput(JSON.stringify({ status: 'ok' }))
          .setMimeType(ContentService.MimeType.JSON);
      }

  3. Click Deploy → New deployment → Web App.
     - Execute as: Me
     - Who has access: Anyone
  4. Authorise and copy the Web App URL.
  5. Paste it below, replacing the placeholder string.
*/

// ─── Config ───────────────────────────────────────────────────────────────────
const SCRIPT_URL  = 'PASTE_GOOGLE_APPS_SCRIPT_URL_HERE';
const STORAGE_KEY = 'giftfinder-state';

// ─── Default state shape ──────────────────────────────────────────────────────
const DEFAULT_STATE = {
  seenIds:     [],   // IDs of every product the user has decided on
  likedIds:    [],   // IDs the user liked (subset of seenIds)
  dislikedIds: [],   // IDs the user noped (subset of seenIds)
  submitted:   false // true after a successful submit — prevents re-submission
};

// ─── Runtime ─────────────────────────────────────────────────────────────────
let allProducts = [];   // loaded from products.json
let state       = { ...DEFAULT_STATE };

// ─── Persistence ─────────────────────────────────────────────────────────────
function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved === 'object') {
      // Merge so new keys added to DEFAULT_STATE are never undefined
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

// ─── Load products from products.js ──────────────────────────────────────────
// products.js sets window.PRODUCT_LIST and is loaded as a plain <script> tag —
// no fetch needed, so the app works when opened directly from the filesystem.
function loadProducts() {
  const raw = window.PRODUCT_LIST;

  if (!Array.isArray(raw)) throw new Error('PRODUCT_LIST missing or not an array in products.js');

  // Validate, skip bad entries, warn on duplicate IDs
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

// ─── Derived helpers ──────────────────────────────────────────────────────────
// Products the user hasn't seen yet, in original order.
function getDeck() {
  const seen = new Set(state.seenIds);
  return allProducts.filter(p => !seen.has(p.id));
}

// Full product objects for every liked ID (preserving original order).
function getLikedProducts() {
  const liked = new Set(state.likedIds);
  return allProducts.filter(p => liked.has(p.id));
}

// ─── Safe DOM helpers ─────────────────────────────────────────────────────────
function el(id) {
  const node = document.getElementById(id);
  if (!node) console.warn('GiftFinder: element #%s not found.', id);
  return node;
}

// Build a like-item card using DOM methods (no innerHTML for user content → XSS-safe)
function buildLikeItem(product) {
  const wrap = document.createElement('div');
  wrap.className = 'like-item';

  if (product.image) {
    const img = document.createElement('img');
    img.src = product.image;
    img.alt = '';
    img.loading = 'lazy';
    wrap.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'like-item-no-img';
    placeholder.textContent = '🎁';
    wrap.appendChild(placeholder);
  }

  const info = document.createElement('div');
  info.className = 'like-info';

  const h3 = document.createElement('h3');
  h3.textContent = product.title || product.url; // textContent — never innerHTML
  info.appendChild(h3);

  const a = document.createElement('a');
  a.href = product.url;
  a.textContent = 'View product';
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  info.appendChild(a);

  wrap.appendChild(info);
  return wrap;
}

// ─── Render ───────────────────────────────────────────────────────────────────
function render() {
  const deck    = getDeck();
  const current = deck[0] || null;

  // ── Card vs empty state ──
  const cardEl   = el('productCard');
  const emptyEl  = el('emptyState');
  const loadEl   = el('loadingState');

  if (loadEl) loadEl.classList.add('hidden');

  if (current) {
    if (cardEl) {
      // Reset any leftover animation classes
      cardEl.classList.remove('exit-right', 'exit-left', 'snap-back', 'hidden');
      cardEl.style.transform = '';

      const imgEl   = el('productImage');
      const noImgEl = cardEl.querySelector('.card-no-image');
      const titleEl = el('productTitle');
      const linkEl  = el('productLink');

      if (current.image) {
        if (imgEl)   { imgEl.src = current.image; imgEl.classList.remove('hidden'); }
        if (noImgEl) noImgEl.classList.add('hidden');
      } else {
        if (imgEl)   imgEl.classList.add('hidden');
        if (noImgEl) noImgEl.classList.remove('hidden');
      }
      if (titleEl) titleEl.textContent = current.title || '(no title)';
      if (linkEl)  linkEl.href = current.url || '#';

      // Reset stamps
      cardEl.querySelectorAll('.stamp').forEach(s => { s.style.opacity = '0'; });
    }
    if (emptyEl) emptyEl.classList.add('hidden');
  } else {
    if (cardEl)  cardEl.classList.add('hidden');
    if (emptyEl) emptyEl.classList.remove('hidden');
  }

  // ── Counts ──
  const seenEl      = el('seenCount');
  const likedEl     = el('likedCount');
  const remainingEl = el('remainingCount');
  if (seenEl)      seenEl.textContent      = state.seenIds.length;
  if (likedEl)     likedEl.textContent     = state.likedIds.length;
  if (remainingEl) remainingEl.textContent = deck.length;

  // ── Liked list ──
  renderLikedList();

  // ── Submit button ──
  updateSubmitButton();
}

function renderLikedList() {
  const list = el('likesList');
  if (!list) return;

  const liked = getLikedProducts();
  list.innerHTML = ''; // clear

  if (liked.length === 0) {
    const p = document.createElement('p');
    p.className = 'likes-empty';
    p.textContent = 'No likes yet.';
    list.appendChild(p);
    return;
  }

  for (const product of liked) {
    list.appendChild(buildLikeItem(product));
  }
}

function updateSubmitButton() {
  const btn = el('submitBtn');
  if (!btn) return;

  if (state.submitted) {
    btn.textContent = 'Results submitted ✓';
    btn.disabled = true;
    return;
  }

  btn.textContent = 'Submit results';
  btn.disabled = state.likedIds.length === 0;
}

// ─── Actions ──────────────────────────────────────────────────────────────────
function like() {
  const deck = getDeck();
  if (deck.length === 0) return;
  const p = deck[0];

  if (!state.seenIds.includes(p.id))     state.seenIds.push(p.id);
  if (!state.likedIds.includes(p.id))    state.likedIds.push(p.id);
  // Remove from disliked if they previously noped (shouldn't happen in normal flow, but safe)
  state.dislikedIds = state.dislikedIds.filter(id => id !== p.id);

  saveState();
  animateCard('exit-right', render);
}

function nope() {
  const deck = getDeck();
  if (deck.length === 0) return;
  const p = deck[0];

  if (!state.seenIds.includes(p.id))     state.seenIds.push(p.id);
  if (!state.dislikedIds.includes(p.id)) state.dislikedIds.push(p.id);

  saveState();
  animateCard('exit-left', render);
}

function reset() {
  if (!window.confirm('Reset all progress? This cannot be undone.')) return;
  state = { ...DEFAULT_STATE };
  saveState();
  // Clear any submit message
  const msg = el('submitMsg');
  if (msg) msg.classList.add('hidden');
  render();
}

// ─── Submit results ───────────────────────────────────────────────────────────
async function submitResults() {
  if (SCRIPT_URL === 'PASTE_GOOGLE_APPS_SCRIPT_URL_HERE') {
    showSubmitMessage('Paste your Google Apps Script URL into app.js first.', 'error');
    return;
  }

  const liked = getLikedProducts();
  if (liked.length === 0) return;

  const btn = el('submitBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }

  const payload = {
    personCode:  'single-user',
    likedIds:    state.likedIds,
    likedTitles: liked.map(p => p.title || p.url)
  };

  try {
    /*
      Google Apps Script doesn't always return proper CORS headers.
      Using mode:'no-cors' with Content-Type:text/plain avoids a preflight
      request and works reliably. The response will be "opaque" (unreadable),
      so we treat "no exception thrown" as success.

      In your Apps Script, read the body with: e.postData.contents
      and JSON.parse() it — it arrives as a JSON string.
    */
    await fetch(SCRIPT_URL, {
      method:  'POST',
      mode:    'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body:    JSON.stringify(payload)
    });

    // Success — opaque response means we can't read it, but no exception = ok
    state.submitted = true;
    saveState();
    showSubmitMessage('✓ Results sent successfully!', 'success');
    updateSubmitButton();

  } catch (err) {
    console.error('GiftFinder: submit failed:', err);
    showSubmitMessage('Submission failed — please check your connection and try again.', 'error');
    if (btn) { btn.disabled = false; btn.textContent = 'Submit results'; }
  }
}

function showSubmitMessage(text, type) {
  const msg = el('submitMsg');
  if (!msg) return;
  msg.textContent = text;
  msg.className = `submit-msg ${type}`;
  msg.classList.remove('hidden');
}

// ─── Swipe gesture ────────────────────────────────────────────────────────────
const SWIPE_THRESHOLD = 80;
let dragStartX = 0, dragCurX = 0, isDragging = false;

function onDragStart(e) {
  if (getDeck().length === 0) return;
  isDragging = true;
  dragCurX   = 0;
  const pt   = e.touches ? e.touches[0] : e;
  dragStartX = pt.clientX;
  const card = el('productCard');
  if (card) card.style.transition = 'none';
}

function onDragMove(e) {
  if (!isDragging) return;
  e.preventDefault();
  const pt   = e.touches ? e.touches[0] : e;
  dragCurX   = pt.clientX - dragStartX;
  const card = el('productCard');
  if (!card) return;

  card.style.transform = `translateX(${dragCurX}px) rotate(${dragCurX * 0.07}deg)`;

  const stampLike = card.querySelector('.stamp-like');
  const stampNope = card.querySelector('.stamp-nope');
  if (stampLike) stampLike.style.opacity = dragCurX > 20  ? Math.min(1, dragCurX / 100) : 0;
  if (stampNope) stampNope.style.opacity = dragCurX < -20 ? Math.min(1, Math.abs(dragCurX) / 100) : 0;
}

function onDragEnd() {
  if (!isDragging) return;
  isDragging = false;

  if      (dragCurX >  SWIPE_THRESHOLD) like();
  else if (dragCurX < -SWIPE_THRESHOLD) nope();
  else {
    const card = el('productCard');
    if (card) {
      card.classList.add('snap-back');
      card.style.transform = '';
      card.querySelectorAll('.stamp').forEach(s => { s.style.opacity = '0'; });
      setTimeout(() => card.classList.remove('snap-back'), 320);
    }
  }
}

// ─── Card exit animation helper ───────────────────────────────────────────────
function animateCard(direction, callback) {
  const card = el('productCard');
  if (!card) { callback(); return; }
  card.classList.add(direction);
  setTimeout(callback, 380);
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function init() {
  loadState();

  // Wire buttons
  el('likeBtn')?.addEventListener('click', like);
  el('nopeBtn')?.addEventListener('click', nope);
  el('resetBtn')?.addEventListener('click', reset);
  el('submitBtn')?.addEventListener('click', submitResults);

  // Wire swipe on the card
  const card = el('productCard');
  if (card) {
    card.addEventListener('mousedown',  onDragStart);
    card.addEventListener('touchstart', onDragStart, { passive: false });
  }
  window.addEventListener('mousemove',  onDragMove);
  window.addEventListener('touchmove',  onDragMove, { passive: false });
  window.addEventListener('mouseup',    onDragEnd);
  window.addEventListener('touchend',   onDragEnd);

  // Load products from the global defined in products.js
  try {
    allProducts = loadProducts();
  } catch (err) {
    console.error('GiftFinder:', err);
    const loadEl    = el('loadingState');
    const headingEl = loadEl?.querySelector('p');
    if (loadEl)     loadEl.querySelector('.spinner')?.remove();
    if (headingEl)  headingEl.textContent =
      'Could not load products. Check that products.js is present and PRODUCT_LIST is defined.';
    return;
  }

  render();
}

init();
