// ============================================================
// auth.js — модуль авторизации Auditorium Onboard v6
// Прогресс хранится по ключу ao_p_<login>_<taskKey>
// ============================================================

const ADMIN_ROLES = ['hr', 'ceo', 'exec_dir', 'ops_dir'];

const Auth = {

  migrate() {
    const users = this.getUsers();
    let changed = false;
    Object.entries(users).forEach(([login, u]) => {
      // Миграция ролей
      if (ADMIN_ROLES.includes(u.role) && u.admin !== true) {
        u.admin = true; changed = true;
      }
      // Миграция прогресса: если ещё есть ключи со старым id-префиксом — переносим на login
      if (u.id) {
        const oldPrefixes = [
          'ao_p_' + String(u.id) + '_',
          'ao_p_id_' + String(u.id).replace(/[^0-9]/g,'').slice(0,13) + '_'
        ];
        const newPrefix = 'ao_p_' + login + '_';
        oldPrefixes.forEach(oldPrefix => {
          if (oldPrefix === newPrefix) return;
          Object.keys(localStorage)
            .filter(k => k.startsWith(oldPrefix))
            .forEach(k => {
              localStorage.setItem(newPrefix + k.slice(oldPrefix.length), localStorage.getItem(k));
              localStorage.removeItem(k);
            });
        });
      }
    });
    if (changed) this.saveUsers(users);
  },

  getUsers()  { return JSON.parse(localStorage.getItem('ao_users')   || '{}'); },
  saveUsers(u){ localStorage.setItem('ao_users', JSON.stringify(u)); _dbSync(); },

  getInvites()   { return JSON.parse(localStorage.getItem('ao_invites') || '{}'); },
  saveInvites(i) { localStorage.setItem('ao_invites', JSON.stringify(i)); _dbSync(); },

  createInvite(role, label) {
    const inv  = this.getInvites();
    const code = 'AO-' + Math.random().toString(36).substr(2,6).toUpperCase();
    inv[code]  = { role: role||'', label: label||'', used: false, createdAt: Date.now() };
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
  clearUsedInvites() {
    if (!this.isAdmin()) return;
    const inv = this.getInvites();
    Object.keys(inv).forEach(code => {
      if (inv[code] && inv[code].used) delete inv[code];
    });
    this.saveInvites(inv);
  },

  current() {
    const login = localStorage.getItem('ao_session');
    if (!login) return null;
    return this.getUsers()[login] || null;
  },
  currentLogin() { return localStorage.getItem('ao_session') || ''; },
  isAdmin() {
    const u = this.current();
    return u && (u.admin === true || ADMIN_ROLES.includes(u.role));
  },

  register(login, pass, fio, inviteCode) {
    if (!login || login.length < 3) return { ok:false, msg:'Логин минимум 3 символа' };
    if (!pass  || pass.length  < 4) return { ok:false, msg:'Пароль минимум 4 символа' };
    if (!fio)                        return { ok:false, msg:'Введите ФИО' };
    const users = this.getUsers();
    if (users[login]) return { ok:false, msg:'Логин уже занят' };
    const invite = this.checkInvite(inviteCode || '');
    if (!invite) return { ok:false, msg:'Неверный или уже использованный код приглашения' };
    const role = invite.role || 'producer';
    users[login] = {
      pass, fio, role,
      admin:     ADMIN_ROLES.includes(role),
      blocked:   false,
      createdAt: Date.now()
    };
    this.saveUsers(users);
    this.useInvite(inviteCode);
    return { ok:true, role };
  },

  bootstrapAdmin(login, pass, fio) {
    const users = this.getUsers();
    if (Object.keys(users).length > 0) return { ok:false, msg:'Система уже инициализирована' };
    if (!login || login.length < 3) return { ok:false, msg:'Логин минимум 3 символа' };
    if (!pass  || pass.length  < 4) return { ok:false, msg:'Пароль минимум 4 символа' };
    if (!fio)                        return { ok:false, msg:'Введите ФИО' };
    users[login] = {
      pass, fio, role: 'hr',
      admin:     true,
      blocked:   false,
      createdAt: Date.now()
    };
    this.saveUsers(users);
    return { ok:true };
  },

  login(login, pass) {
    const users = this.getUsers();
    const user  = users[login];
    if (!user)              return { ok:false, msg:'Пользователь не найден' };
    if (user.pass !== pass) return { ok:false, msg:'Неверный пароль' };
    if (user.blocked)       return { ok:false, msg:'Аккаунт заблокирован. Обратитесь к HR' };
    localStorage.setItem('ao_session', login);
    return { ok:true };
  },
  logout() {
    localStorage.removeItem('ao_session');
    window.location.href = 'login.html';
  },

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
    users[login].role  = newRole;
    users[login].admin = ADMIN_ROLES.includes(newRole);
    this.saveUsers(users);
  },

  setUserRole(targetLogin, newRole) {
    if (!this.isAdmin()) return;
    const users = this.getUsers();
    if (users[targetLogin]) {
      users[targetLogin].role  = newRole;
      users[targetLogin].admin = ADMIN_ROLES.includes(newRole);
    }
    this.saveUsers(users);
  },
  blockUser(t)   { if(!this.isAdmin()) return; const u=this.getUsers(); if(u[t]) u[t].blocked=true;  this.saveUsers(u); },
  unblockUser(t) { if(!this.isAdmin()) return; const u=this.getUsers(); if(u[t]) u[t].blocked=false; this.saveUsers(u); },
  deleteUser(t)  { if(!this.isAdmin()) return; const u=this.getUsers(); delete u[t]; this.saveUsers(u); },
  promoteToAdmin(t) { if(!this.isAdmin()) return; const u=this.getUsers(); if(u[t]) u[t].admin=true; this.saveUsers(u); },

  deleteSelf() {
    const login = this.currentLogin();
    if (!login) return;
    // Удаляем прогресс из localStorage
    const prefix = 'ao_p_' + login + '_';
    Object.keys(localStorage).filter(k => k.startsWith(prefix)).forEach(k => localStorage.removeItem(k));
    const users = this.getUsers();
    delete users[login];
    this.saveUsers(users);
    localStorage.removeItem('ao_session');
    window.location.href = 'login.html';
  },

  resetProgress() {
    const login = this.currentLogin(); if (!login) return;
    const prefix = 'ao_p_' + login + '_';
    Object.keys(localStorage).filter(k => k.startsWith(prefix)).forEach(k => localStorage.removeItem(k));
    _dbSync();
  },

  // Прогресс текущего пользователя: ao_p_<login>_<key>
  getCheck(key) {
    const login = this.currentLogin(); if (!login) return false;
    return localStorage.getItem('ao_p_' + login + '_' + key) === '1';
  },
  setCheck(key, val) {
    const login = this.currentLogin(); if (!login) return;
    localStorage.setItem('ao_p_' + login + '_' + key, val ? '1' : '0');
    _dbSync();
  },

  // Прогресс по любому логину (для HR-дашборда)
  // userLogin — это логин сотрудника, не id
  getCheckForUser(userLogin, key) {
    return localStorage.getItem('ao_p_' + userLogin + '_' + key) === '1';
  },

  requireAuth() {
    if (!this.current()) { window.location.href = 'login.html'; return false; }
    return true;
  }
};

function _dbSync() {
  if (typeof DB !== 'undefined' && DB.sync) DB.sync();
}

Auth.migrate();
