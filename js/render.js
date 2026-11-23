'use strict';
/* Renderitzat d'objectes i pàgines (es reutilitza a l'editor, miniatures, impressió i exportació HTML) */
const BASE_CSS = `.ppage{position:relative;overflow:hidden;flex:none}
.obj{position:absolute;box-sizing:border-box;transform-origin:50% 50%}
.obj>svg{display:block;overflow:visible}
.txt{box-sizing:border-box;outline:none;overflow-wrap:break-word}
.txt p{margin:0 0 .45em}.txt ul,.txt ol{margin:0 0 .45em;padding-left:1.3em}
.t-art .txt{white-space:pre}
.t-frame{display:flex;flex-direction:column;overflow:hidden}.t-frame .txt{width:100%;flex:none}
.t-img{overflow:hidden}.t-img img{width:100%;height:100%;display:block}
.t-table table,.t-cal table{width:100%;height:100%;border-collapse:collapse;table-layout:fixed}
.t-table td{padding:.5mm 1.2mm;vertical-align:middle;overflow:hidden;overflow-wrap:break-word}
.t-cal{display:flex;flex-direction:column;overflow:hidden}.t-cal .ct{text-align:center;font-weight:bold;padding:1mm}
.t-cal th{font-weight:bold;padding:.6mm;text-transform:capitalize;font-size:.85em}
.t-cal td{vertical-align:top;padding:.6mm 1mm;overflow:hidden}.t-cal td small{display:block;font-size:.7em;line-height:1.1}
.ish::after{content:'';position:absolute;inset:0;box-shadow:var(--ish);border-radius:inherit;pointer-events:none}
.t-cal td.ev{font-weight:bold}.t-cal td.x{opacity:.25}`;
document.head.append(h('style', { text: BASE_CSS }));

let RD, RN = 1, GID = 0;                                 // document i núm. de pàgina en renderitzat
const col = c => c && c[0] === '$' ? SCHEMES[(RD || doc).scheme][1][c[1] - 1] : c || 'none';
const bg = o => o.fill === 'none' ? 'transparent' : o.grad === 'none' ? col(o.fill)
  : o.grad === 'linear' ? `linear-gradient(${o.gang}deg,${col(o.fill)},${col(o.fill2)})` : `radial-gradient(circle,${col(o.fill)},${col(o.fill2)})`;
/* Ombres: paral·lela, resplendor exterior i ombra interior (el desplaçament és global: no gira amb l'objecte) */
const SHD = { shT: 'none', shC: '#000000', shO: .4, shB: 1.5, shX: 1.2, shY: 1.2 };
const rgba = (c, a) => { const x = hex(col(c)); return `rgba(${[1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16))},${a})`; };
function shadow(o) {
  const s = { ...SHD, ...o, shT: o.shT ?? (o.shadow ? 'drop' : 'none') }, a = -o.rot * Math.PI / 180, c = rgba(s.shC, s.shO);
  const x = (s.shX * Math.cos(a) - s.shY * Math.sin(a)) * (o.fh ? -1 : 1), y = (s.shX * Math.sin(a) + s.shY * Math.cos(a)) * (o.fv ? -1 : 1);
  return { ...s, x: round(x, 2), y: round(y, 2), c };
}
const shadowCss = o => {
  const s = shadow(o);
  return s.shT === 'drop' ? `filter:drop-shadow(${s.x}mm ${s.y}mm ${s.shB}mm ${s.c});` : s.shT === 'glow' ? `filter:drop-shadow(0 0 ${s.shB}mm ${s.c}) drop-shadow(0 0 ${s.shB / 2}mm ${s.c});`
    : s.shT === 'inner' && !['shape', 'line', 'art'].includes(o.type) ? `--ish:inset ${s.x}mm ${s.y}mm ${s.shB}mm ${s.c};` : '';
};
const DASH = { solid: 'solid', dash: 'dashed', dot: 'dotted' };
const boxCss = o => `background:${bg(o)};${o.stroke !== 'none' ? `border:${o.sw}mm ${DASH[o.dash]} ${col(o.stroke)};` : ''}border-radius:${o.rad}mm;`;
const GEN = /^(serif|sans-serif|monospace|system-ui|cursive)$/;
const ff = f => GEN.test(f) ? f : `'${f}',${f === 'Impact' ? "'Arial Narrow','Arial Black'," : ''}${/Georgia|Times|Palatino|Garamond/.test(f) ? 'serif' : /Courier/.test(f) ? 'monospace' : 'sans-serif'}`;
const textCss = o => `font-family:${ff(o.font)};font-size:${o.size}pt;color:${col(o.color)};font-weight:${o.bold ? 700 : 400};font-style:${o.italic ? 'italic' : 'normal'};text-decoration:${o.und ? 'underline' : 'none'};text-align:${o.align};line-height:${o.lh};letter-spacing:${o.ls}pt;`;
const txtStyle = o => textCss(o) + (o.type === 'frame' ? `padding:${o.pad}mm;column-count:${o.cols};column-gap:${o.gap}mm;${o.cols > 1 ? 'height:100%;column-fill:balance;' : ''}` : '');
const pn = s => String(s).replace(/\{N\}/g, RN).replace(/\{T\}/g, (RD || doc).pages.length);
const imgFilter = o => `brightness(${o.br}%) contrast(${o.ct}%) saturate(${o.sat}%) hue-rotate(${o.hue}deg) grayscale(${o.gray}%) sepia(${o.sep}%) blur(${o.blur}px) invert(${o.inv}%)`;

// Camins SVG de les formes ràpides (QuickShapes)
function shapePath(s, w, h, n = 5, r = 0) {
  const reg = (k, q = 1) => [...Array(k)].map((_, i) => { const a = Math.PI * 2 * i / k - Math.PI / 2, f = i % 2 ? q : 1; return (i ? 'L' : 'M') + round(w / 2 + Math.cos(a) * w / 2 * f, 2) + ' ' + round(h / 2 + Math.sin(a) * h / 2 * f, 2); }).join('') + 'Z';
  switch (s) {
    case 'round': r = Math.min(w, h) * .2; // continua com a rectangle
    case 'rect': r = clamp(r, 0, Math.min(w, h) / 2); return r ? `M${r} 0H${w - r}A${r} ${r} 0 0 1 ${w} ${r}V${h - r}A${r} ${r} 0 0 1 ${w - r} ${h}H${r}A${r} ${r} 0 0 1 0 ${h - r}V${r}A${r} ${r} 0 0 1 ${r} 0Z` : `M0 0H${w}V${h}H0Z`;
    case 'ellipse': return `M0 ${h / 2}A${w / 2} ${h / 2} 0 1 0 ${w} ${h / 2}A${w / 2} ${h / 2} 0 1 0 0 ${h / 2}Z`;
    case 'tri': return `M${w / 2} 0L${w} ${h}H0Z`;
    case 'rtri': return `M0 0L${w} ${h}H0Z`;
    case 'diamond': return reg(4);
    case 'poly': return reg(Math.max(3, n));
    case 'star': return reg(Math.max(3, n) * 2, .45);
    case 'arrow': return `M0 ${h * .3}H${w * .6}V0L${w} ${h / 2}L${w * .6} ${h}V${h * .7}H0Z`;
    case 'heart': return `M${w / 2} ${h}C${w * .05} ${h * .65} ${-w * .05} ${h * .2} ${w * .25} ${h * .05}C${w * .4} ${-h * .02} ${w / 2} ${h * .12} ${w / 2} ${h * .25}C${w / 2} ${h * .12} ${w * .6} ${-h * .02} ${w * .75} ${h * .05}C${w * 1.05} ${h * .2} ${w * .95} ${h * .65} ${w / 2} ${h}Z`;
    case 'speech': return `M0 0H${w}V${h * .72}H${w * .45}L${w * .2} ${h}V${h * .72}H0Z`;
    case 'cross': { const a = w / 3, b = h / 3; return `M${a} 0H${2 * a}V${b}H${w}V${2 * b}H${2 * a}V${h}H${a}V${2 * b}H0V${b}H${a}Z`; }
    case 'line': return `M0 ${h / 2}H${w}`;
  }
}
function svgShape(o) {
  const Wp = o.w * MM, Hp = o.h * MM, line = o.type === 'line', s = o.stroke === 'none' ? 0 : o.sw * MM, id = 'g' + ++GID;
  let defs = '', fill = col(o.fill), mark = '';
  if (!line && o.fill !== 'none' && o.grad !== 'none') {
    const a = (o.gang - 90) * Math.PI / 180, c = Math.cos(a) / 2, n = Math.sin(a) / 2, st = `<stop offset="0" stop-color="${col(o.fill)}"/><stop offset="1" stop-color="${col(o.fill2)}"/>`;
    defs = o.grad === 'linear' ? `<linearGradient id="${id}" x1="${.5 - c}" y1="${.5 - n}" x2="${.5 + c}" y2="${.5 + n}">${st}</linearGradient>` : `<radialGradient id="${id}">${st}</radialGradient>`;
    fill = `url(#${id})`;
  }
  if (line && o.arrow !== 'none') {
    defs += `<marker id="m${id}" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${col(o.stroke)}"/></marker>`;
    mark = `marker-end="url(#m${id})"` + (o.arrow === 'both' ? ` marker-start="url(#m${id})"` : '');
  }
  const sh = shadow(o); let flt = '';
  if (sh.shT === 'inner' && !line) {
    defs += `<filter id="i${id}" x="-50%" y="-50%" width="200%" height="200%"><feComponentTransfer in="SourceAlpha"><feFuncA type="table" tableValues="1 0"/></feComponentTransfer><feGaussianBlur stdDeviation="${sh.shB * MM / 2}"/><feOffset dx="${sh.x * MM}" dy="${sh.y * MM}" result="s"/><feFlood flood-color="${sh.c}"/><feComposite in2="s" operator="in"/><feComposite in2="SourceAlpha" operator="in" result="i"/><feMerge><feMergeNode in="SourceGraphic"/><feMergeNode in="i"/></feMerge></filter>`;
    flt = `filter="url(#i${id})"`;
  }
  const d = line ? shapePath('line', Wp, Hp) : shapePath(o.shape, Wp - s, Hp - s, o.n, o.rad * MM);
  const da = { solid: '', dash: `${s * 3} ${s * 2}`, dot: `0 ${s * 2}` }[o.dash];
  return `<svg width="${Wp}" height="${Hp}"><defs>${defs}</defs><path d="${d}" transform="translate(${line ? 0 : s / 2} ${line ? 0 : s / 2})" fill="${line ? 'none' : fill}" stroke="${col(o.stroke)}" stroke-width="${s}" stroke-dasharray="${da}" stroke-linecap="${o.dash === 'dot' ? 'round' : 'butt'}" stroke-linejoin="round" ${mark} ${flt}/></svg>`;
}

// Gràfics (barres, línies, àrea, sectors, anell)
function chartSvg(o) {
  const Wp = o.w * MM, Hp = o.h * MM, f = o.size * 4 / 3, rows = o.data.trim().split(/\n/).map(l => l.split(/[;,\t]/).map(s => s.trim()));
  const ser = rows[0].slice(1), data = rows.slice(1), cats = data.map(r => r[0]), v = data.map(r => ser.map((_, j) => parseFloat(r[j + 1]) || 0));
  const pal = [...SCHEMES[(RD || doc).scheme][1].slice(0, 4), '#7f8c8d', '#8e44ad', '#16a085', '#d35400'], C = i => pal[i % pal.length];
  const Tx = (x, y, t, a = 'middle', ex = '') => `<text x="${x}" y="${y}" text-anchor="${a}" ${ex}>${esc(t)}</text>`;
  const pie = o.ctype === 'pie' || o.ctype === 'donut', top = o.title ? f * 2.4 : f, bot = Hp - f * (o.legend ? 3.4 : 2), L = pie ? f : f * 3.2, R = Wp - f;
  let s = o.title ? Tx(Wp / 2, f * 1.5, o.title, 'middle', `font-weight="bold" font-size="${f * 1.2}"`) : '';
  const leg = pie ? cats : ser;
  if (o.legend) leg.forEach((n, i) => { const x = L + i * (R - L) / leg.length; s += `<rect x="${x}" y="${Hp - f * 1.5}" width="${f * .8}" height="${f * .8}" rx="2" fill="${C(i)}"/>` + Tx(x + f * 1.1, Hp - f * .8, n, 'start'); });
  if (pie) {
    const tot = v.reduce((a, r) => a + r[0], 0) || 1, cx = Wp / 2, cy = (top + bot) / 2, r = Math.max(1, Math.min(R - L, bot - top) / 2); let a = -Math.PI / 2;
    v.forEach((rw, i) => { const b = a + rw[0] / tot * Math.PI * 2, P = t => `${cx + r * Math.cos(t)} ${cy + r * Math.sin(t)}`;
      s += `<path d="M${cx} ${cy}L${P(a)}A${r} ${r} 0 ${b - a > Math.PI ? 1 : 0} 1 ${P(b - 1e-6)}Z" fill="${C(i)}" stroke="#fff" stroke-width="1"/>`; a = b; });
    if (o.ctype === 'donut') s += `<circle cx="${cx}" cy="${cy}" r="${r * .55}" fill="${o.fill === 'none' ? '#fff' : col(o.fill)}"/>`;
  } else {
    const m = Math.max(1e-9, ...v.flat()), e = 10 ** Math.floor(Math.log10(m)), max = [1, 2, 2.5, 5, 10].find(k => k * e >= m) * e;
    const Y = x => bot - Math.max(0, x) / max * (bot - top), gw = (R - L) / Math.max(1, cats.length);
    for (let i = 0; i <= 4; i++) { const y = Y(max * i / 4); s += `<line x1="${L}" x2="${R}" y1="${y}" y2="${y}" stroke="#8884"/>` + Tx(L - 4, y + f / 3, round(max * i / 4, 2), 'end'); }
    cats.forEach((c, i) => s += Tx(L + gw * (i + .5), bot + f * 1.3, c));
    if (o.ctype === 'bar') v.forEach((rw, i) => rw.forEach((x, j) => { const bw = gw * .8 / ser.length; s += `<rect x="${L + gw * (i + .1) + bw * j}" y="${Y(x)}" width="${bw * .92}" height="${bot - Y(x)}" fill="${C(j)}"/>`; }));
    else ser.forEach((_, j) => { const p = v.map((rw, i) => `${L + gw * (i + .5)},${Y(rw[j])}`).join(' ');
      if (o.ctype === 'area') s += `<polygon points="${L + gw / 2},${bot} ${p} ${L + gw * (cats.length - .5)},${bot}" fill="${C(j)}" fill-opacity=".4"/>`;
      s += `<polyline points="${p}" fill="none" stroke="${C(j)}" stroke-width="2.2"/>` + v.map((rw, i) => `<circle cx="${L + gw * (i + .5)}" cy="${Y(rw[j])}" r="2.5" fill="${C(j)}"/>`).join(''); });
  }
  return `<svg width="${Wp}" height="${Hp}" font-family="${ff(o.font)}" font-size="${f}" fill="${col(o.color)}">${s}</svg>`;
}

// Calendari mensual amb esdeveniments ("dia: text" per línia)
function calHtml(o) {
  const d0 = new Date(o.year, o.month, 1), days = new Date(o.year, o.month + 1, 0).getDate(), off = (d0.getDay() + (o.mon ? 6 : 0)) % 7, ev = {};
  (o.events || '').split('\n').forEach(l => { const m = l.match(/^\s*(\d+)\s*[:\-]\s*(.+)/); if (m) ev[+m[1]] = m[2]; });
  const wd = [...Array(7)].map((_, i) => new Date(2024, 0, (o.mon ? 1 : 7) + i).toLocaleDateString('ca', { weekday: 'short' }));
  const bd = `border:${o.sw}mm solid ${col(o.stroke)}`, hd = `background:${col(o.fill2)};color:#fff;${bd}`;
  let r = `<tr>${wd.map(d => `<th style="${hd}">${d}</th>`).join('')}</tr>`;
  for (let c = 0; c < Math.ceil((off + days) / 7) * 7; c++) {
    const d = c - off + 1, ok = d > 0 && d <= days, we = c % 7 === (o.mon ? 6 : 0);
    r += (c % 7 ? '' : '<tr>') + `<td class="${ok ? ev[d] ? 'ev' : '' : 'x'}" style="${bd};${we && ok ? `color:${col(o.fill2)}` : ''}">${ok ? d : ''}${ok && ev[d] ? `<small>${esc(ev[d])}</small>` : ''}</td>`;
  }
  const t = d0.toLocaleDateString('ca', { month: 'long', year: 'numeric' });
  return `<div class="ct" style="background:${col(o.fill2)};color:#fff;font-size:1.4em">${t[0].toUpperCase() + t.slice(1)}</div><table style="flex:1">${r}</table>`;
}

// Codi QR (biblioteca qrcode-generator, MIT)
const QRP = { url: '', text: '', mail: 'mailto:', tel: 'tel:', sms: 'SMSTO:', wifi: 'WIFI:S:' };
function qrSvg(o) {
  try {
    qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
    const q = qrcode(0, o.ec); q.addData(QRP[o.qtype] + o.qtext + (o.qtype === 'wifi' ? ';;' : '')); q.make();
    const n = q.getModuleCount(); let p = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) p += `M${c} ${r}h1v1h-1z`;
    return `<svg viewBox="-2 -2 ${n + 4} ${n + 4}" width="100%" height="100%" shape-rendering="crispEdges"><path d="${p}" fill="${col(o.color)}"/></svg>`;
  } catch { return '<div class="ph">Text massa llarg per al codi QR</div>'; }
}

function tableHtml(o) {
  let r = '';
  for (let i = 0; i < o.rows; i++) {
    r += '<tr>';
    for (let j = 0; j < o.cols; j++) { const hd = o.head && !i; r += `<td data-r="${i}" data-c="${j}" style="border:${o.sw}mm solid ${col(o.stroke)};${hd ? `background:${col(o.fill2)};color:#fff;font-weight:bold` : o.zebra && i % 2 ? 'background:#0000000d' : ''}">${o.cells[i]?.[j] ?? ''}</td>`; }
    r += '</tr>';
  }
  return `<table>${r}</table>`;
}

/* ---------- Trajectòries de text predefinides (text artístic) ---------- */
const TPATHS = [['none', 'Sense trajectòria'], ['line', 'Línia'], ['circle', 'Cercle'], ['badge', 'Insígnia'], ['button', 'Botó'], ['bcircle', 'Cercle inferior'], ['tcircle', 'Cercle superior'], ['wave', 'Ona'], ['c', 'Trajectòria en C'], ['rc', 'C invertida']];
const hasPath = o => o?.type === 'art' && !!o.tpath && o.tpath !== 'none';
const textLines = html => h('div', { html: String(html).replace(/<br\s*\/?>|<\/(p|div|li)>/gi, '\n') }).textContent.split('\n').map(s => s.trim()).filter(Boolean);
// Les trajectòries són llistes de nodes Bézier {x, y, ix, iy (nansa d'entrada), ox, oy (nansa de sortida)}, una per línia de text
const node = (x, y, ix = x, iy = y, ox = x, oy = y) => ({ x, y, ix, iy, ox, oy });
const scaleN = (N, sx, sy) => N.map(n => ({ x: n.x * sx, y: n.y * sy, ix: n.ix * sx, iy: n.iy * sy, ox: n.ox * sx, oy: n.oy * sy }));
const nodesD = N => `M${round(N[0].x, 2)} ${round(N[0].y, 2)}` + N.slice(1).map((n, i) => `C${[N[i].ox, N[i].oy, n.ix, n.iy, n.x, n.y].map(v => round(v, 2)).join(' ')}`).join('');
function arcNodes(cx, cy, rx, ry, a1, a2) {                // arc d'el·lipse (graus) en trams Bézier de 90° com a màxim
  const D = Math.PI / 180, n = Math.ceil(Math.abs(a2 - a1) / 90 - 1e-9), da = (a2 - a1) / n * D, k = 4 / 3 * Math.tan(da / 4);
  return [...Array(n + 1)].map((_, i) => { const a = a1 * D + i * da, x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a), tx = -rx * Math.sin(a) * k, ty = ry * Math.cos(a) * k; return node(x, y, x - tx, y - ty, x + tx, y + ty); });
}
function tpathNodes(k, W, H, f) {                         // caixa W×H; f = mida de la lletra en px
  const cx = W / 2, cy = H / 2, ro = [Math.max(1, W / 2 - f), Math.max(1, H / 2 - f)], ri = [Math.max(1, W / 2 - f * .3), Math.max(1, H / 2 - f * .3)];
  const arc = (r, a, b) => arcNodes(cx, cy, r[0], r[1], a, b), top = arc(ro, 180, 360), bot = arc(ri, 180, 0), y = cy + f / 3, mid = [node(0, y, 0, y, W / 3, y), node(W, y, W * 2 / 3, y)];
  return { line: [mid], circle: [arc(ro, 90, 450)], tcircle: [top], bcircle: [bot], badge: [top, bot], button: [top, mid, bot], c: [arc(ro, 45, 315)], rc: [arc(ro, -135, 135)],
    wave: [[node(0, cy, 0, cy, W / 6, f), node(W / 2, cy, W / 3, H - f, W * 2 / 3, f), node(W, cy, W * 5 / 6, f)]] }[k] || [mid];
}
const tpathGeo = (k, W, H, f) => tpathNodes(k, W, H, f).map(nodesD);
const pathNodes = (o, W, H) => o.tpath === 'custom' && o.tpn ? o.tpn.map(N => scaleN(N, W, H)) : tpathNodes(o.tpath, W, H, o.size * 4 / 3);
function pathText(o) {
  const W = o.w * MM, H = o.h * MM, f = o.size * 4 / 3, ps = pathNodes(o, W, H).map(nodesD), id = 't' + ++GID, s = o.tps ?? 0, e = o.tpe ?? 100;
  const [a, off] = o.align === 'left' ? ['start', s] : o.align === 'right' ? ['end', e] : ['middle', (s + e) / 2];
  let L = textLines(o.html); if (L.length > ps.length) L = [...L.slice(0, ps.length - 1), L.slice(ps.length - 1).join(' ')];
  return `<svg width="${W}" height="${H}" font-family="${ff(o.font)}" font-size="${f}" fill="${col(o.color)}" font-weight="${o.bold ? 700 : 400}" font-style="${o.italic ? 'italic' : 'normal'}" letter-spacing="${o.ls}pt" text-decoration="${o.und ? 'underline' : 'none'}">`
    + `<defs>${ps.map((d, i) => `<path id="${id}_${i}" d="${d}"/>`).join('')}</defs>${ps.map((d, i) => `<text text-anchor="${a}"><textPath href="#${id}_${i}" startOffset="${off}%">${esc(pn(L[i] || ''))}</textPath></text>`).join('')}</svg>`;
}
const KIND = {
  art: o => hasPath(o) ? pathText(o) : `<div class="txt" style="${txtStyle(o)}">${pn(o.html)}</div>`,
  frame: o => `<div class="txt" style="${txtStyle(o)}">${pn(o.html)}</div>`,
  shape: svgShape, line: svgShape, chart: chartSvg, cal: calHtml, qr: qrSvg, table: tableHtml,
  img: o => o.src ? `<img src="${o.src}" alt="" draggable="false" style="object-fit:${o.fit};object-position:${o.px}% ${o.py}%;transform:scale(${o.zm});filter:${imgFilter(o)}">` : `<div class="ph">${icon('image')}<span>Doble clic per afegir una imatge</span></div>`
};
function place(e, o) {
  const s = e.style; s.left = o.x * MM + 'px'; s.top = o.y * MM + 'px';
  if (o.type !== 'art' || hasPath(o) || e.classList.contains('sbox')) { s.width = o.w * MM + 'px'; s.height = o.h * MM + 'px'; }
  s.transform = `rotate(${o.rot}deg)` + (o.fh || o.fv ? ` scale(${o.fh ? -1 : 1},${o.fv ? -1 : 1})` : '');
}
function renderObj(o, ed) {
  const svgT = ['shape', 'line'].includes(o.type), txtT = ['art', 'frame', 'table', 'cal'].includes(o.type);
  const e = h('div', { class: 'obj t-' + o.type, id: ed ? 'o-' + o.id : null, html: KIND[o.type](o),
    style: `${svgT ? '' : boxCss(o)}${txtT && o.type !== 'frame' ? textCss(o) : ''}opacity:${o.op};${shadowCss(o)}${o.cpT || o.cpR || o.cpB || o.cpL ? `clip-path:inset(${o.cpT || 0}% ${o.cpR || 0}% ${o.cpB || 0}% ${o.cpL || 0}%);` : ''}${o.type === 'frame' ? `justify-content:${o.va};` : ''}${o.hidden ? 'display:none;' : ''}` });
  e.dataset.id = o.id; if (/--ish/.test(e.style.cssText)) e.classList.add('ish'); place(e, o); return e;
}
const BGF = { cover: 'cover', contain: 'contain', fill: '100% 100%' };
// Renderitza una pàgina (fons, pàgina mestra i objectes)
function renderPage(d, p, ed) {
  RD = d; RN = d.pages.includes(p) ? d.pages.indexOf(p) + 1 : '#';
  const e = h('div', { class: 'ppage', style: `width:${d.page.w * MM}px;height:${d.page.h * MM}px;background:${col(d.page.bg)}` });
  const m = p.master && d.masters.find(x => x.id === p.master), bi = p.bgi || (m !== p && m?.bgi);
  if (bi) e.append(h('div', { class: 'pbg', style: `position:absolute;inset:0;opacity:${bi.op};background:url("${bi.src}") center/${bi.fit === 'tile' ? bi.tw + 'mm auto repeat' : (BGF[bi.fit] || 'cover') + ' no-repeat'}` }));
  if (m && m !== p) m.objs.forEach(o => { const x = renderObj(o); x.classList.add('mobj'); e.append(x); });
  p.objs.forEach(o => e.append(renderObj(o, ed)));
  RD = null; return e;
}
// Miniatura escalada d'una pàgina
function thumb(d, p, w) {
  const k = w / (d.page.w * MM), e = renderPage(d, p);
  e.style.transform = `scale(${k})`; e.style.transformOrigin = '0 0';
  return h('div', { class: 'pv', style: `width:${w}px;height:${d.page.h * MM * k}px;overflow:hidden;flex:none` }, e);
}
