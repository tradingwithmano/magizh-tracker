# MAGIZH TRADER — Profit Tracker

A standalone web application for tracking your weekly ($200) and monthly ($800)
MNQ futures profit targets with automatic tier scaling.

---

## Features

- Weekly target tracking ($200 per week x 4 weeks)
- Monthly target tracking ($800 per month)
- Auto tier scaling — every $5,000 net balance unlocks the next tier (+$100 risk, +$600/month)
- Payout/withdrawal tracking — deducted from net balance and tier calculation
- SQLite database — data persists across restarts
- Works on PC, mobile, tablet — any browser
- Responsive design

---

## Local Development

### Requirements
- Node.js v18 or higher: https://nodejs.org

### Install and Run

```
npm install
npm run build
npm start
```

Open browser at: http://localhost:3000

For auto-restart on file changes (development):
```
npm run dev
```

### Available Scripts

| Script              | What it does                                     |
|---------------------|--------------------------------------------------|
| npm start           | Start the server (production)                    |
| npm run dev         | Start with auto-restart on file changes          |
| npm run build       | Create required folders (data/, backups/)        |
| npm run clean       | Remove generated folders                         |
| npm run clean:db    | Delete the database file (fresh start)           |
| npm run lint        | Syntax-check server and frontend JS              |
| npm run backup      | Copy database to backups/tracker_TIMESTAMP.db    |
| npm run restore     | Restore latest backup into data/tracker.db       |
| npm run info        | Show app info, Node version, DB status           |
| npm run pm2:start   | Start as background process using PM2            |

---

## Deploy FREE to Render.com (Recommended)

Render.com gives you a free Node.js server with persistent disk.
Your SQLite database survives restarts and redeploys. No credit card required.

### Step 1 — Push code to GitHub

1. Create a free account at https://github.com
2. Create a new PRIVATE repository called magizh-tracker
3. Open terminal in your magizh-tracker folder and run:

```
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/magizh-tracker.git
git push -u origin main
```

### Step 2 — Create Web Service on Render

1. Create free account at https://render.com
2. Click New then Web Service
3. Click Connect GitHub and select your magizh-tracker repository
4. Render auto-detects render.yaml and fills in all settings
5. Click Create Web Service

Your app will be live at a URL like:
https://magizh-trader-tracker.onrender.com

### Step 3 — Add Persistent Disk (keeps database across restarts)

1. Go to your service on Render dashboard
2. Click Disks in left menu
3. Click Add Disk:
   - Name: tracker-db
   - Mount Path: /data
   - Size: 1 GB (free)
4. Click Save

### Step 4 — Set Environment Variable

1. Click Environment in left menu on Render
2. Add variable:
   - Key:   DB_PATH
   - Value: /data/tracker.db
3. Click Save Changes — service will redeploy automatically

Now your data is saved permanently and accessible from any device.

---

## Deploy FREE to Railway.app (Alternative)

1. Create account at https://railway.app
2. Click New Project then Deploy from GitHub repo
3. Select your magizh-tracker repository
4. Go to Variables tab and add: DB_PATH = /data/tracker.db
5. Go to Volumes tab, add a volume, mount it at /data
6. Deploy — free $5 credit per month included

---

## Run on Local Network (PC + Mobile on same WiFi)

To keep app running after closing terminal:
```
npm install -g pm2
npm run pm2:start
npm run pm2:save
```

Find your PC IP address:
- Windows: open Command Prompt, type ipconfig, look for IPv4 Address
- Mac/Linux: open Terminal, type ifconfig, look for inet

Access from mobile browser: http://YOUR_PC_IP:3000

---

## Free Tier Note (Render.com)

The free web service spins down after 15 minutes of no traffic.
The first request after sleep takes about 30 seconds to wake up.
All requests after that are fast.

To keep it always-on, upgrade to Render Starter at $7/month.

---

## Project Structure

```
magizh-tracker/
  server/
    index.js          Express server + SQLite API
  public/
    index.html
    css/style.css
    js/app.js
  scripts/
    run.js            Cross-platform build scripts
  data/
    tracker.db        SQLite database (auto-created, excluded from git)
  backups/            Manual backups (excluded from git)
  .env.example        Environment variable template
  .gitignore
  render.yaml         Render.com deployment config
  package.json
  README.md
```
