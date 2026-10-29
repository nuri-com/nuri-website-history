// Bitcoin Topbar — eine Datei, eine Verantwortlichkeit.
// Topbar mit Nuri-Logo links + Menu-Icon rechts.
// Nur DS-Components.

class BitcoinTopbar extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <nuri-topbar>
        <nuri-typography size="md" emphasis>Nuri</nuri-typography>
        <nuri-icon-button icon="list" variant="soft" data-action="menu"></nuri-icon-button>
      </nuri-topbar>
    `;
  }
}

customElements.define('bitcoin-topbar', BitcoinTopbar);