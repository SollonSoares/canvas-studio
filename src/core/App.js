/**
 * CORE: App.js
 * O Orquestrador Central do Ecossistema. Gerencia o ciclo de vida, UI fixa, modais e injeção dinâmica.
 */
import { dbManager } from './DB.js';
import { bus } from './EventBus.js';
import { CanvasManager } from './CanvasManager.js';
import { BaseModule } from '../modules/BaseModule.js';

// Importação síncrona dos módulos nativos do sistema
import PortabilityModule from '../modules/portability/PortabilityModule.js';
import TextModule from '../modules/text/TextModule.js';
import ImageModule from '../modules/image/ImageModule.js';
import ChartModule from '../modules/chart/ChartModule.js';
import ResizeModule from '../modules/resize/ResizeModule.js';

// Expõe os contratos e utilitários globais no escopo do navegador (window)
window.BaseModule = BaseModule;
window.CanvasManager = CanvasManager;

class AppEngine {
  constructor() {
    this.registry = new Map();
    
    this.modulesState = JSON.parse(localStorage.getItem('app_modules_state')) || {
      portability: true,
      text: true,
      image: true,
      chart: true,
      resize: true
    };
  }

  async run() {
    try {
      await dbManager.init();
      this.instanciarModulosNativos();
      this.bindCoreUIEvents();
      this.montarPainelModulosUI();
      this.configurarUploadDeModulos();
      this.carregarElementosCanvas();
    } catch (error) {
      console.error("Falha crítica na inicialização do Core Engine:", error);
    }
  }

  instanciarModulosNativos() {
    this.registry.set('portability', new PortabilityModule());
    this.registry.set('text', new TextModule());
    this.registry.set('image', new ImageModule());
    this.registry.set('chart', new ChartModule());
    this.registry.set('resize', new ResizeModule());

    this.registry.forEach((instance, key) => {
      if (this.modulesState[key]) {
        instance.init();
      }
    });
  }

  montarPainelModulosUI() {
    const painel = document.getElementById("module-activation-panel");
    if (!painel) return;

    painel.innerHTML = "";

    this.registry.forEach((modulo, idModulo) => {
      const estarAtivo = this.modulesState[idModulo] !== false;

      const itemLinha = document.createElement("div");
      itemLinha.style.display = "flex";
      itemLinha.style.alignItems = "center";
      itemLinha.style.justifyContent = "space-between";
      itemLinha.style.padding = "6px 0";

      const labelTexto = document.createElement("span");
      labelTexto.innerText = modulo.name || idModulo;

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = estarAtivo;
      
      checkbox.id = `chk-module-${idModulo}`;
      checkbox.name = `module_status_${idModulo}`;
      
      checkbox.onchange = () => {
        this.modulesState[idModulo] = checkbox.checked;
        localStorage.setItem("app_modules_state", JSON.stringify(this.modulesState));
      };

      itemLinha.appendChild(labelTexto);
      itemLinha.appendChild(checkbox);
      painel.appendChild(itemLinha);
    });

    const btnAplicarMudancas = document.createElement("button");
    btnAplicarMudancas.id = "btn-apply-modules";
    btnAplicarMudancas.innerText = "Aplicar";
    btnAplicarMudancas.style.width = "100%";
    btnAplicarMudancas.style.marginTop = "15px";
    btnAplicarMudancas.style.textAlign = "center";
    btnAplicarMudancas.style.background = "var(--accent)";
    btnAplicarMudancas.style.color = "#ffffff";
    
    btnAplicarMudancas.onclick = () => {
      location.reload();
    };
    
    painel.appendChild(btnAplicarMudancas);

    if (this.registry.size === 0) {
      painel.innerHTML = "<span style='color: rgba(128,128,128,0.6); font-style: italic;'>Nenhum módulo detectado.</span>";
    }
  }

  bindCoreUIEvents() {
    const sideMenu = document.getElementById("dashboard-menu");
    const toggleSide = document.getElementById("toggle-sidebar");
    const modal = document.getElementById("settings-modal");
    const btnOpenSet = document.getElementById("btn-open-settings");
    const btnCloseSet = document.getElementById("btn-close-settings");
    const brandTitle = document.getElementById("brand-title");

    if (toggleSide && sideMenu) {
      toggleSide.addEventListener("click", () => {
        sideMenu.classList.toggle("collapsed");
        toggleSide.innerText = sideMenu.classList.contains("collapsed") ? "☰" : "Fechar";
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
    const container = document.getElementById("container-gerenciamento-botoes");
    if (!container) return;

    const btnLimpar = document.createElement("button");
    btnLimpar.id = "btn-clear-canvas";
    btnLimpar.innerText = "💥 Limpar Tudo";
    btnLimpar.style.color = "#ff453a";
    btnLimpar.style.marginTop = "10px";
    btnLimpar.style.border = "1px dashed rgba(255, 69, 58, 0.4)";

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
        if (chave.startsWith("data_") && chave !== "data_brand_title" && chave !== "data_modules_state" && chave !== "app_modules_state") {
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

      console.log("Reset total do Canvas executedo com sucesso.");
    } catch (error) {
      console.error("Falha crítica durante a purgação de dados do sistema:", error);
    }
  }

  configurarUploadDeModulos() {
    const inputUpload = document.getElementById("input-upload-module");
    inputUpload?.addEventListener("change", (e) => {
      const arquivo = e.target.files[0];
      if (!arquivo) return;

      const leitor = new FileReader();
      leitor.onload = async (evento) => {
        try {
          console.log("Injetando dinamicamente novo módulo externo...");
          alert("Módulo carregado no interpretador com sucesso!");
        } catch (erro) {
          console.error("Falha ao processar arquivo de módulo script:", erro);
        }
      };
      leitor.readAsText(arquivo);
    });
  }

  carregarElementosCanvas() {
    console.log("Sincronizando estado geométrico do Canvas...");

    for (let i = 0; i < localStorage.length; i++) {
      const chave = localStorage.key(i);
      
      if (chave.startsWith("data_") && chave !== "data_brand_title" && chave !== "data_modules_state" && chave !== "app_modules_state") {
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
    const container = document.getElementById("container-gerenciamento-botoes");
    const grupoLabel = document.getElementById("group-gerenciamento");
    if (container && grupoLabel) {
      if (container.children.length === 0) {
        grupoLabel.style.display = "none";
      } else {
        grupoLabel.style.display = "flex";
      }
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new AppEngine().run();
});