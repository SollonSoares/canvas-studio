/**
 * MODULES: BaseModule.js
 * Interface/Classe abstrata mandatória para o ciclo de vida de todos os plug-ins.
 */
export class BaseModule {
  /**
   * Inicializa as propriedades de identificação do módulo.
   * @param {string} id - Identificador exclusivo do plug-in (ex: 'text', 'chart').
   * @param {string} name - Nome de exibição na interface do usuário.
   */
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.uiElements = []; // Rastreia elementos injetados no DOM para remoção cirúrgica
  }

  /**
   * Método executado pelo CORE ao ativar o módulo. Deve ser implementado obrigatoriamente.
   */
  init() {
    throw new Error(`O método init() deve ser implementado pelo módulo "${this.name}".`);
  }

  /**
   * Método executado pelo CORE ao desativar o módulo. 
   * Remove listeners e elementos injetados na interface de forma limpa.
   */
  destroy() {
    this.uiElements.forEach(element => {
      if (typeof element.remove === 'function') {
        element.remove();
      }
    });
    this.uiElements = [];
  }

  /**
   * Registra um elemento criado pelo módulo para auto-remoção no momento do destroy.
   * @param {HTMLElement} element - O elemento HTML a ser rastreado.
   * @returns {HTMLElement} O próprio elemento para encadeamento.
   */
  TRACK_UI(element) {
    this.uiElements.push(element);
    return element;
  }
}