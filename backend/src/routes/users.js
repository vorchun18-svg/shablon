const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.use(authMiddleware);
router.use(adminOnly);

router.get('/', (req, res) => {
  const rows = req.db.prepare('SELECT id, username, full_name, role, is_active, created_at FROM users ORDER BY full_name').all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { username, password, full_name, role } = req.body;
  if (!username || !password || !full_name) return res.status(400).json({ error: 'Заполните все поля' });
  if (password.length < 6) return res.status(400).json({ error: 'Пароль минимум 6 символов' });
  const existing = req.db.prepare('SELECT id FROM users WHERE username=?').get(username);
  if (existing) return res.status(400).json({ error: 'Логин уже занят' });
  const hash = bcrypt.hashSync(password, 10);
  const r = req.db.prepare('INSERT INTO users (username, password, full_name, role) VALUES (?,?,?,?)').run(username, hash, full_name, role || 'user');
  res.json({ id: r.lastInsertRowid, message: 'Пользователь создан' });
});

router.put('/:id', (req, res) => {
  const { full_name, password, role, is_active } = req.body;
  if (password) {
    if (password.length < 6) return res.status(400).json({ error: 'Пароль минимум 6 символов' });
    const hash = bcrypt.hashSync(password, 10);
    req.db.prepare('UPDATE users SET full_name=?, password=?, role=?, is_active=? WHERE id=?').run(full_name, hash, role, is_active, req.params.id);
  } else {
    req.db.prepare('UPDATE users SET full_name=?, role=?, is_active=? WHERE id=?').run(full_name, role, is_active, req.params.id);
  }
  res.json({ message: 'Обновлено' });
});

router.delete('/:id', (req, res) => {
  req.db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  res.json({ message: 'Удалено' });
});

module.exports = router;
