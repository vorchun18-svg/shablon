const router = require('express').Router();
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', (req, res) => {
  const rows = req.db.prepare('SELECT * FROM services WHERE is_active=1 ORDER BY name').all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = req.db.prepare('SELECT * FROM services WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Не найдено' });
  res.json(row);
});

router.post('/', adminOnly, (req, res) => {
  const { name, description, unit, price } = req.body;
  if (!name) return res.status(400).json({ error: 'Название обязательно' });
  const r = req.db.prepare('INSERT INTO services (name, description, unit, price) VALUES (?, ?, ?, ?)').run(name, description, unit || 'шт.', price || 0);
  res.json({ id: r.lastInsertRowid, message: 'Услуга создана' });
});

router.put('/:id', adminOnly, (req, res) => {
  const { name, description, unit, price } = req.body;
  req.db.prepare('UPDATE services SET name=?, description=?, unit=?, price=? WHERE id=?').run(name, description, unit, price, req.params.id);
  res.json({ message: 'Обновлено' });
});

router.delete('/:id', adminOnly, (req, res) => {
  req.db.prepare('UPDATE services SET is_active=0 WHERE id=?').run(req.params.id);
  res.json({ message: 'Удалено' });
});

module.exports = router;
