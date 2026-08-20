/**
 * MODULES: ResizeModule.js
 * Extensão global para injeção de alças de redimensionamento em blocos .draggable.
 * Suporta Pointer Events modernos com setPointerCapture, debounce via requestAnimationFrame e compensação de zoom.
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
      const inicioX = e.clientX;
      const inicioY = e.clientY;
      let ticking = false;
      let lastEvent = null;

      const atualizarDimensoes = () => {
        if (!lastEvent) return;
        const zoom = window.CanvasZoomLevel || 1.0;
        const deltaX = (lastEvent.clientX - inicioX) / zoom;
        const deltaY = (lastEvent.clientY - inicioY) / zoom;

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
      };

      const aoMovimentar = (ev) => {
        if (ev.cancelable) ev.preventDefault();
        lastEvent = ev;
        if (!ticking) {
          window.requestAnimationFrame(atualizarDimensoes);
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

      try {
        if (handle.setPointerCapture) {
          handle.setPointerCapture(e.pointerId);
        }
      } catch (err) {}

      handle.addEventListener('pointermove', aoMovimentar, { passive: false });
      handle.addEventListener('pointerup', aoFinalizar);
      handle.addEventListener('pointercancel', aoFinalizar);
    };

    handle.addEventListener('pointerdown', iniciarResize);
  }
}