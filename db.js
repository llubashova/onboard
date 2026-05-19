// db.js — JSONBin bridge v6
// v6: квизы (quizzes) и ноты сотрудников (notes) перенесены в основной bin
// Теперь всё загружается одним запросом в режиме ready
const DB = (() => {
  const BIN_ID  = '6a07317badc21f119aa526dd';
  const API_KEY = '$2a$10$ztuK5lj5tKStjmGmDj8Pe.n.zb.iPHEiLM4Y6Zc6D.RbMWAejc.hC';
  const URL     = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

  let _syncing   = false;
  let _syncTimer = null;

  function collectProgress() {
    const progress = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('ao_p_')) progress[k] = localStorage.getItem(k);
    }
    return progress;
  }

  function restoreProgress(progress) {
    const keysToDelete = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('ao_p_')) keysToDelete.push(k);
    }
    keysToDelete.forEach(k => localStorage.removeItem(k));
    if (!progress || typeof progress !== 'object') return;
    Object.keys(progress).forEach(k => {
      if (k.startsWith('ao_p_')) localStorage.setItem(k, progress[k]);
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
    headers: { 'X-Master-Key': API_KEY, 'X-Bin-Meta': 'false' }
  })
  .then(r => r.ok ? r.json() : null)
  .then(cloud => {
    if (!cloud) return;
    if (cloud.users && Object.keys(cloud.users).length > 0) {
      localStorage.setItem('ao_users',   JSON.stringify(normalizeUsers(cloud.users)));
      localStorage.setItem('ao_invites', JSON.stringify(cloud.invites || {}));
      restoreProgress(cloud.progress || {});
    }
    // Квизы — храним в localStorage для мгновенного доступа
    if (Array.isArray(cloud.quizzes)) {
      localStorage.setItem('ao_quizzes', JSON.stringify(cloud.quizzes));
    }
    // Ноты сотрудников (notes + checklist)
    if (cloud.notes && typeof cloud.notes === 'object') {
      localStorage.setItem('ao_notes', JSON.stringify(cloud.notes));
    }
  })
  .catch(() => {});

  const timeout = new Promise(resolve => setTimeout(resolve, 4000));
  const ready   = Promise.race([cloudFetch, timeout]);

  function _buildPayload() {
    return {
      users:    JSON.parse(localStorage.getItem('ao_users')   || '{}'),
      invites:  JSON.parse(localStorage.getItem('ao_invites') || '{}'),
      progress: collectProgress(),
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
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': API_KEY },
      body:    JSON.stringify(_buildPayload())
    }).catch(() => {});
  }

  function _doSync() {
    if (_syncing) { _syncTimer = setTimeout(_doSync, 1000); return; }
    _syncing = true;
    fetch(URL, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': API_KEY },
      body:    JSON.stringify(_buildPayload())
    })
    .catch(() => {})
    .finally(() => { _syncing = false; });
  }

  // ── Публичное API ───────────────────────────────────

  // Квизы
  function getQuizzes() {
    return JSON.parse(localStorage.getItem('ao_quizzes') || '[]');
  }
  function saveQuizzes(arr) {
    localStorage.setItem('ao_quizzes', JSON.stringify(arr));
    sync();
  }

  // Ноты: { [login]: { text: string, checklist: [{id, text, done}], mode: string } }
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
