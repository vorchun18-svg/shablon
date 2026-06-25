const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', (req, res) => {
  const rows = req.db.prepare(`
    SELECT d.*, c.name as company_name, ct.name as contractor_name,
           t.name as template_name, u.full_name as created_by_name
    FROM documents d
    LEFT JOIN companies c ON d.company_id = c.id
    LEFT JOIN contractors ct ON d.contractor_id = ct.id
    LEFT JOIN templates t ON d.template_id = t.id
    LEFT JOIN users u ON d.created_by = u.id
    ORDER BY d.created_at DESC LIMIT 100
  `).all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const doc = req.db.prepare(`
    SELECT d.*, c.name as company_name, ct.name as contractor_name
    FROM documents d
    LEFT JOIN companies c ON d.company_id = c.id
    LEFT JOIN contractors ct ON d.contractor_id = ct.id
    WHERE d.id = ?
  `).get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Не найдено' });
  const services = req.db.prepare('SELECT * FROM document_services WHERE document_id=? ORDER BY sort_order').all(req.params.id);
  res.json({ ...doc, services });
});

// POST /api/documents/generate — генерация документа
router.post('/generate', (req, res) => {
  const { template_id, company_id, contractor_id, doc_number, doc_date, services, extra_fields, title } = req.body;

  const tpl = req.db.prepare('SELECT * FROM templates WHERE id=?').get(template_id);
  const company = req.db.prepare('SELECT * FROM companies WHERE id=?').get(company_id);
  const contractor = req.db.prepare('SELECT * FROM contractors WHERE id=?').get(contractor_id);

  if (!tpl || !company || !contractor) {
    return res.status(400).json({ error: 'Не найдены данные для генерации документа' });
  }

  const serviceRows = (services || []).map(s => ({
    ...s,
    total: parseFloat((s.qty * s.price).toFixed(2))
  }));
  const total = serviceRows.reduce((sum, s) => sum + s.total, 0);

  const companyIPFullname = [company.ip_lastname||'', company.ip_firstname||'', company.ip_patronymic||''].filter(Boolean).join(' ');
  const contractorIPFullname = [contractor.ip_lastname||'', contractor.ip_firstname||'', contractor.ip_patronymic||''].filter(Boolean).join(' ');

  const data = {
    company: {
      name: company.name || '', short_name: company.short_name || '',
      inn: company.inn || '', kpp: company.kpp || '', ogrn: company.ogrn || '',
      address: company.address || '', postal_address: company.postal_address || '',
      bank: company.bank || '', bik: company.bik || '',
      account: company.account || '', corr_account: company.corr_account || '',
      signatory: company.signatory || '', position: company.position || '',
      basis: company.basis || '', phone: company.phone || '', email: company.email || '',
      entity_type: company.entity_type || 'legal',
      ogrnip: company.ogrnip || '',
      ip_fullname: companyIPFullname,
      ip_lastname: company.ip_lastname || '',
      ip_firstname: company.ip_firstname || '',
      ip_patronymic: company.ip_patronymic || ''
    },
    contractor: {
      name: contractor.name || '', short_name: contractor.short_name || '',
      inn: contractor.inn || '', kpp: contractor.kpp || '', ogrn: contractor.ogrn || '',
      address: contractor.address || '', postal_address: contractor.postal_address || '',
      bank: contractor.bank || '', bik: contractor.bik || '',
      account: contractor.account || '', corr_account: contractor.corr_account || '',
      signatory: contractor.signatory || '', position: contractor.position || '',
      basis: contractor.basis || '', phone: contractor.phone || '',
      email: contractor.email || '', contact_person: contractor.contact_person || '',
      entity_type: contractor.entity_type || 'legal',
      ogrnip: contractor.ogrnip || '',
      ip_fullname: contractorIPFullname,
      ip_lastname: contractor.ip_lastname || '',
      ip_firstname: contractor.ip_firstname || '',
      ip_patronymic: contractor.ip_patronymic || ''
    },
    doc: {
      number: doc_number || '',
      date: doc_date || '',
      total: total.toFixed(2),
      total_words: numberToWords(total),
      ...(extra_fields || {})
    },
    services: serviceRows
  };

  try {
    const filePath = path.join(__dirname, '../../uploads/templates', tpl.filename);
    const content = fs.readFileSync(filePath, 'binary');
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    doc.render(data);

    const outName = `doc_${Date.now()}.docx`;
    const outPath = path.join(__dirname, '../../uploads/documents', outName);
    const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
    fs.writeFileSync(outPath, buf);

    const docTitle = title || `${tpl.name} №${doc_number} от ${doc_date}`;
    const result = req.db.prepare(`
      INSERT INTO documents (title,doc_number,doc_date,doc_type,template_id,company_id,contractor_id,filename,data_snapshot,created_by)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `).run(docTitle, doc_number, doc_date, tpl.doc_type, template_id, company_id, contractor_id, outName, JSON.stringify(data), req.user.id);

    const insertSvc = req.db.prepare('INSERT INTO document_services (document_id,service_id,name,unit,qty,price,total,sort_order) VALUES (?,?,?,?,?,?,?,?)');
    serviceRows.forEach((s, i) => insertSvc.run(result.lastInsertRowid, s.service_id || null, s.name, s.unit, s.qty, s.price, s.total, i));

    res.json({ id: result.lastInsertRowid, filename: outName, title: docTitle });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Ошибка генерации документа: ' + e.message });
  }
});

// GET /api/documents/:id/download — скачать документ
router.get('/:id/download', (req, res) => {
  const doc = req.db.prepare('SELECT * FROM documents WHERE id=?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Документ не найден' });
  const filePath = path.join(__dirname, '../../uploads/documents', doc.filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Файл не найден на сервере' });
  res.download(filePath, `${doc.title}.docx`);
});

router.delete('/:id', (req, res) => {
  req.db.prepare('DELETE FROM documents WHERE id=?').run(req.params.id);
  res.json({ message: 'Удалено' });
});

function numberToWords(n) {
  const num = Math.floor(n);
  const kop = Math.round((n - num) * 100);
  return `${num} руб. ${kop.toString().padStart(2, '0')} коп.`;
}

module.exports = router;
