const PALETTES = {
  forest: {
    bg: '#F4F7F1',
    bgDeep: '#E8EFE2',
    ink: '#0F2A1D',
    inkSoft: '#2D4A3A',
    muted: '#6B8775',
    green: '#2F6B4A',
    greenDeep: '#1F4A32',
    greenSoft: '#86C79B',
    greenTint: '#D9EBD0',
    purple: '#7C3AED',
    purpleSoft: '#C4B5FD',
    like: '#2F6B4A',
    nope: '#E06B5D',
    superlike: '#7C3AED',
    cardBg: '#FFFFFF',
    navBg: 'rgba(255,255,255,0.88)'
  },
  sage: {
    bg: '#EFF3EB',
    bgDeep: '#E2EAD8',
    ink: '#1B2E1F',
    inkSoft: '#3C5842',
    muted: '#7A8F7E',
    green: '#4A7C3A',
    greenDeep: '#2F5224',
    greenSoft: '#AECB92',
    greenTint: '#DDE8CF',
    purple: '#6D4FC7',
    purpleSoft: '#B8A8E8',
    like: '#4A7C3A',
    nope: '#D96A5A',
    superlike: '#6D4FC7',
    cardBg: '#FFFFFF',
    navBg: 'rgba(255,255,255,0.88)'
  },
  moss: {
    bg: '#0D1F15',
    bgDeep: '#050F0A',
    ink: '#F0F5EC',
    inkSoft: '#C8D6BF',
    muted: '#7C9183',
    green: '#5FB17A',
    greenDeep: '#3A8056',
    greenSoft: '#8FD5A8',
    greenTint: '#1A3525',
    purple: '#A78BFA',
    purpleSoft: '#8B6FE0',
    like: '#5FB17A',
    nope: '#E87868',
    superlike: '#A78BFA',
    cardBg: '#17301F',
    navBg: 'rgba(15,35,22,0.92)'
  }
};

const PRODUCTS = [
  { id: 'p001', name: 'Ceramic Pour-Over Set', brand: 'Kinto', img: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80', tint: '#E8DCC7', url: 'https://kinto.co.jp/products/ceramic-pour-over-set' },
  { id: 'p002', name: 'Terracotta Candle No. 4', brand: 'Maison Balzac', img: 'https://images.unsplash.com/photo-1602874801007-aa4b2b0b3b8c?w=800&q=80', tint: '#D9C3A8', url: 'https://maisonbalzac.com/products/terracotta-candle-no-4' },
  { id: 'p003', name: 'Leather Card Wallet', brand: 'Bellroy', img: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&q=80', tint: '#C4A584', url: 'https://bellroy.com/products/card-wallet' },
  { id: 'p004', name: 'Noise-Cancel Headphones', brand: 'Bose', img: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80', tint: '#2B2B2D', url: 'https://www.bose.com/p/headphones/noise-cancel-headphones' },
  { id: 'p005', name: 'Linen Throw Blanket', brand: 'Hawkins New York', img: 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=800&q=80', tint: '#E4D5C1', url: 'https://www.hawkinsnewyork.com/products/simple-linen-throw' },
  { id: 'p006', name: 'Botanical Print Scarf', brand: 'Acne Studios', img: 'https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=800&q=80', tint: '#D8A49A', url: 'https://www.acnestudios.com/products/botanical-print-scarf' },
  { id: 'p007', name: 'Walnut Desk Organizer', brand: 'Grovemade', img: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=800&q=80', tint: '#8A5A3B', url: 'https://grovemade.com/product/walnut-desk-organizer' },
  { id: 'p008', name: 'Hand-Blown Glass Vase', brand: 'Hay', img: 'https://images.unsplash.com/photo-1582582621959-48d27397dc69?w=800&q=80', tint: '#C9D4D8', url: 'https://hay.dk/en/hand-blown-glass-vase' },
  { id: 'p009', name: 'Merino Beanie', brand: 'Arket', img: 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?w=800&q=80', tint: '#6B7A66', url: 'https://www.arket.com/en/merino-beanie' },
  { id: 'p010', name: 'Chef\'s Knife 8"', brand: 'Shun Classic', img: 'https://images.unsplash.com/photo-1593618998160-e34014e67546?w=800&q=80', tint: '#D4D4D8', url: 'https://shun.kaiusa.com/classic-chefs-knife-8.html' },
  { id: 'p011', name: 'Olive-Wood Cutting Board', brand: 'Berard', img: 'https://images.unsplash.com/photo-1605522561233-768ad7a8fabf?w=800&q=80', tint: '#B18D5A', url: 'https://berardfrance.com/products/olive-wood-cutting-board' },
  { id: 'p012', name: 'Film Camera P&S', brand: 'Pentax 17', img: 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&q=80', tint: '#2C2C30', url: 'https://www.ricoh-imaging.co.jp/english/products/pentax17/' },
  { id: 'p013', name: 'Silk Eye Mask', brand: 'Slip', img: 'https://images.unsplash.com/photo-1631214524020-7e18db9a8f92?w=800&q=80', tint: '#E8C5C9', url: 'https://www.slip.com/products/silk-eye-mask' },
  { id: 'p014', name: 'Espresso Cups, Set of 2', brand: 'Origami', img: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80', tint: '#D5C6B4', url: 'https://origami-kai.com/products/espresso-cups' },
  { id: 'p015', name: 'Running Crew Socks', brand: 'Tracksmith', img: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=800&q=80', tint: '#1E3A5F', url: 'https://www.tracksmith.com/products/running-crew-socks' },
  { id: 'p016', name: 'Hardcover Sketchbook', brand: 'Leuchtturm1917', img: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=800&q=80', tint: '#3A4A3D', url: 'https://www.leuchtturm1917.com/sketchbook-medium.html' }
];

var PRODUCT_LIST = PRODUCTS.map(function(product) {
  return {
    id: product.id,
    title: product.name,
    brand: product.brand,
    url: product.url,
    image: product.img,
    tint: product.tint
  };
});

Object.assign(window, { PALETTES, PRODUCTS, PRODUCT_LIST });
