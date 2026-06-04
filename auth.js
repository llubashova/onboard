// ============================================================
// auth.js — модуль авторизации Auditorium Onboard v10
// v10: setCheck / setCheckForUser переведены на _dbSyncNow()
//      вместо _dbSync() (debounced).
//      Исправляет баг: прогресс не сохранялся при быстром
//      переходе между страницами — debounced sync не успевал
//      улететь до перезагрузки, и cloudFetch восстанавливал
//      старый снимок из облака.
//      Также исправлен String(val) → '0' в setCheckForUser.
// ============================================================

const ADMIN_ROLES = ['hr', 'ceo', 'exec_dir', 'ops_dir'];

const Auth = {

  migrate() {
    const users = this.getUsers();
    let changed = false;
    Object.entries(users).forEach(([login, u]) => {
      if (ADMIN_ROLES.includes(u.role) && u.admin !== true) {
        u.admin = true; changed = true;
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
    Object.keys(inv).forEach(code => { if (inv[code] && inv[code].used) delete inv[code]; });
    localStorage.setItem('ao_invites', JSON.stringify(inv));
    _dbSyncNow();
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
    login = (login || '').trim().toLowerCase();
    if (login.length < 3)           return { ok:false, msg:'Логин минимум 3 символа' };
    if (!pass || pass.length  < 4)  return { ok:false, msg:'Пароль минимум 4 символа' };
    if (!fio)                        return { ok:false, msg:'Введите ФИО' };
    const users = this.getUsers();
    if (users[login]) return { ok:false, msg:'Логин уже занят' };
    const invite = this.checkInvite(inviteCode || '');
    if (!invite) return { ok:false, msg:'Неверный или уже использованный код приглашения' };
    const role = invite.role || 'producer';
    users[login] = { pass, fio, role, admin: ADMIN_ROLES.includes(role), blocked: false, createdAt: Date.now() };
    this.saveUsers(users);
    this.useInvite(inviteCode);
    return { ok:true, role, login };
  },

  bootstrapAdmin(login, pass, fio) {
    login = (login || '').trim().toLowerCase();
    const users = this.getUsers();
    if (Object.keys(users).length > 0) return { ok:false, msg:'Система уже инициализирована' };
    if (login.length < 3)          return { ok:false, msg:'Логин минимум 3 символа' };
    if (!pass || pass.length < 4)  return { ok:false, msg:'Пароль минимум 4 символа' };
    if (!fio)                       return { ok:false, msg:'Введите ФИО' };
    users[login] = { pass, fio, role: 'hr', admin: true, blocked: false, createdAt: Date.now() };
    this.saveUsers(users);
    return { ok:true, login };
  },

  login(login, pass) {
    login = (login || '').trim().toLowerCase();
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
  blockUser(t)      { if(!this.isAdmin()) return; const u=this.getUsers(); if(u[t]) u[t].blocked=true;  localStorage.setItem('ao_users',JSON.stringify(u)); _dbSyncNow(); },
  unblockUser(t)    { if(!this.isAdmin()) return; const u=this.getUsers(); if(u[t]) u[t].blocked=false; localStorage.setItem('ao_users',JSON.stringify(u)); _dbSyncNow(); },
  deleteUser(t)     { if(!this.isAdmin()) return; const u=this.getUsers(); delete u[t]; localStorage.setItem('ao_users',JSON.stringify(u)); _dbSyncNow(); },
  promoteToAdmin(t) { if(!this.isAdmin()) return; const u=this.getUsers(); if(u[t]) u[t].admin=true; localStorage.setItem('ao_users',JSON.stringify(u)); _dbSyncNow(); },

  deleteSelf() {
    const login = this.currentLogin(); if (!login) return;
    const prefix = 'ao_p_' + login + '_';
    Object.keys(localStorage).filter(k => k.startsWith(prefix)).forEach(k => localStorage.removeItem(k));
    const users = this.getUsers();
    delete users[login];
    this.saveUsers(users);
    if (typeof DB !== 'undefined' && DB.syncNow) DB.syncNow();
    localStorage.removeItem('ao_session');
    window.location.href = 'login.html';
  },

  resetProgress() {
    const login = this.currentLogin(); if (!login) return;
    const prefix = 'ao_p_' + login + '_';
    Object.keys(localStorage).filter(k => k.startsWith(prefix)).forEach(k => localStorage.removeItem(k));
    const users = this.getUsers();
    if (users[login]) {
      users[login].badges = {};
      users[login].progressResetAt = Date.now();
      this.saveUsers(users);
    }
    localStorage.removeItem('ao_welcomed_' + login);
    if (typeof DB !== 'undefined' && DB.syncNow) {
      DB.syncNow();
    } else {
      _dbSync();
    }
  },

  resetProgressForUser(targetLogin) {
    if (!this.isAdmin()) return;
    const prefix = 'ao_p_' + targetLogin + '_';
    Object.keys(localStorage).filter(k => k.startsWith(prefix)).forEach(k => localStorage.removeItem(k));
    const users = this.getUsers();
    if (users[targetLogin]) {
      users[targetLogin].badges = {};
      users[targetLogin].progressResetAt = Date.now();
      this.saveUsers(users);
    }
    if (typeof DB !== 'undefined' && DB.syncNow) {
      DB.syncNow();
    } else {
      _dbSync();
    }
  },

  getCheck(key) {
    const login = this.currentLogin(); if (!login) return false;
    return localStorage.getItem('ao_p_' + login + '_' + key) === '1';
  },
  // FIX v10: заменён _dbSync() на _dbSyncNow() — прогресс теперь немедленно
  // отправляется в облако при каждой отметке задания.
  // Старый debounced sync (2 сек) терял данные при быстрой навигации между страницами.
  setCheck(key, val) {
    const login = this.currentLogin(); if (!login) return;
    localStorage.setItem('ao_p_' + login + '_' + key, val ? '1' : '0');
    _dbSyncNow();
  },
  getCheckForUser(userLogin, key) {
    return localStorage.getItem('ao_p_' + userLogin + '_' + key) === '1';
  },
  // FIX v10: аналогично setCheck — syncNow вместо sync.
  // Также исправлен String(val) → '0': String(false) давал "false",
  // что не распознавалось как сброс в restoreProgress (ожидает строго '1' или не-'1').
  setCheckForUser(userLogin, key, val) {
    if (!userLogin) return;
    localStorage.setItem('ao_p_' + userLogin + '_' + key, val ? '1' : '0');
    _dbSyncNow();
  },

  requireAuth() {
    if (!this.current()) { window.location.href = 'login.html'; return false; }
    return true;
  }
};

function _dbSync() {
  if (typeof DB !== 'undefined' && DB.sync) DB.sync();
}

// Функция немедленной синхронизации — для критических операций
function _dbSyncNow() {
  if (typeof DB !== 'undefined' && DB.syncNow) DB.syncNow();
}

Auth.migrate();
