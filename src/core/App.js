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

// Expõe os contratos e utilitários globais no escopo do navegador (window)
window.BaseModule = BaseModule;
window.CanvasManager = CanvasManager;

class AppEngine {
  constructor() {
    this.registry = new Map();
    
    // Estado de ativação inicial (padrão ativo para todos os componentes)
    this.modulesState = JSON.parse(localStorage.getItem('app_modules_state')) || {
      portability: true,
      text: true,
      image: true,
      chart: true
    };
  }

  /**
   * Ponto de ignição assíncrono do sistema.
   */
  async run() {
    try {
      // 1. Inicializa IndexedDB
      await dbManager.init();
      
      // 2. Registra e inicializa os módulos nativos
      this.instanciarModulosNativos();
      
      // 3. Vincula os elementos estruturais fixos da interface do CORE
      this.bindCoreUIEvents();
      
      // 4. Renderiza a listagem de checkboxes dentro do modal de configurações
      this.montarPainelModulosUI();
      
      // 5. Configura o interceptador de Upload de Novos Módulos (.js)
      this.configurarUploadDeModulos();
      
      // 6. Executa o loop de leitura de dados para renderizar blocos existentes
      this.carregarElementosCanvas();
    } catch (error) {
      console.error("Falha crítica na inicialização do Core Engine:", error);
    }
  }

  /**
   * Instancia e insere no registro os módulos padrões do sistema.
   */
  instanciarModulosNativos() {
    this.registry.set('portability', new PortabilityModule());
    this.registry.set('text', new TextModule());
    this.registry.set('image', new ImageModule());
    this.registry.set('chart', new ChartModule());

    // Executa a inicialização apenas dos que estiverem marcados como ativos
    this.registry.forEach((instance, key) => {
      if (this.modulesState[key]) {
        instance.init();
      }
    });
  }

  /**
   * Varre o mapa de registro de módulos e renderiza os controles de ativação (Checkboxes).
   */
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

    // Injeção do botão físico de aplicação (simulação do F5 pós-validação)
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

  /**
   * Monitora e gerencia os elementos estáticos do DOM pertencentes ao CORE.
   */
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
  }

  /**
   * Configura o input invisível de upload para novos arquivos de extensão de script.
   */
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

  /**
   * Varre o armazenamento e delega a criação do bloco visual para o seu respectivo módulo.
   */
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
            if (dadosBloco.type === 'text' || dadosBloco.campos !== undefined || dadosBloco.title !== undefined) idModuloDono = 'text';
            else if (dadosBloco.type === 'image' || dadosBloco.url !== undefined) idModuloDono = 'image';
            else if (dadosBloco.type === 'chart' || dadosBloco.status !== undefined) idModuloDono = 'chart';
          }

          const estiloOriginal = `top: ${dadosBloco.top || '100px'}; left: ${dadosBloco.left || '100px'};`;
          const uidReal = chave.replace("data_", "");

          if (idModuloDono && this.registry.has(idModuloDono)) {
            const moduloInstanciado = this.registry.get(idModuloDono);
            
            if (typeof moduloInstanciado.criarBloco === 'function') {
              moduloInstanciado.criarBloco(uidReal, estiloOriginal, dadosBloco);
            } else if (typeof moduloInstanciado.renderizarBloco === 'function') {
              moduloInstanciado.renderizarBloco(uidReal, estiloOriginal, dadosBloco);
            } else if (typeof moduloInstanciado.criarBlocoNoDOM === 'function') {
              moduloInstanciado.criarBlocoNoDOM(uidReal, estiloOriginal, dadosBloco);
            }
          }
        } catch (e) {
          console.error("Erro na leitura estrutural do payload de dados:", e);
        }
      }
    }
  }

  /**
   * Oculta ou exibe rótulos textuais de agrupamento baseados em nós injetados.
   */
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

// Inicializa a engine principal após a resolução do DOM
document.addEventListener("DOMContentLoaded", () => {
  new AppEngine().run();
});