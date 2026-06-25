// ДокПро — общий layout (sidebar, тема, меню)

const Layout = {
  init(activePage) {
    Auth.init();
    if (!Auth.requireAuth()) return;
    this.renderSidebar(activePage);
    this.initTheme();
    this.initMobileMenu();
  },

  renderSidebar(activePage) {
    const user = Auth.getUser();
    const isAdmin = Auth.isAdmin();

    const navMain = [
      { id: 'dashboard',  href: '/index.html',           icon: iconHome,     label: 'Главная' },
      { id: 'new-doc',    href: '/pages/new-document.html', icon: iconPlus,  label: 'Новый документ' },
      { id: 'documents',  href: '/pages/documents.html',  icon: iconFile,    label: 'Документы' },
    ];
    const navAdmin = [
      { id: 'companies',   href: '/pages/companies.html',   icon: iconBuilding, label: 'Компании' },
      { id: 'contractors', href: '/pages/contractors.html', icon: iconUsers,    label: 'Контрагенты' },
      { id: 'services',    href: '/pages/services.html',    icon: iconBox,      label: 'Услуги' },
      { id: 'templates',   href: '/pages/templates.html',   icon: iconLayout,   label: 'Шаблоны' },
      { id: 'users',       href: '/pages/users.html',       icon: iconShield,   label: 'Пользователи' },
    ];

    const renderLinks = (items) => items.map(i =>
      `<li><a href="${i.href}" class="${activePage===i.id?'active':''}" data-page="${i.id}">
        ${i.icon} ${i.label}
      </a></li>`
    ).join('');

    const adminSection = isAdmin ? `
      <div class="sidebar-section">
        <div class="sidebar-section-title">Справочники</div>
        <ul class="sidebar-nav">${renderLinks(navAdmin)}</ul>
      </div>` : '';

    document.getElementById('sidebar').innerHTML = `
      <div class="sidebar-logo">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <rect width="28" height="28" rx="6" fill="#3b82f6"/>
          <path d="M7 8h14M7 12h10M7 16h12M7 20h8" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span class="sidebar-logo-text">ДокПро</span>
        ${isAdmin ? '<span class="sidebar-logo-badge">Админ</span>' : ''}
      </div>
      <div class="sidebar-section">
        <div class="sidebar-section-title">Основное</div>
        <ul class="sidebar-nav">${renderLinks(navMain)}</ul>
      </div>
      ${adminSection}
      <div class="sidebar-footer">
        <div class="sidebar-user">
          <div class="sidebar-user-avatar">${UI.initials(user?.full_name)}</div>
          <div class="sidebar-user-info">
            <div class="sidebar-user-name">${user?.full_name||'Пользователь'}</div>
            <div class="sidebar-user-role">${isAdmin?'Администратор':'Пользователь'}</div>
          </div>
          <button onclick="Auth.logout()" class="btn-ghost btn-icon" title="Выйти" style="color:var(--color-sidebar-text)">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </div>
    `;
  },

  initTheme() {
    const saved = localStorage.getItem('dp_theme');
    const sys = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const theme = saved || sys;
    document.documentElement.setAttribute('data-theme', theme);
    this.updateToggleIcon(theme);
  },

  toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('dp_theme', next);
    this.updateToggleIcon(next);
  },

  updateToggleIcon(theme) {
    const btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.innerHTML = theme === 'dark'
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    btn.title = theme === 'dark' ? 'Светлая тема' : 'Тёмная тема';
  },

  initMobileMenu() {
    document.getElementById('hamburger')?.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
      document.getElementById('sidebar-overlay').classList.toggle('open');
    });
    document.getElementById('sidebar-overlay')?.addEventListener('click', () => {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('sidebar-overlay').classList.remove('open');
    });
  }
};

// ===== SVG ИКОНКИ =====
const iconHome     = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
const iconPlus     = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`;
const iconFile     = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>`;
const iconBuilding = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M3 7l9-4 9 4M4 7v14M20 7v14M9 21V11h6v10"/></svg>`;
const iconUsers    = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`;
const iconBox      = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>`;
const iconLayout   = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`;
const iconShield   = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`;
