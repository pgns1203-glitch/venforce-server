const API_CANDIDATES = ["http://localhost:4127"];

document.addEventListener("DOMContentLoaded", async () => {
  const loginView = document.getElementById("loginView");
  const appView = document.getElementById("appView");

  const emailInput = document.getElementById("email");
  const senhaInput = document.getElementById("senha");
  const btnLogin = document.getElementById("btnLogin");

  const statusLoginBox = document.getElementById("status");
  const statusAppBox = document.getElementById("statusApp");
  const statusImportacaoBox = document.getElementById("statusImportacao");
  const statusSenhaBox = document.getElementById("statusSenha");

  const usuarioNomeBox = document.getElementById("usuarioNome");
  const btnLogout = document.getElementById("btnLogout");

  const filtroBaseInput = document.getElementById("filtroBase");
  const basesSelect = document.getElementById("basesSelect");
  const btnAtualizarBases = document.getElementById("btnAtualizarBases");
  const btnSalvarBase = document.getElementById("btnSalvarBase");
  const baseAtualInfo = document.getElementById("baseAtualInfo");

  const nomeNovaBaseInput = document.getElementById("nomeNovaBase");
  const arquivoInput = document.getElementById("arquivo");
  const btnImportar = document.getElementById("btnImportar");

  const senhaAtualInput = document.getElementById("senhaAtual");
  const novaSenhaInput = document.getElementById("novaSenha");
  const btnTrocarSenha = document.getElementById("btnTrocarSenha");

  let todasAsBases = [];
  let currentApiBase = null;

  function setBoxStatus(el, message, color = "#2e7d32") {
    if (!el) return;
    el.textContent = message || "";
    el.style.color = color;
  }

  function clearBoxStatus(el) {
    if (!el) return;
    el.textContent = "";
  }

  function setLoginStatus(message, color = "red") {
    setBoxStatus(statusLoginBox, message, color);
  }

  function setAppStatus(message, color = "#2e7d32") {
    setBoxStatus(statusAppBox, message, color);
  }

  function setImportStatus(message, color = "#2e7d32") {
    setBoxStatus(statusImportacaoBox, message, color);
  }

  function setSenhaStatus(message, color = "#2e7d32") {
    setBoxStatus(statusSenhaBox, message, color);
  }

  function limparStatusApp() {
    clearBoxStatus(statusAppBox);
  }

  function limparStatusImportacao() {
    clearBoxStatus(statusImportacaoBox);
  }

  function limparStatusSenha() {
    clearBoxStatus(statusSenhaBox);
  }

  function setBaseAtualInfo(texto, color = "#4a3a8b") {
    if (!baseAtualInfo) return;
    baseAtualInfo.textContent = texto || "Base atual: nenhuma";
    baseAtualInfo.style.color = color;
  }

  function setLoginLoading(isLoading) {
    if (!btnLogin) return;
    btnLogin.disabled = isLoading;
    btnLogin.textContent = isLoading ? "Entrando..." : "Entrar";
  }

  function setBasesLoading(isLoading) {
    if (btnAtualizarBases) btnAtualizarBases.disabled = isLoading;
    if (btnSalvarBase) btnSalvarBase.disabled = isLoading;
    if (basesSelect) basesSelect.disabled = isLoading;
    if (filtroBaseInput) filtroBaseInput.disabled = isLoading;

    if (btnAtualizarBases) {
      btnAtualizarBases.textContent = isLoading ? "Atualizando..." : "Bases";
    }
  }

  function setImportLoading(isLoading) {
    if (btnImportar) btnImportar.disabled = isLoading;
    if (nomeNovaBaseInput) nomeNovaBaseInput.disabled = isLoading;
    if (arquivoInput) arquivoInput.disabled = isLoading;

    if (btnImportar) {
      btnImportar.textContent = isLoading
        ? "Importando planilha..."
        : "Criar base e importar planilha";
    }
  }

  function setTrocaSenhaLoading(isLoading) {
    if (btnTrocarSenha) btnTrocarSenha.disabled = isLoading;
    if (senhaAtualInput) senhaAtualInput.disabled = isLoading;
    if (novaSenhaInput) novaSenhaInput.disabled = isLoading;

    if (btnTrocarSenha) {
      btnTrocarSenha.textContent = isLoading
        ? "Alterando senha..."
        : "Alterar senha";
    }
  }

  function showLoginView() {
    if (loginView) loginView.style.display = "block";
    if (appView) appView.style.display = "none";
    limparStatusApp();
    limparStatusImportacao();
    limparStatusSenha();
  }

  function showAppView() {
    if (loginView) loginView.style.display = "none";
    if (appView) appView.style.display = "block";
    setLoginStatus("");
  }

  function getStorage(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, (result) => resolve(result || {}));
    });
  }

  function setStorage(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set(data, () => resolve());
    });
  }

  function removeStorage(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.remove(keys, () => resolve());
    });
  }

  async function tryHealth(baseUrl) {
    try {
      const response = await fetch(`${baseUrl}/health`, {
        method: "GET",
        cache: "no-store"
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async function resolveApiBase(forceRefresh = false) {
    if (!forceRefresh && currentApiBase) return currentApiBase;

    const storage = await getStorage(["apiBaseUrl"]);

    if (!forceRefresh && storage.apiBaseUrl) {
      const ok = await tryHealth(storage.apiBaseUrl);
      if (ok) {
        currentApiBase = storage.apiBaseUrl;
        return currentApiBase;
      }
    }

    for (const candidate of API_CANDIDATES) {
      const ok = await tryHealth(candidate);
      if (ok) {
        currentApiBase = candidate;
        await setStorage({ apiBaseUrl: candidate });
        return candidate;
      }
    }

    throw new Error("Servidor não encontrado em http://localhost:4127");
  }

  async function limparSessao() {
    await removeStorage([
      "venforceToken",
      "venforceUser",
      "baseSelecionada",
      "baseSelecionadaLabel",
      "baseUpdatedAt",
      "baseAtiva"
    ]);
  }

  async function notifyBaseReload(reason = "manual") {
    try {
      const tabs = await chrome.tabs.query({
        url: [
          "https://www.mercadolivre.com.br/*",
          "https://*.mercadolivre.com.br/*",
          "https://www.mercadolivre.com/*",
          "https://*.mercadolivre.com/*",
          "https://seller.shopee.com.br/*",
          "https://*.seller.shopee.com.br/*",
          "https://shopee.com.br/*",
          "https://*.shopee.com.br/*"
        ]
      });

      for (const tab of tabs) {
        if (!tab.id) continue;

        try {
          await chrome.tabs.sendMessage(tab.id, {
            type: "VENFORCE_RELOAD_BASE",
            reason
          });
        } catch (err) {
          console.warn(
            "[VenForce GO] aba sem content script ativo:",
            tab.id,
            err?.message || err
          );
        }
      }
    } catch (error) {
      console.warn("[VenForce GO] falha ao notificar abas:", error);
    }
  }

  async function apiFetch(path, options = {}) {
    const apiBase = await resolveApiBase();
    const { venforceToken } = await getStorage(["venforceToken"]);

    const headers = {
      ...(options.headers || {})
    };

    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    if (venforceToken) {
      headers.Authorization = `Bearer ${venforceToken}`;
    }

    const response = await fetch(`${apiBase}${path}`, {
      ...options,
      headers
    });

    const rawText = await response.text();
    let data = {};

    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      data = { rawText };
    }

    if (response.status === 401) {
      await limparSessao();
      showLoginView();
      throw new Error(data.erro || data.message || "Sessão expirada. Faça login novamente.");
    }

    if (!response.ok) {
      throw new Error(data.erro || data.message || data.rawText || `Erro HTTP ${response.status}`);
    }

    return data;
  }

  async function login(email, senha) {
    const apiBase = await resolveApiBase(true);

    const response = await fetch(`${apiBase}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, senha })
    });

    const rawText = await response.text();
    let data = {};

    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      data = { rawText };
    }

    if (!response.ok) {
      throw new Error(data.erro || data.message || data.rawText || "Falha no login");
    }

    if (!data.token) {
      throw new Error("Token não recebido no login");
    }

    const usuario = data.usuario || { email };

    await setStorage({
      apiBaseUrl: apiBase,
      venforceToken: data.token,
      venforceUser: usuario
    });

    return data;
  }

  function normalizarListaBases(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.bases)) return payload.bases;
    if (Array.isArray(payload?.dados)) return payload.dados;
    if (Array.isArray(payload?.resultado)) return payload.resultado;
    return [];
  }

  function normalizarSlug(texto) {
    return String(texto || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\-]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function getBaseValue(base) {
    return normalizarSlug(
      base?.slug ||
      base?.id ||
      base?.baseId ||
      base?.nome ||
      ""
    );
  }

  function getBaseLabel(base) {
    const nome =
      base?.nomeExibicao ||
      base?.nome ||
      base?.label ||
      base?.slug ||
      base?.id ||
      "Base sem nome";

    const tipo = base?.tipo ? ` (${base.tipo})` : "";
    return `${nome}${tipo}`;
  }

  function renderBases(lista) {
    const valorAtual = basesSelect?.value || "";
    if (!basesSelect) return;

    basesSelect.innerHTML = `<option value="">Selecionar base</option>`;

    if (!lista.length) {
      basesSelect.innerHTML = `<option value="">Nenhuma base encontrada</option>`;
      return;
    }

    const slugsJaAdicionados = new Set();

    lista.forEach((base) => {
      const value = getBaseValue(base);
      const label = getBaseLabel(base);

      if (!value) return;
      if (slugsJaAdicionados.has(value)) return;

      slugsJaAdicionados.add(value);

      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      option.dataset.label = label;
      basesSelect.appendChild(option);
    });

    if (valorAtual && [...basesSelect.options].some((opt) => opt.value === valorAtual)) {
      basesSelect.value = valorAtual;
    }
  }

  function getSelectedBaseLabel() {
    if (!basesSelect) return "";
    const option = basesSelect.options[basesSelect.selectedIndex];
    return option?.dataset?.label || option?.textContent || "";
  }

  async function aplicarBaseSalva() {
    const { baseSelecionada, baseSelecionadaLabel } = await getStorage([
      "baseSelecionada",
      "baseSelecionadaLabel"
    ]);

    const baseSalva = normalizarSlug(baseSelecionada || "");

    if (!baseSalva) {
      setBaseAtualInfo("Base atual: nenhuma", "#666");
      setAppStatus("Selecione uma base para continuar.", "#666");
      return;
    }

    const existe = [...basesSelect.options].some((option) => option.value === baseSalva);

    if (existe) {
      basesSelect.value = baseSalva;
      const label = getSelectedBaseLabel() || baseSelecionadaLabel || baseSalva;
      setBaseAtualInfo(`Base atual: ${label}`, "#1f6b2a");
      setAppStatus(`Base carregada: ${label}`, "#2e7d32");
    } else {
      setBaseAtualInfo(`Base atual: ${baseSelecionadaLabel || baseSalva}`, "#a06b00");
      setAppStatus("A base salva não apareceu na lista atual.", "#a06b00");
    }
  }

  async function carregarBases() {
    setAppStatus("Carregando bases disponíveis...", "#666");
    setBasesLoading(true);

    if (basesSelect) {
      basesSelect.innerHTML = `<option value="">Carregando...</option>`;
    }

    try {
      const response = await apiFetch("/bases");
      todasAsBases = normalizarListaBases(response);

      renderBases(todasAsBases);

      if (!todasAsBases.length) {
        setBaseAtualInfo("Base atual: nenhuma", "#666");
        setAppStatus("Nenhuma base encontrada para este usuário.", "#c62828");
        return false;
      }

      await aplicarBaseSalva();
      return true;
    } catch (error) {
      console.error("[VenForce GO] erro ao carregar bases:", error);
      if (basesSelect) {
        basesSelect.innerHTML = `<option value="">Erro ao carregar bases</option>`;
      }
      setAppStatus(error.message || "Erro ao carregar bases.", "#c62828");
      return false;
    } finally {
      setBasesLoading(false);
    }
  }

  async function salvarBaseSelecionada() {
    const base = normalizarSlug(basesSelect?.value || "");
    const label = getSelectedBaseLabel();

    if (!base) {
      setAppStatus("Selecione uma base disponível.", "#c62828");
      return;
    }

    if (btnSalvarBase) {
      btnSalvarBase.disabled = true;
      btnSalvarBase.textContent = "Aplicando...";
    }

    setAppStatus("Aplicando base selecionada...", "#666");

    try {
      await setStorage({
        baseAtiva: base,
        baseSelecionada: base,
        baseSelecionadaLabel: label || base,
        baseUpdatedAt: Date.now()
      });

      setBaseAtualInfo(`Base atual: ${label || base}`, "#1f6b2a");

      await notifyBaseReload("base-change");

      setAppStatus(`Base aplicada com sucesso: ${label || base}`, "#2e7d32");
    } catch (error) {
      console.error("[VenForce GO] erro ao salvar base:", error);
      setAppStatus("Erro ao aplicar a base.", "#c62828");
    } finally {
      if (btnSalvarBase) {
        btnSalvarBase.disabled = false;
        btnSalvarBase.textContent = "Usar base selecionada";
      }
    }
  }

  async function filtrarBases() {
    const termo = String(filtroBaseInput?.value || "").trim().toLowerCase();

    if (!termo) {
      renderBases(todasAsBases);
      await aplicarBaseSalva();
      return;
    }

    const filtradas = todasAsBases.filter((base) =>
      getBaseLabel(base).toLowerCase().includes(termo)
    );

    renderBases(filtradas);

    const { baseSelecionada } = await getStorage(["baseSelecionada"]);
    const baseSalva = normalizarSlug(baseSelecionada || "");

    if (baseSalva && [...basesSelect.options].some((opt) => opt.value === baseSalva)) {
      basesSelect.value = baseSalva;
    }
  }

  async function criarNovaBasePorPlanilha() {
    const nomeBase = String(nomeNovaBaseInput?.value || "").trim();
    const arquivo = arquivoInput?.files?.[0];

    limparStatusImportacao();

    if (!nomeBase) {
      setImportStatus("Digite o nome da nova base.", "#c62828");
      return;
    }

    if (!arquivo) {
      setImportStatus("Selecione um arquivo antes de importar.", "#c62828");
      return;
    }

    const formData = new FormData();
    formData.append("nomeBase", nomeBase);
    formData.append("arquivo", arquivo);

    setImportStatus("Enviando planilha e criando base...", "#666");
    setImportLoading(true);

    try {
      const response = await apiFetch("/importar-base", {
        method: "POST",
        body: formData
      });

      const baseCriada = normalizarSlug(
        response?.baseId || response?.slug || response?.nomeBase || nomeBase
      );

      await carregarBases();

      let labelFinal = baseCriada;

      if ([...basesSelect.options].some((option) => option.value === baseCriada)) {
        basesSelect.value = baseCriada;
        labelFinal = getSelectedBaseLabel() || response?.nomeExibicao || baseCriada;
      } else if (response?.nomeExibicao) {
        labelFinal = response.nomeExibicao;
      }

      await setStorage({
        baseAtiva: baseCriada,
        baseSelecionada: baseCriada,
        baseSelecionadaLabel: labelFinal,
        baseUpdatedAt: Date.now()
      });

      setBaseAtualInfo(`Base atual: ${labelFinal}`, "#1f6b2a");

      await notifyBaseReload("planilha-importada");

      const totalIds =
        response?.totalIds ??
        response?.total ??
        response?.idsImportados ??
        0;

      const aviso = response?.aviso ? ` Aviso: ${response.aviso}` : "";

      setImportStatus(
        `Planilha carregada com sucesso. Base "${labelFinal}" pronta com ${totalIds} IDs.${aviso}`,
        "#2e7d32"
      );

      if (nomeNovaBaseInput) nomeNovaBaseInput.value = "";
      if (arquivoInput) arquivoInput.value = "";
    } catch (error) {
      console.error("[VenForce GO] erro ao criar/importar base:", error);
      setImportStatus(error.message || "Erro ao importar planilha.", "#c62828");
    } finally {
      setImportLoading(false);
    }
  }

  async function trocarSenha() {
    const senhaAtual = String(senhaAtualInput?.value || "");
    const novaSenha = String(novaSenhaInput?.value || "");

    limparStatusSenha();

    if (!senhaAtual || !novaSenha) {
      setSenhaStatus("Preencha a senha atual e a nova senha.", "#c62828");
      return;
    }

    setSenhaStatus("Alterando senha...", "#666");
    setTrocaSenhaLoading(true);

    try {
      const response = await apiFetch("/alterar-senha", {
        method: "POST",
        body: JSON.stringify({
          senhaAtual,
          novaSenha
        })
      });

      if (senhaAtualInput) senhaAtualInput.value = "";
      if (novaSenhaInput) novaSenhaInput.value = "";

      setSenhaStatus(response?.mensagem || "Senha alterada com sucesso.", "#2e7d32");
    } catch (error) {
      console.error("[VenForce GO] erro ao alterar senha:", error);
      setSenhaStatus(error.message || "Erro ao alterar senha.", "#c62828");
    } finally {
      setTrocaSenhaLoading(false);
    }
  }

  async function logout() {
    await limparSessao();

    if (emailInput) emailInput.value = "";
    if (senhaInput) senhaInput.value = "";
    if (filtroBaseInput) filtroBaseInput.value = "";
    if (basesSelect) basesSelect.innerHTML = `<option value="">Selecionar base</option>`;
    if (nomeNovaBaseInput) nomeNovaBaseInput.value = "";
    if (arquivoInput) arquivoInput.value = "";
    if (senhaAtualInput) senhaAtualInput.value = "";
    if (novaSenhaInput) novaSenhaInput.value = "";
    if (usuarioNomeBox) usuarioNomeBox.textContent = "";

    todasAsBases = [];
    setBaseAtualInfo("Base atual: nenhuma", "#666");
    limparStatusApp();
    limparStatusImportacao();
    limparStatusSenha();

    await notifyBaseReload("logout");

    showLoginView();
    setLoginStatus("Você saiu da conta.", "#666");
  }

  async function preencherUsuario() {
    const storage = await getStorage(["venforceUser"]);
    const usuario = storage.venforceUser || null;

    if (!usuarioNomeBox) return;

    if (usuario?.nome) {
      usuarioNomeBox.textContent = usuario.nome;
      return;
    }

    if (usuario?.email) {
      usuarioNomeBox.textContent = usuario.email;
      return;
    }

    usuarioNomeBox.textContent = "Usuário logado";
  }

  async function restaurarSessao() {
    const { venforceToken } = await getStorage(["venforceToken"]);

    if (!venforceToken) {
      showLoginView();
      return;
    }

    try {
      const sessao = await apiFetch("/auth/me");
      const usuario = sessao.usuario || null;

      if (usuario) {
        await setStorage({
          venforceUser: usuario
        });
      }

      showAppView();
      await preencherUsuario();
      await carregarBases();
    } catch (error) {
      console.error("[VenForce GO] erro ao restaurar sessão:", error);
      await limparSessao();
      showLoginView();
      setLoginStatus("Faça login para continuar.", "#666");
    }
  }

  async function executarLogin() {
    const email = emailInput?.value?.trim() || "";
    const senha = senhaInput?.value || "";

    if (!email || !senha) {
      setLoginStatus("Preencha email e senha.", "red");
      return;
    }

    setLoginStatus("Entrando...", "#666");
    setLoginLoading(true);

    try {
      await login(email, senha);
      showAppView();
      await preencherUsuario();
      await carregarBases();
      await notifyBaseReload("login");

      if (senhaInput) senhaInput.value = "";
      setAppStatus("Login realizado com sucesso.", "#2e7d32");
    } catch (error) {
      console.error("[VenForce GO] erro no login:", error);
      setLoginStatus(error.message || "Erro ao fazer login.", "red");
    } finally {
      setLoginLoading(false);
    }
  }

  if (btnLogin) {
    btnLogin.addEventListener("click", async () => {
      await executarLogin();
    });
  }

  if (emailInput) {
    emailInput.addEventListener("keydown", async (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      await executarLogin();
    });
  }

  if (senhaInput) {
    senhaInput.addEventListener("keydown", async (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      await executarLogin();
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      try {
        await logout();
      } catch (error) {
        console.error("[VenForce GO] erro no logout:", error);
        setAppStatus("Erro ao sair da conta.", "#c62828");
      }
    });
  }

  if (btnAtualizarBases) {
    btnAtualizarBases.addEventListener("click", async () => {
      const ok = await carregarBases();
      if (ok) {
        setAppStatus("Lista de bases atualizada.", "#2e7d32");
      }
    });
  }

  if (btnSalvarBase) {
    btnSalvarBase.addEventListener("click", async () => {
      await salvarBaseSelecionada();
    });
  }

  if (basesSelect) {
    basesSelect.addEventListener("change", async () => {
      const value = normalizarSlug(basesSelect.value || "");
      const label = getSelectedBaseLabel();

      if (!value) {
        setAppStatus("Selecione uma base válida.", "#c62828");
        return;
      }

      setBaseAtualInfo(`Base selecionada: ${label || value}`, "#4a3a8b");
      await salvarBaseSelecionada();
    });
  }

  if (filtroBaseInput) {
    filtroBaseInput.addEventListener("input", async () => {
      await filtrarBases();
    });
  }

  if (btnImportar) {
    btnImportar.addEventListener("click", async () => {
      await criarNovaBasePorPlanilha();
    });
  }

  if (btnTrocarSenha) {
    btnTrocarSenha.addEventListener("click", async () => {
      await trocarSenha();
    });
  }

  await restaurarSessao();
});