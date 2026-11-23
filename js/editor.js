'use strict';
/* Editor: renderitzat de l'espai de treball, guies, regles, zoom, eines i interacció */
let zoom = 1, tool = 'pointer', shapeKind = 'rect', editing = null, painter = null, savedRange = null, clip = ls('clip');
const view = { rul: true, guides: true, grid: false, snap: true, gs: 5, ...ls('view') };
const pageNum = () => cur.m ? '#' : cur.i + 1;

function render() {
  const e = renderPage(doc, pg(), true); e.id = 'page'; $('#page').replaceWith(e);
  RN = pageNum(); $('#pb').replaceChildren(...doc.board.map(o => renderObj(o, true)));
  sizeZoom(); afterRender(objs()); drawGuides(); drawSel(); drawRulers();
}
// Ajusta mides del text artístic i marca els marcs de text desbordats
function afterRender(list) {
  for (const o of list) {
    const e = $('#o-' + o.id); if (!e || o.hidden) continue;
    if (o.type === 'art' && !hasPath(o)) { o.w = e.offsetWidth / MM; o.h = e.offsetHeight / MM; }
    if (o.type === 'frame') e.classList.toggle('overflow', isOver(o, e));
  }
}
const isOver = (o, e) => { const t = e.firstChild; return o.cols > 1 ? t.scrollWidth > t.clientWidth + 2 : t.offsetHeight > e.clientHeight + 2; };
function updObjs(list, tip) {
  RN = pageNum();
  for (const o of list) { const e = $('#o-' + o.id); e && e.replaceWith(renderObj(o, true)); }
  afterRender(list); drawSel(tip);
}

/* ---------- Guies, selecció i regles ---------- */
function drawGuides() {
  const P = doc.page, px = v => v * MM + 'px', iw = P.w - P.ml - P.mr, ih = P.h - P.mt - P.mb;
  const cw = (iw - P.gut * (P.cols - 1)) / P.cols, rh = (ih - P.gut * (P.rows - 1)) / P.rows;
  let s = `<div class="gl"><div class="gb" style="inset:${px(-P.bleed)}"></div><div class="gm" style="left:${px(P.ml)};top:${px(P.mt)};right:${px(P.mr)};bottom:${px(P.mb)}"></div>`;
  for (let i = 1; i < P.cols; i++) s += `<div class="gc" style="left:${px(P.ml + i * cw + (i - 1) * P.gut)}"></div><div class="gc" style="left:${px(P.ml + i * (cw + P.gut))}"></div>`;
  for (let i = 1; i < P.rows; i++) s += `<div class="gr" style="top:${px(P.mt + i * rh + (i - 1) * P.gut)}"></div><div class="gr" style="top:${px(P.mt + i * (rh + P.gut))}"></div>`;
  if (view.grid) s += `<div class="grid" style="background:linear-gradient(#18c1d630 calc(1px*var(--iz)),transparent 0) 0 0/${px(view.gs)} ${px(view.gs)},linear-gradient(90deg,#18c1d630 calc(1px*var(--iz)),transparent 0) 0 0/${px(view.gs)} ${px(view.gs)}"></div>`;
  s += '</div>' + ['v', 'h'].map(a => doc.guides[a].map((g, i) => `<div class="guide ${a}" data-a="${a}" data-i="${i}" style="${a === 'v' ? 'left' : 'top'}:${px(g)}"></div>`).join('')).join('');
  $('#guides').innerHTML = s; document.body.classList.toggle('ng', !view.guides);
}
function drawSel(tip, marq) {
  const L = $('#sel'), grp = isGroup(sel); L.innerHTML = '';
  const box = (o, cls, hd) => {
    const b = h('div', { class: cls }); place(b, { ...o, fh: 0, fv: 0 });
    if (hd) { for (const d of o.type === 'line' ? ['w', 'e'] : ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']) b.append(h('div', { class: 'hd', 'data-h': d })); b.append(h('div', { class: 'hr', title: 'Gira' })); }
    return L.appendChild(b);
  };
  const crop = tool === 'crop' && sel.length === 1;
  if (crop && vis(sel[0]) !== sel[0]) box(sel[0], 'sbox full');                 // contorn de l'objecte sencer
  sel.forEach(o => box(vis(o), 'sbox' + (grp ? ' gm' : '') + (o.locked ? ' locked' : ''), sel.length === 1 && !o.locked && !editing));
  if (crop) $$('#sel .hd').forEach(d => d.classList.add('crop')), $('#sel .hr')?.remove();
  const o = sel[0]; if (sel.length === 1 && hasPath(o) && tool === 'pointer' && !editing && !o.locked) $('#sel .sbox').append(pathOverlay(o));
  if (grp) box({ ...bbox(sel), rot: 0 }, 'sbox grp', !editing);
  if (tip && L.lastChild) L.lastChild.append(h('div', { class: 'tip', text: tip }));
  if (marq) L.append(marq);
}
function drawRulers() {
  if (!view.rul || innerWidth <= 700) return;
  const pr = $('#page').getBoundingClientRect(), k = MM * zoom, step = [1, 2, 5, 10, 20, 50, 100, 200, 500].find(s => s * k >= 45), sub = step / 5, dpr = devicePixelRatio || 1;
  for (const hz of [1, 0]) {
    const c = $(hz ? '#rulerH' : '#rulerV'), r = c.getBoundingClientRect(), x = c.getContext('2d');
    c.width = r.width * dpr; c.height = r.height * dpr; x.scale(dpr, dpr);
    const len = hz ? r.width : r.height, o = hz ? pr.left - r.left : pr.top - r.top, sz = hz ? r.height : r.width;
    x.fillStyle = x.strokeStyle = getComputedStyle(c).color; x.font = '9px system-ui'; x.lineWidth = 1; x.beginPath();
    for (let i = Math.floor(-o / k / sub); i * sub * k + o < len; i++) {
      const p = Math.round(i * sub * k + o) + .5, maj = i % 5 === 0, t = maj ? sz : sz * .3;
      if (hz) { x.moveTo(p, sz); x.lineTo(p, sz - t); } else { x.moveTo(sz, p); x.lineTo(sz - t, p); }
      if (!maj) continue;
      if (hz) x.fillText(round(i * sub, 0), p + 3, 9); else { x.save(); x.translate(9, p + 3); x.rotate(-Math.PI / 2); x.textAlign = 'right'; x.fillText(round(i * sub, 0), 0, 0); x.restore(); }
    }
    x.stroke();
  }
}

/* ---------- Zoom ---------- */
// Mida de l'àrea de treball: pàgina + mesa de treball (marge fix i tots els objectes que hi ha fora)
function sizeZoom() {
  const P = doc.page, z = $('#zoomer'), s = $('#scroll'), r0 = $('#page').getBoundingClientRect(), mx = Math.max(60, P.w * .6), my = Math.max(30, P.h * .15), k = MM * zoom;
  const b = bbox([{ x: -mx, y: -my, w: P.w + 2 * mx, h: P.h + 2 * my }, ...objs().map(o => ({ x: o.x - 10, y: o.y - 10, w: o.w + 20, h: o.h + 20 }))]);
  Object.assign(z.style, { transform: `scale(${zoom})`, width: P.w * MM + 'px', height: P.h * MM + 'px', left: -b.x * k + 'px', top: -b.y * k + 'px' }); z.style.setProperty('--iz', 1 / zoom);
  $('#pagewrap').style.cssText = `width:${b.w * k}px;height:${b.h * k}px`;
  const r1 = $('#page').getBoundingClientRect(); if (r0.width) { s.scrollLeft += r1.left - r0.left; s.scrollTop += r1.top - r0.top; }
}
function setZoom(z, cx, cy) {
  const sc = $('#scroll'), r = sc.getBoundingClientRect(); cx ??= r.width / 2; cy ??= r.height / 2;
  let pr = $('#page').getBoundingClientRect(); const mx = (r.left + cx - pr.left) / zoom, my = (r.top + cy - pr.top) / zoom;
  zoom = clamp(z, .05, 8); sizeZoom(); pr = $('#page').getBoundingClientRect();
  sc.scrollLeft += pr.left + mx * zoom - r.left - cx; sc.scrollTop += pr.top + my * zoom - r.top - cy;
  drawRulers(); drawSel(); status();
}
function zoomFit() {
  const s = $('#scroll'), pad = innerWidth <= 700 ? 48 : 120; setZoom(Math.min((s.clientWidth - pad) / (doc.page.w * MM), (s.clientHeight - pad) / (doc.page.h * MM)));
  const p = $('#page').getBoundingClientRect(), r = s.getBoundingClientRect(); s.scrollLeft += p.left + p.width / 2 - r.left - r.width / 2; s.scrollTop += p.top + p.height / 2 - r.top - r.height / 2; drawRulers();
}

/* ---------- Ajust (snap) ---------- */
function snapT() {
  const P = doc.page, x = [0, P.w, P.w / 2, P.ml, P.w - P.mr, ...doc.guides.v], y = [0, P.h, P.h / 2, P.mt, P.h - P.mb, ...doc.guides.h];
  const cw = (P.w - P.ml - P.mr - P.gut * (P.cols - 1)) / P.cols, rh = (P.h - P.mt - P.mb - P.gut * (P.rows - 1)) / P.rows;
  for (let i = 1; i < P.cols; i++) x.push(P.ml + i * cw + (i - 1) * P.gut, P.ml + i * (cw + P.gut));
  for (let i = 1; i < P.rows; i++) y.push(P.mt + i * rh + (i - 1) * P.gut, P.mt + i * (rh + P.gut));
  objs().forEach(o => { if (!sel.includes(o) && !o.rot && !o.hidden) { x.push(o.x, o.x + o.w / 2, o.x + o.w); y.push(o.y, o.y + o.h / 2, o.y + o.h); } });
  return { x, y };
}
function snap(vals, T) {
  if (!view.snap) return 0; let best = 6 / zoom / MM, d = 0;
  for (const v of vals) for (const t of view.grid ? [...T, Math.round(v / view.gs) * view.gs] : T) if (Math.abs(t - v) < best) { best = Math.abs(t - v); d = t - v; }
  return d;
}
const bbox = l => { l = l.map(vis); const x = Math.min(...l.map(o => o.x)), y = Math.min(...l.map(o => o.y)); return { x, y, w: Math.max(...l.map(o => o.x + o.w)) - x, h: Math.max(...l.map(o => o.y + o.h)) - y }; };
const rect = (a, b) => ({ x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) });

/* ---------- Interacció amb el punter (ratolí, llapis i tàctil) ---------- */
function pt(e) { const r = $('#page').getBoundingClientRect(); return { x: (e.clientX - r.left) / zoom / MM, y: (e.clientY - r.top) / zoom / MM }; }
function drag(e, op) {
  const p0 = pt(e); let moved = false;
  const mv = ev => { if (!moved && Math.hypot(ev.clientX - e.clientX, ev.clientY - e.clientY) < 3) return; moved = true; op.move?.(pt(ev), p0, ev); status(pt(ev)); };
  const up = ev => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); removeEventListener('pointercancel', up); op.end?.(pt(ev), p0, moved, ev); };
  addEventListener('pointermove', mv); addEventListener('pointerup', up); addEventListener('pointercancel', up);
}
function moveOp(copy, click) {
  const list = sel.filter(o => !o.locked), o0 = list.map(o => [o.x, o.y]), T = snapT(), b = bbox(list);
  return {
    move(p, p0) {
      let dx = p.x - p0.x, dy = p.y - p0.y;
      dx += snap([b.x + dx, b.x + b.w / 2 + dx, b.x + b.w + dx], T.x); dy += snap([b.y + dy, b.y + b.h / 2 + dy, b.y + b.h + dy], T.y);
      list.forEach((o, i) => { o.x = round(o0[i][0] + dx, 2); o.y = round(o0[i][1] + dy, 2); const e = $('#o-' + o.id); e && place(e, o); });
      drawSel(`${copy ? 'Còpia · ' : ''}${round(list[0].x)}, ${round(list[0].y)} mm`);
    },
    end(p, p0, m) {
      if (!m) return click ? click() : drawSel();
      if (copy) { const n = reid(list); list.forEach((o, i) => { o.x = o0[i][0]; o.y = o0[i][1]; }); pg().objs.push(...n); sel = n; }
      commit();
    }
  };
}
function resizeOp(hd) {
  const grp = isGroup(sel), T0 = sel[0], o = grp ? { ...bbox(sel), rot: 0, type: 'grp' } : { ...vis(T0) }, s = { ...o }, s0 = sel.map(m => ({ ...m })), a = o.rot * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a), free = ['img', 'grp'].includes(o.type);
  const hx = hd.includes('e') ? 1 : hd.includes('w') ? -1 : 0, hy = hd.includes('s') ? 1 : hd.includes('n') ? -1 : 0;
  return {
    move(p, p0, ev) {
      const wx = p.x - p0.x, wy = p.y - p0.y, lx = wx * cs + wy * sn, ly = -wx * sn + wy * cs;
      let w = Math.max(1, s.w + hx * lx), hh = Math.max(1, s.h + hy * ly);
      if (o.type === 'art' || o.type === 'qr' || free !== ev.shiftKey) { const k = hx && hy ? Math.max(w / s.w, hh / s.h) : hx ? w / s.w : hh / s.h; if (!free || (hx && hy)) { w = s.w * k; hh = s.h * k; } }
      const cx = hx * (w - s.w) / 2, cy = hy * (hh - s.h) / 2;
      Object.assign(o, { w: round(w, 2), h: round(hh, 2), x: round(s.x + s.w / 2 + cx * cs - cy * sn - w / 2, 2), y: round(s.y + s.h / 2 + cx * sn + cy * cs - hh / 2, 2) });
      if (o.type === 'art') T0.size = round(s.size * hh / s.h, 1);
      if (!grp) unvis(T0, o);
      if (grp) { const kx = o.w / s.w, ky = o.h / s.h; sel.forEach((m, i) => { const b = s0[i]; Object.assign(m, { x: round(o.x + (b.x - s.x) * kx, 2), y: round(o.y + (b.y - s.y) * ky, 2), w: round(b.w * kx, 2), h: round(b.h * ky, 2) }); if (m.type === 'art') m.size = round(b.size * ky, 1); }); }
      updObjs(grp ? sel : [T0], `${round(o.w)} × ${round(o.h)} mm`);
    }, end: (p, p0, m) => m ? commit() : drawSel()
  };
}
function rotOp() {
  const grp = isGroup(sel), b = bbox(sel), c = { x: b.x + b.w / 2, y: b.y + b.h / 2 }, s0 = sel.map(m => ({ ...m })), r0 = grp ? 0 : s0[0].rot, A = q => Math.atan2(q.y - c.y, q.x - c.x) * 180 / Math.PI;
  return {
    move(p, p0, ev) { let d = A(p) - A(p0); d = ev.shiftKey ? Math.round((r0 + d) / 15) * 15 - r0 : Math.round(d); spin(sel, c, d, s0); sel.forEach(m => place($('#o-' + m.id), m)); drawSel((((r0 + d) % 360 + 360) % 360) + '°'); },
    end: (p, p0, m) => m ? commit() : drawSel()
  };
}
function createOp(p0) {
  const m = h('div', { class: 'marq' });
  return {
    move(p) { place(m, { ...rect(p0, p), rot: 0 }); drawSel(null, m); },
    end(p, p0, moved) {
      const r = rect(p0, p), big = moved && (r.w > 2 || r.h > 2); let o;
      if (tool === 'line') {
        const L = big ? Math.hypot(p.x - p0.x, p.y - p0.y) : 50, cx = big ? (p0.x + p.x) / 2 : p0.x + 25, cy = big ? (p0.y + p.y) / 2 : p0.y;
        o = mk('line', { x: cx - L / 2, y: cy - 2, w: L, rot: big ? round(Math.atan2(p.y - p0.y, p.x - p0.x) * 180 / Math.PI, 1) : 0 });
      } else { o = mk(tool, tool === 'shape' ? { shape: shapeKind } : {}); Object.assign(o, big ? r : { x: p0.x, y: p0.y }); }
      const t = tool; setTool('pointer'); placeNew(o, t);
    }
  };
}
// Eina d'ombra: arrossegueu per desplaçar l'ombra; Maj+arrossegar canvia el difuminat; un clic posa l'ombra per defecte
function shadowOp(l) {
  sel = l; l.forEach(o => { if (!o.shT || o.shT === 'none') Object.assign(o, SHD, { shT: 'drop' }); }); updObjs(l);
  const s0 = l.map(o => [o.shX, o.shY, o.shB]), tip = o => `Ombra ${o.shX}, ${o.shY} mm · difuminat ${o.shB} mm`;
  return {
    move(p, p0, ev) { l.forEach((o, i) => { if (ev.shiftKey) o.shB = round(Math.max(0, s0[i][2] + (p.y - p0.y) / 2), 1); else { o.shX = round(s0[i][0] + p.x - p0.x, 1); o.shY = round(s0[i][1] + p.y - p0.y, 1); } }); updObjs(l, tip(l[0])); },
    end: () => { commit(); status(); }
  };
}
/* ---------- Retall quadrat (Square Crop): marges ocults en % de l'objecte, aplicats amb clip-path ---------- */
const cropKeys = o => [...(o.fh ? ['cpR', 'cpL'] : ['cpL', 'cpR']), ...(o.fv ? ['cpB', 'cpT'] : ['cpT', 'cpB'])];   // esquerra, dreta, dalt, baix visuals
const insets = o => cropKeys(o).map(k => (o[k] || 0) / 100);
function vis(o) {                                         // zona visible d'un objecte retallat (o el mateix objecte)
  const [l, r, t, b] = insets(o); if (!(l || r || t || b)) return o;
  const w = o.w * (1 - l - r), hh = o.h * (1 - t - b), a = o.rot * Math.PI / 180, dx = o.w * (l - r) / 2, dy = o.h * (t - b) / 2;
  return { ...o, w, h: hh, x: o.x + o.w / 2 + dx * Math.cos(a) - dy * Math.sin(a) - w / 2, y: o.y + o.h / 2 + dx * Math.sin(a) + dy * Math.cos(a) - hh / 2 };
}
function unvis(o, v) {                                    // recalcula l'objecte sencer a partir de la zona visible
  const [l, r, t, b] = insets(o), w = v.w / (1 - l - r), hh = v.h / (1 - t - b), a = o.rot * Math.PI / 180, dx = w * (l - r) / 2, dy = hh * (t - b) / 2;
  Object.assign(o, { w: round(w, 2), h: round(hh, 2), x: round(v.x + v.w / 2 - dx * Math.cos(a) + dy * Math.sin(a) - w / 2, 2), y: round(v.y + v.h / 2 - dx * Math.sin(a) - dy * Math.cos(a) - hh / 2, 2) });
}
const cropTip = o => { const v = vis(o); return `Retall ${round(v.w)} × ${round(v.h)} mm`; };
function cropOp(hd) {                                     // arrossegar una vora: amaga o mostra aquella part
  const o = sel[0], s = { ...o }, a = o.rot * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a), [kl, kr, kt, kb] = cropKeys(o), g = k => s[k] || 0;
  return {
    move(p, p0) {
      const wx = p.x - p0.x, wy = p.y - p0.y, lx = (wx * cs + wy * sn) / o.w * 100, ly = (-wx * sn + wy * cs) / o.h * 100;
      if (hd.includes('w')) o[kl] = round(clamp(g(kl) + lx, 0, 98 - g(kr)), 2); if (hd.includes('e')) o[kr] = round(clamp(g(kr) - lx, 0, 98 - g(kl)), 2);
      if (hd.includes('n')) o[kt] = round(clamp(g(kt) + ly, 0, 98 - g(kb)), 2); if (hd.includes('s')) o[kb] = round(clamp(g(kb) - ly, 0, 98 - g(kt)), 2);
      updObjs([o], cropTip(o));
    }, end: (p, p0, m) => m ? commit() : drawSel()
  };
}
function cropPanOp(o) {                                   // arrossegar dins: desplaça el contingut sota la finestra visible
  const s = { ...o }, a = o.rot * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a), [kl, kr, kt, kb] = cropKeys(o), [L, R, T, B] = insets(s).map((v, i) => v * (i < 2 ? s.w : s.h));
  return {
    move(p, p0) {
      const wx = p.x - p0.x, wy = p.y - p0.y, lx = clamp(wx * cs + wy * sn, -R, L), ly = clamp(-wx * sn + wy * cs, -B, T);
      Object.assign(o, { x: round(s.x + lx * cs - ly * sn, 2), y: round(s.y + lx * sn + ly * cs, 2), [kl]: round((L - lx) / s.w * 100, 2), [kr]: round((R + lx) / s.w * 100, 2), [kt]: round((T - ly) / s.h * 100, 2), [kb]: round((B + ly) / s.h * 100, 2) });
      updObjs([o], cropTip(o));
    }, end: (p, p0, m) => m ? commit() : drawSel()
  };
}
// Afegeix un objecte nou i, segons el tipus, comença a editar-lo o demana la imatge
function placeNew(o, t = o.type) { addObj(o); if (t === 'art' || t === 'frame') startEdit(o, true); else if (t === 'img') pickImage(o); }
// Insereix un objecte de la mida per defecte amb la cantonada superior esquerra al punt p
const insertAt = (type, p, ex = {}) => { const o = mk(type, ex); o.x = round(p.x, 1); o.y = round(p.y - (type === 'line' ? o.h / 2 : 0), 1); placeNew(o); };
// Aplica una trajectòria de text i ajusta la caixa a la llargada del text (mantenint el centre)
function setPath(v) {
  stopEdit(); const l = sel.filter(o => o.type === 'art'); if (!l.length) return toast('Seleccioneu un text artístic');
  const m = h('canvas').getContext('2d');
  l.forEach(o => {
    const f = o.size * 4 / 3, L = textLines(o.html), w = s => (m.font = `${o.italic ? 'italic ' : ''}${o.bold ? 'bold ' : ''}${f}px ${ff(o.font)}`, m.measureText(s).width + s.length * o.ls * 4 / 3);
    const tw = ['badge', 'button'].includes(v) ? Math.max(...L.map(w)) : w(L.join(' ')), c = { x: o.x + o.w / 2, y: o.y + o.h / 2 };
    const k = { circle: 1 / Math.PI, tcircle: 2 / Math.PI, bcircle: 2 / Math.PI, badge: 2 / Math.PI, button: 2 / Math.PI, c: 4 / 3 / Math.PI, rc: 4 / 3 / Math.PI }[v];
    if (v === 'none') return o.tpath = v; if (!hasPath(o)) o.align = 'center'; o.tpath = v;
    const d = Math.max(tw * k * (['badge', 'button'].includes(v) ? 1.4 : 1.12) + f * 2.2, f * 8), [W, H] = k ? [d, d] : [tw * 1.08 + f, v === 'wave' ? f * 6 : f * 1.5];
    Object.assign(o, { w: round(W / MM, 2), h: round(H / MM, 2), x: round(c.x - W / MM / 2, 2), y: round(c.y - H / MM / 2, 2) });
  });
  commit();
}
/* ---------- Edició de la trajectòria del text: nodes, nanses i marques d'inici i final ---------- */
let pnSel = null;
const MP = (() => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'), p = document.createElementNS(s.namespaceURI, 'path'); s.style.cssText = 'position:absolute;width:0;height:0;visibility:hidden'; s.append(p); document.body.append(s); return p; })();
function measure(d) {
  MP.setAttribute('d', d); const L = MP.getTotalLength(), P = l => MP.getPointAtLength(clamp(l, 0, L));
  return { at: pc => { const l = pc / 100 * L, a = P(l), b = P(l + .5), c = P(l - .5); return { x: a.x, y: a.y, a: Math.atan2(b.y - c.y, b.x - c.x) * 180 / Math.PI }; },
    near: (x, y) => { let best = 1e12, pc = 0; for (let i = 0; i <= 400; i++) { const q = P(L * i / 400), d = (q.x - x) ** 2 + (q.y - y) ** 2; if (d < best) { best = d; pc = i / 4; } } return pc; } };
}
function toLocal(o, p) {                                   // punt de la pàgina (mm) → coordenades internes de l'objecte (px)
  const a = -o.rot * Math.PI / 180, dx = p.x - o.x - o.w / 2, dy = p.y - o.y - o.h / 2;
  const x = (dx * Math.cos(a) - dy * Math.sin(a)) * (o.fh ? -1 : 1), y = (dx * Math.sin(a) + dy * Math.cos(a)) * (o.fv ? -1 : 1);
  return { x: (x + o.w / 2) * MM, y: (y + o.h / 2) * MM };
}
function ensureCustom(o) { if (o.tpath === 'custom') return; const W = o.w * MM, H = o.h * MM; o.tpn = pathNodes(o, W, H).map(N => scaleN(N, 1 / W, 1 / H)); o.tprev = o.tpath; o.tpath = 'custom'; }
function pathOverlay(o) {
  const W = o.w * MM, H = o.h * MM, ns = pathNodes(o, W, H), r = 4.5 / zoom, w = 1 / zoom, on = (pi, ni) => pnSel?.id === o.id && pnSel.pi === pi && pnSel.ni === ni;
  let s = ns.map((N, i) => `<path d="${nodesD(N)}" fill="none" stroke="#3b8cff" stroke-width="${w}" stroke-dasharray="${4 * w} ${3 * w}"/><path data-pp="${i}" d="${nodesD(N)}" fill="none" stroke="transparent" stroke-width="${8 * w}"/>`).join('');
  ns.forEach((N, pi) => N.forEach((n, ni) => {
    if (on(pi, ni)) for (const k of ['i', 'o']) s += `<line x1="${n.x}" y1="${n.y}" x2="${n[k + 'x']}" y2="${n[k + 'y']}" stroke="#f59f00" stroke-width="${w}"/><circle data-pn="${k}:${pi}:${ni}" cx="${n[k + 'x']}" cy="${n[k + 'y']}" r="${r * .8}" fill="#fff" stroke="#f59f00" stroke-width="${w * 1.5}"/>`;
    s += `<rect data-pn="n:${pi}:${ni}" x="${n.x - r}" y="${n.y - r}" width="${2 * r}" height="${2 * r}" fill="${on(pi, ni) ? '#f59f00' : '#fff'}" stroke="#3b8cff" stroke-width="${w * 1.5}"/>`;
  }));
  const M = measure(nodesD(ns[0]));
  [['s', o.tps ?? 0, 0], ['e', o.tpe ?? 100, 180]].forEach(([k, v, turn]) => { const q = M.at(v); s += `<g data-pn="${k}" transform="translate(${q.x} ${q.y}) rotate(${q.a + turn})"><path d="M${-r * 2.4} ${-r * 1.4}L0 0L${-r * 2.4} ${r * 1.4}Z" fill="#3b8cff" stroke="#fff" stroke-width="${w}"/><title>${k === 's' ? 'Inici' : 'Final'} del text</title></g>`; });
  return h('div', { html: `<svg class="pov" width="${W}" height="${H}" style="${o.fh || o.fv ? `transform:scale(${o.fh ? -1 : 1},${o.fv ? -1 : 1})` : ''}">${s}</svg>` }).firstChild;
}
function pathOp(o, id) {
  const [k, pi, ni] = id.split(':'), W = o.w * MM, H = o.h * MM;
  if (k === 's' || k === 'e') return {
    move(p) { const L = toLocal(o, p), v = round(measure(nodesD(pathNodes(o, W, H)[0])).near(L.x, L.y), 1);
      if (k === 's') o.tps = Math.min(v, (o.tpe ?? 100) - 2); else o.tpe = Math.max(v, (o.tps ?? 0) + 2); updObjs([o], `${k === 's' ? 'Inici' : 'Final'} del text: ${o['tp' + k]}%`); },
    end: (p, p0, m) => m ? commit() : drawSel()
  };
  ensureCustom(o); pnSel = { id: o.id, pi: +pi, ni: +ni };
  const n = o.tpn[pi][ni], n0 = { ...n };
  return {
    move(p, p0, ev) {
      const L = toLocal(o, p), x = L.x / W, y = L.y / H;
      if (k === 'n') { const dx = x - n0.x, dy = y - n0.y; Object.assign(n, { x: x, y: y, ix: n0.ix + dx, iy: n0.iy + dy, ox: n0.ox + dx, oy: n0.oy + dy }); }
      else { n[k + 'x'] = x; n[k + 'y'] = y; if (!ev.altKey) {               // nansa simètrica (Alt: independent)
        const q = k === 'i' ? 'o' : 'i', len = Math.hypot((n0[q + 'x'] - n0.x) * W, (n0[q + 'y'] - n0.y) * H), vx = (n.x - x) * W, vy = (n.y - y) * H, m = Math.hypot(vx, vy) || 1;
        n[q + 'x'] = n.x + vx / m * len / W; n[q + 'y'] = n.y + vy / m * len / H; } }
      updObjs([o]);
    }, end: () => commit()
  };
}
function addNode(o, pi, L) {                               // divideix el tram més proper (de Casteljau)
  const W = o.w * MM, H = o.h * MM, N = scaleN(o.tpn[pi], W, H), lp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const bz = (a, b, c, d, t) => { const u = 1 - t; return u ** 3 * a + 3 * u * u * t * b + 3 * u * t * t * c + t ** 3 * d; };
  let best = 1e12, si = 0, st = .5;
  for (let i = 0; i < N.length - 1; i++) for (let j = 1; j < 60; j++) { const t = j / 60, a = N[i], b = N[i + 1], d = (bz(a.x, a.ox, b.ix, b.x, t) - L.x) ** 2 + (bz(a.y, a.oy, b.iy, b.y, t) - L.y) ** 2; if (d < best) { best = d; si = i; st = t; } }
  const a = N[si], b = N[si + 1], P0 = [a.x, a.y], P1 = [a.ox, a.oy], P2 = [b.ix, b.iy], P3 = [b.x, b.y], A = lp(P0, P1, st), B = lp(P1, P2, st), C = lp(P2, P3, st), Dd = lp(A, B, st), E = lp(B, C, st), F = lp(Dd, E, st);
  [a.ox, a.oy] = A; [b.ix, b.iy] = C; N.splice(si + 1, 0, node(F[0], F[1], Dd[0], Dd[1], E[0], E[1])); o.tpn[pi] = scaleN(N, 1 / W, 1 / H);
}
function resetPath() { const o = sel[0]; if (!hasPath(o)) return; if (o.tpath === 'custom') o.tpath = o.tprev || 'tcircle'; delete o.tpn; delete o.tps; delete o.tpe; pnSel = null; commit(); }
function marqOp(p0, add) {
  const m = h('div', { class: 'marq' }), base = add ? [...sel] : [];
  return {
    move(p) { place(m, { ...rect(p0, p), rot: 0 }); drawSel(null, m); },
    end(p, p0, moved) {
      if (!moved) return setSel(base); const r = rect(p0, p);
      setSel([...new Set([...base, ...objs().filter(o => !o.hidden && !o.locked && o.x < r.x + r.w && o.x + o.w > r.x && o.y < r.y + r.h && o.y + o.h > r.y).flatMap(members)])]);
    }
  };
}
function guideOp(a, i) {
  const G = doc.guides[a]; if (i == null) { G.push(-999); i = G.length - 1; }
  return {
    move(p) { G[i] = round(a === 'v' ? p.x : p.y, 1); drawGuides(); },
    end(p, p0, moved, ev) { const r = $('#scroll').getBoundingClientRect(); if (!moved && G[i] === -999 || (a === 'v' ? ev.clientX < r.left : ev.clientY < r.top)) G.splice(i, 1); drawGuides(); commit(true); }
  };
}
function panOp(e) {
  const s = $('#scroll'), l0 = s.scrollLeft, t0 = s.scrollTop;
  return { move(p, p0, ev) { s.scrollLeft = l0 - ev.clientX + e.clientX; s.scrollTop = t0 - ev.clientY + e.clientY; } };
}
function setTool(t) {
  tool = t; if (doc) drawSel(); pickTip(); document.body.classList.toggle('drawing', !['pointer', 'hand'].includes(t)); document.body.classList.toggle('panning', t === 'hand');
  $$('#tools .ib').forEach(b => b.classList.toggle('on', b.dataset.t === t)); status();
}

/* ---------- Edició de text ---------- */
const editEl = () => editing && $('#o-' + editing.id);
function startEdit(o, all, cell) {
  if (!o || o.locked || !['art', 'frame', 'table'].includes(o.type)) return;
  if (editing) stopEdit(); sel = [o]; editing = o;
  if (hasPath(o)) $('#o-' + o.id).replaceWith(renderObj({ ...o, tpath: 'none' }, true));   // s'edita com a text normal
  const e = editEl(), tds = $$('td', e), t = o.type === 'table' ? (tds.includes(cell) ? cell : tds[0]) : $('.txt', e);
  e.classList.add('editing');
  if (o.type === 'table') tds.forEach(td => td.contentEditable = 'true'); else { t.innerHTML = o.html; t.contentEditable = 'true'; }
  t.focus(); const r = document.createRange(); r.selectNodeContents(t); if (!all) r.collapse(false);
  getSelection().removeAllRanges(); getSelection().addRange(r);
  e.oninput = () => { afterRender([o]); drawSel(); };
  drawSel(); updateUI();
}
function stopEdit() {
  const o = editing, e = editEl(); if (!o) return; editing = null; savedRange = null;
  if (e) { if (o.type === 'table') $$('td', e).forEach(td => (o.cells[td.dataset.r] ||= [])[td.dataset.c] = td.innerHTML); else o.html = $('.txt', e).innerHTML; }
  getSelection().removeAllRanges(); commit();
}
document.addEventListener('selectionchange', () => { const s = getSelection(); if (editing && s.rangeCount && editEl()?.contains(s.anchorNode)) savedRange = s.getRangeAt(0).cloneRange(); });
const ex = (c, v) => document.execCommand(c, false, v);
const EXEC = {
  bold: () => ex('bold'), italic: () => ex('italic'), und: () => ex('underline'), color: v => ex('foreColor', col(v)), font: v => ex('fontName', v),
  size: v => { ex('fontSize', 7); $$('font[size="7"]', editEl()).forEach(n => { n.removeAttribute('size'); n.style.fontSize = v + 'pt'; }); }
};
function hasRange() { if (!editing || !savedRange || savedRange.collapsed) return false; const s = getSelection(); s.removeAllRanges(); s.addRange(savedRange); return true; }
// Assigna una propietat a la selecció (o al text seleccionat si s'està editant)
function setProp(k, v, fin) {
  if (EXEC[k] && hasRange()) { EXEC[k](v); afterRender([editing]); return; }
  if (editing?.type === 'table') stopEdit();
  sel.forEach(o => o[k] = v);
  if (editing) { const t = $('.txt', editEl()); t.style.cssText = txtStyle(editing); afterRender([editing]); drawSel(); } else updObjs(sel);
  if (fin) commit(!!editing);
}
function listCmd(c) { if (!editing) startEdit(sel[0], true); editing && editing.type !== 'table' && ex(c); }

/* ---------- Operacions amb objectes ---------- */
function setSel(l) { if (editing && !l.includes(editing)) stopEdit(); sel = l; drawSel(); updateUI('sel'); }
function addObj(o) { pg().objs.push(o); sel = [o]; commit(); }
const live = () => sel.filter(o => !o.locked);
function del() { if (!sel.length) return; const l = live(); for (const a of [pg().objs, doc.board]) a.splice(0, a.length, ...a.filter(o => !l.includes(o))); sel = []; commit(); }
const copySel = () => { if (sel.length) { clip = clone(sel); ls('clip', clip); } };
function paste() {
  if (!clip?.length) return toast('El porta-retalls és buit');
  clip = clip.map(o => ({ ...o, x: o.x + 5, y: o.y + 5 })); const n = reid(clip).map(o => ({ ...o, locked: false }));
  pg().objs.push(...n); sel = n; commit();
}
function order(d) {
  for (const a of [pg().objs, doc.board]) {
    const s = a.filter(o => sel.includes(o)), r = a.filter(o => !sel.includes(o));
    if (d === 'front') a.splice(0, a.length, ...r, ...s); else if (d === 'back') a.splice(0, a.length, ...s, ...r);
    else { const ix = a.map((o, i) => sel.includes(o) ? i : -1).filter(i => i >= 0); if (d > 0) ix.reverse(); for (const i of ix) { const j = i + d; if (a[j] && !sel.includes(a[j])) [a[i], a[j]] = [a[j], a[i]]; } }
  }
  commit();
}
const move = (l, dx, dy) => l.forEach(o => { o.x = round(o.x + dx, 2); o.y = round(o.y + dy, 2); });
// Alinea i distribueix per unitats (cada grup compta com un sol objecte)
function align(m) {
  const U = units(live()); if (!U.length) return; const b = U.length > 1 ? bbox(U.flat()) : { x: 0, y: 0, w: doc.page.w, h: doc.page.h };
  U.forEach(u => { const k = bbox(u); move(u, ...{ l: [b.x - k.x, 0], cx: [b.x + (b.w - k.w) / 2 - k.x, 0], r: [b.x + b.w - k.x - k.w, 0], t: [0, b.y - k.y], cy: [0, b.y + (b.h - k.h) / 2 - k.y], b: [0, b.y + b.h - k.y - k.h] }[m]); });
  commit();
}
function distribute(a) {
  const L = a === 'x' ? 'w' : 'h', U = units(live()).map(u => [u, bbox(u)]).sort((p, q) => p[1][a] - q[1][a]); if (U.length < 3) return toast('Seleccioneu almenys 3 objectes o grups');
  const b = bbox(U.flatMap(u => u[0])), gap = (b[L] - U.reduce((s, u) => s + u[1][L], 0)) / (U.length - 1); let p = b[a];
  U.forEach(([u, k]) => { const d = p - k[a]; move(u, a === 'x' ? d : 0, a === 'y' ? d : 0); p += k[L] + gap; }); commit();
}
/* ---------- Grups (es poden niar: o.g = [grup interior, ..., grup exterior]) ---------- */
const gOf = o => o.g?.at(-1);
const members = o => gOf(o) ? objs().filter(x => gOf(x) === gOf(o)) : [o];
const isGroup = l => l.length > 1 && !!gOf(l[0]) && l.every(x => gOf(x) === gOf(l[0])) && members(l[0]).length === l.length;
const units = l => Object.values(l.reduce((a, o) => ((a[gOf(o) || o.id] ||= []).push(o), a), {}));
function group() {
  const l = live(), id = uid(); if (l.length < 2) return toast('Seleccioneu almenys dos objectes per agrupar');
  for (const a of [pg().objs, doc.board]) {      // els membres queden junts en l'ordre de capes
    const m = l.filter(o => a.includes(o)); if (!m.length) continue;
    const top = Math.max(...m.map(o => a.indexOf(o))), r = a.filter(o => !m.includes(o)), k = a.slice(0, top).filter(o => !m.includes(o)).length;
    a.splice(0, a.length, ...r.slice(0, k), ...m, ...r.slice(k));
  }
  l.forEach(o => (o.g ||= []).push(id)); sel = l; commit();
}
function ungroup() {
  if (!sel.some(gOf)) return toast('La selecció no conté cap grup');
  units(sel).forEach(u => gOf(u[0]) && u.forEach(o => { o.g.pop(); if (!o.g.length) delete o.g; })); setSel([...sel]); commit();
}
// Gira una llista d'objectes al voltant d'un centre (posició i angle)
function spin(l, c, d, b0 = l.map(o => ({ ...o }))) {
  const r = d * Math.PI / 180, cs = Math.cos(r), sn = Math.sin(r);
  l.forEach((o, i) => { const b = b0[i], mx = b.x + b.w / 2 - c.x, my = b.y + b.h / 2 - c.y; o.x = round(c.x + mx * cs - my * sn - b.w / 2, 2); o.y = round(c.y + mx * sn + my * cs - b.h / 2, 2); o.rot = ((Math.round(b.rot + d) % 360) + 360) % 360; });
}
const center = l => { const b = bbox(l); return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; };
function rot90(d) { const l = live(); if (!l.length) return; spin(l, center(l), d); commit(); }
function flip(a) {
  const l = live(); if (!l.length) return; const b = bbox(l);
  l.forEach(o => { if (a === 'h') { o.fh = !o.fh; o.x = round(2 * b.x + b.w - o.x - o.w, 2); } else { o.fv = !o.fv; o.y = round(2 * b.y + b.h - o.y - o.h, 2); } o.rot = (360 - o.rot) % 360; }); commit();
}
const each = f => () => { if (sel.length) { sel.forEach(f); commit(); } };
function fitText() {
  const o = sel[0]; if (o?.type !== 'frame') return toast('Seleccioneu un marc de text');
  stopEdit(); const e = $('#o-' + o.id), t = e.firstChild, wd = h('span', { style: 'position:absolute;white-space:nowrap;visibility:hidden', text: t.textContent.split(/\s+/).sort((a, b) => b.length - a.length)[0] });
  t.append(wd); const colW = () => (t.clientWidth - (o.pad * 2 + o.gap * (o.cols - 1)) * MM) / o.cols;
  let lo = 3, hi = 150; for (let i = 0; i < 18; i++) { o.size = (lo + hi) / 2; t.style.cssText = txtStyle(o); isOver(o, e) || wd.offsetWidth > colW() ? hi = o.size : lo = o.size; }
  o.size = Math.floor(lo * 10) / 10; commit();
}
function textToTable() {
  const o = sel[0]; if (o?.type !== 'frame') return toast('Seleccioneu un marc de text amb text delimitat');
  stopEdit(); const lines = $('#o-' + o.id).innerText.split('\n').map(l => l.trim()).filter(Boolean);
  const d = ['\t', ';', '|', ','].find(c => lines.every(l => l.includes(c))) || ',', cells = lines.map(l => l.split(d).map(c => esc(c.trim())));
  const t = mk('table', { x: o.x, y: o.y, w: o.w, h: Math.max(10, lines.length * 7), rows: lines.length, cols: Math.max(...cells.map(r => r.length)), cells });
  const a = listOf(o); a[a.indexOf(o)] = t; sel = [t]; commit();
}
function applyPainter(o) { Object.assign(o, painter); painter = null; document.body.classList.remove('drawing'); setSel([o]); commit(); }
function imageInto(file, o, at) {
  return readImg(file).then(im => {
    if (!o) { const w = Math.min(doc.page.w * .6, im.w * 25.4 / 150), hh = w * im.h / im.w; o = mk('img', { w, h: hh, x: at ? at.x - w / 2 : (doc.page.w - w) / 2, y: at ? at.y - hh / 2 : (doc.page.h - hh) / 2 }); pg().objs.push(o); }
    o.src = im.src; o.nw = im.w; sel = [o]; commit();
  }).catch(() => toast('No s\'ha pogut llegir la imatge'));
}
const pickImage = o => pickFile('image/*', f => imageInto(f, o));

/* ---------- Pàgines ---------- */
const reid = objs => { const m = {}; return objs.map(o => ({ ...clone(o), id: uid(), ...(o.g && { g: o.g.map(x => m[x] ||= uid()) }) })); };
function goPage(i, m = cur.m) { stopEdit(); const l = m ? doc.masters : doc.pages; cur = { m, i: clamp(i, 0, l.length - 1) }; sel = []; refresh(); }
function addPage(copy) {
  const i = cur.m ? doc.pages.length - 1 : cur.i, s = doc.pages[i];
  doc.pages.splice(i + 1, 0, copy && !cur.m ? { ...clone(s), id: uid(), objs: reid(s.objs) } : { id: uid(), master: s.master, objs: [] });
  cur = { m: false, i: i + 1 }; sel = []; commit();
}
function delPage() {
  const l = cur.m ? doc.masters : doc.pages; if (l.length < 2 && !cur.m) return toast('La publicació necessita almenys una pàgina');
  const [r] = l.splice(cur.i, 1); if (cur.m) doc.pages.forEach(p => p.master === r.id && (p.master = null));
  if (!l.length) cur = { m: false, i: 0 }; else cur.i = Math.max(0, cur.i - 1); sel = []; commit();
}
function movePage(d) { const l = cur.m ? doc.masters : doc.pages, j = cur.i + d; if (!l[j]) return; [l[cur.i], l[j]] = [l[j], l[cur.i]]; cur.i = j; commit(); }
function addMaster() {
  const id = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].find(c => !doc.masters.some(m => m.id === c)) || uid();
  doc.masters.push({ id, name: 'Mestra ' + id, objs: [] }); cur = { m: true, i: doc.masters.length - 1 }; sel = []; commit();
}
function toggleMaster() {
  if (cur.m) return goPage(0, false);
  const i = doc.masters.findIndex(m => m.id === pg().master); if (i < 0) return toast('Aquesta pàgina no té pàgina mestra'); goPage(i, true);
}

/* ---------- Esdeveniments del espai de treball ---------- */
function initEditor() {
  const sc = $('#scroll');
  sc.addEventListener('pointerdown', e => {
    hidePop(); document.body.classList.remove('mx');
    if (editing && e.target.closest('#o-' + editing.id)) return;
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    const pnd = e.target.closest('[data-pn]'); if (pnd && sel[0]) { e.preventDefault(); return drag(e, pathOp(sel[0], pnd.dataset.pn)); }
    if (e.target.closest('[data-pp]')) return e.preventDefault();           // camí: es reserva per al doble clic
    const hd = e.target.closest('.hd'), gd = e.target.closest('.guide'), el = e.target.closest(OBJ), id = el?.dataset.id;
    stopEdit(); const o = id && byId(id);
    if (e.pointerType === 'mouse') e.preventDefault();
    if (tool === 'hand' || e.button === 1) return drag(e, panOp(e));
    if (tool === 'picker') { e.preventDefault(); return pickAt(e); }
    if (hd) return drag(e, (tool === 'crop' ? cropOp : resizeOp)(hd.dataset.h));
    if (e.target.closest('.hr')) return drag(e, rotOp());
    if (gd) return drag(e, guideOp(gd.dataset.a, +gd.dataset.i));
    if (tool === 'crop') { e.preventDefault(); if (!o) return setSel([]); if (sel.length !== 1 || sel[0] !== o) setSel([o]); return o.locked || drag(e, cropPanOp(o)); }
    if (tool === 'shadow') { e.preventDefault(); return o ? drag(e, shadowOp(e.ctrlKey ? [o] : members(o))) : setSel([]); }
    if (tool !== 'pointer') { e.preventDefault(); return drag(e, createOp(pt(e))); }
    if (o) {
      if (painter) return applyPainter(o);
      if (e.shiftKey) { const m = members(o); return setSel(sel.includes(o) ? sel.filter(x => !m.includes(x)) : [...sel, ...m]); }
      if (!sel.includes(o)) setSel(members(o));
      const ctrl = e.ctrlKey || e.metaKey;                        // Ctrl+arrossega: copia · Ctrl+clic: objecte dins del grup
      return o.locked ? ctrl && setSel([o]) : drag(e, moveOp(ctrl, ctrl && (() => setSel([o]))));
    }
    if (e.pointerType === 'touch') return setSel([]);
    drag(e, marqOp(pt(e), e.shiftKey));
  });
  sc.addEventListener('dblclick', e => {
    const pnd = e.target.closest('[data-pn^="n:"]'), pp = e.target.closest('[data-pp]'), so = sel[0];   // nodes: doble clic afegeix o elimina
    if ((pnd || pp) && so) { ensureCustom(so); if (pnd) { const [, pi, ni] = pnd.dataset.pn.split(':'); if (so.tpn[pi].length > 2) so.tpn[pi].splice(ni, 1); } else addNode(so, +pp.dataset.pp, toLocal(so, pt(e))); pnSel = null; return commit(); }
    const el = e.target.closest(OBJ), o = el && byId(el.dataset.id);
    if (!o) { const [t, k] = (ls('dblIns') || 'art').split(':'); return tool === 'pointer' && !sel.length && t !== 'none' && !e.target.closest('.hd,.hr,.guide') && insertAt(t, pt(e), k ? { shape: k } : {}); }
    if (o.type === 'img') pickImage(o); else if (['art', 'frame', 'table'].includes(o.type)) { if (editing !== o) startEdit(o, o.type === 'art', e.target.closest('td')); } else showTab('props');
  });
  sc.addEventListener('contextmenu', e => { const el = e.target.closest(OBJ); if (editing) return; e.preventDefault(); if (el && !sel.includes(byId(el.dataset.id))) setSel([byId(el.dataset.id)]); ctxMenu(e); });
  sc.addEventListener('pointermove', e => { if (e.buttons) return; status(pt(e)); if (tool === 'picker' && e.pointerType !== 'touch') sampleAt(e).then(c => tool === 'picker' && pickTip(e, c)); });
  sc.addEventListener('pointerleave', () => pickTip());
  sc.addEventListener('scroll', drawRulers, { passive: true });
  sc.addEventListener('wheel', e => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); const r = sc.getBoundingClientRect(); setZoom(zoom * Math.exp(-e.deltaY * .0025), e.clientX - r.left, e.clientY - r.top); }, { passive: false });
  // Pessic per fer zoom a pantalles tàctils
  let pinch; const dist = e => Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
  sc.addEventListener('touchstart', e => { if (e.touches.length === 2) pinch = { d: dist(e), z: zoom }; }, { passive: true });
  sc.addEventListener('touchmove', e => { if (!pinch || e.touches.length !== 2) return; const [a, b] = e.touches, r = sc.getBoundingClientRect(); setZoom(pinch.z * dist(e) / pinch.d, (a.clientX + b.clientX) / 2 - r.left, (a.clientY + b.clientY) / 2 - r.top); }, { passive: true });
  sc.addEventListener('touchend', () => pinch = null);
  // Arrossegar fitxers o recursos a la pàgina
  sc.addEventListener('dragover', e => e.preventDefault());
  sc.addEventListener('drop', e => {
    e.preventDefault(); const p = pt(e), a = e.dataTransfer.getData('text/pp');
    if (a) return insertAsset(JSON.parse(a), p);
    const tgt = e.target.closest('#page .t-img, #pb .t-img'), o = tgt && byId(tgt.dataset.id);
    [...e.dataTransfer.files].forEach(f => f.type.startsWith('image/') ? imageInto(f, o, p) : openFile(f));
  });
  // Regles: arrossegueu per crear guies
  $('#rulerH').addEventListener('pointerdown', e => drag(e, guideOp('h')));
  $('#rulerV').addEventListener('pointerdown', e => drag(e, guideOp('v')));
  addEventListener('resize', debounce(drawRulers, 100));
  // Teclat
  addEventListener('keydown', e => {
    const mod = e.ctrlKey || e.metaKey, key = e.key.toLowerCase(), k = (mod ? 'ctrl+' : '') + (e.altKey ? 'alt+' : '') + (e.shiftKey && (/^[a-z]$/.test(key) || key.length > 1) ? 'shift+' : '') + key;
    if (e.key === 'Escape') { if ($('#dlg').open) return; if (document.body.classList.contains('preview')) return run('preview'); if (editing) return stopEdit(); hidePop(); painter = null; setTool('pointer'); return setSel([]); }
    if (editing || $('#dlg').open || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || k === 'ctrl+v') return;
    const arrow = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] }[key.replace('shift+', '')];
    if (arrow && live().length) { e.preventDefault(); const d = e.shiftKey ? 5 : .5; live().forEach(o => { o.x = round(o.x + arrow[0] * d, 2); o.y = round(o.y + arrow[1] * d, 2); }); updObjs(sel); return nudged(); }
    if (KEYMAP[k]) { e.preventDefault(); run(KEYMAP[k]); }
  });
  document.addEventListener('paste', e => {
    if (editing || /INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return;
    const f = [...e.clipboardData.files].find(f => f.type.startsWith('image/')); e.preventDefault();
    f ? imageInto(f, sel[0]?.type === 'img' && !sel[0].src ? sel[0] : null) : paste();
  });
}
/* ---------- Converteix en imatge (rasteritza objectes amb SVG foreignObject → canvas) ---------- */
function extent(o) {
  o = vis(o);
  const a = o.rot * Math.PI / 180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a)), w = o.w * c + o.h * s, hh = o.w * s + o.h * c;
  const p = 1 + (!o.shT || o.shT === 'none' ? 0 : Math.hypot(o.shX, o.shY) + o.shB * 2);
  return { x: o.x + o.w / 2 - w / 2 - p, y: o.y + o.h / 2 - hh / 2 - p, w: w + 2 * p, h: hh + 2 * p };
}
// Dibuixa elements (en mm relatius a la caixa R) en un canvas a escala k, passant per una imatge SVG amb foreignObject
async function toCanvas(kids, R, k) {
  const W = R.w * MM, H = R.h * MM; k = Math.min(k, Math.sqrt(16e6 / (W * H)));          // límit de mida del canvas
  const box = h('div', { style: `position:relative;width:${W}px;height:${H}px;overflow:hidden` }, h('style', { text: BASE_CSS }), kids);
  const svg = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><foreignObject width="100%" height="100%">${new XMLSerializer().serializeToString(box)}</foreignObject></svg>`);
  const im = new Image(); im.src = svg; await im.decode(); await new Promise(r => setTimeout(r, 60));
  const c = h('canvas', { width: Math.ceil(W * k), height: Math.ceil(H * k) }), x = c.getContext('2d', { willReadFrequently: true }); x.scale(k, k); x.drawImage(im, 0, 0, W, H);
  return { c, k, svg };
}
const shift = (o, R) => renderObj({ ...o, x: o.x - R.x, y: o.y - R.y });
async function rasterize(l, dpi) {
  const R = bbox(l.map(extent)); RN = pageNum(); const { c, k, svg } = await toCanvas(l.map(o => shift(o, R)), R, dpi / 96);
  try { return { R, src: c.toDataURL('image/png'), px: c.width, dpi: round(k * 96, 0) }; }
  catch { return { R, src: svg, px: R.w * MM, dpi: 0 }; }                       // navegadors que no permeten llegir el canvas: imatge SVG
}
/* ---------- Selector de color (Color Picker): mostra la pàgina i la mesa de treball ---------- */
let pickC = null;
async function pickCanvas() {
  const key = snapS + cur.m + cur.i; if (pickC?.key === key) return pickC;
  const R = bbox([{ x: 0, y: 0, w: doc.page.w, h: doc.page.h }, ...doc.board.map(extent)]), pe = renderPage(doc, pg());
  Object.assign(pe.style, { position: 'absolute', left: -R.x * MM + 'px', top: -R.y * MM + 'px' }); RN = pageNum();
  const { c, k } = await toCanvas([pe, ...doc.board.map(o => shift(o, R))], R, 2);
  return pickC = { key, R, k, x: c.getContext('2d') };
}
const toHex = d => '#' + [...d].slice(0, 3).map(v => v.toString(16).padStart(2, '0')).join('');
async function sampleAt(e) {
  const p = pt(e);
  try { const P = await pickCanvas(), d = P.x.getImageData(Math.floor((p.x - P.R.x) * MM * P.k), Math.floor((p.y - P.R.y) * MM * P.k), 1, 1).data; return d[3] > 20 ? toHex(d) : null; }
  catch { const el = document.elementFromPoint(e.clientX, e.clientY), o = el?.closest(OBJ) && byId(el.closest(OBJ).dataset.id);   // alternativa: color de l'objecte
    return o ? hex(col([o.fill, o.stroke, o.color].find(c => c && c !== 'none'))) : el?.closest('#page') ? hex(col(doc.page.bg)) : null; }
}
const pickTip = (e, c) => { const t = $('#picktip'); t.style.display = c ? 'flex' : 'none'; if (!c) return; t.style.left = e.clientX + 18 + 'px'; t.style.top = e.clientY + 18 + 'px'; t.innerHTML = `<i style="background:${c}"></i>${c}`; };
async function pickAt(e) {
  const c = await sampleAt(e); if (!c) return toast('Aquí no hi ha cap color per recollir');
  ls('picked', [c, ...(ls('picked') || []).filter(x => x !== c)].slice(0, 10));
  const l = live();
  if (l.length) { const k = e.shiftKey || (l[0].type === 'line' && ctgt === 'fill') ? 'stroke' : ctgt; setProp(k, c, true); toast(`${c} aplicat a: ${{ fill: 'farciment', stroke: 'línia', color: 'text' }[k]}`); }
  else { navigator.clipboard?.writeText(c).catch(() => { }); toast(`Color ${c} recollit (a la pestanya Color i al porta-retalls)`); }
  if (tab === 'color') buildPanel();
}
async function toPicture(keep) {
  stopEdit(); const l = live().filter(o => !o.hidden); if (!l.length) return toast('Seleccioneu els objectes que voleu convertir');
  const r = await rasterize(l, toPicture.dpi || 300).catch(() => null); if (!r) return toast('No s\'ha pogut convertir la selecció');
  const a = listOf(l[0]), o = mk('img', { src: r.src, nw: r.px, fit: 'fill', x: round(r.R.x, 2), y: round(r.R.y, 2), w: round(r.R.w, 2), h: round(r.R.h, 2), name: 'Imatge convertida' });
  a.splice(Math.max(...l.filter(x => a.includes(x)).map(x => a.indexOf(x))) + 1, 0, o);
  if (!keep) for (const b of [pg().objs, doc.board]) b.splice(0, b.length, ...b.filter(x => !l.includes(x)));
  sel = [o]; commit(); toast(r.dpi ? `Convertit en imatge PNG de ${r.px} px d'amplada (${r.dpi} ppp)` : 'Convertit en imatge SVG');
}
const OBJ = '#page .obj:not(.mobj), #pb .obj';
// Mou els objectes entre la pàgina i la mesa de treball segons on queden (cada grup es tracta com una unitat)
function settle() {
  const P = doc.page, a = pg().objs, B = doc.board;
  units([...a, ...B]).forEach(u => { const b = bbox(u), dst = b.x >= P.w || b.y >= P.h || b.x + b.w <= 0 || b.y + b.h <= 0 ? B : a;
    u.forEach(o => { const src = a.includes(o) ? a : B; if (src !== dst) { src.splice(src.indexOf(o), 1); dst.push(o); } }); });
}
const nudged = debounce(() => commit(), 400);
