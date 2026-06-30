# Canvas Studio

Estúdio de desenho interativo usando HTML Canvas.

👉 **[Clique aqui para acessar o projeto em execução](https://sollonsoares.github.io/canvas-studio/)**

---
# DOCUMENTAÇÃO TÉCNICA: CANVAS STUDIO (NARUTO RPG)
> **Status do Projeto:** Operacional & Modularizado (v1.2.0)
> **Stack Técnica:** HTML5, CSS3 (Custom Properties), Vanilla JavaScript (ES6 Modules), Web Storage (LocalStorage & IndexedDB API).
> **URL Oficial:** https://sollonsoares.github.io/canvas-studio/

---

## 1. Visão Geral do Sistema
O Canvas Studio é uma aplicação web voltada para a criação, organização e renderização de painéis e fichas interativas para sistemas de RPG (customizado para Naruto RPG). O sistema opera sob uma arquitetura de micro-módulos desacoplados orientados a um barramento central de eventos (*EventBus*), provendo gerenciamento dinâmico de blocos arrastáveis alinhados a grid e persistência offline local tolerante a falhas.

---

## 2. Funcionalidades de Arquitetura e Interface

### 2.1 Interface Base e Layout Responsivo Colapsável
O layout adota uma abordagem de painel administrativo dividida em um menu lateral funcional (`aside`) e uma área de trabalho dinâmica (`main`).
* Menu Lateral: Agrupa ferramentas de busca, customização, gerenciamento e edição de texto. Possui estado colapsável (`.collapsed`) via gatilho de manipulação do DOM.
* Área de Trabalho (Canvas): Utiliza um motor visual puramente em CSS para simular uma esteira infinita de design através de gradientes radiais.

> 📋 Requisito Sênior [REQ-001]: Isolamento de Estado Visual e Performance de Layout
> * A transição de colapso do menu lateral DEVE utilizar aceleração gráfica via hardware (propriedades de transição otimizadas e variáveis de tempo de animação com curvas de interpolação cubic-bezier), garantindo taxa de atualização de 60fps estáveis.
> * Elementos textuais ocultados no estado colapsado DEVEM ser completamente removidos do fluxo de renderização (`display: none !important`) para evitar problemas de estouro de layout (layout overflow) e cliques acidentais no menu minimizado.

### 2.2 Micro-Orquestrador Central (`App.js`) e Ciclo de Vida Reativo
O motor da aplicação foi completamente refatorado para operar sob o controle do `AppEngine`. 
* Registro de Módulos: Através de um mapa dinâmico (`this.registry`), o Core gerencia o ciclo de vida e o estado de ativação de extensões isoladas (`PortabilityModule`, `TextModule`, `ImageModule`, `ChartModule`).
* Painel Reativo de Ativação: O painel de controle mapeia caixas de seleção injetadas em tempo de execução. Para mitigar problemas de injeção repetida e empilhamento de nós invisíveis no DOM, o Core adota um protocolo estrito de limpeza e oferece o botão físico **Aplicar** para salvar e reidratar os estados de forma atômica e determinística.

### 2.3 Sistema Magnético de Movimentação (Snap-to-Grid)
Os blocos de conteúdo e imagens (`.draggable`) são renderizados na camada superior com posicionamento absoluto e eixos computados em tempo real através do barramento.
* Alinhamento: Todo cálculo de coordenadas X/Y passa por um truncamento matemático baseado na constante mapeada pelo `CanvasManager.js`.

```javascript
// Motor de alinhamento ao grid em CanvasManager.js
div.style.left = Math.round((ev.pageX - sx) / gridSize) * gridSize + "px";
div.style.top = Math.round((ev.pageY - sy) / gridSize) * gridSize + "px";
