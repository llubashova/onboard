// ============================================================
// db.js — оболочка JSONBin для межбраузерного хранения
// Данные хранятся в JSONBin.io (бесплатный тариф)
// При каждом init() — синхронизируем localStorage с облаком
// Запись — при каждом изменении пользователей/инвайтов
// ============================================================

const DB = (() => {
  // ❗ Замените эти два значения на свои после регистрации на jsonbin.io
  const BIN_ID  = 'REPLACE_BIN_ID';
  const API_KEY = 'REPLACE_API_KEY';
  const URL     = `https://api.jsonbin.io/v3/b/${BIN_ID}`;

  let _syncing = false;

  async function fetchCloud() {
    try {
      const r = await fetch(URL, {
        headers: { 'X-Master-Key': API_KEY, 'X-Bin-Meta': 'false' }
      });
      if (!r.ok) return null;
      return await r.json();
    } catch { return null; }
  }

  async function pushCloud(data) {
    if (_syncing) return;
    _syncing = true;
    try {
      await fetch(URL, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Master-Key': API_KEY },
        body:    JSON.stringify(data)
      });
    } finally { _syncing = false; }
  }

  // Синхронизация: облако → localStorage
  async function init() {
    const cloud = await fetchCloud();
    if (cloud && cloud.users) {
      localStorage.setItem('ao_users',   JSON.stringify(cloud.users));
      localStorage.setItem('ao_invites', JSON.stringify(cloud.invites || {}));
    }
  }

  // Вызывать после любого изменения пользователей/инвайтов
  function sync() {
    const data = {
      users:   JSON.parse(localStorage.getItem('ao_users')   || '{}'),
      invites: JSON.parse(localStorage.getItem('ao_invites') || '{}')
    };
    pushCloud(data);
  }

  return { init, sync };
})();
