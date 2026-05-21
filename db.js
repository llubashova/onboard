// db.js — JSONBin bridge v13
// v13: Скрываем loadingScreen внутри ready.then — независимо от остальных скриптов
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

  function restoreProgress(cloudProgress, cloudUsers) {
    if (!cloudProgress || typeof cloudProgress !== 'object') return;
    const resetMap = {};
    if (cloudUsers && typeof cloudUsers === 'object') {
      Object.entries(cloudUsers).forEach(([login, u]) => {
        if (u && u.progressResetAt) resetMap[login.toLowerCase()] = u.progressResetAt;
      });
    }
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
    Object.keys(cloudProgress).forEach(k => {
      if (!k.startsWith('ao_p_')) return;
      const login = _loginFromKey(k);
      if (login && resetMap[login]) return;
      const cloudVal = cloudProgress[k];
      const localVal = localStorage.getItem(k);
      if (cloudVal === '1' && localVal !== '1') localStorage.setItem(k, cloudVal);
      else if (cloudVal !== '1') localStorage.setItem(k, cloudVal);
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

  // Функция скрытия loadingScreen — вызывается изнутри DB
  function _hideLoader() {
    try {
      var el = document.getElementById('loadingScreen');
      if (el) el.style.display = 'none';
    } catch(e) {}
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

  // Таймаут 1500мс
  const timeout = new Promise(resolve => setTimeout(resolve, 1500));

  // ready: как только один из двух завершился — сразу скрываем лоадер
  const ready = Promise.race([cloudFetch, timeout]).then(function() {
    _hideLoader();
  });

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

  return { ready, sync, syncNow, getQuizzes, saveQuizzes, getNotes, getNotesFor, saveNotesFor };
})();
