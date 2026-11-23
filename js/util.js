'use strict';
/* Utilitats compartides: DOM, emmagatzematge, icones, formularis i diàlegs */
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const MM = 96 / 25.4;                                   // píxels CSS per mil·límetre
const uid = () => Math.random().toString(36).slice(2, 9);
const clone = o => JSON.parse(JSON.stringify(o));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const round = (v, d = 1) => Math.round(v * 10 ** d) / 10 ** d;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const debounce = (f, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };
const ls = (k, v) => { try { if (v === undefined) return JSON.parse(localStorage.getItem('pp.' + k)); localStorage.setItem('pp.' + k, JSON.stringify(v)); return true; } catch { return v === undefined ? null : false; } };

// Crea un element: h('div', {class:'x', onclick:f, html:'...'}, fills...)
function h(tag, at = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(at)) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v; else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (k in e && typeof v !== 'string') e[k] = v; else e.setAttribute(k, v);
  }
  e.append(...kids.flat().filter(x => x != null));
  return e;
}

// Icones pròpies (traç de 24×24)
const ICONS = {
  new: 'M6 3h8l4 4v14H6zM14 3v4h4', open: 'M3 6h6l2 2h10v11H3z', save: 'M5 3h12l2 2v16H5zM8 3v5h8V3M8 21v-7h8v7',
  print: 'M6 9V3h12v6M6 17H3V9h18v8h-3M6 13h12v8H6z', preview: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  check: 'M4 12l5 5L20 6', undo: 'M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-4', redo: 'M15 14l5-5-5-5M20 9H9a5 5 0 0 0 0 10h4',
  cut: 'M6 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM8.5 7.5L20 19M8.5 16.5L20 5', copy: 'M8 8h12v12H8zM16 8V4H4v12h4',
  paste: 'M8 3h8v4H8zM6 5H4v16h16V5h-2M8 12h8M8 16h5', zin: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-6-6M7 10h6M10 7v6',
  zout: 'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM21 21l-6-6M7 10h6', fit: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
  theme: 'M20 14A8 8 0 1 1 10 4a6.5 6.5 0 0 0 10 10z', studio: 'M3 4h18v16H3zM15 4v16M17.5 8h1M17.5 11h1',
  pointer: 'M5 3l14 8-6.5 1.8L9 19z', hand: 'M8 12V5.5a1.5 1.5 0 0 1 3 0V11M11 10.5V4a1.5 1.5 0 0 1 3 0v7M14 10.5V5.5a1.5 1.5 0 0 1 3 0V12M17 9.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-1a7 7 0 0 1-5.6-2.8l-3-4.5a1.5 1.5 0 0 1 2.4-1.8L8 14',
  art: 'M5 20L12 4l7 16M8 14h8', frame: 'M4 4h16v16H4zM8 8h8M8 12h8M8 16h5', image: 'M3 5h18v14H3zM3 16l5-5 4 4 3-3 6 6M16 8.5a1.5 1.5 0 1 0 0 .1z',
  shape: 'M4 13h8v8H4zM16 3l5 9h-10z', line: 'M4 20L20 4', table: 'M3 5h18v14H3zM3 10h18M3 15h18M9 5v14M15 5v14',
  chart: 'M4 20V11M10 20V4M16 20v-7M2 20h20', cal: 'M4 5h16v15H4zM4 10h16M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2',
  qr: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h2v2h-2zM18 18h2v2h-2zM14 18v2M18 14h2', painter: 'M4 3h13v5H4zM17 5.5h3V11h-8v3M11 14h2v7h-2z',
  alL: 'M4 6h16M4 10h10M4 14h16M4 18h10', alC: 'M4 6h16M7 10h10M4 14h16M7 18h10', alR: 'M4 6h16M10 10h10M4 14h16M10 18h10', alJ: 'M4 6h16M4 10h16M4 14h16M4 18h16',
  ul: 'M9 6h11M9 12h11M9 18h11M4.5 6h.5M4.5 12h.5M4.5 18h.5', ol: 'M10 6h10M10 12h10M10 18h10M4 4h1.5v4M4 14.5a1.5 1.5 0 0 1 3 0c0 1.5-3 2-3 3.5h3',
  front: 'M9 9h11v11H9zM15 9V4H4v11h5', back: 'M4 4h11v11H4zM15 9h5v11H9v-5', trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  plus: 'M12 5v14M5 12h14', up: 'M12 19V5M6 11l6-6 6 6', down: 'M12 5v14M6 13l6 6 6-6', left: 'M15 6l-6 6 6 6', right: 'M9 6l6 6-6 6',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z', lock: 'M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4',
  dup: 'M8 8h12v12H8zM16 8V4H4v12h4M14 11v6M11 14h6', shadow: 'M4 4h12v12H4zM19 8v11H8', crop: 'M6 2v16h16M2 6h16v16', picker: 'M14 4l2-2 6 6-2 2zM15.5 6.5l2 2L8 18l-4 1 1-4z', tpath: 'M3 18c3-9 15-9 18 0M8 7.5l1 2.5M12 6v3M16 7.5l-1 2.5', edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4', ungrp: 'M3 3h7v7H3zM14 14h7v7h-7zM14 3h7v7h-7zM3 14h7v7H3z', menu: 'M4 6h16M4 12h16M4 18h16', close: 'M6 6l12 12M18 6L6 18',
  rot: 'M20 12a8 8 0 1 1-2.4-5.7M20 4v5h-5', flipH: 'M12 3v18M9 7L3 17h6zM15 7l6 10h-6z', flipV: 'M3 12h18M7 9L17 3v6zM7 15l10 6v-6z',
  page: 'M6 3h12v18H6zM9 7h6', pages: 'M8 3h11v15H8zM5 6v15h11', layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5M3 17l9 5 9-5',
  color: 'M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2s-1-2 0-3 3 0 4-1 3-2 3-4a9 9 0 0 0-9-8zM7.5 11h.1M10 7h.1M15 7.5h.1',
  stroke: 'M4 6h16M4 11h16M4 16.5h4M10 16.5h4M16 16.5h4', xf: 'M4 4h6v6H4zM14 14h6v6h-6zM10 7h7v7', text: 'M5 6V4h14v2M12 4v16M9 20h6',
  props: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4', assets: 'M3 7l9-4 9 4-9 4zM3 12l9 4 9-4M12 11v10',
  aL: 'M4 3v18M8 7h12v4H8zM8 14h7v4H8z', aCx: 'M12 3v18M6 7h12v4H6zM8.5 14h7v4h-7z', aR: 'M20 3v18M4 7h12v4H4zM9 14h7v4H9z',
  aT: 'M3 4h18M7 8h4v12H7zM14 8h4v7h-4z', aCy: 'M3 12h18M7 6h4v12H7zM14 8.5h4v7h-4z', aB: 'M3 20h18M7 4h4v12H7zM14 9h4v7h-4z',
  dH: 'M4 3v18M20 3v18M10 7h4v10h-4z', dV: 'M3 4h18M3 20h18M7 10h10v4H7z', master: 'M6 3h12v18H6zM9 15l3-6 3 6', fitT: 'M4 4h16v16H4zM8 9h8M8 13h8M8 17h4',
  upload: 'M12 16V4M7 9l5-5 5 5M4 17v3h16v-3', download: 'M12 4v12M7 11l5 5 5-5M4 17v3h16v-3', web: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  fs: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5M9 9l-5-5M15 9l5-5M15 15l5 5M9 15l-5 5', help: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 1-1 1.7M12 17h.1',
  table2: 'M3 5h18v14H3zM3 10h18M9 5v14M14 13l3 3M17 13l-3 3', grp: 'M3 3h7v7H3zM14 14h7v7h-7zM10 6h4M18 10v4'
};
const LETTERS = { bold: ['B', ''], italic: ['I', 'it'], und: ['U', 'un'] };
const icon = n => ICONS[n] ? `<svg viewBox="0 0 24 24" class="i"><path d="${ICONS[n]}"/></svg>` : LETTERS[n] ? `<b class="ti ${LETTERS[n][1]}">${LETTERS[n][0]}</b>` : `<b class="ti">${n}</b>`;
const btn = (ic, title, fn, cls = 'ib', txt) => h('button', { class: cls, title, html: icon(ic) + (txt ? `<span>${esc(txt)}</span>` : ''), onclick: fn, onpointerdown: e => e.preventDefault() });

// Converteix color (#rgb, #rrggbb, rgb()) a #rrggbb per als <input type=color>
function hex(c) {
  if (!c || c === 'none') return '#ffffff';
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  if (/^#[0-9a-f]{3}$/i.test(c)) return '#' + [...c.slice(1)].map(x => x + x).join('');
  const m = c.match(/\d+/g); return m ? '#' + m.slice(0, 3).map(x => (+x).toString(16).padStart(2, '0')).join('') : '#000000';
}

/* Formulari genèric enllaçat: fields = [[clau, etiqueta, tipus, opcions], ...]
   tipus: num, range, color, sel, chk, txt, area, tog (botó commutador), btn, sep, h (títol) */
function form(fields, get, set, cls = 'form') {
  const f = h('div', { class: cls });
  for (const [k, label, t = 'num', o = {}] of fields) {
    if (t === 'sep') { f.append(h('span', { class: 'sep' })); continue; }
    if (t === 'h') { f.append(h('h4', { text: label })); continue; }
    if (t === 'btn') { f.append(btn(o.icon || 'plus', label, o.fn, o.cls || 'tb', o.text ? label : '')); continue; }
    const v = get(k);
    if (t === 'tog') { const b = btn(o.icon || k, label, () => set(k, o.val !== undefined ? (v === o.val ? o.off ?? o.val : o.val) : !v, true)); b.classList.toggle('on', o.val !== undefined ? v === o.val : !!v); f.append(b); continue; }
    let inp, out;
    if (t === 'sel') inp = h('select', {}, o.list.map(x => { const [val, txt] = Array.isArray(x) ? x : [x, x]; return h('option', { value: val, text: txt, selected: String(val) === String(v) }); }));
    else if (t === 'area') inp = h('textarea', { rows: o.rows || 6, spellcheck: false });
    else inp = h('input', { type: { num: 'number', chk: 'checkbox', txt: 'text', color: 'color', range: 'range' }[t], min: o.min, max: o.max, step: o.step ?? (t === 'num' ? 'any' : 1) });
    if (t === 'chk') inp.checked = !!v; else if (t === 'color') inp.value = hex(col(v)); else if (t !== 'sel') inp.value = typeof v === 'number' ? round(v, 2) : v ?? '';
    if (t === 'range') out = h('output', { text: inp.value });
    const read = () => t === 'chk' ? inp.checked : (t === 'num' || t === 'range' || o.num) ? +inp.value : inp.value;
    inp.oninput = () => { out && (out.textContent = inp.value); t !== 'num' && set(k, read(), false); };
    inp.onchange = () => set(k, read(), true);
    const none = t === 'color' && o.none ? h('button', { class: 'none', title: 'Sense color', text: '∅', onclick: () => set(k, 'none', true) }) : null;
    f.append(h('label', { class: 'fld f-' + t, title: label }, h('span', { text: label }), inp, out, none));
  }
  return f;
}

// Diàleg modal reutilitzable
function dialog(title, body, buttons = [['Tanca']], wide) {
  const d = $('#dlg'); d.onclose = null; d.innerHTML = ''; d.style.width = wide ? 'min(980px,96vw)' : '';
  const foot = h('footer', {}, buttons.map(([t, fn, pri]) => h('button', { text: t, class: pri ? 'pri' : '', onclick: () => { if (fn?.() !== false) d.close(); } })));
  d.append(h('header', {}, h('h3', { text: title }), btn('close', 'Tanca', () => d.close())), h('div', { class: 'body' }, body), foot);
  d.showModal(); return d;
}
const ask = (title, val = '') => new Promise(res => {
  const i = h('input', { type: 'text', value: val, style: 'width:100%;padding:8px;border-radius:6px;border:1px solid var(--line);background:var(--in)' });
  i.onkeydown = e => { if (e.key === 'Enter') { res(i.value); $('#dlg').close(); } };
  dialog(title, i, [['Cancel·la', () => res(null)], ['D\'acord', () => res(i.value), 1]]); i.select();
});
const choose = (title, msg, opts) => new Promise(res => { dialog(title, h('p', { text: msg }), opts.map(([t, v, pri]) => [t, () => res(v), pri])).onclose = () => res(null); });
function toast(msg) { const t = h('div', { class: 'toast', text: msg }); document.body.append(t); setTimeout(() => { t.style.opacity = 0; setTimeout(() => t.remove(), 400); }, 1800); }
function download(name, data, type = 'application/json') { const a = h('a', { href: URL.createObjectURL(new Blob([data], { type })), download: name }); a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
function pickFile(accept, cb) { const i = h('input', { type: 'file', accept, multiple: true }); i.onchange = () => [...i.files].forEach(cb); i.click(); }
// Llegeix una imatge i la redueix si és massa gran (màx. 2400 px)
const readImg = file => new Promise((res, rej) => {
  const r = new FileReader(); r.onerror = rej;
  r.onload = () => { const im = new Image(); im.onerror = rej; im.onload = () => {
    const k = Math.min(1, 2400 / Math.max(im.width, im.height)); let src = r.result;
    if (k < 1) { const c = h('canvas', { width: im.width * k, height: im.height * k }); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); src = c.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', .9); }
    res({ src, w: im.width * k, h: im.height * k });
  }; im.src = r.result; };
  r.readAsDataURL(file);
});
