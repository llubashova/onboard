// db.js — JSONBin bridge v10
// v10: правильный парсинг логина из ao_p_* (логин может содержать '_')
//      при сбросе прогресса — явно удаляем ao_p_* ключи из облака
const DB = (() => {
  const BIN_ID  = '6a07317badc21f119aa526dd';
  const API_KEY = '$2a$10$ztuK5lj5tKStjmGmDj8Pe.n.zb.iPHEiLM4Y6Zc6D.RbMWAejc.hC';
  const URL     = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

  let _syncing   = false;
  let _syncTimer = null;

  // Известные префиксы ролей — по ним определяем где заканчивается логин в ключе
  const ROLE_PREFIXES = ['producer_', 'sales_', 'marketing_'];

  // Извлекаем логин из ключа вида ao_p_<login>_<role>_...
  // Логин может содержать '_', поэтому ищем первое вхождение известного префикса роли
  function _loginFromKey(key) {
    if (!key.startsWith('ao_p_')) return null;
    const body = key.slice(5); // убираем 'ao_p_'
    for (const prefix of ROLE_PREFIXES) {
      const idx = body.indexOf('_' + prefix);
      if (idx !== -1) return body.slice(0, idx).toLowerCase();
    }
    // Фоллбэк — берём первый сегмент (для простых логинов без '_')
    return body.split('_')[0].toLowerCase();
  }

  function collectProgress() {
    const progress = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('ao_p_')) progress[k] = localStorage.getItem(k);
    }
    return progress;
  }

  // v10: при merge облака уважаем progressResetAt
  // Используем _loginFromKey для надёжного парсинга логина
  function restoreProgress(cloudProgress, cloudUsers) {
    if (!cloudProgress || typeof cloudProgress !== 'object') return;

    const resetMap = {};
    if (cloudUsers && typeof cloudUsers === 'object') {
      Object.entries(cloudUsers).forEach(([login, u]) => {
        if (u && u.progressResetAt) resetMap[login.toLowerCase()] = u.progressResetAt;
      });
    }

    Object.keys(cloudProgress).forEach(k => {
      if (!k.startsWith('ao_p_')) return;
      const cloudVal = cloudProgress[k];
      const login = _loginFromKey(k);

      // Если есть метка сброса — пропускаем восстановление
      if (login && resetMap[login]) return;

      const localVal = localStorage.getItem(k);
      if (cloudVal === '1' && localVal !== '1') {
        localStorage.setItem(k, cloudVal);
      } else if (cloudVal !== '1') {
        localStorage.setItem(k, cloudVal);
      }
    });
  }

  function normalizeUsers(users) {
    if (!users || typeof users !== 'object') return {};
    const normalized = {};
    Object.entries(users).forEach(([login, u]) => {
      normalized[login.toLowerCase()] = u;
    });
    return normalized;
  }

  const cloudFetch = fetch(URL, {
    cache: 'no-cache',
    headers: { 'X-Master-Key': API_KEY, 'X-Bin-Meta': 'false' }
  })
  .then(r => r.ok ? r.json() : null)
  .then(cloud => {
    if (!cloud) return;
    if (cloud.users && Object.keys(cloud.users).length > 0) {
      const normalizedUsers = normalizeUsers(cloud.users);
      localStorage.setItem('ao_users',   JSON.stringify(normalizedUsers));
      localStorage.setItem('ao_invites', JSON.stringify(cloud.invites || {}));
      restoreProgress(cloud.progress || {}, normalizedUsers);
    }
    if (Array.isArray(cloud.quizzes)) {
      localStorage.setItem('ao_quizzes', JSON.stringify(cloud.quizzes));
    }
    if (cloud.notes && typeof cloud.notes === 'object') {
      localStorage.setItem('ao_notes', JSON.stringify(cloud.notes));
    }
  })
  .catch(() => {});

  const timeout = new Promise(resolve => setTimeout(resolve, 4000));
  const ready   = Promise.race([cloudFetch, timeout]);

  function _buildPayload() {
    const users = JSON.parse(localStorage.getItem('ao_users') || '{}');
    const rawProgress = collectProgress();

    // v10: при сборке payload удаляем ao_p_* ключи сброшенных пользователей
    // Если у пользователя стоит progressResetAt — его прогресс в облаке должен быть пустым
    const progress = {};
    Object.entries(rawProgress).forEach(([k, v]) => {
      const login = _loginFromKey(k);
      const u = login ? users[login] : null;
      if (u && u.progressResetAt) return; // не включаем в payload
      progress[k] = v;
    });

    return {
      users,
      invites:  JSON.parse(localStorage.getItem('ao_invites') || '{}'),
      progress,
      quizzes:  JSON.parse(localStorage.getItem('ao_quizzes') || '[]'),
      notes:    JSON.parse(localStorage.getItem('ao_notes')   || '{}')
    };
  }

  function sync() {
    if (_syncTimer) clearTimeout(_syncTimer);
    _syncTimer = setTimeout(_doSync, 2000);
  }

  function syncNow() {
    if (_syncTimer) { clearTimeout(_syncTimer); _syncTimer = null; }
    return fetch(URL, {
      method:  'PUT',
      cache:   'no-cache',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': API_KEY },
      body:    JSON.stringify(_buildPayload())
    }).catch(() => {});
  }

  function _doSync() {
    if (_syncing) { _syncTimer = setTimeout(_doSync, 1000); return; }
    _syncing = true;
    fetch(URL, {
      method:  'PUT',
      cache:   'no-cache',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': API_KEY },
      body:    JSON.stringify(_buildPayload())
    })
    .catch(() => {})
    .finally(() => { _syncing = false; });
  }

  function getQuizzes() {
    return JSON.parse(localStorage.getItem('ao_quizzes') || '[]');
  }
  function saveQuizzes(arr) {
    localStorage.setItem('ao_quizzes', JSON.stringify(arr));
    sync();
  }

  function getNotes() {
    return JSON.parse(localStorage.getItem('ao_notes') || '{}');
  }
  function getNotesFor(login) {
    return getNotes()[login] || { text: '', checklist: [], mode: 'standard' };
  }
  function saveNotesFor(login, data) {
    const notes = getNotes();
    notes[login] = data;
    localStorage.setItem('ao_notes', JSON.stringify(notes));
    sync();
  }

  return { ready, sync, syncNow, getQuizzes, saveQuizzes, getNotes, getNotesFor, saveNotesFor };
})();
