-- PigeonTrack D1 schema
-- Apply with: wrangler d1 execute pigeontrack-db --remote --file=./schema.sql
-- (or paste into the Cloudflare dashboard D1 console)

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6b8f47'
);

CREATE TABLE IF NOT EXISTS pigeons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  species TEXT,
  sex TEXT,
  ring_number TEXT,
  color TEXT,
  hatch_date TEXT,
  cost REAL,
  health_status TEXT,
  notes TEXT,
  photo_data TEXT,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  father_id INTEGER REFERENCES pigeons(id) ON DELETE SET NULL,
  mother_id INTEGER REFERENCES pigeons(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'activ',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pigeons_father ON pigeons(father_id);
CREATE INDEX IF NOT EXISTS idx_pigeons_mother ON pigeons(mother_id);
CREATE INDEX IF NOT EXISTS idx_pigeons_category ON pigeons(category_id);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  event_date TEXT NOT NULL,
  category TEXT,
  release_location TEXT,
  distance_km REAL,
  release_time TEXT,
  weather TEXT,
  total_pigeons INTEGER,
  total_lofts INTEGER,
  entry_cost REAL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS event_participants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  pigeon_id INTEGER NOT NULL REFERENCES pigeons(id) ON DELETE CASCADE,
  arrival_time TEXT,
  speed_m_min REAL,
  rank_position INTEGER,
  coefficient REAL,
  prize TEXT,
  notes TEXT,
  UNIQUE(event_id, pigeon_id)
);

CREATE INDEX IF NOT EXISTS idx_participants_event ON event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_pigeon ON event_participants(pigeon_id);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
