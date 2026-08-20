/**
 * MODULES: ResizeModule.js
 * Extensão global para injeção de alças de redimensionamento em blocos .draggable.
 * Suporta Pointer Events (Mouse, Toque Mobile e Stylus) com debounce via requestAnimationFrame.
 */
import { BaseModule } from '../BaseModule.js';
import { bus } from '../../core/EventBus.js';

export default class ResizeModule extends BaseModule {
  constructor() {
    super('resize', 'Módulo Global de Redimensionamento');
    this.observer = null;
  }

  init() {
    window.ResizeModule = this;

    bus.on('canvas:block-created', (bloco) => this.atribuirResize(bloco));
    bus.on('canvas:reload-request', () => this.varrerCanvasForçado());

    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            if (node.classList.contains('draggable')) {
              this.atribuirResize(node);
            }
            node.querySelectorAll?.('.draggable').forEach(bloco => this.atribuirResize(bloco));
          }
        });
      });
    });

    const canvas = document.getElementById('canvas');
    if (canvas) {
      this.observer.observe(canvas, { childList: true, subtree: false });
    }

    setTimeout(() => this.varrerCanvasForçado(), 50);
  }

  destroy() {
    super.destroy();
    if (this.observer) this.observer.disconnect();
  }

  varrerCanvasForçado() {
    const canvas = document.getElementById('canvas');
    if (canvas) {
      canvas.querySelectorAll('.draggable').forEach(bloco => this.atribuirResize(bloco));
    }
  }

  atribuirResize(bloco) {
    if (!bloco || bloco.querySelector('.resize-handle')) return;

    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    handle.style.touchAction = 'none';

    bloco.appendChild(handle);

    const iniciarResize = (e) => {
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();

      const inicioLargura = bloco.offsetWidth;
      const inicioAltura = bloco.offsetHeight;
      const inicioX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const inicioY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
      let ticking = false;

      const aoMovimentar = (ev) => {
        if (ev.cancelable) ev.preventDefault();

        if (!ticking) {
          window.requestAnimationFrame(() => {
            const moveX = ev.clientX !== undefined ? ev.clientX : (ev.touches && ev.touches[0] ? ev.touches[0].clientX : inicioX);
            const moveY = ev.clientY !== undefined ? ev.clientY : (ev.touches && ev.touches[0] ? ev.touches[0].clientY : inicioY);

            const zoom = window.CanvasZoomLevel || 1.0;
            const deltaX = (moveX - inicioX) / zoom;
            const deltaY = (moveY - inicioY) / zoom;

            const novaLargura = Math.max(160, inicioLargura + deltaX);
            const novaAltura = Math.max(100, inicioAltura + deltaY);

            bloco.style.width = novaLargura + 'px';
            bloco.style.height = novaAltura + 'px';

            const canvasInterno = bloco.querySelector('canvas');
            if (canvasInterno) {
              canvasInterno.width = Math.max(100, novaLargura - 20);
              canvasInterno.height = Math.max(100, novaAltura - 160);
            }

            bloco.dispatchEvent(new Event('input', { bubbles: true }));
            ticking = false;
          });
          ticking = true;
        }
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
        
        const uid = bloco.dataset.id;
        const chave = "data_" + uid;
        try {
          const dadosAntigos = JSON.parse(localStorage.getItem(chave)) || {};
          dadosAntigos.width = bloco.offsetWidth;
          dadosAntigos.height = bloco.offsetHeight;
          localStorage.setItem(chave, JSON.stringify(dadosAntigos));
        } catch (err) {
          console.warn("Falha ao persistir dimensões de resize:", err);
        }
      };

      document.addEventListener('pointermove', aoMovimentar, { passive: false });
      document.addEventListener('pointerup', aoFinalizar);
      document.addEventListener('pointercancel', aoFinalizar);
      document.addEventListener('mousemove', aoMovimentar);
      document.addEventListener('mouseup', aoFinalizar);
      document.addEventListener('touchmove', aoMovimentar, { passive: false });
      document.addEventListener('touchend', aoFinalizar);
      document.addEventListener('touchcancel', aoFinalizar);
    };

    handle.addEventListener('pointerdown', iniciarResize);
    handle.addEventListener('touchstart', iniciarResize, { passive: false });
    handle.addEventListener('mousedown', iniciarResize);
  }
}