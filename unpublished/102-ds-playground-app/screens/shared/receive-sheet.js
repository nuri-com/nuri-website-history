// Receive Sheet — eine Datei, eine Verantwortlichkeit.
// Generic receive bottom sheet mit QR placeholder. Nur DS-Components.

class ReceiveSheet extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="nuri-sheet-scrim" data-close></div>
      <div class="nuri-sheet-panel">
        <div class="nuri-sheet-handle"></div>
        <div class="nuri-sheet-header">
          <nuri-typography size="lg" emphasis>Receive</nuri-typography>
          <nuri-button size="sm" variant="ghost" data-close>Close</nuri-button>
        </div>
        <div class="nuri-sheet-body">
          <nuri-stack direction="column" gap="md" align="center">
            <nuri-stack direction="column" gap="sm" align="center" padding="lg">
              <nuri-typography size="md" emphasis>bc1q...mock-address</nuri-typography>
              <nuri-button size="sm" variant="soft" data-action="copy">Copy Address</nuri-button>
            </nuri-stack>
          </nuri-stack>
        </div>
      </div>
    `;

    this.querySelectorAll('[data-close]').forEach((el) => {
      el.addEventListener('click', () => this.remove());
    });

    this.querySelector('[data-action="copy"]').addEventListener('click', () => {
      navigator.clipboard?.writeText('bc1q-mock-address');
    });
  }
}

customElements.define('receive-sheet', ReceiveSheet);