// App-Bootstrap — eine Datei, eine Verantwortlichkeit.
// Startet die App: DS laden, Theme setzen, Router initialisieren.

import './lib/ds-loader.js';
import { initTheme } from './services/theme-service.js';
import { initRouter } from './screens/router.js';

// Theme aus localStorage setzen vor first paint
initTheme();

function startApp() {
  const outlet = document.getElementById('app');
  if (outlet) initRouter(outlet);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}