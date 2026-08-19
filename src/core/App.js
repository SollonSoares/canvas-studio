/**
 * CORE: App.js
 * O Orquestrador Central do Ecossistema. Gerencia o ciclo de vida, UI fixa, modais e injeção dinâmica de módulos.
 */
import { dbManager } from './DB.js';
import { bus } from './EventBus.js';
import { CanvasManager } from './CanvasManager.js';
import { BaseModule } from '../modules/BaseModule.js';
import { Icons, createButtonContent } from './IconHelper.js';

// Importação síncrona dos módulos nativos do sistema
import PortabilityModule from '../modules/portability/PortabilityModule.js';
import TextModule from '../modules/text/TextModule.js';
import ImageModule from '../modules/image/ImageModule.js';
import ChartModule from '../modules/chart/ChartModule.js';
import ResizeModule from '../modules/resize/ResizeModule.js';
import OrganizerModule from '../modules/organizer/OrganizerModule.js';

// Expõe os contratos e utilitários globais no escopo do navegador (window)
window.BaseModule = BaseModule;
window.CanvasManager = CanvasManager;
window.Icons = Icons;
window.createButtonContent = createButtonContent;
window.bus = bus;

/**
 * Adaptador Dinâmico para scripts e classes de módulos enviados via Upload.
 * Permite ciclo de vida completo (init/destroy) e remoção atômica do DOM.
 */
export class DynamicScriptModule extends BaseModule {
  constructor(id, name, codeString) {
    super(id, name);
    this.codeString = codeString;
    this.instance = null;
  }

  init() {
    this.destroy(); // Garante limpeza prévia

    const nodesBefore = new Set(document.querySelectorAll('*'));

    try {
      // Injeta variáveis no escopo e executa o código
      const func = new Function('BaseModule', 'Icons', 'createButtonContent', 'bus', 'CanvasManager', `
        ${this.codeString}
        if (typeof TextFormatterModule !== 'undefined') return TextFormatterModule;
        if (typeof CustomModule !== 'undefined') return CustomModule;
        return null;
      `);

      const exportedClass = func(window.BaseModule, window.Icons, window.createButtonContent, window.bus, window.CanvasManager);

      // Se o script exportar uma classe BaseModule
      if (exportedClass && typeof exportedClass === 'function') {
        this.instance = new exportedClass();
        this.instance.init();
        return;
      }

      // Se for um script direto (IIFE ou widget standalone), rastreia os nós adicionados ao DOM
      document.querySelectorAll('*').forEach(el => {
        if (!nodesBefore.has(el)) {
          if (el.parentElement === document.body || el.closest('#nav-controls') || el.id.includes('widget')) {
            this.TRACK_UI(el);
          }
        }
      });
    } catch (e) {
      console.error(`Erro ao inicializar módulo dinâmico "${this.name}":`, e);
    }
  }

  destroy() {
    if (this.instance && typeof this.instance.destroy === 'function') {
      try {
        this.instance.destroy();
      } catch (e) {
        console.error(`Erro ao destruir sub-instância de "${this.name}":`, e);
      }
      this.instance = null;
    }

    super.destroy();

    // Limpeza de segurança para widgets conhecidos
    const widgets = document.querySelectorAll(`[id*="widget"], [id*="formatter"], [id*="dice"], [data-module-id="${this.id}"]`);
    widgets.forEach(w => {
      if (w.parentElement === document.body) {
        w.remove();
      }
    });
  }
}

class AppEngine {
  constructor() {
    this.registry = new Map();
    
    this.modulesState = JSON.parse(localStorage.getItem('app_modules_state')) || {
      organizer: true,
      portability: true,
      text: true,
      image: true,
      chart: true,
      resize: true
    };

    // Módulos customizados persistidos no localStorage
    this.customModules = JSON.parse(localStorage.getItem('app_custom_modules')) || {};
  }

  async run() {
    try {
      await dbManager.init();
      this.instanciarModulosNativos();
      this.carregarModulosCustomizados();
      this.bindCoreUIEvents();
      this.configurarDimensoesCanvas();
      this.montarPainelModulosUI();
      this.configurarUploadDeModulos();
      this.carregarElementosCanvas();
    } catch (error) {
      console.error("Falha crítica na inicialização do Core Engine:", error);
    }
  }

  instanciarModulosNativos() {
    this.registry.set('organizer', new OrganizerModule());
    this.registry.set('portability', new PortabilityModule());
    this.registry.set('text', new TextModule());
    this.registry.set('image', new ImageModule());
    this.registry.set('chart', new ChartModule());
    
    const resizeInst = new ResizeModule();
    this.registry.set('resize', resizeInst);
    window.ResizeModule = resizeInst;

    this.registry.forEach((instance, key) => {
      if (this.modulesState[key] !== false) {
        instance.init();
      }
    });
  }

  carregarModulosCustomizados() {
    Object.entries(this.customModules).forEach(([id, modData]) => {
      try {
        const instance = new DynamicScriptModule(id, modData.name, modData.code);
        this.registry.set(id, instance);
        if (this.modulesState[id] !== false) {
          instance.init();
        }
      } catch (err) {
        console.error(`Falha ao restaurar módulo customizado "${modData.name}":`, err);
      }
    });
  }

  montarPainelModulosUI() {
    const painel = document.getElementById("module-activation-panel");
    if (!painel) return;

    painel.innerHTML = "";

    this.registry.forEach((modulo, idModulo) => {
      const estarAtivo = this.modulesState[idModulo] !== false;
      const isCustom = idModulo.startsWith("custom_");

      const itemLinha = document.createElement("div");
      itemLinha.style.display = "flex";
      itemLinha.style.alignItems = "center";
      itemLinha.style.justifyContent = "space-between";
      itemLinha.style.padding = "8px 10px";
      itemLinha.style.marginBottom = "6px";
      itemLinha.style.background = "var(--bg-input)";
      itemLinha.style.borderRadius = "var(--radius-sm)";
      itemLinha.style.border = "1px solid var(--border-subtle)";

      const infoContainer = document.createElement("div");
      infoContainer.style.display = "flex";
      infoContainer.style.alignItems = "center";
      infoContainer.style.gap = "8px";

      const labelTexto = document.createElement("span");
      labelTexto.innerText = modulo.name || idModulo;
      labelTexto.style.fontSize = "12px";
      labelTexto.style.fontWeight = "500";
      infoContainer.appendChild(labelTexto);

      if (isCustom) {
        const badge = document.createElement("span");
        badge.innerText = "Custom";
        badge.style.fontSize = "9px";
        badge.style.padding = "2px 5px";
        badge.style.borderRadius = "4px";
        badge.style.background = "var(--accent-subtle)";
        badge.style.color = "var(--accent)";
        badge.style.fontWeight = "700";
        badge.style.textTransform = "uppercase";
        infoContainer.appendChild(badge);
      }

      const controlsContainer = document.createElement("div");
      controlsContainer.style.display = "flex";
      controlsContainer.style.alignItems = "center";
      controlsContainer.style.gap = "8px";

      // Apple Switch Liga/Desliga Reativo em Tempo Real
      const switchBtn = document.createElement("button");
      switchBtn.className = "apple-switch" + (estarAtivo ? " active" : "");
      switchBtn.title = estarAtivo ? "Desativar módulo" : "Ativar módulo";
      switchBtn.innerHTML = `<span class="thumb"></span>`;

      switchBtn.onclick = (e) => {
        e.stopPropagation();
        const novoEstado = !this.modulesState[idModulo];
        this.modulesState[idModulo] = novoEstado;
        localStorage.setItem("app_modules_state", JSON.stringify(this.modulesState));

        switchBtn.classList.toggle("active", novoEstado);
        switchBtn.title = novoEstado ? "Desativar módulo" : "Ativar módulo";

        if (novoEstado) {
          modulo.init();
        } else {
          modulo.destroy();
        }
        this.gerenciarVisibilidadeLabelGerenciamento();
      };

      controlsContainer.appendChild(switchBtn);

      // Botão de exclusão para módulos customizados
      if (isCustom) {
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "btn-close-style";
        deleteBtn.title = "Excluir módulo customizado";
        deleteBtn.innerHTML = Icons.trash;
        deleteBtn.style.width = "22px";
        deleteBtn.style.height = "22px";
        deleteBtn.style.color = "var(--text-muted)";

        deleteBtn.onclick = (e) => {
          e.stopPropagation();
          if (confirm(`Deseja excluir permanentemente o módulo "${modulo.name}"?`)) {
            modulo.destroy();
            this.registry.delete(idModulo);
            delete this.customModules[idModulo];
            delete this.modulesState[idModulo];
            localStorage.setItem("app_custom_modules", JSON.stringify(this.customModules));
            localStorage.setItem("app_modules_state", JSON.stringify(this.modulesState));
            this.montarPainelModulosUI();
            this.gerenciarVisibilidadeLabelGerenciamento();
          }
        };
        controlsContainer.appendChild(deleteBtn);
      }

      itemLinha.appendChild(infoContainer);
      itemLinha.appendChild(controlsContainer);
      painel.appendChild(itemLinha);
    });

    if (this.registry.size === 0) {
      painel.innerHTML = "<span style='color: var(--text-muted); font-style: italic; font-size: 12px;'>Nenhum módulo detectado.</span>";
    }
  }

  configurarDimensoesCanvas() {
    const inputW = document.getElementById("input-canvas-w");
    const inputH = document.getElementById("input-canvas-h");
    const btnSalvar = document.getElementById("btn-save-canvas-size");
    const canvas = document.getElementById("canvas");

    const dimensoesSalvas = JSON.parse(localStorage.getItem("app_canvas_dimensions"));
    if (dimensoesSalvas && canvas) {
      if (dimensoesSalvas.width) {
        canvas.style.minWidth = dimensoesSalvas.width + "px";
        if (inputW) inputW.value = dimensoesSalvas.width;
      }
      if (dimensoesSalvas.height) {
        canvas.style.minHeight = dimensoesSalvas.height + "px";
        if (inputH) inputH.value = dimensoesSalvas.height;
      }
    }

    if (btnSalvar && canvas) {
      btnSalvar.onclick = () => {
        const w = parseInt(inputW?.value);
        const h = parseInt(inputH?.value);

        if (w && w >= 100) {
          canvas.style.minWidth = w + "px";
        } else {
          canvas.style.minWidth = "";
        }

        if (h && h >= 100) {
          canvas.style.minHeight = h + "px";
        } else {
          canvas.style.minHeight = "";
        }

        localStorage.setItem("app_canvas_dimensions", JSON.stringify({
          width: w || null,
          height: h || null
        }));

        alert("Dimensões do Canvas aplicadas com sucesso!");
      };
    }
  }

  bindCoreUIEvents() {
    const sideMenu = document.getElementById("dashboard-menu");
    const toggleSide = document.getElementById("toggle-sidebar");
    const mobileMenuTrigger = document.getElementById("mobile-menu-trigger");
    const btnCloseMobileMenu = document.getElementById("btn-close-mobile-menu");
    const backdrop = document.getElementById("sidebar-backdrop");
    const modal = document.getElementById("settings-modal");
    const btnOpenSet = document.getElementById("btn-open-settings");
    const btnCloseSet = document.getElementById("btn-close-settings");
    const brandTitle = document.getElementById("brand-title");

    // Gerenciador de Abertura/Fechamento do Menu Gaveta no Mobile
    const toggleMobileMenu = (abrir) => {
      if (!sideMenu) return;
      const isOpen = abrir !== undefined ? abrir : !sideMenu.classList.contains("open");
      sideMenu.classList.toggle("open", isOpen);
      if (backdrop) {
        backdrop.classList.toggle("active", isOpen);
      }
    };

    if (mobileMenuTrigger) {
      mobileMenuTrigger.addEventListener("click", () => toggleMobileMenu(true));
    }

    if (btnCloseMobileMenu) {
      btnCloseMobileMenu.addEventListener("click", () => toggleMobileMenu(false));
    }

    if (backdrop) {
      backdrop.addEventListener("click", () => toggleMobileMenu(false));
    }

    // Fecha a gaveta no mobile ao selecionar uma ferramenta
    sideMenu?.addEventListener("click", (e) => {
      if (window.innerWidth <= 768) {
        if (e.target.closest('.btn-secondary') || e.target.closest('.btn-primary') || e.target.closest('#btn-open-settings') || e.target.closest('#btn-clear-canvas')) {
          toggleMobileMenu(false);
        }
      }
    });

    if (toggleSide && sideMenu) {
      toggleSide.addEventListener("click", () => {
        sideMenu.classList.toggle("collapsed");
      });
    }

    if (brandTitle) {
      const tituloSalvo = localStorage.getItem("app_brand_title");
      if (tituloSalvo) brandTitle.innerText = tituloSalvo;
      
      brandTitle.addEventListener("blur", () => {
        localStorage.setItem("app_brand_title", brandTitle.innerText.trim() || "Naruto RPG");
      });
    }

    if (btnOpenSet && modal) {
      btnOpenSet.onclick = (e) => {
        e.preventDefault();
        modal.style.display = "flex";
        this.montarPainelModulosUI();
      };
    }
    
    if (btnCloseSet && modal) {
      btnCloseSet.onclick = (e) => {
        e.preventDefault();
        modal.style.display = "none";
      };
    }
    
    if (modal) {
      modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = "none";
      };
    }

    const btnTheme = document.getElementById("btn-theme");
    if (btnTheme) {
      const aplicarTema = (isLight) => {
        document.body.classList.toggle("light-mode", isLight);
        btnTheme.classList.toggle("active", isLight);
        localStorage.setItem("theme", isLight ? "light" : "dark");
        bus.emit('theme:changed', isLight);
      };
      if (localStorage.getItem("theme") === "light") aplicarTema(true);
      btnTheme.onclick = () => aplicarTema(!document.body.classList.contains("light-mode"));
    }

    let searchTimeout;
    document.getElementById("input-search")?.addEventListener("input", function() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        bus.emit('search:query', this.value.toLowerCase());
      }, 150);
    });

    bus.on('canvas:reload-request', () => {
      const canvas = document.getElementById("canvas");
      if (canvas) canvas.innerHTML = "";
      this.carregarElementosCanvas();
    });

    this.gerenciarVisibilidadeLabelGerenciamento();
    this.injetarBotaoLimparCanvas();
  }

  injetarBotaoLimparCanvas() {
    const container = document.getElementById("container-palco-botoes") || document.getElementById("container-gerenciamento-botoes");
    if (!container) return;

    const btnLimpar = document.createElement("button");
    btnLimpar.id = "btn-clear-canvas";
    btnLimpar.className = "btn btn-danger";
    btnLimpar.innerHTML = createButtonContent('trash', 'Limpar Canvas');
    btnLimpar.title = "Apaga permanentemente todos os blocos do Canvas";

    btnLimpar.onclick = () => {
      const confirmacao = confirm("⚠️ ATENÇÃO! Esta ação irá apagar TODOS os blocos do Canvas permanentemente. Deseja continuar?");
      if (confirmacao) {
        this.executarResetTotal();
      }
    };

    container.appendChild(btnLimpar);
  }

  async executarResetTotal() {
    try {
      Object.keys(localStorage).forEach(chave => {
        if (chave.startsWith("data_") && chave !== "data_brand_title" && chave !== "data_modules_state" && chave !== "app_modules_state" && chave !== "app_custom_modules" && chave !== "app_canvas_dimensions") {
          localStorage.removeItem(chave);
        }
      });

      if (dbManager.db) {
        const tx = dbManager.db.transaction("images", "readwrite");
        const store = tx.objectStore("images");
        await new Promise((resolve, reject) => {
          const req = store.clear();
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
      }

      const canvas = document.getElementById("canvas");
      if (canvas) canvas.innerHTML = "";

      console.log("Reset total do Canvas executado com sucesso.");
    } catch (error) {
      console.error("Falha crítica durante a purgação de dados do sistema:", error);
    }
  }

  configurarUploadDeModulos() {
    const inputUpload = document.getElementById("input-upload-module");
    inputUpload?.addEventListener("change", (e) => {
      const arquivo = e.target.files[0];
      if (!arquivo) return;

      const nomeModulo = arquivo.name.replace(/\.js$/i, '').replace(/[-_]/g, ' ');
      const idModulo = "custom_" + Date.now();

      const leitor = new FileReader();
      leitor.onload = (evento) => {
        try {
          const codigo = evento.target.result;

          // Cria a instância do módulo dinâmico
          const instance = new DynamicScriptModule(idModulo, nomeModulo, codigo);
          this.registry.set(idModulo, instance);

          // Persiste o código do módulo
          this.customModules[idModulo] = { name: nomeModulo, code: codigo };
          localStorage.setItem("app_custom_modules", JSON.stringify(this.customModules));

          // Define estado ativado e persiste
          this.modulesState[idModulo] = true;
          localStorage.setItem("app_modules_state", JSON.stringify(this.modulesState));

          // Inicializa o módulo imediatamente
          instance.init();

          // Atualiza a interface da lista no modal
          this.montarPainelModulosUI();
          this.gerenciarVisibilidadeLabelGerenciamento();

          alert(`✅ Módulo "${nomeModulo}" carregado e ativado com sucesso!`);
        } catch (erro) {
          console.error("Falha ao processar arquivo de módulo script:", erro);
          alert("❌ Falha ao carregar o módulo.");
        }
        inputUpload.value = "";
      };
      leitor.readAsText(arquivo);
    });
  }

  carregarElementosCanvas() {
    console.log("Sincronizando estado geométrico do Canvas...");

    for (let i = 0; i < localStorage.length; i++) {
      const chave = localStorage.key(i);
      
      if (chave.startsWith("data_") && chave !== "data_brand_title" && chave !== "data_modules_state" && chave !== "app_modules_state" && chave !== "app_custom_modules" && chave !== "app_canvas_dimensions") {
        try {
          const dadosBloco = JSON.parse(localStorage.getItem(chave));
          if (!dadosBloco) continue;

          let idModuloDono = dadosBloco.origin || dadosBloco.modulo;
          
          if (!idModuloDono) {
            if (dadosBloco.type) {
              idModuloDono = dadosBloco.type;
            } else if (dadosBloco.campos !== undefined) {
              idModuloDono = 'text';
            } else if (dadosBloco.url !== undefined) {
              idModuloDono = 'image';
            } else if (dadosBloco.inputs !== undefined || dadosBloco.status !== undefined) {
              idModuloDono = 'chart';
            }
          }

          const estiloOriginal = `top: ${dadosBloco.top || '100px'}; left: ${dadosBloco.left || '100px'};`;
          const uidReal = chave.replace("data_", "");

          if (idModuloDono && this.registry.has(idModuloDono)) {
            const moduloInstanciado = this.registry.get(idModuloDono);
            
            if (idModuloDono === 'chart') {
              if (typeof moduloInstanciado.criarBloco === 'function') {
                moduloInstanciado.criarBloco(uidReal, estiloOriginal, dadosBloco.inputs || dadosBloco.status, dadosBloco.title);
              } else if (typeof moduloInstanciado.renderizarBloco === 'function') {
                moduloInstanciado.renderizarBloco(uidReal, estiloOriginal, dadosBloco.inputs || dadosBloco.status);
              }
            } else {
              if (typeof moduloInstanciado.criarBloco === 'function') {
                moduloInstanciado.criarBloco(uidReal, estiloOriginal, dadosBloco);
              } else if (typeof moduloInstanciado.renderizarBloco === 'function') {
                moduloInstanciado.renderizarBloco(uidReal, estiloOriginal, dadosBloco);
              } else if (typeof moduloInstanciado.criarBlocoNoDOM === 'function') {
                moduloInstanciado.criarBlocoNoDOM(uidReal, estiloOriginal, dadosBloco);
              }
            }
          }
        } catch (e) {
          console.error("Erro na leitura estrutural do payload de dados:", e);
        }
      }
    }
  }

  gerenciarVisibilidadeLabelGerenciamento() {
    const checkGroup = (containerId, groupId) => {
      const container = document.getElementById(containerId);
      const grupo = document.getElementById(groupId);
      if (container && grupo) {
        grupo.style.display = container.children.length === 0 ? "none" : "flex";
      }
    };

    checkGroup("container-criacao-botoes", "group-criacao");
    checkGroup("container-palco-botoes", "group-palco");
    checkGroup("container-portabilidade-botoes", "group-portabilidade");
    checkGroup("container-gerenciamento-botoes", "group-gerenciamento");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new AppEngine().run();
});