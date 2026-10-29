// Sheet-Wrapper — eine Datei, eine Verantwortlichkeit.
// Generic bottom-sheet: scrim + panel + slide-up.
// Andere Components nutzen dies als Basis.

export class NuriSheet extends HTMLElement {
  static get observedAttributes() {
    return ['open'];
  }

  attributeChangedCallback() {
    this.#sync();
  }

  #sync() {
    const isOpen = this.hasAttribute('open');
    this.style.display = isOpen ? '' : 'none';
  }

  connectedCallback() {
    this.innerHTML = `
      <div class="nuri-sheet-scrim" data-close></div>
      <div class="nuri-sheet-panel">
        <div class="nuri-sheet-handle"></div>
        <slot></slot>
      </div>
    `;
    this.querySelectorAll('[data-close]').forEach((el) => {
      el.addEventListener('click', () => this.#close());
    });
    this.#sync();
  }

  #close() {
    this.removeAttribute('open');
    this.dispatchEvent(new CustomEvent('nuri:sheet-close'));
  }
}

customElements.define('nuri-sheet', NuriSheet);