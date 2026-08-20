/**
 * MODULES: TextModule.js
 * Gerenciamento de blocos textuais e barra contextual WYSIWYG.
 * Suporta reidratação completa de strings e objetos de campos com estilos e formatação.
 */
import { BaseModule } from '../BaseModule.js';
import { bus } from '../../core/EventBus.js';
import { Icons, createButtonContent } from '../../core/IconHelper.js';

export default class TextModule extends BaseModule {
  constructor() {
    super('text', 'Módulo de Texto');
    this.ultimoAlvoFocado = null;
  }

  init() {
    const containerBotoes = document.getElementById("container-criacao-botoes") || document.getElementById("container-gerenciamento-botoes");
    const grupoWysiwyg = document.getElementById("group-wysiwyg");

    if (containerBotoes) {
      const btnAddText = document.createElement("button");
      btnAddText.id = "btn-add-text";
      btnAddText.className = "btn btn-secondary";
      btnAddText.innerHTML = createButtonContent('text', 'Bloco de Texto');
      btnAddText.title = "Cria um novo bloco de texto com formatação";
      btnAddText.onclick = () => this.criarNovoBlocoTexto();
      containerBotoes.appendChild(this.TRACK_UI(btnAddText));
    }

    if (grupoWysiwyg) {
      this.montarBarraWysiwyg(grupoWysiwyg);
    }

    this.escutarEventosGlobais();
  }

  montarBarraWysiwyg(container) {
    container.innerHTML = `
      <div class="text-inspector-card">
        <!-- Cabeçalho do Inspetor -->
        <div class="inspector-header">
          <div class="inspector-title">
            <span class="inspector-icon">${Icons.text || ''}</span>
            <span>INSPETOR DE TEXTO</span>
          </div>
          <span class="inspector-badge">WYSIWYG</span>
        </div>

        <!-- Seção 1: Formatação Rápida (Segmented Control) -->
        <div class="inspector-section">
          <span class="inspector-section-label">Tipografia</span>
          <div class="inspector-segmented-group">
            <button type="button" class="btn-segmented" data-cmd="bold" title="Negrito (Ctrl+B)"><b>B</b></button>
            <button type="button" class="btn-segmented" data-cmd="italic" title="Itálico (Ctrl+I)"><i>I</i></button>
            <button type="button" class="btn-segmented" data-cmd="underline" title="Sublinhado (Ctrl+U)"><u>U</u></button>
            <div class="segmented-divider"></div>
            <button type="button" class="btn-segmented" data-cmd="fontSize" data-val="2" title="Diminuir Fonte">A-</button>
            <button type="button" class="btn-segmented" data-cmd="fontSize" data-val="4" title="Aumentar Fonte">A+</button>
            <div class="segmented-divider"></div>
            <button type="button" class="btn-segmented" data-cmd="removeFormat" title="Limpar Formatação">✕</button>
          </div>
        </div>

        <!-- Seção 2: Hierarquia Semântica (Segmented Pill) -->
        <div class="inspector-section">
          <span class="inspector-section-label">Hierarquia</span>
          <div class="inspector-pill-group">
            <button type="button" class="btn-pill" data-classe="classe-titulo" title="Estilo Título RPG">Título</button>
            <button type="button" class="btn-pill" data-classe="classe-conteudo" title="Texto de Corpo">Corpo</button>
            <button type="button" class="btn-pill" data-classe="classe-num" title="Número Destacado">Número</button>
          </div>
        </div>

        <!-- Seção 3: Inserções Estruturais (Grid de Ações) -->
        <div class="inspector-section">
          <span class="inspector-section-label">Estruturas & Blocos</span>
          <div class="inspector-actions-grid">
            <button type="button" id="btn-insert-table" class="btn-inspector-action" title="Inserir Tabela formatada">
              <span class="action-icon">${Icons.table || ''}</span>
              <span class="action-text">Tabela</span>
            </button>
            <button type="button" id="btn-insert-pre" class="btn-inspector-action" title="Inserir Bloco Div Pre com rolagem">
              <span class="action-icon">${Icons.code || ''}</span>
              <span class="action-text">Div Pre</span>
            </button>
            <button type="button" id="btn-insert-style-box" class="btn-inspector-action" title="Inserir Caixa com Estilo Personalizado">
              <span class="action-icon">${Icons.box || ''}</span>
              <span class="action-text">Div Style</span>
            </button>
          </div>
        </div>

        <!-- Seção 4: Cores & Destaque com Swatches Rápidos -->
        <div class="inspector-section">
          <span class="inspector-section-label">Cores & Destaque</span>
          
          <!-- Cor do Texto -->
          <div class="color-control-row">
            <div class="color-label-group">
              <span class="color-bullet" id="text-color-bullet" style="background:#f0f2f8;"></span>
              <span>Texto</span>
            </div>
            <div class="color-swatches">
              <button type="button" class="swatch-btn" data-color="#f0f2f8" style="background:#f0f2f8;" title="Branco"></button>
              <button type="button" class="swatch-btn" data-color="#0a84ff" style="background:#0a84ff;" title="Azul"></button>
              <button type="button" class="swatch-btn" data-color="#30d158" style="background:#30d158;" title="Verde"></button>
              <button type="button" class="swatch-btn" data-color="#ff453a" style="background:#ff453a;" title="Vermelho"></button>
              <button type="button" class="swatch-btn" data-color="#ffd60a" style="background:#ffd60a;" title="Amarelo"></button>
              <button type="button" class="swatch-btn" data-color="#bf5af2" style="background:#bf5af2;" title="Roxo"></button>
              <div class="color-picker-wrapper" title="Personalizar cor do texto">
                <input type="color" id="wysiwyg-color-text" class="native-color-picker" value="#f0f2f8">
              </div>
            </div>
          </div>

          <!-- Cor de Fundo / Background -->
          <div class="color-control-row">
            <div class="color-label-group">
              <span class="color-bullet" id="bg-color-bullet" style="background:#0a84ff;"></span>
              <span>Fundo</span>
            </div>
            <div class="color-swatches">
              <button type="button" class="swatch-btn bg-swatch" data-bg="transparent" style="background:rgba(255,255,255,0.06); border:1px dashed var(--border-default);" title="Transparente"></button>
              <button type="button" class="swatch-btn bg-swatch" data-bg="#0a84ff" style="background:rgba(10,132,255,0.4);" title="Fundo Azul"></button>
              <button type="button" class="swatch-btn bg-swatch" data-bg="#30d158" style="background:rgba(48,209,88,0.4);" title="Fundo Verde"></button>
              <button type="button" class="swatch-btn bg-swatch" data-bg="#ff453a" style="background:rgba(255,69,58,0.4);" title="Fundo Vermelho"></button>
              <button type="button" class="swatch-btn bg-swatch" data-bg="#ffd60a" style="background:rgba(255,214,10,0.4);" title="Fundo Amarelo"></button>
              <button type="button" class="swatch-btn bg-swatch" data-bg="#bf5af2" style="background:rgba(191,90,242,0.4);" title="Fundo Roxo"></button>
              <div class="color-picker-wrapper" title="Personalizar cor de fundo">
                <input type="color" id="wysiwyg-color-bg" class="native-color-picker" value="#0a84ff">
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // 1. Botões de comando padrão (B, I, U, A+, A-, removeFormat)
    container.querySelectorAll('.btn-segmented[data-cmd]').forEach(btn => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const cmd = btn.dataset.cmd;
        const val = btn.dataset.val || null;

        if (cmd) {
          document.execCommand(cmd, false, val);
          if (this.ultimoAlvoFocado) {
            this.ultimoAlvoFocado.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      });
    });

    // 2. Hierarquia de classes (Título, Corpo, Número)
    container.querySelectorAll('.btn-pill[data-classe]').forEach(btn => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const classe = btn.dataset.classe;
        if (classe && this.ultimoAlvoFocado) {
          this.ultimoAlvoFocado.classList.remove('classe-titulo', 'classe-conteudo', 'classe-num');
          this.ultimoAlvoFocado.classList.add(classe);
          this.ultimoAlvoFocado.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    });

    // 3. Inserir Tabela
    const btnTable = container.querySelector('#btn-insert-table');
    btnTable?.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.inserirTabela();
    });

    // 4. Inserir Div Pre
    const btnPre = container.querySelector('#btn-insert-pre');
    btnPre?.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.inserirBlocoPre();
    });

    // 5. Inserir Div Style
    const btnStyleBox = container.querySelector('#btn-insert-style-box');
    btnStyleBox?.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.inserirDivStyle();
    });

    // 6. Swatches e Seletor de Cor do Texto
    const textColorBullet = container.querySelector('#text-color-bullet');
    const inputColorText = container.querySelector('#wysiwyg-color-text');

    container.querySelectorAll('.swatch-btn[data-color]').forEach(swatch => {
      swatch.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const color = swatch.dataset.color;
        if (textColorBullet) textColorBullet.style.background = color;
        if (inputColorText) inputColorText.value = color;
        this.aplicarCorTexto(color);
      });
    });

    inputColorText?.addEventListener('input', (e) => {
      const color = e.target.value;
      if (textColorBullet) textColorBullet.style.background = color;
      this.aplicarCorTexto(color);
    });

    // 7. Swatches e Seletor de Cor de Fundo
    const bgColorBullet = container.querySelector('#bg-color-bullet');
    const inputColorBg = container.querySelector('#wysiwyg-color-bg');

    container.querySelectorAll('.swatch-btn[data-bg]').forEach(swatch => {
      swatch.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const bg = swatch.dataset.bg;
        if (bgColorBullet) bgColorBullet.style.background = bg === 'transparent' ? 'transparent' : bg;
        if (inputColorBg && bg !== 'transparent') inputColorBg.value = bg;
        this.aplicarCorFundo(bg);
      });
    });

    inputColorBg?.addEventListener('input', (e) => {
      const bg = e.target.value;
      if (bgColorBullet) bgColorBullet.style.background = bg;
      this.aplicarCorFundo(bg);
    });
  }

  aplicarCorTexto(cor) {
    if (!this.ultimoAlvoFocado) return;
    this.ultimoAlvoFocado.focus();
    document.execCommand('foreColor', false, cor);
    this.ultimoAlvoFocado.dispatchEvent(new Event('input', { bubbles: true }));
  }

  inserirHTMLNoCursor(htmlString) {
    if (!this.ultimoAlvoFocado) {
      const primeiroSub = document.querySelector('.draggable[data-type="text"] .sub-campo');
      if (primeiroSub) {
        this.ultimoAlvoFocado = primeiroSub;
      } else {
        alert("Por favor, clique dentro de um bloco de texto antes de inserir.");
        return;
      }
    }

    this.ultimoAlvoFocado.focus();
    const sel = window.getSelection();

    if (sel && sel.getRangeAt && sel.rangeCount) {
      const range = sel.getRangeAt(0);
      if (this.ultimoAlvoFocado.contains(range.commonAncestorContainer)) {
        range.deleteContents();
        const temp = document.createElement("div");
        temp.innerHTML = htmlString;
        const frag = document.createDocumentFragment();
        let node, lastNode;
        while ((node = temp.firstChild)) {
          lastNode = frag.appendChild(node);
        }
        range.insertNode(frag);
        if (lastNode) {
          range.setStartAfter(lastNode);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
        this.ultimoAlvoFocado.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }
    }

    this.ultimoAlvoFocado.insertAdjacentHTML('beforeend', htmlString);
    this.ultimoAlvoFocado.dispatchEvent(new Event('input', { bubbles: true }));
  }

  inserirTabela() {
    const tabelaHTML = `
      <table style="color: rgb(240, 242, 248); width: 100%; border-collapse: collapse; font-family: sans-serif; font-size: 12px; margin: 6px 0;">
        <thead>
          <tr style="background: rgba(45, 45, 45, 0.9); color: rgb(79, 195, 247);">
            <th style="border: 1px solid rgba(255, 255, 255, 0.15); padding: 6px; text-align: left;">Coluna 1</th>
            <th style="border: 1px solid rgba(255, 255, 255, 0.15); padding: 6px; text-align: left;">Coluna 2</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid rgba(255, 255, 255, 0.15); padding: 6px; background-color: rgba(30, 30, 30, 0.6);">Item 1</td>
            <td style="border: 1px solid rgba(255, 255, 255, 0.15); padding: 6px; background-color: rgba(30, 30, 30, 0.6);">05%</td>
          </tr>
          <tr>
            <td style="border: 1px solid rgba(255, 255, 255, 0.15); padding: 6px; background-color: rgba(30, 30, 30, 0.6);">Item 2</td>
            <td style="border: 1px solid rgba(255, 255, 255, 0.15); padding: 6px; background-color: rgba(30, 30, 30, 0.6);">10%</td>
          </tr>
        </tbody>
      </table>
      <div><br></div>
    `;
    this.inserirHTMLNoCursor(tabelaHTML);
  }

  inserirBlocoPre() {
    const sel = window.getSelection();
    let textoSelecionado = sel ? sel.toString().trim() : "";
    if (!textoSelecionado) {
      textoSelecionado = "Descrição do aprimoramento ou habilidade...";
    }

    const preHTML = `
      <pre style="background: rgb(33, 39, 40); padding: 8px; border-radius: 6px; max-height: 85px; overflow-y: auto; font-family: sans-serif; font-size: 11px; text-wrap-mode: wrap; word-break: break-all; border: 1px solid rgb(51, 51, 51); margin: 6px 0; color: rgb(247, 247, 247);"><div style="color: rgb(240, 242, 248); font-size: 13px;">${textoSelecionado}</div></pre>
      <div><br></div>
    `;
    this.inserirHTMLNoCursor(preHTML);
  }

  inserirDivStyle() {
    const inputColorText = document.getElementById('wysiwyg-color-text');
    const inputColorBg = document.getElementById('wysiwyg-color-bg');
    const corTexto = inputColorText ? inputColorText.value : '#f0f2f8';
    const corFundo = inputColorBg ? inputColorBg.value : '#0a84ff';

    const sel = window.getSelection();
    let textoSelecionado = sel ? sel.toString().trim() : "";
    if (!textoSelecionado) {
      textoSelecionado = "Texto destacado com estilo personalizado...";
    }

    const divStyleHTML = `
      <div style="background: ${corFundo}22; border: 1px solid ${corFundo}66; border-radius: 6px; padding: 6px 8px; margin: 6px 0; color: ${corTexto}; font-size: 13px;">
        ${textoSelecionado}
      </div>
      <div><br></div>
    `;
    this.inserirHTMLNoCursor(divStyleHTML);
  }

  aplicarEstiloCustomizado(corTexto, corFundo) {
    if (!this.ultimoAlvoFocado) return;
    this.ultimoAlvoFocado.focus();

    const sel = window.getSelection();
    if (sel && sel.rangeCount && !sel.isCollapsed) {
      const range = sel.getRangeAt(0);
      const span = document.createElement("span");
      span.style.color = corTexto;
      if (corFundo) {
        span.style.backgroundColor = `${corFundo}33`;
        span.style.borderRadius = "3px";
        span.style.padding = "1px 4px";
      }
      span.appendChild(range.extractContents());
      range.insertNode(span);
      this.ultimoAlvoFocado.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      if (corTexto) this.ultimoAlvoFocado.style.color = corTexto;
      if (corFundo) this.ultimoAlvoFocado.style.backgroundColor = `${corFundo}22`;
      this.ultimoAlvoFocado.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  aplicarCorFundo(corFundo) {
    if (!this.ultimoAlvoFocado) return;
    this.ultimoAlvoFocado.focus();

    const sel = window.getSelection();
    if (sel && sel.rangeCount && !sel.isCollapsed) {
      const range = sel.getRangeAt(0);
      const span = document.createElement("span");
      span.style.backgroundColor = `${corFundo}44`;
      span.style.borderRadius = "3px";
      span.style.padding = "1px 4px";
      span.appendChild(range.extractContents());
      range.insertNode(span);
      this.ultimoAlvoFocado.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  escutarEventosGlobais() {
    document.addEventListener('focusin', (e) => {
      const sub = e.target.classList && e.target.classList.contains('sub-campo') ? e.target : e.target.closest('.sub-campo');
      if (sub) {
        this.ultimoAlvoFocado = sub;
        const grupoWysiwyg = document.getElementById("group-wysiwyg");
        if (grupoWysiwyg) grupoWysiwyg.style.display = "flex";
      }
    });

    document.addEventListener('click', (e) => {
      const sub = e.target.closest('.sub-campo');
      if (sub) {
        this.ultimoAlvoFocado = sub;
        const grupoWysiwyg = document.getElementById("group-wysiwyg");
        if (grupoWysiwyg) grupoWysiwyg.style.display = "flex";
      }
    });

    bus.on('search:query', (query) => {
      const blocos = document.querySelectorAll('.draggable[data-type="text"]');
      blocos.forEach(bloco => {
        const titulo = (bloco.querySelector('.title-input')?.value || "").toLowerCase();
        const texto = (bloco.innerText || "").toLowerCase();
        bloco.style.display = (titulo.includes(query) || texto.includes(query)) ? "block" : "none";
      });
    });
  }

  criarNovoBlocoTexto() {
    const uid = "txt_" + Date.now();
    this.criarBloco(uid, "top:100px; left:100px; width:260px; height:180px;", {
      title: "Novo Bloco",
      campos: ["", ""]
    });
  }

  normalizarCamposHTML(camposBrutos) {
    if (!camposBrutos) {
      return '<div class="sub-campo" contenteditable="true" spellcheck="false"></div>';
    }

    if (typeof camposBrutos === 'string') {
      return `<div class="sub-campo" contenteditable="true" spellcheck="false">${camposBrutos}</div>`;
    }

    if (Array.isArray(camposBrutos)) {
      if (camposBrutos.length === 0) {
        return '<div class="sub-campo" contenteditable="true" spellcheck="false"></div>';
      }

      return camposBrutos.map(c => {
        if (typeof c === 'string') {
          return `<div class="sub-campo" contenteditable="true" spellcheck="false">${c}</div>`;
        }

        if (c && typeof c === 'object') {
          const html = c.html !== undefined ? c.html : (c.text !== undefined ? c.text : (c.conteudo !== undefined ? c.conteudo : ''));
          let cls = c.className || 'sub-campo';
          if (!cls.includes('sub-campo')) {
            cls = 'sub-campo ' + cls;
          }
          return `<div class="${cls}" contenteditable="true" spellcheck="false">${html}</div>`;
        }

        return '<div class="sub-campo" contenteditable="true" spellcheck="false"></div>';
      }).join('');
    }

    return '<div class="sub-campo" contenteditable="true" spellcheck="false"></div>';
  }

  criarBloco(id, style, dadosIniciais) {
    const canvasContainer = document.getElementById("canvas");
    if (!canvasContainer) return;

    const blocoAntigo = document.getElementById("block_" + id);
    if (blocoAntigo) blocoAntigo.remove();

    const div = document.createElement("div");
    div.className = "draggable";
    div.id = "block_" + id;
    div.dataset.id = id;
    div.dataset.type = "text";
    
    if (dadosIniciais?.width) div.style.width = dadosIniciais.width + "px";
    if (dadosIniciais?.height) div.style.height = dadosIniciais.height + "px";
    div.style.cssText += style || "top:100px; left:100px;";

    const titulo = dadosIniciais?.title || "Anotações";
    const camposHtml = this.normalizarCamposHTML(dadosIniciais?.campos || dadosIniciais?.conteudo || dadosIniciais?.text);

    div.innerHTML = `
      <div class="drag-handle">
        <span class="drag-handle-grip">${Icons.grip}</span>
        <input class="title-input" value="${titulo}" placeholder="Título do bloco...">
        <span class="close-btn" title="Excluir">${Icons.close}</span>
      </div>
      <div class="lista-campos" style="overflow-y:auto; height:calc(100% - 36px); padding:8px;">
        ${camposHtml}
      </div>
    `;

    const salvarEstado = () => {
      const listaCampos = Array.from(div.querySelectorAll(".sub-campo")).map(el => ({
        html: el.innerHTML,
        className: el.className
      }));

      localStorage.setItem("data_" + id, JSON.stringify({
        top: div.style.top,
        left: div.style.left,
        width: div.offsetWidth,
        height: div.offsetHeight,
        type: "text",
        title: div.querySelector(".title-input").value,
        campos: listaCampos
      }));
    };

    div.addEventListener('input', salvarEstado);

    div.querySelector(".close-btn").onclick = () => {
      localStorage.removeItem("data_" + id);
      div.remove();
    };

    window.CanvasManager.makeDraggable(div, () => salvarEstado());
    canvasContainer.appendChild(div);

    if (window.ResizeModule && typeof window.ResizeModule.atribuirResize === 'function') {
      window.ResizeModule.atribuirResize(div);
    }

    salvarEstado();
  }
}