/**
 * MODULES: ExportModule.js
 * Motor de exportação visual em alta resolução (PNG 1x/2x/4x Retina e PDF).
 * Suporta auto-crop inteligente, DPI scaling, temas de fundo e gerador de PDF nativo.
 */
import { BaseModule } from '../BaseModule.js';
import { dbManager } from '../../core/DB.js';
import { Icons, createButtonContent } from '../../core/IconHelper.js';
import { PDFBuilder } from './PDFBuilder.js';

export default class ExportModule extends BaseModule {
  constructor() {
    super('export', 'Exportação Visual');
    this.modal = null;
  }

  init() {
    const containerPortabilidade = document.getElementById("container-portabilidade-botoes") || document.getElementById("container-gerenciamento-botoes");
    if (containerPortabilidade) {
      const btnExportImage = document.createElement("button");
      btnExportImage.id = "btn-export-visual";
      btnExportImage.className = "btn btn-secondary";
      btnExportImage.style.gridColumn = "span 2"; // Ocupa a linha inteira no grid de 2 colunas
      btnExportImage.innerHTML = createButtonContent('camera', 'Exportar PNG / PDF');
      btnExportImage.title = "Exportar o Canvas em alta resolução (1x, 2x Retina, 4x Ultra HD ou PDF)";
      btnExportImage.onclick = (e) => {
        e.preventDefault();
        this.abrirModalExportacao();
      };
      containerPortabilidade.appendChild(this.TRACK_UI(btnExportImage));
    }

    this.construirModalExportacao();
  }

  destroy() {
    super.destroy();
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
  }

  construirModalExportacao() {
    if (document.getElementById("export-modal")) {
      document.getElementById("export-modal").remove();
    }

    const modal = document.createElement("div");
    modal.id = "export-modal";
    modal.className = "custom-modal";
    modal.style.display = "none";

    modal.innerHTML = `
      <div class="modal-content" style="width: 440px;">
        <div class="modal-header">
          <h3>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
            Exportação Visual em Alta Resolução
          </h3>
          <button id="btn-close-export-modal" class="btn-close-style" title="Fechar">
            ${Icons.close}
          </button>
        </div>

        <div class="export-options-body" style="display: flex; flex-direction: column; gap: 14px;">
          
          <!-- Seletor de Formato -->
          <div class="option-group">
            <span class="section-title">FORMATO DO ARQUIVO</span>
            <div class="segmented-control" id="export-format-control">
              <button type="button" class="segment-btn active" data-value="png">PNG (Imagem)</button>
              <button type="button" class="segment-btn" data-value="pdf">PDF (Documento)</button>
              <button type="button" class="segment-btn" data-value="jpeg">JPEG (Comprimido)</button>
            </div>
          </div>

          <!-- Seletor de Resolução / Escala -->
          <div class="option-group">
            <span class="section-title">RESOLUÇÃO / ESCALA</span>
            <div class="segmented-control" id="export-scale-control">
              <button type="button" class="segment-btn" data-value="1">1x (Web)</button>
              <button type="button" class="segment-btn active" data-value="2">2x (Retina HD)</button>
              <button type="button" class="segment-btn" data-value="4">4x (Ultra HD / Impressão)</button>
            </div>
          </div>

          <!-- Opções de Estilização de Fundo -->
          <div class="option-group">
            <span class="section-title">ESTILO DE FUNDO</span>
            <div class="segmented-control" id="export-bg-control">
              <button type="button" class="segment-btn active" data-value="dark">Escuro</button>
              <button type="button" class="segment-btn" data-value="light">Claro</button>
              <button type="button" class="segment-btn" data-value="transparent">Transparente</button>
            </div>
          </div>

          <!-- Opções Adicionais de Grade e Enquadramento -->
          <div class="option-group" style="display: flex; flex-direction: column; gap: 8px;">
            <span class="section-title">ENQUADRAMENTO & DETALHES</span>
            
            <label style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-input); padding: 8px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); cursor: pointer;">
              <span style="font-size: 12px; color: var(--text-main);">Auto-Crop (Área útil dos blocos)</span>
              <input type="checkbox" id="chk-export-autocrop" checked style="accent-color: var(--accent); cursor: pointer;">
            </label>

            <label style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-input); padding: 8px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); cursor: pointer;">
              <span style="font-size: 12px; color: var(--text-main);">Apêndice de Textos Expandidos</span>
              <input type="checkbox" id="chk-export-appendix" checked style="accent-color: var(--accent); cursor: pointer;">
            </label>

            <label style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-input); padding: 8px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); cursor: pointer;">
              <span style="font-size: 12px; color: var(--text-main);">Incluir Grade de Pontos (20px)</span>
              <input type="checkbox" id="chk-export-grid" checked style="accent-color: var(--accent); cursor: pointer;">
            </label>
          </div>

          <!-- Resumo das Dimensões Estimadas -->
          <div id="export-summary-box" style="font-size: 11px; color: var(--text-muted); background: var(--bg-input); padding: 8px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle); text-align: center;">
            Estimando dimensões...
          </div>

          <!-- Botão de Ação Primária -->
          <button id="btn-trigger-render-export" class="btn btn-primary" style="justify-content: center; height: 42px; font-size: 13px;">
            <span class="btn-icon">${Icons.download}</span>
            <span class="btn-label" id="btn-export-label">Gerar e Baixar Arquivo</span>
          </button>

        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.modal = modal;

    // Configura botões de controle segmentado (tabs de escolha)
    modal.querySelectorAll('.segmented-control').forEach(control => {
      control.querySelectorAll('.segment-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          control.querySelectorAll('.segment-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.atualizarResumoDimensoes();
        });
      });
    });

    // Checkboxes
    modal.querySelector('#chk-export-autocrop')?.addEventListener('change', () => this.atualizarResumoDimensoes());
    modal.querySelector('#chk-export-appendix')?.addEventListener('change', () => this.atualizarResumoDimensoes());
    modal.querySelector('#chk-export-grid')?.addEventListener('change', () => this.atualizarResumoDimensoes());

    // Botão Fechar
    modal.querySelector('#btn-close-export-modal')?.addEventListener('click', () => {
      modal.style.display = 'none';
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });

    // Botão de Execução
    modal.querySelector('#btn-trigger-render-export')?.addEventListener('click', () => {
      this.executarExportacao();
    });
  }

  abrirModalExportacao() {
    if (!this.modal) this.construirModalExportacao();
    
    const canvas = document.getElementById("canvas");
    const blocos = canvas ? canvas.querySelectorAll(".draggable") : [];
    
    if (blocos.length === 0) {
      alert("⚠️ Nenhum bloco ativo no Canvas para exportar.");
      return;
    }

    this.modal.style.display = "flex";
    this.atualizarResumoDimensoes();
  }

  /**
   * Coleta todos os subcampos com texto ou tabelas que possuem rolagem interna / overflow.
   * Utiliza medição real de renderização no canvas virtual para evitar falsos positivos.
   */
  coletarAnexosExpandidos() {
    const canvas = document.getElementById("canvas");
    if (!canvas) return [];

    const blocos = Array.from(canvas.querySelectorAll('.draggable[data-type="text"]'))
      .filter(b => b.style.display !== "none");

    const anexos = [];

    // Canvas virtual para medição precisa de altura renderizada total
    const measureCanvas = document.createElement("canvas");
    measureCanvas.width = 1200;
    measureCanvas.height = 30000;
    const measureCtx = measureCanvas.getContext("2d");

    blocos.forEach(bloco => {
      const titleInput = bloco.querySelector(".title-input");
      const blockTitle = (titleInput ? titleInput.value : "Anotações").trim() || "Anotações";
      const listaCampos = bloco.querySelector(".lista-campos");
      if (!listaCampos) return;

      const bw = bloco.offsetWidth || 200;
      const bh = bloco.offsetHeight || 150;
      const availableVisualHeight = bh - 42; // Altura útil dentro do card no palco visual

      // 1. Verifica se algum elemento interno tem overflow explícito (<pre>, elementos com max-height ou scroll)
      const preElements = Array.from(listaCampos.querySelectorAll("pre, code, [style*='overflow'], [style*='max-height']"));
      const hasInternalScroll = preElements.some(el => {
        const hasScroll = (el.scrollHeight > el.clientHeight + 10);
        const hasMaxH = el.style?.maxHeight && (parseInt(el.style.maxHeight) < el.scrollHeight - 5);
        return hasScroll || hasMaxH;
      });

      // 2. Mede a altura real de renderização do conteúdo TOTALmente expandido (sem cortes de max-height)
      const renderedEndY = this.desenharConteudoTextoNoCanvas(measureCtx, listaCampos, 0, 0, bw - 24, false, true);
      const renderedContentHeight = renderedEndY;

      // 3. Verifica se a listaCampos do DOM tem scroll real
      const hasListScroll = listaCampos.scrollHeight > (listaCampos.clientHeight + 20);

      // O bloco precisa de apêndice se o conteúdo total exceder o espaço visual ou houver scroll interno
      const isOverflowing = hasInternalScroll || hasListScroll || (renderedContentHeight > (availableVisualHeight + 15));

      if (isOverflowing) {
        anexos.push({
          blockId: bloco.dataset.id || bloco.id,
          blockTitle,
          refTag: blockTitle,
          element: listaCampos
        });
      }
    });

    return anexos;
  }

  calcularBoundingBox() {
    const canvas = document.getElementById("canvas");
    const blocos = Array.from(canvas.querySelectorAll(".draggable")).filter(b => b.style.display !== "none");
    
    if (blocos.length === 0) {
      return { x: 0, y: 0, width: 800, height: 600, padding: 40 };
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    blocos.forEach(bloco => {
      const x = bloco.offsetLeft;
      const y = bloco.offsetTop;
      const w = bloco.offsetWidth || 200;
      const h = bloco.offsetHeight || 150;

      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x + w > maxX) maxX = x + w;
      if (y + h > maxY) maxY = y + h;
    });

    const padding = 40;
    const largura = Math.max(200, maxX - minX + padding * 2);
    const altura = Math.max(150, maxY - minY + padding * 2);

    return {
      minX: Math.max(0, minX - padding),
      minY: Math.max(0, minY - padding),
      width: largura,
      height: altura,
      padding: padding
    };
  }

  atualizarResumoDimensoes() {
    const summaryBox = this.modal?.querySelector("#export-summary-box");
    if (!summaryBox) return;

    const scale = parseInt(this.modal.querySelector('#export-scale-control .segment-btn.active')?.dataset.value) || 2;
    const formato = this.modal.querySelector('#export-format-control .segment-btn.active')?.dataset.value || "png";
    const autoCrop = this.modal.querySelector('#chk-export-autocrop')?.checked;
    const anexos = this.coletarAnexosExpandidos();

    let w, h;
    if (autoCrop) {
      const bbox = this.calcularBoundingBox();
      w = bbox.width;
      h = bbox.height;
    } else {
      const canvas = document.getElementById("canvas");
      w = canvas ? Math.max(canvas.scrollWidth, canvas.clientWidth) : 1200;
      h = canvas ? Math.max(canvas.scrollHeight, canvas.clientHeight) : 800;
    }

    const finalW = Math.round(w * scale);
    const finalH = Math.round(h * scale);
    const anexoInfo = anexos.length > 0 ? ` | <strong>${anexos.length} Anexo(s)</strong>` : '';

    summaryBox.innerHTML = `
      📐 Palco Visual: <strong>${finalW} × ${finalH} px</strong> (${scale}x) | Formato: <strong>${formato.toUpperCase()}</strong>${anexoInfo}
    `;
  }

  async executarExportacao() {
    const btnTrigger = this.modal.querySelector('#btn-trigger-render-export');
    const labelOriginal = this.modal.querySelector('#btn-export-label');
    
    if (btnTrigger && labelOriginal) {
      btnTrigger.disabled = true;
      labelOriginal.innerText = "Renderizando em Alta Definição...";
    }

    try {
      const formato = this.modal.querySelector('#export-format-control .segment-btn.active')?.dataset.value || "png";
      const scale = parseInt(this.modal.querySelector('#export-scale-control .segment-btn.active')?.dataset.value) || 2;
      const bgStyle = this.modal.querySelector('#export-bg-control .segment-btn.active')?.dataset.value || "dark";
      const autoCrop = this.modal.querySelector('#chk-export-autocrop')?.checked;
      const comGrade = this.modal.querySelector('#chk-export-grid')?.checked;
      const incluirApindice = this.modal.querySelector('#chk-export-appendix')?.checked !== false;

      const resultado = await this.renderizarCanvasParaBuffer({
        scale,
        bgStyle,
        autoCrop,
        comGrade,
        incluirApindice
      });

      const brandTitle = localStorage.getItem("app_brand_title") || "Naruto_RPG";
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filenameBase = `${brandTitle.replace(/\s+/g, '_')}_Canvas_${timestamp}`;

      if (formato === "pdf") {
        const paginasPDF = resultado.apBuffer ? [resultado.visualCanvas, resultado.apBuffer] : [resultado.visualCanvas];
        await this.baixarComoPDFMultiPagina(paginasPDF, `${filenameBase}.pdf`);
      } else {
        const mime = formato === "jpeg" ? "image/jpeg" : "image/png";
        const extensao = formato === "jpeg" ? "jpg" : "png";
        const targetCanvas = resultado.fullCanvas || resultado.visualCanvas;
        
        targetCanvas.toBlob((blob) => {
          if (!blob) {
            alert("Erro ao gerar arquivo de imagem.");
            return;
          }
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `${filenameBase}_${scale}x.${extensao}`;
          link.click();
          URL.revokeObjectURL(url);
        }, mime, 0.95);
      }

      this.modal.style.display = "none";
    } catch (err) {
      console.error("Falha ao exportar visual do Canvas:", err);
      alert("❌ Ocorreu um erro durante a renderização da exportação.");
    } finally {
      if (btnTrigger && labelOriginal) {
        btnTrigger.disabled = false;
        labelOriginal.innerText = "Gerar e Baixar Arquivo";
      }
    }
  }

  /**
   * Renderiza uma tabela HTML diretamente no contexto 2D com bordas, cabeçalhos e células estilizadas.
   */
  desenharTabelaNoCanvas(ctx, tableEl, startX, startY, maxW, isLight) {
    const rows = Array.from(tableEl.querySelectorAll("tr"));
    if (rows.length === 0) return startY;

    let curY = startY;
    const defaultRowH = 24;

    // Detecta número máximo de colunas
    let maxCols = 1;
    rows.forEach(r => {
      const cellCount = r.querySelectorAll("th, td").length;
      if (cellCount > maxCols) maxCols = cellCount;
    });

    const colW = maxW / maxCols;

    rows.forEach((row, rowIdx) => {
      const cells = Array.from(row.querySelectorAll("th, td"));
      const isHeader = row.querySelector("th") !== null || (rowIdx === 0 && row.parentElement?.tagName === "THEAD");
      const rowHeight = defaultRowH;

      // Fundo da Linha
      if (isHeader) {
        ctx.fillStyle = isLight ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.1)";
        ctx.fillRect(startX, curY, maxW, rowHeight);
      } else if (rowIdx % 2 === 1) {
        ctx.fillStyle = isLight ? "rgba(0, 0, 0, 0.02)" : "rgba(255, 255, 255, 0.03)";
        ctx.fillRect(startX, curY, maxW, rowHeight);
      }

      // Borda Externa da Linha
      ctx.strokeStyle = isLight ? "rgba(0, 0, 0, 0.15)" : "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1;
      ctx.strokeRect(startX, curY, maxW, rowHeight);

      // Células
      cells.forEach((cell, cellIdx) => {
        const cellX = startX + cellIdx * colW;

        // Borda divisória vertical da célula
        if (cellIdx > 0) {
          ctx.beginPath();
          ctx.moveTo(cellX, curY);
          ctx.lineTo(cellX, curY + rowHeight);
          ctx.stroke();
        }

        // Texto da célula
        const cellText = cell.innerText.trim();
        ctx.save();
        ctx.beginPath();
        ctx.rect(cellX + 2, curY, colW - 4, rowHeight);
        ctx.clip();

        ctx.fillStyle = isLight ? "#1d1d1f" : "#f0f2f8";
        ctx.font = isHeader ? "bold 11px -apple-system, sans-serif" : "11px -apple-system, sans-serif";
        ctx.textBaseline = "middle";
        ctx.textAlign = "left";
        ctx.fillText(cellText, cellX + 6, curY + rowHeight / 2);
        ctx.restore();
      });

      curY += rowHeight;
    });

    return curY + 8;
  }

  /**
   * Renderiza um bloco <pre> ou <code> preservando indentação, quebras e fundo de código.
   * Suporta quebra de linhas longas (word-wrap) e expansão total no apêndice.
   */
  desenharBlocoPre(ctx, preEl, startX, startY, maxW, isLight, expandirTotal = false) {
    let rawText = "";
    if (preEl.innerText !== undefined && preEl.innerText !== null) {
      rawText = preEl.innerText;
    } else {
      rawText = preEl.textContent || "";
    }

    // Normaliza espaços não quebráveis (&nbsp;)
    const cleanText = rawText.replace(/\u00a0/g, ' ');
    const padding = 10;
    const innerW = maxW - padding * 2;
    const lineHeight = 16;

    ctx.save();
    ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, Monaco, monospace";

    // Quebra o texto por quebras explícitas e por largura (word-wrap)
    const rawParagraphs = cleanText.split(/\r?\n/);
    const wrappedLines = [];

    rawParagraphs.forEach(parag => {
      if (parag === "") {
        wrappedLines.push("");
        return;
      }
      const words = parag.split(" ");
      let curLine = "";
      words.forEach(w => {
        if (!w) return;
        const testLine = curLine ? `${curLine} ${w}` : w;
        if (ctx.measureText(testLine).width <= innerW) {
          curLine = testLine;
        } else {
          if (curLine) {
            wrappedLines.push(curLine);
            curLine = "";
          }
          if (ctx.measureText(w).width <= innerW) {
            curLine = w;
          } else {
            // Palavra muito longa (sem espaços): quebra caractere por caractere
            let chunk = "";
            for (let char of w) {
              if (ctx.measureText(chunk + char).width > innerW) {
                wrappedLines.push(chunk);
                chunk = char;
              } else {
                chunk += char;
              }
            }
            curLine = chunk;
          }
        }
      });
      if (curLine) wrappedLines.push(curLine);
    });

    let blocoHeight = Math.max(30, wrappedLines.length * lineHeight + padding * 2);

    // Se for renderização no palco visual (não expandido) e tiver max-height inline (ex: 85px)
    const maxHeightStyle = preEl.style?.maxHeight ? parseInt(preEl.style.maxHeight) : null;
    if (!expandirTotal && maxHeightStyle && maxHeightStyle > 0) {
      blocoHeight = Math.min(blocoHeight, maxHeightStyle);
    }

    // Fundo do bloco <pre>
    ctx.fillStyle = isLight ? "rgba(0, 0, 0, 0.05)" : "rgba(0, 0, 0, 0.4)";
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(startX, startY, maxW, blocoHeight, 6);
    } else {
      ctx.rect(startX, startY, maxW, blocoHeight);
    }
    ctx.fill();

    ctx.strokeStyle = isLight ? "rgba(0, 0, 0, 0.15)" : "rgba(255, 255, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Se não for expandido, aplica clip para conter dentro do bloco
    ctx.save();
    if (!expandirTotal) {
      ctx.beginPath();
      ctx.rect(startX, startY, maxW, blocoHeight);
      ctx.clip();
    }

    ctx.fillStyle = isLight ? "#1d1d1f" : "#38ef7d";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";

    let textY = startY + padding;
    wrappedLines.forEach(linha => {
      ctx.fillText(linha, startX + padding, textY);
      textY += lineHeight;
    });

    ctx.restore();
    ctx.restore();
    return startY + blocoHeight + 10;
  }

  /**
   * Renderiza conteúdo de texto rico (WYSIWYG, pre, code, inline styles, tags b/i/u, listas e tabelas).
   */
  desenharConteudoTextoNoCanvas(ctx, container, startX, startY, maxW, isLight, expandirTotal = false) {
    let curY = startY;
    const subcampos = Array.from(container.querySelectorAll(".sub-campo"));

    const renderizarLinhasTexto = (texto, estilo = {}) => {
      const fontSize = estilo.fontSize || 12;
      const lineHeight = estilo.lineHeight || Math.round(fontSize * 1.35);
      const isBold = estilo.isBold || false;
      const isItalic = estilo.isItalic || false;
      const isMono = estilo.isMono || false;
      const color = estilo.color || (isLight ? "#1d1d1f" : "#f0f2f8");
      const align = estilo.align || "left";

      let fontStr = "";
      if (isBold) fontStr += "bold ";
      if (isItalic) fontStr += "italic ";
      fontStr += `${fontSize}px `;
      fontStr += isMono ? "ui-monospace, SFMono-Regular, monospace" : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

      ctx.save();
      ctx.fillStyle = color;
      ctx.font = fontStr;
      ctx.textBaseline = "top";
      ctx.textAlign = align;

      const cleanText = (texto || "").replace(/\u00a0/g, ' ');
      const rawParagraphs = cleanText.split(/\r?\n/);

      rawParagraphs.forEach(parag => {
        if (!parag.trim()) {
          curY += Math.round(lineHeight * 0.7);
          return;
        }

        const words = parag.split(" ");
        let curLine = "";

        words.forEach(w => {
          if (!w) return;
          const testLine = curLine ? `${curLine} ${w}` : w;
          if (ctx.measureText(testLine).width <= maxW) {
            curLine = testLine;
          } else {
            if (curLine) {
              const drawX = align === "center" ? (startX + maxW / 2) : startX;
              ctx.fillText(curLine, drawX, curY);
              curY += lineHeight;
              curLine = "";
            }
            if (ctx.measureText(w).width <= maxW) {
              curLine = w;
            } else {
              // Palavra muito longa: quebra caractere por caractere
              let chunk = "";
              for (let char of w) {
                if (ctx.measureText(chunk + char).width > maxW) {
                  const drawX = align === "center" ? (startX + maxW / 2) : startX;
                  ctx.fillText(chunk, drawX, curY);
                  curY += lineHeight;
                  chunk = char;
                } else {
                  chunk += char;
                }
              }
              curLine = chunk;
            }
          }
        });

        if (curLine) {
          const drawX = align === "center" ? (startX + maxW / 2) : startX;
          ctx.fillText(curLine, drawX, curY);
          curY += lineHeight;
        }
      });

      ctx.restore();
    };

    const processarNo = (no, estiloHerdado = {}) => {
      if (!no) return;

      // 1. Bloco <pre> ou <code>
      if (no.nodeType === Node.ELEMENT_NODE && (no.tagName === "PRE" || no.tagName === "CODE")) {
        curY = this.desenharBlocoPre(ctx, no, startX, curY, maxW, isLight, expandirTotal);
        return;
      }

      // 2. Elemento de Tabela <table>
      if (no.nodeType === Node.ELEMENT_NODE && no.tagName === "TABLE") {
        curY = this.desenharTabelaNoCanvas(ctx, no, startX, curY, maxW, isLight);
        return;
      }

      // 3. Quebra de Linha <br>
      if (no.nodeType === Node.ELEMENT_NODE && no.tagName === "BR") {
        curY += (estiloHerdado.lineHeight || 16);
        return;
      }

      // 4. Nó de texto puro
      if (no.nodeType === Node.TEXT_NODE) {
        const texto = no.textContent;
        if (texto && texto.trim()) {
          renderizarLinhasTexto(texto, estiloHerdado);
        }
        return;
      }

      // 5. Elemento HTML
      if (no.nodeType === Node.ELEMENT_NODE) {
        const style = no.style || {};
        const inlineEstilo = { ...estiloHerdado };

        // Extrai estilos inline (cor, peso, tamanho, alinhamento, itálico)
        if (style.color) inlineEstilo.color = style.color;
        if (style.fontSize) inlineEstilo.fontSize = parseInt(style.fontSize) || inlineEstilo.fontSize;
        if (style.fontWeight === "bold" || parseInt(style.fontWeight) >= 600 || no.tagName === "B" || no.tagName === "STRONG") {
          inlineEstilo.isBold = true;
        }
        if (style.fontStyle === "italic" || no.tagName === "I" || no.tagName === "EM") {
          inlineEstilo.isItalic = true;
        }
        if (style.textAlign) inlineEstilo.align = style.textAlign;
        if (no.tagName === "CODE" || style.fontFamily?.includes("monospace")) {
          inlineEstilo.isMono = true;
        }

        // Se o elemento tiver background ou borda inline customizada
        const hasBg = style.backgroundColor && style.backgroundColor !== "transparent" && style.backgroundColor !== "rgba(0, 0, 0, 0)";
        const hasBorder = style.border && style.border !== "none";

        if (hasBg || hasBorder) {
          const rawText = no.innerText || no.textContent || "";
          const lineCount = Math.max(1, rawText.split("\n").length);
          const boxHeight = Math.max(26, lineCount * 18 + 10);

          ctx.save();
          if (hasBg) {
            ctx.fillStyle = style.backgroundColor;
            const rad = parseInt(style.borderRadius) || 4;
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
              ctx.roundRect(startX, curY, maxW, boxHeight, rad);
            } else {
              ctx.rect(startX, curY, maxW, boxHeight);
            }
            ctx.fill();
          }

          if (hasBorder) {
            ctx.strokeStyle = style.borderColor || (isLight ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)");
            ctx.lineWidth = parseInt(style.borderWidth) || 1;
            ctx.stroke();
          }
          ctx.restore();
        }

        const isTitulo = no.classList.contains("classe-titulo");
        const isNum = no.classList.contains("classe-num");

        if (isTitulo) {
          const rawText = no.innerText || no.textContent || "";
          ctx.save();
          ctx.fillStyle = inlineEstilo.color || (isLight ? "#0071e3" : "#0a84ff");
          ctx.font = "bold 15px -apple-system, BlinkMacSystemFont, sans-serif";
          ctx.textBaseline = "top";
          ctx.textAlign = "left";
          ctx.fillText(rawText.trim(), startX, curY);
          curY += 20;

          ctx.strokeStyle = inlineEstilo.color || (isLight ? "#0071e3" : "#0a84ff");
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(startX, curY - 2);
          ctx.lineTo(startX + maxW, curY - 2);
          ctx.stroke();
          ctx.restore();
          curY += 8;
          return;
        }

        if (isNum) {
          const rawText = no.innerText || no.textContent || "";
          renderizarLinhasTexto(rawText.trim(), {
            fontSize: 18,
            lineHeight: 22,
            isBold: true,
            isMono: true,
            align: "center",
            color: inlineEstilo.color
          });
          curY += 4;
          return;
        }

        // Listas (UL, OL, LI)
        if (no.tagName === "LI") {
          const rawText = no.innerText || no.textContent || "";
          renderizarLinhasTexto(`•  ${rawText.trim()}`, inlineEstilo);
          curY += 3;
          return;
        }

        // Se contiver nós filhos estruturados (múltiplos blocos, divs, tabelas, parágrafos)
        if (no.childNodes.length > 0) {
          Array.from(no.childNodes).forEach(filho => processarNo(filho, inlineEstilo));
          if (["DIV", "P", "H1", "H2", "H3", "H4", "H5", "H6"].includes(no.tagName)) {
            curY += 2;
          }
          return;
        }

        // Parágrafo ou bloco de texto simples
        const rawText = no.innerText || no.textContent || "";
        if (rawText && rawText.trim()) {
          renderizarLinhasTexto(rawText, inlineEstilo);
          curY += 4;
        }
      }
    };

    if (subcampos.length > 0) {
      subcampos.forEach(campo => {
        Array.from(campo.childNodes).forEach(no => processarNo(no));
        curY += 6;
      });
    } else {
      Array.from(container.childNodes).forEach(no => processarNo(no));
    }

    return curY;
  }

  /**
   * Renderiza uma página ou seção de apêndice com todas as notas expandidas na íntegra.
   */
  renderizarCanvasApindice(anexos, { width, scale, bgStyle, isLight }) {
    if (!anexos || anexos.length === 0) return null;

    const cardMargin = 20;
    const paddingX = 30;
    const innerPadding = 16;
    const cardWidth = width - paddingX * 2;
    const contentWidth = cardWidth - innerPadding * 2;

    // 1. Pré-calcula a altura de cada anexo com um canvas de medição virtual e expandirTotal = true
    const measureCanvas = document.createElement("canvas");
    measureCanvas.width = width;
    measureCanvas.height = 30000;
    const measureCtx = measureCanvas.getContext("2d");

    const anexosComAltura = anexos.map(anexo => {
      const startY = 44;
      const endY = this.desenharConteudoTextoNoCanvas(measureCtx, anexo.element, paddingX + innerPadding, startY, contentWidth, isLight, true);
      const cardHeight = Math.max(70, endY - startY + 30);
      return { ...anexo, cardHeight };
    });

    const headerSectionHeight = 70;
    const totalContentHeight = anexosComAltura.reduce((acc, a) => acc + a.cardHeight + cardMargin, 0);
    const totalH = headerSectionHeight + totalContentHeight + 40;

    const apBuffer = document.createElement("canvas");
    apBuffer.width = Math.round(width * scale);
    apBuffer.height = Math.round(totalH * scale);
    const ctx = apBuffer.getContext("2d");
    ctx.scale(scale, scale);

    // Fundo do Apêndice
    if (bgStyle === "dark") {
      ctx.fillStyle = "#0b0c10";
      ctx.fillRect(0, 0, width, totalH);
    } else if (bgStyle === "light") {
      ctx.fillStyle = "#eaecee";
      ctx.fillRect(0, 0, width, totalH);
    }

    // Cabeçalho da Seção de Apêndice
    ctx.fillStyle = isLight ? "#0071e3" : "#0a84ff";
    ctx.font = "bold 15px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText("📑 APÊNDICE: NOTAS E CONTEÚDO EXPANDIDO", paddingX, 22);

    ctx.strokeStyle = isLight ? "rgba(0, 113, 227, 0.25)" : "rgba(10, 132, 255, 0.25)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(paddingX, 48);
    ctx.lineTo(width - paddingX, 48);
    ctx.stroke();

    let curY = headerSectionHeight;

    // Renderiza cada Card de Anexo com expandirTotal = true
    anexosComAltura.forEach(anexo => {
      const cardX = paddingX;
      const cardY = curY;
      const cardW = cardWidth;
      const cardH = anexo.cardHeight;

      // Sombra e Corpo do Card
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 4;

      ctx.fillStyle = isLight ? "rgba(255, 255, 255, 0.95)" : "rgba(26, 29, 41, 0.88)";
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(cardX, cardY, cardW, cardH, 8);
      } else {
        ctx.rect(cardX, cardY, cardW, cardH);
      }
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = isLight ? "rgba(0, 0, 0, 0.12)" : "rgba(255, 255, 255, 0.14)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Top bar do Card com Título de Referência
      ctx.fillStyle = isLight ? "rgba(0, 113, 227, 0.08)" : "rgba(10, 132, 255, 0.12)";
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(cardX, cardY, cardW, 30, [8, 8, 0, 0]);
      } else {
        ctx.rect(cardX, cardY, cardW, 30);
      }
      ctx.fill();

      ctx.fillStyle = isLight ? "#0071e3" : "#0a84ff";
      ctx.font = "bold 11px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillText(`📄 [${anexo.refTag}]`, cardX + 12, cardY + 15);

      // Conteúdo Real do Anexo com expansão total e dimensões exatas
      this.desenharConteudoTextoNoCanvas(ctx, anexo.element, cardX + innerPadding, cardY + 44, contentWidth, isLight, true);

      curY += cardH + cardMargin;
    });

    return apBuffer;
  }

  async renderizarCanvasParaBuffer({ scale, bgStyle, autoCrop, comGrade, incluirApindice = true }) {
    const canvasContainer = document.getElementById("canvas");
    const blocos = Array.from(canvasContainer.querySelectorAll(".draggable"))
      .filter(b => b.style.display !== "none")
      .sort((a, b) => (parseInt(a.style.zIndex) || 10) - (parseInt(b.style.zIndex) || 10));

    if (blocos.length === 0) {
      throw new Error("Nenhum bloco ativo encontrado no Canvas para exportação.");
    }

    const anexos = this.coletarAnexosExpandidos();

    let offsetX = 0;
    let offsetY = 0;
    let width = canvasContainer.clientWidth;
    let height = canvasContainer.clientHeight;

    if (autoCrop) {
      const bbox = this.calcularBoundingBox();
      offsetX = bbox.minX;
      offsetY = bbox.minY;
      width = bbox.width;
      height = bbox.height;
    } else {
      width = Math.max(canvasContainer.scrollWidth, canvasContainer.clientWidth);
      height = Math.max(canvasContainer.scrollHeight, canvasContainer.clientHeight);
    }

    const visualCanvas = document.createElement("canvas");
    visualCanvas.width = Math.round(width * scale);
    visualCanvas.height = Math.round(height * scale);
    const ctx = visualCanvas.getContext("2d");

    ctx.scale(scale, scale);

    const isLight = bgStyle === "light" || document.body.classList.contains("light-mode");

    // 1. Renderiza o Fundo
    if (bgStyle === "dark") {
      ctx.fillStyle = "#0b0c10";
      ctx.fillRect(0, 0, width, height);
    } else if (bgStyle === "light") {
      ctx.fillStyle = "#eaecee";
      ctx.fillRect(0, 0, width, height);
    } // "transparent" deixa o fundo limpo

    // 2. Renderiza a Grade de Pontos (se solicitado)
    if (comGrade && bgStyle !== "transparent") {
      const dotColor = isLight ? "rgba(0, 0, 0, 0.07)" : "rgba(255, 255, 255, 0.06)";
      ctx.fillStyle = dotColor;
      for (let x = 0; x < width; x += 20) {
        for (let y = 0; y < height; y += 20) {
          ctx.beginPath();
          ctx.arc(x, y, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // 3. Renderiza cada Bloco (.draggable) com Alta Fidelidade e Badges de Referência
    for (const bloco of blocos) {
      const bx = bloco.offsetLeft - offsetX;
      const by = bloco.offsetTop - offsetY;
      const bw = bloco.offsetWidth;
      const bh = bloco.offsetHeight;
      const blockId = bloco.dataset.id || bloco.id.replace("block_", "");

      const cardBg = isLight ? "rgba(255, 255, 255, 0.95)" : "rgba(26, 29, 41, 0.88)";
      const cardBorder = isLight ? "rgba(0, 0, 0, 0.12)" : "rgba(255, 255, 255, 0.14)";
      const headerBg = isLight ? "rgba(0, 0, 0, 0.04)" : "rgba(255, 255, 255, 0.05)";
      const textColor = isLight ? "#1d1d1f" : "#f0f2f8";

      // Sombra e Corpo do Card Glassmorphism
      ctx.save();
      ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
      ctx.shadowBlur = 16;
      ctx.shadowOffsetY = 6;

      ctx.fillStyle = cardBg;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(bx, by, bw, bh, 10);
      } else {
        ctx.rect(bx, by, bw, bh);
      }
      ctx.fill();
      ctx.restore();

      // Borda do Card
      ctx.strokeStyle = cardBorder;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Cabeçalho do Card (Top bar)
      ctx.save();
      ctx.fillStyle = headerBg;
      ctx.beginPath();
      if (typeof ctx.roundRect === 'function') {
        ctx.roundRect(bx, by, bw, 36, [10, 10, 0, 0]);
      } else {
        ctx.rect(bx, by, bw, 36);
      }
      ctx.fill();

      // Linha divisória do cabeçalho
      ctx.strokeStyle = isLight ? "rgba(0, 0, 0, 0.07)" : "rgba(255, 255, 255, 0.08)";
      ctx.beginPath();
      ctx.moveTo(bx, by + 36);
      ctx.lineTo(bx + bw, by + 36);
      ctx.stroke();
      ctx.restore();

      // Título do Card
      const titleInput = bloco.querySelector(".title-input");
      const titleText = (titleInput ? titleInput.value : bloco.dataset.type || "Bloco").toUpperCase();
      ctx.fillStyle = textColor;
      ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillText(titleText, bx + 12, by + 18);

      // Se este bloco tiver anexos expandidos, desenha o badge de referência no cabeçalho
      const anexoDoBloco = anexos.find(a => a.blockId === blockId || a.blockId === bloco.id || a.blockId === ("block_" + blockId));
      if (anexoDoBloco && incluirApindice) {
        ctx.save();
        const badgeLabel = `📄 [${anexoDoBloco.refTag}]`;
        ctx.font = "bold 9px -apple-system, sans-serif";
        const badgeW = ctx.measureText(badgeLabel).width + 10;
        const badgeX = bx + bw - badgeW - 8;
        const badgeY = by + 9;

        ctx.fillStyle = isLight ? "rgba(0, 113, 227, 0.12)" : "rgba(10, 132, 255, 0.2)";
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(badgeX, badgeY, badgeW, 18, 4);
        } else {
          ctx.rect(badgeX, badgeY, badgeW, 18);
        }
        ctx.fill();

        ctx.fillStyle = isLight ? "#0071e3" : "#0a84ff";
        ctx.textBaseline = "middle";
        ctx.textAlign = "center";
        ctx.fillText(badgeLabel, badgeX + badgeW / 2, badgeY + 9);
        ctx.restore();
      }

      // Conteúdo Interno por Tipo
      const type = bloco.dataset.type;

      if (type === "chart") {
        const innerCanvas = bloco.querySelector("canvas");
        if (innerCanvas) {
          const chartW = innerCanvas.width;
          const chartH = innerCanvas.height;
          const posX = bx + (bw - chartW) / 2;
          const posY = by + 40;
          ctx.drawImage(innerCanvas, posX, posY, chartW, chartH);

          // Média Geral
          const mediaSpan = bloco.querySelector(".media-val");
          const mediaVal = mediaSpan ? mediaSpan.innerText : "0.0";
          const mediaY = posY + chartH + 12;

          ctx.fillStyle = isLight ? "#0071e3" : "#0a84ff";
          ctx.font = "bold 13px -apple-system, sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`Média Geral: ${mediaVal}`, bx + bw / 2, mediaY);
          ctx.textAlign = "left";

          // Grid de 6 Inputs de Atributos Shinobi
          const inputLabels = Array.from(bloco.querySelectorAll(".chart-inputs-grid label"));
          if (inputLabels.length > 0) {
            const gridStartY = mediaY + 10;
            const colW = (bw - 26) / 2;
            const rowH = 22;

            inputLabels.forEach((lbl, idx) => {
              const col = idx % 2;
              const row = Math.floor(idx / 2);
              const itemX = bx + 10 + col * (colW + 6);
              const itemY = gridStartY + row * (rowH + 5);

              // Pílula de Fundo
              ctx.fillStyle = isLight ? "rgba(0, 0, 0, 0.05)" : "rgba(0, 0, 0, 0.28)";
              ctx.beginPath();
              if (typeof ctx.roundRect === 'function') {
                ctx.roundRect(itemX, itemY, colW, rowH, 4);
              } else {
                ctx.rect(itemX, itemY, colW, rowH);
              }
              ctx.fill();

              ctx.strokeStyle = isLight ? "rgba(0, 0, 0, 0.08)" : "rgba(255, 255, 255, 0.08)";
              ctx.lineWidth = 1;
              ctx.stroke();

              // Valor e Nome do Atributo
              const inp = lbl.querySelector("input");
              const val = inp ? inp.value : "0";
              const statText = lbl.innerText.replace(val, '').trim();

              ctx.fillStyle = isLight ? "#1d1d1f" : "#f0f2f8";
              ctx.font = "bold 11px -apple-system, sans-serif";
              ctx.textBaseline = "middle";
              ctx.textAlign = "left";
              ctx.fillText(`${val} ${statText}`, itemX + 8, itemY + rowH / 2);
            });
          }
        }
      } else if (type === "image") {
        const img = bloco.querySelector("img");
        const safeImg = await this.obterElementoImagemSeguro(img, blockId);

        ctx.save();
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(bx + 6, by + 40, bw - 12, bh - 46, 6);
        } else {
          ctx.rect(bx + 6, by + 40, bw - 12, bh - 46);
        }
        ctx.clip();

        if (safeImg) {
          try {
            ctx.drawImage(safeImg, bx + 6, by + 40, bw - 12, bh - 46);
          } catch (err) {
            console.warn("Falha ao desenhar imagem segura no buffer:", err);
          }
        } else {
          ctx.fillStyle = isLight ? "rgba(0, 0, 0, 0.05)" : "rgba(255, 255, 255, 0.05)";
          ctx.fillRect(bx + 6, by + 40, bw - 12, bh - 46);

          ctx.fillStyle = isLight ? "#86868b" : "#9aa1b2";
          ctx.font = "bold 11px -apple-system, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("🖼️ Imagem Indisponível", bx + bw / 2, by + (bh + 40) / 2);
          ctx.textAlign = "left";
        }
        ctx.restore();
      } else if (type === "text") {
        const listaCampos = bloco.querySelector(".lista-campos") || bloco;
        ctx.save();
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(bx + 4, by + 38, bw - 8, bh - 42, 6);
        } else {
          ctx.rect(bx + 4, by + 38, bw - 8, bh - 42);
        }
        ctx.clip();
        this.desenharConteudoTextoNoCanvas(ctx, listaCampos, bx + 12, by + 48, bw - 24, isLight);
        ctx.restore();
      } else {
        // Bloco Genérico / Plugin
        ctx.save();
        ctx.beginPath();
        if (typeof ctx.roundRect === 'function') {
          ctx.roundRect(bx + 4, by + 38, bw - 8, bh - 42, 6);
        } else {
          ctx.rect(bx + 4, by + 38, bw - 8, bh - 42);
        }
        ctx.clip();
        this.desenharConteudoTextoNoCanvas(ctx, bloco, bx + 12, by + 48, bw - 24, isLight);
        ctx.restore();
      }
    }

    // 4. Se houver anexos e apêndice estiver ativo, gera o canvas do apêndice
    let apBuffer = null;
    let fullCanvas = visualCanvas;

    if (incluirApindice && anexos.length > 0) {
      apBuffer = this.renderizarCanvasApindice(anexos, { width, scale, bgStyle, isLight });

      if (apBuffer) {
        // Cria canvas unificado com Palco Visual no topo e Apêndice na parte inferior
        fullCanvas = document.createElement("canvas");
        fullCanvas.width = visualCanvas.width;
        fullCanvas.height = visualCanvas.height + apBuffer.height;
        const fullCtx = fullCanvas.getContext("2d");

        fullCtx.drawImage(visualCanvas, 0, 0);
        fullCtx.drawImage(apBuffer, 0, visualCanvas.height);
      }
    }

    return {
      visualCanvas,
      apBuffer,
      fullCanvas,
      anexos
    };
  }

  /**
   * Valida e obtém um elemento de imagem seguro contra violações de CORS.
   * Utiliza 5 estratégias em cascata (DataURL local, IndexedDB, CORS direto, Fetch Blob e Proxy de Alta Velocidade).
   * Garante que a imagem apareça com fidelidade no PNG/PDF sem contaminar o canvas.
   */
  async obterElementoImagemSeguro(img, blockId) {
    if (!img || !img.src) return null;
    const src = img.src;

    // 1. Se já for data URL ou blob URL local, é 100% seguro
    if (src.startsWith('data:') || src.startsWith('blob:')) {
      if (img.complete && img.naturalWidth !== 0) return img;
    }

    // 2. Verifica se o IndexedDB já tem o binário em Base64 salvo para esse bloco
    if (blockId && dbManager && typeof dbManager.obterImagemIndexedDB === 'function') {
      try {
        const idbData = await dbManager.obterImagemIndexedDB(blockId);
        if (idbData && idbData.startsWith('data:')) {
          const idbImg = new Image();
          await new Promise((resolve, reject) => {
            idbImg.onload = () => resolve();
            idbImg.onerror = () => reject();
            idbImg.src = idbData;
          });
          return idbImg;
        }
      } catch (e) {
        console.warn("Falha ao recuperar imagem do IndexedDB:", e);
      }
    }

    const testarSeguranca = (imageObj) => {
      try {
        const testC = document.createElement('canvas');
        testC.width = 1;
        testC.height = 1;
        const testCtx = testC.getContext('2d');
        testCtx.drawImage(imageObj, 0, 0, 1, 1);
        testC.toDataURL('image/png'); // Dispara SecurityError se o canvas estiver contaminado
        return true;
      } catch (err) {
        return false;
      }
    };

    // 3. Testa se o elemento original já é seguro
    if (img.complete && img.naturalWidth !== 0 && testarSeguranca(img)) {
      return img;
    }

    // 4. Tenta recarregar com crossOrigin = "anonymous" diretamente
    try {
      const safeImg = new Image();
      safeImg.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        safeImg.onload = () => resolve();
        safeImg.onerror = () => reject();
        safeImg.src = src;
      });

      if (testarSeguranca(safeImg)) {
        return safeImg;
      }
    } catch (e) {
      // Ignora falha de crossOrigin simples
    }

    // 5. Tenta carregar via fetch -> Blob -> DataURL
    try {
      const resp = await fetch(src, { mode: "cors" });
      if (resp.ok) {
        const blob = await resp.blob();
        const dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });

        if (dataUrl && dataUrl.startsWith('data:')) {
          const safeImg = new Image();
          await new Promise((resolve, reject) => {
            safeImg.onload = () => resolve();
            safeImg.onerror = () => reject();
            safeImg.src = dataUrl;
          });

          if (testarSeguranca(safeImg)) {
            if (blockId && dbManager) dbManager.salvarImagemIndexedDB(blockId, dataUrl).catch(() => {});
            return safeImg;
          }
        }
      }
    } catch (e) {
      // Servidor externo bloqueia CORS direto
    }

    // 6. Fallback de Alta Fidelidade: Proxy de Imagem CORS (images.weserv.nl)
    try {
      const cleanUrl = src.replace(/^https?:\/\//i, '');
      const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}`;

      const proxyImg = new Image();
      proxyImg.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        proxyImg.onload = () => resolve();
        proxyImg.onerror = () => reject();
        proxyImg.src = proxyUrl;
      });

      if (testarSeguranca(proxyImg)) {
        return proxyImg;
      }
    } catch (e) {
      console.warn("Falha no proxy CORS de imagem:", e);
    }

    return null;
  }

  /**
   * Construtor nativo de stream PDF multi-páginas (PDF-1.3) em Vanilla JS.
   * Delega para o módulo PDFBuilder.js.
   */
  async baixarComoPDFMultiPagina(canvasPaginas, filename) {
    return PDFBuilder.exportarComoPDF(canvasPaginas, filename);
  }
}
