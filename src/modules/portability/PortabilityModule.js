/**
 * MODULES: PortabilityModule.js
 * Gerencia o pipeline de backup e reidratação atômica do Canvas Studio com suporte a dump de mídia.
 */
import { BaseModule } from '../BaseModule.js';
import { dbManager } from '../../core/DB.js';
import { bus } from '../../core/EventBus.js';

export default class PortabilityModule extends BaseModule {
  constructor() {
    super('portability', 'Módulo de Portabilidade');
  }

  init() {
    const containerBotoes = document.getElementById("container-gerenciamento-botoes");
    if (!containerBotoes) return;

    const btnImportar = document.createElement("button");
    btnImportar.id = "btn-import-json";
    btnImportar.innerText = "Importar JSON";
    
    const labelUpload = document.createElement("label");
    labelUpload.className = "btn-upload-container";
    labelUpload.style.display = "block";
    
    const hiddenInput = document.createElement("input");
    hiddenInput.type = "file";
    hiddenInput.accept = ".json";
    hiddenInput.style.display = "none";
    hiddenInput.onchange = (e) => this.tratarImportacao(e);
    
    btnImportar.onclick = () => hiddenInput.click();
    labelUpload.appendChild(hiddenInput);
    labelUpload.appendChild(btnImportar);
    containerBotoes.appendChild(this.TRACK_UI(labelUpload));

    const btnExportar = document.createElement("button");
    btnExportar.id = "btn-export-json";
    btnExportar.innerText = "Exportar JSON";
    btnExportar.onclick = () => this.tratarExportacaoCompleta();
    containerBotoes.appendChild(this.TRACK_UI(btnExportar));
  }

  async tratarExportacaoCompleta() {
    console.log("Iniciando varredura atômica para exportação de dados...");
    const payloadBackup = {};

    if (localStorage.getItem("app_brand_title")) {
      payloadBackup["app_brand_title"] = localStorage.getItem("app_brand_title");
    }

    for (let i = 0; i < localStorage.length; i++) {
      const chave = localStorage.key(i);
      
      if (chave.startsWith("data_") && chave !== "data_brand_title" && chave !== "data_modules_state" && chave !== "app_modules_state") {
        try {
          const dadosBloco = JSON.parse(localStorage.getItem(chave));
          if (!dadosBloco) continue;

          payloadBackup[chave] = dadosBloco;
        } catch (e) {
          console.error("Erro ao serializar nó de dados para a exportação:", e);
        }
      }
    }

    try {
      const stringData = JSON.stringify(payloadBackup, null, 2);
      const blob = new Blob([stringData], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const linkDownload = document.createElement("a");
      linkDownload.href = url;
      linkDownload.download = `canvas_studio_backup_${Date.now()}.json`;
      document.body.appendChild(linkDownload);
      linkDownload.click();
      
      document.body.removeChild(linkDownload);
      URL.revokeObjectURL(url);
    } catch (errBlob) {
      console.error("Falha crítica ao gerar arquivo físico de exportação:", errBlob);
    }
  }

  async tratarImportacao(e) {
    const arquivo = e.target.files[0];
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = async (evt) => {
      try {
        const payload = JSON.parse(evt.target.result);
        if (!payload || typeof payload !== 'object') {
          throw new Error("Formato de schema JSON inválido.");
        }

        console.log("Validando e normalizando schema de importação...");

        Object.keys(localStorage).forEach(chave => {
          if (chave.startsWith("data_") && chave !== "data_brand_title" && chave !== "data_modules_state" && chave !== "app_modules_state") {
            localStorage.removeItem(chave);
          }
        });

        for (let [chave, valor] of Object.entries(payload)) {
          if (chave === "app_brand_title" || chave === "data_brand_title") {
            localStorage.setItem("app_brand_title", typeof valor === 'object' ? (valor.title || "Naruto RPG") : valor);
            continue;
          }

          if (chave === "app_modules_state" || chave === "data_modules_state") {
            continue;
          }

          let chaveNormalizada = chave;
          if (!chave.startsWith("data_")) {
            chaveNormalizada = "data_" + chave;
          }

          if (valor && typeof valor === 'object') {
            localStorage.setItem(chaveNormalizada, JSON.stringify(valor));
          }
        }

        console.log("Sincronização de texto concluída no LocalStorage.");

        setTimeout(() => {
          alert("Dados importados com sucesso! Sincronizando e atualizando o Canvas...");
          location.reload();
        }, 100);

      } catch (err) {
        console.error("Erro crítico na reidratação do payload:", err);
        alert("Falha ao importar JSON: O arquivo está corrompido ou viola o formato estrutural.");
      }
    };
    leitor.readAsText(arquivo);
  }
}