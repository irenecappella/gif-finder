const STORAGE_KEY = "giftfinder-state-v1";

const defaultState = {
  seenIds: [],
  likedIds: [],
  dislikedIds: []
};

let products = [];
let state = loadState();

const productCard = document.getElementById("productCard");
const productImage = document.getElementById("productImage");
const productTitle = document.getElementById("productTitle");
const productLink = document.getElementById("productLink");
const emptyState = document.getElementById("emptyState");

const seenCount = document.getElementById("seenCount");
const likedCount = document.getElementById("likedCount");
const remainingCount = document.getElementById("remainingCount");
const likesList = document.getElementById("likesList");

const nopeBtn = document.getElementById("nopeBtn");
const likeBtn = document.getElementById("likeBtn");
const resetBtn = document.getElementById("resetBtn");

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);

    const parsed = JSON.parse(raw);

    return {
      seenIds: Array.isArray(parsed.seenIds) ? parsed.seenIds : [],
      likedIds: Array.isArray(parsed.likedIds) ? parsed.likedIds : [],
      dislikedIds: Array.isArray(parsed.dislikedIds) ? parsed.dislikedIds : []
    };
  } catch (error) {
    console.error("Failed to load state:", error);
    return structuredClone(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function loadProducts() {
  try {
    const response = await fetch("./products.json");

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("products.json must contain an array");
    }

    products = data.filter(product => product.id && product.title && product.url);

    render();
  } catch (error) {
    console.error("Failed to load products:", error);
    emptyState.classList.remove("hidden");
    emptyState.innerHTML = `
      <h2>Could not load products</h2>
      <p>Check that products.json exists in the repo root and has valid JSON.</p>
    `;
    productCard.classList.add("hidden");
  }
}

function getRemainingProducts() {
  return products.filter(product => !state.seenIds.includes(product.id));
}

function getLikedProducts() {
  return products.filter(product => state.likedIds.includes(product.id));
}

function renderCurrentProduct() {
  const remaining = getRemainingProducts();

  if (remaining.length === 0) {
    productCard.classList.add("hidden");
    emptyState.classList.remove("hidden");
    return;
  }

  const current = remaining[0];

  productTitle.textContent = current.title;
  productLink.href = current.url;
  productLink.textContent = "View product";

  if (current.image) {
    productImage.src = current.image;
    productImage.alt = current.title;
    productImage.classList.remove("hidden");
  } else {
    productImage.classList.add("hidden");
  }

  emptyState.classList.add("hidden");
  productCard.classList.remove("hidden");
}

function renderLikes() {
  const likedProducts = getLikedProducts();

  likesList.innerHTML = "";

  if (likedProducts.length === 0) {
    likesList.innerHTML = "<p>No liked products yet.</p>";
    return;
  }

  likedProducts.forEach(product => {
    const item = document.createElement("div");
    item.className = "like-item";
    item.innerHTML = `
      <strong>${escapeHtml(product.title)}</strong><br>
      <a href="${product.url}" target="_blank" rel="noopener noreferrer">Open product</a>
    `;
    likesList.appendChild(item);
  });
}

function renderStats() {
  seenCount.textContent = String(state.seenIds.length);
  likedCount.textContent = String(state.likedIds.length);
  remainingCount.textContent = String(getRemainingProducts().length);
}

function render() {
  renderCurrentProduct();
  renderLikes();
  renderStats();
}

function markSeen(productId) {
  if (!state.seenIds.includes(productId)) {
    state.seenIds.push(productId);
  }
}

function likeCurrentProduct() {
  const current = getRemainingProducts()[0];
  if (!current) return;

  markSeen(current.id);

  if (!state.likedIds.includes(current.id)) {
    state.likedIds.push(current.id);
  }

  saveState();
  render();
}

function dislikeCurrentProduct() {
  const current = getRemainingProducts()[0];
  if (!current) return;

  markSeen(current.id);

  if (!state.dislikedIds.includes(current.id)) {
    state.dislikedIds.push(current.id);
  }

  saveState();
  render();
}

function resetProgress() {
  state = structuredClone(defaultState);
  saveState();
  render();
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

likeBtn.addEventListener("click", likeCurrentProduct);
nopeBtn.addEventListener("click", dislikeCurrentProduct);
resetBtn.addEventListener("click", resetProgress);

loadProducts();
