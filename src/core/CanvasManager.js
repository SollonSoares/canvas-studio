/**
 * CORE: CanvasManager.js
 * Gerenciador geométrico de arraste e posicionamento de blocos no Canvas.
 * Utiliza Pointer Events modernos com setPointerCapture, throttling via requestAnimationFrame e compensação de zoom.
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

      // Apenas botão primário do mouse/touch
      if (e.button !== undefined && e.button !== 0) return;

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
      const startMouseX = e.clientX;
      const startMouseY = e.clientY;
      const startElementLeft = element.offsetLeft;
      const startElementTop = element.offsetTop;
      const startScrollLeft = canvas ? canvas.scrollLeft : 0;
      const startScrollTop = canvas ? canvas.scrollTop : 0;

      const previousUserSelect = document.body.style.userSelect;
      document.body.style.userSelect = 'none';

      let ticking = false;
      let lastEvent = null;

      const atualizarPosicao = () => {
        if (!lastEvent) return;
        const currentScrollLeft = canvas ? canvas.scrollLeft : 0;
        const currentScrollTop = canvas ? canvas.scrollTop : 0;
        const zoom = window.CanvasZoomLevel || 1.0;

        const deltaX = ((lastEvent.clientX - startMouseX) + (currentScrollLeft - startScrollLeft)) / zoom;
        const deltaY = ((lastEvent.clientY - startMouseY) + (currentScrollTop - startScrollTop)) / zoom;

        let novoX = Math.round((startElementLeft + deltaX) / 20) * 20;
        let novoY = Math.round((startElementTop + deltaY) / 20) * 20;

        if (novoX < 0) novoX = 0;
        if (novoY < 0) novoY = 0;

        element.style.left = `${novoX}px`;
        element.style.top = `${novoY}px`;
        ticking = false;
      };

      const aoMovimentar = (moveEvent) => {
        if (moveEvent.cancelable) moveEvent.preventDefault();
        lastEvent = moveEvent;
        if (!ticking) {
          window.requestAnimationFrame(atualizarPosicao);
          ticking = true;
        }
      };

      const aoFinalizar = () => {
        try {
          if (handle.hasPointerCapture && handle.hasPointerCapture(e.pointerId)) {
            handle.releasePointerCapture(e.pointerId);
          }
        } catch (err) {}

        handle.removeEventListener('pointermove', aoMovimentar);
        handle.removeEventListener('pointerup', aoFinalizar);
        handle.removeEventListener('pointercancel', aoFinalizar);
        window.removeEventListener('blur', aoFinalizar);
        if (canvas) canvas.removeEventListener('scroll', aoMovimentar);

        document.body.style.userSelect = previousUserSelect;
        activeDragCleanup = null;

        if (typeof onDragEndCallback === 'function') {
          onDragEndCallback();
        }
      };

      activeDragCleanup = aoFinalizar;

      try {
        if (handle.setPointerCapture) {
          handle.setPointerCapture(e.pointerId);
        }
      } catch (err) {}

      handle.addEventListener('pointermove', aoMovimentar, { passive: false });
      handle.addEventListener('pointerup', aoFinalizar);
      handle.addEventListener('pointercancel', aoFinalizar);
      window.addEventListener('blur', aoFinalizar);
      if (canvas) canvas.addEventListener('scroll', aoMovimentar);
    };

    handle.addEventListener('pointerdown', iniciarArrasto);
  }
}