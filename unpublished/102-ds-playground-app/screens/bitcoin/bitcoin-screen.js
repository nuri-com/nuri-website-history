// Bitcoin Screen — eine Datei, eine Verantwortlichkeit.
// Balance + Send/Receive + Activity (leer, keine Fake-Daten).
// Öffnet Sheets. Nur DS-Components.

import './topbar.js';
import './balance.js';
import './actions.js';
import '../shared/send-sheet.js';
import '../shared/receive-sheet.js';

class BitcoinScreen extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <nuri-screen>
        <bitcoin-topbar></bitcoin-topbar>

        <nuri-scroll fill="grow">
          <nuri-stack direction="column" gap="xl" padding="lg" align="center" fill="grow">
            <bitcoin-balance></bitcoin-balance>
            <bitcoin-actions></bitcoin-actions>
          </nuri-stack>
        </nuri-scroll>
      </nuri-screen>
    `;

    const balance = this.querySelector('bitcoin-balance');
    balance.sats = 5234000;

    this.querySelector('bitcoin-actions').addEventListener('nuri:open-send', (e) => {
      e.stopPropagation();
      const sheet = document.createElement('send-sheet');
      sheet.setAttribute('title', 'Send Bitcoin');
      document.body.appendChild(sheet);
    });

    this.querySelector('bitcoin-actions').addEventListener('nuri:open-receive', (e) => {
      e.stopPropagation();
      document.body.appendChild(document.createElement('receive-sheet'));
    });
  }
}

customElements.define('bitcoin-screen', BitcoinScreen);