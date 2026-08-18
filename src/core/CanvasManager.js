/**
 * CORE: CanvasManager.js
 * Gerenciador geométrico de arraste e posicionamento de blocos no Canvas.
 * Implementa correção contra vazamento de memória e suporte a scroll em tempo real.
 */
let highestZIndex = 100;
let activeDragCleanup = null;

export class CanvasManager {
  static makeDraggable(element, onDragEndCallback) {
    const handle = element.querySelector('.drag-handle');
    if (!handle) return;

    // Desativa comportamentos nativos conflitantes de arrasto de imagens/texto
    handle.ondragstart = () => false;

    handle.addEventListener('mousedown', (e) => {
      // Ignora cliques em inputs, selects ou botões internos da alça
      if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A'].includes(e.target.tagName) || e.target.classList.contains('close-btn')) {
        return;
      }

      // Impede o início de seleção nativa e drag-and-drop fantasma do HTML5
      e.preventDefault();

      // Limpa qualquer listener residual de arrasto anterior que tenha ficado órfão
      if (activeDragCleanup) {
        activeDragCleanup();
      }

      // Eleva o bloco ativo para o topo da pilha visual
      highestZIndex += 1;
      element.style.zIndex = highestZIndex;

      const canvas = document.getElementById('canvas');
      const startMouseX = e.clientX;
      const startMouseY = e.clientY;
      const startElementLeft = element.offsetLeft;
      const startElementTop = element.offsetTop;
      const startScrollLeft = canvas ? canvas.scrollLeft : 0;
      const startScrollTop = canvas ? canvas.scrollTop : 0;

      const previousUserSelect = document.body.style.userSelect;
      document.body.style.userSelect = 'none';

      const aoMovimentar = (moveEvent) => {
        const currentScrollLeft = canvas ? canvas.scrollLeft : 0;
        const currentScrollTop = canvas ? canvas.scrollTop : 0;

        const deltaX = (moveEvent.clientX - startMouseX) + (currentScrollLeft - startScrollLeft);
        const deltaY = (moveEvent.clientY - startMouseY) + (currentScrollTop - startScrollTop);

        let novoX = startElementLeft + deltaX;
        let novoY = startElementTop + deltaY;

        // Snap to Grid (20px)
        novoX = Math.round(novoX / 20) * 20;
        novoY = Math.round(novoY / 20) * 20;

        if (novoX < 0) novoX = 0;
        if (novoY < 0) novoY = 0;

        element.style.left = `${novoX}px`;
        element.style.top = `${novoY}px`;
      };

      const aoFinalizar = () => {
        document.removeEventListener('mousemove', aoMovimentar);
        document.removeEventListener('mouseup', aoFinalizar);
        window.removeEventListener('blur', aoFinalizar);
        if (canvas) canvas.removeEventListener('scroll', aoMovimentar);

        document.body.style.userSelect = previousUserSelect;
        activeDragCleanup = null;

        if (typeof onDragEndCallback === 'function') {
          onDragEndCallback();
        }
      };

      activeDragCleanup = aoFinalizar;

      document.addEventListener('mousemove', aoMovimentar);
      document.addEventListener('mouseup', aoFinalizar);
      window.addEventListener('blur', aoFinalizar);
      if (canvas) canvas.addEventListener('scroll', aoMovimentar);
    });
  }
}