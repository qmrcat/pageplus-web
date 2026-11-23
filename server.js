#!/usr/bin/env node
'use strict';
/* Servidor web autònom per a PagePlus Web: només fa servir mòduls integrats de Node.js (sense dependències).
   Configuració: fitxer .env (o variables d'entorn, que tenen prioritat).
   - Serveix els fitxers estàtics de l'aplicació.
   - Biblioteca de publicacions amb carpetes:
       GET    /api/docs?dir=<carpeta>      llista carpetes i publicacions
       GET|PUT|DELETE /api/docs/<camí>     llegeix, desa o elimina una publicació (<camí> = carpeta/subcarpeta/nom)
       POST|DELETE    /api/dirs/<camí>     crea o elimina (si és buida) una carpeta
       POST   /api/move  {from, to, dir}   mou o canvia el nom d'una publicació o carpeta                        */
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const ROOT = __dirname, EXT = '.ppw';

// Llegeix el fitxer .env (CLAU=valor, comentaris amb #, valors entre cometes opcionals)
(function loadEnv(f) {
  try {
    for (const l of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
      const m = l.match(/^\s*([A-Za-z_]\w*)\s*=\s*(.*?)\s*$/); if (!m) continue;
      const v = /^(["']).*\1$/.test(m[2]) ? m[2].slice(1, -1) : m[2].replace(/\s+#.*$/, '');
      if (process.env[m[1]] === undefined) process.env[m[1]] = v;
    }
  } catch { }
})(process.env.ENV_FILE || path.join(ROOT, '.env'));
const E = process.env, PORT = +E.PORT || 8080, HOST = E.HOST || '127.0.0.1', LIMIT = (+E.MAX_UPLOAD_MB || 50) * 1048576;
const DATA = path.resolve(ROOT, (E.DATA_DIR || 'data').replace(/^~(?=$|[\\/])/, os.homedir()));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.md': 'text/markdown', '.txt': 'text/plain', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon' };
const fail = (code, msg) => Object.assign(new Error(msg), { code });
const BAD = /[\\/:*?"<>|\x00-\x1f]/;

fs.mkdirSync(DATA, { recursive: true });
// Converteix els fitxers de versions anteriors (nom codificat en base64) a noms llegibles
for (const f of fs.readdirSync(DATA)) {
  const m = f.match(/^([\w-]+)\.json$/), n = m && Buffer.from(m[1], 'base64url').toString();
  if (n && Buffer.from(n).toString('base64url') === m[1] && n.trim() && !BAD.test(n) && !n.includes('�') && !fs.existsSync(path.join(DATA, n + EXT))) fs.renameSync(path.join(DATA, f), path.join(DATA, n + EXT));
}

const send = (res, code, body, type = '.json') => {
  if (res.headersSent) return;
  res.writeHead(code, { 'content-type': (MIME[type] || 'application/octet-stream') + (/text|json/.test(MIME[type]) ? '; charset=utf-8' : ''), 'cache-control': 'no-cache', 'x-content-type-options': 'nosniff' });
  res.end(Buffer.isBuffer(body) || typeof body === 'string' ? body : JSON.stringify(body));
};
// Camí segur dins de la carpeta de dades (segments sense «..», ocults ni caràcters prohibits)
function safe(p = '', file) {
  const s = p.split('/').filter(Boolean);
  if (s.some(x => x.startsWith('.') || BAD.test(x) || x.length > 120) || (file && !s.length)) throw fail(400, 'Nom o camí no vàlid');
  const f = path.join(DATA, ...s) + (file ? EXT : '');
  if (f !== DATA && !f.startsWith(DATA + path.sep)) throw fail(400, 'Camí no vàlid');
  return f;
}
const body = req => new Promise((ok, ko) => {
  const c = []; let n = 0;
  req.on('data', d => { n += d.length; if (n > LIMIT) { ko(fail(413, 'Publicació massa gran')); req.destroy(); } else c.push(d); });
  req.on('end', () => ok(Buffer.concat(c))); req.on('error', ko);
});
function list(dir) {
  const d = safe(dir), st = f => fs.statSync(path.join(d, f.name));
  const e = fs.readdirSync(d, { withFileTypes: true }).filter(x => !x.name.startsWith('.'));
  return { dir, folders: e.filter(x => x.isDirectory()).map(x => ({ name: x.name, date: st(x).mtimeMs })),
    docs: e.filter(x => x.isFile() && x.name.endsWith(EXT)).map(x => ({ name: x.name.slice(0, -EXT.length), date: st(x).mtimeMs, size: st(x).size })) };
}
async function api(req, res, route, p, q) {
  const M = req.method;
  if (route === 'docs' && !p) { if (M !== 'GET') throw fail(405, 'Mètode no permès'); return send(res, 200, list(q.get('dir') || '')); }
  if (route === 'docs') {
    const f = safe(p, true);
    if (M === 'GET') return send(res, 200, fs.readFileSync(f));
    if (M === 'DELETE') { fs.rmSync(f, { force: true }); return send(res, 200, { ok: true }); }
    if (M !== 'PUT') throw fail(405, 'Mètode no permès');
    const b = await body(req); try { JSON.parse(b); } catch { throw fail(400, 'JSON no vàlid'); }
    fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, b); return send(res, 200, { ok: true });
  }
  if (route === 'dirs') {
    if (!p) throw fail(400, 'Cal indicar la carpeta'); const d = safe(p);
    if (M === 'POST') { fs.mkdirSync(d, { recursive: true }); return send(res, 200, { ok: true }); }
    if (M !== 'DELETE') throw fail(405, 'Mètode no permès');
    if (fs.readdirSync(d).length) throw fail(409, 'La carpeta no és buida'); fs.rmdirSync(d); return send(res, 200, { ok: true });
  }
  if (route === 'move' && M === 'POST') {
    const { from, to, dir } = JSON.parse(await body(req)), a = safe(from, !dir), b = safe(to, !dir);
    if (fs.existsSync(b)) throw fail(409, 'Ja existeix un element amb aquest nom');
    if (dir && (b + path.sep).startsWith(a + path.sep)) throw fail(400, 'No es pot moure una carpeta dins d\'ella mateixa');
    fs.mkdirSync(path.dirname(b), { recursive: true }); fs.renameSync(a, b); return send(res, 200, { ok: true });
  }
  throw fail(404, 'No trobat');
}

http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://local'), p = decodeURIComponent(u.pathname), m = p.match(/^\/api\/(docs|dirs|move)(?:\/(.+))?$/);
    if (m) return await api(req, res, m[1], m[2], u.searchParams);
    if (!['GET', 'HEAD'].includes(req.method)) return send(res, 405, { error: 'Mètode no permès' });
    const f = path.normalize(path.join(ROOT, p === '/' ? 'index.html' : p));
    if (!f.startsWith(ROOT + path.sep) || f.startsWith(DATA + path.sep) || /[\\/]\./.test(f.slice(ROOT.length)) || f === __filename) return send(res, 403, 'Accés denegat', '.txt');
    fs.readFile(f, (e, b) => e ? send(res, 404, 'No trobat', '.txt') : send(res, 200, b, path.extname(f)));
  } catch (e) { send(res, e.code === 'ENOENT' ? 404 : typeof e.code === 'number' ? e.code : 500, { error: e.code === 'ENOENT' ? 'No trobat' : e.message }); }
}).listen(PORT, HOST, () => console.log(`PagePlus Web funcionant a http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}\nPublicacions a: ${DATA}`));
