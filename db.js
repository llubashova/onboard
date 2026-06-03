// db.js — JSONBin bridge v14
// v14: fix restoreProgress merge (don't overwrite '1' with '0'),
//      expose cloudFetch promise so pages can re-render after it resolves,
//      add syncNow usage guidance

const DB = (() => {
  const BIN_ID  = '6a07317badc21f119aa526dd';
  const API_KEY = '$2a$10$ztuK5lj5tKStjmGmDj8Pe.n.zb.iPHEiLM4Y6Zc6D.RbMWAejc.hC';
  const URL     = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

  let _syncing   = false;
  let _syncTimer = null;

  const ROLE_PREFIXES = ['producer_', 'sales_', 'marketing_'];

  function _loginFromKey(key) {
    if (!key.startsWith('ao_p_')) return null;
    const body = key.slice(5);
    for (const prefix of ROLE_PREFIXES) {
      const idx = body.indexOf('_' + prefix);
      if (idx !== -1) return body.slice(0, idx).toLowerCase();
    }
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

  // BUG FIX: старая версия писала cloudVal даже если он "0", затирая локальное "1".
  // Новая логика: облако может только ДОБАВИТЬ "1", но не убрать прогресс.
  // Исключение — если у пользователя стоит progressResetAt (сброс через HR).
  function restoreProgress(cloudProgress, cloudUsers) {
    if (!cloudProgress || typeof cloudProgress !== 'object') return;
    const resetMap = {};
    if (cloudUsers && typeof cloudUsers === 'object') {
      Object.entries(cloudUsers).forEach(([login, u]) => {
        if (u && u.progressResetAt) resetMap[login.toLowerCase()] = u.progressResetAt;
      });
    }
    // Сначала удаляем локальный прогресс пользователей со сбросом
    if (Object.keys(resetMap).length > 0) {
      const keysToDelete = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith('ao_p_')) continue;
        const login = _loginFromKey(k);
        if (login && resetMap[login]) keysToDelete.push(k);
      }
      keysToDelete.forEach(k => localStorage.removeItem(k));
    }
    // Применяем данные из облака: пишем ТОЛЬКО "1", никогда не затираем локальное "1" нулём
    Object.keys(cloudProgress).forEach(k => {
      if (!k.startsWith('ao_p_')) return;
      const login = _loginFromKey(k);
      if (login && resetMap[login]) return; // пользователь сбросил прогресс — не восстанавливаем
      const cloudVal = cloudProgress[k];
      if (cloudVal === '1') {
        // Облако говорит "выполнено" — ставим 1 в любом случае
        localStorage.setItem(k, '1');
      }
      // Если cloudVal !== '1' — НЕ трогаем локальное значение.
      // Это предотвращает затирание локального "1" облачным "0".
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

  function _hideLoader() {
    try {
      var el = document.getElementById('loadingScreen');
      if (el) el.style.display = 'none';
    } catch(e) {}
  }

  // BUG FIX: сохраняем cloudFetch отдельно, чтобы страницы могли подписаться на него
  // и перерисовать UI после того как данные из облака реально загрузились.
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

  // Таймаут 1500мс
  const timeout = new Promise(resolve => setTimeout(resolve, 1500));

  // ready: первый из двух — скрываем лоадер
  const ready = Promise.race([cloudFetch, timeout]).then(function() {
    _hideLoader();
  });

  // afterCloud: резолвится когда облако реально ответило (или упало).
  // Используется страницами для повторного рендера после получения актуальных данных.
  const afterCloud = cloudFetch;

  function _buildPayload() {
    const users = JSON.parse(localStorage.getItem('ao_users') || '{}');
    const rawProgress = collectProgress();
    const progress = {};
    Object.entries(rawProgress).forEach(([k, v]) => {
      const login = _loginFromKey(k);
      const u = login ? users[login] : null;
      if (u && u.progressResetAt) return;
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

  function getQuizzes() { return JSON.parse(localStorage.getItem('ao_quizzes') || '[]'); }
  function saveQuizzes(arr) { localStorage.setItem('ao_quizzes', JSON.stringify(arr)); sync(); }

  function getNotes() { return JSON.parse(localStorage.getItem('ao_notes') || '{}'); }
  function getNotesFor(login) { return getNotes()[login] || { text: '', checklist: [], mode: 'standard' }; }
  function saveNotesFor(login, data) {
    const notes = getNotes();
    notes[login] = data;
    localStorage.setItem('ao_notes', JSON.stringify(notes));
    sync();
  }

  return { ready, afterCloud, sync, syncNow, getQuizzes, saveQuizzes, getNotes, getNotesFor, saveNotesFor };
})();
