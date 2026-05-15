// ============================================================
// db.js — JSONBin bridge with 2s timeout + localStorage fallback
// ============================================================
const DB = (() => {
  const BIN_ID  = '6a07317badc21f119aa526dd';
  const API_KEY = '$2a$10$ztuK5lj5tKStjmGmDj8Pe.n.zb.iPHEiLM4Y6Zc6D.RbMWAejc.hC';
  const URL     = `https://api.jsonbin.io/v3/b/${BIN_ID}`;
  const TIMEOUT = 2000;

  let _syncing = false;

  function fetchWithTimeout(url, options, ms) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), ms);
    return fetch(url, { ...options, signal: controller.signal })
      .finally(() => clearTimeout(timer));
  }

  async function fetchCloud() {
    try {
      const r = await fetchWithTimeout(URL, {
        headers: { 'X-Master-Key': API_KEY, 'X-Bin-Meta': 'false' }
      }, TIMEOUT);
      if (!r.ok) return null;
      return await r.json();
    } catch { return null; }
  }

  async function pushCloud(data) {
    if (_syncing) return;
    _syncing = true;
    try {
      await fetchWithTimeout(URL, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Master-Key': API_KEY },
        body:    JSON.stringify(data)
      }, 5000);
    } catch { /* тихо игнорируем — данные есть в localStorage */ }
    finally { _syncing = false; }
  }

  async function init() {
    const cloud = await fetchCloud();
    if (cloud && cloud.users && Object.keys(cloud.users).length > 0) {
      localStorage.setItem('ao_users',   JSON.stringify(cloud.users));
      localStorage.setItem('ao_invites', JSON.stringify(cloud.invites || {}));
    }
  }

  function sync() {
    pushCloud({
      users:   JSON.parse(localStorage.getItem('ao_users')   || '{}'),
      invites: JSON.parse(localStorage.getItem('ao_invites') || '{}')
    });
  }

  return { init, sync };
})();
