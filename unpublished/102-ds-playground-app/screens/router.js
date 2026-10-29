// App-Router — eine Datei, eine Verantwortlichkeit.
// Tab-Bar + Screen-Switching. Nur DS-Components.

import './bitcoin/bitcoin-screen.js';
import './euro/euro-screen.js';
import './card/card-screen.js';

const TABS = [
  { id: 'bitcoin', label: 'Bitcoin', icon: 'vault' },
  { id: 'euro', label: 'Euro', icon: 'bank' },
  { id: 'card', label: 'Card', icon: 'card' },
];

const SCREENS = {
  bitcoin: () => document.createElement('bitcoin-screen'),
  euro: () => document.createElement('euro-screen'),
  card: () => document.createElement('card-screen'),
};

let current = null;
let outlet = null;

export function initRouter(outletEl) {
  outlet = outletEl;
  navigate('bitcoin');
}

export function navigate(route) {
  if (!outlet) return;
  if (current) current.remove();
  const factory = SCREENS[route];
  if (!factory) return;
  current = factory();
  outlet.appendChild(current);
  renderTabBar(route);
}

function renderTabBar(active) {
  let tabBar = document.getElementById('nuri-tab-bar');
  if (tabBar) tabBar.remove();

  tabBar = document.createElement('nuri-tab-bar');
  tabBar.id = 'nuri-tab-bar';
  tabBar.style.position = 'fixed';
  tabBar.style.bottom = '0';
  tabBar.style.left = '0';
  tabBar.style.right = '0';
  tabBar.style.zIndex = '50';

  TABS.forEach((tab) => {
    const item = document.createElement('nuri-tab-bar-item');
    item.setAttribute('icon', tab.icon);
    item.setAttribute('label', tab.label);
    if (tab.id === active) item.setAttribute('active', '');
    item.addEventListener('click', () => navigate(tab.id));
    tabBar.appendChild(item);
  });

  document.body.appendChild(tabBar);
}