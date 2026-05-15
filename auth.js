// ============================================================
// auth.js — модуль авторизации Auditorium Onboard
// Хранит всех пользователей в localStorage.ao_users (JSON)
// Текущий сессионный пользователь — localStorage.ao_session
// ============================================================

const Auth = {

  getUsers() {
    return JSON.parse(localStorage.getItem('ao_users') || '{}');
  },

  saveUsers(users) {
    localStorage.setItem('ao_users', JSON.stringify(users));
  },

  current() {
    const login = localStorage.getItem('ao_session');
    if (!login) return null;
    const users = this.getUsers();
    return users[login] || null;
  },

  currentLogin() {
    return localStorage.getItem('ao_session');
  },

  register(login, pass, fio, role) {
    const users = this.getUsers();
    if (users[login]) return { ok: false, msg: 'Логин уже занят' };
    if (!login || login.length < 3) return { ok: false, msg: 'Логин минимум 3 символа' };
    if (!pass || pass.length < 4) return { ok: false, msg: 'Пароль минимум 4 символа' };
    if (!fio) return { ok: false, msg: 'Введите ФИО' };
    if (!role) return { ok: false, msg: 'Выберите роль' };
    users[login] = { pass, fio, role, id: Date.now().toString() };
    this.saveUsers(users);
    return { ok: true };
  },

  login(login, pass) {
    const users = this.getUsers();
    const user = users[login];
    if (!user) return { ok: false, msg: 'Пользователь не найден' };
    if (user.pass !== pass) return { ok: false, msg: 'Неверный пароль' };
    localStorage.setItem('ao_session', login);
    return { ok: true };
  },

  logout() {
    localStorage.removeItem('ao_session');
    window.location.href = 'login.html';
  },

  // Обновить ФИО и/или пароль
  update(newFio, newPass) {
    const login = this.currentLogin();
    if (!login) return;
    const users = this.getUsers();
    if (newFio) users[login].fio = newFio;
    if (newPass && newPass.length >= 4) users[login].pass = newPass;
    this.saveUsers(users);
  },

  // Обновить роль (прогресс старой роли сохраняется, не сбрасывается)
  updateRole(newRole) {
    const login = this.currentLogin();
    if (!login || !newRole) return;
    const users = this.getUsers();
    users[login].role = newRole;
    this.saveUsers(users);
  },

  resetProgress() {
    const user = this.current();
    if (!user) return;
    Object.keys(localStorage)
      .filter(k => k.startsWith('ao_p_' + user.id + '_'))
      .forEach(k => localStorage.removeItem(k));
  },

  getCheck(key) {
    const user = this.current();
    if (!user) return false;
    return localStorage.getItem('ao_p_' + user.id + '_' + key) === '1';
  },

  setCheck(key, val) {
    const user = this.current();
    if (!user) return;
    localStorage.setItem('ao_p_' + user.id + '_' + key, val ? '1' : '0');
  },

  requireAuth() {
    if (!this.current()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }
};
