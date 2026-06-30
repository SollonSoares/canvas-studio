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
   * Dispara a janela nativa de upload de arquivos restrita a formatos de imagem.
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
        const dataUrlString = event.target.result;
        const idGerado = "img_" + Math.random().toString(36).substr(2, 9);
        
        try {
          // Gravação assíncrona do payload pesado no ObjectStore
          await dbManager.salvarImagemIndexedDB(idGerado, dataUrlString);
          
          // Gravação síncrona dos metadados posicionais no LocalStorage
          localStorage.setItem("data_" + idGerado, JSON.stringify({
            top: "150px",
            left: "150px",
            type: "image",
            imgId: idGerado
          }));

          this.renderizarImagemCanvas(idGerado, "top:150px; left:150px;", dataUrlString);
        } catch (dbError) {
          console.error("Falha ao persistir objeto de imagem no IndexedDB:", dbError);
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }

  /**
   * Método chamado pela engine de carregamento do Core. Busca o binário assincronamente e renderiza.
   */
  async renderizarBloco(id, cssStyle, dadosMetadados) {
    const idImagemReal = dadosMetadados.imgId || id;
    const stringBinaria = await dbManager.obterImagemIndexedDB(idImagemReal);
    
    // Fallback visual de imagem quebrada/inexistente no banco local
    const fallbackSrc = stringBinaria || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='rgba(255,0,0,0.1)'/><text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' fill='red' font-size='10'>Mídia Ausente</text></svg>";
    
    this.renderizarImagemCanvas(idImagemReal, cssStyle, fallbackSrc);
  }

  renderizarImagemCanvas(id, cssStyle, src) {
    const canvas = document.getElementById("canvas");
    if (!canvas) return;

    const div = document.createElement("div");
    div.className = "draggable";
    div.id = "block_" + id;
    div.dataset.id = id;
    div.dataset.type = "image";
    div.style.cssText = cssStyle;

    div.innerHTML = `
      <div class="drag-handle">
        <span>✥ Imagem</span>
        <span class="close-btn" style="cursor:pointer; float:right;">X</span>
      </div>
      <img src="${src}" draggable="false">
    `;

    // RESOLUÇÃO DE VAZAMENTO DE MEMÓRIA (EXPURGO ATÔMICO)
    div.querySelector(".close-btn").onclick = async () => {
      try {
        localStorage.removeItem("data_" + id);
        
        if (dbManager.db) {
          const tx = dbManager.db.transaction("images", "readwrite");
          tx.objectStore("images").delete(id);
        }
        
        div.remove();
      } catch (error) {
        console.error("Erro ao expurgar mídia do banco de dados:", error);
      }
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
      const idBloco = bloco.dataset.id.toLowerCase();
      if (idBloco.includes(termo) || termo === "") {
        bloco.style.display = "block";
      } else {
        bloco.style.display = "none";
      }
    });
  }
}