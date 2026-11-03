/**
 * CORE: GitHubSync.js
 * Envio de backups JSON e arquivos avulsos para o repositório via GitHub REST API.
 * O token NUNCA fica no código: é digitado manualmente em Configurações e
 * guardado apenas no localStorage do navegador do usuário (chave app_github_sync,
 * fora do prefixo data_ e, portanto, fora dos backups exportados).
 */
const STORAGE_KEY = "app_github_sync";
const DEFAULTS = { repo: "SollonSoares/canvas-studio", branch: "main", folder: "json", token: "" };

export const GitHubSync = {
  getConfig() {
    try {
      return { ...DEFAULTS, ...(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}) };
    } catch {
      return { ...DEFAULTS };
    }
  },

  isConfigured() {
    const c = this.getConfig();
    return !!(c.token && /^[^/\s]+\/[^/\s]+$/.test(c.repo));
  },

  saveConfig(cfg) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      repo: (cfg.repo || DEFAULTS.repo).trim(),
      branch: (cfg.branch || DEFAULTS.branch).trim(),
      folder: (cfg.folder || DEFAULTS.folder).trim().replace(/^\/+|\/+$/g, ""),
      token: (cfg.token || "").trim()
    }));
  },

  clearConfig() {
    localStorage.removeItem(STORAGE_KEY);
  },

  _headers(raw = false) {
    const { token } = this.getConfig();
    const h = {
      "Accept": raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
    if (token) h["Authorization"] = `Bearer ${token}`;
    return h;
  },

  _erro(status, mensagem) {
    const dica = status === 401 ? " (token inválido ou expirado)"
      : status === 403 || status === 404 ? " (verifique repositório, branch/pasta e permissões do token)"
      : "";
    return new Error(`GitHub ${status}: ${mensagem || "falha na requisição"}${dica}`);
  },

  /** Lista os .json da pasta configurada (mais recentes primeiro). Funciona sem token em repositório público. */
  async listJSON() {
    const { repo, branch, folder } = this.getConfig();
    const caminho = folder ? `/${encodeURI(folder)}` : "";
    const resp = await fetch(`https://api.github.com/repos/${repo}/contents${caminho}?ref=${encodeURIComponent(branch)}`, { headers: this._headers() });
    const dados = await resp.json().catch(() => ({}));
    if (!resp.ok) throw this._erro(resp.status, dados.message);
    return (Array.isArray(dados) ? dados : [])
      .filter(f => f.type === "file" && /\.json$/i.test(f.name))
      .sort((a, b) => b.name.localeCompare(a.name));
  },

  /** Baixa o conteúdo de texto de um arquivo do repositório. */
  async downloadText(path) {
    const { repo, branch } = this.getConfig();
    const resp = await fetch(`https://api.github.com/repos/${repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(branch)}`, { headers: this._headers(true) });
    if (!resp.ok) {
      const dados = await resp.json().catch(() => ({}));
      throw this._erro(resp.status, dados.message);
    }
    return resp.text();
  },

  /** Cria o arquivo em <folder>/<nome> no repositório. Retorna a URL do arquivo. */
  async uploadJSON(nomeArquivo, conteudo) {
    const { repo, branch, folder, token } = this.getConfig();
    const bytes = new TextEncoder().encode(conteudo);
    let bin = "";
    bytes.forEach(b => { bin += String.fromCharCode(b); });

    const caminho = folder ? `${folder}/${nomeArquivo}` : nomeArquivo;
    const resp = await fetch(`https://api.github.com/repos/${repo}/contents/${encodeURI(caminho)}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: `backup: ${nomeArquivo}`,
        content: btoa(bin),
        branch
      })
    });

    const dados = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const dica = resp.status === 401 ? " (token inválido ou expirado)"
        : resp.status === 403 || resp.status === 404 ? " (verifique repositório, branch e permissão 'Contents: write' do token)"
        : "";
      throw new Error(`GitHub ${resp.status}: ${dados.message || "falha no envio"}${dica}`);
    }
    return dados.content?.html_url || `https://github.com/${repo}/blob/${branch}/${caminho}`;
  },

  /**
   * Envia qualquer arquivo (File/Blob, texto ou binário) para <pasta>/<nome> no repositório.
   * Suporta sobrescrita buscando o sha existente quando sobrescrever=true.
   */
  async uploadArquivo(pasta, arquivo, { sobrescrever = false } = {}) {
    const { repo, branch, token } = this.getConfig();
    if (!token) throw new Error("Token do GitHub não configurado. Cadastre em Configurações.");

    const pastaLimpa = (pasta || "outros").trim().replace(/^\/+|\/+$/g, "");
    const nome = arquivo.name.replace(/[\\/]/g, "_");
    const caminho = pastaLimpa ? `${pastaLimpa}/${nome}` : nome;
    const url = `https://api.github.com/repos/${repo}/contents/${encodeURI(caminho)}`;

    const base64 = await new Promise((resolve, reject) => {
      const leitor = new FileReader();
      leitor.onload = () => {
        const res = String(leitor.result || "");
        const idx = res.indexOf(",");
        resolve(idx >= 0 ? res.slice(idx + 1) : res);
      };
      leitor.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
      leitor.readAsDataURL(arquivo);
    });

    const corpo = {
      message: `upload(${pastaLimpa || "root"}): ${nome}`,
      content: base64,
      branch
    };

    if (sobrescrever) {
      const atual = await fetch(`${url}?ref=${encodeURIComponent(branch)}`, { headers: this._headers() });
      if (atual.ok) {
        const info = await atual.json().catch(() => ({}));
        if (info.sha) corpo.sha = info.sha;
      }
    }

    const resp = await fetch(url, {
      method: "PUT",
      headers: { ...this._headers(), "Content-Type": "application/json" },
      body: JSON.stringify(corpo)
    });
    const dados = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const err = this._erro(resp.status, dados.message);
      err.conflito = resp.status === 422 || resp.status === 409;
      throw err;
    }
    return dados.content?.html_url || `https://github.com/${repo}/blob/${branch}/${caminho}`;
  },

  /** Liga os campos da seção "GitHub" do modal de Configurações. */
  bindSettings() {
    const el = id => document.getElementById(id);
    const repo = el("input-gh-repo"), branch = el("input-gh-branch"),
      folder = el("input-gh-folder"), token = el("input-gh-token"),
      btnSave = el("btn-save-github"), btnClear = el("btn-clear-github"),
      status = el("github-sync-status");
    if (!repo || !btnSave) return;

    const render = () => {
      const c = this.getConfig();
      repo.value = c.repo; branch.value = c.branch; folder.value = c.folder;
      token.value = c.token;
      status.textContent = this.isConfigured()
        ? `Ativo: Exportar poderá enviar para ${c.repo}/${c.folder}`
        : "Inativo: informe o token para habilitar o envio.";
    };

    btnSave.onclick = () => {
      if (!token.value.trim()) { alert("Informe o token do GitHub."); return; }
      if (!/^[^/\s]+\/[^/\s]+$/.test(repo.value.trim())) { alert("Repositório deve estar no formato dono/repo."); return; }
      this.saveConfig({ repo: repo.value, branch: branch.value, folder: folder.value, token: token.value });
      render();
      alert("Configuração do GitHub salva neste navegador.");
    };

    btnClear.onclick = () => {
      this.clearConfig();
      render();
    };

    render();
  }
};
