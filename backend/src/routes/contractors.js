const router = require('express').Router();
const { authMiddleware, adminOnly } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', (req, res) => {
  const q = req.query.q;
  let rows;
  if (q) {
    rows = req.db.prepare("SELECT * FROM contractors WHERE is_active=1 AND (name LIKE ? OR inn LIKE ?) ORDER BY name").all(`%${q}%`, `%${q}%`);
  } else {
    rows = req.db.prepare('SELECT * FROM contractors WHERE is_active=1 ORDER BY name').all();
  }
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = req.db.prepare('SELECT * FROM contractors WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Не найдено' });
  res.json(row);
});

function p(v) { return v ?? ''; }

router.post('/', adminOnly, (req, res) => {
  const f = req.body;
  const r = req.db.prepare(`
    INSERT INTO contractors (name,short_name,inn,kpp,ogrn,address,postal_address,bank,bik,account,corr_account,signatory,position,basis,phone,email,contact_person,entity_type,ogrnip,ip_lastname,ip_firstname,ip_patronymic)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(p(f.name),p(f.short_name),p(f.inn),p(f.kpp),p(f.ogrn),p(f.address),p(f.postal_address),p(f.bank),p(f.bik),p(f.account),p(f.corr_account),p(f.signatory),p(f.position),p(f.basis),p(f.phone),p(f.email),p(f.contact_person),f.entity_type||'legal',p(f.ogrnip),p(f.ip_lastname),p(f.ip_firstname),p(f.ip_patronymic));
  res.json({ id: r.lastInsertRowid, message: 'Контрагент создан' });
});

router.put('/:id', adminOnly, (req, res) => {
  const f = req.body;
  req.db.prepare(`
    UPDATE contractors SET name=?,short_name=?,inn=?,kpp=?,ogrn=?,address=?,postal_address=?,bank=?,bik=?,account=?,corr_account=?,signatory=?,position=?,basis=?,phone=?,email=?,contact_person=?,entity_type=?,ogrnip=?,ip_lastname=?,ip_firstname=?,ip_patronymic=?
    WHERE id=?
  `).run(p(f.name),p(f.short_name),p(f.inn),p(f.kpp),p(f.ogrn),p(f.address),p(f.postal_address),p(f.bank),p(f.bik),p(f.account),p(f.corr_account),p(f.signatory),p(f.position),p(f.basis),p(f.phone),p(f.email),p(f.contact_person),f.entity_type||'legal',p(f.ogrnip),p(f.ip_lastname),p(f.ip_firstname),p(f.ip_patronymic),req.params.id);
  res.json({ message: 'Обновлено' });
});

router.delete('/:id', adminOnly, (req, res) => {
  req.db.prepare('UPDATE contractors SET is_active = 0 WHERE id = ?').run(req.params.id);
  res.json({ message: 'Удалено' });
});

module.exports = router;
