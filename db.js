const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Load env if not already loaded (for standalone db.js usage if any)
if (!process.env.DB_PATH) {
  // Default fallback or rely on app.js loading it
}

const dbPath = process.env.DB_PATH || './steam_friends.db';

// Ensure directory exists
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// Players table
db.prepare(`
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    steam_id TEXT NOT NULL UNIQUE,
    name TEXT,
    dotabuff TEXT,
    mmr_estimate INTEGER,
    rank_tier INTEGER,
    rank_leaderboard INTEGER,
    profile TEXT,
    avatar TEXT,
    recent_win_rate REAL,
    recent_kda REAL,
    recent_gpm INTEGER,
    recent_xpm INTEGER,
    most_played_hero_id INTEGER,
    region_cluster INTEGER,
    last_update INTEGER DEFAULT 0
  )
`).run();

// Migration: Add new columns if they don't exist
const columnsToAdd = [
  'rank_leaderboard INTEGER',
  'recent_win_rate REAL',
  'recent_kda REAL',
  'recent_gpm INTEGER',
  'recent_xpm INTEGER',
  'most_played_hero_id INTEGER',
  'region_cluster INTEGER'
];

columnsToAdd.forEach(colDef => {
  try {
    const colName = colDef.split(' ')[0];
    db.prepare(`ALTER TABLE players ADD COLUMN ${colDef}`).run();
  } catch (e) {
    // Column likely already exists
  }
});

// Users table (for admin)
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL
  )
`).run();

// Ensure fixed admin user exists (username: admin, password: 123)
const adminUser = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
if (!adminUser) {
  const hash = bcrypt.hashSync('123', 10);
  db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('admin', hash);
  console.log('Admin user created: admin / 123');
}

module.exports = db;
