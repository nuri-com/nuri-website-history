// Bitcoin Balance — eine Datei, eine Verantwortlichkeit.
// Zeigt BTC-Balance groß in der Mitte. Tap togglet hide/show.
// Nur DS-Components.

class BitcoinBalance extends HTMLElement {
  #hidden = false;
  #sats = 0;

  connectedCallback() {
    this.addEventListener('click', () => {
      this.#hidden = !this.#hidden;
      this.#render();
    });
    this.style.cursor = 'pointer';
    this.#render();
  }

  set sats(value) {
    this.#sats = value;
    this.#render();
  }

  get sats() {
    return this.#sats;
  }

  #formatBtc(sats) {
    const btc = sats / 100000000;
    return btc.toFixed(8);
  }

  #render() {
    const display = this.#hidden ? '••••••••' : this.#formatBtc(this.#sats);
    this.innerHTML = `
      <nuri-stack direction="column" gap="sm" align="center" fill="grow">
        <nuri-typography size="sm" muted>Bitcoin Balance</nuri-typography>
        <nuri-typography size="3xl" emphasis align="center">${display}</nuri-typography>
        <nuri-typography size="sm" muted>BTC</nuri-typography>
      </nuri-stack>
    `;
  }
}

customElements.define('bitcoin-balance', BitcoinBalance);