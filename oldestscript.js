const GRID_SIZE = 20;
let db,
  ultimoElementoFocado = null;

// Inicializa IndexedDB
const dbReq = indexedDB.open("CanvasMediaDB", 1);
dbReq.onupgradeneeded = (e) =>
  e.target.result.createObjectStore("images", { keyPath: "id" });
dbReq.onsuccess = (e) => {
  db = e.target.result;
  renderizar();
};

// --- FUNÇÕES DE PERSISTÊNCIA E RENDERIZAÇÃO ---

function salvarBloco(div) {
  if (!div) return;
  const data = {
    top: div.style.top,
    left: div.style.left,
    type: "text",
    title: div.querySelector(".title-input")?.value || "TÍTULO",
    campos: Array.from(div.querySelectorAll(".lista-campos > div")).map(
      (c) => ({
        html: c.innerHTML,
        className: c.className
      })
    )
  };
  localStorage.setItem("data_" + div.dataset.id, JSON.stringify(data));
}

function adicionarImagem(id, src, top, left) {
  const canvas = document.getElementById("canvas");
  if (!canvas) return;

  // Evita duplicatas visuais
  if (document.querySelector(`[data-id="${id}"]`)) return;

  const div = document.createElement("div");
  div.className = "draggable";
  div.dataset.id = id;
  div.dataset.type = "image";
  div.style.cssText = `top:${top || "100px"};left:${left || "100px"};`;
  div.innerHTML = `<div class="drag-handle"><span>✥</span><span class="close-btn" style="cursor:pointer;float:right;">X</span></div><img src="${src}" draggable="false">`;

  div.querySelector(".close-btn").onclick = () => {
    localStorage.removeItem("data_" + id);
    div.remove();
  };

  div.querySelector(".drag-handle").onmousedown = (e) => {
    if (e.target.classList.contains("close-btn")) return;
    let sx = e.clientX - div.offsetLeft,
      sy = e.clientY - div.offsetTop;
    const move = (ev) => {
      div.style.left =
        Math.round((ev.pageX - sx) / GRID_SIZE) * GRID_SIZE + "px";
      div.style.top =
        Math.round((ev.pageY - sy) / GRID_SIZE) * GRID_SIZE + "px";
    };
    const handleUp = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", handleUp);
      localStorage.setItem(
        "data_" + id,
        JSON.stringify({
          top: div.style.top,
          left: div.style.left,
          type: "image",
          imgId: id
        })
      );
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", handleUp);
  };
  canvas.appendChild(div);
}

function importarImagem() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const id = "img_" + Date.now();
      const tx = db.transaction("images", "readwrite");
      tx.objectStore("images").add({ id, data: event.target.result });
      tx.oncomplete = () => {
        localStorage.setItem(
          "data_" + id,
          JSON.stringify({
            top: "100px",
            left: "100px",
            type: "image",
            imgId: id
          })
        );
        renderizar();
      };
    };
    reader.readAsDataURL(file);
  };
  input.click();
}

function criarBloco(id, style, data) {
  const canvas = document.getElementById("canvas");
  if (!canvas) return;
  const div = document.createElement("div");
  div.className = "draggable";
  div.dataset.id = id || "t_" + Date.now();
  div.dataset.type = "text";
  div.style.cssText = style || "top:100px;left:100px;";
  div.innerHTML = `<div class="drag-handle"><span>✥</span><input class="title-input" value="${
    data?.title || "TÍTULO"
  }"><span class="close-btn" style="cursor:pointer;">X</span></div><div class="lista-campos"></div><button class="add-btn" style="width:auto;margin:5px;">+</button>`;

  div.querySelector(".add-btn").onclick = () => {
    const f = document.createElement("div");
    f.className = "sub-campo";
    f.contentEditable = true;
    f.innerText = "Novo...";
    div.querySelector(".lista-campos").appendChild(f);
  };
  div.querySelector(".close-btn").onclick = () => {
    localStorage.removeItem("data_" + div.dataset.id);
    div.remove();
  };

  div.querySelector(".drag-handle").onmousedown = (e) => {
    if (
      e.target.classList.contains("close-btn") ||
      e.target.tagName === "INPUT"
    )
      return;
    let sx = e.clientX - div.offsetLeft,
      sy = e.clientY - div.offsetTop;
    const move = (ev) => {
      div.style.left =
        Math.round((ev.pageX - sx) / GRID_SIZE) * GRID_SIZE + "px";
      div.style.top =
        Math.round((ev.pageY - sy) / GRID_SIZE) * GRID_SIZE + "px";
    };
    const handleUp = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", handleUp);
      salvarBloco(div);
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", handleUp);
  };
  data?.campos?.forEach((c) => {
    const f = document.createElement("div");
    f.className = c.className;
    f.contentEditable = true;
    f.innerHTML = c.html;
    div.querySelector(".lista-campos").appendChild(f);
  });
  canvas.appendChild(div);
}

// ===== GRÁFICO NINJA =====

function calcularNotas(dados) {
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

function calcularMedia(notas) {
  const soma = Object.values(notas).reduce((a, b) => a + b, 0);
  return parseFloat((soma / 6).toFixed(1));
}

function desenharGrafico(canvasElement, notas) {
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

function criarBlocoGrafico(id, style, dadosIniciais, tituloInicial) {
  const canvasContainer = document.getElementById("canvas");
  if (!canvasContainer) return;

  const uid = id || "c_" + Date.now();
  const div = document.createElement("div");
  div.className = "draggable";
  div.dataset.id = uid;
  div.dataset.type = "chart";
  div.style.cssText = style || "top:100px;left:100px;";

  const valores = dadosIniciais || { taijutsu: 0, ninjutsu: 0, genjutsu: 0, vigor: 0, inteligencia: 0, chakraMax: 6 };

  div.innerHTML = `
    <div class="drag-handle">
      <span>✥</span>
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

    const notas = calcularNotas(dadosInputs);
    const media = calcularMedia(notas);

    div.querySelector(".media-val").innerText = media.toFixed(1);
    desenharGrafico(div.querySelector("canvas"), notas);

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

  div.querySelector(".drag-handle").onmousedown = (e) => {
    if (e.target.classList.contains("close-btn") || e.target.tagName === "INPUT") return;
    let sx = e.clientX - div.offsetLeft, sy = e.clientY - div.offsetTop;

    const move = (ev) => {
      div.style.left = Math.round((ev.pageX - sx) / GRID_SIZE) * GRID_SIZE + "px";
      div.style.top = Math.round((ev.pageY - sy) / GRID_SIZE) * GRID_SIZE + "px";
    };

    const handleUp = () => {
      document.removeEventListener("mousemove", move);
      document.removeEventListener("mouseup", handleUp);
      atualizarEGravar();
    };
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", handleUp);
  };

  canvasContainer.appendChild(div);
  setTimeout(atualizarEGravar, 0);
}

function renderizar() {
  const canvas = document.getElementById("canvas");
  if (!canvas) return;
  canvas.innerHTML = "";
  Object.keys(localStorage).forEach((k) => {
    if (k.startsWith("data_")) {
      try {
        let d = JSON.parse(localStorage.getItem(k));
        if (!d) return;
        const id = k.replace("data_", "");
        if (d.type === "text")
          criarBloco(id, `top:${d.top};left:${d.left};`, d);
        else if (d.type === "image" && db) {
          const tx = db.transaction("images", "readonly");
          tx.objectStore("images").get(d.imgId).onsuccess = (e) => {
            if (e.target.result)
              adicionarImagem(d.imgId, e.target.result.data, d.top, d.left);
          };
        }
        else if (d.type === "chart") {
          criarBlocoGrafico(id, `top:${d.top};left:${d.left};`, d.inputs, d.title);
        }
      } catch (err) {
        console.error("Erro render:", err);
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  // Switch de Tema
  const btnTheme = document.getElementById("btn-theme");
  if (btnTheme) {
    const aplicarTema = (isLight) => {
      document.body.classList.toggle("light-mode", isLight);
      btnTheme.classList.toggle("active", isLight);
      localStorage.setItem("theme", isLight ? "light" : "dark");
    };
    if (localStorage.getItem("theme") === "light") aplicarTema(true);
    btnTheme.onclick = () =>
      aplicarTema(!document.body.classList.contains("light-mode"));
  }

  // Sidebar
  document
    .getElementById("toggle-sidebar")
    ?.addEventListener("click", function () {
      const s = document.getElementById("dashboard-menu");
      s.classList.toggle("collapsed");
      this.innerText = s.classList.contains("collapsed")
        ? "☰" : "Fechar";
});

  // Ações
  document
    .getElementById("btn-add")
    ?.addEventListener("click", () => criarBloco());
  document
    .getElementById("btn-add-img")
    ?.addEventListener("click", importarImagem);
  document
    .getElementById("btn-add-chart")
    ?.addEventListener("click", () => criarBlocoGrafico());

  document.getElementById("btn-export")?.addEventListener("click", () => {
    const data = Array.from(document.querySelectorAll(".draggable")).map(
      (el) => {
        const item = {
          top: el.style.top,
          left: el.style.left,
          type: el.dataset.type
        };
        if (el.dataset.type === "text") {
          item.title = el.querySelector(".title-input")?.value || "TÍTULO";
          item.campos = Array.from(
            el.querySelectorAll(".lista-campos > div")
          ).map((c) => ({ html: c.innerHTML, className: c.className }));
        } else if (el.dataset.type === "image") {
          item.imgId = el.dataset.id;
        } else if (el.dataset.type === "chart") {
          item.title = el.querySelector(".title-input")?.value || "STATUS";
          item.inputs = {
            taijutsu: Number(el.querySelector('[data-stat="taijutsu"]').value),
            ninjutsu: Number(el.querySelector('[data-stat="ninjutsu"]').value),
            genjutsu: Number(el.querySelector('[data-stat="genjutsu"]').value),
            vigor: Number(el.querySelector('[data-stat="vigor"]').value),
            inteligencia: Number(el.querySelector('[data-stat="inteligencia"]').value),
            chakraMax: Number(el.querySelector('[data-stat="chakraMax"]').value)
          };
        }
        return item;
      }
    );
    const json = JSON.stringify(data);
    navigator.clipboard
      .writeText(json)
      .then(() => alert("Copiado!"))
      .catch(() => prompt("Copie manualmente:", json));
  });

  document.getElementById("btn-import")?.addEventListener("click", () => {
    const j = prompt("Cole o JSON:");
    if (!j) return;
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith("data_")) localStorage.removeItem(k);
      });
      JSON.parse(j).forEach((d) => {
        const id =
          d.type === "image" ? d.imgId : "t_" + Date.now() + Math.random();
        localStorage.setItem("data_" + id, JSON.stringify(d));
      });
      renderizar();
    } catch (e) {
      alert("JSON inválido.");
    }
  });
});

document.addEventListener("focusin", (e) => {
  if (e.target.classList.contains("sub-campo")) ultimoElementoFocado = e.target;
});
window.formatarTexto = (cmd) => {
  if (ultimoElementoFocado)
    document.execCommand(
      cmd === "b" ? "bold" : cmd === "i" ? "italic" : "underline",
      false,
      null
    );
};
window.ajustarFonte = (d) => {
  if (ultimoElementoFocado) {
    let size =
      parseInt(window.getComputedStyle(ultimoElementoFocado).fontSize) || 14;
    ultimoElementoFocado.style.fontSize = size + d + "px";
  }
};
window.aplicarEstilo = (cls) => {
  if (ultimoElementoFocado) {
    ultimoElementoFocado.className = "sub-campo " + cls;
    ultimoElementoFocado.focus();
  }
};
document.getElementById("input-search")?.addEventListener("input", function() {
  const termo = this.value.toLowerCase();
  const blocos = document.querySelectorAll(".draggable");

  blocos.forEach(bloco => {
    // Busca no título e em todos os sub-campos
    const titulo = bloco.querySelector(".title-input")?.value.toLowerCase() || "";
    const campos = Array.from(bloco.querySelectorAll(".sub-campo"))
                        .map(c => c.innerText.toLowerCase())
                        .join(" ");

    // Se o termo estiver no título ou nos campos, mostra, senão, esconde
    if (titulo.includes(termo) || campos.includes(termo)) {
      bloco.style.display = "";
    } else {
      bloco.style.display = "none";
    }
  });
});

