// ---------- Hero em carrossel ----------
const heroRoot = document.getElementById('hero-slider');
const SLIDES = window.HERO_SLIDES || [];

if (heroRoot && SLIDES.length) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wrap = el('div', 'slides');
  const dots = el('div', 'dots');
  let cur = 0;
  let timer = null;

  const slideEls = SLIDES.map((s, i) => {
    const slide = el('article', 'slide');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', (i + 1) + ' de ' + SLIDES.length);

    const text = el('div', 'slide__text');
    text.append(el('p', 'eyebrow', s.kicker), el('h1', null, s.title), el('p', 'lead', s.text));

    const specs = el('ul', 'specs3');
    s.specs.forEach(sp => {
      const li = el('li');
      const v = el('strong');
      const num = el('span', 'num', sp.value);
      num.dataset.val = sp.value;
      v.append(num, el('small', null, sp.unit));
      li.append(v, el('span', null, sp.label));
      specs.appendChild(li);
    });
    text.appendChild(specs);

    const btns = el('div', 'slide__btns');
    btns.appendChild(link(s.href, 'btn btn--machine', s.cta));
    if (CATALOGOS[0]) btns.appendChild(link(docUrl(CATALOGOS[0]), 'btn btn--steel', 'Baixar catálogo ' + CATALOGOS[0].year, true));
    text.appendChild(btns);

    const media = el('div', 'slide__media');
    const hole = el('div', 'porthole');
    const im = img(s.image, s.kicker);
    im.loading = i === 0 ? 'eager' : 'lazy';
    im.style.objectPosition = s.focus || '50% 50%';
    hole.appendChild(im);
    media.appendChild(hole);

    slide.append(text, media);
    wrap.appendChild(slide);
    return slide;
  });

  const dotEls = SLIDES.map((s, i) => {
    const d = el('button', 'dot');
    d.type = 'button';
    d.setAttribute('aria-label', 'Ir para ' + s.kicker);
    d.addEventListener('click', () => { go(i); restart(); });
    dots.appendChild(d);
    return d;
  });

  // contagem do display: sobe de 0 até o valor, como um instrumento ligando
  function countUp(slide) {
    slide.querySelectorAll('.num').forEach(n => {
      const target = parseInt(n.dataset.val, 10);
      if (reduced || isNaN(target)) { n.textContent = n.dataset.val; return; }
      const t0 = performance.now();
      const tick = now => {
        const p = Math.min(1, (now - t0) / 900);
        n.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
        if (p < 1 && slide.classList.contains('on')) requestAnimationFrame(tick);
        else n.textContent = n.dataset.val;
      };
      requestAnimationFrame(tick);
    });
  }

  function go(i) {
    cur = (i + SLIDES.length) % SLIDES.length;
    slideEls.forEach((s, k) => {
      const on = k === cur;
      s.classList.toggle('on', on);
      s.setAttribute('aria-hidden', String(!on));
      s.inert = !on;
    });
    dotEls.forEach((d, k) => d.setAttribute('aria-current', String(k === cur)));
    countUp(slideEls[cur]);
  }

  function ctrlBtn(label, glyph, step) {
    const b = el('button', 'ctrl__btn', glyph);
    b.type = 'button';
    b.setAttribute('aria-label', label);
    b.addEventListener('click', () => { go(cur + step); restart(); });
    return b;
  }

  const ctrl = el('div', 'ctrl');
  ctrl.append(ctrlBtn('Produto anterior', '‹', -1), ctrlBtn('Próximo produto', '›', 1), dots);

  function restart() {
    clearInterval(timer);
    if (!reduced && SLIDES.length > 1) timer = setInterval(() => go(cur + 1), 7000);
  }

  // deslizar no celular
  let x0 = null;
  wrap.addEventListener('pointerdown', e => { x0 = e.clientX; });
  wrap.addEventListener('pointerup', e => {
    if (x0 != null && Math.abs(e.clientX - x0) > 50) { go(cur + (e.clientX < x0 ? 1 : -1)); restart(); }
    x0 = null;
  });
  heroRoot.addEventListener('mouseenter', () => clearInterval(timer));
  heroRoot.addEventListener('mouseleave', restart);
  heroRoot.addEventListener('focusin', () => clearInterval(timer));
  heroRoot.addEventListener('focusout', restart);

  heroRoot.append(wrap, ctrl);
  go(0);
  restart();
}

// ---------- Profundímetro ----------
(function depthGauge() {
  const MAX = 100;
  const gauge = el('aside', 'depth');
  gauge.setAttribute('aria-hidden', 'true');
  const track = el('div', 'depth__track');
  gauge.appendChild(track);
  for (let m = 0; m <= MAX; m += 10) {
    const t = el('span', 'depth__tick' + (m % 50 === 0 ? ' depth__tick--major' : ''));
    t.style.top = (m / MAX * 100) + '%';
    gauge.appendChild(t);
  }
  const marker = el('div', 'depth__marker');
  const val = el('span', null, '0 m');
  marker.appendChild(val);
  gauge.appendChild(marker);

  const pill = el('div', 'depth__pill');
  pill.setAttribute('aria-hidden', 'true');
  const pillVal = el('span', null, '0 m');
  pill.append(el('small', null, 'PROF.'), pillVal);

  document.body.append(gauge, pill);

  let raf = 0;
  function update() {
    raf = 0;
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    const m = Math.round(p * MAX);
    marker.style.top = (p * 100) + '%';
    val.textContent = m + ' m';
    pillVal.textContent = m + ' m';
  }
  addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
  addEventListener('resize', update);
  update();
})();

// ---------- Faixa de números (valores vêm dos dados) ----------
(function facts() {
  const set = (k, v) => { const n = document.querySelector('[data-fact="' + k + '"]'); if (n) n.textContent = v; };
  set('cats', CATEGORIAS.length);
  set('prods', CATEGORIAS.reduce((n, c) => n + c.products.length, 0));
  set('brands', document.querySelectorAll('.partner').length);
})();
