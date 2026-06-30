/**
 * MODULES: PortabilityModule.js
 * Módulo independente responsável pelas operações de Importação e Exportação de payloads JSON.
 */
import { BaseModule } from '../BaseModule.js';
import { bus } from '../../core/EventBus.js';

export default class PortabilityModule extends BaseModule {
  constructor() {
    super('portability', 'Portabilidade de Dados (JSON)');
  }

  /**
   * Inicialização do módulo: Injeta os controles na barra lateral do Core.
   */
  init() {
    const containerBotoes = document.getElementById("container-gerenciamento-botoes");
    if (!containerBotoes) return;

    // 1. Criação do Botão de Importação via Arquivo
    const btnImport = document.createElement("button");
    btnImport.id = "btn-import";
    btnImport.innerText = "Importar JSON";
    btnImport.onclick = () => this.solicitarArquivoJSON();
    containerBotoes.appendChild(this.TRACK_UI(btnImport));

    // 2. Criação do Botão de Exportação
    const btnExport = document.createElement("button");
    btnExport.id = "btn-export";
    btnExport.innerText = "Exportar JSON";
    btnExport.onclick = () => this.executarExportacao();
    containerBotoes.appendChild(this.TRACK_UI(btnExport));
  }

  /**
   * Varre o LocalStorage, consolida todos os blocos ativos e gera um arquivo de download.
   */
  executarExportacao() {
    try {
      const payloads = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const chave = localStorage.key(i);
        // Captura todas as chaves de dados ignorando estados estruturais do core
        if (chave.startsWith("data_") && chave !== "data_brand_title" && chave !== "data_modules_state" && chave !== "app_modules_state") {
          const item = JSON.parse(localStorage.getItem(chave));
          if (item) {
            // Garante que a chave id seja guardada no payload para não perdermos a referência na importação
            if (!item.id) item.id = chave.replace("data_", "");
            payloads.push(item);
          }
        }
      }

      const jsonString = JSON.stringify(payloads, null, 2);
      
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "canvas-studio-backup.json";
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Falha ao exportar dados do Canvas:", error);
    }
  }

  /**
   * Dispara o seletor de arquivos do sistema operacional para carregar o backup.
   */
  solicitarArquivoJSON() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        this.executarImportacao(event.target.result);
      };
      reader.readAsText(file);
    };
    
    input.click();
  }

  /**
   * Limpa o estado atual do banco local e reidrata o LocalStorage com o conteúdo do arquivo.
   */
  executarImportacao(conteudoTexto) {
    try {
      const colecao = JSON.parse(conteudoTexto);
      if (!Array.isArray(colecao)) {
        console.error("Erro: O payload precisa ser uma coleção estruturada de blocos.");
        return;
      }

      // Limpa os blocos antigos antes de injetar os novos
      Object.keys(localStorage).forEach(chave => {
        if (chave.startsWith("data_") && chave !== "data_brand_title" && chave !== "data_modules_state" && chave !== "app_modules_state") {
          localStorage.removeItem(chave);
        }
      });

      // Salva cada bloco preservando o ID original estável do backup
      colecao.forEach((bloco, index) => {
        // Tenta usar o ID fixo do objeto, senão usa uma chave sequencial segura baseada no index do loop
        const idOriginal = bloco.id || bloco.imgId || ("block_" + index + "_" + Math.random().toString(36).substr(2, 5));
        
        localStorage.setItem("data_" + idOriginal, JSON.stringify(bloco));
      });

      // Notifica o App.js para redesenhar a tela
      bus.emit('canvas:reload-request');
    } catch (error) {
      console.error("Falha na importação do payload JSON:", error);
    }
  }
}