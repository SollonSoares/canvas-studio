/**
 * CORE: CanvasManager.js
 * Motor matemático abstrato de posicionamento geométrico e alinhamento ao grid.
 */
import { bus } from './EventBus.js';

export class CanvasManager {
  /**
   * Vincula a lógica de arrasto (Drag & Drop) alinhada ao grid em um elemento DOM.
   * @param {HTMLElement} div - O contêiner pai do bloco (.draggable).
   * @param {Function} saveCallback - Função executada ao soltar o bloco para persistência.
   * @param {number} [gridSize=20] - Tamanho da célula do grid em pixels.
   */
  static makeDraggable(div, saveCallback, gridSize = 20) {
    const handle = div.querySelector(".drag-handle");
    if (!handle) return;

    const handleDown = (e) => {
      // Impede o arrasto caso o clique ocorra em elementos de interação interna
      if (e.target.classList.contains("close-btn") || e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") {
        return;
      }
      
      let sx = e.clientX - div.offsetLeft;
      let sy = e.clientY - div.offsetTop;

      const move = (ev) => {
        // Aplica o cálculo matemático de arredondamento para travar as coordenadas no Grid
        div.style.left = Math.round((ev.pageX - sx) / gridSize) * gridSize + "px";
        div.style.top = Math.round((ev.pageY - sy) / gridSize) * gridSize + "px";
        
        // Notifica o sistema que um bloco está se movendo (útil para redescenhar o Gráfico Ninja, por exemplo)
        bus.emit('canvas:element-moving', div);
      };

      const handleUp = () => {
        document.removeEventListener("mousemove", move);
        document.removeEventListener("mouseup", handleUp);
        
        // Executa a persistência específica implementada pelo módulo proprietário do bloco
        saveCallback(div);
      };

      document.addEventListener("mousemove", move);
      document.addEventListener("mouseup", handleUp);
    };

    handle.addEventListener("mousedown", handleDown);
  }
}