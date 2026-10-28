const burger = document.querySelector('.burger');
const nav = document.getElementById('nav');

function setMenu(open) {
  nav.classList.toggle('open', open);
  burger.setAttribute('aria-expanded', String(open));
}

burger.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
nav.addEventListener('click', e => { if (e.target.tagName === 'A') setMenu(false); });

document.getElementById('ano').textContent = new Date().getFullYear();

const CATEGORIAS = window.CATEGORIAS || [];
const IMG = 'assets/img/produtos/';

// cria elemento com texto seguro (sem innerHTML)
function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function img(src, alt) {
  const i = document.createElement('img');
  i.src = IMG + src;
  i.alt = alt || '';
  i.loading = 'lazy';
  return i;
}

// ---------- Home ----------
const catsGrid = document.getElementById('cats-grid');
if (catsGrid) {
  CATEGORIAS.forEach(c => {
    const a = el('a', 'cat');
    a.href = 'produtos.html#' + c.slug;
    const first = c.products[0];
    if (first) a.appendChild(img(first.image, ''));
    a.appendChild(el('h3', null, c.title));
    a.appendChild(el('span', 'cat__n', c.products.length + (c.products.length === 1 ? ' item' : ' itens')));
    catsGrid.appendChild(a);
  });

  const total = CATEGORIAS.reduce((n, c) => n + c.products.length, 0);
  const sc = document.querySelector('[data-stat="cats"]');
  const sp = document.querySelector('[data-stat="prods"]');
  if (sc) sc.textContent = CATEGORIAS.length;
  if (sp) sp.textContent = total;
}

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
    fig.appendChild(img(p.image, p.name || ''));
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
      const q = el('a', 'link', 'Solicitar orçamento →');
      q.href = 'index.html#contato';
      body.appendChild(q);
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
    const a = el('a', 'chip', c.title);
    a.href = '#' + c.slug;
    a.dataset.slug = c.slug;
    chips.appendChild(a);
  });

  const fromHash = () => show(decodeURIComponent(location.hash.slice(1)));
  window.addEventListener('hashchange', () => { fromHash(); window.scrollTo({ top: 0 }); });
  fromHash();
}
