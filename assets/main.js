const CATEGORIAS = window.CATEGORIAS || [];
const CATALOGOS = window.CATALOGOS || [];
const IMG = 'assets/img/produtos/';
const DOCS = 'assets/docs/';
const FEATURED = ['unidadeshidraulicas', 'ferramentashidraulicas', 'arcomprimido', 'mascarasecapacetes', 'camarashiperbaricas', 'inspecao'];

// cria elemento com texto seguro (sem innerHTML)
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function link(href, cls, text, newTab) {
  const a = el('a', cls, text);
  a.href = href;
  if (newTab) { a.target = '_blank'; a.rel = 'noopener'; }
  return a;
}

function img(src, alt) {
  const i = document.createElement('img');
  i.src = src;
  i.alt = alt || '';
  i.loading = 'lazy';
  return i;
}

const docUrl = c => DOCS + encodeURIComponent(c.file);

// ---------- Cabeçalho e rodapé (iguais em todas as páginas) ----------
function logo(small) {
  const m = el('span', 'logo__mark' + (small ? ' logo__mark--sm' : ''), 'FULL TECH');
  m.appendChild(el('small', null, 'DIVE'));
  return m;
}

function renderChrome() {
  const page = document.body.dataset.page;
  const items = [
    ['produtos', 'Produtos', 'produtos.html'],
    ['empresa', 'A empresa', 'empresa.html'],
    ['contato', 'Contato', 'contato.html']
  ];

  const header = el('header', 'topbar');
  const inner = el('div', 'wrap topbar__in');

  const brand = link('index.html', 'logo');
  brand.setAttribute('aria-label', 'Full Tech Dive - início');
  brand.append(logo(false), el('span', 'logo__since', 'SINCE 1998'));

  const nav = el('nav', 'nav');
  nav.id = 'nav';
  items.forEach(([key, label, href]) => {
    const a = link(href, null, label);
    if (key === page) a.setAttribute('aria-current', 'page');
    nav.appendChild(a);
  });

  const act = el('div', 'topbar__act');
  const cta = link('catalogos.html', 'btn btn--primary btn--sm', 'Catálogos');
  if (page === 'catalogos') cta.setAttribute('aria-current', 'page');
  const burger = el('button', 'burger');
  burger.setAttribute('aria-label', 'Abrir menu');
  burger.setAttribute('aria-expanded', 'false');
  burger.setAttribute('aria-controls', 'nav');
  burger.append(el('span'), el('span'), el('span'));
  act.append(cta, burger);

  inner.append(brand, nav, act);
  header.appendChild(inner);
  document.getElementById('site-header').replaceWith(header);

  const setMenu = open => {
    nav.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
  };
  burger.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
  nav.addEventListener('click', e => { if (e.target.tagName === 'A') setMenu(false); });

  // rodapé
  const footer = el('footer', 'footer');
  const f = el('div', 'wrap footer__grid');

  const c1 = el('div');
  c1.append(logo(true), el('p', 'footer__about', 'Equipamentos para mergulho comercial e subsea.'));
  c1.appendChild(link('catalogos.html', 'btn btn--machine', 'Baixar catálogos'));

  const c2 = el('div');
  c2.appendChild(el('h4', null, 'Navegação'));
  [['Produtos', 'produtos.html'], ['Catálogos', 'catalogos.html'], ['A empresa', 'empresa.html'], ['Contato', 'contato.html']]
    .forEach(([t, h]) => c2.appendChild(link(h, null, t)));

  const c3 = el('div');
  c3.appendChild(el('h4', null, 'Contato'));
  const addr = el('p');
  addr.append('Rua Latino Coelho, 22ª — Penha', document.createElement('br'), 'Rio de Janeiro - RJ · CEP 21070-720');
  c3.append(addr,
    link('tel:+552122707847', null, '(21) 2270-7847'),
    link('tel:+5521988350209', null, '(21) 98835-0209 (WhatsApp)'),
    link('mailto:contato@fulltechdive.com.br', null, 'contato@fulltechdive.com.br'),
    link('https://www.facebook.com/fulltechdive/', null, 'Facebook', true));

  f.append(c1, c2, c3);
  const copy = el('div', 'wrap footer__copy', '© ' + new Date().getFullYear() + ' Full Tech Dive. Todos os direitos reservados.');
  footer.append(f, copy);
  footer.insertAdjacentHTML('afterbegin',
    '<svg class="footer__wave" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true">' +
    '<path d="M0 0H1440V30C1260 70 1080 74 900 46S540 -6 360 18 90 66 0 50Z"/></svg>');
  document.getElementById('site-footer').replaceWith(footer);
  addBubbles(footer);

  const fab = link('https://wa.me/5521988350209', 'whats-fab', 'WhatsApp', true);
  fab.setAttribute('aria-label', 'WhatsApp');
  document.body.appendChild(fab);
}

// bolhas subindo no rodapé (sutil; desligado para quem pede menos movimento)
function addBubbles(footer) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < 16; i++) {
    const b = el('span', 'bubble');
    const s = 6 + Math.random() * 16;
    b.style.cssText =
      'width:' + s + 'px;height:' + s + 'px;left:' + (Math.random() * 100) + '%;' +
      '--dx:' + (Math.random() * 60 - 30) + 'px;' +
      'animation-duration:' + (9 + Math.random() * 9) + 's;' +
      'animation-delay:-' + (Math.random() * 14) + 's';
    b.setAttribute('aria-hidden', 'true');
    footer.appendChild(b);
  }
}

renderChrome();

// ---------- Home ----------
const catsGrid = document.getElementById('cats-grid');
if (catsGrid) {
  FEATURED.map(s => CATEGORIAS.find(c => c.slug === s)).filter(Boolean).forEach(c => {
    const a = link('produtos.html#' + c.slug, 'cat');
    const first = c.products[0];
    const fig = el('div', 'cat__img');
    if (first) fig.appendChild(img(IMG + first.image, ''));
    a.append(fig, el('h3', null, c.title), el('span', 'cat__n', c.products.length + (c.products.length === 1 ? ' item' : ' itens')));
    catsGrid.appendChild(a);
  });
}

// catálogo mais recente (botões da home, banner e cabeçalhos)
const latest = CATALOGOS[0];
document.querySelectorAll('[data-latest-doc]').forEach(a => {
  if (!latest) return;
  a.href = docUrl(latest);
  a.target = '_blank';
  a.rel = 'noopener';
  a.textContent = (a.dataset.label || 'Baixar catálogo') + ' ' + latest.year;
});
document.querySelectorAll('[data-latest-size]').forEach(s => { if (latest) s.textContent = 'PDF · ' + latest.size; });

// ---------- Central de catálogos ----------
const docsList = document.getElementById('docs-list');
if (docsList) {
  CATALOGOS.forEach((c, i) => {
    const card = el('article', 'doc' + (i === 0 ? ' doc--latest' : ''));
    const cover = el('div', 'doc__cover');
    cover.appendChild(img('assets/img/site/' + c.cover, ''));
    const body = el('div', 'doc__body');
    if (i === 0) body.appendChild(el('span', 'badge', 'Mais recente'));
    body.appendChild(el('h3', null, c.title));
    body.appendChild(el('p', 'doc__meta', 'PDF · ' + c.size + ' · ' + c.year));
    const btns = el('div', 'doc__btns');
    const dl = link(docUrl(c), 'btn btn--primary btn--sm', 'Baixar PDF', true);
    dl.setAttribute('download', c.file);
    btns.append(dl, link(docUrl(c), 'btn btn--ghost btn--sm', 'Abrir', true));
    body.appendChild(btns);
    card.append(cover, body);
    docsList.appendChild(card);
  });
}

// ---------- Contato ----------
const form = document.getElementById('form-contato');
if (form) {
  form.addEventListener('submit', e => {
    e.preventDefault();
    const d = new FormData(form);
    const body = d.get('msg') + '\n\n' + d.get('nome') + ' <' + d.get('email') + '>';
    location.href = 'mailto:contato@fulltechdive.com.br?subject=' +
      encodeURIComponent('Contato pelo site - ' + d.get('nome')) + '&body=' + encodeURIComponent(body);
  });
}

// ---------- Página de produtos ----------
const productsEl = document.getElementById('products');
if (productsEl) {
  const chips = document.getElementById('chips');
  const title = document.getElementById('cat-title');
  const count = document.getElementById('cat-count');

  function card(p) {
    const c = el('article', 'pcard');
    const fig = el('div', 'pcard__img');
    fig.appendChild(img(IMG + p.image, p.name || ''));
    c.appendChild(fig);
    if (p.name || p.details.length) {
      const body = el('div', 'pcard__body');
      if (p.name) body.appendChild(el('h3', null, p.name));
      if (p.details.length) {
        const ul = el('ul', 'specs');
        p.details.forEach(t => ul.appendChild(el('li', null, t)));
        if (p.details.length > 6) {
          const box = el('details', 'more');
          box.appendChild(el('summary', null, 'Ver ficha técnica completa'));
          box.appendChild(ul);
          body.appendChild(box);
        } else {
          body.appendChild(ul);
        }
      }
      body.appendChild(link('contato.html', 'link', 'Solicitar orçamento →'));
      c.appendChild(body);
    } else {
      c.classList.add('pcard--photo');
    }
    return c;
  }

  function show(slug) {
    const cat = CATEGORIAS.find(c => c.slug === slug) || CATEGORIAS[0];
    if (!cat) return;
    title.textContent = cat.title;
    count.textContent = cat.products.length + (cat.products.length === 1 ? ' item nesta categoria' : ' itens nesta categoria');
    document.title = cat.title + ' | Full Tech Dive';
    productsEl.replaceChildren(...cat.products.map(card));
    chips.querySelectorAll('a').forEach(a => {
      const on = a.dataset.slug === cat.slug;
      a.classList.toggle('on', on);
      if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }

  CATEGORIAS.forEach(c => {
    const a = link('#' + c.slug, 'chip', c.title);
    a.dataset.slug = c.slug;
    chips.appendChild(a);
  });

  const fromHash = () => show(decodeURIComponent(location.hash.slice(1)));
  window.addEventListener('hashchange', () => { fromHash(); window.scrollTo({ top: 0 }); });
  fromHash();
}
