/**
 * MODULES: OrganizerModule.js
 * Módulo de auto-organização de blocos geométricos no Canvas.
 * Organiza em grade sem sobreposição e em ordem alfabética por título.
 */
import { BaseModule } from '../BaseModule.js';
import { Icons, createButtonContent } from '../../core/IconHelper.js';

export default class OrganizerModule extends BaseModule {
  constructor() {
    super('organizer', 'Auto Organizar');
  }

  init() {
    const containerBotoes = document.getElementById("container-palco-botoes") || document.getElementById("container-gerenciamento-botoes");
    if (!containerBotoes) return;

    const btnOrganizar = document.createElement("button");
    btnOrganizar.id = "btn-auto-organize";
    btnOrganizar.className = "btn btn-secondary";
    btnOrganizar.innerHTML = createButtonContent('organize', 'Auto Organizar');
    btnOrganizar.title = "Reorganiza todos os blocos em grade ordenada por título";

    btnOrganizar.onclick = () => this.organizarBlocosPorTitulo();

    containerBotoes.appendChild(this.TRACK_UI(btnOrganizar));
  }

  organizarBlocosPorTitulo() {
    const canvas = document.getElementById("canvas");
    if (!canvas) return;

    const blocos = Array.from(canvas.querySelectorAll(".draggable"));
    if (blocos.length === 0) return;

    // Extrai dados e ordena alfabeticamente por título
    const blocosOrdenados = blocos.map(bloco => {
      const inputTitulo = bloco.querySelector(".title-input") || bloco.querySelector("input");
      const titulo = inputTitulo ? (inputTitulo.value || "").trim() : "";
      return {
        elemento: bloco,
        titulo: titulo,
        uid: bloco.dataset.id || bloco.id.replace("block_", "")
      };
    }).sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR', { sensitivity: 'base', numeric: true }));

    // Parâmetros do layout de grade
    const startX = 40;
    const startY = 40;
    const gapX = 20;
    const gapY = 20;
    const canvasWidth = Math.max(canvas.clientWidth || 1000, 1000);

    let currentX = startX;
    let currentY = startY;
    let rowMaxHeight = 0;

    blocosOrdenados.forEach((item) => {
      const el = item.elemento;
      const width = el.offsetWidth || 240;
      const height = el.offsetHeight || 160;

      // Quebra de linha se ultrapassar a largura visível
      if (currentX + width > canvasWidth - 40 && currentX > startX) {
        currentX = startX;
        currentY += rowMaxHeight + gapY;
        rowMaxHeight = 0;
      }

      // Snap to grid (20px)
      const posX = Math.round(currentX / 20) * 20;
      const posY = Math.round(currentY / 20) * 20;

      // Animação suave de transição de coordenadas
      el.style.transition = "top 0.35s cubic-bezier(0.2, 0.8, 0.2, 1), left 0.35s cubic-bezier(0.2, 0.8, 0.2, 1)";
      el.style.left = `${posX}px`;
      el.style.top = `${posY}px`;

      // Remove a transição após a conclusão
      setTimeout(() => {
        el.style.transition = "";
      }, 400);

      // Persiste no localStorage
      if (item.uid) {
        const chave = "data_" + item.uid;
        try {
          const dadosExistentes = JSON.parse(localStorage.getItem(chave)) || {};
          dadosExistentes.left = `${posX}px`;
          dadosExistentes.top = `${posY}px`;
          localStorage.setItem(chave, JSON.stringify(dadosExistentes));
        } catch (err) {
          console.error("Falha ao salvar novas coordenadas no localStorage:", err);
        }
      }

      currentX += width + gapX;
      if (height > rowMaxHeight) {
        rowMaxHeight = height;
      }
    });
  }
}
