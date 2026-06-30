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

  init() {
    const containerBotoes = document.getElementById("container-gerenciamento-botoes");
    if (containerBotoes) {
      const btnAddChart = document.createElement("button");
      btnAddChart.id = "btn-add-chart";
      btnAddChart.innerText = "Gráfico Ninja";
      btnAddChart.onclick = () => this.criarBlocoGrafico();
      containerBotoes.appendChild(this.TRACK_UI(btnAddChart));
    }
    bus.on('search:query', this.boundSearch);
    bus.on('canvas:element-moving', this.boundMoving);
  }

  destroy() {
    super.destroy();
    bus.off('search:query', this.boundSearch);
    bus.off('canvas:element-moving', this.boundMoving);
  }

  /**
   * Converte e normaliza de forma estrita os dados de entrada vindos do DOM ou do JSON.
   */
  calcularNotas(dados) {
    // Função auxiliar para discernir se o valor inserido é a porcentagem bruta (0-100) ou a nota final ja processada (0.5-8.0)
    const extrairNotaPorcentagem = (valor) => {
      let num = Number(valor || 0);
      if (num > 8.0) {
        return (num / 10) + 0.5; // Converte escala 0-100 para 0.5-8.0
      }
      return num; // Mantém caso já seja a nota final vinda do JSON antigo
    };

    let tai = extrairNotaPorcentagem(dados.taijutsu);
    let nin = extrairNotaPorcentagem(dados.ninjutsu);
    let gen = extrairNotaPorcentagem(dados.genjutsu);
    
    let vig = Number(dados.vigor || 0);
    let int = Number(dados.inteligencia || 0);
    
    // Tratamento dedutivo para o Chakra: se for maior que 10, é o valor bruto de porcentagem. Se for entre 6 e 10, aplica formula.
    let rawChakra = Number(dados.chakraMax || dados.chakra || 6);
    let chk = 0.5;
    if (rawChakra > 10) {
      chk = ((rawChakra - 6) / 10);
    } else if (rawChakra >= 6) {
      chk = (rawChakra - 6) / 10;
    } else {
      chk = rawChakra; // Já veio calculado como nota final (ex: 0.5 a 8.0) do backup antigo
    }

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

  desenharGrafico(canvasElement, notas) {
    const ctx = canvasElement.getContext('2d');
    if (!ctx) return;
    
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

  criarBloco(id = null, style = null, dadosIniciais = null, tituloInicial = null) {
    this.criarBlocoGrafico(id, style, dadosIniciais, tituloInicial);
  }

  criarBlocoGrafico(id = null, style = null, dadosIniciais = null, tituloInicial = null) {
    const canvasContainer = document.getElementById("canvas");
    if (!canvasContainer) return;

    const uid = id || "c_" + Date.now();
    const blocoExistente = document.getElementById("block_" + uid);
    if (blocoExistente) blocoExistente.remove();

    const div = document.createElement("div");
    div.className = "draggable";
    div.id = "block_" + uid;
    div.dataset.id = uid;
    div.dataset.type = "chart";
    div.style.cssText = style || "top:100px; left:100px;";

    const valores = dadosIniciais?.inputs || dadosIniciais?.status || (dadosIniciais && typeof dadosIniciais === 'object' && !dadosIniciais.type ? dadosIniciais : null) || { 
      taijutsu: 0, 
      ninjutsu: 0, 
      genjutsu: 0, 
      vigor: 0, 
      inteligencia: 0, 
      chakraMax: 6 
    };

    const titulo = tituloInicial || dadosIniciais?.title || "STATUS SHINOBI";

    div.innerHTML = `
      <div class="drag-handle">
        <span>✥ Status</span>
        <input class="title-input" value="${titulo}" style="flex:1; margin:0 5px; background:none; border:none; color:inherit; outline:none; font-weight:bold;">
        <span class="close-btn" style="cursor:pointer;">X</span>
      </div>
      <div class="chart-container" style="padding:10px; display:flex; flex-direction:column; align-items:center;">
        <canvas id="canvas_render_${uid}" width="200" height="200" style="background:transparent;"></canvas>
        <div class="media-display" style="font-weight:bold; margin: 5px 0; font-size:14px; color:var(--accent);">Média: <span class="media-val">0.0</span></div>
        <div class="chart-inputs-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:5px; font-size:11px; padding:5px;">
          <label style="display:flex; gap:3px;"><input type="number" data-stat="ninjutsu" value="${valores.ninjutsu ?? 0}" min="0" max="100" style="width:40px; padding:3px;"> NIN</label>
          <label style="display:flex; gap:3px;"><input type="number" data-stat="inteligencia" value="${valores.inteligencia ?? 0}" min="0" max="20" style="width:40px; padding:3px;"> INT</label>
          <label style="display:flex; gap:3px;"><input type="number" data-stat="chakraMax" value="${valores.chakraMax ?? valores.chakra ?? 6}" style="width:40px; padding:3px;"> CHK</label>
          <label style="display:flex; gap:3px;"><input type="number" data-stat="taijutsu" value="${valores.taijutsu ?? 0}" min="0" max="100" style="width:40px; padding:3px;"> TAI</label>
          <label style="display:flex; gap:3px;"><input type="number" data-stat="vigor" value="${valores.vigor ?? 0}" min="0" max="20" style="width:40px; padding:3px;"> VIG</label>
          <label style="display:flex; gap:3px;"><input type="number" data-stat="genjutsu" value="${valores.genjutsu ?? 0}" min="0" max="100" style="width:40px; padding:3px;"> GEN</label>
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
      
      const targetCanvas = div.querySelector("canvas");
      if (targetCanvas) {
        this.desenharGrafico(targetCanvas, notas);
      }

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

    window.CanvasManager.makeDraggable(div, () => atualizarEGravar());
    canvasContainer.appendChild(div);
    
    setTimeout(atualizarEGravar, 0);
  }

  tratarMovimentacaoBloco(divAlvo) {
    return;
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