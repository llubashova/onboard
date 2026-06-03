/* ============================================================
   game.js — игровые механики Auditorium Onboard
   конфетти · +XP попап · бейджи · level-up экран · welcome
   streak (🔥 серия дней, Duolingo-style) · XP-счётчик анимация
   ============================================================ */

// ── КОНФЕТТИ ─────────────────────────────────────────────────
const Confetti = (() => {
  const COLORS = ['#1a7fd4','#27ae60','#f39c12','#e74c3c','#9b59b6','#00cec9'];
  let canvas, ctx, particles = [], raf;

  function init() {
    if (canvas) return;
    canvas = document.createElement('canvas');
    canvas.id = 'confetti-canvas';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
  }

  function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function burst(x, y, count = 40) {
    init();
    for (let i = 0; i < count; i++) {
      particles.push({
        x: x || canvas.width / 2,
        y: y || canvas.height / 3,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() * -8 - 2),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: Math.random() * 8 + 4,
        rot: Math.random() * 360,
        rotV: (Math.random() - 0.5) * 8,
        life: 1,
        decay: Math.random() * 0.015 + 0.008
      });
    }
    if (!raf) loop();
  }

  function loop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy; p.vy += 0.3;
      p.rot += p.rotV; p.life -= p.decay;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot * Math.PI / 180);
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
      ctx.restore();
    });
    particles = particles.filter(p => p.life > 0);
    raf = particles.length ? requestAnimationFrame(loop) : null;
  }

  return { burst };
})();


// ── +XP ПОПАП ────────────────────────────────────────────────
function showXpPopup(pts, x, y) {
  const el = document.createElement('div');
  el.className = 'xp-popup';
  el.textContent = '+' + pts + ' XP';
  el.style.cssText = `left:${(x||window.innerWidth/2)-30}px;top:${(y||200)-10}px`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('fly'));
  setTimeout(() => el.remove(), 900);
}


// ── АНИМИРОВАННЫЙ XP-СЧЁТЧИК (Duolingo-style) ────────────────
function animateCounter(el, from, to, suffix = '', duration = 700) {
  if (!el) return;
  const start = performance.now();
  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);
    const val = Math.round(from + (to - from) * ease);
    el.textContent = val + suffix;
    if (t < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}


// ── LEVEL-UP ЭКРАН ───────────────────────────────────────────
function showLevelUp(levelName, emoji) {
  const overlay = document.createElement('div');
  overlay.className = 'levelup-overlay';
  overlay.innerHTML = `
    <div class="levelup-box">
      <div class="levelup-emoji">${emoji}</div>
      <div class="levelup-title">LEVEL UP!</div>
      <div class="levelup-sub">Ты достиг уровня</div>
      <div class="levelup-name">${levelName}</div>
      <button onclick="this.closest('.levelup-overlay').remove()">🎉 Отлично!</button>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));
  Confetti.burst(window.innerWidth / 2, window.innerHeight / 3, 80);
  setTimeout(() => overlay.classList.remove('show'), 3500);
  setTimeout(() => overlay.remove(), 4200);
}


// ── БЕЙДЖИ ───────────────────────────────────────────────────
const BADGES = [
  { id:'first_step',  icon:'🚀', name:'Первый шаг',       desc:'Выполни первую задачу',            check:(xp,pct)=> xp >= 5   },
  { id:'day1_hero',   icon:'⭐', name:'Герой первого дня', desc:'Набери 30+ XP',                   check:(xp,pct)=> xp >= 30  },
  { id:'halfway',     icon:'🔥', name:'На полпути',        desc:'Пройди 50% маршрута',              check:(xp,pct)=> pct >= 50 },
  { id:'advanced',    icon:'🚀', name:'Продвинутый',       desc:'Перейди на уровень Продвинутый',   check:(xp,pct)=> pct >= 24 },
  { id:'almost_pro',  icon:'💎', name:'Почти профи',       desc:'Пройди 80% маршрута',              check:(xp,pct)=> pct >= 80 },
  { id:'full_pro',    icon:'🏆', name:'Профи!',            desc:'Пройди маршрут на 100%',           check:(xp,pct)=> pct >= 100 }
];

// ── Хранение бейджей в облаке (через users[login].badges) ────
function _getBadgeState(login) {
  if (typeof Auth !== 'undefined') {
    const users = Auth.getUsers();
    const userLogin = login || Auth.currentLogin();
    if (users[userLogin] && users[userLogin].badges) {
      return users[userLogin].badges;
    }
  }
  const raw = localStorage.getItem('ao_badges_' + (login || (typeof Auth !== 'undefined' ? Auth.currentLogin() : 'user')));
  return raw ? JSON.parse(raw) : {};
}

function _saveBadgeState(state, login) {
  if (typeof Auth !== 'undefined') {
    const users = Auth.getUsers();
    const userLogin = login || Auth.currentLogin();
    if (users[userLogin]) {
      users[userLogin].badges = state;
      Auth.saveUsers(users);
      return;
    }
  }
  localStorage.setItem('ao_badges_' + (login || 'user'), JSON.stringify(state));
}

function checkBadges(xp, pct) {
  const state = _getBadgeState();
  let changed = false;
  BADGES.forEach(b => {
    if (!state[b.id] && b.check(xp, pct)) {
      state[b.id] = { earned: true, earnedAt: Date.now() };
      changed = true;
      showBadgeToast(b);
    }
  });
  if (changed) _saveBadgeState(state);
}

function showBadgeToast(badge) {
  const el = document.createElement('div');
  el.className = 'badge-toast';
  el.innerHTML = `<div class="badge-toast-icon">${badge.icon}</div><div><div class="badge-toast-name">Бейдж разблокирован!</div><div class="badge-toast-title">${badge.name}</div><div class="badge-toast-desc">${badge.desc}</div></div>`;
  document.body.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => el.classList.remove('show'), 3000);
  setTimeout(() => el.remove(), 3500);
}

// рендер панели бейджей (вызывается на index.html)
function renderBadgesPanel(container, login) {
  if (!container) return;
  const state = _getBadgeState(login);
  container.innerHTML = BADGES.map(b => {
    const earned = state[b.id] && state[b.id].earned;
    const when = earned && state[b.id].earnedAt ? new Date(state[b.id].earnedAt).toLocaleDateString('ru-RU') : '';
    return `
    <div class="badge-chip ${earned ? 'earned' : 'locked'}" title="${b.desc}${when ? ' · ' + when : ''}">
      <span class="badge-chip-icon">${b.icon}</span>
      <span class="badge-chip-label">${b.name}</span>
      ${earned && when ? `<span class="badge-chip-date">${when}</span>` : ''}
    </div>`;
  }).join('');
}


// ── 🔥 STREAK (Duolingo-style) ───────────────────────────────
function _streakKey(type) {
  const login = (typeof Auth !== 'undefined' && Auth.currentLogin) ? Auth.currentLogin() : 'user';
  return 'ao_streak_' + type + '_' + login;
}

function _today() { return new Date().toISOString().slice(0, 10); }
function _yesterday() {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function updateStreak() {
  const today = _today();
  const yesterday = _yesterday();
  const last = localStorage.getItem(_streakKey('last'));
  let count = parseInt(localStorage.getItem(_streakKey('count')) || '0', 10);

  if (last === today) {
    return count;
  } else if (last === yesterday) {
    count += 1;
  } else {
    count = 1;
    if (last && last !== yesterday) _showStreakBroken();
  }

  localStorage.setItem(_streakKey('count'), String(count));
  localStorage.setItem(_streakKey('last'), today);

  if (count > 1) _showStreakContinued(count);
  return count;
}

function getStreak() {
  const last = localStorage.getItem(_streakKey('last'));
  const count = parseInt(localStorage.getItem(_streakKey('count')) || '0', 10);
  if (!last || (last !== _today() && last !== _yesterday())) return 0;
  return count;
}

function _showStreakContinued(count) {
  const el = document.createElement('div');
  el.className = 'streak-toast show';
  el.innerHTML = `
    <div class="streak-toast-icon">🔥</div>
    <div>
      <div class="streak-toast-title">Серия продолжается!</div>
      <div class="streak-toast-sub">${count} ${_streakDays(count)} подряд — так держать!</div>
    </div>`;
  document.body.appendChild(el);
  setTimeout(() => el.classList.remove('show'), 3200);
  setTimeout(() => el.remove(), 3800);
}

function _showStreakBroken() {
  const el = document.createElement('div');
  el.className = 'streak-toast streak-broken show';
  el.innerHTML = `
    <div class="streak-toast-icon">💔</div>
    <div>
      <div class="streak-toast-title">Серия прервалась</div>
      <div class="streak-toast-sub">Начни новую — заходи каждый день!</div>
    </div>`;
  document.body.appendChild(el);
  setTimeout(() => el.classList.remove('show'), 3200);
  setTimeout(() => el.remove(), 3800);
}

function _streakDays(n) {
  if (n % 10 === 1 && n % 100 !== 11) return 'день';
  if ([2,3,4].includes(n % 10) && ![12,13,14].includes(n % 100)) return 'дня';
  return 'дней';
}

function renderStreakWidget(el) {
  if (!el) return;
  const streak = getStreak();
  const isEmpty = streak === 0;
  el.innerHTML = `
    <div class="streak-widget ${isEmpty ? 'streak-empty' : ''}" title="${isEmpty ? 'Зайди сегодня, чтобы начать серию!' : 'Ты заходишь ' + streak + ' ' + _streakDays(streak) + ' подряд!'}">
      <span class="streak-fire">${isEmpty ? '🩶' : '🔥'}</span>
      <span class="streak-count">${isEmpty ? '0' : streak}</span>
    </div>`;
}


// ── СЧЁТЧИК ДНЕЙ ─────────────────────────────────────────────
function getDayCounter() {
  const key = 'ao_start_date_' + (Auth && Auth.currentLogin ? Auth.currentLogin() : 'user');
  let start = localStorage.getItem(key);
  if (!start) { start = new Date().toISOString().slice(0,10); localStorage.setItem(key, start); }
  const diff = Math.floor((Date.now() - new Date(start).getTime()) / 86400000) + 1;
  return Math.min(diff, 90);
}

function renderDayCounter(el) {
  if (!el) return;
  const day = getDayCounter();
  const pct = Math.round(day / 90 * 100);
  el.innerHTML = `
    <div class="day-counter">
      <div class="day-counter-num">День <strong>${day}</strong> <span>/ 90</span></div>
      <div class="day-counter-bar"><div class="day-counter-fill" style="width:${pct}%"></div></div>
    </div>`;
}


// ── WELCOME ЭКРАН (первый вход) ───────────────────────────────
function maybeShowWelcome(userName, roleName) {
  const key = 'ao_welcomed_' + (Auth && Auth.currentLogin ? Auth.currentLogin() : 'user');
  if (localStorage.getItem(key)) return;
  localStorage.setItem(key, '1');

  const overlay = document.createElement('div');
  overlay.className = 'welcome-overlay';
  overlay.innerHTML = `
    <div class="welcome-box">
      <div class="welcome-rocket">🎓</div>
      <h2>Добро пожаловать,<br><strong>${userName}</strong>!</h2>
      <p>Твоя роль: <strong>${roleName}</strong></p>
      <p class="welcome-mission">Твоя миссия — пройти адаптацию за <strong>90 дней</strong>,<br>выполняя задачи, получая XP и открывая бейджи.</p>
      <div class="welcome-steps">
        <div>🗺️ Открой свой маршрут</div>
        <div>✅ Отмечай выполненные задачи</div>
        <div>🏅 Собирай бейджи достижений</div>
        <div>🔥 Заходи каждый день — не теряй серию!</div>
        <div>🏆 Стань Профи за 90 дней!</div>
      </div>
      <button class="welcome-btn" onclick="this.closest('.welcome-overlay').remove()">🚀 Начать приключение!</button>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));
  Confetti.burst(window.innerWidth / 2, window.innerHeight / 2, 60);
}


// ── LEVEL-UP ТРЕКЕР ──────────────────────────────────────────
// FIX: используем абсолютный XP для определения уровня,
// а не процент — чтобы пороги совпадали с getXpLevel() на страницах маршрутов.
// Пороги: Новичок < 71 XP, Продвинутый 71–171 XP, Профи >= 172 XP (для 290 maxXp).
// Для универсальности считаем через pct: Продвинутый >= 24%, Профи >= 59%.
let _lastLevel = null;

function _levelFromPct(pct) {
  if (pct >= 59) return { name: 'Профи',       emoji: '🏆' };
  if (pct >= 24) return { name: 'Продвинутый', emoji: '🚀' };
  return              { name: 'Новичок',      emoji: '🌱' };
}

function trackLevelUp(xp, maxXp) {
  const pct = maxXp ? Math.round(xp / maxXp * 100) : 0;
  const current = _levelFromPct(pct);
  if (_lastLevel !== null && _lastLevel !== current.name) {
    showLevelUp(current.name, current.emoji);
  }
  _lastLevel = current.name;
}

function initLevelTracker(xp, maxXp) {
  const pct = maxXp ? Math.round(xp / maxXp * 100) : 0;
  _lastLevel = _levelFromPct(pct).name;
}


// ─────────────────────────────────────────────────────────────
// 🎮 ОБЪЕКТ Game — единая точка входа для страниц ролей
// ─────────────────────────────────────────────────────────────
const Game = {
  /**
   * Вызывать при отметке любой задачи.
   * FIX: конфетти показываем всегда (не только на первой задаче или крупных XP).
   */
  onTaskComplete(taskKey, xpEarned, totalXp, maxXp, levelName) {
    // 1. +XP попап
    const cb = document.getElementById(taskKey);
    if (cb) {
      const rect = cb.getBoundingClientRect();
      showXpPopup(xpEarned, rect.left + rect.width / 2, rect.top + window.scrollY);
    } else {
      showXpPopup(xpEarned);
    }

    // 2. Конфетти — всегда при отметке задачи (было: только первая или >= 20 XP)
    Confetti.burst(window.innerWidth / 2, window.innerHeight / 3, 30);

    // 3. Проверка бейджей (сохраняет в облако)
    const pct = Math.round(totalXp / maxXp * 100);
    checkBadges(totalXp, pct);

    // 4. Level-up анимация (FIX: теперь корректно ловит переход в Профи)
    trackLevelUp(totalXp, maxXp);
  },

  /**
   * Вызывать при загрузке страницы роли (после loadChecks)
   */
  onPageLoad(totalXp, maxXp, userName, roleName) {
    initLevelTracker(totalXp, maxXp);
    updateStreak();
    maybeShowWelcome(userName, roleName);
  },

  getBadges(login) {
    const state = _getBadgeState(login);
    return BADGES
      .filter(b => state[b.id] && state[b.id].earned)
      .map(b => ({ ...b, earnedAt: state[b.id].earnedAt || null }));
  },

  getAllBadges(login) {
    const state = _getBadgeState(login);
    return BADGES.map(b => ({
      ...b,
      earned: !!(state[b.id] && state[b.id].earned),
      earnedAt: state[b.id] ? state[b.id].earnedAt : null
    }));
  }
};
