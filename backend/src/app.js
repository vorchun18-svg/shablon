require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

const CORS_ORIGINS = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:8080', 'http://localhost:3001', 'http://localhost'];

app.use(cors({
  origin: CORS_ORIGINS,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Статические файлы
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.join(__dirname, '../../frontend')));

app.use((req, res, next) => { req.db = req.app.locals.db; next(); });

app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'ДокПро' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Внутренняя ошибка сервера' });
});

const PORT = process.env.PORT || 3001;

async function start() {
  const db = await require('./db/schema');
  app.locals.db = db;

  // Создать директории для загрузок, если их нет
  ['../uploads/templates', '../uploads/documents'].forEach(dir => {
    const d = path.join(__dirname, dir);
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });

  app.use('/api/auth',        require('./routes/auth'));
  app.use('/api/companies',   require('./routes/companies'));
  app.use('/api/contractors', require('./routes/contractors'));
  app.use('/api/services',    require('./routes/services'));
  app.use('/api/templates',   require('./routes/templates'));
  app.use('/api/documents',   require('./routes/documents'));
  app.use('/api/users',       require('./routes/users'));

  // SPA-fallback — все не API/upload маршруты → login.html
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/login.html'));
  });

  app.listen(PORT, () => console.log(`🚀 ДокПро запущен на порту ${PORT}`));
}

start();
