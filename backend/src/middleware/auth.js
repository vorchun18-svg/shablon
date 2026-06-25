const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = req.db.prepare('SELECT id, username, full_name, role, is_active FROM users WHERE id = ?').get(decoded.id);
    if (!user || !user.is_active) return res.status(401).json({ error: 'Пользователь не найден или заблокирован' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Недействительный токен' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Недостаточно прав. Требуется роль администратора.' });
  }
  next();
};

module.exports = { authMiddleware, adminOnly };
