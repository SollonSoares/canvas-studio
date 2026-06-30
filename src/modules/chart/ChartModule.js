/**
 * MODULES: ChartModule.js
 * Isolamento lógico do Gráfico Ninja: fórmulas de normalização e renderização em Canvas 2D.
 */
import { BaseModule } from '../BaseModule.js';
import { bus } from '../../core/EventBus.js';

export default class ChartModule extends BaseModule {
  constructor() {
    super('chart', 'Gráfico de Status Ninja');
    this.boundSearch = this.filtrarBlocosPorTitulo.bind(this);
    this.boundMoving = this.tratarMovimentacaoBloco.bind(this);
  }

  /**
   * Inicializa o módulo: Injeta o botão de criação na sidebar e assina canais de eventos.
   */
  init() {
    const containerBotoes = document.getElementById("container-gerenciamento-botoes");
    if (containerBotoes) {
      const btnAddChart = document.createElement("button");
      btnAddChart.id = "btn-add-chart";
      btnAddChart.innerText = "Gráfico Ninja";
      btnAddChart.onclick = () => this.criarBlocoGrafico();
      containerBotoes.appendChild(this.TRACK_UI(btnAddChart));
    }

    // Assinaturas de eventos globais do ecossistema
    bus.on('search:query', this.boundSearch);
    bus.on('canvas:element-moving', this.boundMoving);
  }

  /**
   * Desativa o módulo limpando listeners pendentes.
   */
  destroy() {
    super.destroy();
    bus.off('search:query', this.boundSearch);
    bus.off('canvas:element-moving', this.boundMoving);
  }

  /**
   * Regras de negócio dedutivas para normalização matemática de atributos RPG.
   */
  calcularNotas(dados) {
    let tai = (dados.taijutsu / 10) + 0.5;
    let nin = (dados.ninjutsu / 10) + 0.5;
    let gen = (dados.genjutsu / 10) + 0.5;
    let vig = dados.vigor + 0.5;
    let int = dados.inteligencia + 0.5;
    let chk = (dados.chakraMax - 6) / 10;

    const ajustarNota = (nota) => {
      let arredondado = Math.round(nota * 2) / 2;
      return Math.max(0.5, Math.min(8.0, arredondado));
    };

    return {
      ninjutsu: ajustarNota(nin),
      inteligencia: ajustarNota(int),
      chakra: ajustarNota(chk),
      taijutsu: ajustarNota(tai),
      vigor: ajustarNota(vig),
      genjutsu: ajustarNota(gen)
    };
  }

  calcularMedia(notas) {
    const soma = Object.values(notas).reduce((a, b) => a + b, 0);
    return parseFloat((soma / 6).toFixed(1));
  }

  /**
   * Renderização matemática pura de eixos e polígonos sobre o elemento Canvas interno.
   */
  desenharGrafico(canvasElement, notas) {
    const ctx = canvasElement.getContext('2d');
    const centroX = canvasElement.width / 2;
    const centroY = canvasElement.height / 2;
    const raioMaximo = Math.min(centroX, centroY) * 0.65;
    const tetoSistema = 8.0;

    ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    const ordemEixos = [
      { nome: "NIN", valor: notas.ninjutsu },
      { nome: "INT", valor: notas.inteligencia },
      { nome: "CHK", valor: notas.chakra },
      { nome: "TAI", valor: notas.taijutsu },
      { nome: "VIG", valor: notas.vigor },
      { nome: "GEN", valor: notas.genjutsu }
    ];

    // 1. Desenho teias guia polygonais
    const niveisGuia = [2, 4, 6, 8];
    ctx.strokeStyle = "rgba(128, 128, 128, 0.25)";
    ctx.lineWidth = 1;

    niveisGuia.forEach(nivel => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angulo = (i * Math.PI / 3) - Math.PI / 2;
        const raioGuia = (nivel / tetoSistema) * raioMaximo;
        const x = centroX + raioGuia * Math.cos(angulo);
        const y = centroY + raioGuia * Math.sin(angulo);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    });

    // 2. Desenho de eixos radiais e rotulagem textual adaptativa ao Tema
    ordemEixos.forEach((eixo, i) => {
      const angulo = (i * Math.PI / 3) - Math.PI / 2;
      const xPonta = centroX + raioMaximo * Math.cos(angulo);
      const yPonta = centroY + raioMaximo * Math.sin(angulo);

      ctx.beginPath();
      ctx.moveTo(centroX, centroY);
      ctx.lineTo(xPonta, yPonta);
      ctx.strokeStyle = "rgba(128, 128, 128, 0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--text-main').trim() || "#fff";
      ctx.font = "bold 10px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const margemTexto = raioMaximo + 16;
      const xTexto = centroX + margemTexto * Math.cos(angulo);
      const yTexto = centroY + margemTexto * Math.sin(angulo);

      ctx.fillText(`${eixo.nome} (${eixo.valor.toFixed(1)})`, xTexto, yTexto);
    });

    // 3. Traçado da área preenchida do polígono de dados
    ctx.beginPath();
    ordemEixos.forEach((eixo, i) => {
      const angulo = (i * Math.PI / 3) - Math.PI / 2;
      const raioAtual = (eixo.valor / tetoSistema) * raioMaximo;
      const x = centroX + raioAtual * Math.cos(angulo);
      const y = centroY + raioAtual * Math.sin(angulo);

      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();

    ctx.fillStyle = "rgba(255, 69, 58, 0.4)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 69, 58, 1)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  /**
   * Instancia a estrutura DOM do bloco de Gráfico e vincula listeners locais.
   */
  criarBlocoGrafico(id = null, style = null, dadosIniciais = null, tituloInicial = null) {
    const canvasContainer = document.getElementById("canvas");
    if (!canvasContainer) return;

    const uid = id || "c_" + Date.now();
    const div = document.createElement("div");
    div.className = "draggable";
    div.dataset.id = uid;
    div.dataset.type = "chart";
    div.style.cssText = style || "top:100px; left:100px;";

    const valores = dadosIniciais || { taijutsu: 0, ninjutsu: 0, genjutsu: 0, vigor: 0, inteligencia: 0, chakraMax: 6 };

    div.innerHTML = `
      <div class="drag-handle">
        <span>✥ Status</span>
        <input class="title-input" value="${tituloInicial || "STATUS SHINOBI"}" style="flex:1; margin:0 5px; background:none; border:none; color:inherit; outline:none;">
        <span class="close-btn" style="cursor:pointer;">X</span>
      </div>
      <div class="chart-container" style="padding:10px; display:flex; flex-direction:column; align-items:center;">
        <canvas id="canvas_render_${uid}" width="200" height="200" style="background:transparent;"></canvas>
        <div class="media-display" style="font-weight:bold; margin: 5px 0; font-size:14px; color:var(--accent);">Média: <span class="media-val">0.0</span></div>
        <div class="chart-inputs-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:5px; font-size:11px; padding:5px;">
          <label style="display:flex; gap:3px;"><input type="number" data-stat="ninjutsu" value="${valores.ninjutsu}" min="0" max="100" style="width:40px; padding:3px;"> NIN%</label>
          <label style="display:flex; gap:3px;"><input type="number" data-stat="inteligencia" value="${valores.inteligencia}" min="0" max="20" style="width:40px; padding:3px;"> INT+</label>
          <label style="display:flex; gap:3px;"><input type="number" data-stat="chakraMax" value="${valores.chakraMax}" style="width:40px; padding:3px;"> CHK+</label>
          <label style="display:flex; gap:3px;"><input type="number" data-stat="taijutsu" value="${valores.taijutsu}" min="0" max="100" style="width:40px; padding:3px;"> TAI%</label>
          <label style="display:flex; gap:3px;"><input type="number" data-stat="vigor" value="${valores.vigor}" min="0" max="20" style="width:40px; padding:3px;"> VIG+</label>
          <label style="display:flex; gap:3px;"><input type="number" data-stat="genjutsu" value="${valores.genjutsu}" min="0" max="100" style="width:40px; padding:3px;"> GEN%</label>
        </div>
      </div>
    `;

    const atualizarEGravar = () => {
      const dadosInputs = {
        taijutsu: Number(div.querySelector('[data-stat="taijutsu"]').value),
        ninjutsu: Number(div.querySelector('[data-stat="ninjutsu"]').value),
        genjutsu: Number(div.querySelector('[data-stat="genjutsu"]').value),
        vigor: Number(div.querySelector('[data-stat="vigor"]').value),
        inteligencia: Number(div.querySelector('[data-stat="inteligencia"]').value),
        chakraMax: Number(div.querySelector('[data-stat="chakraMax"]').value)
      };

      const notas = this.calcularNotas(dadosInputs);
      const media = this.calcularMedia(notas);

      div.querySelector(".media-val").innerText = media.toFixed(1);
      this.desenharGrafico(div.querySelector("canvas"), notas);

      localStorage.setItem("data_" + uid, JSON.stringify({
        top: div.style.top,
        left: div.style.left,
        type: "chart",
        title: div.querySelector(".title-input").value,
        inputs: dadosInputs
      }));
    };

    div.querySelectorAll("input").forEach(inp => inp.addEventListener("input", atualizarEGravar));
    div.querySelector(".close-btn").onclick = () => {
      localStorage.removeItem("data_" + uid);
      div.remove();
    };

    // Vincula o motor de arrasto do Core
    window.CanvasManager.makeDraggable(div, () => atualizarEGravar());
    canvasContainer.appendChild(div);
    
    // Força um ciclo macro-task para garantir renderização síncrona do contexto gráfico
    setTimeout(atualizarEGravar, 0);
  }

  tratarMovimentacaoBloco(divAlvo) {
    if (divAlvo.dataset.type === 'chart') {
      const canvas = divAlvo.querySelector("canvas");
      if (!canvas) return;
      // Redesenha o gráfico durante o arrasto para evitar descompasso visual
      const inputs = {
        taijutsu: Number(divAlvo.querySelector('[data-stat="taijutsu"]').value),
        ninjutsu: Number(divAlvo.querySelector('[data-stat="ninjutsu"]').value),
        genjutsu: Number(divAlvo.querySelector('[data-stat="genjutsu"]').value),
        vigor: Number(divAlvo.querySelector('[data-stat="vigor"]').value),
        inteligencia: Number(divAlvo.querySelector('[data-stat="inteligencia"]').value),
        chakraMax: Number(divAlvo.querySelector('[data-stat="chakraMax"]').value)
      };
      this.desenharGrafico(canvas, this.calcularNotas(inputs));
    }
  }

  filtrarBlocosPorTitulo(termo) {
    const blocos = document.querySelectorAll('.draggable[data-type="chart"]');
    blocos.forEach(bloco => {
      const titulo = bloco.querySelector(".title-input")?.value.toLowerCase() || "";
      if (titulo.includes(termo)) {
        bloco.style.display = "";
      } else {
        bloco.style.display = "none";
      }
    });
  }
}