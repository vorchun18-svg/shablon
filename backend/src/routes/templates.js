const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads/templates')),
  filename: (req, file, cb) => {
    const name = `tpl_${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      cb(null, true);
    } else {
      cb(new Error('Разрешены только .docx файлы'));
    }
  }
});

router.use(authMiddleware);

router.get('/', (req, res) => {
  const rows = req.db.prepare('SELECT * FROM templates WHERE is_active=1 ORDER BY doc_type, name').all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = req.db.prepare('SELECT * FROM templates WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Не найдено' });
  res.json(row);
});

// Получить список тегов из шаблона
router.get('/:id/tags', (req, res) => {
  const tpl = req.db.prepare('SELECT * FROM templates WHERE id=?').get(req.params.id);
  if (!tpl) return res.status(404).json({ error: 'Шаблон не найден' });
  try {
    const filePath = path.join(__dirname, '../../uploads/templates', tpl.filename);
    const content = fs.readFileSync(filePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    const fullText = doc.getFullText();
    const tags = [...new Set([...fullText.matchAll(/\{\{([^}]+)\}\}/g)].map(m => m[1]))];
    res.json({ tags });
  } catch (e) {
    res.status(500).json({ error: 'Ошибка чтения шаблона: ' + e.message });
  }
});

router.post('/', adminOnly, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Файл не загружен' });
  const { name, doc_type, description } = req.body;
  if (!name || !doc_type) return res.status(400).json({ error: 'Укажите название и тип документа' });
  const r = req.db.prepare('INSERT INTO templates (name, doc_type, filename, description) VALUES (?,?,?,?)').run(name, doc_type, req.file.filename, description);
  res.json({ id: r.lastInsertRowid, filename: req.file.filename, message: 'Шаблон загружен' });
});

router.put('/:id', adminOnly, (req, res) => {
  const { name, doc_type, description } = req.body;
  req.db.prepare('UPDATE templates SET name=?, doc_type=?, description=? WHERE id=?').run(name, doc_type, description, req.params.id);
  res.json({ message: 'Обновлено' });
});

router.delete('/:id', adminOnly, (req, res) => {
  req.db.prepare('UPDATE templates SET is_active=0 WHERE id=?').run(req.params.id);
  res.json({ message: 'Удалено' });
});

module.exports = router;
