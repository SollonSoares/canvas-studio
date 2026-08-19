/**
 * CORE: CanvasManager.js
 * Gerenciador geométrico de arraste e posicionamento de blocos no Canvas.
 * Suporta Pointer Events (Mouse, Toque Mobile e Stylus), prevenção de vazamento de memória e scroll em tempo real.
 */
let highestZIndex = 100;
let activeDragCleanup = null;

export class CanvasManager {
  static makeDraggable(element, onDragEndCallback) {
    const handle = element.querySelector('.drag-handle');
    if (!handle) return;

    // Desativa comportamentos nativos conflitantes de arrasto de imagens/texto e scroll na alça
    handle.ondragstart = () => false;
    handle.style.touchAction = 'none';

    const iniciarArrasto = (e) => {
      // Ignora toques/cliques em inputs, selects ou botões internos da alça
      if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON', 'A'].includes(e.target.tagName) || e.target.closest('.close-btn')) {
        return;
      }

      // Impede o início de seleção nativa e scroll do navegador durante o arrasto
      if (e.cancelable) {
        e.preventDefault();
      }

      // Limpa qualquer listener residual de arrasto anterior
      if (activeDragCleanup) {
        activeDragCleanup();
      }

      // Eleva o bloco ativo para o topo da pilha visual
      highestZIndex += 1;
      element.style.zIndex = highestZIndex;

      const canvas = document.getElementById('canvas');
      const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);

      const startMouseX = clientX;
      const startMouseY = clientY;
      const startElementLeft = element.offsetLeft;
      const startElementTop = element.offsetTop;
      const startScrollLeft = canvas ? canvas.scrollLeft : 0;
      const startScrollTop = canvas ? canvas.scrollTop : 0;

      const previousUserSelect = document.body.style.userSelect;
      document.body.style.userSelect = 'none';

      const aoMovimentar = (moveEvent) => {
        if (moveEvent.cancelable) {
          moveEvent.preventDefault();
        }

        const moveX = moveEvent.clientX !== undefined ? moveEvent.clientX : (moveEvent.touches && moveEvent.touches[0] ? moveEvent.touches[0].clientX : startMouseX);
        const moveY = moveEvent.clientY !== undefined ? moveEvent.clientY : (moveEvent.touches && moveEvent.touches[0] ? moveEvent.touches[0].clientY : startMouseY);

        const currentScrollLeft = canvas ? canvas.scrollLeft : 0;
        const currentScrollTop = canvas ? canvas.scrollTop : 0;

        const deltaX = (moveX - startMouseX) + (currentScrollLeft - startScrollLeft);
        const deltaY = (moveY - startMouseY) + (currentScrollTop - startScrollTop);

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
        document.removeEventListener('pointermove', aoMovimentar);
        document.removeEventListener('pointerup', aoFinalizar);
        document.removeEventListener('pointercancel', aoFinalizar);
        document.removeEventListener('mousemove', aoMovimentar);
        document.removeEventListener('mouseup', aoFinalizar);
        document.removeEventListener('touchmove', aoMovimentar);
        document.removeEventListener('touchend', aoFinalizar);
        document.removeEventListener('touchcancel', aoFinalizar);
        window.removeEventListener('blur', aoFinalizar);
        if (canvas) canvas.removeEventListener('scroll', aoMovimentar);

        document.body.style.userSelect = previousUserSelect;
        activeDragCleanup = null;

        if (typeof onDragEndCallback === 'function') {
          onDragEndCallback();
        }
      };

      activeDragCleanup = aoFinalizar;

      // Suporte unificado a Pointer Events, Touch Events e Mouse Events
      document.addEventListener('pointermove', aoMovimentar, { passive: false });
      document.addEventListener('pointerup', aoFinalizar);
      document.addEventListener('pointercancel', aoFinalizar);
      document.addEventListener('mousemove', aoMovimentar);
      document.addEventListener('mouseup', aoFinalizar);
      document.addEventListener('touchmove', aoMovimentar, { passive: false });
      document.addEventListener('touchend', aoFinalizar);
      document.addEventListener('touchcancel', aoFinalizar);
      window.addEventListener('blur', aoFinalizar);
      if (canvas) canvas.addEventListener('scroll', aoMovimentar);
    };

    handle.addEventListener('pointerdown', iniciarArrasto);
    handle.addEventListener('touchstart', iniciarArrasto, { passive: false });
    handle.addEventListener('mousedown', iniciarArrasto);
  }
}