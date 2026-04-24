/**
 * scripts/run.js
 * Cross-platform build/utility helper for Magizh Trader.
 * Works on Windows, Mac and Linux — no shell commands used.
 *
 * Usage:  node scripts/run.js <command>
 * Commands are also wired into package.json npm scripts.
 */

const fs   = require('fs');
const path = require('path');

const ROOT    = path.join(__dirname, '..');
const DATA    = path.join(ROOT, 'data');
const BACKUPS = path.join(ROOT, 'backups');
const DB      = path.join(DATA, 'tracker.db');

function ok(msg)   { console.log('\x1b[32m✔\x1b[0m', msg); }
function info(msg) { console.log('\x1b[36mℹ\x1b[0m', msg); }
function warn(msg) { console.log('\x1b[33m⚠\x1b[0m', msg); }
function err(msg)  { console.error('\x1b[31m✖\x1b[0m', msg); }

const commands = {

  // ── BUILD ──────────────────────────────────────────────────────────
  build() {
    info('Running build...');
    fs.mkdirSync(DATA,    { recursive: true }); ok('data/     folder ready');
    fs.mkdirSync(BACKUPS, { recursive: true }); ok('backups/  folder ready');
    ok('Build complete. Run: npm start');
  },

  // ── CLEAN ──────────────────────────────────────────────────────────
  clean() {
    ['dist'].forEach(dir => {
      const p = path.join(ROOT, dir);
      if (fs.existsSync(p)) { fs.rmSync(p, { recursive: true, force: true }); ok('Removed ' + dir + '/'); }
      else { info(dir + '/ does not exist, skipping'); }
    });
    ok('Clean done');
  },

  'clean:db'() {
    if (fs.existsSync(DB)) {
      fs.unlinkSync(DB);
      ok('Database file deleted: ' + path.relative(ROOT, DB));
    } else {
      warn('No database file found at ' + path.relative(ROOT, DB));
    }
  },

  // ── LINT ───────────────────────────────────────────────────────────
  lint() {
    const { execSync } = require('child_process');
    const files = [
      path.join(ROOT, 'server', 'index.js'),
      path.join(ROOT, 'public', 'js', 'app.js'),
    ];
    let allOk = true;
    files.forEach(f => {
      try {
        execSync(process.execPath + ' --check "' + f + '"', { stdio: 'pipe' });
        ok('Syntax OK: ' + path.relative(ROOT, f));
      } catch (e) {
        err('Syntax error in: ' + path.relative(ROOT, f));
        err(e.stderr ? e.stderr.toString() : e.message);
        allOk = false;
      }
    });
    if (!allOk) process.exit(1);
  },

  // ── BACKUP ─────────────────────────────────────────────────────────
  backup() {
    if (!fs.existsSync(DB)) {
      warn('No database found at ' + path.relative(ROOT, DB) + ' — start the app first to create it.');
      return;
    }
    fs.mkdirSync(BACKUPS, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dest  = path.join(BACKUPS, 'tracker_' + stamp + '.db');
    fs.copyFileSync(DB, dest);
    const size = fs.statSync(dest).size;
    ok('Backup saved: backups/' + path.basename(dest) + '  (' + size + ' bytes)');
  },

  // ── RESTORE ────────────────────────────────────────────────────────
  restore() {
    if (!fs.existsSync(BACKUPS)) {
      warn('No backups/ folder found. Run npm run backup first.');
      return;
    }
    const files = fs.readdirSync(BACKUPS)
      .filter(f => f.endsWith('.db'))
      .sort();
    if (!files.length) {
      warn('No backup files found in backups/');
      return;
    }
    const latest = path.join(BACKUPS, files[files.length - 1]);
    fs.mkdirSync(DATA, { recursive: true });
    fs.copyFileSync(latest, DB);
    ok('Restored from: backups/' + path.basename(latest));
    info('Restart the server for changes to take effect.');
  },

  // ── INFO ───────────────────────────────────────────────────────────
  info() {
    const pkg = require(path.join(ROOT, 'package.json'));
    const dbExists = fs.existsSync(DB);
    const dbSize   = dbExists ? fs.statSync(DB).size : 0;
    console.log('');
    console.log('  \x1b[33mApp      :\x1b[0m', pkg.name, 'v' + pkg.version);
    console.log('  \x1b[33mNode     :\x1b[0m', process.version);
    console.log('  \x1b[33mPlatform :\x1b[0m', process.platform);
    console.log('  \x1b[33mPort     :\x1b[0m', process.env.PORT || 3000);
    console.log('  \x1b[33mDatabase :\x1b[0m',
      dbExists
        ? path.relative(ROOT, DB) + '  (' + dbSize + ' bytes)'
        : '\x1b[90mnot created yet — will be created on first npm start\x1b[0m'
    );
    const backupCount = fs.existsSync(BACKUPS) ? fs.readdirSync(BACKUPS).filter(f=>f.endsWith('.db')).length : 0;
    console.log('  \x1b[33mBackups  :\x1b[0m', backupCount, 'backup(s) in backups/');
    console.log('');
  },

};

// ── ENTRY POINT ───────────────────────────────────────────────────────
const cmd = process.argv[2];
if (!cmd || !commands[cmd]) {
  err('Unknown command: ' + (cmd || '(none)'));
  info('Available: ' + Object.keys(commands).join(', '));
  process.exit(1);
}
try {
  commands[cmd]();
} catch (e) {
  err('Command failed: ' + e.message);
  process.exit(1);
}
