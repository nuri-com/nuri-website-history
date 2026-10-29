// Euro Wallet Screen — eine Datei, eine Verantwortlichkeit.
// Euro-Balance + Send/Receive Buttons. Nur DS-Components.

class EuroScreen extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <nuri-screen>
        <nuri-topbar>
          <nuri-typography size="md" emphasis>Euro</nuri-typography>
          <nuri-icon-button icon="list" variant="soft" data-action="menu"></nuri-icon-button>
        </nuri-topbar>

        <nuri-scroll fill="grow">
          <nuri-stack direction="column" gap="xl" padding="lg" align="center" fill="grow">
            <nuri-stack direction="column" gap="sm" align="center">
              <nuri-typography size="sm" muted>Euro Balance</nuri-typography>
              <nuri-typography size="3xl" emphasis align="center">€ 25.87</nuri-typography>
            </nuri-stack>

            <nuri-stack direction="row" gap="sm" justify="center">
              <nuri-button size="lg" variant="soft" data-action="receive">Receive</nuri-button>
              <nuri-button size="lg" variant="solid" accent="lilac" data-action="send">Send</nuri-button>
            </nuri-stack>
          </nuri-stack>
        </nuri-scroll>
      </nuri-screen>
    `;

    this.querySelector('[data-action="send"]').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('nuri:open-send-euro', { bubbles: true }));
    });
    this.querySelector('[data-action="receive"]').addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('nuri:open-receive-euro', { bubbles: true }));
    });
  }
}

customElements.define('euro-screen', EuroScreen);