// header.js — автоматически добавляет кнопку «Выйти» во все страницы
// и защищает страницы ролей от чужого входа
(function () {
  // 1. Кнопка выхода в хедере
  document.addEventListener('DOMContentLoaded', function () {
    const badge = document.querySelector('.user-badge');
    if (!badge) return;

    // Добавляем кнопку рядом с badge
    const btn = document.createElement('button');
    btn.className = 'logout-btn';
    btn.setAttribute('title', 'Выйти');
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Выйти';
    btn.onclick = function (e) {
      e.preventDefault();
      if (typeof Auth !== 'undefined') Auth.logout();
    };

    // Вставляем кнопку после badge
    const inner = badge.closest('.header-inner');
    if (inner) {
      const wrap = document.createElement('div');
      wrap.className = 'header-right';
      // Переносим badge в wrap, добавляем кнопку
      badge.parentNode.insertBefore(wrap, badge);
      wrap.appendChild(badge);
      wrap.appendChild(btn);
    }
  });

  // 2. Защита страниц ролей: сотрудник видит только свой маршрут
  const ROLE_PAGES = {
    'producer.html': 'producer',
    'sales.html': 'sales',
    'marketing.html': 'marketing'
  };
  const filename = location.pathname.split('/').pop();
  if (ROLE_PAGES[filename]) {
    document.addEventListener('DOMContentLoaded', function () {
      if (typeof Auth === 'undefined') return;
      const u = Auth.current();
      if (!u) return; // requireAuth уже редиректит
      // Администраторы (HR) могут смотреть любой маршрут
      if (u.admin) return;
      if (u.role !== ROLE_PAGES[filename]) {
        // Редирект на свой маршрут
        const myPage = ROLE_PAGES[u.role + '.html'] ? u.role + '.html' : 'index.html';
        window.location.href = myPage;
      }
    });
  }
})();
