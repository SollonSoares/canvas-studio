/**
 * MODULES: ChartModule.js
 * Gráfico de radar Ninja 2D e cálculo de médias.
 * Suporta reidratação de arrays de notas e objetos legados com atributos individuais.
 */
import { BaseModule } from '../BaseModule.js';
import { bus } from '../../core/EventBus.js';
import { Icons, createButtonContent } from '../../core/IconHelper.js';

export default class ChartModule extends BaseModule {
  constructor() {
    super('chart', 'Gráfico Ninja');
    this.labels = ["NIN", "INT", "CHK", "TAI", "VIG", "GEN"];
  }

  init() {
    const containerBotoes = document.getElementById("container-criacao-botoes") || document.getElementById("container-gerenciamento-botoes");
    if (containerBotoes) {
      const btnAddChart = document.createElement("button");
      btnAddChart.id = "btn-add-chart";
      btnAddChart.className = "btn btn-secondary";
      btnAddChart.innerHTML = createButtonContent('chart', 'Gráfico Ninja');
      btnAddChart.title = "Cria um novo gráfico de radar de atributos ninja";
      btnAddChart.onclick = () => this.criarNovoGrafico();
      containerBotoes.appendChild(this.TRACK_UI(btnAddChart));
    }

    bus.on('search:query', (query) => {
      const charts = document.querySelectorAll('.draggable[data-type="chart"]');
      charts.forEach(c => {
        const title = c.querySelector('.title-input').value.toLowerCase();
        c.style.display = title.includes(query) ? "block" : "none";
      });
    });
  }

  criarNovoGrafico() {
    const uid = "chart_" + Date.now();
    this.criarBloco(uid, "top:100px; left:100px; width:280px; height:360px;", [5, 5, 5, 5, 5, 5], "Status Shinobi");
  }

  normalizarInputs(dados) {
    const padrao = [5, 5, 5, 5, 5, 5];
    if (!dados) return padrao;

    if (Array.isArray(dados)) {
      return dados.map(v => Number(v) || 0);
    }

    if (typeof dados === 'object') {
      // Mapeia do formato do oldestscript: { ninjutsu, inteligencia, chakraMax, taijutsu, vigor, genjutsu }
      const nin = dados.ninjutsu ?? dados.NIN ?? dados.nin ?? 5;
      const int = dados.inteligencia ?? dados.INT ?? dados.int ?? 5;
      const chk = dados.chakraMax ?? dados.chakra ?? dados.CHK ?? dados.chk ?? 5;
      const tai = dados.taijutsu ?? dados.TAI ?? dados.tai ?? 5;
      const vig = dados.vigor ?? dados.VIG ?? dados.vig ?? 5;
      const gen = dados.genjutsu ?? dados.GEN ?? dados.gen ?? 5;
      return [Number(nin), Number(int), Number(chk), Number(tai), Number(vig), Number(gen)];
    }

    return padrao;
  }

  criarBloco(id, style, dadosInputs = [5, 5, 5, 5, 5, 5], tituloCustom = "Status Shinobi") {
    const canvasContainer = document.getElementById("canvas");
    if (!canvasContainer) return;

    const blocoAntigo = document.getElementById("block_" + id);
    if (blocoAntigo) blocoAntigo.remove();

    const inputsTratados = this.normalizarInputs(dadosInputs);

    const div = document.createElement("div");
    div.className = "draggable";
    div.id = "block_" + id;
    div.dataset.id = id;
    div.dataset.type = "chart";
    div.style.cssText += style || "top:100px; left:100px;";

    div.innerHTML = `
      <div class="drag-handle">
        <span class="drag-handle-grip">${Icons.grip}</span>
        <input class="title-input" value="${tituloCustom || 'Status Shinobi'}" placeholder="Título do gráfico...">
        <span class="close-btn" title="Excluir">${Icons.close}</span>
      </div>
      <div class="chart-container" style="display:flex; flex-direction:column; align-items:center; height:calc(100% - 36px); padding:8px; box-sizing:border-box;">
        <canvas id="canvas_${id}" width="200" height="180"></canvas>
        <div class="inputs-grid" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; width:100%; margin-top:8px;">
          ${this.labels.map((l, i) => `
            <div style="display:flex; flex-direction:column; align-items:center;">
              <span style="font-size:10px; font-weight:700; color:var(--text-muted);">${l}</span>
              <input type="number" class="chart-input" data-idx="${i}" value="${inputsTratados[i] || 0}" min="0" max="100" style="width:45px; text-align:center; background:var(--bg-input); border:1px solid var(--border-subtle); border-radius:var(--radius-sm); color:var(--text-main); font-size:11px; padding:2px 0;">
            </div>
          `).join('')}
        </div>
        <div class="stats-total" style="font-size:11px; font-weight:bold; margin-top:8px; color:var(--accent);">Média: 0.0</div>
      </div>
    `;

    const canvasElement = div.querySelector(`#canvas_${id}`);
    const ctx = canvasElement.getContext('2d');

    const desenhar = () => {
      const inputs = Array.from(div.querySelectorAll('.chart-input')).map(i => parseFloat(i.value) || 0);
      const w = canvasElement.width;
      const h = canvasElement.height;
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(cx, cy) - 20;

      ctx.clearRect(0, 0, w, h);

      // Grade do Radar
      ctx.strokeStyle = "rgba(128, 128, 128, 0.25)";
      ctx.lineWidth = 1;
      for (let level = 1; level <= 4; level++) {
        const curR = (r / 4) * level;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI * 2 / 6) * i - Math.PI / 2;
          const x = cx + Math.cos(angle) * curR;
          const y = cy + Math.sin(angle) * curR;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // Linhas dos Eixos
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 / 6) * i - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
        ctx.stroke();
      }

      // Polígono de Dados
      ctx.beginPath();
      ctx.fillStyle = "rgba(255, 149, 0, 0.35)";
      ctx.strokeStyle = "#ff9500";
      ctx.lineWidth = 2;

      inputs.forEach((val, i) => {
        const normVal = Math.min(Math.max(val / 100, 0), 1);
        const curR = r * normVal;
        const angle = (Math.PI * 2 / 6) * i - Math.PI / 2;
        const x = cx + Math.cos(angle) * curR;
        const y = cy + Math.sin(angle) * curR;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });

      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const media = (inputs.reduce((a, b) => a + b, 0) / 6).toFixed(1);
      div.querySelector('.stats-total').innerText = `Média Geral: ${media}`;
    };

    const salvar = () => {
      const inputs = Array.from(div.querySelectorAll('.chart-input')).map(i => parseFloat(i.value) || 0);
      localStorage.setItem("data_" + id, JSON.stringify({
        top: div.style.top,
        left: div.style.left,
        width: div.offsetWidth,
        height: div.offsetHeight,
        type: "chart",
        title: div.querySelector('.title-input').value,
        inputs: inputs
      }));
    };

    div.querySelectorAll('.chart-input').forEach(inp => {
      inp.addEventListener('input', () => {
        desenhar();
        salvar();
      });
    });

    div.querySelector('.title-input').addEventListener('input', salvar);

    div.querySelector('.close-btn').onclick = () => {
      localStorage.removeItem("data_" + id);
      div.remove();
    };

    window.CanvasManager.makeDraggable(div, () => salvar());
    canvasContainer.appendChild(div);

    if (window.ResizeModule && typeof window.ResizeModule.atribuirResize === 'function') {
      window.ResizeModule.atribuirResize(div);
    }

    desenhar();
    salvar();
  }
}