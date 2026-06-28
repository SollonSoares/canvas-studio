# Canvas Studio

Estúdio de desenho interativo usando HTML Canvas.

👉 **[Clique aqui para acessar o projeto em execução](https://sollonsoares.github.io/canvas-studio/)**

---
# DOCUMENTAÇÃO TÉCNICA: CANVAS STUDIO (NARUTO RPG)
> **Status do Projeto:** Operacional (v1.0.0)
> **Stack Técnica:** HTML5, CSS3 (Custom Properties), Vanilla JavaScript, Web Storage (LocalStorage & IndexedDB API).
> **URL Oficial:** https://sollonsoares.github.io/canvas-studio/

---

## 1. Visão Geral do Sistema
O Canvas Studio é uma aplicação web voltada para a criação, organização e renderização de painéis e fichas interativas para sistemas de RPG (customizado para Naruto RPG). O sistema opera no modelo "Single Page Application (SPA) Estática", permitindo o gerenciamento visual de blocos através de interações de arrastar-e-soltar baseadas em uma grade lógica, provendo persistência offline local robusta.

---

## 2. Funcionalidades de Arquitetura e Interface

### 2.1 Interface Base e Layout Responsivo Colapsável
O layout adota uma abordagem de painel administrativo dividida em um menu lateral funcional (`aside`) e uma área de trabalho dinâmica (`main`).
* Menu Lateral: Agrupa ferramentas de busca, customização, gerenciamento e edição de texto. Possui estado colapsável (`.collapsed`) via gatilho de manipulação do DOM.
* Área de Trabalho (Canvas): Utiliza um motor visual puramente em CSS para simular uma esteira infinita de design através de gradientes radiais.

> 📋 Requisito Sênior [REQ-001]: Isolamento de Estado Visual e Performance de Layout
> * A transição de colapso do menu lateral DEVE utilizar aceleração gráfica via hardware (propriedades de transição otimizadas e variáveis de tempo de animação com curvas de interpolação cubic-bezier), garantindo taxa de atualização de 60fps estáveis.
> * Elementos textuais ocultados no estado colapsado DEVEM ser completamente removidos do fluxo de renderização (`display: none !important`) para evitar problemas de estouro de layout (layout overflow) e cliques acidentais no menu minimizado.

---

### 2.2 Sistema Magnético de Movimentação (Snap-to-Grid)
Os blocos de conteúdo e imagens (`.draggable`) são renderizados na camada superior com posicionamento absoluto e eixos computados em tempo real através de escuta de eventos de ponteiro (`mousedown`, `mousemove`, `mouseup`).
* Alinhamento: Todo cálculo de coordenadas X/Y passa por um truncamento matemático baseado na constante `GRID_SIZE = 20`.

Exemplo matemático do motor de alinhamento:
div.style.left = Math.round((ev.pageX - sx) / GRID_SIZE) * GRID_SIZE + "px";

> 📋 Requisito Sênior [REQ-002]: Gerenciamento Nativo de Eventos e Precisão Matemática
> * O cálculo de arrasto DEVE mitigar problemas de descolamento do cursor através da injeção dos escutadores (EventListeners) no objeto global `document` e não no elemento isolado, garantindo continuidade do arrasto mesmo se o mouse mover-se mais rápido do que a computação do DOM.
> * O encerramento do evento (`mouseup`) DEVE realizar o descarte explícito (garbage collection manual de listeners) das funções de movimentação para evitar vazamento de memória (memory leaks).

---

## 3. Funcionalidades de Dados e Persistência

### 3.1 Arquitetura Híbrida de Armazenamento Local
O sistema utiliza uma estratégia de duas camadas para salvar o estado da aplicação localmente, otimizando o ciclo de vida da memória do navegador:
* LocalStorage: Armazena apenas payloads leves no formato JSON stringify (coordenadas de posição, metadados de texto e ponteiros de referência de imagem).
* IndexedDB (`CanvasMediaDB`): Utiliza um Object Store assíncrono para gravar grandes volumes de blobs binários convertidos em strings Base64 de imagens importadas.

> 📋 Requisito Sênior [REQ-003]: Tolerância a Falhas e Estratégia Antiestouro (Storage Overfill)
> * O sistema NÃO DEVE sob nenhuma circunstância salvar imagens no LocalStorage, garantindo conformidade com o limite técnico restrito de 5MB imposto pelos navegadores.
> * A renderização inicial da tela DEVE ser assíncrona, aguardando o gatilho de sucesso da conexão com o IndexedDB (`onsuccess`) para só então disparar a varredura (`renderizar()`) dos ponteiros do LocalStorage, evitando quebras de carregamento de mídia na tela.

---

### 3.2 Subsistema de Importação e Exportação de Estado (JSON Pipeline)
A aplicação expõe uma funcionalidade de portabilidade onde todo o estado atual do DOM mapeado é varrido, injetado em um vetor estruturado e exportado via Clipboard API. O fluxo inverso limpa a memória atual e reconstrói o grafo de componentes.

> 📋 Requisito Sênior [REQ-004]: Integridade Teórica de Dados Externos
> * A função de importação DEVE implementar um bloco de tratamento de exceções (try-catch) estrito. Qualquer payload corrompido ou fora do schema padrão deve abortar a operação imediatamente antes de limpar o armazenamento existente (rollback lógico), emitindo um alerta amigável de erro de parse de dados.

---

## 4. Funcionalidades de Conteúdo e Utilitários

### 4.1 Mini-Editor WYSIWYG Dinâmico
Permite edições inline ricas em elementos marcados como `contentEditable`. Captura o foco através do evento `focusin` e expõe manipulações de estilos e fontes globalmente no escopo do objeto `window`.

> 📋 Requisito Sênior [REQ-005]: Gestão de Foco e Prevenção de Perda de Escopo
> * Botões de ação do editor de texto DEVEM conter o método `event.preventDefault()` no evento `onmousedown`. Isso garante que o clique no botão do menu não roube o foco do texto atualmente selecionado no Canvas, mantendo a referência ativa para as execuções de comandos de estilo.

---

### 4.2 Motor de Busca Textual Multi-Escopo
O campo de busca realiza uma varredura iterativa nos nós do DOM. Ele lê o valor do input de título e concatena dinamicamente os valores de texto internos (`innerText`) de todos os subcampos do bloco para verificar a existência da substring pesquisada.

> 📋 Requisito Sênior [REQ-006]: Filtragem Não Destrutiva
> * A busca DEVE atuar exclusivamente sobre a propriedade de visibilidade visual (`style.display = 'none'`), preservando intactos o estado interno dos dados, nós e elementos do DOM, para que nenhum dado seja corrompido durante as filtragens e limpezas de busca.

---

## 5. Análise de Melhorias Necessárias (Dívida Técnica)

Embora o sistema apresente alta performance e arquitetura inteligente, foram mapeados os seguintes pontos de refatoração urgentes para atingir maturidade de nível de produção:

1. Garantia de Autosave Baseado em Eventos de Entrada: Atualmente, os blocos de texto salvam suas posições no término do arrasto (`mouseup`), mas alterações feitas via teclado nos campos `contentEditable` não disparam o salvamento automático. É necessária a injeção do evento `input` nas divs filhas para salvar em tempo real.
2. Substituição do `document.execCommand`: A API utilizada para formatação de texto (B, I, U) está oficialmente obsoleta nos padrões modernos do W3C. Recomenda-se a transição para manipulação direta da API `Selection` e do objeto `Range`.
3. Validação e Sincronismo de Imagens no JSON: A exportação atual do JSON gera dependência do ID da imagem gravada localmente no IndexedDB. Caso o JSON seja importado em outra máquina, a imagem não será localizada. O pipeline de exportação precisa embutir o binário da imagem ou emitir um aviso prévio ao usuário.

---

## 6. Próximos Passos & Roadmap de Desenvolvimento

### 🚀 Fase 1: Correção de Bugs e Estabilização (Curto Prazo)
* [ ] Vincular a execução da função `salvarBloco()` ao evento genérico `input` de cada bloco para mitigar perda de dados de texto digitados.
* [ ] Corrigir as quebras sintáticas identificadas no arquivo `index.html` (fechamento da tag `<h1>` e inversão hierárquica das tags `</div>` e `<nav>`).

### 🎨 Fase 2: Melhorias de Usabilidade & UX (Médio Prazo)
* [ ] Implementar sistema de profundidade z-index dinâmico (o bloco clicado por último ganha maior prioridade e passa para a frente dos outros).
* [ ] Adicionar suporte a redimensionamento manual (resizable panels) nos cantos dos blocos.
* [ ] Adicionar suporte a gestos de toque (Touch Events) para permitir usabilidade em tablets e smartphones.

### 🌐 Fase 3: Recursos Avançados (Longo Prazo)
* [ ] Empacotamento do JSON de Mídia: Modificar o exportador para gerar um arquivo compactado contendo o JSON + as imagens em formato string no mesmo payload, permitindo o compartilhamento completo de cenários de RPG entre mestres diferentes.
* [ ] Camada de Sincronização em Nuvem: Criar uma API opcional (Node.js/Firebase) para permitir o salvamento compartilhado em tempo real ao invés de depender puramente do armazenamento local do navegador.
