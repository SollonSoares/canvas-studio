/**
 * MODULES: PortabilityModule.js
 * Importação e exportação de backups de dados estruturados em arquivo JSON.
 * Suporta formatos legados e modulares com recarga automática do Canvas.
 */
import { BaseModule } from '../BaseModule.js';
import { dbManager } from '../../core/DB.js';
import { bus } from '../../core/EventBus.js';
import { Icons, createButtonContent } from '../../core/IconHelper.js';

export default class PortabilityModule extends BaseModule {
  constructor() {
    super('portability', 'Portabilidade');
  }

  init() {
    const containerBotoes = document.getElementById("container-portabilidade-botoes") || document.getElementById("container-gerenciamento-botoes");
    if (!containerBotoes) return;

    // Input de arquivo invisível
    const hiddenInput = document.createElement("input");
    hiddenInput.type = "file";
    hiddenInput.accept = ".json,application/json";
    hiddenInput.style.display = "none";
    hiddenInput.onchange = (e) => this.tratarArquivoImportado(e);
    containerBotoes.appendChild(this.TRACK_UI(hiddenInput));

    // Botão Importar (aciona o input de arquivo diretamente ao clicar)
    const btnImportar = document.createElement("button");
    btnImportar.type = "button";
    btnImportar.id = "btn-import-json";
    btnImportar.className = "btn btn-secondary";
    btnImportar.innerHTML = createButtonContent('upload', 'Importar');
    btnImportar.title = "Importar arquivo de backup JSON";
    btnImportar.onclick = (e) => {
      e.preventDefault();
      hiddenInput.value = "";
      hiddenInput.click();
    };
    containerBotoes.appendChild(this.TRACK_UI(btnImportar));

    // Botão Exportar
    const btnExportar = document.createElement("button");
    btnExportar.type = "button";
    btnExportar.id = "btn-export-json";
    btnExportar.className = "btn btn-secondary";
    btnExportar.innerHTML = createButtonContent('download', 'Exportar');
    btnExportar.title = "Exportar todos os blocos em arquivo JSON";
    btnExportar.onclick = (e) => {
      e.preventDefault();
      this.tratarExportacaoCompleta();
    };
    containerBotoes.appendChild(this.TRACK_UI(btnExportar));
  }

  async tratarExportacaoCompleta() {
    try {
      const payloadExportacao = {
        metadata: {
          versao: "2.0.0",
          timestamp: Date.now(),
          brand: localStorage.getItem("app_brand_title") || "Naruto RPG"
        },
        blocos: {}
      };

      for (let i = 0; i < localStorage.length; i++) {
        const chave = localStorage.key(i);
        if (chave.startsWith("data_") && chave !== "data_brand_title" && chave !== "data_modules_state" && chave !== "app_modules_state" && chave !== "app_custom_modules" && chave !== "app_canvas_dimensions") {
          try {
            payloadExportacao.blocos[chave] = JSON.parse(localStorage.getItem(chave));
          } catch (e) {
            console.warn("Chave ignorada no payload:", chave);
          }
        }
      }

      const blob = new Blob([JSON.stringify(payloadExportacao, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `canvas_studio_backup_${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Falha ao exportar arquivo JSON:", err);
      alert("Erro ao exportar dados.");
    }
  }

  tratarArquivoImportado(event) {
    const arquivo = event.target.files[0];
    if (!arquivo) return;

    const leitor = new FileReader();
    leitor.onload = (e) => {
      try {
        const conteudo = JSON.parse(e.target.result);
        if (!conteudo) {
          throw new Error("Arquivo vazio ou inválido.");
        }

        const confirmacao = confirm("Deseja importar este backup? Os blocos serão carregados no Canvas.");
        if (!confirmacao) return;

        let blocosImportados = {};
        let brandTitle = null;

        if (conteudo.blocos && typeof conteudo.blocos === 'object') {
          // Formato modular moderno: { metadata: {...}, blocos: { data_...: {...} } }
          blocosImportados = conteudo.blocos;
          brandTitle = conteudo.metadata?.brand;
        } else if (Array.isArray(conteudo)) {
          // Formato legado em Array (oldestscript.js): [ { type: "text", ... }, ... ]
          conteudo.forEach((item, idx) => {
            const uid = item.imgId || item.id || `import_${Date.now()}_${idx}`;
            const key = uid.startsWith('data_') ? uid : `data_${uid}`;
            blocosImportados[key] = item;
          });
        } else if (typeof conteudo === 'object') {
          // Formato de dicionário direto: { data_1: {...}, data_2: {...} }
          Object.entries(conteudo).forEach(([k, v]) => {
            if (k === 'metadata' || k === 'app_brand_title') {
              if (v?.brand) brandTitle = v.brand;
            } else {
              const key = k.startsWith('data_') ? k : `data_${k}`;
              blocosImportados[key] = v;
            }
          });
        }

        const totalChaves = Object.keys(blocosImportados).length;
        if (totalChaves === 0) {
          alert("Nenhum bloco válido encontrado no arquivo JSON.");
          return;
        }

        // Grava os blocos no localStorage
        Object.entries(blocosImportados).forEach(([chave, valor]) => {
          localStorage.setItem(chave, typeof valor === 'string' ? valor : JSON.stringify(valor));
        });

        if (brandTitle) {
          localStorage.setItem("app_brand_title", brandTitle);
          const brandEl = document.getElementById("brand-title");
          if (brandEl) brandEl.innerText = brandTitle;
        }

        // Emite o evento global para sincronizar o Canvas na hora
        bus.emit('canvas:reload-request');

        alert(`✅ ${totalChaves} bloco(s) importado(s) com sucesso!`);
      } catch (err) {
        console.error("Falha ao importar JSON:", err);
        alert("❌ Erro na leitura do arquivo de backup JSON.");
      }
      event.target.value = "";
    };
    leitor.readAsText(arquivo);
  }
}