/* Homepage: category navigation, featured product and circular product rail. */
(function (root) {
  'use strict';
  const {CATEGORIES, PRODUCTS} = root.Catalogue;
  const D = root.SiteData;
  const $ = id => document.getElementById(id);
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const state = {cat: 'all', id: 'shuttlecocks', token: 0};

  const catLabel = id => (CATEGORIES.find(c => c.id === id) || {}).label || '';
  const visible = () => PRODUCTS.filter(p => state.cat === 'all' || p.category === state.cat);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));

  function renderNav() {
    $('catNav').innerHTML = CATEGORIES.map(c =>
      `<li><button type="button" data-cat="${c.id}" aria-pressed="${c.id === state.cat}">${c.label}</button></li>`).join('');
  }

  function renderRail() {
    const list = visible();
    $('rail').innerHTML = list.map(p => `
      <li><button type="button" class="disc-item" data-id="${p.id}" aria-pressed="${p.id === state.id}" aria-label="${esc(p.name)}, ${esc(catLabel(p.category))}" tabindex="${p.id === state.id ? 0 : -1}">
        <span class="disc"><img src="${p.disc}" alt="" width="160" height="160" loading="lazy" decoding="async" draggable="false"></span>
        <span class="disc-name">${esc(p.name)}</span>
      </button></li>`).join('');
    updateArrows();
  }

  function priceBlock(p, s) {
    if (s.kind === 'retail') {
      const ch = s.change ? `<span class="chip ${s.change.pct >= 0 ? 'up' : 'down'}" title="Change from ${D.fmtDate(s.change.from.date)} to ${D.fmtDate(s.change.to.date)}">${s.change.pct >= 0 ? '+' : '−'}${Math.abs(s.change.pct).toFixed(1)}% <span class="sr-only">since</span><small>vs ${D.fmtDate(s.change.from.date, {day: 'numeric', month: 'short'})}</small></span>` : '';
      const pending = s.status !== 'verified' ? '<p class="flag">Transcribed from ACCC reports · awaiting editorial verification</p>' : '';
      return `<p class="label">Latest observed price · Australia</p>
        <p class="big"><span>${s.display}</span> <span class="unit">/ litre</span> ${ch}</p>
        <p class="meta">${esc(s.spec)} · ${D.fmtDate(s.date)} · ${esc(s.publisher)}</p>${pending}`;
    }
    if (s.kind === 'index') {
      const ch = s.change ? `<span class="chip ${s.change.pct >= 0 ? 'up' : 'down'}">${s.change.pct >= 0 ? '+' : '−'}${Math.abs(s.change.pct).toFixed(1)}% <small>month</small></span>` : '';
      return `<p class="label">Latest price index · Sydney</p>
        <p class="big"><span>${s.display}</span> <span class="unit">index points</span> ${ch}</p>
        <p class="meta">Beef and veal CPI (Sep 2025 = 100) · ${D.fmtDate(s.period + '-01', {month: 'short', year: 'numeric'})} · ABS</p>
        <p class="flag">An index, not a shelf price in dollars</p>`;
    }
    return `<p class="label">Australian price data</p><p class="unavail">No verified Australian price series yet</p>
      <p class="meta">${esc(s.note || '')}</p>`;
  }

  async function feature(id, {fromRail = false} = {}) {
    const p = PRODUCTS.find(x => x.id === id) || PRODUCTS[0];
    state.id = p.id;
    const token = ++state.token;
    const all = PRODUCTS, idx = all.indexOf(p);
    const text = $('featureText'), vis = $('featureVisual');
    const animate = !reduceMotion();
    if (animate) { text.classList.add('leaving'); vis.classList.add('leaving'); await new Promise(r => setTimeout(r, 180)); }
    if (token !== state.token) return;

    $('fCat').textContent = catLabel(p.category);
    $('fName').textContent = p.name;
    $('fHeadline').textContent = p.headline;
    $('fSummary').textContent = p.summary;
    $('fIndex').textContent = String(idx + 1).padStart(2, '0');
    $('fTotal').textContent = all.length;
    const read = $('fRead');
    read.href = '#/story/' + p.id;
    read.innerHTML = p.storyReady ? 'Read the story <span aria-hidden="true">→</span>' : 'Preview the story <span class="soon">Phase 2</span> <span aria-hidden="true">→</span>';
    const img = $('fImg');
    img.src = p.hero || p.photo || p.disc;
    img.alt = p.alt;
    vis.dataset.mode = p.hero ? 'photo' : 'disc';
    $('atmosImg').style.backgroundImage = `url("${p.hero || p.disc}")`;
    document.body.dataset.product = p.id;
    $('fPrice').innerHTML = '<p class="label">Loading price…</p>';

    document.querySelectorAll('.disc-item').forEach(b => {
      const on = b.dataset.id === p.id;
      b.setAttribute('aria-pressed', on);
      b.tabIndex = on ? 0 : -1;
      if (on && !fromRail) centerInRail(b.closest('li'), animate);
    });
    text.classList.remove('leaving'); vis.classList.remove('leaving');

    try {
      const s = await D.summary(p);
      if (token === state.token) $('fPrice').innerHTML = priceBlock(p, s);
    } catch (e) {
      if (token === state.token) $('fPrice').innerHTML = '<p class="label">Australian price data</p><p class="unavail">Price data could not be loaded</p>';
    }
  }

  function step(dir) {
    const list = visible();
    let i = list.findIndex(p => p.id === state.id);
    i = (i + dir + list.length) % list.length;
    feature(list[i].id);
  }

  function setCategory(cat) {
    state.cat = cat;
    renderNav();
    renderRail();
    const list = visible();
    if (!list.some(p => p.id === state.id)) feature(list[0].id);
    $('rail').scrollTo({left: 0});
  }

  // Scroll only the rail horizontally; never move the page vertically.
  function centerInRail(li, smooth) {
    const r = $('rail');
    const left = li.offsetLeft - (r.clientWidth - li.offsetWidth) / 2;
    r.scrollTo({left: Math.max(0, left), behavior: smooth ? 'smooth' : 'auto'});
  }

  // ---- Rail scrolling: drag, wheel, trackpad, touch (native), arrows, keys
  function updateArrows() {
    const r = $('rail');
    $('railPrev').disabled = r.scrollLeft <= 2;
    $('railNext').disabled = r.scrollLeft + r.clientWidth >= r.scrollWidth - 2;
  }

  function bindRail() {
    const r = $('rail');
    r.addEventListener('scroll', () => requestAnimationFrame(updateArrows), {passive: true});
    addEventListener('resize', updateArrows);
    $('railPrev').onclick = () => r.scrollBy({left: -r.clientWidth * .7, behavior: reduceMotion() ? 'auto' : 'smooth'});
    $('railNext').onclick = () => r.scrollBy({left: r.clientWidth * .7, behavior: reduceMotion() ? 'auto' : 'smooth'});

    // Vertical mouse-wheel over the rail scrolls it sideways, only while it can still move.
    r.addEventListener('wheel', e => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const max = r.scrollWidth - r.clientWidth;
      if ((e.deltaY < 0 && r.scrollLeft <= 0) || (e.deltaY > 0 && r.scrollLeft >= max)) return;
      e.preventDefault();
      r.scrollLeft += e.deltaY;
    }, {passive: false});

    // Mouse drag (touch and pen use native scrolling).
    let drag = null;
    r.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = {x: e.clientX, left: r.scrollLeft, moved: false};
    });
    addEventListener('pointermove', e => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 5) { drag.moved = true; r.classList.add('dragging'); }
      if (drag.moved) r.scrollLeft = drag.left - dx;
    });
    addEventListener('pointerup', () => {
      if (drag && drag.moved) {
        r.classList.remove('dragging');
        const suppress = ev => { ev.stopPropagation(); ev.preventDefault(); };
        r.addEventListener('click', suppress, {capture: true, once: true});
        setTimeout(() => r.removeEventListener('click', suppress, {capture: true}), 0);
      }
      drag = null;
    });

    r.addEventListener('click', e => {
      const b = e.target.closest('.disc-item');
      if (b) feature(b.dataset.id, {fromRail: true});
    });
    r.addEventListener('keydown', e => {
      const keys = {ArrowRight: 1, ArrowLeft: -1, Home: 'first', End: 'last'};
      if (!(e.key in keys)) return;
      e.preventDefault();
      const items = [...r.querySelectorAll('.disc-item')];
      let i = items.indexOf(document.activeElement);
      i = keys[e.key] === 'first' ? 0 : keys[e.key] === 'last' ? items.length - 1 : Math.max(0, Math.min(items.length - 1, i + keys[e.key]));
      items[i].focus();
      centerInRail(items[i].closest('li'), !reduceMotion());
      feature(items[i].dataset.id, {fromRail: true});
    });
  }

  // ---- Search
  function bindSearch() {
    const btn = $('searchBtn'), panel = $('searchPanel'), input = $('searchInput'), out = $('searchResults');
    const close = () => { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
    btn.onclick = () => {
      const open = panel.hidden;
      panel.hidden = !open; btn.setAttribute('aria-expanded', String(open));
      if (open) { input.value = ''; draw(); input.focus(); }
    };
    const matches = () => {
      const q = input.value.trim().toLowerCase();
      return PRODUCTS.filter(p => !q || (p.name + ' ' + p.theme + ' ' + catLabel(p.category)).toLowerCase().includes(q));
    };
    function draw() {
      const m = matches();
      out.innerHTML = m.length ? m.map(p => `<li><a href="#/" data-id="${p.id}"><span>${esc(p.name)}</span><small>${esc(p.theme)}</small></a></li>`).join('')
        : '<li class="none">No product matches. Try “fuel”, “housing” or “weather”.</li>';
    }
    input.addEventListener('input', draw);
    out.addEventListener('click', e => {
      const a = e.target.closest('a[data-id]'); if (!a) return;
      e.preventDefault(); close(); go(a.dataset.id);
    });
    panel.addEventListener('submit', e => { e.preventDefault(); const m = matches(); if (m[0]) { close(); go(m[0].id); } });
    addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) { close(); btn.focus(); } });
    function go(id) {
      if (location.hash.startsWith('#/story') || location.hash.startsWith('#/sources')) location.hash = '#/';
      if (state.cat !== 'all') setCategory('all');
      feature(id);
    }
  }

  function init() {
    renderNav();
    renderRail();
    bindRail();
    bindSearch();
    $('catNav').addEventListener('click', e => {
      const b = e.target.closest('button[data-cat]'); if (!b) return;
      if (location.hash.length > 2) location.hash = '#/';
      setCategory(b.dataset.cat);
    });
    $('prevFeat').onclick = () => step(-1);
    $('nextFeat').onclick = () => step(1);
    feature(state.id);
  }

  root.Home = {init, feature, get state() { return state; }};
})(window);
