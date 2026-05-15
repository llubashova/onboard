// db.js — JSONBin bridge, background sync (no blocking)
const DB = (() => {
  const BIN_ID  = '6a07317badc21f119aa526dd';
  const API_KEY = '$2a$10$ztuK5lj5tKStjmGmDj8Pe.n.zb.iPHEiLM4Y6Zc6D.RbMWAejc.hC';
  const URL     = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

  let _syncing = false;

  function fetchWithTimeout(url, options, ms) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return fetch(url, { ...options, signal: controller.signal })
      .finally(() => clearTimeout(timer));
  }

  // Тахая фоновая синхронизация — не блокирует страницу
  function init() {
    fetchWithTimeout(URL, {
      headers: { 'X-Master-Key': API_KEY, 'X-Bin-Meta': 'false' }
    }, 4000)
    .then(r => r.ok ? r.json() : null)
    .then(cloud => {
      if (cloud && cloud.users && Object.keys(cloud.users).length > 0) {
        localStorage.setItem('ao_users',   JSON.stringify(cloud.users));
        localStorage.setItem('ao_invites', JSON.stringify(cloud.invites || '{}'));
      }
    })
    .catch(() => {}); // если оффлайн — идём из localStorage
  }

  function sync() {
    if (_syncing) return;
    _syncing = true;
    fetchWithTimeout(URL, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': API_KEY },
      body: JSON.stringify({
        users:   JSON.parse(localStorage.getItem('ao_users')   || '{}'),
        invites: JSON.parse(localStorage.getItem('ao_invites') || '{}')
      })
    }, 5000)
    .catch(() => {})
    .finally(() => { _syncing = false; });
  }

  return { init, sync };
})();

// Запускаем фоновую синхронизацию сразу при загрузке скрипта
DB.init();
