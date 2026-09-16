const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const dataFile = '/app/data/transactions.json';
const root = path.join(__dirname, 'public');
function readTransactions() { try { return JSON.parse(fs.readFileSync(dataFile, 'utf8')); } catch { return []; } }
function writeTransactions(rows) { fs.mkdirSync(path.dirname(dataFile), { recursive: true }); fs.writeFileSync(dataFile, JSON.stringify(rows, null, 2)); }
function send(res, code, body, type = 'application/json') { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(type === 'application/json' ? JSON.stringify(body) : body); }
function parseBody(req) { return new Promise((resolve, reject) => { let body = ''; req.on('data', c => { body += c; if (body.length > 5e6) reject(new Error('Payload too large')); }); req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch (e) { reject(e); } }); }); }
const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  if (parsed.pathname === '/api/health') return send(res, 200, { ok: true });
  if (parsed.pathname === '/api/transactions' && req.method === 'GET') return send(res, 200, readTransactions());
  if (parsed.pathname === '/api/transactions' && req.method === 'POST') {
    try { const incoming = await parseBody(req); const rows = Array.isArray(incoming.transactions) ? incoming.transactions : []; if (rows.length > 10000) return send(res, 400, { error: 'Too many rows' }); writeTransactions(rows); return send(res, 200, { count: rows.length }); } catch { return send(res, 400, { error: 'Invalid JSON' }); }
  }
  let file = parsed.pathname === '/' ? '/index.html' : parsed.pathname;
  file = path.normalize(file).replace(/^([.][.][/\\])+/, '');
  const target = path.join(root, file);
  if (!target.startsWith(root)) return send(res, 404, { error: 'Not found' });
  fs.readFile(target, (err, content) => err ? send(res, 404, 'Not found', 'text/plain') : send(res, 200, content, path.extname(target) === '.html' ? 'text/html' : 'text/css'));
});
server.listen(3000, '0.0.0.0');
