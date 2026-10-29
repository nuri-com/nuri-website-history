// Send Amount Sheet — eine Datei, eine Verantwortlichkeit.
// Amount entry mit keypad. Nur DS-Components.

class SendAmountSheet extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="nuri-sheet-scrim" data-close></div>
      <div class="nuri-sheet-panel" style="max-height: 90vh;">
        <div class="nuri-sheet-handle"></div>
        <div class="nuri-sheet-header">
          <nuri-typography size="lg" emphasis>How much?</nuri-typography>
          <nuri-button size="sm" variant="ghost" data-close>Close</nuri-button>
        </div>
        <div class="nuri-sheet-body">
          <nuri-stack direction="column" gap="lg" align="center" padding="md">
            <nuri-typography size="3xl" emphasis align="center">€ 0.00</nuri-typography>
            <nuri-typography size="sm" muted>€ 25.87 available</nuri-typography>

            <nuri-stack direction="row" gap="sm" fill="grow">
              <nuri-button size="sm" variant="soft">€ 5</nuri-button>
              <nuri-button size="sm" variant="soft">€ 10</nuri-button>
              <nuri-button size="sm" variant="soft">€ 25</nuri-button>
            </nuri-stack>

            <nuri-button size="lg" variant="solid" accent="lilac" data-action="next">Next</nuri-button>
          </nuri-stack>
        </div>
      </div>
    `;

    this.querySelectorAll('[data-close]').forEach((el) => {
      el.addEventListener('click', () => this.remove());
    });
    this.querySelector('[data-action="next"]').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('nuri:amount-next'));
      this.remove();
    });
  }
}

customElements.define('send-amount-sheet', SendAmountSheet);