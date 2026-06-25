const initSqlJs = require('sql.js');
const path = require('path');
const bcrypt = require('bcryptjs');
const fs = require('fs');
require('dotenv').config();

const DB_PATH = process.env.DB_PATH || './data/dokpro.db';
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

let db = null;

function wrap(dbRaw) {
  return {
    exec(sql) { dbRaw.run(sql); },

    prepare(sql) {
      const stmt = dbRaw.prepare(sql);
      return {
        get(...params) {
          if (params.length) stmt.bind(params);
          if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.reset();
            return row;
          }
          stmt.reset();
          return undefined;
        },
        all(...params) {
          if (params.length) stmt.bind(params);
          const rows = [];
          while (stmt.step()) rows.push(stmt.getAsObject());
          stmt.reset();
          return rows;
        },
        run(...params) {
          if (params.length) stmt.bind(params);
          stmt.step();
          stmt.reset();
          return { lastInsertRowid: dbRaw.exec("SELECT last_insert_rowid() as id")[0]?.values?.[0]?.[0] || 0 };
        }
      };
    }
  };
}

async function init() {
  const SQL = await initSqlJs();
  let buffer = null;
  if (fs.existsSync(DB_PATH)) {
    buffer = fs.readFileSync(DB_PATH);
  }
  const dbRaw = new SQL.Database(buffer);
  dbRaw.run('PRAGMA foreign_keys = ON');
  db = wrap(dbRaw);

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      username   TEXT NOT NULL UNIQUE,
      password   TEXT NOT NULL,
      full_name  TEXT NOT NULL,
      role       TEXT NOT NULL DEFAULT 'user' CHECK(role IN ('admin','user')),
      is_active  INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS companies (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT NOT NULL,
      short_name     TEXT,
      inn            TEXT, kpp TEXT, ogrn TEXT,
      address        TEXT, postal_address TEXT,
      bank           TEXT, bik TEXT,
      account        TEXT, corr_account TEXT,
      signatory      TEXT, position TEXT, basis TEXT,
      phone          TEXT, email TEXT,
      is_active      INTEGER NOT NULL DEFAULT 1,
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contractors (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT NOT NULL,
      short_name     TEXT,
      inn            TEXT, kpp TEXT, ogrn TEXT,
      address        TEXT, postal_address TEXT,
      bank           TEXT, bik TEXT,
      account        TEXT, corr_account TEXT,
      signatory      TEXT, position TEXT, basis TEXT,
      phone          TEXT, email TEXT, contact_person TEXT,
      is_active      INTEGER NOT NULL DEFAULT 1,
      created_at     TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS services (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      description TEXT,
      unit        TEXT DEFAULT 'шт.',
      price       REAL DEFAULT 0,
      is_active   INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS templates (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      doc_type    TEXT NOT NULL CHECK(doc_type IN ('Договор','Спецификация','Акт','Счёт','Другой')),
      filename    TEXT NOT NULL,
      description TEXT,
      tags        TEXT,
      is_active   INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS documents (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      title         TEXT NOT NULL,
      doc_number    TEXT, doc_date TEXT, doc_type TEXT,
      template_id   INTEGER REFERENCES templates(id),
      company_id    INTEGER REFERENCES companies(id),
      contractor_id INTEGER REFERENCES contractors(id),
      filename      TEXT, data_snapshot TEXT,
      created_by    INTEGER REFERENCES users(id),
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS document_services (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      service_id  INTEGER REFERENCES services(id),
      name        TEXT NOT NULL,
      unit        TEXT,
      qty         REAL DEFAULT 1,
      price       REAL DEFAULT 0,
      total       REAL DEFAULT 0,
      sort_order  INTEGER DEFAULT 0
    );
  `);

  const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get();
  if (userCount.cnt === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(`INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, 'admin')`)
      .run('admin', hash, 'Администратор');
    console.log('✅ Создан admin/admin123 — смените пароль после первого входа!');
  }

  // Миграция: добавить поля для ИП (если ещё не добавлены)
  try { db.exec("ALTER TABLE companies ADD COLUMN entity_type TEXT NOT NULL DEFAULT 'legal'"); } catch (e) {}
  try { db.exec('ALTER TABLE companies ADD COLUMN ogrnip TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE companies ADD COLUMN ip_lastname TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE companies ADD COLUMN ip_firstname TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE companies ADD COLUMN ip_patronymic TEXT'); } catch (e) {}
  try { db.exec("ALTER TABLE contractors ADD COLUMN entity_type TEXT NOT NULL DEFAULT 'legal'"); } catch (e) {}
  try { db.exec('ALTER TABLE contractors ADD COLUMN ogrnip TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE contractors ADD COLUMN ip_lastname TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE contractors ADD COLUMN ip_firstname TEXT'); } catch (e) {}
  try { db.exec('ALTER TABLE contractors ADD COLUMN ip_patronymic TEXT'); } catch (e) {}

  // Save DB to disk periodically
  const save = () => {
    const data = dbRaw.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  };
  setInterval(save, 5000);
  process.on('exit', save);
  process.on('SIGINT', () => { save(); process.exit(); });
  process.on('SIGTERM', () => { save(); process.exit(); });

  return db;
}

const dbPromise = init();

module.exports = dbPromise;
