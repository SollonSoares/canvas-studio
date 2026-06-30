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
   * Varre o LocalStorage, consolida todos os blocos ativos e gera um download local do arquivo JSON.
   */
  executarExportacao() {
    const backupColecao = [];

    for (let i = 0; i < localStorage.length; i++) {
      const chave = localStorage.key(i);
      if (chave.startsWith("data_") && chave !== "data_brand_title" && chave !== "data_modules_state" && chave !== "app_modules_state") {
        try {
          const itemBruto = JSON.parse(localStorage.getItem(chave));
          // Re-injeta o ID estável do registro de forma explícita no payload de portabilidade
          itemBruto.id = chave.replace("data_", "");
          backupColecao.push(itemBruto);
        } catch (e) {
          console.error("Ignorando bloco corrompido no pipeline de exportação:", e);
        }
      }
    }

    // Geração do blob e trigger de download nativo do navegador
    const dadosConvertidos = JSON.stringify(backupColecao, null, 2);
    const blob = new Blob([dadosConvertidos], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    
    const elementoGatilho = document.createElement("a");
    elementoGatilho.href = url;
    elementoGatilho.download = `canvas_studio_backup_${Math.floor(Date.now() / 1000)}.json`;
    elementoGatilho.click();
    
    URL.revokeObjectURL(url);
  }

  /**
   * Instancia uma janela de seleção para carregar um arquivo local .json
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
        throw new Error("O payload precisa ser uma coleção estruturada de blocos.");
      }

      // INTEGRIDADE E VALIDAÇÃO PRÉVIA (ROLLBACK LÓGICO [REQ-004])
      const dadosValidados = colecao.map((bloco, index) => {
        if (!bloco.type) {
          throw new Error(`Bloco no índice ${index} não possui a propriedade obrigatória 'type'.`);
        }
        return {
          id: bloco.id || bloco.imgId || ("block_" + index + "_" + Math.random().toString(36).substr(2, 5)),
          payload: bloco
        };
      });

      // Operação segura: O armazenamento ativo só é limpo após sucesso total no parse e validação completa do schema
      Object.keys(localStorage).forEach(chave => {
        if (chave.startsWith("data_") && chave !== "data_brand_title" && chave !== "data_modules_state" && chave !== "app_modules_state") {
          localStorage.removeItem(chave);
        }
      });

      // Gravação definitiva dos novos blocos validados
      dadosValidados.forEach(item => {
        localStorage.setItem("data_" + item.id, JSON.stringify(item.payload));
      });

      // Emite ordem para redesenhar o espaço de trabalho global
      bus.emit('canvas:reload-request');
      alert("Importação de painel concluída com sucesso.");
    } catch (error) {
      console.error("Abandono de importação por inconsistência nos dados (Rollback executado):", error.message);
      alert(`Falha na Importação: ${error.message} Nenhuma alteração foi realizada.`);
    }
  }
}