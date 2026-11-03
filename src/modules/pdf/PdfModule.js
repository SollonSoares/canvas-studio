/**
 * MODULES: PdfModule.js
 * Gerenciamento de blocos de PDF embutidos na janela do card com botão de download.
 * Suporta upload local, busca na pasta "outros" do GitHub ou URL pública,
 * persistindo o binário no IndexedDB (dbManager) para funcionamento offline.
 */
import { BaseModule } from '../BaseModule.js';
import { dbManager } from '../../core/DB.js';
import { GitHubSync } from '../../core/GitHubSync.js';
import { Icons, createButtonContent } from '../../core/IconHelper.js';

export default class PdfModule extends BaseModule {
  constructor() {
    super('pdf', 'Módulo de PDF');
  }

  init() {
    const containerBotoes = document.getElementById("container-criacao-botoes") || document.getElementById("container-gerenciamento-botoes");
    if (!containerBotoes) return;

    const hiddenInput = document.createElement("input");
    hiddenInput.type = "file";
    hiddenInput.accept = ".pdf,application/pdf";
    hiddenInput.style.display = "none";
    containerBotoes.appendChild(this.TRACK_UI(hiddenInput));

    const btnAddPdf = document.createElement("button");
    btnAddPdf.type = "button";
    btnAddPdf.id = "btn-add-pdf";
    btnAddPdf.className = "btn btn-secondary";
    btnAddPdf.innerHTML = createButtonContent('pdf', 'Inserir PDF');
    btnAddPdf.title = "Insere um documento PDF embutido no card com botão para baixar";
    btnAddPdf.onclick = (e) => {
      e.preventDefault();
      this.abrirModalInserirPdf(hiddenInput);
    };
    containerBotoes.appendChild(this.TRACK_UI(btnAddPdf));
  }

  abrirModalInserirPdf(hiddenInput) {
    document.getElementById("insert-pdf-modal")?.remove();

    const gh = GitHubSync.getConfig();
    const modal = document.createElement("div");
    modal.id = "insert-pdf-modal";
    modal.className = "custom-modal";
    modal.style.display = "flex";
    modal.innerHTML = `
      <div class="modal-content" style="width: 440px;">
        <div class="modal-header">
          <h3>${Icons.pdf} Inserir Documento PDF</h3>
          <button type="button" class="btn-close-style" data-pdf-origem="fechar" title="Fechar">${Icons.close}</button>
        </div>
        <div id="insert-pdf-body" style="display:flex; flex-direction:column; gap:10px;"></div>
      </div>`;

    const corpo = modal.querySelector("#insert-pdf-body");
    const fechar = () => modal.remove();

    const mostrarOpcoes = () => {
      corpo.innerHTML = `
        <button type="button" class="btn btn-primary" data-pdf-origem="arquivo" style="justify-content:center;">Escolher arquivo PDF do computador…</button>
        <button type="button" class="btn btn-secondary" data-pdf-origem="github" style="justify-content:center;">Buscar na pasta "outros" do GitHub (${gh.repo}/outros)</button>
        <button type="button" class="btn btn-secondary" data-pdf-origem="url" style="justify-content:center;">Informar URL de um PDF…</button>
        <small style="opacity:.7; line-height:1.4;">
          O PDF ficará embutido dentro da janela do bloco no Canvas, com botão direto para baixar o arquivo.
        </small>`;
    };

    const abrirListaGitHub = async () => {
      corpo.innerHTML = `<small style="opacity:.7;">Buscando PDFs em ${gh.repo}/outros…</small>`;
      try {
        const arquivos = await GitHubSync.listFolder("outros", /\.pdf$/i);
        corpo.innerHTML = `<span class="section-title">${gh.repo}/outros</span>`;
        if (arquivos.length === 0) {
          corpo.insertAdjacentHTML("beforeend", `<small style="opacity:.7;">Nenhum arquivo .pdf encontrado na pasta "outros".</small>`);
        }
        const lista = document.createElement("div");
        lista.style.cssText = "display:flex; flex-direction:column; gap:6px; max-height:280px; overflow-y:auto;";
        arquivos.forEach(arq => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "btn btn-secondary";
          b.style.cssText = "justify-content:flex-start; text-align:left; word-break:break-all;";
          b.textContent = arq.name;
          b.onclick = async () => {
            b.disabled = true;
            b.textContent = `Baixando ${arq.name}…`;
            try {
              const dataUrl = await GitHubSync.downloadDataURL(arq.path, "application/pdf");
              fechar();
              await this.adicionarNovoPdf({
                title: arq.name.replace(/\.pdf$/i, ""),
                filename: arq.name,
                url: arq.download_url || "",
                dataUrl
              });
            } catch (err) {
              alert("❌ Falha ao carregar PDF do GitHub: " + (err?.message || err));
              mostrarOpcoes();
            }
          };
          lista.appendChild(b);
        });
        corpo.appendChild(lista);

        const voltar = document.createElement("button");
        voltar.type = "button";
        voltar.className = "btn btn-secondary";
        voltar.style.justifyContent = "center";
        voltar.textContent = "Voltar";
        voltar.onclick = mostrarOpcoes;
        corpo.appendChild(voltar);
      } catch (err) {
        alert("❌ " + (err?.message || err));
        mostrarOpcoes();
      }
    };

    modal.addEventListener("click", (e) => {
      if (e.target === modal) return fechar();
      const origem = e.target.closest("[data-pdf-origem]")?.dataset.pdfOrigem;
      if (!origem) return;

      if (origem === "fechar") {
        fechar();
      } else if (origem === "arquivo") {
        fechar();
        hiddenInput.value = "";
        hiddenInput.onchange = (ev) => {
          const arq = ev.target.files?.[0];
          ev.target.value = "";
          if (!arq) return;
          const leitor = new FileReader();
          leitor.onload = async () => {
            await this.adicionarNovoPdf({
              title: arq.name.replace(/\.pdf$/i, ""),
              filename: arq.name,
              url: "",
              dataUrl: String(leitor.result || "")
            });
          };
          leitor.readAsDataURL(arq);
        };
        hiddenInput.click();
      } else if (origem === "github") {
        abrirListaGitHub();
      } else if (origem === "url") {
        fechar();
        const url = prompt("Insira a URL pública do arquivo PDF:");
        if (!url || !url.trim()) return;
        const limpo = url.trim();
        const nomeExtraido = decodeURIComponent(limpo.split("/").pop()?.split("?")[0] || "documento.pdf");
        const filename = /\.pdf$/i.test(nomeExtraido) ? nomeExtraido : `${nomeExtraido}.pdf`;
        this.adicionarNovoPdf({
          title: filename.replace(/\.pdf$/i, ""),
          filename,
          url: limpo,
          dataUrl: null
        });
      }
    });

    mostrarOpcoes();
    document.body.appendChild(modal);
  }

  async adicionarNovoPdf({ title, filename, url, dataUrl }) {
    const uid = "pdf_" + Date.now();
    if (dataUrl && dbManager && typeof dbManager.salvarImagemIndexedDB === "function") {
      await dbManager.salvarImagemIndexedDB(uid, dataUrl).catch(() => {});
    }
    this.criarBloco(uid, "top:120px; left:120px; width:420px; height:500px;", {
      title: title || "Documento PDF",
      filename: filename || "documento.pdf",
      url: url || "",
      dataUrl: dataUrl || null
    });
  }

  /** Converte um DataURL (data:application/pdf;base64,...) em Blob URL para renderizar rápido no iframe. */
  _dataUrlParaBlobUrl(dataUrl) {
    try {
      const partes = String(dataUrl).split(",");
      const bin = atob(partes[1] || "");
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      return URL.createObjectURL(blob);
    } catch {
      return dataUrl;
    }
  }

  criarBloco(id, style, dadosIniciais) {
    const canvasContainer = window.CanvasManager?.getContainer ? window.CanvasManager.getContainer() : (document.getElementById("canvas-stage") || document.getElementById("canvas"));
    if (!canvasContainer) return;

    const blocoAntigo = document.getElementById("block_" + id);
    if (blocoAntigo) blocoAntigo.remove();

    const div = document.createElement("div");
    div.className = "draggable";
    div.id = "block_" + id;
    div.dataset.id = id;
    div.dataset.type = "pdf";

    if (dadosIniciais?.width) div.style.width = typeof dadosIniciais.width === "number" ? `${dadosIniciais.width}px` : dadosIniciais.width;
    if (dadosIniciais?.height) div.style.height = typeof dadosIniciais.height === "number" ? `${dadosIniciais.height}px` : dadosIniciais.height;
    if (dadosIniciais?.top) div.style.top = typeof dadosIniciais.top === "number" ? `${dadosIniciais.top}px` : dadosIniciais.top;
    if (dadosIniciais?.left) div.style.left = typeof dadosIniciais.left === "number" ? `${dadosIniciais.left}px` : dadosIniciais.left;
    if (style && (!dadosIniciais?.top || !dadosIniciais?.left)) {
      div.style.cssText += style;
    }

    const titulo = dadosIniciais?.title || "Documento PDF";
    const urlRemota = dadosIniciais?.url || "";
    const nomeArquivo = dadosIniciais?.filename || `${titulo.replace(/[^A-Za-z0-9_-]+/g, "_") || "documento"}.pdf`;

    div.innerHTML = `
      <div class="drag-handle">
        <span class="drag-handle-grip">${Icons.grip}</span>
        <input class="title-input" value="${titulo}" placeholder="Título do PDF...">
        <button type="button" class="btn-download-pdf" title="Baixar PDF" style="width:auto; min-height:24px; padding:3px 8px; font-size:11px; gap:4px; background:var(--accent); color:#fff; border:none; border-radius:var(--radius-sm); cursor:pointer; display:inline-flex; align-items:center; flex-shrink:0;">
          ${Icons.download}
          <span>Baixar</span>
        </button>
        <span class="close-btn" title="Excluir">${Icons.close}</span>
      </div>
      <div class="pdf-wrapper" style="width:100%; height:calc(100% - 36px); padding:6px; box-sizing:border-box; display:flex; flex-direction:column;">
        <iframe id="pdf_view_${id}" title="${titulo}" style="width:100%; height:100%; border:1px solid var(--border-subtle); border-radius:var(--radius-sm); background:#1e1e1e;"></iframe>
      </div>
    `;

    const iframe = div.querySelector(`#pdf_view_${id}`);
    let blobUrlAtivo = null;
    let dataUrlEmMemoria = dadosIniciais?.dataUrl || null;

    const aplicarFonteNoIframe = (dataUrlOuRemoto) => {
      if (!iframe) return;
      if (blobUrlAtivo) {
        URL.revokeObjectURL(blobUrlAtivo);
        blobUrlAtivo = null;
      }
      if (dataUrlOuRemoto && dataUrlOuRemoto.startsWith("data:")) {
        blobUrlAtivo = this._dataUrlParaBlobUrl(dataUrlOuRemoto);
        iframe.src = blobUrlAtivo;
      } else if (dataUrlOuRemoto) {
        iframe.src = dataUrlOuRemoto;
      }
    };

    if (dataUrlEmMemoria) {
      aplicarFonteNoIframe(dataUrlEmMemoria);
    } else if (dbManager && typeof dbManager.obterImagemIndexedDB === "function") {
      dbManager.obterImagemIndexedDB(id).then(cachedData => {
        if (cachedData) {
          dataUrlEmMemoria = cachedData;
          aplicarFonteNoIframe(cachedData);
        } else if (urlRemota) {
          aplicarFonteNoIframe(urlRemota);
        }
      }).catch(() => {
        if (urlRemota) aplicarFonteNoIframe(urlRemota);
      });
    } else if (urlRemota) {
      aplicarFonteNoIframe(urlRemota);
    }

    // Se veio por URL externa, tenta fazer cache no IndexedDB em background
    if (!dataUrlEmMemoria && urlRemota && !urlRemota.startsWith("data:") && !urlRemota.startsWith("blob:")) {
      fetch(urlRemota, { mode: "cors" })
        .then(r => (r.ok ? r.blob() : null))
        .then(blob => {
          if (!blob) return;
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result) {
              dataUrlEmMemoria = String(reader.result);
              if (dbManager) dbManager.salvarImagemIndexedDB(id, dataUrlEmMemoria).catch(() => {});
              aplicarFonteNoIframe(dataUrlEmMemoria);
            }
          };
          reader.readAsDataURL(blob);
        })
        .catch(() => {});
    }

    // Botão de Baixar PDF
    const btnDownload = div.querySelector(".btn-download-pdf");
    btnDownload.onclick = (e) => {
      e.stopPropagation();
      const tituloAtual = (div.querySelector(".title-input")?.value || titulo).trim();
      const nomeDownload = /\.pdf$/i.test(tituloAtual)
        ? tituloAtual
        : `${tituloAtual.replace(/[^A-Za-z0-9À-ÿ _-]+/g, "_") || nomeArquivo.replace(/\.pdf$/i, "")}.pdf`;

      const href = blobUrlAtivo || dataUrlEmMemoria || urlRemota;
      if (!href) {
        alert("⚠️ Conteúdo do PDF indisponível para download.");
        return;
      }
      const a = document.createElement("a");
      a.href = href;
      a.download = nomeDownload;
      a.target = "_blank";
      a.rel = "noopener";
      a.click();
    };

    const salvarEstado = () => {
      localStorage.setItem("data_" + id, JSON.stringify({
        top: div.style.top,
        left: div.style.left,
        width: div.offsetWidth,
        height: div.offsetHeight,
        type: "pdf",
        title: div.querySelector(".title-input").value,
        filename: nomeArquivo,
        url: urlRemota
      }));
    };

    div.addEventListener("input", salvarEstado);
    div.querySelector(".close-btn").onclick = () => {
      if (blobUrlAtivo) URL.revokeObjectURL(blobUrlAtivo);
      localStorage.removeItem("data_" + id);
      if (dbManager && typeof dbManager.removerImagemIndexedDB === "function") {
        dbManager.removerImagemIndexedDB(id);
      }
      div.remove();
    };

    window.CanvasManager.makeDraggable(div, () => salvarEstado());
    canvasContainer.appendChild(div);

    if (window.ResizeModule && typeof window.ResizeModule.atribuirResize === "function") {
      window.ResizeModule.atribuirResize(div);
    }

    salvarEstado();
  }
}
