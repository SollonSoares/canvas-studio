/**
 * MODULES: ChartModule.js
 * Gráfico Ninja - Status Shinobi original com radar 2D e fórmulas de cálculo RPG Naruto.
 * 
 * Fórmulas Originais:
 * - Taijutsu (TAI%): (valor / 10) + 0.5
 * - Ninjutsu (NIN%): (valor / 10) + 0.5
 * - Genjutsu (GEN%): (valor / 10) + 0.5
 * - Vigor (VIG+): valor + 0.5
 * - Inteligência (INT+): valor + 0.5
 * - Chakra Máximo (CHK+): (valor - 6) / 10
 * Teto do Sistema: 8.0 | Intervalo das notas: [0.5 a 8.0] com arredondamento em 0.5
 */
import { BaseModule } from '../BaseModule.js';
import { bus } from '../../core/EventBus.js';
import { Icons, createButtonContent } from '../../core/IconHelper.js';

export default class ChartModule extends BaseModule {
  constructor() {
    super('chart', 'Gráfico Ninja');
  }

  init() {
    const containerBotoes = document.getElementById("container-criacao-botoes") || document.getElementById("container-gerenciamento-botoes");
    if (containerBotoes) {
      const btnAddChart = document.createElement("button");
      btnAddChart.id = "btn-add-chart";
      btnAddChart.className = "btn btn-secondary";
      btnAddChart.innerHTML = createButtonContent('chart', 'Gráfico Ninja');
      btnAddChart.title = "Cria um novo gráfico de radar de atributos shinobi";
      btnAddChart.onclick = () => this.criarNovoGrafico();
      containerBotoes.appendChild(this.TRACK_UI(btnAddChart));
    }

    bus.on('search:query', (query) => {
      const charts = document.querySelectorAll('.draggable[data-type="chart"]');
      charts.forEach(c => {
        const title = (c.querySelector('.title-input')?.value || "").toLowerCase();
        c.style.display = title.includes(query) ? "block" : "none";
      });
    });
  }

  calcularNotas(dados) {
    const d = dados || {};
    const taijutsu = Number(d.taijutsu) || 0;
    const ninjutsu = Number(d.ninjutsu) || 0;
    const genjutsu = Number(d.genjutsu) || 0;
    const vigor = Number(d.vigor) || 0;
    const inteligencia = Number(d.inteligencia) || 0;
    const chakraMax = Number(d.chakraMax !== undefined ? d.chakraMax : (d.chakra !== undefined ? d.chakra : 6));

    let tai = (taijutsu / 10) + 0.5;
    let nin = (ninjutsu / 10) + 0.5;
    let gen = (genjutsu / 10) + 0.5;
    let vig = vigor + 0.5;
    let int = inteligencia + 0.5;
    let chk = (chakraMax - 6) / 10;

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

    // Níveis Guia Concêntricos (2, 4, 6, 8)
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

    // Linhas dos Eixos e Rótulos com Notas
    const isLightMode = document.body.classList.contains('light-mode');
    const corTexto = isLightMode ? "#1d1d1f" : "#f0f2f8";

    ordemEixos.forEach((eixo, i) => {
      const angulo = (i * Math.PI / 3) - Math.PI / 2;
      const xPonta = centroX + raioMaximo * Math.cos(angulo);
      const yPonta = centroY + raioMaximo * Math.sin(angulo);

      ctx.beginPath();
      ctx.moveTo(centroX, centroY);
      ctx.lineTo(xPonta, yPonta);
      ctx.strokeStyle = "rgba(128, 128, 128, 0.4)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = corTexto;
      ctx.font = "bold 10px -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const margemTexto = raioMaximo + 16;
      const xTexto = centroX + margemTexto * Math.cos(angulo);
      const yTexto = centroY + margemTexto * Math.sin(angulo);

      ctx.fillText(`${eixo.nome} (${eixo.valor.toFixed(1)})`, xTexto, yTexto);
    });

    // Polígono de Dados Shinobi
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

    ctx.fillStyle = "rgba(255, 69, 58, 0.35)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 69, 58, 1)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  normalizarDadosIniciais(dados) {
    if (!dados) {
      return { taijutsu: 0, ninjutsu: 0, genjutsu: 0, vigor: 0, inteligencia: 0, chakraMax: 6 };
    }

    // Se veio como array [nin, int, chk, tai, vig, gen]
    if (Array.isArray(dados)) {
      return {
        ninjutsu: Number(dados[0]) || 0,
        inteligencia: Number(dados[1]) || 0,
        chakraMax: Number(dados[2]) || 6,
        taijutsu: Number(dados[3]) || 0,
        vigor: Number(dados[4]) || 0,
        genjutsu: Number(dados[5]) || 0
      };
    }

    if (typeof dados === 'object') {
      return {
        taijutsu: Number(dados.taijutsu ?? dados.TAI ?? 0),
        ninjutsu: Number(dados.ninjutsu ?? dados.NIN ?? 0),
        genjutsu: Number(dados.genjutsu ?? dados.GEN ?? 0),
        vigor: Number(dados.vigor ?? dados.VIG ?? 0),
        inteligencia: Number(dados.inteligencia ?? dados.INT ?? 0),
        chakraMax: Number(dados.chakraMax !== undefined ? dados.chakraMax : (dados.chakra !== undefined ? dados.chakra : (dados.CHK ?? 6)))
      };
    }

    return { taijutsu: 0, ninjutsu: 0, genjutsu: 0, vigor: 0, inteligencia: 0, chakraMax: 6 };
  }

  criarNovoGrafico() {
    const uid = "c_" + Date.now();
    this.criarBloco(uid, "top:100px; left:100px; width:280px; height:380px;", {
      taijutsu: 0, ninjutsu: 0, genjutsu: 0, vigor: 0, inteligencia: 0, chakraMax: 6
    }, "STATUS SHINOBI");
  }

  criarBloco(id, style, dadosIniciais, tituloCustom = "STATUS SHINOBI") {
    const canvasContainer = document.getElementById("canvas");
    if (!canvasContainer) return;

    const uid = id || "c_" + Date.now();
    const blocoAntigo = document.getElementById("block_" + uid);
    if (blocoAntigo) blocoAntigo.remove();

    const valores = this.normalizarDadosIniciais(dadosIniciais);
    const titulo = tituloCustom || "STATUS SHINOBI";

    const div = document.createElement("div");
    div.className = "draggable";
    div.id = "block_" + uid;
    div.dataset.id = uid;
    div.dataset.type = "chart";
    div.style.cssText += style || "top:100px; left:100px;";

    div.innerHTML = `
      <div class="drag-handle">
        <span class="drag-handle-grip">${Icons.grip}</span>
        <input class="title-input" value="${titulo}" placeholder="Título do gráfico...">
        <span class="close-btn" title="Excluir">${Icons.close}</span>
      </div>
      <div class="chart-container" style="display:flex; flex-direction:column; align-items:center; height:calc(100% - 36px); padding:8px 10px; box-sizing:border-box; overflow-y:auto;">
        <canvas id="canvas_render_${uid}" width="210" height="200" style="background:transparent; display:block;"></canvas>
        <div class="media-display" style="font-weight:700; font-size:13px; margin:4px 0 6px 0; color:var(--accent);">
          Média Geral: <span class="media-val">0.0</span>
        </div>
        <div class="chart-inputs-grid" style="display:grid; grid-template-columns:1fr 1fr; gap:6px; width:100%; font-size:11px;">
          <label style="display:flex; align-items:center; gap:5px; background:var(--bg-input); padding:4px 6px; border-radius:var(--radius-sm); border:1px solid var(--border-subtle); color:var(--text-secondary);">
            <input type="number" data-stat="ninjutsu" value="${valores.ninjutsu}" min="0" max="100" style="width:42px; padding:3px; background:transparent; border:none; color:var(--text-main); font-weight:600; font-size:11px; outline:none; text-align:center;"> NIN%
          </label>
          <label style="display:flex; align-items:center; gap:5px; background:var(--bg-input); padding:4px 6px; border-radius:var(--radius-sm); border:1px solid var(--border-subtle); color:var(--text-secondary);">
            <input type="number" data-stat="inteligencia" value="${valores.inteligencia}" min="0" max="20" style="width:42px; padding:3px; background:transparent; border:none; color:var(--text-main); font-weight:600; font-size:11px; outline:none; text-align:center;"> INT+
          </label>
          <label style="display:flex; align-items:center; gap:5px; background:var(--bg-input); padding:4px 6px; border-radius:var(--radius-sm); border:1px solid var(--border-subtle); color:var(--text-secondary);">
            <input type="number" data-stat="chakraMax" value="${valores.chakraMax}" style="width:42px; padding:3px; background:transparent; border:none; color:var(--text-main); font-weight:600; font-size:11px; outline:none; text-align:center;"> CHK+
          </label>
          <label style="display:flex; align-items:center; gap:5px; background:var(--bg-input); padding:4px 6px; border-radius:var(--radius-sm); border:1px solid var(--border-subtle); color:var(--text-secondary);">
            <input type="number" data-stat="taijutsu" value="${valores.taijutsu}" min="0" max="100" style="width:42px; padding:3px; background:transparent; border:none; color:var(--text-main); font-weight:600; font-size:11px; outline:none; text-align:center;"> TAI%
          </label>
          <label style="display:flex; align-items:center; gap:5px; background:var(--bg-input); padding:4px 6px; border-radius:var(--radius-sm); border:1px solid var(--border-subtle); color:var(--text-secondary);">
            <input type="number" data-stat="vigor" value="${valores.vigor}" min="0" max="20" style="width:42px; padding:3px; background:transparent; border:none; color:var(--text-main); font-weight:600; font-size:11px; outline:none; text-align:center;"> VIG+
          </label>
          <label style="display:flex; align-items:center; gap:5px; background:var(--bg-input); padding:4px 6px; border-radius:var(--radius-sm); border:1px solid var(--border-subtle); color:var(--text-secondary);">
            <input type="number" data-stat="genjutsu" value="${valores.genjutsu}" min="0" max="100" style="width:42px; padding:3px; background:transparent; border:none; color:var(--text-main); font-weight:600; font-size:11px; outline:none; text-align:center;"> GEN%
          </label>
        </div>
      </div>
    `;

    const canvasElem = div.querySelector(`#canvas_render_${uid}`);

    const atualizarEGravar = () => {
      const dadosInputs = {
        taijutsu: Number(div.querySelector('[data-stat="taijutsu"]').value) || 0,
        ninjutsu: Number(div.querySelector('[data-stat="ninjutsu"]').value) || 0,
        genjutsu: Number(div.querySelector('[data-stat="genjutsu"]').value) || 0,
        vigor: Number(div.querySelector('[data-stat="vigor"]').value) || 0,
        inteligencia: Number(div.querySelector('[data-stat="inteligencia"]').value) || 0,
        chakraMax: Number(div.querySelector('[data-stat="chakraMax"]').value) || 0
      };

      const notas = this.calcularNotas(dadosInputs);
      const media = this.calcularMedia(notas);

      const mediaValSpan = div.querySelector(".media-val");
      if (mediaValSpan) mediaValSpan.innerText = media.toFixed(1);

      this.desenharGrafico(canvasElem, notas);

      localStorage.setItem("data_" + uid, JSON.stringify({
        top: div.style.top,
        left: div.style.left,
        width: div.offsetWidth,
        height: div.offsetHeight,
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

    if (window.ResizeModule && typeof window.ResizeModule.atribuirResize === 'function') {
      window.ResizeModule.atribuirResize(div);
    }

    // Desenha imediatamente
    atualizarEGravar();
  }
}