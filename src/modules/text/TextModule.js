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
      <span class="menu-label">EDIÇÃO DE TEXTO</span>
      <div class="wysiwyg-toolbar">
        <button type="button" class="btn-wysiwyg" data-cmd="bold" title="Negrito"><b>B</b></button>
        <button type="button" class="btn-wysiwyg" data-cmd="italic" title="Itálico"><i>I</i></button>
        <button type="button" class="btn-wysiwyg" data-cmd="underline" title="Sublinhado"><u>U</u></button>
        <button type="button" class="btn-wysiwyg" data-cmd="fontSize" data-val="4" title="Aumentar Fonte">A+</button>
        <button type="button" class="btn-wysiwyg" data-cmd="fontSize" data-val="2" title="Diminuir Fonte">A-</button>
        <button type="button" class="btn-wysiwyg btn-wysiwyg-wide" data-classe="classe-titulo">Título</button>
        <button type="button" class="btn-wysiwyg btn-wysiwyg-wide" data-classe="classe-conteudo">Corpo</button>
        <button type="button" class="btn-wysiwyg btn-wysiwyg-wide" data-classe="classe-num">Num</button>
      </div>
    `;

    container.querySelectorAll('.btn-wysiwyg').forEach(btn => {
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        
        const cmd = btn.dataset.cmd;
        const val = btn.dataset.val || null;
        const classe = btn.dataset.classe;

        if (cmd) {
          document.execCommand(cmd, false, val);
        } else if (classe && this.ultimoAlvoFocado) {
          this.ultimoAlvoFocado.classList.remove('classe-titulo', 'classe-conteudo', 'classe-num');
          this.ultimoAlvoFocado.classList.add(classe);
          this.ultimoAlvoFocado.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
    });
  }

  escutarEventosGlobais() {
    document.addEventListener('focusin', (e) => {
      if (e.target.classList && e.target.classList.contains('sub-campo')) {
        this.ultimoAlvoFocado = e.target;
        const grupoWysiwyg = document.getElementById("group-wysiwyg");
        if (grupoWysiwyg) grupoWysiwyg.style.display = "block";
      }
    });

    bus.on('search:query', (query) => {
      const blocos = document.querySelectorAll('.draggable[data-type="text"]');
      blocos.forEach(bloco => {
        const texto = bloco.innerText.toLowerCase();
        bloco.style.display = texto.includes(query) ? "block" : "none";
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