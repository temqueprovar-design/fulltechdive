const CATEGORIAS = window.CATEGORIAS || [];
const CATALOGOS = window.CATALOGOS || [];
const IMG = 'assets/img/produtos/';
const FEATURED = ['unidadeshidraulicas', 'ferramentashidraulicas', 'arcomprimido', 'mascarasecapacetes', 'camarashiperbaricas', 'inspecao'];

// elemento com texto seguro (sem innerHTML)
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

// ---------- navegação ----------
const nav = document.querySelector('.nav');
const burger = document.querySelector('.burger');
document.getElementById('ano').textContent = new Date().getFullYear();

addEventListener('scroll', () => nav.classList.toggle('solid', scrollY > 40), { passive: true });
nav.classList.toggle('solid', scrollY > 40);

function setMenu(open) {
  nav.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', String(open));
}
burger.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
document.querySelector('.nav__menu').addEventListener('click', e => { if (e.target.tagName === 'A') setMenu(false); });

// ---------- catálogo mais recente ----------
const latest = CATALOGOS[0];
if (latest) {
  const url = 'assets/docs/' + encodeURIComponent(latest.file);
  document.querySelectorAll('[data-latest-doc]').forEach(a => {
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = (a.dataset.label || 'Baixar catálogo') + ' ' + latest.year + ' ↓';
  });
}

// ---------- links (vêm do painel; se não carregar, fica o que está no HTML) ----------
const LINKS = window.LINKS || [];
const brandsBox = document.querySelector('.brands');
if (brandsBox && LINKS.length) {
  brandsBox.replaceChildren(...LINKS.map(l => {
    const a = el('a', 'brand');
    a.href = l.url;
    a.target = '_blank';
    a.rel = 'noopener';
    if (l.image) {
      const im = document.createElement('img');
      im.src = 'assets/img/' + l.image;
      im.alt = '';
      im.loading = 'lazy';
      a.appendChild(im);
    }
    a.append(el('span', null, l.name), el('small', null, 'mais info →'));
    return a;
  }));
}

// ---------- números (vêm dos dados) ----------
const totalProds = CATEGORIAS.reduce((n, c) => n + c.products.length, 0);
const brandCount = document.querySelectorAll('.brand').length;
const facts = { cats: CATEGORIAS.length, prods: totalProds, brands: brandCount, docs: CATALOGOS.length };
document.querySelectorAll('[data-fact]').forEach(n => { if (facts[n.dataset.fact] != null) n.textContent = facts[n.dataset.fact]; });

// ---------- cartões de produto ----------
const grid = document.getElementById('p-grid');
FEATURED.map(s => CATEGORIAS.find(c => c.slug === s)).filter(Boolean).forEach(cat => {
  const p = cat.products.find(x => x.name && x.details.length >= 2) || cat.products.find(x => x.name) || cat.products[0];
  const li = el('li', 'p-card');
  const a = el('a');
  a.href = 'produtos.html#' + cat.slug;

  const fig = el('div', 'p-img');
  const im = document.createElement('img');
  im.src = IMG + p.image;
  im.alt = p.name || cat.title;
  im.loading = 'lazy';
  fig.appendChild(im);

  const body = el('div', 'p-body');
  const desc = p.details.length
    ? p.details.slice(0, 3).join(' · ')
    : cat.products.length + (cat.products.length === 1 ? ' item' : ' itens') + ' nesta linha';
  body.append(el('p', 'p-tag', cat.title), el('h3', 'p-name', p.name || cat.title), el('p', 'p-desc', desc), el('span', 'p-cta', 'Ver linha completa →'));

  a.append(fig, body);
  li.appendChild(a);
  grid.appendChild(li);
});

// ---------- faixa de movimento com as linhas de produto ----------
const marq = document.getElementById('marq');
const items = CATEGORIAS.map(c => c.title);
const track = el('div', 'marq__t');
[...items, ...items].forEach(t => track.appendChild(el('span', null, t)));
marq.appendChild(track);

// ---------- bolhas no hero (sutis) ----------
(function bubbles() {
  const hero = document.querySelector('.hero__bg');
  if (!hero || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < 14; i++) {
    const b = el('span', 'bubble');
    const s = 6 + Math.random() * 16;
    b.style.cssText =
      'width:' + s + 'px;height:' + s + 'px;left:' + (Math.random() * 100) + '%;' +
      '--dx:' + (Math.random() * 80 - 40) + 'px;' +
      'animation-duration:' + (10 + Math.random() * 10) + 's;' +
      'animation-delay:-' + (Math.random() * 16) + 's';
    b.setAttribute('aria-hidden', 'true');
    hero.appendChild(b);
  }
})();

// ---------- profundímetro ----------
(function depthGauge() {
  const MAX = 100;
  const gauge = el('aside', 'depth');
  gauge.setAttribute('aria-hidden', 'true');
  gauge.appendChild(el('div', 'depth__track'));
  for (let m = 0; m <= MAX; m += 10) {
    const t = el('span', 'depth__tick' + (m % 50 === 0 ? ' depth__tick--major' : ''));
    t.style.top = (m / MAX * 100) + '%';
    gauge.appendChild(t);
  }
  const marker = el('div', 'depth__marker');
  const val = el('span', null, '0 m');
  marker.appendChild(val);
  gauge.appendChild(marker);
  document.body.appendChild(gauge);

  let raf = 0;
  function update() {
    raf = 0;
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    marker.style.top = (p * 100) + '%';
    val.textContent = Math.round(p * MAX) + ' m';
  }
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
  addEventListener('resize', update);
  update();
})();
