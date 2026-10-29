// Sepa Form Sheet — eine Datei, eine Verantwortlichkeit.
// Bank transfer recipient form. Nur DS-Components (text-field).

class SepaFormSheet extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div class="nuri-sheet-scrim" data-close></div>
      <div class="nuri-sheet-panel" style="max-height: 90vh;">
        <div class="nuri-sheet-handle"></div>
        <div class="nuri-sheet-header">
          <nuri-typography size="lg" emphasis>Recipient</nuri-typography>
          <nuri-button size="sm" variant="ghost" data-close>Close</nuri-button>
        </div>
        <div class="nuri-sheet-body">
          <nuri-stack direction="column" gap="md">
            <nuri-text-field placeholder="DE00 0000 0000 0000 0000 00">
              <nuri-text-field-label>IBAN*</nuri-text-field-label>
            </nuri-text-field>
            <nuri-text-field placeholder="First name">
              <nuri-text-field-label>First name*</nuri-text-field-label>
            </nuri-text-field>
            <nuri-text-field placeholder="Last name">
              <nuri-text-field-label>Last name*</nuri-text-field-label>
            </nuri-text-field>
            <nuri-text-field placeholder="Optional">
              <nuri-text-field-label>Reference</nuri-text-field-label>
            </nuri-text-field>
            <nuri-button size="lg" variant="solid" accent="lilac" fill="grow" data-action="next">Next</nuri-button>
          </nuri-stack>
        </div>
      </div>
    `;

    this.querySelectorAll('[data-close]').forEach((el) => {
      el.addEventListener('click', () => this.remove());
    });
    this.querySelector('[data-action="next"]').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('nuri:sepa-next'));
      this.remove();
    });
  }
}

customElements.define('sepa-form-sheet', SepaFormSheet);