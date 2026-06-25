// ДокПро — авторизация
const Auth = {
  _user: null,
  _token: null,

  init() {
    this._token = localStorage.getItem('dp_token');
    const u = localStorage.getItem('dp_user');
    if (u) try { this._user = JSON.parse(u); } catch {}
    if (this._token) Api.setToken(this._token);
  },

  save(token, user) {
    this._token = token;
    this._user = user;
    localStorage.setItem('dp_token', token);
    localStorage.setItem('dp_user', JSON.stringify(user));
    Api.setToken(token);
  },

  logout() {
    localStorage.removeItem('dp_token');
    localStorage.removeItem('dp_user');
    this._token = null;
    this._user = null;
    window.location.href = '/login.html';
  },

  isLoggedIn()  { return !!this._token; },
  getUser()     { return this._user; },
  isAdmin()     { return this._user?.role === 'admin'; },

  requireAuth() {
    if (!this.isLoggedIn()) { window.location.href = '/login.html'; return false; }
    return true;
  },

  requireAdmin() {
    if (!this.isLoggedIn()) { window.location.href = '/login.html'; return false; }
    if (!this.isAdmin()) { window.location.href = '/index.html'; return false; }
    return true;
  }
};
