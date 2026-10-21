// Applique le thème avant le premier rendu (évite le flash clair/sombre).
// Fichier externe plutôt que script en ligne : compatible avec la CSP
// `script-src 'self'`.
(function () {
  var t = null;
  try { t = localStorage.getItem('theme-mode'); } catch (e) { /* stockage indisponible */ }
  var dark = t === 'dark' || (t === null && window.matchMedia('(prefers-color-scheme:dark)').matches);
  if (dark) document.documentElement.classList.add('dark');
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
})();
