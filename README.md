# MAGIZH TRADER — Profit Tracker

A standalone web application for tracking your weekly ($200) and monthly ($800) MNQ futures profit targets with automatic tier scaling.

---

## Features

- Weekly target tracking ($200 per week, 4 weeks)
- Monthly target tracking ($800 per month)
- Auto tier scaling — every $5,000 net balance unlocks the next tier
- Payout/withdrawal tracking — deducted from net balance and tier calculation
- Cross-device sync — data stored in SQLite database on your server
- Green/gold highlights when weekly or monthly targets are hit
- Psychology quotes on every month
- Works on PC, mobile, tablet — any browser on your network

---

## Requirements

- Node.js v18 or higher (https://nodejs.org)
- npm (comes with Node.js)

---

## Installation

1. Copy the `magizh-tracker` folder to your computer
2. Open a terminal / command prompt inside the folder
3. Install dependencies:

```
npm install
```

---

## Running the App

```
npm start
```

You will see:
```
MAGIZH TRADER — Tracker running on http://localhost:3000
```

Open your browser and go to: **http://localhost:3000**

---

## Access from Mobile / Other Devices on Same Network

1. Find your PC's local IP address:
   - Windows: open Command Prompt → type `ipconfig` → look for IPv4 Address (e.g. 192.168.1.5)
   - Mac/Linux: open Terminal → type `ifconfig` → look for inet (e.g. 192.168.1.5)

2. On your mobile browser, go to: **http://192.168.1.5:3000**

Both your PC and mobile will now read and write to the same database — true cross-device sync.

---

## Data Storage

All data is stored in: `data/tracker.db` (SQLite database file)

This file is created automatically on first run. Back it up to keep your data safe.

---

## Running in Background (Optional)

Install PM2 to keep the app running even after closing the terminal:

```
npm install -g pm2
pm2 start server/index.js --name magizh-tracker
pm2 save
pm2 startup
```

---

## Project Structure

```
magizh-tracker/
├── server/
│   └── index.js          ← Express server + SQLite API
├── public/
│   ├── index.html        ← Main HTML page
│   ├── css/
│   │   └── style.css     ← All styles
│   └── js/
│       └── app.js        ← Frontend logic
├── data/
│   └── tracker.db        ← SQLite database (auto-created)
├── package.json
└── README.md
```
