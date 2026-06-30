/**
 * CORE: DB.js
 * Camada de persistência unificada (IndexedDB para mídias pesadas e LocalStorage para metadados).
 */
export class DBManager {
  constructor() {
    this.db = null;
  }

  /**
   * Inicializa a conexão assíncrona com o IndexedDB.
   * @returns {Promise<IDBDatabase>}
   */
  init() {
    return new Promise((resolve, reject) => {
      const dbReq = indexedDB.open("CanvasMediaDB", 1);
      
      dbReq.onupgradeneeded = (e) => {
        const database = e.target.result;
        if (!database.objectStoreNames.contains("images")) {
          database.createObjectStore("images", { keyPath: "id" });
        }
      };

      dbReq.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };

      dbReq.onerror = (e) => {
        console.error("Falha ao abrir CanvasMediaDB:", e.target.error);
        reject(e.target.error);
      };
    });
  }

  /**
   * Grava ou atualiza uma string DataURL de imagem no Object Store assincronamente.
   * @param {string} id - Chave identificadora única da imagem.
   * @param {string} dataUrl - Payload binário codificado em Base64.
   * @returns {Promise<void>}
   */
  salvarImagemIndexedDB(id, dataUrl) {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject("Database não inicializado.");
      const tx = this.db.transaction("images", "readwrite");
      const store = tx.objectStore("images");
      
      const req = store.put({ id, data: dataUrl });
      
      req.onsuccess = () => resolve();
      req.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Recupera o binário bruto de uma imagem cadastrada.
   * @param {string} id - Chave identificadora da imagem.
   * @returns {Promise<string|null>}
   */
  obterImagemIndexedDB(id) {
    return new Promise((resolve) => {
      if (!this.db) return resolve(null);
      const tx = this.db.transaction("images", "readonly");
      const store = tx.objectStore("images");
      
      const req = store.get(id);
      
      req.onsuccess = (e) => {
        resolve(e.target.result ? e.target.result.data : null);
      };
      
      req.onerror = () => {
        resolve(null);
      };
    });
  }
}

// Instância única de gerenciamento de persistência exportada para o ecossistema
export const dbManager = new DBManager();