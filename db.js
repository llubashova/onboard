// db.js — JSONBin bridge, полностью неблокирующий
const DB = (() => {
  const BIN_ID  = '6a07317badc21f119aa526dd';
  const API_KEY = '$2a$10$ztuK5lj5tKStjmGmDj8Pe.n.zb.iPHEiLM4Y6Zc6D.RbMWAejc.hC';
  const URL     = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
  let _syncing  = false;

  function fetchWithTimeout(url, options, ms) {
    const ctrl  = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), ms);
    return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(timer));
  }

  // Тихая фоновая синхронизация — ничего не блокирует
  function bgSync() {
    fetchWithTimeout(URL, {
      headers: { 'X-Master-Key': API_KEY, 'X-Bin-Meta': 'false' }
    }, 5000)
    .then(r => r.ok ? r.json() : null)
    .then(cloud => {
      if (cloud && cloud.users && Object.keys(cloud.users).length > 0) {
        localStorage.setItem('ao_users',   JSON.stringify(cloud.users));
        localStorage.setItem('ao_invites', JSON.stringify(cloud.invites || '{}'));
      }
    })
    .catch(() => {});
  }

  function sync() {
    if (_syncing) return;
    _syncing = true;
    fetchWithTimeout(URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': API_KEY },
      body: JSON.stringify({
        users:   JSON.parse(localStorage.getItem('ao_users')   || '{}'),
        invites: JSON.parse(localStorage.getItem('ao_invites') || '{}')
      })
    }, 6000).catch(() => {}).finally(() => { _syncing = false; });
  }

  // Запускаем фоновую загрузку сразу при подключении скрипта
  bgSync();

  return { sync, bgSync };
})();
