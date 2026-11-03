/**
 * MODULES: PortabilityModule.js
 * Importação e exportação de backups de dados estruturados em arquivo JSON.
 * Suporta formatos legados e modulares com recarga automática do Canvas.
 */
import { BaseModule } from '../BaseModule.js';
import { dbManager } from '../../core/DB.js';
import { bus } from '../../core/EventBus.js';
import { GitHubSync } from '../../core/GitHubSync.js';
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

  /**
   * Abre o diálogo de destino da exportação:
   * pasta "json" do projeto, outra pasta local ou download padrão.
   */
  tratarExportacaoCompleta() {
    document.getElementById("export-json-modal")?.remove();

    const temFSA = typeof window.showDirectoryPicker === "function";
    const gh = GitHubSync.isConfigured() ? GitHubSync.getConfig() : null;
    const modal = document.createElement("div");
    modal.id = "export-json-modal";
    modal.className = "custom-modal";
    modal.style.display = "flex";
    modal.innerHTML = `
      <div class="modal-content" style="width: 420px;">
        <div class="modal-header">
          <h3>Exportar backup JSON</h3>
          <button type="button" class="btn-close-style" data-destino="fechar" title="Fechar">${Icons.close}</button>
        </div>
        <div style="display:flex; flex-direction:column; gap:10px;">
          ${gh ? `<button type="button" class="btn btn-primary" data-destino="github" style="justify-content:center;">Enviar para o GitHub (${gh.repo}/${gh.folder})</button>` : ""}
          <button type="button" class="btn ${gh ? "btn-secondary" : "btn-primary"}" data-destino="projeto" style="justify-content:center;" ${temFSA ? "" : "disabled"}>Salvar na pasta "json" do projeto</button>
          <button type="button" class="btn btn-secondary" data-destino="pasta" style="justify-content:center;" ${temFSA ? "" : "disabled"}>Escolher outra pasta local…</button>
          <button type="button" class="btn btn-secondary" data-destino="download" style="justify-content:center;">Baixar arquivo (Downloads)</button>
          <small style="opacity:.7; line-height:1.4;">
            ${gh ? "" : "Para enviar ao GitHub, cadastre o token em Configurações. "}
            ${temFSA
              ? 'Na opção do projeto, selecione a <b>raiz do projeto</b>; a subpasta <code>json</code> será criada se não existir.'
              : 'Seu navegador não suporta escolher pastas (use Chrome ou Edge).'}
          </small>
        </div>
      </div>`;

    const fechar = () => modal.remove();
    modal.addEventListener("click", async (e) => {
      if (e.target === modal) return fechar();
      const destino = e.target.closest("[data-destino]")?.dataset.destino;
      if (!destino) return;
      fechar();
      if (destino !== "fechar") await this.exportarPara(destino);
    });
    document.body.appendChild(modal);
  }

  async exportarPara(destino) {
    try {
      const json = JSON.stringify(this.montarPayloadExportacao(), null, 2);
      const nomeArquivo = `${this.prefixoDoTitulo()}canvas_studio_backup_${Date.now()}.json`;

      if (destino === "download") {
        this.baixarArquivo(json, nomeArquivo);
        return;
      }

      if (destino === "github") {
        const url = await GitHubSync.uploadJSON(nomeArquivo, json);
        alert(`✅ Backup enviado ao GitHub:\n${url}`);
        return;
      }

      let pasta = await window.showDirectoryPicker({ id: "canvas-studio-export", mode: "readwrite" });
      if (destino === "projeto" && pasta.name.toLowerCase() !== "json") {
        pasta = await pasta.getDirectoryHandle("json", { create: true });
      }

      const arquivo = await pasta.getFileHandle(nomeArquivo, { create: true });
      const escrita = await arquivo.createWritable();
      await escrita.write(json);
      await escrita.close();
      alert(`✅ Backup salvo em "${pasta.name}/${nomeArquivo}".`);
    } catch (err) {
      if (err?.name === "AbortError") return; // usuário cancelou o seletor de pasta
      console.error("Falha ao exportar arquivo JSON:", err);
      alert("Erro ao exportar dados: " + (err?.message || err));
    }
  }

  /**
   * Converte o título do projeto em prefixo seguro de arquivo.
   * Ex.: "Age of Empires 4" -> "Age_of_Empires_4_"
   */
  prefixoDoTitulo() {
    const titulo = document.getElementById("brand-title")?.innerText
      || localStorage.getItem("app_brand_title")
      || "";
    const limpo = titulo
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    return limpo ? `${limpo}_` : "";
  }

  baixarArquivo(conteudo, nomeArquivo) {
    const blob = new Blob([conteudo], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nomeArquivo;
    link.click();
    URL.revokeObjectURL(url);
  }

  montarPayloadExportacao() {
    {
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

      return payloadExportacao;
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

        // Limpa blocos de dados anteriores do localStorage para carregar o backup fielmente
        Object.keys(localStorage).forEach(chave => {
          if (chave.startsWith("data_") && chave !== "data_brand_title" && chave !== "data_modules_state" && chave !== "app_modules_state" && chave !== "app_custom_modules" && chave !== "app_canvas_dimensions") {
            localStorage.removeItem(chave);
          }
        });

        // Grava os novos blocos no localStorage garantindo o prefixo data_
        Object.entries(blocosImportados).forEach(([chave, valor]) => {
          const key = chave.startsWith('data_') ? chave : `data_${chave}`;
          localStorage.setItem(key, typeof valor === 'string' ? valor : JSON.stringify(valor));
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