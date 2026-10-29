// Bitcoin Actions — eine Datei, eine Verantwortlichkeit.
// Receive + Send Buttons gleich breit nebeneinander. Emit Events.
// Nur DS-Components.

class BitcoinActions extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <nuri-stack direction="row" gap="sm" fill="grow">
        <nuri-button size="lg" variant="soft" fill="even" data-action="receive">Receive</nuri-button>
        <nuri-button size="lg" variant="solid" accent="lilac" fill="even" data-action="send">Send</nuri-button>
      </nuri-stack>
    `;

    this.querySelector('[data-action="receive"]')
      .addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('nuri:open-receive', { bubbles: true }));
      });

    this.querySelector('[data-action="send"]')
      .addEventListener('click', () => {
        this.dispatchEvent(new CustomEvent('nuri:open-send', { bubbles: true }));
      });
  }
}

customElements.define('bitcoin-actions', BitcoinActions);