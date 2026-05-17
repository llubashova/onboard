/* ============================================================
   game.js — игровые механики Auditorium Onboard
   конфетти · +XP попап · бейджи · level-up экран · welcome
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
  { id:'first_step',  icon:'🚀', name:'Первый шаг',      desc:'Выполни первую задачу',           check:(xp,pct)=> xp >= 5  },
  { id:'day1_hero',   icon:'⭐', name:'Герой первого дня', desc:'Набери 30+ XP',                  check:(xp,pct)=> xp >= 30 },
  { id:'halfway',     icon:'🔥', name:'На полпути',       desc:'Пройди 50% маршрута',             check:(xp,pct)=> pct >= 50 },
  { id:'advanced',    icon:'🚀', name:'Продвинутый',      desc:'Перейди на уровень Продвинутый',  check:(xp,pct)=> pct >= 20 },
  { id:'almost_pro',  icon:'💎', name:'Почти профи',      desc:'Пройди 80% маршрута',             check:(xp,pct)=> pct >= 80 },
  { id:'full_pro',    icon:'🏆', name:'Профи!',           desc:'Пройди маршрут на 100%',          check:(xp,pct)=> pct >= 100 }
];

function getBadgeState() {
  const raw = localStorage.getItem('ao_badges');
  return raw ? JSON.parse(raw) : {};
}
function saveBadgeState(state) {
  localStorage.setItem('ao_badges', JSON.stringify(state));
}

function checkBadges(xp, pct) {
  const state = getBadgeState();
  BADGES.forEach(b => {
    if (!state[b.id] && b.check(xp, pct)) {
      state[b.id] = true;
      saveBadgeState(state);
      showBadgeToast(b);
    }
  });
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
function renderBadgesPanel(container) {
  if (!container) return;
  const state = getBadgeState();
  container.innerHTML = BADGES.map(b => `
    <div class="badge-chip ${state[b.id] ? 'earned' : 'locked'}" title="${b.desc}">
      <span class="badge-chip-icon">${b.icon}</span>
      <span class="badge-chip-label">${b.name}</span>
    </div>`).join('');
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
        <div>🏆 Стань Профи за 90 дней!</div>
      </div>
      <button class="welcome-btn" onclick="this.closest('.welcome-overlay').remove()">🚀 Начать приключение!</button>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('show'));
  Confetti.burst(window.innerWidth / 2, window.innerHeight / 2, 60);
}


// ── LEVEL-UP ТРЕКЕР (для страниц ролей) ──────────────────────
let _lastLevel = null;
function trackLevelUp(xp) {
  let level, emoji;
  if (xp >= 180 || xp / (window._MAX_XP || 331) >= 0.55) { level = 'Профи'; emoji = '🏆'; }
  else if (xp >= 66 || xp / (window._MAX_XP || 331) >= 0.20) { level = 'Продвинутый'; emoji = '🚀'; }
  else { level = 'Новичок'; emoji = '🌱'; }

  if (_lastLevel && _lastLevel !== level) showLevelUp(level, emoji);
  _lastLevel = level;
}
function initLevelTracker(xp) { _lastLevel = xp >= 180 ? 'Профи' : xp >= 66 ? 'Продвинутый' : 'Новичок'; }
