// db.js — JSONBin bridge v3
const DB = (() => {
  const BIN_ID  = '6a07317badc21f119aa526dd';
  const API_KEY = '$2a$10$ztuK5lj5tKStjmGmDj8Pe.n.zb.iPHEiLM4Y6Zc6D.RbMWAejc.hC';
  const URL     = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

  let _syncing = false;
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
    if (!progress || typeof progress !== 'object') return;
    Object.keys(progress).forEach(k => {
      if (k.startsWith('ao_p_')) localStorage.setItem(k, progress[k]);
    });
  }

  const cloudFetch = fetch(URL, {
    headers: { 'X-Master-Key': API_KEY, 'X-Bin-Meta': 'false' }
  })
  .then(r => r.ok ? r.json() : null)
  .then(cloud => {
    if (cloud && cloud.users && Object.keys(cloud.users).length > 0) {
      localStorage.setItem('ao_users',   JSON.stringify(cloud.users));
      localStorage.setItem('ao_invites', JSON.stringify(cloud.invites || '{}'));
      restoreProgress(cloud.progress);
    }
  })
  .catch(() => {});

  const timeout = new Promise(resolve => setTimeout(resolve, 3000));
  const ready = Promise.race([cloudFetch, timeout]);

  // sync() — для фоновых сохранений (debounce 2с)
  function sync() {
    if (_syncTimer) clearTimeout(_syncTimer);
    _syncTimer = setTimeout(_doSync, 2000);
  }

  // syncNow() — немедленный синк, возвращает Promise — для использования перед редиректом
  function syncNow() {
    if (_syncTimer) { clearTimeout(_syncTimer); _syncTimer = null; }
    return fetch(URL, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': API_KEY },
      body: JSON.stringify({
        users:    JSON.parse(localStorage.getItem('ao_users')   || '{}'),
        invites:  JSON.parse(localStorage.getItem('ao_invites') || '{}'),
        progress: collectProgress()
      })
    }).catch(() => {});
  }

  function _doSync() {
    if (_syncing) { _syncTimer = setTimeout(_doSync, 1000); return; }
    _syncing = true;
    fetch(URL, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': API_KEY },
      body: JSON.stringify({
        users:    JSON.parse(localStorage.getItem('ao_users')   || '{}'),
        invites:  JSON.parse(localStorage.getItem('ao_invites') || '{}'),
        progress: collectProgress()
      })
    })
    .catch(() => {})
    .finally(() => { _syncing = false; });
  }

  return { ready, sync, syncNow };
})();
