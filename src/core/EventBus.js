/**
 * CORE: EventBus.js
 * Gerenciador de eventos global para comunicação desacoplada entre módulos e o core.
 */
export class EventBus {
  constructor() {
    this.listeners = {};
  }

  /**
   * Inscreve um ouvinte em um canal de eventos específico.
   * @param {string} event - Nome do evento.
   * @param {Function} callback - Função executada quando o evento é disparado.
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  /**
   * Remove um ouvinte específico de um canal de eventos.
   * @param {string} event - Nome do evento.
   * @param {Function} callback - Função a ser removida.
   */
  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  /**
   * Dispara um sinal para todos os ouvintes inscritos no canal.
   * @param {string} event - Nome do evento.
   * @param {*} data - Payload de dados enviado aos ouvintes.
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Erro ao executar callback para o evento "${event}":`, error);
        }
      });
    }
  }
}

// Instância única global exportada para o ecossistema
export const bus = new EventBus();