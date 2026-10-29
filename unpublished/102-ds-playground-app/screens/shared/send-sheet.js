// Send Sheet — eine Datei, eine Verantwortlichkeit.
// Generic send-method bottom sheet. Nur DS-Components.
// Nimmt methods als prop, dispatched selected event.

class SendSheet extends HTMLElement {
  static get observedAttributes() {
    return ['title'];
  }

  connectedCallback() {
    const title = this.getAttribute('title') || 'Send';

    this.innerHTML = `
      <div class="nuri-sheet-scrim" data-close></div>
      <div class="nuri-sheet-panel">
        <div class="nuri-sheet-handle"></div>
        <div class="nuri-sheet-header">
          <nuri-typography size="lg" emphasis>${title}</nuri-typography>
          <nuri-button size="sm" variant="ghost" data-close>Close</nuri-button>
        </div>
        <div class="nuri-sheet-body">
          <nuri-list>
            <nuri-list-action data-method="btc" accessibility-label="Bitcoin Address">
              <nuri-list-action-leading-avatar name="arrow-up" variant="outline" accent="orange"></nuri-list-action-leading-avatar>
              <nuri-list-action-text>Bitcoin Address</nuri-list-action-text>
              <nuri-list-action-text-muted>Send to BTC address</nuri-list-action-text-muted>
              <nuri-list-action-trailing-icon></nuri-list-action-trailing-icon>
            </nuri-list-action>
            <nuri-list-separator></nuri-list-separator>
            <nuri-list-action data-method="lightning" accessibility-label="Lightning">
              <nuri-list-action-leading-avatar name="arrow-up" variant="outline" accent="orange"></nuri-list-action-leading-avatar>
              <nuri-list-action-text>Lightning Invoice</nuri-list-action-text>
              <nuri-list-action-text-muted>Instant via Lightning</nuri-list-action-text-muted>
              <nuri-list-action-trailing-icon></nuri-list-action-trailing-icon>
            </nuri-list-action>
            <nuri-list-separator></nuri-list-separator>
            <nuri-list-action data-method="bank" accessibility-label="SEPA">
              <nuri-list-action-leading-avatar name="arrow-up" variant="outline" accent="lilac"></nuri-list-action-leading-avatar>
              <nuri-list-action-text>SEPA Transfer</nuri-list-action-text>
              <nuri-list-action-text-muted>Send to bank account</nuri-list-action-text-muted>
              <nuri-list-action-trailing-icon></nuri-list-action-trailing-icon>
            </nuri-list-action>
          </nuri-list>
        </div>
      </div>
    `;

    this.querySelectorAll('[data-close]').forEach((el) => {
      el.addEventListener('click', () => this.#close());
    });

    this.querySelectorAll('[data-method]').forEach((el) => {
      el.addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('nuri:send-method', { detail: el.dataset.method }));
        this.#close();
      });
    });
  }

  #close() {
    this.remove();
  }
}

customElements.define('send-sheet', SendSheet);