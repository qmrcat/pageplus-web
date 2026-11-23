'use strict';
/* Interfície: ordres, menús, barres d'eines, Studio, diàlegs, desar/obrir/exportar i inici */
const ins = type => () => { const o = mk(type); o.x = (doc.page.w - o.w) / 2; o.y = (doc.page.h - o.h) / 2; addObj(o); };
const insArt = html => () => { const o = mk('art', { html, size: 10, font: 'Arial', color: '#444444', x: doc.page.ml, y: doc.page.h - doc.page.mb + 3 }); addObj(o); };
const tog = k => () => { view[k] = !view[k]; ls('view', view); document.body.classList.toggle('nor', !view.rul); render(); };
const txt = k => () => { const o = sel[0]; if (o) setProp(k, !o[k], true); };
const al = v => () => setProp('align', v, true);
const MONTHS = [...Array(12)].map((_, i) => [i, new Date(2024, i, 1).toLocaleDateString('ca', { month: 'long' })]);

// Registre d'ordres: [etiqueta, icona, drecera, funció, marcada?]
const CMD = {
  startup: ['Assistent d\'inici…', 'new', '', () => startup()], new: ['Nova publicació en blanc', 'page', '', () => startup('blank')],
  open: ['Obre un fitxer…', 'open', 'Ctrl+O', () => pickFile('.ppw,.json', openFile)], library: ['Obre de la biblioteca…', 'pages', '', () => startup('recent')],
  closeTab: ['Tanca la publicació', 'close', 'Ctrl+Alt+W', () => closeTab()], nextTab: ['Publicació següent', 'right', 'Ctrl+Alt+ArrowRight', () => useTab((act + 1) % tabs.length)],
  prevTab: ['Publicació anterior', 'left', 'Ctrl+Alt+ArrowLeft', () => useTab((act + tabs.length - 1) % tabs.length)],
  save: ['Desa', 'save', 'Ctrl+S', () => save()], saveAs: ['Desa com a…', '', 'Ctrl+Shift+S', () => save(true)],
  download: ['Descarrega la publicació (.ppw)', 'download', '', () => download(doc.name + '.ppw', JSON.stringify(doc))],
  exportHtml: ['Exporta com a pàgina web (HTML)…', 'web', '', () => exportHtml()], print: ['Imprimeix / Publica com a PDF…', 'print', 'Ctrl+P', () => printDoc()],
  preview: ['Previsualització d\'impressió', 'preview', '', () => preview()], preflight: ['Comprovació prèvia…', 'check', '', () => preflight()],
  undo: ['Desfés', 'undo', 'Ctrl+Z', undo], redo: ['Refés', 'redo', 'Ctrl+Y', redo],
  cut: ['Retalla', 'cut', 'Ctrl+X', () => { copySel(); del(); }], copy: ['Copia', 'copy', 'Ctrl+C', copySel], paste: ['Enganxa', 'paste', 'Ctrl+V', paste],
  dup: ['Duplica', 'dup', 'Ctrl+D', () => { copySel(); paste(); }], del: ['Elimina', 'trash', 'Supr', del],
  selAll: ['Selecciona-ho tot', '', 'Ctrl+A', () => setSel(pg().objs.filter(o => !o.locked && !o.hidden))],
  painter: ['Pintor de format', 'painter', '', () => { if (!sel[0]) return toast('Seleccioneu l\'objecte d\'origen'); painter = Object.fromEntries(STYLE_KEYS.map(k => [k, sel[0][k]])); document.body.classList.add('drawing'); toast('Feu clic a l\'objecte on voleu aplicar el format'); }],
  editText: ['Edita el text', 'text', 'F2', () => startEdit(sel[0])], textToTable: ['Converteix el text en taula', 'table2', '', textToTable],
  zin: ['Apropa', 'zin', 'Ctrl++', () => setZoom(zoom * 1.25)], zout: ['Allunya', 'zout', 'Ctrl+-', () => setZoom(zoom / 1.25)],
  zfit: ['Pàgina sencera', 'fit', 'Ctrl+0', () => zoomFit()], z100: ['Mida real (100%)', '', 'Ctrl+1', () => setZoom(1)],
  rulers: ['Regles', '', '', tog('rul'), () => view.rul], guides: ['Guies', '', '', tog('guides'), () => view.guides],
  grid: ['Quadrícula de punts', '', '', tog('grid'), () => view.grid], snap: ['Ajusta a guies i objectes', '', '', tog('snap'), () => view.snap],
  studio: ['Mostra/amaga l\'Studio', 'studio', 'F6', () => document.body.classList.toggle('sx')],
  theme: ['Tema clar / fosc', 'theme', '', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark')],
  fullscreen: ['Pantalla completa', 'fs', '', () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.()],
  insImage: ['Imatge des del disc…', 'image', '', () => pickFile('image/*', f => imageInto(f))],
  insTable: ['Taula', 'table', '', ins('table')], insChart: ['Gràfic', 'chart', '', ins('chart')], insCal: ['Calendari', 'cal', '', ins('cal')], insQr: ['Codi QR', 'qr', '', ins('qr')],
  bgImg: ['Imatge de fons de la pàgina…', 'image', '', () => pickFile('image/*', setBg)], bgDel: ['Treu la imatge de fons', 'trash', '', () => { if (!pg().bgi) return toast('Aquesta pàgina no té imatge de fons pròpia'); delete pg().bgi; commit(); }],
  pageNum: ['Número de pàgina', '', '', insArt('Pàgina {N} de {T}')], date: ['Data d\'avui', '', '', insArt(new Date().toLocaleDateString('ca', { dateStyle: 'long' }))],
  bold: ['Negreta', 'bold', 'Ctrl+B', txt('bold')], italic: ['Cursiva', 'italic', 'Ctrl+I', txt('italic')], und: ['Subratllat', 'und', 'Ctrl+U', txt('und')],
  alL: ['Alinea a l\'esquerra', 'alL', '', al('left')], alC: ['Centra', 'alC', '', al('center')], alR: ['Alinea a la dreta', 'alR', '', al('right')], alJ: ['Justifica', 'alJ', '', al('justify')],
  ul: ['Llista de pics', 'ul', '', () => listCmd('insertUnorderedList')], ol: ['Llista numerada', 'ol', '', () => listCmd('insertOrderedList')],
  shadowFx: ['Ombra i resplendor…', 'shadow', '', () => showTab('line')],
  fitText: ['Ajusta el text al marc', 'fitT', '', fitText], styles: ['Estils de text…', 'text', '', () => showTab('text')], scheme: ['Esquemes de color…', 'color', '', () => showTab('color')],
  front: ['Porta al davant', 'front', '', () => order('front')], fwd: ['Porta endavant', 'up', '', () => order(1)], bwd: ['Envia enrere', 'down', '', () => order(-1)], back: ['Envia al fons', 'back', '', () => order('back')],
  'a:l': ['Alinea a l\'esquerra', 'aL', '', () => align('l')], 'a:cx': ['Centra horitzontalment', 'aCx', '', () => align('cx')], 'a:r': ['Alinea a la dreta', 'aR', '', () => align('r')],
  'a:t': ['Alinea a dalt', 'aT', '', () => align('t')], 'a:cy': ['Centra verticalment', 'aCy', '', () => align('cy')], 'a:b': ['Alinea a baix', 'aB', '', () => align('b')],
  distH: ['Distribueix horitzontalment', 'dH', '', () => distribute('x')], distV: ['Distribueix verticalment', 'dV', '', () => distribute('y')],
  dblIns: ['Element del doble clic…', 'pointer', '', () => dblPop()],
  toPic: ['Converteix en imatge…', 'image', '', () => picDialog()],
  uncrop: ['Treu el retall', 'crop', '', each(o => o.cpT = o.cpR = o.cpB = o.cpL = 0)],
  group: ['Agrupa', 'grp', 'Ctrl+G', group], ungroup: ['Desagrupa', 'ungrp', 'Ctrl+Shift+G', ungroup],
  rotL: ['Gira 90° a l\'esquerra', 'rot', '', () => rot90(-90)], rotR: ['Gira 90° a la dreta', 'rot', '', () => rot90(90)],
  flipH: ['Inverteix horitzontalment', 'flipH', '', () => flip('h')], flipV: ['Inverteix verticalment', 'flipV', '', () => flip('v')],
  lock: ['Bloqueja / desbloqueja', 'lock', '', each(o => o.locked = !o.locked)], hide: ['Amaga / mostra', 'eye', '', each(o => o.hidden = !o.hidden)],
  pageSetup: ['Configuració de la publicació…', 'page', '', () => { dialog('Configuració de la publicació', form(pageFields(), pageGet, pageSet)); }],
  addPage: ['Afegeix una pàgina', 'plus', '', () => addPage()], dupPage: ['Duplica la pàgina', 'dup', '', () => addPage(true)], delPage: ['Elimina la pàgina', 'trash', '', delPage],
  prevPage: ['Pàgina anterior', 'left', 'PageUp', () => goPage(cur.i - 1)], nextPage: ['Pàgina següent', 'right', 'PageDown', () => goPage(cur.i + 1)],
  master: ['Edita la pàgina mestra / torna', 'master', '', toggleMaster], addMaster: ['Afegeix una pàgina mestra', 'plus', '', addMaster],
  keys: ['Dreceres de teclat', 'help', 'F1', () => keysHelp()], about: ['Quant a PagePlus Web', 'help', '', () => about()]
};
const TOOLS = [['pointer', 'Punter', 'pointer', 'V'], ['hand', 'Desplaça la vista', 'hand', 'H'], 0, ['art', 'Text artístic', 'art', 'T'], ['frame', 'Marc de text', 'frame', 'F'],
  ['img', 'Marc d\'imatge', 'image', 'I'], ['shape', 'Formes ràpides', 'shape', 'Q'], ['line', 'Línia', 'line', 'L'], ['shadow', 'Eina d\'ombra', 'shadow', 'S'], ['crop', 'Retall quadrat', 'crop', 'C'], ['picker', 'Selector de color', 'picker', 'P'], 0, ['table', 'Taula', 'table', 'B'], ['chart', 'Gràfic', 'chart', 'G'], ['cal', 'Calendari', 'cal', 'K'], ['qr', 'Codi QR', 'qr', 'R']];
TOOLS.forEach(t => t && (CMD['t:' + t[0]] = [t[1], t[2], t[3], t[0] === 'shape' ? () => shapePop() : () => setTool(t[0])]));
const KEYMAP = Object.fromEntries([...Object.entries(CMD).filter(([, c]) => c[2]).map(([n, c]) => [c[2].toLowerCase().replace('supr', 'delete'), n]),
  ['backspace', 'del'], ['ctrl+=', 'zin'], ['ctrl+shift+z', 'redo']]);
const run = n => { CMD[n]?.[3](); };
const MENUS = [
  ['Fitxer', 'startup new open library | @recent | save saveAs download closeTab | exportHtml print preview preflight'],
  ['Edita', 'undo redo | cut copy paste dup del selAll | painter editText textToTable | dblIns'],
  ['Visualitza', 'zin zout zfit z100 | rulers guides grid snap | studio theme fullscreen'],
  ['Insereix', 't:art t:frame insImage t:img bgImg | t:shape t:line | insTable insChart insCal insQr | pageNum date'],
  ['Format', 'bold italic und | alL alC alR alJ | ul ol | fitText styles scheme | shadowFx'],
  ['Organitza', 'group ungroup toPic | t:crop uncrop | front fwd bwd back | a:l a:cx a:r a:t a:cy a:b | distH distV | rotL rotR flipH flipV | lock hide'],
  ['Pàgines', 'pageSetup | bgImg bgDel | addPage dupPage delPage | prevPage nextPage | master addMaster'],
  ['Finestra', '@tabs | prevTab nextTab closeTab'],
  ['Ajuda', 'keys about']];
const HINTS = {
  pointer: 'Clic: selecciona · Maj+clic: afegeix · Ctrl+clic: dins d\'un grup · Ctrl+arrossega: copia · doble clic: edita (al buit: insereix)', hand: 'Arrossegueu per desplaçar la vista',
  art: 'Feu clic per escriure text artístic', frame: 'Arrossegueu per crear un marc de text', img: 'Arrossegueu per crear un marc d\'imatge',
  shape: 'Arrossegueu per dibuixar la forma', line: 'Arrossegueu per dibuixar una línia (Maj+gir: angles de 15°)', table: 'Arrossegueu per crear una taula',
  path: 'Arrossegueu els nodes, les nanses o les fletxes d\'inici i final · doble clic al camí: afegeix node · doble clic al node: l\'elimina · Alt: nansa independent',
  picker: 'Clic: recull el color i l\'aplica a la selecció (Color: farciment, línia o text) · Maj+clic: a la línia',
  crop: 'Arrossegueu les nanses per retallar · arrossegueu dins l\'objecte per desplaçar-ne el contingut',
  shadow: 'Arrossegueu sobre un objecte per moure\'n l\'ombra · Maj+arrossega: difuminat · Ctrl: només un objecte del grup',
  chart: 'Arrossegueu per crear un gràfic', cal: 'Arrossegueu per crear un calendari', qr: 'Arrossegueu per crear un codi QR'
};

/* ---------- Menús, barres i finestres emergents ---------- */
const kbd = k => k.replace('ArrowRight', '→').replace('ArrowLeft', '←');
const menuItems = list => list.split(' ').flatMap(n => n === '|' ? h('hr') : n[0] === '@' ? DYN[n.slice(1)]() : (c => h('button', {
  class: 'mi', onclick: () => { closeMenus(); hidePop(); run(n); },
  html: `<span class="ic">${c[4] ? c[4]() ? icon('check') : '' : c[1] ? icon(c[1]) : ''}</span>${esc(c[0])}${c[2] ? `<kbd>${kbd(c[2])}</kbd>` : ''}`
}))(CMD[n]));
const closeMenus = () => { $$('.menu.open').forEach(m => m.classList.remove('open')); document.body.classList.remove('mx'); };
function buildMenus() {
  $('#menus').replaceChildren(...MENUS.map(([t, l]) => {
    const d = h('div', { class: 'drop' }), m = h('div', { class: 'menu' }, h('button', {
      text: t, onclick: () => { const o = m.classList.contains('open'); $$('.menu.open').forEach(x => x.classList.remove('open')); if (!o) { d.replaceChildren(...menuItems(l)); m.classList.add('open'); } },
      onmouseenter: () => { if ($('.menu.open') && !m.classList.contains('open') && innerWidth > 700) m.firstChild.click(); }
    }), d);
    return m;
  }));
  document.addEventListener('pointerdown', e => { if (!e.target.closest('#menus,#burger')) closeMenus(); if (!e.target.closest('#pop,[data-t=shape]')) hidePop(); });
}
function showPop(el, x, y) { const p = $('#pop'); p.replaceChildren(el); p.classList.add('on'); p.style.left = clamp(x, 4, innerWidth - p.offsetWidth - 4) + 'px'; p.style.top = clamp(y, 4, innerHeight - p.offsetHeight - 4) + 'px'; }
const hidePop = () => $('#pop').classList.remove('on');
let ctxAt;
const ctxMenu = e => { ctxAt = pt(e); showPop(h('div', {}, menuItems(sel.length ? 'cut copy paste dup del | group ungroup toPic | front fwd bwd back | lock hide | editText painter' : '@ins | paste selAll dblIns | bgImg pageSetup addPage master')), e.clientX, e.clientY); };
const shapeSvg = k => `<svg viewBox="-2 -2 28 28"><path d="${shapePath(k, 24, 24, 5, 0)}"/></svg>`;
// Galeria de formes: des de la barra d'eines activa l'eina; des del menú contextual insereix la forma al punt
function shapePop(x, y, pick = k => { shapeKind = k; setTool('shape'); }) {
  const b = $('[data-t=shape]').getBoundingClientRect();
  showPop(h('div', { class: 'gallery' }, SHAPES.map(([k, n]) => h('button', { title: n, html: shapeSvg(k), onclick: () => { hidePop(); pick(k); } }))),
    x ?? (innerWidth <= 700 ? b.left : b.right + 6), y ?? (innerWidth <= 700 ? b.top - 230 : b.top));
}
function buildBars() {
  $('#burger').innerHTML = icon('menu'); $('#burger').onclick = () => document.body.classList.toggle('mx');
  $('#stdbar').replaceChildren(...'startup open save | print preview preflight | undo redo | cut copy paste painter | zout zfit zin | theme studio'.split(' ')
    .map(n => n === '|' ? h('span', { class: 'sep' }) : btn(CMD[n][1], CMD[n][0] + (CMD[n][2] ? ` (${kbd(CMD[n][2])})` : ''), () => run(n))));
  $('#tools').replaceChildren(...TOOLS.map(t => t ? btn(t[2], `${t[1]} (${t[3]})`, () => run('t:' + t[0])) : h('span', { class: 'sep' })));
  $$('#tools .ib').forEach((b, i) => b.dataset.t = TOOLS.filter(Boolean)[i][0]);
}

/* ---------- Camps reutilitzables (barra de context i Studio) ---------- */
const sp = ['', '', 'sep'], tg = (k, l, ic, val) => [k, l, 'tog', { icon: ic, val }];
const bt = (l, ic, fn, text) => ['', l, 'btn', { icon: ic, fn, text, cls: text ? 'tb' : 'ib' }], bc = (n, text) => bt(CMD[n][0], CMD[n][1], () => run(n), text);
const FITS = [['cover', 'Omple (retalla)'], ['contain', 'Encaixa sencera'], ['fill', 'Estira']], ARROWS = [['none', 'Sense puntes'], ['end', 'Punta final'], ['both', 'Dues puntes']];
const CHARTS = [['bar', 'Barres'], ['line', 'Línies'], ['area', 'Àrees'], ['pie', 'Sectors'], ['donut', 'Anell']];
const QRT = [['url', 'Web / text'], ['mail', 'Correu electrònic'], ['tel', 'Telèfon'], ['sms', 'SMS'], ['wifi', 'Xarxa Wi-Fi']];
const SHP = { 'Cap': { shT: 'none' }, 'Suau': { shT: 'drop', shO: .3, shB: 2, shX: 1, shY: 1.5 }, 'Marcada': { shT: 'drop', shO: .65, shB: .3, shX: 1.5, shY: 1.5 },
  'Llarga': { shT: 'drop', shO: .35, shB: 3, shX: 3, shY: 4 }, 'Resplendor': { shT: 'glow', shC: '#ffd24a', shO: .9, shB: 3 }, 'Interior': { shT: 'inner', shO: .6, shB: 3, shX: 1.5, shY: 1.5 } };
const FILT0 = { br: 100, ct: 100, sat: 100, hue: 0, gray: 0, sep: 0, blur: 0, inv: 0 };
const PRESETS = { 'Original': {}, 'B/N': { gray: 100, ct: 115 }, 'Sèpia': { sep: 85, ct: 95 }, 'Vintage': { sep: 40, sat: 70, ct: 90, br: 105 }, 'Viu': { sat: 160, ct: 115 }, 'Negatiu': { inv: 100 } };
const F = {
  text: [['font', 'Tipus de lletra', 'sel', { list: FONTS }], ['size', 'Mida (pt)', 'num', { min: 2, step: .5 }], tg('bold', 'Negreta', 'bold'), tg('italic', 'Cursiva', 'italic'), tg('und', 'Subratllat', 'und'), ['color', 'Color del text', 'color']],
  align: [tg('align', 'Alinea a l\'esquerra', 'alL', 'left'), tg('align', 'Centra', 'alC', 'center'), tg('align', 'Alinea a la dreta', 'alR', 'right'), tg('align', 'Justifica', 'alJ', 'justify')],
  list: [bc('ul'), bc('ol')],
  para: [['lh', 'Interlineat', 'num', { min: .5, step: .05 }], ['ls', 'Espaiat (pt)', 'num', { step: .1 }]],
  frame: [['cols', 'Columnes', 'num', { min: 1, max: 6, step: 1 }], ['gap', 'Separació (mm)', 'num', { min: 0 }], ['pad', 'Marge interior (mm)', 'num', { min: 0 }], ['va', 'Alineació vertical', 'sel', { list: [['flex-start', 'Dalt'], ['center', 'Centre'], ['flex-end', 'Baix']] }]],
  box: [['fill', 'Farciment', 'color', { none: 1 }], ['stroke', 'Línia', 'color', { none: 1 }], ['sw', 'Gruix (mm)', 'num', { min: 0, step: .1 }]],
  dash: [['dash', 'Estil de línia', 'sel', { list: [['solid', 'Contínua'], ['dash', 'Discontínua'], ['dot', 'Puntejada']] }]],
  align6: ['a:l', 'a:cx', 'a:r', 'a:t', 'a:cy', 'a:b'].map(n => bc(n)),
  tail: [sp, bc('front'), bc('back'), bc('dup'), bc('del'), tg('locked', 'Bloqueja', 'lock')],
  img: [['fit', 'Encaix', 'sel', { list: FITS }], ['zm', 'Zoom', 'range', { min: 1, max: 4, step: .05 }]],
  filters: [['br', 'Brillantor', 'range', { max: 200 }], ['ct', 'Contrast', 'range', { max: 200 }], ['sat', 'Saturació', 'range', { max: 300 }], ['hue', 'To (°)', 'range', { max: 360 }],
    ['gray', 'Escala de grisos', 'range', { max: 100 }], ['sep', 'Sèpia', 'range', { max: 100 }], ['blur', 'Desenfocament', 'range', { max: 10, step: .5 }], ['inv', 'Inverteix', 'range', { max: 100 }]],
  chart: [['ctype', 'Tipus de gràfic', 'sel', { list: CHARTS }], ['title', 'Títol', 'txt'], ['legend', 'Llegenda', 'chk']],
  cal: [['year', 'Any', 'num', { step: 1 }], ['month', 'Mes', 'sel', { list: MONTHS, num: 1 }], ['mon', 'Comença en dilluns', 'chk'], ['fill2', 'Color', 'color']],
  qr: [['qtype', 'Tipus', 'sel', { list: QRT }], ['qtext', 'Contingut', 'txt'], ['color', 'Color', 'color']],
  table: [['rows', 'Files', 'num', { min: 1, step: 1 }], ['cols', 'Columnes', 'num', { min: 1, step: 1 }], ['fill2', 'Capçalera', 'color']],
  shadow: o => [['shT', 'Tipus', 'sel', { list: [['none', 'Sense ombra'], ['drop', 'Ombra paral·lela'], ['glow', 'Resplendor exterior'], ...(['line', 'art'].includes(o?.type) ? [] : [['inner', 'Ombra interior']])] }],
    ['shC', 'Color', 'color'], ['shO', 'Opacitat', 'range', { min: 0, max: 1, step: .05 }], ['shB', 'Difuminat (mm)', 'num', { min: 0, step: .1 }], ['shX', 'Despl. X (mm)', 'num', { step: .1 }], ['shY', 'Despl. Y (mm)', 'num', { step: .1 }]],
  shape: [['shape', 'Forma', 'sel', { list: SHAPES }]], line: [['stroke', 'Color', 'color'], ['sw', 'Gruix (mm)', 'num', { min: .1, step: .1 }], ['arrow', 'Puntes', 'sel', { list: ARROWS }]]
};
const editBtn = bt('Edita el text', 'text', () => startEdit(sel[0]), 1);
const CTX = {
  art: () => [...F.text, sp, ...F.align, sp, bt('Trajectòria de text', 'tpath', e => tpathPop(e.clientX, e.clientY + 20), 1), ...(hasPath(sel[0]) ? [bt('Restableix la trajectòria', 'undo', resetPath, 1)] : []), editBtn], frame: () => [...F.text, sp, ...F.align, ...F.list, sp, F.frame[0], bc('fitText'), editBtn],
  table: () => [...F.text, sp, ...F.table, bt('Edita les cel·les', 'text', () => startEdit(sel[0]), 1)], shape: () => [...F.shape, ...F.box, ...F.dash], line: () => [...F.line, ...F.dash],
  img: () => [bt('Substitueix…', 'image', () => pickImage(sel[0]), 1), bc('t:crop'), ...F.img, bt('PhotoLab', 'props', () => showTab('props'), 1)],
  chart: () => [F.chart[0], ['font', 'Tipus de lletra', 'sel', { list: FONTS }], ['size', 'Mida (pt)', 'num', { min: 4 }], bt('Dades', 'table', () => showTab('props'), 1)],
  cal: () => [...F.cal, bt('Esdeveniments', 'cal', () => showTab('props'), 1)], qr: () => F.qr
};
const selForm = (fields, cls) => form(fields, k => sel[0]?.[k], setProp, cls);
const pageGet = k => { const P = doc.page; return k === 'size' ? (PAGES.find(p => Math.min(p[1], p[2]) === Math.min(P.w, P.h) && Math.max(p[1], p[2]) === Math.max(P.w, P.h)) || ['custom'])[0] : k === 'orient' ? (P.w > P.h ? 'land' : 'port') : P[k]; };
function pageSet(k, v, fin) {
  const P = doc.page;
  if (k === 'size') { const s = PAGES.find(p => p[0] === v); if (s) [P.w, P.h] = P.w > P.h ? [Math.max(s[1], s[2]), Math.min(s[1], s[2])] : [s[1], s[2]]; }
  else if (k === 'orient') { if ((v === 'land') !== (P.w > P.h)) [P.w, P.h] = [P.h, P.w]; } else P[k] = v;
  render(); if (fin) { commit(); if (['size', 'orient', 'w', 'h'].includes(k)) zoomFit(); }
}
const pageFields = () => [['', 'Mida del paper', 'h'], ['size', 'Mida', 'sel', { list: [...PAGES.map(p => [p[0], `${p[0]} (${p[1]}×${p[2]} mm)`]), ['custom', 'Personalitzada']] }],
  ['orient', 'Orientació', 'sel', { list: [['port', 'Vertical'], ['land', 'Horitzontal']] }], ['w', 'Amplada (mm)', 'num', { min: 20 }], ['h', 'Alçada (mm)', 'num', { min: 20 }],
  ['', 'Marges', 'h'], ['mt', 'Superior', 'num', { min: 0 }], ['mb', 'Inferior', 'num', { min: 0 }], ['ml', 'Esquerre', 'num', { min: 0 }], ['mr', 'Dret', 'num', { min: 0 }],
  ['', 'Guies de disseny', 'h'], ['cols', 'Columnes', 'num', { min: 1, step: 1 }], ['rows', 'Files', 'num', { min: 1, step: 1 }], ['gut', 'Separació (mm)', 'num', { min: 0 }], ['bleed', 'Sagnat (mm)', 'num', { min: 0 }],
  ['', 'Fons', 'h'], ['bg', 'Color de fons', 'color']];
function buildCtx() {
  const c = $('#ctxbar'), o = sel[0];
  if (!o) return c.replaceChildren(h('span', { class: 'hint', text: cur.m ? 'Pàgina mestra' : 'Pàgina' }),
    form([pageFields()[1], pageFields()[2], ['bg', 'Fons', 'color'], bc('bgImg'), sp, bc('pageSetup'), bc('addPage'), bc('master'), sp, bc('preview'), bc('preflight')], pageGet, pageSet));
  const g = isGroup(sel), f = sel.length > 1 ? [bc(g ? 'ungroup' : 'group', 1), bc('toPic'), sp, ...F.box, sp, ...F.align6, bc('distH'), bc('distV')] : [...CTX[o.type](), ...(gOf(o) ? [sp, bt('Selecciona el grup', 'grp', () => setSel(members(o)), 1)] : [])];
  c.replaceChildren(h('span', { class: 'hint', text: g ? `Grup · ${sel.length} objectes` : sel.length > 1 ? `${sel.length} objectes` : TYPES[o.type] + (gOf(o) ? ' (dins d\'un grup)' : '') }), selForm([...f, ...F.tail]));
}

/* ---------- Studio (pestanyes) ---------- */
const TABS = [['pages', 'Pàgines', 'pages'], ['layers', 'Objectes', 'layers'], ['color', 'Color', 'color'], ['line', 'Línia', 'stroke'], ['xf', 'Transforma', 'xf'], ['text', 'Text', 'text'], ['props', 'Propietats', 'props'], ['assets', 'Recursos', 'assets']];
let tab = ls('tab') || 'pages', ctgt = 'fill';
const head = (t, ...b) => h('h3', {}, t, ...b);
const label = o => o.name || TYPES[o.type] + (['art', 'frame'].includes(o.type) ? ': ' + h('div', { html: o.html }).textContent.slice(0, 26) : '');
const PANELS = {
  pages() {
    const ths = (l, m) => h('div', { class: 'thumbs' }, l.map((p, i) => h('div', {
      class: 'th' + (cur.m === m && cur.i === i ? ' on' : ''), onclick: () => goPage(i, m), title: m ? 'Doble clic per canviar el nom' : '',
      ondblclick: async () => { if (!m) return; const n = await ask('Nom de la pàgina mestra', p.name); if (n) { p.name = n; commit(); } }
    }, thumb(doc, p, 96), h('span', { text: m ? p.name : `${i + 1}${p.master ? ' · ' + p.master : ''}` }))));
    return [head('Pàgines', ...['addPage', 'dupPage', 'delPage'].map(n => btn(CMD[n][1], CMD[n][0], () => run(n))), btn('up', 'Mou amunt', () => movePage(-1)), btn('down', 'Mou avall', () => movePage(1))),
      cur.m ? h('p', { class: 'empty', text: 'Esteu editant una pàgina mestra. Els seus objectes apareixen a totes les pàgines que la fan servir.' })
        : form([['master', 'Pàgina mestra', 'sel', { list: [['', '(cap)'], ...doc.masters.map(m => [m.id, m.name])] }], bt('Aplica-la a totes', 'pages', () => { doc.pages.forEach(p => p.master = pg().master); commit(); }, 1)],
          k => pg()[k] || '', (k, v) => { pg().master = v || null; commit(); }),
      ths(doc.pages, false), head('Pàgines mestres', btn('plus', 'Afegeix una pàgina mestra', addMaster)), ths(doc.masters, true)];
  },
  layers() {
    const list = (a, empty) => a.length ? h('div', { class: 'list' }, [...a].reverse().map(o => h('div', {
        class: 'li' + (sel.includes(o) ? ' on' : ''), onclick: e => setSel(e.shiftKey ? [...sel, o] : [o]),
        ondblclick: async () => { const n = await ask('Nom de l\'objecte', o.name || TYPES[o.type]); if (n != null) { o.name = n; commit(); } }
      }, btn('eye', 'Mostra / amaga', e => { e.stopPropagation(); o.hidden = !o.hidden; commit(); }, o.hidden ? 'ib off' : 'ib'),
        btn('lock', 'Bloqueja', e => { e.stopPropagation(); o.locked = !o.locked; commit(); }, o.locked ? 'ib' : 'ib off'), o.g ? h('span', { html: icon('grp'), title: 'Dins d\'un grup', style: `margin-left:${(o.g.length - 1) * 12}px;opacity:.6;display:flex` }) : null, h('span', { class: 'nm', text: label(o) }))))
      : h('p', { class: 'empty', text: empty });
    return [head('Objectes de la pàgina', ...['front', 'fwd', 'bwd', 'back', 'del'].map(n => btn(CMD[n][1], CMD[n][0], () => run(n)))),
      list(pg().objs, 'Aquesta pàgina encara no té objectes.'),
      head('Mesa de treball'), list(doc.board, 'Deixeu objectes fora de la pàgina per tenir-los a mà des de totes les pàgines.'),
      h('p', { class: 'empty', text: 'Doble clic sobre un objecte per canviar-ne el nom. L\'objecte de dalt de tot és el que queda al davant. Clic a la llista: selecciona un objecte dins d\'un grup.' })];
  },
  color() {
    const o = sel[0], k = o ? (o.type === 'line' ? 'stroke' : ctgt) : 'bg', [get, set] = o ? [k => o[k], setProp] : [pageGet, pageSet];
    const sw = (c, t) => h('button', { style: `background:${col(c)}`, text: t || '', title: t ? `Color ${t} de l'esquema` : c, onclick: () => set(k, c, true) });
    return [head(o ? 'Color de l\'objecte' : 'Color de fons de la pàgina'),
      o ? form([tg('', 'Farciment', 'shape', 'fill'), tg('', 'Línia', 'stroke', 'stroke'), tg('', 'Text', 'text', 'color')], () => ctgt, (x, v) => { ctgt = v; buildPanel(); }) : '',
      form([[k, 'Color', 'color', { none: k !== 'color' && k !== 'bg' }]], get, set),
      (p => p.length ? [h('h4', { class: 'mh', text: 'Colors recollits' }), h('div', { class: 'sw' }, p.map(c => sw(c)))] : [])(ls('picked') || []),
      form([bc('t:picker', 1)], () => 0, () => 0),
      h('div', { class: 'sw' }, [1, 2, 3, 4, 5].map(i => sw('$' + i, String(i))), PALETTE.slice(0, 5).map(c => sw(c))), h('div', { class: 'sw' }, PALETTE.slice(5).map(c => sw(c))),
      o && k === 'fill' ? form([['', 'Degradat', 'h'], ['grad', 'Tipus', 'sel', { list: [['none', 'Cap (sòlid)'], ['linear', 'Lineal'], ['radial', 'Radial']] }], ['fill2', 'Segon color', 'color'], ['gang', 'Angle (°)', 'range', { max: 360 }]], get, set) : '',
      o ? form([['', 'Transparència', 'h'], ['op', 'Opacitat', 'range', { min: 0, max: 1, step: .05 }]], get, set) : '',
      head('Esquemes de color'), h('div', { class: 'list' }, SCHEMES.map(([n, c], i) => h('div', { class: 'li scheme' + (doc.scheme === i ? ' on' : ''), onclick: () => { doc.scheme = i; commit(); } },
        h('span', { class: 'nm', text: n }), h('i', { html: c.map(x => `<b style="background:${x}"></b>`).join('') }))))];
  },
  line() {
    const o = sel[0]; if (!o) return [head('Línia'), h('p', { class: 'empty', text: 'Seleccioneu un objecte per canviar-ne la línia i la vora.' })];
    return [head('Línia i vora'), selForm([['stroke', 'Color', 'color', { none: o.type !== 'line' }], ['sw', 'Gruix (mm)', 'num', { min: 0, step: .1 }], ...F.dash,
      ...(o.type === 'line' ? [F.line[2]] : [['rad', 'Radi de les cantonades (mm)', 'num', { min: 0 }]])]),
      head('Ombra i resplendor'), selForm([...Object.entries(SHP).map(([n, p]) => bt(n, 'shadow', () => { sel.forEach(x => Object.assign(x, SHD, p)); commit(); }, 1)), ...F.shadow(o)]),
      h('p', { class: 'empty', text: 'Amb l\'eina d\'ombra (S) podeu arrossegar l\'ombra directament sobre la pàgina.' })];
  },
  xf() {
    const o = sel[0]; if (!o) return [head('Transforma'), h('p', { class: 'empty', text: 'Seleccioneu un objecte per veure\'n la posició i la mida.' })];
    const xyf = [['x', 'X', 'num'], ['y', 'Y', 'num'], ['w', 'Amplada', 'num', { min: 1 }], ['h', 'Alçada', 'num', { min: 1 }]];
    return [head(sel.length > 1 ? 'Posició i mida de la selecció (mm)' : 'Posició i mida (mm)'), sel.length > 1 ? form(xyf, k => bbox(sel)[k], boxSet) : selForm([...xyf, ['rot', 'Rotació (°)', 'num', { step: 1 }]]),
      head('Gira i inverteix'), selForm(['rotL', 'rotR', 'flipH', 'flipV'].map(n => bc(n))),
      head('Alinea', h('small', { class: 'empty', text: sel.length > 1 ? ' (selecció)' : ' (pàgina)' })), selForm([...F.align6, bc('distH'), bc('distV')]),
      sel.length === 1 ? [head('Retall (% de cada costat)'), selForm([['cpL', 'Esquerra', 'num', { min: 0, max: 95 }], ['cpR', 'Dreta', 'num', { min: 0, max: 95 }], ['cpT', 'Dalt', 'num', { min: 0, max: 95 }], ['cpB', 'Baix', 'num', { min: 0, max: 95 }], bc('t:crop', 1), bc('uncrop', 1)])] : '',
      head('Agrupa i ordena'), selForm(['group', 'ungroup', 'front', 'fwd', 'bwd', 'back', 'lock', 'hide'].map(n => bc(n)))];
  },
  text() {
    const o = sel[0], isT = o && ['art', 'frame', 'table', 'cal'].includes(o.type);
    const styleRow = ([n, s]) => h('div', { class: 'li styl' + (o?.style === n ? ' on' : ''), onclick: () => applyStyle(n) }, h('span', { class: 'nm', style: textCss({ ...TXT, ...s }) + `font-size:min(${s.size}pt,20px)`, text: n }));
    return [head('Estils de text', btn('plus', 'Nou estil a partir de la selecció', newStyle), btn('save', 'Actualitza l\'estil amb la selecció', updStyle), btn('trash', 'Elimina l\'estil', delStyle)),
      h('div', { class: 'list' }, Object.entries(doc.styles).map(styleRow)),
      isT ? [head('Caràcter'), selForm(F.text), head('Paràgraf'), selForm([...F.align, ...(o.type === 'frame' ? F.list : []), ...F.para])] : h('p', { class: 'empty', text: 'Seleccioneu un objecte de text per aplicar-hi un estil.' }),
      o?.type === 'frame' ? [head('Marc de text'), selForm([...F.frame, bc('fitText', 1), bc('textToTable', 1)])] : ''];
  },
  props() {
    const o = sel[0];
    if (!o) return [...bgPanel(), head('Configuració de la publicació'), form(pageFields(), pageGet, pageSet)];
    const P = {
      img: [['', 'Imatge', 'h'], bt('Substitueix…', 'image', () => pickImage(o), 1), ...F.img, ['px', 'Posició X (%)', 'range', { max: 100 }], ['py', 'Posició Y (%)', 'range', { max: 100 }], ['rad', 'Cantonades (mm)', 'num', { min: 0 }],
        ['', 'PhotoLab · ajustos', 'h'], ...Object.entries(PRESETS).map(([n, p]) => bt(n, 'image', () => { sel.forEach(x => Object.assign(x, FILT0, p)); commit(); }, 1)), ...F.filters],
      table: [['', 'Taula', 'h'], ...F.table, ['head', 'Fila de capçalera', 'chk'], ['zebra', 'Files alternes', 'chk'], ['stroke', 'Vores', 'color'], ['sw', 'Gruix vora (mm)', 'num', { min: 0, step: .1 }], ['fill', 'Fons', 'color', { none: 1 }],
        bt('Edita les cel·les', 'text', () => startEdit(o), 1), ...F.text],
      chart: [['', 'Gràfic', 'h'], ...F.chart, ['data', 'Dades (CSV: primera fila = sèries, primera columna = categories)', 'area', { rows: 8 }], ['', 'Text', 'h'], ...F.text.filter(f => !['und', 'italic'].includes(f[0])), ['fill', 'Fons', 'color', { none: 1 }]],
      cal: [['', 'Calendari', 'h'], ...F.cal, ['events', 'Esdeveniments (un per línia: «dia: text»)', 'area', { rows: 6 }], ['', 'Text', 'h'], ...F.text, ['stroke', 'Vores', 'color'], ['fill', 'Fons', 'color', { none: 1 }]],
      qr: [['', 'Codi QR', 'h'], F.qr[0], ['qtext', 'Contingut', 'area', { rows: 3 }], ['ec', 'Correcció d\'errors', 'sel', { list: [['L', 'Baixa (7%)'], ['M', 'Mitjana (15%)'], ['Q', 'Alta (25%)'], ['H', 'Màxima (30%)']] }], F.qr[2], ['fill', 'Fons', 'color', { none: 1 }]],
      shape: [['', 'Forma ràpida', 'h'], ...F.shape, ['n', 'Costats / puntes', 'num', { min: 3, max: 40, step: 1 }], ['rad', 'Radi cantonades (mm)', 'num', { min: 0 }], ...F.box, ...F.dash],
      line: [['', 'Línia', 'h'], ...F.line, ...F.dash],
      art: [['', 'Text artístic', 'h'], editBtn, bt('Trajectòria de text…', 'tpath', e => tpathPop(e.clientX, e.clientY + 20), 1), ...F.text, ...F.align, ...F.para, ['fill', 'Fons', 'color', { none: 1 }]],
      frame: [['', 'Marc de text', 'h'], editBtn, ...F.text, ...F.align, ...F.para, ...F.frame, ['fill', 'Fons', 'color', { none: 1 }], ['stroke', 'Vora', 'color', { none: 1 }]]
    };
    return [head(TYPES[o.type]), selForm([...P[o.type], ['', 'General', 'h'], ['name', 'Nom', 'txt']])];
  },
  assets() {
    const des = ls('designs') || [], drag = a => e => e.dataTransfer.setData('text/pp', JSON.stringify(a));
    const add = () => pickFile('image/*', f => readImg(f).then(im => { doc.assets.push({ t: 'img', ...im }); commit(); buildPanel(); }));
    return [head('Imatges', btn('plus', 'Afegeix imatges al cistell', add)),
      doc.assets.length ? h('div', { class: 'gallery' }, doc.assets.map((a, i) => h('button', { title: 'Clic: insereix · Maj+clic: posa-la de fons de pàgina · Doble clic: treu del cistell', draggable: true, ondragstart: drag(a), onclick: e => e.shiftKey ? setBg(null, a.src) : insertAsset(a), ondblclick: () => { doc.assets.splice(i, 1); commit(); buildPanel(); } }, h('img', { src: a.src }))))
        : h('p', { class: 'empty', text: 'Afegiu imatges al cistell per tenir-les a mà; es desen amb la publicació.' }),
      head('Formes'), h('div', { class: 'gallery' }, SHAPES.map(([k, n]) => h('button', { title: n, html: shapeSvg(k), draggable: true, ondragstart: drag({ t: 'shape', k }), onclick: () => insertAsset({ t: 'shape', k }) }))),
      head('Els meus dissenys', btn('save', 'Desa la selecció com a disseny', async () => {
        if (!sel.length) return toast('Seleccioneu els objectes que voleu desar'); const n = await ask('Nom del disseny', 'Disseny ' + (des.length + 1)); if (!n) return;
        const b = bbox(sel); des.push({ t: 'design', n, w: b.w, h: b.h, objs: sel.map(o => ({ ...clone(o), x: o.x - b.x, y: o.y - b.y })) });
        ls('designs', des) ? buildPanel() : toast('No hi ha prou espai al navegador');
      })),
      des.length ? h('div', { class: 'gallery' }, des.map((d, i) => h('button', { title: d.n + ' · Doble clic: elimina', draggable: true, ondragstart: drag(d), onclick: () => insertAsset(d), ondblclick: () => { des.splice(i, 1); ls('designs', des); buildPanel(); } },
        thumb({ ...doc, page: { ...doc.page, w: d.w, h: d.h, bg: 'transparent' }, pages: [] }, { objs: d.objs }, 56))))
        : h('p', { class: 'empty', text: 'Deseu grups d\'objectes per reutilitzar-los en qualsevol publicació.' })];
  }
};
// Posició i mida d'una selecció múltiple o d'un grup (caixa contenidora)
function boxSet(k, v, fin) {
  const b = bbox(sel), l = live();
  if (k === 'x' || k === 'y') move(l, k === 'x' ? v - b.x : 0, k === 'y' ? v - b.y : 0);
  else { const f = v / b[k], p = k === 'w' ? 'x' : 'y'; l.forEach(o => { o[p] = round(b[p] + (o[p] - b[p]) * f, 2); o[k] = round(o[k] * f, 2); }); }
  updObjs(sel); if (fin) commit();
}
/* ---------- Imatge de fons de la pàgina (o de la pàgina mestra) ---------- */
const BGFITS = [['cover', 'Omple (retalla)'], ['contain', 'Encaixa sencera'], ['fill', 'Estira'], ['tile', 'Mosaic']];
async function setBg(file, src) {
  if (file) src = (await readImg(file).catch(() => ({}))).src; if (!src) return toast('No s\'ha pogut llegir la imatge');
  pg().bgi = { fit: 'cover', op: 1, tw: 40, ...pg().bgi, src }; commit(); showTab('props');
}
function bgPanel() {
  const p = pg(), b = p.bgi, m = !cur.m && doc.masters.find(x => x.id === p.master);
  return [head(cur.m ? 'Fons de la pàgina mestra' : 'Fons de la pàgina'),
    b ? h('div', { class: 'bgprev', style: `background-image:url("${b.src}")` }) : h('p', { class: 'empty', text: m?.bgi ? 'Aquesta pàgina fa servir la imatge de fons de la seva pàgina mestra.' : 'Aquesta pàgina no té imatge de fons.' }),
    form([bt(b ? 'Substitueix…' : 'Afegeix una imatge…', 'image', () => run('bgImg'), 1), ...(b ? [bc('bgDel', 1), ['fit', 'Encaix', 'sel', { list: BGFITS }],
      ...(b.fit === 'tile' ? [['tw', 'Mosaic (mm)', 'num', { min: 5 }]] : []), ['op', 'Opacitat', 'range', { min: 0, max: 1, step: .05 }],
      ...(m ? [bt('Mou-la a la pàgina mestra (totes les pàgines)', 'master', () => { m.bgi = b; delete p.bgi; commit(); toast(`Ara totes les pàgines amb «${m.name}» tenen aquest fons`); }, 1)] : [])] : [])],
      k => b?.[k], (k, v, fin) => { b[k] = v; render(); if (fin) { commit(); k === 'fit' && buildPanel(); } })];
}
function insertAsset(a, at) {
  const c = at || { x: doc.page.w / 2, y: doc.page.h / 2 };
  if (a.t === 'design') { const n = reid(a.objs).map(o => ({ ...o, x: o.x + c.x - a.w / 2, y: o.y + c.y - a.h / 2 })); pg().objs.push(...n); sel = n; return commit(); }
  const o = a.t === 'img' ? mk('img', { src: a.src, nw: a.w, w: 70, h: 70 * a.h / a.w }) : mk('shape', { shape: a.k, w: 40, h: 40 });
  o.x = c.x - o.w / 2; o.y = c.y - o.h / 2; addObj(o);
}
function applyStyle(n) { stopEdit(); const s = sel.filter(o => ['art', 'frame', 'table', 'cal'].includes(o.type)); if (!s.length) return toast('Seleccioneu un objecte de text'); s.forEach(o => Object.assign(o, doc.styles[n], { style: n })); commit(); }
const pickT = o => Object.fromEntries(TEXT_KEYS.map(k => [k, o[k]]));
async function newStyle() { const o = sel[0]; if (!o?.font) return toast('Seleccioneu un objecte de text'); const n = await ask('Nom del nou estil', 'Estil ' + (Object.keys(doc.styles).length + 1)); if (n) { doc.styles[n] = pickT(o); o.style = n; commit(); } }
function updStyle() {
  const o = sel[0]; if (!o?.style || !doc.styles[o.style]) return toast('L\'objecte seleccionat no té cap estil aplicat');
  doc.styles[o.style] = pickT(o); [...doc.pages, ...doc.masters].forEach(p => p.objs.forEach(x => x.style === o.style && Object.assign(x, doc.styles[o.style]))); commit(); toast('Estil actualitzat a tota la publicació');
}
function delStyle() { const n = sel[0]?.style; if (!n || n === 'Normal') return toast('Seleccioneu un objecte amb l\'estil que voleu eliminar'); delete doc.styles[n]; commit(); }
function buildTabs() {
  $('#tabs').replaceChildren(...TABS.map(([id, n, ic]) => h('button', { html: icon(ic) + n, 'data-tab': id, onclick: () => showTab(id) })), btn('close', 'Tanca', () => document.body.classList.remove('sx'), 'ib tabclose'));
}
function buildPanel() { $$('#tabs [data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === tab)); $('#panel').replaceChildren(...PANELS[tab]().flat().filter(Boolean)); }
function showTab(t) { tab = t; ls('tab', t); document.body.classList.toggle('sx', innerWidth <= 1100); buildPanel(); }

/* ---------- Barra d'estat ---------- */
function buildStatus() {
  $('#status').append(btn('left', 'Pàgina anterior', () => run('prevPage')), h('span', { id: 'stPage' }), btn('right', 'Pàgina següent', () => run('nextPage')), btn('plus', 'Afegeix pàgina', () => run('addPage')),
    h('span', { class: 'sep' }), btn('zout', 'Allunya', () => run('zout')), h('input', { id: 'stZoom', onchange: e => setZoom(parseFloat(e.target.value) / 100 || 1) }), btn('zin', 'Apropa', () => run('zin')),
    btn('fit', 'Pàgina sencera', () => run('zfit'), 'ib hide-m'), h('span', { class: 'sep hide-m' }), h('span', { id: 'stXY', class: 'hide-m' }), h('span', { class: 'sep hide-m' }), h('span', { id: 'stInfo', class: 'grow' }));
}
function status(p) {
  if (!doc) return;
  $('#stPage').textContent = cur.m ? pg().name : `Pàgina ${cur.i + 1} de ${doc.pages.length}`;
  $('#stZoom').value = Math.round(zoom * 100) + '%';
  if (p?.x != null) $('#stXY').textContent = `X ${round(p.x)} · Y ${round(p.y)} mm`;
  const o = sel[0];
  $('#stInfo').textContent = hasPath(o) && sel.length === 1 && tool === 'pointer' ? `${TYPES[o.type]} en trajectòria · ${HINTS.path}` : o ? (isGroup(sel) ? `Grup · ${sel.length} objectes · ${round(bbox(sel).w)} × ${round(bbox(sel).h)} mm` : sel.length > 1 ? `${sel.length} objectes seleccionats` : `${TYPES[o.type]} · ${round(o.w)} × ${round(o.h)} mm${o.rot ? ` · ${o.rot}°` : ''}${o.locked ? ' · bloquejat' : ''}`) + (editing ? ' · Editant (Esc per acabar)' : '') : HINTS[tool];
}

/* ---------- Actualització general ---------- */
let savedS = '', tabs = [], act = 0;
const sessionData = () => ({ act, tabs: tabs.map((t, i) => i === act ? { doc, meta: t.meta, dirty: snapS !== savedS } : { doc: t.doc, meta: t.meta, dirty: t.snapS !== t.savedS }) });
const autosave = debounce(() => ls('session', sessionData()) || autosave.warned || (autosave.warned = 1, toast('La sessió és massa gran per desar-la automàticament: deseu les publicacions')), 800), thumbsLater = debounce(() => tab === 'pages' && buildPanel(), 300);
function refresh(soft) {
  if (!soft) render();
  updateUI(); autosave(); thumbsLater(); buildDocTabs();
  const t = doc.name + (snapS !== savedS ? ' •' : ''); $('#docname').textContent = t; document.title = t + ' — PagePlus Web';
}
function updateUI(why) { buildCtx(); if (tab !== 'pages' && !(why === 'sel' && tab === 'assets')) buildPanel(); status(); }
function setTheme(t) { document.documentElement.dataset.theme = t; ls('theme', t); drawRulers(); }

/* ---------- Emmagatzematge: servidor (si n'hi ha) o navegador ---------- */
// Camins de la biblioteca: «carpeta/subcarpeta/nom»
const enc = p => p.split('/').map(encodeURIComponent).join('/'), parentOf = p => p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '';
const baseOf = p => p.split('/').pop(), joinP = (d, n) => d ? d + '/' + n : n, byName = (a, b) => a.name.localeCompare(b.name, 'ca');
const clean = s => (s || '').replace(/[\\/:*?"<>|\x00-\x1f]/g, '').replace(/^\.+/, '').trim().slice(0, 120);
const req = async (u, o) => { const r = await fetch(u, o); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || r.statusText); return j; };
const J = (method, body) => ({ method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const store = {
  srv: false,
  async init() { try { const r = await fetch('api/docs', { cache: 'no-store' }); this.srv = r.ok && /json/.test(r.headers.get('content-type')); } catch { } },
  idx: () => ls('lib') || {}, dirs: () => ls('dirs') || [],
  async list(dir = '') {
    if (this.srv) return req('api/docs?dir=' + encodeURIComponent(dir));
    const pre = dir ? dir + '/' : '', f = new Set(this.dirs().filter(d => parentOf(d) === dir).map(baseOf)), docs = [];
    for (const [p, date] of Object.entries(this.idx())) if (p.startsWith(pre)) { const r = p.slice(pre.length); r.includes('/') ? f.add(r.split('/')[0]) : docs.push({ name: r, date }); }
    return { dir, folders: [...f].map(name => ({ name })), docs };
  },
  async load(p) { return this.srv ? req('api/docs/' + enc(p)) : ls('doc:' + p); },
  async save(p, d) { if (this.srv) return req('api/docs/' + enc(p), J('PUT', d)).then(() => true); const l = this.idx(); l[p] = Date.now(); return ls('doc:' + p, d) && ls('lib', l); },
  async del(p) { if (this.srv) return req('api/docs/' + enc(p), { method: 'DELETE' }); const l = this.idx(); delete l[p]; ls('lib', l); localStorage.removeItem('pp.doc:' + p); },
  async mkdir(p) { if (this.srv) return req('api/dirs/' + enc(p), { method: 'POST' }); ls('dirs', [...new Set([...this.dirs(), p])]); },
  async rmdir(p) {
    if (this.srv) return req('api/dirs/' + enc(p), { method: 'DELETE' });
    const r = await this.list(p); if (r.folders.length || r.docs.length) throw new Error('La carpeta no és buida'); ls('dirs', this.dirs().filter(d => d !== p));
  },
  async move(a, b, dir) {
    if (this.srv) return req('api/move', J('POST', { from: a, to: b, dir }));
    const l = this.idx(), sub = p => p === a || p.startsWith(a + '/'), mv = p => { const q = b + p.slice(a.length); if (!ls('doc:' + q, ls('doc:' + p))) throw new Error('No hi ha prou espai al navegador'); localStorage.removeItem('pp.doc:' + p); l[q] = l[p]; delete l[p]; };
    if (l[b] || this.dirs().includes(b)) throw new Error('Ja existeix un element amb aquest nom');
    if (dir && (b + '/').startsWith(a + '/')) throw new Error('No es pot moure una carpeta dins d\'ella mateixa');
    Object.keys(l).filter(p => dir ? p.startsWith(a + '/') : p === a).forEach(mv); ls('lib', l);
    if (dir) ls('dirs', [...this.dirs().map(d => sub(d) ? b + d.slice(a.length) : d), b]);
  }
};
// Actualitza recents i pestanyes quan es mou o es canvia el nom d'una publicació o carpeta
function repath(a, b) {
  const f = n => n === a ? b : n.startsWith(a + '/') ? b + n.slice(a.length) : n;
  ls('recent', (ls('recent') || []).map(x => x.src === 'lib' ? { ...x, name: f(x.name) } : x));
  tabs.forEach((t, i) => { if (t.meta?.src !== 'lib' || f(t.meta.name) === t.meta.name) return; t.meta.name = f(t.meta.name); (i === act ? doc : t.doc).name = baseOf(t.meta.name); }); buildDocTabs();
}
// Navegador de la biblioteca amb carpetes (obrir, desar com a, crear carpetes, canviar noms, moure arrossegant i eliminar)
function libBrowser(st, onDoc, pick) {
  const el = h('div', { class: 'lib' }), go = d => { st.dir = d; ls('libdir', d); draw(); };
  const act = async f => { try { await f(); } catch (e) { toast(e.message || 'No s\'ha pogut fer l\'operació'); } draw(); };
  const dest = v => { const s = v.trim().split('/').map(clean).filter(Boolean); return s.length ? (v.trim().startsWith('/') ? s.join('/') : joinP(st.dir, s.join('/'))) : null; };
  const move = (a, b, dir) => b && b !== a ? act(async () => { await store.move(a, b, dir); repath(a, b); }) : draw();
  const target = p => ({ ondragover: e => { e.preventDefault(); e.currentTarget.classList.add('dropon'); }, ondragleave: e => e.currentTarget.classList.remove('dropon'),
    ondrop: e => { e.preventDefault(); const [a, d] = JSON.parse(e.dataTransfer.getData('text/lib') || '[]'); a && move(a, joinP(p, baseOf(a)), d); } });
  const edit = (span, val, done) => { const i = h('input', { type: 'text', value: val, onclick: e => e.stopPropagation(), onblur: () => draw(),
    onkeydown: e => { e.stopPropagation(); if (e.key === 'Enter') { i.onblur = null; done(i.value); } else if (e.key === 'Escape') { e.preventDefault(); draw(); } } }); span.replaceWith(i); i.focus(); i.select(); };
  async function draw() {
    const r = await store.list(st.dir).catch(e => { if (st.dir) { st.dir = ''; return store.list(''); } toast(e.message); return { folders: [], docs: [] }; }), parts = st.dir ? st.dir.split('/') : [];
    const row = (x, dir) => {
      const p = joinP(st.dir, x.name), nm = h('span', { class: 'nm', text: x.name });
      return h('div', { class: 'li', draggable: true, ondragstart: e => e.dataTransfer.setData('text/lib', JSON.stringify([p, dir])), onclick: () => dir ? go(p) : pick ? pick(x.name) : onDoc(p), ...(dir ? target(p) : {}) },
        h('span', { html: icon(dir ? 'open' : 'page'), style: 'display:flex' }), nm, x.date ? h('small', { class: 'empty', text: new Date(x.date).toLocaleString('ca') }) : null,
        btn('edit', 'Canvia el nom o mou («carpeta/nom»; «/» per començar a l\'arrel)', e => { e.stopPropagation(); edit(nm, x.name, v => move(p, dest(v), dir)); }),
        btn('trash', dir ? 'Elimina la carpeta (ha de ser buida)' : 'Elimina', e => { e.stopPropagation(); const b = e.currentTarget;
          if (!b.classList.contains('warn')) { b.classList.add('warn'); b.title = 'Feu clic una altra vegada per confirmar'; return; } act(() => dir ? store.rmdir(p) : store.del(p)); }));
    };
    const nf = h('span');
    el.replaceChildren(h('div', { class: 'crumbs' }, h('button', { text: '⌂ Biblioteca', onclick: () => go(''), ...target('') }),
      parts.flatMap((s, i) => { const p = parts.slice(0, i + 1).join('/'); return [h('span', { class: 'empty', text: '›' }), h('button', { text: s, onclick: () => go(p), ...target(p) })]; }),
      h('span', { style: 'flex:1' }), nf, btn('plus', 'Nova carpeta', () => edit(nf, 'Carpeta nova', v => { const p = dest(v); p ? act(() => store.mkdir(p)) : draw(); }), 'tb', 'Nova carpeta')),
      h('div', { class: 'list' }, r.folders.sort(byName).map(x => row(x, true)), r.docs.sort(byName).map(x => row(x, false))),
      ...(r.folders.length || r.docs.length ? [] : [h('p', { class: 'empty', text: 'Aquesta carpeta és buida. Podeu arrossegar-hi publicacions o carpetes.' })]));
  }
  draw(); return el;
}
function saveAsDialog(cur) {
  return new Promise(res => {
    const st = { dir: cur ? parentOf(cur) : ls('libdir') || '' }, inp = h('input', { type: 'text', value: cur ? baseOf(cur) : clean(doc.name) });
    const ok = () => { const n = clean(inp.value); if (!n) { toast('Escriviu un nom per a la publicació'); return false; } res(joinP(st.dir, n)); };
    inp.onkeydown = e => { if (e.key === 'Enter' && ok() !== false) $('#dlg').close(); };
    dialog('Desa la publicació', h('div', {}, h('p', { class: 'empty', text: (store.srv ? 'Biblioteca del servidor' : 'Biblioteca d\'aquest navegador') + ': trieu la carpeta i el nom.' }),
      libBrowser(st, null, n => { inp.value = n; inp.focus(); }), h('label', { class: 'fld f-txt savename' }, h('span', { text: 'Nom' }), inp)), [['Cancel·la'], ['Desa', ok, 1]], true).onclose = () => res(null);
    inp.focus(); inp.select();
  });
}
async function save(as) {
  stopEdit(); const m = tabs[act].meta; let p = m?.src === 'lib' ? m.name : null;
  if (as || !p) {
    p = await saveAsDialog(p); if (!p) return false;
    const ex = p !== m?.name && (await store.list(parentOf(p)).catch(() => ({ docs: [] }))).docs.some(x => x.name === baseOf(p));
    if (ex && await choose('Desa la publicació', `Ja existeix «${p}». Voleu substituir-la?`, [['Cancel·la'], ['Substitueix', 1, 1]]) !== 1) return false;
  }
  doc.name = baseOf(p);
  if (await store.save(p, doc).catch(e => (toast(e.message), false))) {
    savedS = snapS = JSON.stringify(doc); tabs[act].meta = { src: 'lib', name: p }; addRecent(tabs[act].meta);
    toast(`S'ha desat «${p}» ${store.srv ? 'al servidor' : 'al navegador'}`); refresh(true);
  } else { toast('No s\'ha pogut desar a la biblioteca: es descarrega el fitxer'); run('download'); }
  return true;
}
function openFile(f) {
  f.text().then(t => { const d = JSON.parse(t); if (!d.pages) throw 0; const m = { src: 'file', name: f.name }; openDoc(d, m); addRecent(m, d); toast(`S'ha obert «${d.name}»`); }).catch(() => toast('El fitxer no és una publicació vàlida'));
}

/* ---------- Publicació: impressió/PDF, previsualització, HTML ---------- */
function fillPrint(scaled) {
  const pr = $('#print'), w = Math.min(innerWidth - 40, doc.page.w * MM);
  pr.replaceChildren(...doc.pages.map(p => scaled ? thumb(doc, p, w) : renderPage(doc, p)));
  if (scaled) pr.prepend(h('div', { class: 'pvbar' }, h('button', { text: '🖨 Imprimeix / PDF', onclick: () => printDoc() }), h('button', { text: '✕ Tanca (Esc)', onclick: () => preview() })));
  $('#pagesize').textContent = `@page{size:${doc.page.w}mm ${doc.page.h}mm;margin:0}`;
}
function printDoc() { stopEdit(); fillPrint(); setTimeout(() => { print(); document.body.classList.contains('preview') && fillPrint(true); }, 100); }
function preview() { stopEdit(); const on = document.body.classList.toggle('preview'); on ? fillPrint(true) : $('#print').replaceChildren(); }
function exportHtml() {
  stopEdit(); const name = doc.name.replace(/[\\/:*?"<>|]/g, '_');
  const css = `${BASE_CSS}\nbody{margin:0;background:#888;display:flex;flex-direction:column;align-items:center;gap:20px;padding:20px 0}.ppage{box-shadow:0 4px 18px #0006}.ph{display:none}
@page{size:${doc.page.w}mm ${doc.page.h}mm;margin:0}@media print{body{background:none;padding:0;gap:0}.ppage{box-shadow:none;break-after:page}}
@media (max-width:${Math.ceil(doc.page.w * MM + 40)}px){.ppage{zoom:calc((100vw - 20px) / ${doc.page.w * MM}px)}}`;
  download(name + '.html', `<!doctype html><html lang="ca"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(doc.name)}</title><style>${css}</style></head><body style="-webkit-print-color-adjust:exact;print-color-adjust:exact">\n${doc.pages.map(p => renderPage(doc, p).outerHTML).join('\n')}\n</body></html>`, 'text/html');
}

/* ---------- Pestanyes de publicacions i fitxers recents ---------- */
function mkTab(d, meta = {}, dirty) { d = { ...newDoc(), ...d }; const s = JSON.stringify(d); return { doc: d, cur: { m: false, i: 0 }, undoS: [], redoS: [], snapS: s, savedS: dirty ? '' : s, meta }; }
function stash() { const t = tabs[act]; if (!t) return; stopEdit(); const s = $('#scroll'); Object.assign(t, { doc, cur, undoS, redoS, snapS, savedS, zoom, sl: s.scrollLeft, st: s.scrollTop }); }
function activate() {
  const t = tabs[act]; ({ doc, cur, undoS, redoS, snapS, savedS } = t); sel = []; editing = null; hidePop(); refresh(); buildPanel();
  if (t.zoom) { zoom = t.zoom; sizeZoom(); Object.assign($('#scroll'), { scrollLeft: t.sl, scrollTop: t.st }); drawRulers(); status(); } else setTimeout(zoomFit);
}
const useTab = i => { if (i === act || !tabs[i]) return; stash(); act = i; activate(); };
// Obre en una pestanya nova (o reaprofita la pestanya actual si és una publicació en blanc sense tocar)
function openDoc(d, meta) {
  const i = tabs.findIndex((t, j) => meta && t.meta?.src === meta.src && t.meta?.name === meta.name); if (i >= 0) { useTab(i); return $('#dlg').close(); }
  const blank = !undoS.length && snapS === savedS && doc.name === 'Sense títol' && !doc.pages.some(p => p.objs.length);
  stash(); const t = mkTab(d, meta); blank ? tabs[act] = t : tabs.splice(++act, 0, t); activate(); $('#dlg').close();
}
async function closeTab(i = act) {
  useTab(i);
  if (snapS !== savedS) { const r = await choose('Tanca la publicació', `Voleu desar els canvis de «${doc.name}» abans de tancar-la?`, [['Cancel·la'], ['No desis', 'no'], ['Desa', 'yes', 1]]); if (!r || r === 'yes' && !await save()) return; }
  editing = null; tabs.splice(act, 1); if (!tabs.length) tabs.push(mkTab(newDoc())); act = Math.min(act, tabs.length - 1); activate();
}
function buildDocTabs() {
  $('#doctabs').replaceChildren(...tabs.map((t, i) => { const d = i === act ? doc : t.doc, dirty = i === act ? snapS !== savedS : t.snapS !== t.savedS;
    return h('div', { class: 'dt' + (i === act ? ' on' : ''), title: d.name, onclick: () => useTab(i), onauxclick: e => e.button === 1 && closeTab(i) },
      h('span', { text: d.name }), dirty ? h('b', { text: '•', title: 'Canvis sense desar' }) : null, btn('close', 'Tanca', e => { e.stopPropagation(); closeTab(i); }, 'ib x')); }),
    btn('plus', 'Nova publicació…', () => startup(), 'ib'));
}
function addRecent(m, d) {
  const r = (ls('recent') || []).filter(x => x.src !== m.src || x.name !== m.name);
  r.unshift({ ...m, date: Date.now(), snap: m.src === 'file' && !!ls('rec:' + m.name, d) });
  r.splice(10).forEach(x => x.snap && localStorage.removeItem('pp.rec:' + x.name)); ls('recent', r);
}
async function openRecent(x) {
  if (x.src === 'file') { const d = x.snap && ls('rec:' + x.name); if (d) return openDoc(d, { src: 'file', name: x.name }); toast(`Torneu a seleccionar el fitxer «${x.name}»`); return pickFile('.ppw,.json', openFile); }
  const d = await store.load(x.name).catch(() => null);
  if (!d?.pages) { ls('recent', (ls('recent') || []).filter(y => y.src !== x.src || y.name !== x.name)); return toast(`No s'ha trobat «${x.name}» a la biblioteca`); }
  d.name = baseOf(x.name); openDoc(d, { src: 'lib', name: x.name }); addRecent({ src: 'lib', name: x.name });
}
// Entrades dinàmiques dels menús
// Tria l'element que s'insereix en fer doble clic en un lloc buit (per defecte, text artístic)
function dblPop(x = innerWidth / 2 - 120, y = innerHeight / 3) {
  const [cur] = (ls('dblIns') || 'art').split(':'), set = v => { ls('dblIns', v); hidePop(); toast('Doble clic al buit: ' + (v === 'none' ? 'desactivat' : TOOLS.find(t => t && t[0] === v.split(':')[0])[1])); };
  setTimeout(() => showPop(h('div', {}, h('div', { class: 'mh', text: 'Doble clic al buit insereix' }), [...INS, 'none'].map(t => { const d = TOOLS.find(x => x && x[0] === t);
    return h('button', { class: 'mi', html: `<span class="ic">${t === cur ? icon('check') : ''}</span>${d ? esc(d[1]) : 'Res (desactivat)'}${t === 'shape' ? '<kbd>▸</kbd>' : ''}`,
      onclick: e => t === 'shape' ? shapePop(e.clientX, e.clientY, k => set('shape:' + k)) : set(t) }); })), x, y));
}
// Galeria de trajectòries de text predefinides (com el desplegable de PagePlus)
function tpathPop(x, y) {
  const cur = sel[0]?.tpath || 'none';
  setTimeout(() => showPop(h('div', {}, h('div', { class: 'mh', text: 'Trajectòria de text predefinida' }), TPATHS.map(([k, n]) => h('button', {
    class: 'mi' + (k === cur ? ' sel' : ''), onclick: () => { hidePop(); setPath(k); },
    html: `<span class="ic"><svg viewBox="0 0 24 24" class="i">${k === 'none' ? '<path d="M4 20L20 4M7 9l-3 3M17 15l3-3"/>' : `<path d="${tpathGeo(k, 24, 24, 3).join('')}"/>`}</svg></span>${esc(n)}`
  }))), x, y));
}
const INS = ['art', 'frame', 'img', 'shape', 'line', 'table', 'chart', 'cal', 'qr'];
const DYN = {
  ins: () => [h('div', { class: 'mh', text: 'Insereix aquí' }), ...TOOLS.filter(t => t && INS.includes(t[0])).map(t => h('button', {
    class: 'mi', html: `<span class="ic">${icon(t[2])}</span>${esc(t[1])}${t[0] === 'shape' ? '<kbd>▸</kbd>' : ''}`,
    onclick: e => { const p = ctxAt; if (t[0] === 'shape') return shapePop(e.clientX, e.clientY, k => insertAt('shape', p, { shape: k })); hidePop(); insertAt(t[0], p); }
  })), h('button', { class: 'mi', html: `<span class="ic">${icon('upload')}</span>Imatge des del disc…`, onclick: () => { const p = ctxAt; hidePop(); pickFile('image/*', f => imageInto(f, null, p)); } })],
  recent: () => { const r = ls('recent') || []; return [h('div', { class: 'mh', text: 'Fitxers recents' }), ...(r.length ? r.map((x, i) => h('button', { class: 'mi', title: new Date(x.date).toLocaleString('ca'), onclick: () => { closeMenus(); hidePop(); openRecent(x); },
      html: `<span class="ic">${i + 1}</span>${esc(x.name)}<kbd>${x.src === 'lib' ? 'biblioteca' : 'fitxer'}</kbd>` })).concat(h('button', { class: 'mi', html: '<span class="ic"></span>Buida la llista', onclick: () => { r.forEach(x => x.snap && localStorage.removeItem('pp.rec:' + x.name)); ls('recent', []); closeMenus(); } }))
      : [h('div', { class: 'mi off', text: '(cap)' })])]; },
  tabs: () => tabs.map((t, i) => h('button', { class: 'mi', onclick: () => { closeMenus(); useTab(i); }, html: `<span class="ic">${i === act ? icon('check') : ''}</span>${esc((i === act ? doc : t.doc).name)}` }))
};

/* ---------- Diàlegs ---------- */
function preflight() {
  stopEdit(); const out = [], P = doc.page, box = h('div', { style: 'position:absolute;left:-99999px;top:0' }); document.body.append(box);
  const add = (l, m, pi, o) => out.push({ l, m: `Pàg. ${pi + 1} · ${o ? label(o) + ': ' : ''}${m}`, pi, o });
  doc.pages.forEach((p, pi) => {
    const pe = renderPage(doc, p); box.replaceChildren(pe);
    if (!p.objs.length) add('info', 'pàgina sense objectes propis', pi);
    p.objs.forEach(o => {
      if (o.hidden) add('info', 'objecte amagat (no s\'imprimirà)', pi, o);
      if (o.x < -P.bleed || o.y < -P.bleed || o.x + o.w > P.w + P.bleed || o.y + o.h > P.h + P.bleed) add('warn', 'surt fora de la pàgina i del sagnat', pi, o);
      else if (o.x < P.ml || o.y < P.mt || o.x + o.w > P.w - P.mr || o.y + o.h > P.h - P.mb) o.w < P.w && o.h < P.h && add('info', 'fora dels marges', pi, o);
      if (o.type === 'img' && !o.src) add('err', 'marc d\'imatge buit', pi, o);
      if (o.type === 'img' && o.nw) { const dpi = Math.round(o.nw / (o.w / 25.4) / o.zm); if (dpi < 150) add('warn', `resolució baixa (${dpi} ppp; es recomanen 300)`, pi, o); }
      if (['art', 'frame'].includes(o.type) && !h('div', { html: o.html }).textContent.trim()) add('warn', 'text buit', pi, o);
      const e = $(`[data-id="${o.id}"]`, pe); if (o.type === 'frame' && e && isOver(o, e)) add('err', 'el text no cap al marc (desbordament)', pi, o);
    });
  });
  box.remove(); if (doc.board.length) out.push({ l: 'info', m: `Mesa de treball · ${doc.board.length} objectes fora de les pàgines (no s'imprimeixen)`, pi: cur.i });
  const C = { err: ['#e5383b', '!'], warn: ['#f59f00', '!'], info: ['#3b8cff', 'i'] };
  dialog(`Comprovació prèvia · ${out.length ? out.length + ' avisos' : 'tot correcte'}`, out.length ? h('div', {}, out.map(r => h('div', {
    class: 'issue', onclick: () => { $('#dlg').close(); goPage(r.pi, false); r.o && setSel([byId(r.o.id)]); }
  }, h('b', { style: `background:${C[r.l][0]}`, text: C[r.l][1] }), h('span', { text: r.m })))) : h('p', { text: 'No s\'han trobat problemes. La publicació està a punt per imprimir o publicar.' }));
}
function startup(sec = 'tpl') {
  const main = h('div'), nav = h('nav');
  const S = {
    tpl: ['Plantilles de disseny', () => h('div', { class: 'thumbs' }, TEMPLATES.map(([n, f]) => { const d = f(); return h('div', { class: 'th', onclick: () => openDoc(f()) }, thumb(d, d.pages[0], 120), h('span', { text: n })); }))],
    blank: ['Publicació en blanc', () => h('div', { class: 'thumbs' }, PAGES.flatMap(([n, w, hh]) => [[n, w, hh], ...(w !== hh ? [[n + ' apaïsat', hh, w]] : [])]).map(([n, w, hh]) => { const d = newDoc(w, hh); d.page.mt = d.page.mb = d.page.ml = d.page.mr = Math.min(15, Math.min(w, hh) * .08);
      return h('div', { class: 'th', onclick: () => openDoc(d) }, thumb(d, d.pages[0], w > hh ? 110 : 80), h('span', { text: `${n}\n${w}×${hh} mm` })); }))],
    recent: ['Obre una publicació', () => h('div', {}, h('div', { class: 'drop recents' }, DYN.recent()), h('p', { class: 'empty', text: store.srv ? 'Biblioteca del servidor:' : 'Biblioteca d\'aquest navegador:' }),
      libBrowser({ dir: ls('libdir') || '' }, p => openRecent({ src: 'lib', name: p })))]
  };
  const show = s => { nav.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.s === s)); main.replaceChildren(S[s][1]()); };
  nav.append(...Object.entries(S).map(([k, [n]]) => h('button', { text: n, 'data-s': k, onclick: () => show(k) })),
    h('label', { class: 'fld f-chk', style: 'margin-top:auto;padding:8px' }, h('input', { type: 'checkbox', checked: ls('startup') !== false, onchange: e => ls('startup', e.target.checked) }), h('span', { text: 'Mostra en iniciar' })));
  dialog('Assistent d\'inici', h('div', { class: 'split' }, nav, main), [['Obre un fitxer…', () => pickFile('.ppw,.json', openFile)], ['Continua amb la publicació actual', null, 1]], true);
  show(sec);
}
function picDialog() {
  if (!live().length) return toast('Seleccioneu els objectes que voleu convertir');
  const st = { dpi: toPicture.dpi || 300, keep: false };
  dialog('Converteix en imatge', h('div', {}, h('p', { class: 'empty', text: `Es crearà una imatge amb ${live().length > 1 ? `els ${live().length} objectes seleccionats` : 'l\'objecte seleccionat'} (amb les ombres i la transparència). La imatge ocupa el mateix lloc i es pot retocar amb PhotoLab.` }),
    form([['dpi', 'Resolució', 'sel', { list: [[96, '96 ppp (pantalla)'], [150, '150 ppp (esborrany)'], [200, '200 ppp'], [300, '300 ppp (impressió)'], [600, '600 ppp (alta qualitat)']], num: 1 }], ['keep', 'Conserva els objectes originals', 'chk']], k => st[k], (k, v) => st[k] = v)),
    [['Cancel·la'], ['Descarrega PNG', () => { live().length && rasterize(live(), st.dpi).then(r => { const a = h('a', { href: r.src, download: (sel[0].name || 'imatge') + (r.dpi ? '.png' : '.svg') }); a.click(); }); }],
     ['Converteix', () => { toPicture.dpi = st.dpi; toPicture(st.keep); }, 1]]);
}
function keysHelp() {
  const l = [...Object.values(CMD).filter(c => c[2]).map(c => [c[0], c[2]]), ['Mou 0,5 mm / 5 mm', 'Fletxes / Maj+Fletxes'], ['Selecció múltiple', 'Maj+clic'], ['Selecciona dins d\'un grup', 'Ctrl+clic'], ['Copia un objecte arrossegant-lo', 'Ctrl+arrossega'], ['Gir a passos de 15°', 'Maj+arrossegar'], ['Zoom', 'Ctrl+roda / pessic'], ['Acaba l\'edició', 'Esc']];
  dialog('Dreceres de teclat', h('div', { class: 'keys' }, l.map(([a, b]) => h('div', {}, h('span', { text: a }), h('kbd', { text: b })))));
}
function about() {
  dialog('Quant a PagePlus Web', h('div', { html: `<p><b>PagePlus Web</b> és una aplicació d'autoedició (DTP) per al navegador inspirada en <i>Serif PagePlus X9</i>: plantilles, pàgines mestres, marcs de text i text artístic, formes ràpides, imatges amb retoc PhotoLab, taules, gràfics, calendaris, codis QR, esquemes de color, comprovació prèvia i publicació a PDF o HTML.</p>
    <p>Funciona sense connexió i sense cap framework. Emmagatzematge actual: <b>${store.srv ? 'servidor' : 'navegador (localStorage)'}</b>.</p><p class="empty">Codis QR: biblioteca <i>qrcode-generator</i> de Kazuhiko Arase (llicència MIT).</p>` }));
}

/* ---------- Inici ---------- */
(async function init() {
  document.documentElement.dataset.theme = ls('theme') || 'dark';
  document.body.classList.toggle('nor', !view.rul);
  buildMenus(); buildBars(); buildStatus(); buildTabs(); initEditor(); setTool('pointer');
  const s = ls('session'), a = ls('auto'), l = s?.tabs?.length ? s.tabs : [{ doc: a?.pages ? a : newDoc(), dirty: !!a?.pages }];
  tabs = l.map(x => mkTab(x.doc, x.meta, x.dirty)); act = clamp(s?.act || 0, 0, tabs.length - 1); activate();
  await store.init();
  if (ls('startup') !== false) startup();
})();
