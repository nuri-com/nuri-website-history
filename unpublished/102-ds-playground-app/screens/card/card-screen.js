// Card Screen — eine Datei, eine Verantwortlichkeit.
// Karten-Balance + Card-Details Button. Nur DS-Components.

class CardScreen extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <nuri-screen>
        <nuri-topbar>
          <nuri-typography size="md" emphasis>Card</nuri-typography>
          <nuri-icon-button icon="list" variant="soft" data-action="transactions"></nuri-icon-button>
        </nuri-topbar>

        <nuri-scroll fill="grow">
          <nuri-stack direction="column" gap="xl" padding="lg" align="center" fill="grow">

            <nuri-stack direction="column" gap="sm" align="center">
              <nuri-typography size="sm" muted>Card Balance</nuri-typography>
              <nuri-typography size="3xl" emphasis align="center">€ 142.30</nuri-typography>
            </nuri-stack>

            <nuri-button size="lg" variant="solid" accent="lilac" data-action="details">Card Details</nuri-button>

          </nuri-stack>
        </nuri-scroll>
      </nuri-screen>
    `;

    this.querySelector('[data-action="details"]').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('nuri:open-card-details', { bubbles: true }));
    });
    this.querySelector('[data-action="transactions"]').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('nuri:open-card-transactions', { bubbles: true }));
    });
  }
}

customElements.define('card-screen', CardScreen);