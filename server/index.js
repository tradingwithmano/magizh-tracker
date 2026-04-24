const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');
const initSqlJs = require('sql.js');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── DATABASE SETUP (sql.js — pure JS, no native build) ────────────────
const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH  = path.join(DATA_DIR, 'tracker.db');
fs.mkdirSync(DATA_DIR, { recursive: true });

let db;

async function initDb() {
  const SQL = await initSqlJs();
  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }
  db.run(`
    CREATE TABLE IF NOT EXISTS tracker_data (
      id      INTEGER PRIMARY KEY,
      payload TEXT NOT NULL,
      updated TEXT NOT NULL
    );
  `);
  saveDb();
}

function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function dbGet() {
  const res = db.exec('SELECT payload, updated FROM tracker_data WHERE id = 1');
  if (!res.length || !res[0].values.length) return null;
  const [payload, updated] = res[0].values[0];
  return { payload, updated };
}

function dbSet(payload, updated) {
  const exists = dbGet();
  if (exists) {
    db.run('UPDATE tracker_data SET payload=?, updated=? WHERE id=1', [payload, updated]);
  } else {
    db.run('INSERT INTO tracker_data (id, payload, updated) VALUES (1,?,?)', [payload, updated]);
  }
  saveDb();
}

// ── MIDDLEWARE ────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── API ROUTES ────────────────────────────────────────────────────────

app.get('/api/data', (req, res) => {
  try {
    const row = dbGet();
    if (row) {
      res.json({ ok: true, data: JSON.parse(row.payload), updated: row.updated });
    } else {
      res.json({ ok: true, data: null, updated: null });
    }
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/data', (req, res) => {
  try {
    const payload = JSON.stringify(req.body);
    const updated = new Date().toISOString();
    dbSet(payload, updated);
    res.json({ ok: true, updated });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// GET  /api/health — uptime check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// ── SERVE FRONTEND ────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ── START ─────────────────────────────────────────────────────────────
initDb().then(() => {
  app.listen(PORT, () => {
    console.log('\n  ╔══════════════════════════════════════╗');
    console.log('  ║   MAGIZH TRADER — Profit Tracker     ║');
    console.log('  ╚══════════════════════════════════════╝');
    console.log('\n  App:      http://localhost:' + PORT);
    console.log('  Network:  http://<your-ip>:' + PORT + '  (for mobile access)');
    console.log('  Database: ' + DB_PATH + '\n');
  });
}).catch(e => {
  console.error('Failed to start:', e);
  process.exit(1);
});
