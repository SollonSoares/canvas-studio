/**
 * MODULES: ImageModule.js
 * Gerencia a importação de arquivos locais, armazenamento no IndexedDB e renderização de imagens.
 */
import { BaseModule } from '../BaseModule.js';
import { dbManager } from '../../core/DB.js';
import { bus } from '../../core/EventBus.js';

export default class ImageModule extends BaseModule {
  constructor() {
    super('image', 'Módulo de Imagens');
    this.boundSearch = this.filtrarBlocosPorId.bind(this);
  }

  /**
   * Inicializa o módulo: Injeta o botão "Importar Imagem" no menu lateral.
   */
  init() {
    const containerBotoes = document.getElementById("container-gerenciamento-botoes");
    if (!containerBotoes) return;

    const btnAddImg = document.createElement("button");
    btnAddImg.id = "btn-add-img";
    btnAddImg.innerText = "Importar Imagem";
    btnAddImg.onclick = () => this.solicitarArquivoImagem();
    
    containerBotoes.appendChild(this.TRACK_UI(btnAddImg));

    // Ouvinte de busca global do ecossistema
    bus.on('search:query', this.boundSearch);
  }

  /**
   * Desativa o módulo limpando listeners da infraestrutura.
   */
  destroy() {
    super.destroy();
    bus.off('search:query', this.boundSearch);
  }

  /**
   * Abre a caixa de diálogo nativa do sistema operacional para seleção de mídias.
   */
  solicitarArquivoImagem() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        const imgId = "img_" + Date.now();
        const dataUrl = event.target.result;

        try {
          // Gravação assíncrona do binário no IndexedDB do Core
          await dbManager.salvarImagemIndexedDB(imgId, dataUrl);

          // Escrita de metadados de posicionamento no LocalStorage
          localStorage.setItem("data_" + imgId, JSON.stringify({
            top: "100px",
            left: "100px",
            type: "image",
            imgId: imgId
          }));

          // Renderização imediata na tela
          this.renderizarImagemCanvas(imgId, dataUrl, "100px", "100px");
        } catch (error) {
          console.error("Falha ao salvar mídia binária:", error);
          alert("Erro crítico ao armazenar imagem em disco local.");
        }
      };
      reader.readAsDataURL(file);
    };
    
    input.click();
  }

  /**
   * Constrói a árvore de nós DOM para exibição da imagem dentro do Canvas.
   */
  renderizarImagemCanvas(id, src, top, left) {
    const canvas = document.getElementById("canvas");
    if (!canvas || document.querySelector(`[data-id="${id}"]`)) return;

    const div = document.createElement("div");
    div.className = "draggable";
    div.dataset.id = id;
    div.dataset.type = "image";
    div.style.cssText = `top:${top || "100px"}; left:${left || "100px"};`;

    div.innerHTML = `
      <div class="drag-handle">
        <span>✥ Imagem</span>
        <span class="close-btn" style="cursor:pointer; float:right;">X</span>
      </div>
      <img src="${src}" draggable="false">
    `;

    // Ação de Exclusão
    div.querySelector(".close-btn").onclick = () => {
      localStorage.removeItem("data_" + id);
      // Nota: O registro binário permanece no IndexedDB para portabilidade caso desejado,
      // removendo apenas a ocorrência do Canvas.
      div.remove();
    };

    // Vincula o motor de arrasto geométrico do Core
    window.CanvasManager.makeDraggable(div, (target) => {
      localStorage.setItem("data_" + id, JSON.stringify({
        top: target.style.top,
        left: target.style.left,
        type: "image",
        imgId: id
      }));
    });

    canvas.appendChild(div);
  }

  /**
   * Como imagens não possuem texto interno editável, o filtro esconde o bloco 
   * a menos que o termo de busca case com o ID estrutural do arquivo.
   */
  filtrarBlocosPorId(termo) {
    const blocos = document.querySelectorAll('.draggable[data-type="image"]');
    blocos.forEach(bloco => {
      const id = bloco.dataset.id.toLowerCase();
      if (termo === "" || id.includes(termo)) {
        bloco.style.display = "";
      } else {
        bloco.style.display = "none";
      }
    });
  }
}