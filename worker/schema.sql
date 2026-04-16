-- GRE 8000 Flashcard - D1 Schema

CREATE TABLE IF NOT EXISTS users (
  uid        TEXT PRIMARY KEY,
  nickname   TEXT NOT NULL,
  secret     TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS progress (
  uid        TEXT PRIMARY KEY,
  data       TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL,
  FOREIGN KEY (uid) REFERENCES users(uid)
);

CREATE INDEX IF NOT EXISTS idx_users_secret ON users(secret);
