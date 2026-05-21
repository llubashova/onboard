// admin_init.js — загрузчик admin_custom_routes.js + принудительное скрытие loadingScreen
// Подключается последним тегом <script> в admin.html через document.write

(function() {
  // 1. Догружаем admin_custom_routes.js если ещё не загружен
  if (typeof populateCRAssignSelect === 'undefined') {
    var s = document.createElement('script');
    s.src = 'admin_custom_routes.js';
    document.head.appendChild(s);
  }

  // 2. Гарантируем скрытие loadingScreen: запасной таймер 800мс после DOM реди
  window.addEventListener('load', function() {
    setTimeout(function() {
      var el = document.getElementById('loadingScreen');
      if (el && el.style.display !== 'none') {
        el.style.display = 'none';
      }
    }, 800);
  });
})();
