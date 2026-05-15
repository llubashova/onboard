// db.js — JSONBin bridge
// DB.ready — всегда резолвится: либо данные из облака, либо через 3 секунды
const DB = (() => {
  const BIN_ID  = '6a07317badc21f119aa526dd';
  const API_KEY = '$2a$10$ztuK5lj5tKStjmGmDj8Pe.n.zb.iPHEiLM4Y6Zc6D.RbMWAejc.hC';
  const URL     = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

  let _syncing = false;

  // Собрать весь прогресс из localStorage в объект { "ao_p_<id>_<key>": "1" }
  function collectProgress() {
    const progress = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('ao_p_')) {
        progress[k] = localStorage.getItem(k);
      }
    }
    return progress;
  }

  // Восстановить прогресс из облака в localStorage
  function restoreProgress(progress) {
    if (!progress || typeof progress !== 'object') return;
    Object.keys(progress).forEach(k => {
      if (k.startsWith('ao_p_')) {
        localStorage.setItem(k, progress[k]);
      }
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

  // Гарантированный таймаут 3 секунды
  const timeout = new Promise(resolve => setTimeout(resolve, 3000));

  // ready всегда резолвится — нет бесконечной загрузки
  const ready = Promise.race([cloudFetch, timeout]);

  function sync() {
    if (_syncing) return;
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

  return { ready, sync };
})();
