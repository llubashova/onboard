// admin_init.js v2
// Гарантируем скрытие loadingScreen через 800мс после window.load
// + динамически догружаем admin_custom_routes.js если ещё не загружен

(function () {
  // Догружаем модуль индивидуальных маршрутов если ещё не загружен
  if (typeof populateCRAssignSelect === 'undefined') {
    var s = document.createElement('script');
    s.src = 'admin_custom_routes.js';
    document.head.appendChild(s);
  }

  // Через 800мс после window.load — гарантированно скрываем loadingScreen
  window.addEventListener('load', function () {
    setTimeout(function () {
      var el = document.getElementById('loadingScreen');
      if (el) el.style.display = 'none';
    }, 800);
  });
})();
