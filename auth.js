// ============================================================
// auth.js — модуль авторизации Auditorium Onboard
// Хранит всех пользователей в localStorage.ao_users (JSON)
// Текущий сессионный пользователь — localStorage.ao_session
// ============================================================

const Auth = {

  // Получить всех пользователей (объект {login: {pass, fio, role, id}})
  getUsers() {
    return JSON.parse(localStorage.getItem('ao_users') || '{}');
  },

  // Сохранить всех пользователей
  saveUsers(users) {
    localStorage.setItem('ao_users', JSON.stringify(users));
  },

  // Текущий пользователь (объект или null)
  current() {
    const login = localStorage.getItem('ao_session');
    if (!login) return null;
    const users = this.getUsers();
    return users[login] || null;
  },

  // Логин пользователя
  currentLogin() {
    return localStorage.getItem('ao_session');
  },

  // Зарегистрировать нового пользователя
  register(login, pass, fio, role) {
    const users = this.getUsers();
    if (users[login]) return { ok: false, msg: 'Логин уже занят' };
    if (!login || login.length < 3) return { ok: false, msg: 'Логин минимум 3 символа' };
    if (!pass || pass.length < 4) return { ok: false, msg: 'Пароль минимум 4 символа' };
    if (!fio) return { ok: false, msg: 'Введите ФИО' };
    if (!role) return { ok: false, msg: 'Выберите роль' };
    // id = timestamp — уникальный идентификатор для изоляции прогресса
    users[login] = { pass, fio, role, id: Date.now().toString() };
    this.saveUsers(users);
    return { ok: true };
  },

  // Войти
  login(login, pass) {
    const users = this.getUsers();
    const user = users[login];
    if (!user) return { ok: false, msg: 'Пользователь не найден' };
    if (user.pass !== pass) return { ok: false, msg: 'Неверный пароль' };
    localStorage.setItem('ao_session', login);
    return { ok: true };
  },

  // Выйти
  logout() {
    localStorage.removeItem('ao_session');
    window.location.href = 'login.html';
  },

  // Обновить данные пользователя
  update(newFio, newPass) {
    const login = this.currentLogin();
    if (!login) return;
    const users = this.getUsers();
    if (newFio) users[login].fio = newFio;
    if (newPass && newPass.length >= 4) users[login].pass = newPass;
    this.saveUsers(users);
  },

  // Сбросить прогресс текущего пользователя
  resetProgress() {
    const user = this.current();
    if (!user) return;
    // Удаляем все ключи вида ao_p_{userId}_*
    Object.keys(localStorage)
      .filter(k => k.startsWith('ao_p_' + user.id + '_'))
      .forEach(k => localStorage.removeItem(k));
  },

  // Прочитать состояние чекбокса для текущего пользователя
  getCheck(key) {
    const user = this.current();
    if (!user) return false;
    return localStorage.getItem('ao_p_' + user.id + '_' + key) === '1';
  },

  // Записать состояние чекбокса
  setCheck(key, val) {
    const user = this.current();
    if (!user) return;
    localStorage.setItem('ao_p_' + user.id + '_' + key, val ? '1' : '0');
  },

  // Проверить авторизацию и редиректнуть если нет сессии
  requireAuth() {
    if (!this.current()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }
};
