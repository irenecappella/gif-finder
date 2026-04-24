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
  { id: 'p001', name: 'Sole Mio Pannacota Lucia Tee', brand: 'Thinking Mu', img: '', tint: '#EFD9CF', url: 'https://thinkingmu.com/en/products/sole-mio-pannacota-lucia-tee' },
  { id: 'p002', name: 'Nimyo Fog', brand: 'Kings of Indigo', img: '', tint: '#D9DDD8', url: 'https://kingsofindigo.com/products/nimyo-fog?_pos=40&_fid=b42091dc6&_ss=c&variant=56047860253055' },
  { id: 'p003', name: 'Classic Clog', brand: 'Crocs', img: '', tint: '#D8CBB3', url: 'https://www.crocs.nl/p/classic-clog/10001.html?cgid=sale&cid=862' },
  { id: 'p004', name: 'Dorcas Small Bag Lavender', brand: 'Zazi', img: '', tint: '#D7C7EA', url: 'https://theworldofzazi.com/collections/new-in-this-week/products/dorcas-small-bag-lavender' },
  { id: 'p005', name: 'Sol Contrast White Aaron Tee', brand: 'Thinking Mu', img: '', tint: '#F2F0EC', url: 'https://thinkingmu.com/en/products/sol-contrast-white-aaron-tee' },
  { id: 'p006', name: 'Castile White', brand: 'Kings of Indigo', img: '', tint: '#ECE7E0', url: 'https://kingsofindigo.com/products/castile-white?variant=56984057708927' },
  { id: 'p007', name: 'Zazi Gift Card', brand: 'Zazi', img: '', tint: '#E9DEC6', url: 'https://theworldofzazi.com/collections/all/products/zazi-gift-card?_pos=4&_fid=f50adce50&_ss=c&variant=49794127462739' },
  { id: 'p008', name: 'Golden Moon Piercing', brand: 'Anna + Nina', img: '', tint: '#F0D37D', url: 'https://www.anna-nina.nl/collections/14k-gold-jewellery/products/golden-moon-piercing' },
  { id: 'p009', name: 'Ninja Detect Power Blender Processor Pro Marineblauw', brand: 'Ninja', img: '', tint: '#425A72', url: 'https://ninjakitchen.nl/product/ninja-detect-power-blender-processor-pro-marineblauw-tb401eu-zidTB401EUCYD' },
  { id: 'p010', name: 'Classic Clog', brand: 'Crocs', img: '', tint: '#BFC7D8', url: 'https://www.crocs.nl/p/classic-clog/10001.html?cgid=sale&cid=86A' },
  { id: 'p011', name: 'Core Rib Contrast Socks 2-Pack', brand: 'Organic Basics', img: '', tint: '#F1C9D3', url: 'https://organicbasics.com/products/core-rib-contrast-socks-2-pack-soft-blush-vibrant-red?variant=49159324434764&gad_source=1&gad_campaignid=18712049942&gbraid=0AAAAApAXbOIkbGcfKSVOCboVnwS2Jyn5o&gclid=CjwKCAjwqazPBhALEiwAOuXqdER53gOGdP0XNby87TWmiles8ElH6FqHTzzcAbdflgr7VvnTL5DIZRoC88QQAvD_BwE&size=39-42' },
  { id: 'p012', name: 'Core Ankle Socks 2-Pack Grey', brand: 'Organic Basics', img: '', tint: '#D7D8DC', url: 'https://organicbasics.com/products/core-ankle-socks-2-pack-grey?variant=47921350312268&vslyvid=31e8ca6c077d-4baa-bea5-c296dfd12050&vslywgid=4120b0aef951499c8b1d3bd0fbd75912&vslysid=_loomi_addon_1763042182678&size=39-42' }
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
