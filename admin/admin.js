/* Painel Full Tech Dive: tudo em português, pensado para usar no celular. */
(function () {
  'use strict';

  var app = document.getElementById('app');
  var S = { user: null, csrf: '', data: null, ping: null };
  var IMG_P = '../assets/img/produtos/';
  var IMG_A = '../assets/img/';
  var DOC = '../assets/docs/';

  // ------------------------------------------------------------ utilidades
  function h(tag, attrs) {
    var n = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v == null || v === false) return;
        if (k === 'class') n.className = v;
        else if (k === 'text') n.textContent = v;
        else if (k.slice(0, 2) === 'on') n.addEventListener(k.slice(2), v);
        else if (v === true) n.setAttribute(k, '');
        else n.setAttribute(k, v);
      });
    }
    for (var i = 2; i < arguments.length; i++) add(n, arguments[i]);
    return n;
  }
  function add(n, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) c.forEach(function (x) { add(n, x); });
    else n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var toastTimer;
  function toast(msg, bad) {
    var t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'show' + (bad ? ' bad' : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = ''; }, bad ? 5000 : 2600);
  }
  function busy(on, txt) {
    document.getElementById('busy').hidden = !on;
    if (txt) document.getElementById('busy-t').textContent = txt;
  }

  function api(action, opts) {
    opts = opts || {};
    var headers = {};
    if (S.csrf) headers['X-CSRF'] = S.csrf;
    var init = { method: opts.body !== undefined ? 'POST' : 'GET', headers: headers, credentials: 'same-origin' };
    if (opts.body instanceof FormData) init.body = opts.body;
    else if (opts.body !== undefined) { init.body = JSON.stringify(opts.body); headers['Content-Type'] = 'application/json'; }
    return fetch('api.php?a=' + action, init).then(function (r) {
      return r.text().then(function (txt) {
        var j;
        try { j = JSON.parse(txt); } catch (e) { throw new Error('O servidor não respondeu direito. Tente de novo em instantes.'); }
        if (r.status === 401 && action !== 'login') { S.user = null; go('#/entrar'); }
        if (!j.ok) { var er = new Error(j.error || 'Erro inesperado.'); er.status = r.status; throw er; }
        return j;
      });
    }, function () { throw new Error('Sem conexão com a internet.'); });
  }

  function go(hash) { if (location.hash === hash) render(); else location.hash = hash; }

  // ------------------------------------------------------------ fotos
  function loadImage(file) {
    return new Promise(function (res, rej) {
      var u = URL.createObjectURL(file), im = new Image();
      im.onload = function () { URL.revokeObjectURL(u); res(im); };
      im.onerror = function () { URL.revokeObjectURL(u); rej(new Error('Não consegui abrir essa foto.')); };
      im.src = u;
    });
  }
  function compress(file, max, q, keepPng) {
    var p = window.createImageBitmap
      ? createImageBitmap(file, { imageOrientation: 'from-image' }).catch(function () { return loadImage(file); })
      : loadImage(file);
    return p.then(function (bmp) {
      var w = bmp.width, hh = bmp.height, sc = Math.min(1, max / Math.max(w, hh));
      var c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(w * sc));
      c.height = Math.max(1, Math.round(hh * sc));
      var x = c.getContext('2d');
      var png = keepPng && file.type === 'image/png';
      if (!png) { x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); }
      x.drawImage(bmp, 0, 0, c.width, c.height);
      return new Promise(function (res, rej) {
        c.toBlob(function (b) { b ? res(b) : rej(new Error('Não consegui preparar a foto.')); }, png ? 'image/png' : 'image/jpeg', q);
      });
    });
  }
  // envia uma ou mais fotos; devolve a lista de nomes salvos no servidor
  function uploadPhotos(files, kind) {
    var list = Array.prototype.slice.call(files), out = [], i = 0;
    var max = kind === 'link' ? 700 : 1400;
    function next() {
      if (i >= list.length) return Promise.resolve(out);
      busy(true, 'Enviando foto ' + (i + 1) + ' de ' + list.length + '…');
      return compress(list[i], max, 0.82, kind === 'link').then(function (blob) {
        var fd = new FormData();
        fd.append('kind', kind);
        fd.append('file', blob, blob.type === 'image/png' ? 'foto.png' : 'foto.jpg');
        return api('upload', { body: fd });
      }).then(function (r) { out.push(r.file); i++; return next(); });
    }
    return next().then(function (r) { busy(false); return r; }, function (e) { busy(false); throw e; });
  }
  function pickFiles(accept, multiple) {
    return new Promise(function (res) {
      var inp = h('input', { type: 'file', accept: accept, multiple: multiple, style: 'display:none' });
      inp.addEventListener('change', function () { res(inp.files); inp.remove(); });
      document.body.appendChild(inp);
      inp.click();
    });
  }

  // ------------------------------------------------------------ salvar
  function saveAll(okMsg) {
    busy(true, 'Salvando…');
    return api('save', { body: { rev: S.data.rev, data: S.data } }).then(function (r) {
      busy(false);
      S.data = r.data;
      toast(okMsg || 'Salvo! Já está no site.');
      return true;
    }, function (e) {
      busy(false);
      toast(e.message, true);
      if (e.status === 409) { loadData().then(render); }
      return false;
    });
  }
  function loadData() { return api('data').then(function (r) { S.data = r.data; }); }

  // ------------------------------------------------------------ estrutura da página
  function page(title, body, opts) {
    opts = opts || {};
    document.body.classList.remove('dark');
    var top = h('div', { class: 'top' },
      opts.back ? h('button', { class: 'back', 'aria-label': 'Voltar', onclick: function () { go(opts.back); } }, '‹') : null,
      h('h1', { text: title }),
      !opts.back && S.user ? h('span', { class: 'who', text: S.user }) : null);
    app.replaceChildren(top, h('div', { class: 'wrap' }, body), opts.foot ? h('div', { class: 'foot' }, h('div', { class: 'in' }, opts.foot)) : null);
    window.scrollTo(0, 0);
  }

  function catBySlug(slug) { return S.data.categorias.filter(function (c) { return c.slug === slug; })[0]; }
  function move(arr, i, d) {
    var j = i + d;
    if (j < 0 || j >= arr.length) return false;
    var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    return true;
  }

  // ------------------------------------------------------------ telas
  function viewLogin() {
    document.body.classList.add('dark');
    var err = h('div', { class: 'err', hidden: true });
    var user = h('input', { type: 'text', autocomplete: 'username', autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false', value: localStorage.getItem('ftd_user') || '', 'aria-label': 'Usuário' });
    var pass = h('input', { type: 'password', autocomplete: 'current-password', 'aria-label': 'Senha' });
    var eye = eyeButton(pass);
    var form = h('form', {
      onsubmit: function (e) {
        e.preventDefault();
        err.hidden = true;
        busy(true, 'Entrando…');
        api('login', { body: { user: user.value, pass: pass.value } }).then(function (r) {
          busy(false);
          try { localStorage.setItem('ftd_user', user.value); } catch (x) {}
          S.user = r.user; S.csrf = r.csrf;
          return loadData().then(function () { go('#/'); });
        }).catch(function (e2) { busy(false); err.textContent = e2.message; err.hidden = false; });
      }
    },
      h('label', { class: 'f', style: 'color:#fff' }, 'Usuário'), user,
      h('label', { class: 'f', style: 'color:#fff' }, 'Senha'), h('div', { class: 'pw' }, pass, eye),
      err,
      h('button', { class: 'btn y block', type: 'submit', style: 'margin-top:18px' }, 'Entrar'),
      h('p', { style: 'text-align:center;margin-top:18px' }, h('a', { href: '#/esqueci', style: 'color:#ffcc00' }, 'Esqueci a senha')));
    app.replaceChildren(h('div', { class: 'login' },
      h('img', { src: '../assets/img/site/logo.png', alt: 'Full Tech Dive' }),
      h('p', { class: 'muted', style: 'color:#9aa;margin:0 0 22px', text: 'Painel do site' }),
      form));
  }

  // olhinho para mostrar/ocultar a senha
  var EYE = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  var EYE_OFF = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.9 17.9A10.9 10.9 0 0 1 12 19C5 19 1 12 1 12a18.5 18.5 0 0 1 5.1-5.9M9.9 5.1A10.5 10.5 0 0 1 12 5c7 0 11 7 11 7a18.5 18.5 0 0 1-2.2 3.2M1 1l22 22"/><path d="M14.1 14.1a3 3 0 0 1-4.2-4.2"/></svg>';
  function eyeButton(input) {
    var b = h('button', { type: 'button', 'aria-label': 'Mostrar senha', title: 'Mostrar senha' });
    b.innerHTML = EYE;
    b.addEventListener('click', function () {
      var show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      b.innerHTML = show ? EYE_OFF : EYE;
      b.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
    });
    return b;
  }
  function passField(label, light) {
    var inp = h('input', { type: 'password', autocomplete: 'new-password' });
    return { input: inp, node: [h('label', { class: 'f', style: light ? 'color:#fff' : null }, label), h('div', { class: 'pw' }, inp, eyeButton(inp))] };
  }

  function viewForgot() {
    document.body.classList.add('dark');
    var user = h('input', { type: 'text', autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false', value: localStorage.getItem('ftd_user') || '', 'aria-label': 'Usuário' });
    var msg = h('div', { class: 'ok', hidden: true });
    var err = h('div', { class: 'err', hidden: true });
    app.replaceChildren(h('div', { class: 'login' },
      h('img', { src: '../assets/img/site/logo.png', alt: 'Full Tech Dive' }),
      h('p', { class: 'muted', style: 'color:#9aa;margin:0 0 22px', text: 'Vamos mandar um link para criar uma nova senha, no e-mail cadastrado.' }),
      h('form', { onsubmit: function (e) {
        e.preventDefault();
        err.hidden = true; msg.hidden = true;
        busy(true, 'Enviando…');
        api('forgot', { body: { user: user.value } }).then(function () {
          busy(false);
          msg.textContent = 'Pronto. Se esse usuário tiver e-mail cadastrado, o link chega em alguns minutos (olhe também o spam). Se não chegar, fale com o suporte.';
          msg.hidden = false;
        }).catch(function (e2) { busy(false); err.textContent = e2.message; err.hidden = false; });
      } },
        h('label', { class: 'f', style: 'color:#fff' }, 'Usuário'), user, err, msg,
        h('button', { class: 'btn y block', type: 'submit', style: 'margin-top:18px' }, 'Enviar o link'),
        h('p', { style: 'text-align:center;margin-top:18px' }, h('a', { href: '#/', style: 'color:#ffcc00' }, 'Voltar para o login')))));
  }

  function viewReset(user, token) {
    document.body.classList.add('dark');
    var p1 = passField('Nova senha (mínimo 8 caracteres)', true), p2 = passField('Repita a nova senha', true);
    var err = h('div', { class: 'err', hidden: true });
    app.replaceChildren(h('div', { class: 'login' },
      h('img', { src: '../assets/img/site/logo.png', alt: 'Full Tech Dive' }),
      h('form', { onsubmit: function (e) {
        e.preventDefault();
        err.hidden = true;
        if (p1.input.value.length < 8) { err.textContent = 'A senha precisa ter pelo menos 8 caracteres.'; err.hidden = false; return; }
        if (p1.input.value !== p2.input.value) { err.textContent = 'As duas senhas não são iguais.'; err.hidden = false; return; }
        busy(true, 'Salvando…');
        api('reset', { body: { user: decodeURIComponent(user), token: token, pass: p1.input.value } }).then(function () {
          busy(false);
          try { localStorage.setItem('ftd_user', decodeURIComponent(user)); } catch (x) {}
          toast('Senha trocada. Entre com a nova senha.');
          go('#/');
        }).catch(function (e2) { busy(false); err.textContent = e2.message; err.hidden = false; });
      } }, p1.node, p2.node, err,
        h('button', { class: 'btn y block', type: 'submit', style: 'margin-top:18px' }, 'Salvar nova senha'))));
  }

  function viewSenha() {
    var cur = passField('Senha atual'), p1 = passField('Nova senha (mínimo 8 caracteres)'), p2 = passField('Repita a nova senha');
    cur.input.autocomplete = 'current-password';
    page('Trocar minha senha', [h('div', { class: 'card' }, cur.node, p1.node, p2.node)], { back: '#/', foot: [
      h('button', { class: 'btn line', onclick: function () { go('#/'); } }, 'Cancelar'),
      h('button', { class: 'btn y', onclick: function () {
        if (p1.input.value.length < 8) { toast('A nova senha precisa ter pelo menos 8 caracteres.', true); return; }
        if (p1.input.value !== p2.input.value) { toast('As duas senhas não são iguais.', true); return; }
        busy(true, 'Salvando…');
        api('passwd', { body: { old: cur.input.value, pass: p1.input.value } }).then(function () { busy(false); toast('Senha trocada.'); go('#/'); })
          .catch(function (e) { busy(false); toast(e.message, true); });
      } }, 'Salvar')] });
  }

  function viewHome() {
    var d = S.data, nProd = 0;
    d.categorias.forEach(function (c) { nProd += c.products.length; });
    var warn = null;
    if (S.ping && S.ping.writable) {
      var w = S.ping.writable;
      var names = { data: 'dados do painel', assets_data: 'assets/data', produtos: 'assets/img/produtos', links: 'assets/img/links', docs: 'assets/docs' };
      var bad = Object.keys(names).filter(function (k) { return !w[k]; }).map(function (k) { return names[k]; });
      if (bad.length) {
        warn = h('div', { class: 'err', text: 'Atenção: o servidor ainda não deixa o painel gravar em: ' + bad.join(', ') + '. Avise o suporte antes de mexer no site.' });
      }
    }
    page('Painel do site', [
      warn,
      h('div', { class: 'tiles' },
        tile('📦', 'Produtos', nProd + ' produtos em ' + d.categorias.length + ' linhas', '#/produtos'),
        tile('🔗', 'Links', d.links.length + ' links', '#/links'),
        tile('📄', 'Catálogo em PDF', d.catalogo && d.catalogo.file ? d.catalogo.title : 'Nenhum', '#/catalogo'),
        tile('🕘', 'Versões anteriores', 'Voltar atrás se errar', '#/versoes')),
      h('div', { class: 'card', style: 'margin-top:16px' },
        h('h2', { text: 'Ver o site' }),
        h('p', { class: 'muted', text: 'Tudo que você salva aparece no site na hora.' }),
        h('a', { class: 'btn line block', href: '../index.html', target: '_blank', rel: 'noopener' }, 'Abrir o site')),
      h('div', { class: 'card' },
        h('h2', { text: 'Instalar no celular' }),
        h('p', { class: 'muted', text: 'No menu do navegador, escolha "Adicionar à tela inicial". O painel passa a abrir como um aplicativo.' })),
      h('a', { class: 'btn line block', href: '#/senha', style: 'margin-bottom:10px' }, 'Trocar minha senha'),
      h('button', { class: 'btn line block', onclick: function () { api('logout', { body: {} }).then(function () { S.user = null; S.csrf = ''; go('#/entrar'); }); } }, 'Sair')
    ]);
  }
  function tile(ic, t, sub, href) {
    return h('a', { class: 'tile', href: href }, h('span', { class: 'ic' }, ic), h('b', { text: t }), h('span', { text: sub }));
  }

  function viewProdutos() {
    var d = S.data;
    page('Produtos', [
      h('div', { class: 'hdr-row' }, h('h2', { text: 'Linhas de produtos' }),
        h('button', { class: 'btn line', onclick: function () {
          var t = prompt('Nome da nova linha de produtos:');
          if (!t || !t.trim()) return;
          d.categorias.push({ slug: '', title: t.trim(), cover: '', products: [] });
          saveAll('Linha criada.').then(function () { render(); });
        } }, '+ Nova linha')),
      d.categorias.map(function (c, i) {
        return h('div', { class: 'item', onclick: function () { go('#/linha/' + c.slug); } },
          h('div', { class: 'grow' }, h('b', { text: c.title }), h('span', { text: c.products.length + (c.products.length === 1 ? ' produto' : ' produtos') })),
          h('span', { class: 'go' }, '›'));
      })
    ], { back: '#/' });
  }

  function viewLinha(slug) {
    var c = catBySlug(slug);
    if (!c) return go('#/produtos');
    page(c.title, [
      h('div', { class: 'hdr-row' }, h('h2', { text: c.products.length + (c.products.length === 1 ? ' produto' : ' produtos') }),
        h('button', { class: 'btn y', onclick: function () { go('#/produto/' + slug + '/novo'); } }, '+ Produto')),
      c.products.map(function (p, i) {
        var thumb = p.images && p.images[0] ? h('img', { src: IMG_P + p.images[0], alt: '', loading: 'lazy' }) : h('div', { class: 'ph', text: 'sem foto' });
        return h('div', { class: 'item', onclick: function () { go('#/produto/' + slug + '/' + i); } },
          thumb,
          h('div', { class: 'grow' }, h('b', { text: p.name || '(sem nome)' }), h('span', { text: (p.images.length > 1 ? p.images.length + ' fotos · ' : '') + (p.details.length ? p.details.length + ' itens na ficha' : 'sem ficha técnica') })),
          h('div', { class: 'row', onclick: function (e) { e.stopPropagation(); } },
            h('button', { class: 'btn line', style: 'min-height:40px;padding:0 12px', 'aria-label': 'Subir', onclick: function () { if (move(c.products, i, -1)) saveAll('Ordem alterada.').then(render); } }, '▲'),
            h('button', { class: 'btn line', style: 'min-height:40px;padding:0 12px', 'aria-label': 'Descer', onclick: function () { if (move(c.products, i, 1)) saveAll('Ordem alterada.').then(render); } }, '▼')));
      }),
      h('div', { class: 'card', style: 'margin-top:20px' },
        h('h2', { text: 'Esta linha' }),
        h('div', { class: 'row wrap2', style: 'margin-top:10px' },
          h('button', { class: 'btn line', onclick: function () {
            var t = prompt('Novo nome da linha:', c.title);
            if (!t || !t.trim()) return;
            c.title = t.trim();
            saveAll('Nome alterado.').then(render);
          } }, 'Renomear'),
          h('button', { class: 'btn red', onclick: function () {
            if (c.products.length) { alert('Para apagar a linha, apague ou mude os produtos dela antes.'); return; }
            if (!confirm('Apagar a linha "' + c.title + '"?')) return;
            S.data.categorias = S.data.categorias.filter(function (x) { return x !== c; });
            saveAll('Linha apagada.').then(function () { go('#/produtos'); });
          } }, 'Apagar linha')))
    ], { back: '#/produtos' });
  }

  function viewProduto(slug, idx) {
    var c = catBySlug(slug);
    if (!c) return go('#/produtos');
    var isNew = idx === 'novo';
    var orig = isNew ? null : c.products[+idx];
    if (!isNew && !orig) return go('#/linha/' + slug);
    var draft = isNew ? { name: '', images: [], details: [], slug: slug } : { name: orig.name, images: orig.images.slice(), details: orig.details.slice(), slug: slug };
    drawProduto();

    function drawProduto() {
      var photos = draft.images.map(function (f, i) {
        return h('div', { class: 'photo' },
          i === 0 ? h('span', { class: 'tag', text: draft.images.length > 1 ? 'Capa' : 'Foto' }) : null,
          h('img', { src: IMG_P + f, alt: '' }),
          h('div', { class: 'bar' },
            h('button', { type: 'button', 'aria-label': 'Mover para trás', onclick: function () { if (move(draft.images, i, -1)) drawProduto(); } }, '◀'),
            h('button', { type: 'button', 'aria-label': 'Mover para frente', onclick: function () { if (move(draft.images, i, 1)) drawProduto(); } }, '▶'),
            h('button', { type: 'button', class: 'x', 'aria-label': 'Tirar foto', onclick: function () { draft.images.splice(i, 1); drawProduto(); } }, '✕')));
      });
      var addPhoto = h('div', { class: 'add', role: 'button', tabindex: '0', onclick: function () {
        pickFiles('image/*', true).then(function (files) {
          if (!files || !files.length) return;
          return uploadPhotos(files, 'product').then(function (names) { draft.images = draft.images.concat(names); drawProduto(); });
        }).catch(function (e) { toast(e.message, true); });
      } }, h('div', null, h('b', { text: '+' }), 'Adicionar fotos'));

      var name = h('input', { type: 'text', value: draft.name, maxlength: '120', placeholder: 'Ex.: Unidade Hidráulica Diesel 10-40', oninput: function () { draft.name = name.value; } });
      var sel = h('select', { onchange: function () { draft.slug = sel.value; } },
        S.data.categorias.map(function (x) { return h('option', { value: x.slug, selected: x.slug === draft.slug, text: x.title }); }));

      var lines = h('div', null, draft.details.map(function (t, i) {
        var inp = h('input', { type: 'text', value: t, maxlength: '220', 'aria-label': 'Item ' + (i + 1), oninput: function () { draft.details[i] = inp.value; },
          onkeydown: function (e) { if (e.key === 'Enter') { e.preventDefault(); draft.details.splice(i + 1, 0, ''); drawProduto(); focusLine(i + 1); } } });
        return h('div', { class: 'line-item' }, inp,
          h('button', { type: 'button', 'aria-label': 'Subir', onclick: function () { if (move(draft.details, i, -1)) drawProduto(); } }, '▲'),
          h('button', { type: 'button', 'aria-label': 'Descer', onclick: function () { if (move(draft.details, i, 1)) drawProduto(); } }, '▼'),
          h('button', { type: 'button', class: 'x', 'aria-label': 'Apagar item', onclick: function () { draft.details.splice(i, 1); drawProduto(); } }, '✕'));
      }));

      var save = h('button', { class: 'btn y', onclick: function () {
        var details = draft.details.map(function (s) { return s.trim(); }).filter(Boolean);
        if (!draft.name.trim()) { toast('Escreva o nome do produto.', true); return; }
        if (!draft.images.length) { toast('Coloque pelo menos uma foto.', true); return; }
        var prod = { name: draft.name.trim(), images: draft.images.slice(), image: draft.images[0], details: details };
        if (!isNew) c.products.splice(+idx, 1, prod);
        var target = catBySlug(draft.slug) || c;
        if (isNew) target.products.push(prod);
        else if (target !== c) { c.products.splice(c.products.indexOf(prod), 1); target.products.push(prod); }
        saveAll().then(function (ok) { if (ok) go('#/linha/' + target.slug); });
      } }, 'Salvar produto');

      var foot = [h('button', { class: 'btn line', onclick: function () { go('#/linha/' + slug); } }, 'Cancelar'), save];
      page(isNew ? 'Novo produto' : 'Editar produto', [
        h('label', { class: 'f', text: 'Fotos' }),
        h('div', { class: 'photos' }, photos, addPhoto),
        h('p', { class: 'tips', text: draft.images.length > 1 ? 'Com mais de uma foto, o site passa elas como carrossel. A primeira é a capa. Use ◀ ▶ para mudar a ordem.' : 'Pode colocar uma foto só. Se colocar mais, o site passa como carrossel.' }),
        h('label', { class: 'f', text: 'Nome do produto' }), name,
        h('label', { class: 'f', text: 'Linha' }), sel,
        h('label', { class: 'f', text: 'Ficha técnica' }),
        h('p', { class: 'tips', style: 'margin:0 0 8px', text: 'Um item por linha, como "Peso: 173 kg". Aperte Enter para criar o próximo.' }),
        lines,
        h('button', { type: 'button', class: 'btn line', onclick: function () { draft.details.push(''); drawProduto(); focusLine(draft.details.length - 1); } }, '+ Adicionar item'),
        isNew ? null : h('div', { style: 'margin-top:28px' }, h('button', { type: 'button', class: 'btn red block', onclick: function () {
          if (!confirm('Apagar este produto do site?')) return;
          c.products.splice(+idx, 1);
          saveAll('Produto apagado.').then(function (ok) { if (ok) go('#/linha/' + slug); });
        } }, 'Apagar produto'))
      ], { back: '#/linha/' + slug, foot: foot });
    }
    function focusLine(i) {
      setTimeout(function () { var l = app.querySelectorAll('.line-item input')[i]; if (l) l.focus(); }, 30);
    }
  }

  function viewLinks() {
    var d = S.data;
    page('Links', [
      h('div', { class: 'hdr-row' }, h('h2', { text: 'Links do site' }), h('button', { class: 'btn y', onclick: function () { go('#/link/novo'); } }, '+ Link')),
      d.links.map(function (l, i) {
        return h('div', { class: 'item', onclick: function () { go('#/link/' + i); } },
          l.image ? h('img', { src: IMG_A + l.image, alt: '' }) : h('div', { class: 'ph', text: 'sem logo' }),
          h('div', { class: 'grow' }, h('b', { text: l.name }), h('span', { text: l.url })),
          h('div', { class: 'row', onclick: function (e) { e.stopPropagation(); } },
            h('button', { class: 'btn line', style: 'min-height:40px;padding:0 12px', 'aria-label': 'Subir', onclick: function () { if (move(d.links, i, -1)) saveAll('Ordem alterada.').then(render); } }, '▲'),
            h('button', { class: 'btn line', style: 'min-height:40px;padding:0 12px', 'aria-label': 'Descer', onclick: function () { if (move(d.links, i, 1)) saveAll('Ordem alterada.').then(render); } }, '▼')));
      })
    ], { back: '#/' });
  }

  function viewLink(idx) {
    var d = S.data, isNew = idx === 'novo', orig = isNew ? null : d.links[+idx];
    if (!isNew && !orig) return go('#/links');
    var draft = isNew ? { name: '', url: '', image: '' } : clone(orig);
    drawLink();
    function drawLink() {
      var name = h('input', { type: 'text', value: draft.name, maxlength: '80', oninput: function () { draft.name = name.value; } });
      var url = h('input', { type: 'url', value: draft.url, placeholder: 'https://', autocapitalize: 'none', oninput: function () { draft.url = url.value; } });
      var logo = h('div', { class: 'photos' },
        draft.image ? h('div', { class: 'photo' }, h('img', { src: IMG_A + draft.image, alt: '' }),
          h('div', { class: 'bar' }, h('button', { type: 'button', class: 'x', onclick: function () { draft.image = ''; drawLink(); } }, 'Tirar logo'))) : null,
        h('div', { class: 'add', role: 'button', tabindex: '0', onclick: function () {
          pickFiles('image/*', false).then(function (files) {
            if (!files || !files.length) return;
            return uploadPhotos(files, 'link').then(function (n) { draft.image = n[0]; drawLink(); });
          }).catch(function (e) { toast(e.message, true); });
        } }, h('div', null, h('b', { text: '+' }), draft.image ? 'Trocar logo' : 'Colocar logo')));
      page(isNew ? 'Novo link' : 'Editar link', [
        h('label', { class: 'f', text: 'Logo ou imagem' }), logo,
        h('label', { class: 'f', text: 'Nome' }), name,
        h('label', { class: 'f', text: 'Endereço do site' }), url,
        isNew ? null : h('div', { style: 'margin-top:28px' }, h('button', { class: 'btn red block', onclick: function () {
          if (!confirm('Apagar este link do site?')) return;
          d.links.splice(+idx, 1);
          saveAll('Link apagado.').then(function (ok) { if (ok) go('#/links'); });
        } }, 'Apagar link'))
      ], { back: '#/links', foot: [
        h('button', { class: 'btn line', onclick: function () { go('#/links'); } }, 'Cancelar'),
        h('button', { class: 'btn y', onclick: function () {
          if (!draft.name.trim() || !draft.url.trim()) { toast('Preencha o nome e o endereço.', true); return; }
          var l = { name: draft.name.trim(), url: draft.url.trim(), image: draft.image };
          if (isNew) d.links.push(l); else d.links.splice(+idx, 1, l);
          saveAll().then(function (ok) { if (ok) go('#/links'); });
        } }, 'Salvar link')] });
    }
  }

  function viewCatalogo() {
    var d = S.data, cur = d.catalogo && d.catalogo.file ? d.catalogo : null;
    var draft = cur ? clone(cur) : { title: 'Catálogo FullTech ' + new Date().getFullYear(), year: new Date().getFullYear(), file: '', cover: 'catalogoft.jpg' };
    var pending = false;
    drawCat();
    function drawCat() {
      var title = h('input', { type: 'text', value: draft.title, maxlength: '100', oninput: function () { draft.title = title.value; } });
      var year = h('input', { type: 'number', value: draft.year, oninput: function () { draft.year = +year.value; } });
      var max = S.ping && S.ping.upload_max ? S.ping.upload_max : '';
      page('Catálogo em PDF', [
        h('div', { class: 'card' },
          h('h2', { text: draft.file ? 'Catálogo atual' : 'Nenhum catálogo' }),
          draft.file ? h('p', { class: 'muted', text: draft.title + (cur && cur.size && !pending ? ' · ' + cur.size : '') }) : null,
          draft.file ? h('a', { class: 'btn line', href: DOC + encodeURIComponent(draft.file), target: '_blank', rel: 'noopener' }, 'Abrir o PDF') : null),
        h('button', { class: 'btn y block', onclick: function () {
          pickFiles('application/pdf', false).then(function (files) {
            if (!files || !files.length) return;
            var f = files[0];
            busy(true, 'Enviando o PDF…');
            var fd = new FormData();
            fd.append('kind', 'pdf');
            fd.append('file', f, 'catalogo.pdf');
            return api('upload', { body: fd }).then(function (r) { busy(false); draft.file = r.file; pending = true; drawCat(); toast('PDF enviado. Agora toque em Salvar.'); });
          }).catch(function (e) { busy(false); toast(e.message, true); });
        } }, draft.file ? 'Trocar o PDF' : 'Enviar o PDF'),
        max ? h('p', { class: 'tips', text: 'Tamanho máximo do arquivo: ' + max + '.' }) : null,
        h('label', { class: 'f', text: 'Título (aparece no botão de baixar)' }), title,
        h('label', { class: 'f', text: 'Ano' }), year
      ], { back: '#/', foot: [
        h('button', { class: 'btn line', onclick: function () { go('#/'); } }, 'Cancelar'),
        h('button', { class: 'btn y', onclick: function () {
          if (!draft.file) { toast('Envie o PDF primeiro.', true); return; }
          d.catalogo = { title: draft.title, year: draft.year, file: draft.file, cover: draft.cover };
          saveAll().then(function (ok) { if (ok) go('#/'); });
        } }, 'Salvar')] });
    }
  }

  function viewVersoes() {
    page('Versões anteriores', h('p', { class: 'muted', text: 'Carregando…' }), { back: '#/' });
    api('backups').then(function (r) {
      var list = r.backups;
      page('Versões anteriores', [
        h('p', { class: 'muted', text: 'Cada vez que você salva, o painel guarda a versão de antes. Se algo der errado, volte para uma delas.' }),
        list.length ? list.map(function (b) {
          var when = b.at ? new Date(b.at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : b.id;
          return h('div', { class: 'item', style: 'cursor:default' },
            h('div', { class: 'grow' }, h('b', { text: when }), h('span', { text: b.products + ' produtos · ' + b.links + ' links' + (b.by ? ' · ' + b.by : '') })),
            h('button', { class: 'btn line', onclick: function () {
              if (!confirm('Voltar o site para a versão de ' + when + '? A versão atual também fica guardada.')) return;
              busy(true, 'Restaurando…');
              api('restore', { body: { id: b.id } }).then(function (rr) { busy(false); S.data = rr.data; toast('Versão restaurada.'); go('#/'); })
                .catch(function (e) { busy(false); toast(e.message, true); });
            } }, 'Restaurar'));
        }) : h('p', { class: 'muted', text: 'Ainda não há versões anteriores.' })
      ], { back: '#/' });
    }).catch(function (e) { toast(e.message, true); });
  }

  // ------------------------------------------------------------ rotas
  function render() {
    var rr = (location.hash || '#/').replace(/^#\/?/, '').split('/');
    if (!S.user) {
      if (rr[0] === 'esqueci') return viewForgot();
      if (rr[0] === 'redefinir') return viewReset(rr[1] || '', rr[2] || '');
      return viewLogin();
    }
    if (!S.data) { page('Painel do site', h('p', { class: 'muted', text: 'Carregando…' })); return loadData().then(render, function (e) { toast(e.message, true); }); }
    var p = (location.hash || '#/').replace(/^#\/?/, '').split('/');
    var r = p[0];
    try {
      if (r === '' ) return viewHome();
      if (r === 'produtos') return viewProdutos();
      if (r === 'linha') return viewLinha(p[1]);
      if (r === 'produto') return viewProduto(p[1], p[2]);
      if (r === 'links') return viewLinks();
      if (r === 'link') return viewLink(p[1]);
      if (r === 'catalogo') return viewCatalogo();
      if (r === 'versoes') return viewVersoes();
      if (r === 'senha') return viewSenha();
      if (r === 'entrar') return go('#/');
    } catch (e) { toast('Algo deu errado: ' + e.message, true); }
    viewHome();
  }

  window.addEventListener('hashchange', render);

  // ------------------------------------------------------------ início
  api('me').then(function (r) {
    if (r.user) { S.user = r.user; S.csrf = r.csrf; }
    return S.user ? api('ping').then(function (p) { S.ping = p; }, function () {}) : null;
  }).then(function () {
    if (S.user) return loadData();
  }).then(render, function (e) {
    app.replaceChildren(h('div', { class: 'wrap' }, h('div', { class: 'err', text: e.message })));
  });

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(function () {});
})();
