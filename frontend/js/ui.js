// ДокПро — UI утилиты

const UI = {
  // Показать/скрыть лоадер на кнопке
  btnLoad(btn, loading) {
    if (loading) {
      btn.dataset.origText = btn.innerHTML;
      btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Загрузка...';
      btn.disabled = true;
    } else {
      btn.innerHTML = btn.dataset.origText || btn.innerHTML;
      btn.disabled = false;
    }
  },

  // Toast уведомление
  toast(msg, type = 'success') {
    let wrap = document.getElementById('toast-wrap');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'toast-wrap';
      wrap.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
      document.body.appendChild(wrap);
    }
    const colors = { success: '#16a34a', error: '#dc2626', warning: '#d97706', info: '#2563eb' };
    const icons = {
      success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
      error: '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>',
      warning: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
      info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
    };
    const t = document.createElement('div');
    t.style.cssText = `display:flex;align-items:center;gap:10px;padding:12px 16px;background:#fff;color:${colors[type]||colors.info};border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,.15);font-size:14px;font-family:inherit;min-width:240px;max-width:360px;border-left:3px solid ${colors[type]||colors.info};animation:slideIn .2s ease;`;
    t.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${icons[type]||icons.info}</svg><span style="flex:1">${msg}</span>`;
    wrap.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; t.style.transition='opacity .3s'; setTimeout(()=>t.remove(),300); }, 3500);
  },

  // Открыть/закрыть модалку
  openModal(id)  { document.getElementById(id)?.classList.add('open'); },
  closeModal(id) { document.getElementById(id)?.classList.remove('open'); },

  // Подтверждение удаления
  confirm(msg) { return window.confirm(msg); },

  // Форматирование суммы
  money(n) { return Number(n||0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); },

  // Форматирование даты
  date(str) {
    if (!str) return '—';
    const d = new Date(str);
    return isNaN(d) ? str : d.toLocaleDateString('ru-RU');
  },

  // Дата для input[type=date]
  today() {
    return new Date().toISOString().split('T')[0];
  },

  // Инициалы из имени
  initials(name) {
    if (!name) return '?';
    return name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
  },

  // Рендер бейджа типа документа
  docTypeBadge(type) {
    const map = {
      'Договор':      'badge-blue',
      'Спецификация': 'badge-yellow',
      'Акт':          'badge-green',
      'Счёт':         'badge-gray',
      'Другой':       'badge-gray',
    };
    return `<span class="badge ${map[type]||'badge-gray'}">${type||'—'}</span>`;
  }
};

// Делегирование для кнопок скачивания (XSS-safe)
document.addEventListener('click', e => {
  const btn = e.target.closest('.btn-download');
  if (btn) {
    const id = btn.dataset.id;
    const title = btn.dataset.title;
    Api.download(`/documents/${id}/download`, `${title}.docx`);
  }
});

// CSS анимация для toast
const style = document.createElement('style');
style.textContent = '@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}';
document.head.appendChild(style);
