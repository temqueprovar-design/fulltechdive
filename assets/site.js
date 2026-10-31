/* Páginas internas (produtos, catálogo, empresa, contato) no estilo da home.
   Monta o cabeçalho e o rodapé iguais aos da home e cuida do que é de cada página. */
(function () {
  'use strict';

  var CATEGORIAS = window.CATEGORIAS || [];
  var CATALOGOS = window.CATALOGOS || [];
  var IMG = 'assets/img/produtos/';
  var DOCS = 'assets/docs/';
  var WHATS = 'https://wa.me/5521988350209';
  var page = document.body.getAttribute('data-page') || '';

  // elemento com texto seguro (sem innerHTML)
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function link(href, cls, text, newTab) {
    var a = el('a', cls, text);
    a.href = href;
    if (newTab) { a.target = '_blank'; a.rel = 'noopener'; }
    return a;
  }
  function img(src, alt) {
    var i = document.createElement('img');
    i.src = src;
    i.alt = alt || '';
    i.loading = 'lazy';
    return i;
  }
  var docUrl = function (c) { return DOCS + encodeURIComponent(c.file); };

  // ---------------------------------------------------------- cabeçalho e rodapé
  var NAV = [
    ['produtos', 'Produtos', 'produtos.html'],
    ['links', 'Links', 'index.html#links'],
    ['empresa', 'A empresa', 'empresa.html'],
    ['contato', 'Contato', 'contato.html']
  ];

  function navLinks(cls) {
    return NAV.map(function (n) {
      return '<a href="' + n[2] + '"' + (n[0] === page ? ' aria-current="page"' : '') + '>' + n[1] + '</a>';
    }).join('');
  }

  var header =
    '<header class="nav solid" id="topo">' +
    '<div class="container nav__in">' +
    '<a class="logo" href="index.html" aria-label="Full Tech Dive - início"><img class="logo__img" src="assets/img/site/logo.png?v=2" alt="Full Tech Dive" width="800" height="392"></a>' +
    '<nav class="nav__links" aria-label="Principal">' + navLinks() + '</nav>' +
    '<div class="nav__act"><a class="btn btn--y" href="catalogos.html">Catálogo</a>' +
    '<button class="burger" aria-label="Abrir menu" aria-expanded="false" aria-controls="menu"><span></span><span></span><span></span></button></div>' +
    '</div>' +
    '<nav class="nav__menu" id="menu" aria-label="Menu">' + navLinks() + '</nav>' +
    '</header>';

  var footer =
    '<footer class="footer"><div class="container"><div class="footer__g">' +
    '<div><a class="logo" href="index.html" aria-label="Full Tech Dive"><img class="logo__img logo__img--f" src="assets/img/site/logo_footer_02.png?v=2" alt="Full Tech Dive" width="800" height="392" loading="lazy"></a>' +
    '<p style="margin-top:16px">Equipamentos para mergulho comercial e subsea.</p></div>' +
    '<div><h4>Navegação</h4><a href="produtos.html">Produtos</a><a href="catalogos.html">Catálogo</a><a href="empresa.html">A empresa</a><a href="contato.html">Contato</a></div>' +
    '<div><h4>Contato</h4><p>Rua Latino Coelho, 22ª<br>Penha, Rio de Janeiro - RJ · CEP: 21070-720</p>' +
    '<a href="tel:+552122707847">(21) 2270-7847</a><a href="tel:+5521988350209">(21) 98835-0209 (WhatsApp)</a>' +
    '<a href="mailto:contato@fulltechdive.com.br">contato@fulltechdive.com.br</a>' +
    '<a href="https://www.instagram.com/fulltechdive/" target="_blank" rel="noopener">Instagram @fulltechdive</a>' +
    '<a href="https://www.facebook.com/fulltechdive/" target="_blank" rel="noopener">Facebook</a></div>' +
    '</div><div class="footer__c">© ' + new Date().getFullYear() + ' Full Tech Dive. Todos os direitos reservados.</div></div></footer>';

  var hostH = document.getElementById('site-header');
  var hostF = document.getElementById('site-footer');
  if (hostH) hostH.outerHTML = header;
  if (hostF) hostF.outerHTML = footer;

  var nav = document.querySelector('.nav');
  var burger = document.querySelector('.burger');
  function setMenu(open) {
    nav.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
  }
  burger.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
  document.querySelector('.nav__menu').addEventListener('click', function (e) { if (e.target.tagName === 'A') setMenu(false); });

  // ---------------------------------------------------------- catálogo mais recente
  var latest = CATALOGOS[0];
  Array.prototype.forEach.call(document.querySelectorAll('[data-latest-doc]'), function (a) {
    if (!latest) return;
    a.href = docUrl(latest);
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = (a.getAttribute('data-label') || 'Baixar catálogo') + ' ' + latest.year + ' ↓';
  });

  // ---------------------------------------------------------- números (empresa)
  var total = CATEGORIAS.reduce(function (n, c) { return n + c.products.length; }, 0);
  var facts = { cats: CATEGORIAS.length, prods: total };
  Array.prototype.forEach.call(document.querySelectorAll('[data-fact]'), function (n) {
    var v = facts[n.getAttribute('data-fact')];
    if (v != null) n.textContent = v;
  });

  // ---------------------------------------------------------- catálogo (lista de PDFs)
  var docsList = document.getElementById('docs-list');
  if (docsList) {
    if (!CATALOGOS.length) docsList.appendChild(el('p', 'muted', 'O catálogo em PDF estará disponível em breve.'));
    CATALOGOS.forEach(function (c) {
      var card = el('article', 'doc');
      var cover = el('div', 'doc__cover');
      cover.appendChild(img('assets/img/site/' + (c.cover || 'catalogoft.jpg'), ''));
      var body = el('div', 'doc__body');
      body.appendChild(el('h2', null, c.title));
      body.appendChild(el('p', 'doc__meta', 'PDF · ' + c.size + ' · ' + c.year));
      var btns = el('div', 'doc__btns');
      var dl = link(docUrl(c), 'btn btn--y', 'Baixar PDF', true);
      dl.setAttribute('download', c.title + '.pdf');
      btns.append(dl, link(docUrl(c), 'btn btn--dark', 'Abrir', true));
      body.appendChild(btns);
      card.append(cover, body);
      docsList.appendChild(card);
    });
  }

  // ---------------------------------------------------------- produtos
  // fotos do produto: uma foto fica parada; duas ou mais viram carrossel (passa sozinho e com o dedo)
  function gallery(p, alt) {
    var list = (p.images && p.images.length) ? p.images : (p.image ? [p.image] : []);
    if (list.length < 2) return img(IMG + (list[0] || ''), alt);
    var wrap = el('div', 'car');
    var track = el('div', 'car__track');
    list.forEach(function (f) { track.appendChild(img(IMG + f, alt)); });
    var dots = el('div', 'car__dots');
    var cur = function () { return Math.round(track.scrollLeft / (track.clientWidth || 1)); };
    var go = function (i) { track.scrollTo({ left: ((i + list.length) % list.length) * track.clientWidth, behavior: 'smooth' }); };
    list.forEach(function (_, i) {
      var d = el('button', 'car__dot');
      d.type = 'button';
      d.setAttribute('aria-label', 'Foto ' + (i + 1));
      d.addEventListener('click', function () { go(i); });
      dots.appendChild(d);
    });
    var mk = function (cls, txt, label, step) {
      var b = el('button', 'car__nav ' + cls, txt);
      b.type = 'button';
      b.setAttribute('aria-label', label);
      b.addEventListener('click', function () { go(cur() + step); });
      return b;
    };
    var mark = function () { var c = cur(); Array.prototype.forEach.call(dots.children, function (d, i) { d.classList.toggle('on', i === c); }); };
    track.addEventListener('scroll', mark, { passive: true });
    wrap.append(track, mk('car__prev', '‹', 'Foto anterior', -1), mk('car__next', '›', 'Próxima foto', 1), dots);
    mark();
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      var hold = false;
      ['pointerenter', 'touchstart', 'focusin'].forEach(function (ev) { wrap.addEventListener(ev, function () { hold = true; }, { passive: true }); });
      ['pointerleave', 'focusout'].forEach(function (ev) { wrap.addEventListener(ev, function () { hold = false; }); });
      setInterval(function () { if (!hold && !document.hidden) go(cur() + 1); }, 4500);
    }
    return wrap;
  }

  var productsEl = document.getElementById('products');
  if (productsEl) {
    var chips = document.getElementById('chips');
    var title = document.getElementById('cat-title');
    var count = document.getElementById('cat-count');

    var card = function (p) {
      var c = el('article', 'pcard');
      var fig = el('div', 'pcard__img');
      fig.appendChild(gallery(p, p.name || ''));
      c.appendChild(fig);
      if (p.name || p.details.length) {
        var body = el('div', 'pcard__body');
        if (p.name) body.appendChild(el('h3', null, p.name));
        if (p.details.length) {
          var ul = el('ul', 'specs');
          p.details.forEach(function (t) { ul.appendChild(el('li', null, t)); });
          if (p.details.length > 6) {
            var box = el('details', 'more');
            box.appendChild(el('summary', null, 'Ver ficha técnica completa'));
            box.appendChild(ul);
            body.appendChild(box);
          } else {
            body.appendChild(ul);
          }
        }
        var msg = 'Olá! Vim pelo site da Full Tech Dive e gostaria de um orçamento: ' + (p.name || title.textContent) + '.';
        body.appendChild(link(WHATS + '?text=' + encodeURIComponent(msg), 'btn btn--y pcard__cta', 'Solicitar orçamento →', true));
        c.appendChild(body);
      } else {
        c.classList.add('pcard--photo');
      }
      return c;
    };

    var show = function (slug) {
      var cat = CATEGORIAS.filter(function (c) { return c.slug === slug; })[0] || CATEGORIAS[0];
      if (!cat) return;
      title.textContent = cat.title;
      count.textContent = cat.products.length + (cat.products.length === 1 ? ' item nesta categoria' : ' itens nesta categoria');
      document.title = cat.title + ' | Full Tech Dive';
      productsEl.replaceChildren.apply(productsEl, cat.products.map(card));
      Array.prototype.forEach.call(chips.querySelectorAll('a'), function (a) {
        var on = a.getAttribute('data-slug') === cat.slug;
        a.classList.toggle('on', on);
        if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
        if (on && a.scrollIntoView) { chips.scrollLeft = Math.max(0, a.offsetLeft - chips.offsetLeft - 8); }
      });
    };

    CATEGORIAS.forEach(function (c) {
      var a = link('#' + c.slug, 'chip', c.title);
      a.setAttribute('data-slug', c.slug);
      chips.appendChild(a);
    });
    var fromHash = function () { show(decodeURIComponent(location.hash.slice(1))); };
    window.addEventListener('hashchange', function () { fromHash(); window.scrollTo({ top: 0 }); });
    fromHash();
  }

  // ---------------------------------------------------------- contato
  var form = document.getElementById('form-contato');
  if (form) {
    var status = document.getElementById('form-status');
    var say = function (txt, ok) { status.textContent = txt; status.className = 'form__msg ' + (ok ? 'ok' : 'err'); status.hidden = false; };
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var data = { nome: d.get('nome'), email: d.get('email'), msg: d.get('msg'), site: d.get('site') || '' };
      var btn = form.querySelector('button[type=submit]');
      btn.disabled = true;
      status.hidden = true;
      var fallback = function () {
        location.href = 'mailto:contato@fulltechdive.com.br?subject=' +
          encodeURIComponent('Contato pelo site - ' + data.nome) +
          '&body=' + encodeURIComponent(data.msg + '\n\n' + data.nome + ' <' + data.email + '>');
      };
      fetch('contato.php', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().then(function (j) { return { r: r, j: j }; }); })
        .then(function (x) {
          btn.disabled = false;
          if (x.j && x.j.ok) { form.reset(); say('Mensagem enviada! Responderemos o mais rápido possível.', true); }
          else say((x.j && x.j.error) || 'Não consegui enviar. Fale com a gente pelo WhatsApp.', false);
        })
        .catch(function () { btn.disabled = false; fallback(); });
    });
  }
})();
