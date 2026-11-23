'use strict';
/* Model del document, estat de l'editor, historial i plantilles */
const SCHEMES = [
  ['Clàssic', ['#1f3a5f', '#2e86de', '#f5a623', '#e4572e', '#eef3f8']], ['Bosc', ['#2d4a32', '#5b8c51', '#e2b33c', '#a8553a', '#f2f0e6']],
  ['Mar', ['#0b3954', '#087e8b', '#ff5a5f', '#c81d25', '#e6f4f1']], ['Posta de sol', ['#3d1e3f', '#c33c54', '#f6ae2d', '#f26419', '#fbefe1']],
  ['Grafit', ['#222222', '#555555', '#d4a017', '#888888', '#f2f2f2']], ['Pastel', ['#5a4e7c', '#8fb8de', '#f4a7b9', '#a1d6b2', '#fbf7f0']],
  ['Neó', ['#14213d', '#7209b7', '#f72585', '#4cc9f0', '#f0f0ff']]];
const PALETTE = ['#000000', '#404040', '#7f7f7f', '#bfbfbf', '#ffffff', '#7f1d1d', '#dc2626', '#f97316', '#facc15', '#84cc16', '#16a34a', '#0d9488', '#06b6d4', '#2563eb', '#1e3a8a', '#7c3aed', '#c026d3', '#db2777', '#92400e', '#fde68a'];
const PAGES = [['A3', 297, 420], ['A4', 210, 297], ['A5', 148, 210], ['A6', 105, 148], ['Carta', 215.9, 279.4], ['Legal', 215.9, 355.6], ['DL', 99, 210], ['Targeta de visita', 85, 55], ['Quadrat', 210, 210]];
const FONTS = ['Arial', 'Helvetica', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Segoe UI', 'Georgia', 'Times New Roman', 'Palatino Linotype', 'Garamond', 'Courier New', 'Impact', 'system-ui', 'serif', 'sans-serif', 'monospace'];
const SHAPES = [['rect', 'Rectangle'], ['round', 'Rectangle arrodonit'], ['ellipse', 'El·lipse'], ['tri', 'Triangle'], ['rtri', 'Triangle rectangle'], ['diamond', 'Rombe'], ['poly', 'Polígon'], ['star', 'Estrella'], ['arrow', 'Fletxa'], ['heart', 'Cor'], ['speech', 'Bafarada'], ['cross', 'Creu']];
const TYPES = { art: 'Text artístic', frame: 'Marc de text', shape: 'Forma', line: 'Línia', img: 'Imatge', table: 'Taula', chart: 'Gràfic', cal: 'Calendari', qr: 'Codi QR' };
const TEXT_KEYS = ['font', 'size', 'color', 'bold', 'italic', 'und', 'lh', 'ls'];
const STYLE_KEYS = [...TEXT_KEYS, 'align', 'fill', 'fill2', 'grad', 'gang', 'stroke', 'sw', 'dash', 'rad', 'op', 'shT', 'shC', 'shO', 'shB', 'shX', 'shY'];
const STYLES = {
  'Normal': { font: 'Arial', size: 11, color: '#222222', bold: false, italic: false, lh: 1.35 },
  'Títol': { font: 'Georgia', size: 32, color: '$1', bold: true, italic: false, lh: 1.1 },
  'Subtítol': { font: 'Georgia', size: 18, color: '$2', bold: false, italic: true, lh: 1.2 },
  'Encapçalament': { font: 'Arial', size: 16, color: '$1', bold: true, italic: false, lh: 1.2 },
  'Cita': { font: 'Georgia', size: 13, color: '$2', bold: false, italic: true, lh: 1.4 },
  'Peu': { font: 'Arial', size: 8, color: '#666666', bold: false, italic: false, lh: 1.3 }
};

const BASE = { x: 20, y: 20, w: 60, h: 40, rot: 0, op: 1, fill: 'none', fill2: '#ffffff', grad: 'none', gang: 90, stroke: 'none', sw: .5, dash: 'solid', rad: 0, shT: 'none', shC: '#000000', shO: .4, shB: 1.5, shX: 1.2, shY: 1.2, cpT: 0, cpR: 0, cpB: 0, cpL: 0, fh: false, fv: false, name: '', hidden: false, locked: false };
const TXT = { font: 'Arial', size: 11, color: '#222222', bold: false, italic: false, und: false, align: 'left', lh: 1.35, ls: 0 };
const DEFS = {
  art: { ...TXT, tpath: 'none', html: 'Text artístic', font: 'Georgia', size: 36, color: '$1', lh: 1.1 },
  frame: { ...TXT, html: '<p>Feu doble clic per escriure el vostre text.</p>', cols: 1, gap: 5, pad: 2, va: 'flex-start', w: 80, h: 60 },
  shape: { shape: 'rect', n: 5, fill: '$2', stroke: '$1' },
  line: { stroke: '$1', sw: .8, arrow: 'none', h: 4 },
  img: { src: '', fit: 'cover', px: 50, py: 50, zm: 1, br: 100, ct: 100, sat: 100, hue: 0, gray: 0, sep: 0, blur: 0, inv: 0, w: 70, h: 50 },
  table: { ...TXT, size: 10, rows: 4, cols: 3, head: true, zebra: true, fill: '#ffffff', fill2: '$1', stroke: '#9aa0a6', sw: .3, w: 90, h: 36,
    cells: [['Article', 'Quantitat', 'Preu'], ['Llibreta', '2', '3,50 €'], ['Bolígraf', '5', '1,20 €'], ['Carpeta', '1', '4,90 €']] },
  chart: { ctype: 'bar', title: 'Vendes trimestrals', legend: true, data: 'Mes,2025,2026\nGen,12,15\nFeb,19,17\nMar,15,22\nAbr,22,26', font: 'Arial', size: 9, color: '#333333', fill: '#ffffff', w: 100, h: 70 },
  cal: { ...TXT, size: 10, year: new Date().getFullYear(), month: new Date().getMonth(), mon: true, events: '', fill: '#ffffff', fill2: '$1', stroke: '#c9cdd2', sw: .3, w: 120, h: 90 },
  qr: { qtype: 'url', qtext: 'https://www.example.com', ec: 'M', color: '#000000', fill: '#ffffff', w: 30, h: 30 }
};
const mk = (type, p = {}) => ({ ...clone(BASE), ...clone(DEFS[type]), id: uid(), type, ...p });
const newDoc = (w = 210, h = 297, name = 'Sense títol', scheme = 0) => ({
  v: 1, name, scheme, page: { w, h, mt: 15, mr: 15, mb: 15, ml: 15, cols: 1, rows: 1, gut: 5, bleed: 3, bg: '#ffffff' },
  styles: clone(STYLES), guides: { v: [], h: [] }, assets: [], board: [], masters: [{ id: 'A', name: 'Mestra A', objs: [] }], pages: [{ id: uid(), master: 'A', objs: [] }]
});

/* ---------- Estat de l'editor ---------- */
let doc, cur = { m: false, i: 0 }, sel = [], snapS = '', undoS = [], redoS = [];
const pg = (d = doc, c = cur) => c.m ? d.masters[c.i] : d.pages[c.i];
// Objectes visibles a l'editor: els de la pàgina i els de la mesa de treball (comuna a totes les pàgines)
const objs = () => [...pg().objs, ...doc.board];
const listOf = o => doc.board.includes(o) ? doc.board : pg().objs;
const byId = id => objs().find(o => o.id === id);
function commit(soft) {
  settle(); const s = JSON.stringify(doc);
  if (s !== snapS) { undoS.push(snapS); if (undoS.length > 100) undoS.shift(); redoS = []; snapS = s; }
  refresh(soft);
}
function restore(s) {
  const ids = sel.map(o => o.id); doc = JSON.parse(s); snapS = s;
  cur.i = Math.min(cur.i, (cur.m ? doc.masters : doc.pages).length - 1);
  sel = objs().filter(o => ids.includes(o.id)); refresh();
}
const undo = () => { stopEdit(); undoS.length && (redoS.push(snapS), restore(undoS.pop())); };
const redo = () => { stopEdit(); redoS.length && (undoS.push(snapS), restore(redoS.pop())); };

/* ---------- Plantilles de disseny ---------- */
const T = (type, x, y, w, h, p = {}) => mk(type, { x, y, w, h, ...p });
const W = { color: '#ffffff' }, NS = { stroke: 'none' };
function tpl(w, h, name, scheme, pages, master = [], margin = 15) {
  const d = newDoc(w, h, name, scheme);
  Object.assign(d.page, { mt: margin, mr: margin, mb: margin, ml: margin });
  d.masters[0].objs = master; d.pages = pages.map(objs => ({ id: uid(), master: 'A', objs })); return d;
}
const P = (...a) => a.map(t => `<p>${t}</p>`).join('');
const TEMPLATES = [
  ['En blanc A4', () => newDoc()],
  ['En blanc A4 apaïsat', () => newDoc(297, 210)],
  ['Fulletó', () => tpl(210, 297, 'Fulletó', 2, [[
    T('shape', 0, 0, 210, 120, { fill: '$1', fill2: '$2', grad: 'linear', gang: 135, ...NS, name: 'Banda superior' }),
    T('shape', 148, 18, 48, 48, { shape: 'star', n: 12, fill: '$3', ...NS, rot: 12 }),
    T('art', 158, 34, 30, 14, { html: '-30%', font: 'Impact', size: 30, ...W }),
    T('art', 15, 22, 150, 60, { html: 'GRAN<br>INAUGURACIÓ', font: 'Impact', size: 50, ...W, lh: 1 }),
    T('art', 15, 92, 150, 10, { html: 'Dissabte 14 de març · 10 h', font: 'Arial', size: 18, color: '$5' }),
    T('frame', 15, 132, 180, 82, { cols: 2, size: 12, html: P('<b>Us hi esperem!</b> Obrim les portes de la nova botiga del barri amb ofertes especials durant tot el cap de setmana.', 'Hi haurà tast de productes locals, activitats per a la mainada i música en directe a la plaça.', 'Porteu aquest fulletó i obtindreu un 30% de descompte en la primera compra.') }),
    T('img', 15, 220, 120, 56),
    T('qr', 163, 228, 32, 32, { qtext: 'https://www.example.com/inauguracio' }),
    T('art', 166, 262, 30, 6, { html: 'Escaneja’m', font: 'Arial', size: 10, color: '$1' }),
    T('shape', 0, 283, 210, 14, { fill: '$1', ...NS }),
    T('art', 15, 286, 150, 6, { html: 'Carrer Major, 12 · Girona · 972 000 000', font: 'Arial', size: 10, ...W })]])],
  ['Targeta de visita', () => tpl(85, 55, 'Targeta de visita', 0, [[
    T('shape', 0, 0, 28, 55, { fill: '$1', fill2: '$2', grad: 'linear', gang: 180, ...NS }),
    T('qr', 6, 31, 16, 16, { color: '$1' }),
    T('shape', 8, 9, 12, 12, { shape: 'ellipse', fill: '$3', ...NS }),
    T('art', 33, 8, 45, 8, { html: 'Anna Martí', font: 'Georgia', size: 16, bold: true }),
    T('art', 33, 16, 45, 5, { html: 'Dissenyadora gràfica', font: 'Arial', size: 8, color: '$2', italic: true }),
    T('line', 33, 22, 46, 2, { stroke: '$3', sw: .4 }),
    T('frame', 33, 27, 48, 22, { size: 7, lh: 1.6, pad: 0, html: 'anna@example.com<br>+34 600 000 000<br>www.example.com' })]], [], 4)],
  ['Butlletí (2 pàgines)', () => tpl(210, 297, 'Butlletí', 1, [[
    T('shape', 15, 28, 180, 32, { fill: '$1', fill2: '$2', grad: 'linear', ...NS, rad: 3 }),
    T('art', 22, 31, 120, 16, { html: 'El Butlletí', font: 'Georgia', size: 40, bold: true, ...W }),
    T('art', 22, 50, 80, 6, { html: 'Número 27 · Tardor 2026', font: 'Arial', size: 11, color: '$5' }),
    T('art', 15, 66, 100, 8, { html: 'Notícies del barri', font: 'Arial', size: 18, bold: true, style: 'Encapçalament' }),
    T('frame', 15, 76, 115, 110, { cols: 2, size: 10, align: 'justify', html: P('<b>La plaça es renova.</b> Després de mesos de treball conjunt amb el veïnat, el projecte de renovació de la plaça comença aquesta tardor. Es plantaran vint arbres nous i s’hi instal·laran bancs i una font.', 'Les obres duraran unes deu setmanes i es faran per fases perquè el mercat setmanal pugui continuar funcionant amb normalitat.', '<b>Biblioteca oberta.</b> A partir del mes que ve la biblioteca amplia l’horari els dissabtes a la tarda i estrena un racó de lectura per a infants.', 'També s’organitzaran clubs de lectura mensuals oberts a tothom. La inscripció és gratuïta.') }),
    T('img', 135, 76, 60, 60),
    T('frame', 135, 140, 60, 46, { fill: '$5', pad: 4, size: 10, italic: true, font: 'Georgia', color: '$1', va: 'center', html: P('«Un barri viu és un barri on la gent es coneix i es cuida.»') }),
    T('chart', 15, 192, 180, 80, { title: 'Participació a les activitats', data: 'Activitat,2025,2026\nTallers,34,48\nConcerts,120,150\nMercat,210,260\nEsport,80,95' })], [
    T('art', 15, 28, 60, 10, { html: 'Agenda', font: 'Arial', size: 24, bold: true }),
    T('cal', 15, 42, 110, 85, { year: 2026, month: 10, events: '6: Mercat\n14: Concert\n21: Taller\n28: Assemblea' }),
    T('frame', 130, 42, 65, 85, { fill: '$5', pad: 4, size: 10, html: '<p><b>Activitats destacades</b></p><ul><li>Taller de reparació de bicicletes</li><li>Concert de la coral</li><li>Sortida al bosc</li><li>Assemblea de veïns</li></ul>' }),
    T('art', 15, 135, 100, 8, { html: 'Pressupost participatiu', font: 'Arial', size: 16, bold: true }),
    T('table', 15, 146, 180, 42, { rows: 5, cells: [['Proposta', 'Vots', 'Cost'], ['Horts urbans', '312', '18.000 €'], ['Parc infantil', '287', '45.000 €'], ['Carril bici', '254', '60.000 €'], ['Wifi a la plaça', '98', '6.000 €']] }),
    T('chart', 15, 195, 85, 78, { ctype: 'pie', title: 'Vots per proposta', data: 'Proposta,Vots\nHorts,312\nParc,287\nCarril,254\nWifi,98' }),
    T('frame', 105, 195, 90, 78, { size: 10, html: P('<b>Com participar?</b>', 'Podeu votar les propostes al centre cívic o a la web del barri fins al dia 30. Cada persona empadronada pot votar fins a tres propostes.', 'Els resultats es presentaran a l’assemblea de veïns.') })]],
    [T('line', 15, 18, 180, 2, { stroke: '$2', sw: .5 }), T('art', 15, 12, 80, 5, { html: 'El Butlletí del Barri', font: 'Arial', size: 8, color: '#666666' }),
      T('line', 15, 278, 180, 2, { stroke: '$2', sw: .5 }), T('art', 15, 282, 40, 5, { html: 'Pàgina {N} de {T}', font: 'Arial', size: 8, color: '#666666' })])],
  ['Pòster A3', () => tpl(297, 420, 'Pòster', 6, [[
    T('shape', 0, 0, 297, 420, { fill: '$2', fill2: '$1', grad: 'radial', ...NS, locked: true, name: 'Fons' }),
    T('shape', 170, 30, 170, 170, { shape: 'ellipse', fill: '$3', op: .55, ...NS }),
    T('shape', -50, 240, 190, 190, { shape: 'ellipse', fill: '$4', op: .45, ...NS }),
    T('art', 25, 110, 250, 40, { html: 'FESTIVAL', font: 'Impact', size: 110, ...W }),
    T('art', 25, 158, 200, 25, { html: 'DE MÚSICA', font: 'Impact', size: 64, color: '$4' }),
    T('art', 25, 205, 200, 12, { html: '12 · 13 · 14 JULIOL', font: 'Arial', size: 30, bold: true, ls: 2, ...W }),
    T('frame', 25, 240, 170, 50, { size: 18, ...W, html: P('Tres dies de concerts a l’aire lliure, tallers i gastronomia local.') }),
    T('line', 25, 330, 247, 3, { stroke: '#ffffff', sw: .6 }),
    T('art', 25, 345, 180, 8, { html: 'Entrades a la venda · www.example.com', font: 'Arial', size: 18, ...W }),
    T('qr', 232, 350, 40, 40, { qtext: 'https://www.example.com/festival', color: '$1' })]], [], 20)],
  ['Invitació A5', () => tpl(210, 148, 'Invitació', 3, [[
    T('shape', 6, 6, 198, 136, { fill: 'none', stroke: '$2', sw: .8, rad: 4 }),
    T('shape', 9, 9, 192, 130, { fill: 'none', stroke: '$3', sw: .3, rad: 3, dash: 'dash' }),
    T('shape', 95, 16, 20, 18, { shape: 'heart', fill: '$2', ...NS }),
    T('frame', 20, 38, 170, 18, { align: 'center', size: 30, font: 'Georgia', italic: true, color: '$1', html: 'Esteu convidats' }),
    T('frame', 20, 58, 170, 10, { align: 'center', size: 12, color: '#555555', html: 'al casament de' }),
    T('frame', 20, 70, 170, 18, { align: 'center', size: 30, font: 'Georgia', color: '$2', html: 'Laia &amp; Marc' }),
    T('frame', 20, 98, 170, 30, { align: 'center', size: 11, html: P('Dissabte, 19 de setembre de 2026 a les 17 h', 'Masia Can Prat · Sant Cugat del Vallès') })]], [], 12)],
  ['Calendari de paret', () => tpl(297, 210, 'Calendari', 0, [[
    T('shape', 0, 0, 297, 38, { fill: '$1', fill2: '$2', grad: 'linear', ...NS }),
    T('art', 15, 10, 200, 16, { html: 'Calendari 2027', font: 'Georgia', size: 36, bold: true, ...W }),
    T('cal', 15, 48, 267, 148, { size: 13, year: 2027, month: 0 })]])]
];
