/**
 * MODULES: TextModule.js
 * Encapsula a criação de blocos de texto editáveis e a barra de ferramentas WYSIWYG.
 */
import { BaseModule } from '../BaseModule.js';
import { bus } from '../../core/EventBus.js';

export default class TextModule extends BaseModule {
  constructor() {
    super('text', 'Bloco de Texto Dinâmico');
    this.ultimoElementoFocado = null;
    this.boundSearch = this.filtrarBlocosPorTexto.bind(this);
  }

  init() {
    const containerBotoes = document.getElementById("container-gerenciamento-botoes");
    const grupoWysiwyg = document.getElementById("group-wysiwyg");

    if (containerBotoes) {
      const btnAddText = document.createElement("button");
      btnAddText.id = "btn-add";
      btnAddText.innerText = "Adicionar Bloco";
      btnAddText.onclick = () => this.criarBloco();
      containerBotoes.appendChild(this.TRACK_UI(btnAddText));
    }

    if (grupoWysiwyg) {
      grupoWysiwyg.innerHTML = `
        <span class="menu-label">EDIÇÃO DE TEXTO</span>
        <div class="wysiwyg-grid">
          <button id="wysiwyg-b">B</button>
          <button id="wysiwyg-i">I</button>
          <button id="wysiwyg-u">U</button>
          <button id="wysiwyg-aplus">A+</button>
          <button id="wysiwyg-aminus">A-</button>
        </div>
        <button id="wysiwyg-titulo">Título</button>
        <button id="wysiwyg-conteudo">Conteúdo</button>
        <button id="wysiwyg-num">Numérico</button>
      `;
      grupoWysiwyg.style.display = "block";

      grupoWysiwyg.querySelector("#wysiwyg-b").onmousedown = (e) => { e.preventDefault(); this.formatarInline('strong'); };
      grupoWysiwyg.querySelector("#wysiwyg-i").onmousedown = (e) => { e.preventDefault(); this.formatarInline('em'); };
      grupoWysiwyg.querySelector("#wysiwyg-u").onmousedown = (e) => { e.preventDefault(); this.formatarInline('u'); };
      grupoWysiwyg.querySelector("#wysiwyg-aplus").onmousedown = (e) => { e.preventDefault(); this.ajustarFonte(1); };
      grupoWysiwyg.querySelector("#wysiwyg-aminus").onmousedown = (e) => { e.preventDefault(); this.ajustarFonte(-1); };
      grupoWysiwyg.querySelector("#wysiwyg-titulo").onmousedown = (e) => { e.preventDefault(); this.aplicarEstilo('classe-titulo'); };
      grupoWysiwyg.querySelector("#wysiwyg-conteudo").onmousedown = (e) => { e.preventDefault(); this.aplicarEstilo('classe-conteudo'); };
      grupoWysiwyg.querySelector("#wysiwyg-num").onmousedown = (e) => { e.preventDefault(); this.aplicarEstilo('classe-num'); };
    }

    this.boundCapturarFoco = this.capturarFoco.bind(this);
    document.addEventListener("focusin", this.boundCapturarFoco);
    bus.on('search:query', this.boundSearch);
  }

  destroy() {
    super.destroy();
    const grupoWysiwyg = document.getElementById("group-wysiwyg");
    if (grupoWysiwyg) {
      grupoWysiwyg.innerHTML = "";
      grupoWysiwyg.style.display = "none";
    }
    document.removeEventListener("focusin", this.boundCapturarFoco);
    bus.off('search:query', this.boundSearch);
  }

  capturarFoco(e) {
    if (e.target.classList.contains("sub-campo")) {
      this.ultimoElementoFocado = e.target;
    }
  }

  formatarInline(tag) {
    const selecao = window.getSelection();
    if (!selecao.rangeCount || selecao.isCollapsed) return;
    
    const range = selecao.getRangeAt(0);
    const elementoPai = range.commonAncestorContainer.parentElement;
    
    if (elementoPai && elementoPai.tagName.toLowerCase() === tag) {
      const texto = document.createTextNode(elementoPai.innerText);
      elementoPai.parentNode.replaceChild(texto, elementoPai);
    } else {
      const wrapper = document.createElement(tag);
      try {
        range.surroundContents(wrapper);
      } catch (e) {
        wrapper.appendChild(range.extractContents());
        range.insertNode(wrapper);
      }
    }
    if (this.ultimoElementoFocado) {
      this.salvarBloco(this.ultimoElementoFocado.closest('.draggable'));
    }
  }

  ajustarFonte(direcao) {
    if (this.ultimoElementoFocado) {
      let size = parseInt(window.getComputedStyle(this.ultimoElementoFocado).fontSize) || 14;
      this.ultimoElementoFocado.style.fontSize = (size + direcao) + "px";
      this.salvarBloco(this.ultimoElementoFocado.closest('.draggable'));
    }
  }

  aplicarEstilo(classe) {
    if (this.ultimoElementoFocado) {
      this.ultimoElementoFocado.className = "sub-campo " + classe;
      this.ultimoElementoFocado.focus();
      this.salvarBloco(this.ultimoElementoFocado.closest('.draggable'));
    }
  }

  criarBloco(id = null, style = null, data = null) {
    const canvas = document.getElementById("canvas");
    if (!canvas) return;

    const uid = id || "t_" + Date.now();
    const div = document.createElement("div");
    div.className = "draggable";
    div.dataset.id = uid;
    div.dataset.type = "text";
    div.style.cssText = style || "top:100px; left:100px;";

    div.innerHTML = `
      <div class="drag-handle">
        <span>✥</span>
        <input class="title-input" id="input-title-${uid}" name="title_field_${uid}" value="${data?.title || "TÍTULO"}">
        <span class="close-btn" style="cursor:pointer;">X</span>
      </div>
      <div class="lista-campos"></div>
      <button class="add-btn" style="width:auto; margin:5px;">+</button>
    `;

    const listaCampos = div.querySelector(".lista-campos");

    div.querySelector(".add-btn").onclick = () => {
      const f = document.createElement("div");
      f.className = "sub-campo";
      f.contentEditable = true;
      f.innerText = "Novo...";
      listaCampos.appendChild(f);
      this.salvarBloco(div);
    };

    div.querySelector(".close-btn").onclick = () => {
      localStorage.removeItem("data_" + uid);
      div.remove();
    };

    div.querySelector(".title-input").oninput = () => this.salvarBloco(div);
    listaCampos.addEventListener("input", () => this.salvarBloco(div));

    if (data?.campos) {
      data.campos.forEach(c => {
        const f = document.createElement("div");
        f.className = c.className;
        f.contentEditable = true;
        f.innerHTML = c.html;
        listaCampos.appendChild(f);
      });
    }

    window.CanvasManager.makeDraggable(div, (target) => this.salvarBloco(target));
    canvas.appendChild(div);

    if (window.ResizeModule && typeof window.ResizeModule.atribuirResize === 'function') {
      window.ResizeModule.atribuirResize(div);
    }
  }

  salvarBloco(div) {
    if (!div) return;
    const data = {
      top: div.style.top,
      left: div.style.left,
      type: "text",
      title: div.querySelector(".title-input")?.value || "TÍTULO",
      campos: Array.from(div.querySelectorAll(".lista-campos > div")).map(c => ({
        html: c.innerHTML,
        className: c.className
      }))
    };
    localStorage.setItem("data_" + div.dataset.id, JSON.stringify(data));
  }

  filtrarBlocosPorTexto(termo) {
    const blocos = document.querySelectorAll('.draggable[data-type="text"]');
    blocos.forEach(bloco => {
      const titulo = bloco.querySelector(".title-input")?.value.toLowerCase() || "";
      const campos = Array.from(bloco.querySelectorAll(".sub-campo"))
                          .map(c => c.innerText.toLowerCase())
                          .join(" ");

      if (titulo.includes(termo) || campos.includes(termo)) {
        bloco.style.display = "";
      } else {
        bloco.style.display = "none";
      }
    });
  }
}