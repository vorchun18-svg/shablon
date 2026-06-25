// ДокПро — API клиент
const API_BASE = '/api';

let _token = null;

const Api = {
  setToken(t) { _token = t; },
  getToken() { return _token; },

  async request(method, url, data = null, isFormData = false) {
    const headers = {};
    if (_token) headers['Authorization'] = `Bearer ${_token}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';

    const opts = { method, headers };
    if (data) opts.body = isFormData ? data : JSON.stringify(data);

    const res = await fetch(API_BASE + url, opts);
    if (res.status === 401) {
      Auth.logout();
      return;
    }
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || `Ошибка ${res.status}`);
    return json;
  },

  get(url)           { return this.request('GET', url); },
  post(url, data)    { return this.request('POST', url, data); },
  put(url, data)     { return this.request('PUT', url, data); },
  delete(url)        { return this.request('DELETE', url); },
  upload(url, form)  { return this.request('POST', url, form, true); },

  // Скачать файл
  async download(url, filename) {
    const res = await fetch(API_BASE + url, {
      headers: { 'Authorization': `Bearer ${_token}` }
    });
    if (!res.ok) { alert('Файл не найден'); return; }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }
};
