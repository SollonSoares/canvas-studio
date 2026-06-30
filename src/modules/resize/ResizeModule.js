/**
 * MODULES: ResizeModule.js
 * Extensão global para injeção de alças de redimensionamento em blocos .draggable.
 */
import { BaseModule } from '../BaseModule.js';
import { bus } from '../../core/EventBus.js';

export default class ResizeModule extends BaseModule {
  constructor() {
    super('resize', 'Módulo Global de Redimensionamento');
  }

  init() {
    window.ResizeModule = this;

    // 1. Vincula uma escuta ao barramento global para capturar reidratações de outros módulos externos
    bus.on('canvas:block-created', (bloco) => this.atribuirResize(bloco));
    bus.on('canvas:reload-request', () => this.varrerCanvasForçado());

    // 2. Cria o MutationObserver de redundância para capturar novos elementos injetados em tempo de execução
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            if (node.classList.contains('draggable')) {
              this.atribuirResize(node);
            }
            // Varre o nó de forma profunda caso múltiplos blocos venham aninhados
            node.querySelectorAll?.('.draggable').forEach(bloco => this.atribuirResize(bloco));
          }
        });
      });
    });

    const canvas = document.getElementById('canvas');
    if (canvas) {
      observer.observe(canvas, { childList: true, subtree: true });
    }

    // 3. Executa a varredura forçada inicial (macro-task) para garantir os blocos carregados no boot do App.js
    setTimeout(() => this.varrerCanvasForçado(), 50);
  }

  /**
   * Executa uma busca ativa varrendo todo o DOM do canvas em busca de blocos órfãos de alça.
   */
  varrerCanvasForçado() {
    const canvas = document.getElementById('canvas');
    if (canvas) {
      canvas.querySelectorAll('.draggable').forEach(bloco => this.atribuirResize(bloco));
    }
  }

  /**
   * Injeta o nó da alça e gerencia os eventos de arrasto dimensional com injeção forçada de estilo.
   */
  atribuirResize(bloco) {
    if (!bloco || bloco.querySelector('.resize-handle')) return;

    const handle = document.createElement('div');
    handle.className = 'resize-handle';
    
    // Injeção forçada inline para garantir padronização visual em todos os tipos de blocos (imagens, textos, gráficos)
    handle.style.setProperty('position', 'absolute', 'important');
    handle.style.setProperty('width', '14px', 'important');
    handle.style.setProperty('height', '14px', 'important');
    handle.style.setProperty('background-color', '#007aff', 'important'); // Azul correspondente ao padrão da sua interface
    handle.style.setProperty('right', '2px', 'important');
    handle.style.setProperty('bottom', '2px', 'important');
    handle.style.setProperty('cursor', 'se-resize', 'important');
    handle.style.setProperty('border-radius', '50%', 'important');
    handle.style.setProperty('border', '2px solid #ffffff', 'important');
    handle.style.setProperty('box-shadow', '0 2px 6px rgba(0,0,0,0.6)', 'important');
    handle.style.setProperty('z-index', '2147483647', 'important');
    handle.style.setProperty('display', 'block', 'important');

    bloco.appendChild(handle);

    handle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      e.preventDefault();

      const inicioLargura = bloco.offsetWidth;
      const inicioAltura = bloco.offsetHeight;
      const inicioX = e.clientX;
      const inicioY = e.clientY;

      const aoMovimentar = (ev) => {
        const deltaX = ev.clientX - inicioX;
        const deltaY = ev.clientY - inicioY;

        const novaLargura = Math.max(150, inicioLargura + deltaX);
        const novaAltura = Math.max(100, inicioAltura + deltaY);

        bloco.style.width = novaLargura + 'px';
        bloco.style.height = novaAltura + 'px';

        // Atualização dinâmica genérica de contêineres e wraps internos de mídia
        const imgInterna = bloco.querySelector('img');
        if (imgInterna) {
          imgInterna.style.width = '100%';
          imgInterna.style.height = 'calc(100% - 30px)';
        }

        const canvasInterno = bloco.querySelector('canvas');
        if (canvasInterno) {
          canvasInterno.width = novaLargura - 20;
          canvasInterno.height = novaAltura - 60;
        }

        bloco.dispatchEvent(new Event('input', { bubbles: true }));
      };

      const aoFinalizar = () => {
        document.removeEventListener('mousemove', aoMovimentar);
        document.removeEventListener('mouseup', aoFinalizar);
        
        const uid = bloco.dataset.id;
        const chave = "data_" + uid;
        const dadosAntigos = JSON.parse(localStorage.getItem(chave));
        if (dadosAntigos) {
          dadosAntigos.width = bloco.offsetWidth;
          dadosAntigos.height = bloco.offsetHeight;
          localStorage.setItem(chave, JSON.stringify(dadosAntigos));
        }
      };

      document.addEventListener('mousemove', aoMovimentar);
      document.addEventListener('mouseup', aoFinalizar);
    });
  }
}