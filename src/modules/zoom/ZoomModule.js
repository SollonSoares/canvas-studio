/**
 * MODULES: ZoomModule.js
 * Módulo de Controle de Zoom & Pan para Canvas Studio (Mobile & Desktop).
 * Suporta Pinch-to-Zoom multitoque, gestos de pinça, botões flutuantes (HUD),
 * atalhos de teclado (Ctrl + Scroll, Ctrl + +/-/0), Double-Tap e Enquadramento Inteligente (Fit-to-Screen).
 */
import { BaseModule } from '../BaseModule.js';
import { Icons, createButtonContent } from '../../core/IconHelper.js';
import { bus } from '../../core/EventBus.js';

export default class ZoomModule extends BaseModule {
  constructor() {
    super('zoom', 'Zoom & Enquadramento do Palco');
    this.zoomLevel = parseFloat(localStorage.getItem('canvas_zoom_level')) || 1.0;
    this.minZoom = 0.2;
    this.maxZoom = 2.5;
    this.step = 0.1;
    this.hudElement = null;
    this.touchState = null;
    this.lastTapTime = 0;
    this.observer = null;
  }

  init() {
    window.ZoomModule = this;
    window.CanvasZoomLevel = this.zoomLevel;

    this.garantirStageContainer();
    this.criarHUDFlutuante();
    this.criarBotoesSidebar();
    this.configurarEventosTouchPinch();
    this.configurarEventosMouseWheel();
    this.configurarAtalhosTeclado();
    this.configurarDoubleTap();

    bus.on('canvas:reload-request', () => {
      this.garantirStageContainer();
      this.atualizarDimensoesStage();
    });

    bus.on('canvas:block-created', () => {
      this.garantirStageContainer();
      this.atualizarDimensoesStage();
    });

    // Aplica o nível de zoom inicial
    this.aplicarZoom(this.zoomLevel, false);

    // Se for em tela mobile pequena e houver blocos, verifica se deve sugerir fit
    if (window.innerWidth <= 768) {
      setTimeout(() => {
        const blocos = document.querySelectorAll('.draggable');
        if (blocos.length > 0 && this.zoomLevel === 1.0) {
          this.fitToScreen(true);
        }
      }, 300);
    }
  }

  destroy() {
    super.destroy();
    if (this.hudElement) {
      this.hudElement.remove();
      this.hudElement = null;
    }
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    window.CanvasZoomLevel = 1.0;
    const stage = document.getElementById("canvas-stage");
    if (stage) {
      stage.style.transform = "";
    }
  }

  /**
   * Garante que os blocos .draggable fiquem agrupados dentro de #canvas-stage
   * para que a transformação de escala funcione de forma homogênea.
   */
  garantirStageContainer() {
    const canvas = document.getElementById("canvas");
    if (!canvas) return;

    let stage = document.getElementById("canvas-stage");
    if (!stage) {
      stage = document.createElement("div");
      stage.id = "canvas-stage";
      
      // Move blocos já existentes para o stage
      const existingBlocks = Array.from(canvas.querySelectorAll(".draggable"));
      canvas.appendChild(stage);
      existingBlocks.forEach(b => stage.appendChild(b));
    }

    // Observa novos blocos adicionados diretamente ao #canvas e redireciona para #canvas-stage
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach(m => {
        m.addedNodes.forEach(node => {
          if (node.nodeType === 1 && node.classList.contains("draggable") && node.parentElement === canvas) {
            stage.appendChild(node);
          }
        });
      });
    });

    this.observer.observe(canvas, { childList: true });
  }

  /**
   * Cria o widget flutuante de controle de Zoom (HUD) no canto inferior da tela.
   */
  criarHUDFlutuante() {
    if (this.hudElement) this.hudElement.remove();

    const hud = document.createElement("div");
    hud.id = "zoom-hud-widget";
    hud.className = "zoom-floating-widget";
    hud.innerHTML = `
      <button id="btn-zoom-out" class="zoom-btn" title="Diminuir Zoom (Ctrl -)" aria-label="Diminuir Zoom">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
      </button>

      <button id="btn-zoom-indicator" class="zoom-indicator-btn" title="Clique para redefinir para 100%" aria-label="Nível de zoom">
        <span id="zoom-percentage-text">${Math.round(this.zoomLevel * 100)}%</span>
      </button>

      <button id="btn-zoom-in" class="zoom-btn" title="Aumentar Zoom (Ctrl +)" aria-label="Aumentar Zoom">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
      </button>

      <div class="zoom-divider"></div>

      <button id="btn-zoom-fit" class="zoom-btn" title="Enquadrar todos os blocos na tela" aria-label="Enquadrar na tela">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
      </button>
    `;

    document.body.appendChild(this.TRACK_UI(hud));
    this.hudElement = hud;

    hud.querySelector("#btn-zoom-out")?.addEventListener("click", () => this.zoomOut());
    hud.querySelector("#btn-zoom-in")?.addEventListener("click", () => this.zoomIn());
    hud.querySelector("#btn-zoom-indicator")?.addEventListener("click", () => this.alternarPresetsZoom());
    hud.querySelector("#btn-zoom-fit")?.addEventListener("click", () => this.fitToScreen());
  }

  /**
   * Adiciona botões de atalho de Zoom na barra lateral (sidebar).
   */
  criarBotoesSidebar() {
    const containerPalco = document.getElementById("container-palco-botoes");
    if (!containerPalco) return;

    const btnFitSidebar = document.createElement("button");
    btnFitSidebar.id = "btn-sidebar-zoom-fit";
    btnFitSidebar.className = "btn btn-secondary";
    btnFitSidebar.innerHTML = createButtonContent('fitScreen', 'Enquadrar Palco');
    btnFitSidebar.title = "Ajusta o zoom para exibir todos os blocos na tela";
    btnFitSidebar.onclick = () => this.fitToScreen();

    containerPalco.appendChild(this.TRACK_UI(btnFitSidebar));
  }

  /**
   * Aplica o nível de zoom no palco do Canvas e ajusta a matriz visual.
   */
  aplicarZoom(novoZoom, animar = true, centroX = null, centroY = null) {
    const canvas = document.getElementById("canvas");
    const stage = document.getElementById("canvas-stage");
    if (!canvas || !stage) return;

    const zoomAnterior = this.zoomLevel;
    const zoomClamped = Math.max(this.minZoom, Math.min(this.maxZoom, parseFloat(novoZoom.toFixed(2))));
    this.zoomLevel = zoomClamped;
    window.CanvasZoomLevel = zoomClamped;
    localStorage.setItem('canvas_zoom_level', zoomClamped.toString());

    // Se centro foi informado (ex: cursor do mouse ou pinça), ajusta scroll para manter ponto focal
    if (centroX !== null && centroY !== null && zoomAnterior !== zoomClamped) {
      const rect = canvas.getBoundingClientRect();
      const mouseCanvasX = (centroX - rect.left) + canvas.scrollLeft;
      const mouseCanvasY = (centroY - rect.top) + canvas.scrollTop;

      const fator = zoomClamped / zoomAnterior;
      canvas.scrollLeft = (mouseCanvasX * fator) - (centroX - rect.left);
      canvas.scrollTop = (mouseCanvasY * fator) - (centroY - rect.top);
    }

    if (animar) {
      stage.style.transition = "transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)";
    } else {
      stage.style.transition = "none";
    }

    stage.style.transform = `scale(${zoomClamped})`;
    stage.style.transformOrigin = "0 0";

    // Atualiza o tamanho do stage para que os scrollbars do canvas acompanhem o zoom
    this.atualizarDimensoesStage();

    // Atualiza o indicador percentual no HUD
    const indicator = document.getElementById("zoom-percentage-text");
    if (indicator) {
      indicator.innerText = `${Math.round(zoomClamped * 100)}%`;
    }

    bus.emit('canvas:zoom-changed', zoomClamped);
  }

  /**
   * Atualiza a largura e altura do #canvas-stage para sincronizar scrollbars do canvas.
   */
  atualizarDimensoesStage() {
    const canvas = document.getElementById("canvas");
    const stage = document.getElementById("canvas-stage");
    if (!canvas || !stage) return;

    const blocos = Array.from(stage.querySelectorAll(".draggable"));
    let maxX = 1200;
    let maxY = 800;

    blocos.forEach(b => {
      const x = b.offsetLeft + (b.offsetWidth || 200);
      const y = b.offsetTop + (b.offsetHeight || 150);
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    });

    const padding = 200;
    const larguraMundo = (maxX + padding);
    const alturaMundo = (maxY + padding);

    stage.style.width = `${larguraMundo}px`;
    stage.style.height = `${alturaMundo}px`;
  }

  zoomIn() {
    this.aplicarZoom(this.zoomLevel + this.step);
  }

  zoomOut() {
    this.aplicarZoom(this.zoomLevel - this.step);
  }

  resetZoom() {
    this.aplicarZoom(1.0);
  }

  alternarPresetsZoom() {
    const presets = [0.5, 0.75, 1.0, 1.25, 1.5];
    let proximo = presets.find(p => p > this.zoomLevel + 0.05);
    if (!proximo) proximo = presets[0];
    this.aplicarZoom(proximo);
  }

  /**
   * Ajusta o zoom e scroll para enquadrar todos os blocos ativos na tela (Fit to Screen).
   */
  fitToScreen(animar = true) {
    const canvas = document.getElementById("canvas");
    const stage = document.getElementById("canvas-stage");
    if (!canvas || !stage) return;

    const blocos = Array.from(stage.querySelectorAll(".draggable")).filter(b => b.style.display !== "none");
    if (blocos.length === 0) {
      this.resetZoom();
      return;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    blocos.forEach(b => {
      const x = b.offsetLeft;
      const y = b.offsetTop;
      const w = b.offsetWidth || 200;
      const h = b.offsetHeight || 150;

      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x + w > maxX) maxX = x + w;
      if (y + h > maxY) maxY = y + h;
    });

    const padding = 40;
    const larguraTotal = Math.max(100, (maxX - minX) + padding * 2);
    const alturaTotal = Math.max(100, (maxY - minY) + padding * 2);

    const viewportW = canvas.clientWidth || window.innerWidth;
    const viewportH = canvas.clientHeight || window.innerHeight;

    const scaleX = viewportW / larguraTotal;
    const scaleY = viewportH / alturaTotal;
    let idealZoom = Math.min(scaleX, scaleY);

    // Clampa entre os limites e não ultrapassa 100% no fit automático
    idealZoom = Math.max(this.minZoom, Math.min(1.0, idealZoom));

    this.aplicarZoom(idealZoom, animar);

    // Centraliza o scroll no conteúdo
    setTimeout(() => {
      const scrollAlvoX = Math.max(0, (minX - padding / 2) * idealZoom);
      const scrollAlvoY = Math.max(0, (minY - padding / 2) * idealZoom);
      canvas.scrollTo({
        left: scrollAlvoX,
        top: scrollAlvoY,
        behavior: animar ? "smooth" : "auto"
      });
    }, 50);
  }

  /**
   * Configura o gesto multitoque de pinça (Pinch-to-Zoom) no Mobile.
   */
  configurarEventosTouchPinch() {
    const canvas = document.getElementById("canvas");
    if (!canvas) return;

    let touchStartDist = 0;
    let touchStartZoom = 1.0;
    let isPinching = false;

    canvas.addEventListener("touchstart", (e) => {
      if (e.touches.length === 2) {
        // Ignora se estiver digitando em input ou contenteditable
        if (['INPUT', 'TEXTAREA'].includes(e.target.tagName) || e.target.isContentEditable) {
          return;
        }

        isPinching = true;
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        touchStartDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        touchStartZoom = this.zoomLevel;
      }
    }, { passive: true });

    canvas.addEventListener("touchmove", (e) => {
      if (isPinching && e.touches.length === 2) {
        if (e.cancelable) e.preventDefault();

        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        
        if (touchStartDist > 0) {
          const ratio = currentDist / touchStartDist;
          const novoZoom = touchStartZoom * ratio;
          const midX = (t1.clientX + t2.clientX) / 2;
          const midY = (t1.clientY + t2.clientY) / 2;

          this.aplicarZoom(novoZoom, false, midX, midY);
        }
      }
    }, { passive: false });

    const finalizarPinch = () => {
      if (isPinching) {
        isPinching = false;
        touchStartDist = 0;
        // Snap suave pós-pinça
        this.aplicarZoom(this.zoomLevel, true);
      }
    };

    canvas.addEventListener("touchend", finalizarPinch, { passive: true });
    canvas.addEventListener("touchcancel", finalizarPinch, { passive: true });
  }

  /**
   * Configura o zoom via roda do mouse com Ctrl (ou trackpad pinch no desktop).
   */
  configurarEventosMouseWheel() {
    const canvas = document.getElementById("canvas");
    if (!canvas) return;

    canvas.addEventListener("wheel", (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.08 : 0.08;
        this.aplicarZoom(this.zoomLevel + delta, false, e.clientX, e.clientY);
      }
    }, { passive: false });
  }

  /**
   * Configura atalhos de teclado (Ctrl +, Ctrl -, Ctrl 0).
   */
  configurarAtalhosTeclado() {
    window.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && !e.target.isContentEditable && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          this.zoomIn();
        } else if (e.key === "-") {
          e.preventDefault();
          this.zoomOut();
        } else if (e.key === "0") {
          e.preventDefault();
          this.resetZoom();
        }
      }
    });
  }

  /**
   * Toque duplo em área vazia do Canvas alterna entre Fit e 100%.
   */
  configurarDoubleTap() {
    const canvas = document.getElementById("canvas");
    if (!canvas) return;

    canvas.addEventListener("click", (e) => {
      if (e.target !== canvas && e.target.id !== "canvas-stage") return;

      const agora = Date.now();
      if (agora - this.lastTapTime < 300) {
        if (Math.abs(this.zoomLevel - 1.0) < 0.05) {
          this.fitToScreen();
        } else {
          this.resetZoom();
        }
      }
      this.lastTapTime = agora;
    });
  }
}
