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
    document.addEventListener("mousemove", move);
    document.onmouseup = () => {
      document.removeEventListener("mousemove", move);
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
    document.addEventListener("mousemove", move);
    document.onmouseup = () => {
      document.removeEventListener("mousemove", move);
      salvarBloco(div);
    };
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
        } else if (el.dataset.type === "image") item.imgId = el.dataset.id;
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

