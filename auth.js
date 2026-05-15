// ============================================================
// auth.js — модуль авторизации Auditorium Onboard v3
// Пользователи: localStorage.ao_users (JSON)
// Сессия:       localStorage.ao_session
// Инвайт-коды:  localStorage.ao_invites (JSON)
// ============================================================

const ADMIN_ROLES = ['hr', 'ceo', 'exec_dir', 'ops_dir'];

const Auth = {

  // ── Миграция: все админ-роли → admin:true ─────────────────
  migrate() {
    const users = this.getUsers();
    let changed = false;
    Object.values(users).forEach(u => {
      if (ADMIN_ROLES.includes(u.role) && u.admin !== true) {
        u.admin = true;
        changed = true;
      }
    });
    if (changed) this.saveUsers(users);
  },

  // ── Пользователи ──────────────────────────────────────────
  getUsers() {
    return JSON.parse(localStorage.getItem('ao_users') || '{}');
  },
  saveUsers(users) {
    localStorage.setItem('ao_users', JSON.stringify(users));
  },

  // ── Инвайт-коды ───────────────────────────────────────────
  getInvites() {
    return JSON.parse(localStorage.getItem('ao_invites') || '{}');
  },
  saveInvites(inv) {
    localStorage.setItem('ao_invites', JSON.stringify(inv));
  },
  createInvite(role, label) {
    const inv  = this.getInvites();
    const code = 'AO-' + Math.random().toString(36).substr(2,6).toUpperCase();
    inv[code]  = { role: role || '', label: label || '', used: false, createdAt: Date.now() };
    this.saveInvites(inv);
    return code;
  },
  checkInvite(code) {
    const inv = this.getInvites();
    const c   = inv[code.trim().toUpperCase()];
    if (!c || c.used) return null;
    return c;
  },
  useInvite(code) {
    const inv = this.getInvites();
    const key = code.trim().toUpperCase();
    if (inv[key]) { inv[key].used = true; inv[key].usedAt = Date.now(); }
    this.saveInvites(inv);
  },
  deleteInvite(code) {
    const inv = this.getInvites();
    delete inv[code.trim().toUpperCase()];
    this.saveInvites(inv);
  },

  // ── Текущий пользователь ──────────────────────────────────
  current() {
    const login = localStorage.getItem('ao_session');
    if (!login) return null;
    return this.getUsers()[login] || null;
  },
  currentLogin() {
    return localStorage.getItem('ao_session');
  },
  isAdmin() {
    const u = this.current();
    return u && (u.admin === true || ADMIN_ROLES.includes(u.role));
  },

  // ── Регистрация ──────────────────────────────────────────────
  register(login, pass, fio, inviteCode) {
    if (!login || login.length < 3) return { ok: false, msg: 'Логин минимум 3 символа' };
    if (!pass  || pass.length  < 4) return { ok: false, msg: 'Пароль минимум 4 символа' };
    if (!fio)                        return { ok: false, msg: 'Введите ФИО' };
    const users = this.getUsers();
    if (users[login]) return { ok: false, msg: 'Логин уже занят' };
    const invite = this.checkInvite(inviteCode || '');
    if (!invite) return { ok: false, msg: 'Неверный или уже использованный код приглашения' };
    const role  = invite.role || 'producer';
    users[login] = {
      pass, fio, role,
      id:        Date.now().toString(),
      admin:     ADMIN_ROLES.includes(role),
      blocked:   false,
      createdAt: Date.now()
    };
    this.saveUsers(users);
    this.useInvite(inviteCode);
    return { ok: true, role };
  },

  // ── Первый запуск ──────────────────────────────────────────
  bootstrapAdmin(login, pass, fio) {
    const users = this.getUsers();
    if (Object.keys(users).length > 0) return { ok: false, msg: 'Система уже инициализирована' };
    if (!login || login.length < 3) return { ok: false, msg: 'Логин минимум 3 символа' };
    if (!pass  || pass.length  < 4) return { ok: false, msg: 'Пароль минимум 4 символа' };
    if (!fio)                        return { ok: false, msg: 'Введите ФИО' };
    users[login] = {
      pass, fio, role: 'hr',
      id:        Date.now().toString(),
      admin:     true,
      blocked:   false,
      createdAt: Date.now()
    };
    this.saveUsers(users);
    return { ok: true };
  },

  // ── Вход ──────────────────────────────────────────────────
  login(login, pass) {
    const users = this.getUsers();
    const user  = users[login];
    if (!user)              return { ok: false, msg: 'Пользователь не найден' };
    if (user.pass !== pass) return { ok: false, msg: 'Неверный пароль' };
    if (user.blocked)       return { ok: false, msg: 'Аккаунт заблокирован. Обратитесь к HR' };
    localStorage.setItem('ao_session', login);
    return { ok: true };
  },

  logout() {
    localStorage.removeItem('ao_session');
    window.location.href = 'login.html';
  },

  // ── Обновление профиля ────────────────────────────────────
  update(newFio, newPass) {
    const login = this.currentLogin(); if (!login) return;
    const users = this.getUsers();
    if (newFio) users[login].fio = newFio;
    if (newPass && newPass.length >= 4) users[login].pass = newPass;
    this.saveUsers(users);
  },
  updateRole(newRole) {
    const login = this.currentLogin(); if (!login || !newRole) return;
    const users = this.getUsers();
    users[login].role = newRole;
    this.saveUsers(users);
  },

  // ── Управление пользователями (admin) ────────────────────
  setUserRole(targetLogin, newRole) {
    if (!this.isAdmin()) return;
    const users = this.getUsers();
    if (users[targetLogin]) {
      users[targetLogin].role  = newRole;
      users[targetLogin].admin = ADMIN_ROLES.includes(newRole);
    }
    this.saveUsers(users);
  },
  blockUser(targetLogin) {
    if (!this.isAdmin()) return;
    const users = this.getUsers();
    if (users[targetLogin]) users[targetLogin].blocked = true;
    this.saveUsers(users);
  },
  unblockUser(targetLogin) {
    if (!this.isAdmin()) return;
    const users = this.getUsers();
    if (users[targetLogin]) users[targetLogin].blocked = false;
    this.saveUsers(users);
  },
  deleteUser(targetLogin) {
    if (!this.isAdmin()) return;
    const users = this.getUsers();
    delete users[targetLogin];
    this.saveUsers(users);
  },
  promoteToAdmin(targetLogin) {
    if (!this.isAdmin()) return;
    const users = this.getUsers();
    if (users[targetLogin]) users[targetLogin].admin = true;
    this.saveUsers(users);
  },

  // ── Прогресс ──────────────────────────────────────────────
  resetProgress() {
    const user = this.current(); if (!user) return;
    Object.keys(localStorage)
      .filter(k => k.startsWith('ao_p_' + user.id + '_'))
      .forEach(k => localStorage.removeItem(k));
  },
  getCheck(key) {
    const user = this.current(); if (!user) return false;
    return localStorage.getItem('ao_p_' + user.id + '_' + key) === '1';
  },
  setCheck(key, val) {
    const user = this.current(); if (!user) return;
    localStorage.setItem('ao_p_' + user.id + '_' + key, val ? '1' : '0');
  },

  requireAuth() {
    if (!this.current()) { window.location.href = 'login.html'; return false; }
    return true;
  }
};

// Запуск миграции сразу при загрузке скрипта
Auth.migrate();
