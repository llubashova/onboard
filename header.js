// header.js — автоматически добавляет кнопку «Выйти» во все страницы,
// защищает страницы ролей от чужого входа,
// и подключает favicon на все страницы
(function () {
  // 0. Favicon — вставляем <link rel="icon"> если его ещё нет
  if (!document.querySelector('link[rel="icon"]')) {
    const link = document.createElement('link');
    link.rel  = 'icon';
    link.type = 'image/svg+xml';
    link.href = 'favicon.svg';
    document.head.appendChild(link);
  }

  // 1. Кнопка выхода в хедере
  document.addEventListener('DOMContentLoaded', function () {
    const badge = document.querySelector('.user-badge');
    if (!badge) return;

    const btn = document.createElement('button');
    btn.className = 'logout-btn';
    btn.setAttribute('title', 'Выйти');
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Выйти';
    btn.onclick = function (e) {
      e.preventDefault();
      if (typeof Auth !== 'undefined') Auth.logout();
    };

    const inner = badge.closest('.header-inner');
    if (inner) {
      const wrap = document.createElement('div');
      wrap.className = 'header-right';
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
      if (!u) return;
      if (u.admin) return;
      if (u.role !== ROLE_PAGES[filename]) {
        const myPage = ROLE_PAGES[u.role + '.html'] ? u.role + '.html' : 'index.html';
        window.location.href = myPage;
      }
    });
  }
})();
