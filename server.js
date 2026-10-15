const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(__dirname, 'data');
const UPDATES_FILE = path.join(DATA_DIR, 'updates.json');
const SOURCES = [
  { name: 'Tamil Nadu Government', url: 'https://www.tn.gov.in/' },
  { name: 'Tamil Nadu e-Sevai', url: 'https://www.tnesevai.tn.gov.in/citizen/' },
  { name: 'Tamil Nadu Social Welfare and Women Empowerment', url: 'https://www.tnsocialwelfare.tn.gov.in/' },
  { name: 'Tamil Nadu Adi Dravidar and Tribal Welfare', url: 'https://www.tn.gov.in/department/15' }
];
const KEYWORDS = /scheme|welfare|scholarship|benefit|subsidy|pension|assistance|financial aid|நலத்திட்ட|உதவித்தொகை|உதவித் திட்டம்/i;
fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPDATES_FILE)) fs.writeFileSync(UPDATES_FILE, JSON.stringify({ lastChecked: null, items: [] }, null, 2));
function readUpdates() { try { return JSON.parse(fs.readFileSync(UPDATES_FILE, 'utf8')); } catch { return { lastChecked: null, items: [] }; } }
function send(res, status, data, type='application/json; charset=utf-8') { res.writeHead(status, { 'Content-Type': type, 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }); res.end(type.startsWith('application/json') ? JSON.stringify(data) : data); }
async function scanSources() {
  const db = readUpdates(); const known = new Set(db.items.map(x => x.url)); const found = [];
  for (const source of SOURCES) {
    try {
      const response = await fetch(source.url, { headers: { 'User-Agent': 'TNWelfareConnectSchemeMonitor/1.0 (public information checker)' }, signal: AbortSignal.timeout(12000) });
      if (!response.ok) continue;
      const html = await response.text();
      const regex = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi; let m;
      while ((m = regex.exec(html)) !== null) {
        const label = m[2].replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
        if (label.length < 8 || label.length > 180 || !KEYWORDS.test(label)) continue;
        let url; try { url = new URL(m[1], source.url).href; } catch { continue; }
        if (!url.startsWith('https://') || known.has(url) || found.some(x => x.url === url)) continue;
        found.push({ id: Buffer.from(url).toString('base64url').slice(0, 18), title: label, source: source.name, sourceUrl: source.url, url, detectedAt: new Date().toISOString(), status: 'needs_verification', note: 'Automatically detected from an official-source page. Verify eligibility, dates, and application details before relying on it.' });
      }
    } catch (e) { console.log(`Source check skipped: ${source.url} — ${e.message}`); }
  }
  db.items = [...found, ...db.items].slice(0, 250); db.lastChecked = new Date().toISOString();
  fs.writeFileSync(UPDATES_FILE, JSON.stringify(db, null, 2));
  console.log(`Scheduled scan complete: ${found.length} new link(s) detected at ${db.lastChecked}`);
}
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && u.pathname === '/api/updates') return send(res, 200, readUpdates());
  if (req.method === 'POST' && u.pathname === '/api/scan-now') { await scanSources(); return send(res, 200, readUpdates()); }
  if (req.method === 'GET' && u.pathname === '/api/health') return send(res, 200, { ok: true, lastChecked: readUpdates().lastChecked });
  if (req.method === 'GET' && (u.pathname === '/' || u.pathname === '/index.html')) { const f = fs.readFileSync(path.join(__dirname, 'index.html')); return send(res, 200, f.toString(), 'text/html; charset=utf-8'); }
  if (req.method === 'GET' && u.pathname.startsWith('/')) return send(res, 404, { error: 'Not found' });
  send(res, 405, { error: 'Method not allowed' });
});
server.listen(PORT, () => console.log(`TN Welfare Connect running at http://localhost:${PORT}`));
// Scan immediately, then every six hours. A hosted server must remain running for scheduled checks.
scanSources().catch(console.error);
setInterval(() => scanSources().catch(console.error), 6 * 60 * 60 * 1000);
