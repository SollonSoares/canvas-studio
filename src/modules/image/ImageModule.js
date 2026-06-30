/**
 * MODULES: ImageModule.js
 * Gerenciamento de imagens limpo, adaptado para herdar o ResizeModule global.
 */
import { BaseModule } from '../BaseModule.js';

export default class ImageModule extends BaseModule {
  constructor() {
    super('image', 'Módulo de Imagens');
  }

  init() {
    const containerBotoes = document.getElementById("container-gerenciamento-botoes");
    if (containerBotoes) {
      const btnAddImg = document.createElement("button");
      btnAddImg.id = "btn-add-image";
      btnAddImg.innerText = "Inserir Imagem por URL";
      btnAddImg.onclick = () => this.solicitarUrlImagem();
      containerBotoes.appendChild(this.TRACK_UI(btnAddImg));
    }
  }

  solicitarUrlImagem() {
    const url = prompt("Insira a URL pública da imagem:");
    if (!url || url.trim() === "") return;

    const uid = "img_" + Date.now();
    this.criarBloco(uid, "top:120px; left:120px; width:200px; height:230px;", { 
      url: url.trim(), 
      title: "Nova Imagem"
    });
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
    div.dataset.type = "image";
    
    if (dadosIniciais?.width) div.style.width = dadosIniciais.width + "px";
    if (dadosIniciais?.height) div.style.height = dadosIniciais.height + "px";
    div.style.cssText += style || "top:100px; left:100px;";

    const titulo = dadosIniciais?.title || "Imagem do personagem";
    const urlImagem = dadosIniciais?.url || "";
    
    div.innerHTML = `
      <div class="drag-handle">
        <span>✥ Imagem</span>
        <input class="title-input" value="${titulo}" style="flex:1; margin:0 5px; background:none; border:none; color:inherit; outline:none; font-weight:bold;">
        <span class="close-btn" style="cursor:pointer;">X</span>
      </div>
      <div class="image-wrapper" style="width:100%; height:calc(100% - 30px); padding:5px; box-sizing:border-box; display:flex; align-items:center; justify-content:center;">
        <img id="img_view_${id}" src="${urlImagem}" alt="Carregando..." style="width:100%; height:100%; object-fit:cover; display:block; border-radius:4px;">
      </div>
    `;

    const imgElement = div.querySelector(`#img_view_${id}`);
    imgElement.onerror = () => {
      imgElement.src = "";
      imgElement.alt = "Erro ao carregar URL";
    };

    const salvarEstado = () => {
      localStorage.setItem("data_" + id, JSON.stringify({
        top: div.style.top,
        left: div.style.left,
        width: div.offsetWidth,
        height: div.offsetHeight,
        type: "image",
        title: div.querySelector(".title-input").value,
        url: urlImagem
      }));
    };

    div.addEventListener('input', salvarEstado);
    div.querySelector(".close-btn").onclick = () => {
      localStorage.removeItem("data_" + id);
      div.remove();
    };

    window.CanvasManager.makeDraggable(div, () => salvarEstado());
    canvasContainer.appendChild(div);

    // Injeção explícita pós-inserção no DOM para mitigar falhas do ciclo do MutationObserver
    if (window.ResizeModule && typeof window.ResizeModule.atribuirResize === 'function') {
      window.ResizeModule.atribuirResize(div);
    }

    salvarEstado();
  }
}