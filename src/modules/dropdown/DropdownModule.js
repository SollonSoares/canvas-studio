/**
 * MODULES: DropdownModule.js
 * Módulo Seletor Dropdown / Navegador de Conteúdo em Cascata.
 * Indexa blocos, campos e subcampos do Canvas e projeta o conteúdo selecionado
 * diretamente em um bloco de destino configurado pelo título.
 */
import { BaseModule } from '../BaseModule.js';
import { bus } from '../../core/EventBus.js';
import { Icons, createButtonContent } from '../../core/IconHelper.js';

export default class DropdownModule extends BaseModule {
  constructor() {
    super('dropdown', 'Menu Suspenso');
    this.syncDebounceTimer = null;
  }

  init() {
    const containerCriacao = document.getElementById("container-criacao-botoes") || document.getElementById("container-gerenciamento-botoes");
    if (containerCriacao) {
      const btnAddDropdown = document.createElement("button");
      btnAddDropdown.id = "btn-add-dropdown";
      btnAddDropdown.className = "btn btn-secondary";
      btnAddDropdown.innerHTML = createButtonContent('dropdown', 'Menu Suspenso');
      btnAddDropdown.title = "Cria um novo seletor suspenso para projetar conteúdos em um bloco alvo";
      btnAddDropdown.onclick = () => this.criarNovoDropdown();
      containerCriacao.appendChild(this.TRACK_UI(btnAddDropdown));
    }

    // Atualiza opções dos dropdowns quando blocos são criados, removidos ou recarregados
    bus.on('canvas:block-created', () => this.agendarSincronizacao());
    bus.on('canvas:reload-request', () => this.agendarSincronizacao());

    // Monitora alterações de texto nos blocos para manter os textos dos selects em sincronia
    const canvas = document.getElementById("canvas");
    if (canvas) {
      canvas.addEventListener("input", (e) => {
        if (e.target.classList.contains("sub-campo") || e.target.classList.contains("title-input")) {
          this.agendarSincronizacao();
        }
      });
    }

    // Suporte a busca
    bus.on('search:query', (query) => {
      const dropdowns = document.querySelectorAll('.draggable[data-type="dropdown"]');
      dropdowns.forEach(dd => {
        const title = (dd.querySelector('.title-input')?.value || "").toLowerCase();
        const target = (dd.querySelector('.dropdown-target-input')?.value || "").toLowerCase();
        dd.style.display = (title.includes(query) || target.includes(query)) ? "block" : "none";
      });
    });

    setTimeout(() => this.atualizarTodosDropdowns(), 100);
  }

  agendarSincronizacao() {
    clearTimeout(this.syncDebounceTimer);
    this.syncDebounceTimer = setTimeout(() => {
      this.atualizarTodosDropdowns();
    }, 200);
  }

  criarNovoDropdown() {
    const uid = "dd_" + Date.now();
    this.criarBloco(uid, "top:120px; left:120px; width:280px; height:180px;", {
      title: "SELETOR DE CONTEÚDO",
      targetTitle: "DETALHES",
      selectedValue: ""
    });
  }

  normalizarDadosIniciais(dados) {
    if (!dados || typeof dados !== 'object') {
      return { title: "SELETOR DE CONTEÚDO", targetTitle: "DETALHES", selectedValue: "" };
    }
    return {
      title: dados.title || "SELETOR DE CONTEÚDO",
      targetTitle: dados.targetTitle !== undefined ? dados.targetTitle : "DETALHES",
      selectedValue: dados.selectedValue || "",
      width: dados.width,
      height: dados.height
    };
  }

  criarBloco(id, style, dadosIniciais) {
    const canvasContainer = document.getElementById("canvas");
    if (!canvasContainer) return;

    const uid = id || "dd_" + Date.now();
    const blocoAntigo = document.getElementById("block_" + uid);
    if (blocoAntigo) blocoAntigo.remove();

    const dados = this.normalizarDadosIniciais(dadosIniciais);

    const div = document.createElement("div");
    div.className = "draggable";
    div.id = "block_" + uid;
    div.dataset.id = uid;
    div.dataset.type = "dropdown";

    if (dados.width) div.style.width = dados.width + "px";
    if (dados.height) div.style.height = dados.height + "px";
    div.style.cssText += style || "top:120px; left:120px;";

    div.innerHTML = `
      <div class="drag-handle">
        <span class="drag-handle-grip">${Icons.grip}</span>
        <input class="title-input" value="${dados.title}" placeholder="Título do seletor...">
        <span class="close-btn" title="Excluir">${Icons.close}</span>
      </div>
      <div class="dropdown-card-body">
        <div class="dropdown-target-row">
          <label class="dropdown-field-label">
            ${Icons.box || ''} Bloco Alvo (Destino)
          </label>
          <input type="text" class="dropdown-target-input" value="${dados.targetTitle}" placeholder="Ex: DETALHES, RESUMO...">
        </div>

        <div class="dropdown-select-row">
          <label class="dropdown-field-label">
            ${Icons.dropdown || ''} Selecionar Conteúdo
          </label>
          <select class="dropdown-select-apple">
            <option value="">Selecione um subcampo...</option>
          </select>
        </div>

        <div class="dropdown-info-bar">
          <span class="dropdown-items-count">0 itens indexados</span>
          <span class="dropdown-status-badge">Conectando...</span>
        </div>
      </div>
    `;

    const inputTitulo = div.querySelector(".title-input");
    const inputTarget = div.querySelector(".dropdown-target-input");
    const selectElem = div.querySelector(".dropdown-select-apple");
    const closeBtn = div.querySelector(".close-btn");

    const salvarEstado = () => {
      const chave = "data_" + uid;
      const payload = {
        type: "dropdown",
        title: inputTitulo.value,
        targetTitle: inputTarget.value,
        selectedValue: selectElem.value,
        top: div.style.top,
        left: div.style.left,
        width: div.offsetWidth,
        height: div.offsetHeight
      };
      try {
        localStorage.setItem(chave, JSON.stringify(payload));
      } catch (e) {
        console.warn("Falha ao salvar DropdownModule no localStorage:", e);
      }
    };

    inputTitulo.addEventListener("input", salvarEstado);

    inputTarget.addEventListener("input", () => {
      salvarEstado();
      this.atualizarStatusAlvo(div);
      // Se houver seleção ativa, re-projeta no novo alvo
      if (selectElem.value) {
        this.projetarOpcaoSelecionada(div);
      }
    });

    selectElem.addEventListener("change", () => {
      salvarEstado();
      this.projetarOpcaoSelecionada(div);
    });

    closeBtn.addEventListener("click", () => {
      localStorage.removeItem("data_" + uid);
      div.remove();
    });

    canvasContainer.appendChild(div);
    salvarEstado();

    // Popula opções e verifica status do alvo
    this.atualizarOpcoesDropdown(div, dados.selectedValue);
    this.atualizarStatusAlvo(div);

    bus.emit('canvas:block-created', div);
  }

  /**
   * Atualiza todos os blocos Dropdown presentes no Canvas.
   */
  atualizarTodosDropdowns() {
    const dropdowns = document.querySelectorAll('.draggable[data-type="dropdown"]');
    dropdowns.forEach(dd => {
      const select = dd.querySelector(".dropdown-select-apple");
      const valorAtual = select ? select.value : "";
      this.atualizarOpcoesDropdown(dd, valorAtual);
      this.atualizarStatusAlvo(dd);
    });
  }

  /**
   * Indexa todos os blocos de texto do Canvas e popula o <select> com <optgroup>.
   */
  atualizarOpcoesDropdown(blocoDropdown, valorPreservar = "") {
    const select = blocoDropdown.querySelector(".dropdown-select-apple");
    const countSpan = blocoDropdown.querySelector(".dropdown-items-count");
    if (!select) return;

    const valorSelecionado = valorPreservar || select.value;
    const blocosTexto = Array.from(document.querySelectorAll('.draggable[data-type="text"]'));

    let totalItens = 0;
    let htmlOptions = `<option value="">Selecione um subcampo...</option>`;

    blocosTexto.forEach(bloco => {
      const tituloBloco = bloco.querySelector('.title-input')?.value || "Bloco sem título";
      const subcampos = Array.from(bloco.querySelectorAll('.sub-campo'));
      const idBloco = bloco.dataset.id;

      if (subcampos.length > 0) {
        htmlOptions += `<optgroup label="${this.escaparHtml(tituloBloco)}">`;
        subcampos.forEach((sub, idx) => {
          totalItens++;
          const textoLimpo = sub.innerText.trim() || sub.innerHTML.replace(/<[^>]*>/g, '').trim() || `(Subcampo ${idx + 1} vazio)`;
          const textoResumido = textoLimpo.length > 38 ? textoLimpo.substring(0, 35) + "..." : textoLimpo;
          const valorChave = `${idBloco}__sub_${idx}`;
          const isSelected = valorChave === valorSelecionado ? 'selected' : '';

          htmlOptions += `<option value="${valorChave}" data-source-id="${idBloco}" data-sub-idx="${idx}" ${isSelected}>[${idx + 1}] ${this.escaparHtml(textoResumido)}</option>`;
        });
        htmlOptions += `</optgroup>`;
      }
    });

    select.innerHTML = htmlOptions;
    if (countSpan) {
      countSpan.innerText = `${totalItens} ${totalItens === 1 ? 'item indexado' : 'itens indexados'}`;
    }
  }

  /**
   * Verifica se o bloco de destino (alvo) existe no Canvas e atualiza o badge.
   */
  atualizarStatusAlvo(blocoDropdown) {
    const inputTarget = blocoDropdown.querySelector(".dropdown-target-input");
    const badge = blocoDropdown.querySelector(".dropdown-status-badge");
    if (!inputTarget || !badge) return;

    const targetTitle = (inputTarget.value || "").trim().toLowerCase();
    if (!targetTitle) {
      badge.textContent = "Sem Alvo";
      badge.className = "dropdown-status-badge disconnected";
      return;
    }

    const blocoAlvo = this.encontrarBlocoAlvo(targetTitle);
    if (blocoAlvo) {
      badge.textContent = "Alvo Conectado";
      badge.className = "dropdown-status-badge";
    } else {
      badge.textContent = "Alvo não Encontrado";
      badge.className = "dropdown-status-badge disconnected";
    }
  }

  /**
   * Localiza um bloco no Canvas pelo título (case-insensitive).
   */
  encontrarBlocoAlvo(tituloAlvo) {
    if (!tituloAlvo) return null;
    const cleanTarget = tituloAlvo.trim().toLowerCase();
    const blocosTexto = document.querySelectorAll('.draggable[data-type="text"]');

    for (const bloco of blocosTexto) {
      const title = (bloco.querySelector('.title-input')?.value || "").trim().toLowerCase();
      if (title === cleanTarget) {
        return bloco;
      }
    }
    return null;
  }

  /**
   * Projeta o conteúdo HTML do subcampo selecionado no bloco de destino.
   */
  projetarOpcaoSelecionada(blocoDropdown) {
    const select = blocoDropdown.querySelector(".dropdown-select-apple");
    const inputTarget = blocoDropdown.querySelector(".dropdown-target-input");
    if (!select || !inputTarget) return;

    const selectedOption = select.options[select.selectedIndex];
    if (!selectedOption || !selectedOption.value) return;

    const sourceId = selectedOption.dataset.sourceId;
    const subIdx = parseInt(selectedOption.dataset.subIdx, 10);

    const sourceBlock = document.getElementById("block_" + sourceId);
    if (!sourceBlock) return;

    const subcampos = sourceBlock.querySelectorAll('.sub-campo');
    const sourceSubcampo = subcampos[subIdx];
    if (!sourceSubcampo) return;

    const conteudoHtml = sourceSubcampo.innerHTML;
    const targetTitle = inputTarget.value.trim();

    const targetBlock = this.encontrarBlocoAlvo(targetTitle);
    if (targetBlock) {
      let targetSubcampo = targetBlock.querySelector('.sub-campo');
      if (!targetSubcampo) {
        const body = targetBlock.querySelector('.card-body') || targetBlock;
        targetSubcampo = document.createElement("div");
        targetSubcampo.className = "sub-campo";
        targetSubcampo.contentEditable = "true";
        body.appendChild(targetSubcampo);
      }

      // Injeta o HTML completo no bloco alvo
      targetSubcampo.innerHTML = conteudoHtml;
      
      // Preserva classes semânticas se houver (ex: classe-titulo, classe-conteudo)
      targetSubcampo.className = sourceSubcampo.className;

      // Dispara evento de input para persistir o bloco alvo no localStorage
      targetBlock.dispatchEvent(new Event('input', { bubbles: true }));
      this.atualizarStatusAlvo(blocoDropdown);
    } else {
      this.atualizarStatusAlvo(blocoDropdown);
    }
  }

  escaparHtml(str) {
    return (str || '').replace(/[&<>"']/g, function(m) {
      switch (m) {
        case '&': return '&amp;';
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '"': return '&quot;';
        case "'": return '&#39;';
        default: return m;
      }
    });
  }
}
