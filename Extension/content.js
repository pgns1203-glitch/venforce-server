console.log("[VenForce GO] extensão iniciada");

(function () {
  const API_CANDIDATES = ["http://localhost:4127"];

  const OVERLAY_ID = "venforcego-overlay-root";
  const STYLE_ID = "venforcego-style";
  const BOX_CLASS = "venforcego-card-box";
  const LOGO_FILE = "logo-vendex.png";

  // MELI
  const BOX_WIDTH = 278;
  const BOX_WIDTH_ML_LAYOUT2 = 266;
  const CARD_GAP_FROM_ROW_ML = 44;
  const CARD_GAP_FROM_ROW_ML_LAYOUT2 = 18;

  // SHOPEE
  const BOX_WIDTH_SHOPEE = 248;
  const CARD_GAP_FROM_ROW_SHOPEE = 10;

  const VIEWPORT_RIGHT_GAP = 10;
  const MIN_VERTICAL_GAP = 8;
  const MIN_VERTICAL_GAP_ML_LAYOUT2 = 18;

  const SHOPEE_CARD_FIXED_HEIGHT = 92;
  const SHOPEE_CARD_WIDTH_MIN = 252;
  const SHOPEE_CARD_WIDTH_MAX = 258;

  let COST_DB = {};
  let scheduled = false;
  let currentBaseId = null;
  let currentApiBase = null;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${OVERLAY_ID} {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        pointer-events: none;
        z-index: 999999;
      }

      .${BOX_CLASS} {
        position: absolute;
        border-radius: 16px;
        padding: 10px 12px 11px;
        font-family: Arial, sans-serif;
        font-size: 11px;
        line-height: 1.24;
        box-sizing: border-box;
        pointer-events: none;
        box-shadow: 0 10px 24px rgba(0,0,0,0.14);
        border: 2px solid transparent;
        overflow: hidden;
        transition: top .12s ease, left .12s ease;
      }

      .venforce-card-green {
        background: #dff5e4;
        border-color: #39b96b;
        color: #173a24;
      }

      .venforce-card-yellow {
        background: #fff4cc;
        border-color: #e0b100;
        color: #5d4700;
      }

      .venforce-card-red {
        background: #fde2e2;
        border-color: #d84c4c;
        color: #5b1f1f;
      }

      .venforce-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        margin-bottom: 6px;
        min-height: 18px;
      }

      .venforce-head span {
        white-space: nowrap;
      }

      .venforce-brand {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }

      .venforce-logo {
        width: 78px;
        max-height: 24px;
        object-fit: contain;
        display: block;
        flex-shrink: 0;
      }

      .venforce-title-wrap {
        min-width: 0;
      }

      .venforce-badge {
        display: inline-block;
        margin-bottom: 4px;
        padding: 3px 8px;
        border-radius: 999px;
        background: linear-gradient(135deg, #8c5bff, #5f2ee8);
        color: #fff;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: .2px;
      }

      .venforce-title {
        font-weight: 800;
        font-size: 13px;
        line-height: 1.1;
        margin: 0;
      }

      .venforce-subid {
        font-size: 10px;
        opacity: 0.92;
        margin-top: 2px;
      }

      .venforce-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        column-gap: 12px;
        row-gap: 3px;
      }

      .venforce-col {
        min-width: 0;
      }

      .venforce-row {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1.18;
      }

      .venforce-sep {
        border-top: 1px solid rgba(0, 0, 0, 0.14);
        margin: 7px 0 6px;
      }

      .venforce-bottom {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 8px;
      }

      .venforce-status {
        margin-top: 2px;
        font-weight: 800;
        font-size: 12px;
      }

      .venforce-metrics {
        text-align: right;
        min-width: 86px;
      }

      .venforce-metric-main {
        font-size: 18px;
        font-weight: 900;
        line-height: 1;
      }

      .venforce-metric-sub {
        margin-top: 3px;
        font-size: 10px;
        font-weight: 900;
      }

      .venforce-red-text {
        color: #c62828;
        font-weight: 800;
      }

      .venforce-green-text {
        color: #1b8f4d;
        font-weight: 800;
      }

      .venforce-yellow-text {
        color: #a06b00;
        font-weight: 800;
      }

      .venforce-base-name {
        margin-top: 4px;
        font-size: 10px;
        opacity: 0.92;
      }

      .venforce-debug-reason {
        margin-top: 6px;
        font-size: 10px;
        line-height: 1.2;
        opacity: 0.95;
      }

      .venforce-ml-layout2 {
        padding: 8px 10px 9px;
      }

      .venforce-ml-layout2 .venforce-logo {
        width: 70px;
        max-height: 22px;
      }

      .venforce-ml-layout2 .venforce-badge {
        padding: 2px 7px;
        font-size: 9px;
        margin-bottom: 3px;
      }

      .venforce-ml-layout2 .venforce-title {
        font-size: 12px;
      }

      .venforce-ml-layout2 .venforce-subid {
        font-size: 9px;
      }

      .venforce-ml-layout2 .venforce-grid {
        column-gap: 8px;
        row-gap: 1px;
      }

      .venforce-ml-layout2 .venforce-row {
        font-size: 10px;
        line-height: 1.15;
      }

      .venforce-ml-layout2 .venforce-metric-main {
        font-size: 15px;
      }

      .venforce-ml-layout2 .venforce-metric-sub {
        font-size: 9px;
      }

      .venforce-shopee-compact {
  padding: 6px 8px 7px;
  border-radius: 12px;
  overflow: hidden !important;
}

.venforce-shopee-compact .venforce-head {
  margin-bottom: 2px;
}

.venforce-shopee-compact .venforce-logo {
  display: none;
}

.venforce-shopee-compact .venforce-brand {
  gap: 0;
}

.venforce-shopee-compact .venforce-badge {
  margin-bottom: 1px;
  padding: 2px 6px;
  font-size: 8px;
}

.venforce-shopee-compact .venforce-title {
  font-size: 10px;
}

.venforce-shopee-compact .venforce-subid {
  font-size: 9px;
  margin-top: 1px;
  font-weight: 900;
  line-height: 1.1;
  opacity: 1;
}

.venforce-shopee-line {
  font-size: 8px;
  line-height: 1.1;
  margin-bottom: 5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 900;
}

.venforce-shopee-metrics-top {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 2px;
  align-items: center;
}

.venforce-shopee-metric {
  text-align: center;
  min-width: 76px;
  padding: 2px 2px;
}

.venforce-shopee-metric-label {
  font-size: 11px;
  font-weight: 900;
  line-height: 1;
  margin-bottom: 2px;
  letter-spacing: 0.2px;
}

.venforce-shopee-metric-value {
  font-size: 16px;
  line-height: 1;
  font-weight: 900;
  white-space: nowrap;
  letter-spacing: -0.2px;
}

.venforce-shopee-base {
  margin-top: 5px;
  font-size: 8px;
  opacity: 0.92;
}
`;

    document.head.appendChild(style);
  }

  function getLogoUrl() {
    try {
      const url = chrome.runtime.getURL(LOGO_FILE);
      return typeof url === "string" ? url : "";
    } catch {
      return "";
    }
  }

  function renderLogoHtml() {
    const logoUrl = getLogoUrl();
    if (!logoUrl) return "";
    return `<img class="venforce-logo" src="${logoUrl}" alt="Vendex" onerror="this.style.display='none'">`;
  }

  function moeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL"
    });
  }

  function porcentagem(valor) {
    return `${Number(valor || 0).toFixed(2)}%`;
  }

  function numeroSeguro(valor) {
    if (valor === null || valor === undefined || valor === "") return 0;

    if (typeof valor === "number") {
      return Number.isFinite(valor) ? valor : 0;
    }

    let texto = String(valor).trim();
    if (!texto) return 0;

    texto = texto
      .replace(/\s+/g, "")
      .replace(/R\$/gi, "")
      .replace(/US\$/gi, "")
      .replace(/€/gi, "")
      .replace(/%/g, "")
      .replace(/[^\d,.\-]/g, "");

    if (!texto) return 0;

    const temVirgula = texto.includes(",");
    const temPonto = texto.includes(".");

    if (temVirgula && temPonto) {
      const ultimaVirgula = texto.lastIndexOf(",");
      const ultimoPonto = texto.lastIndexOf(".");

      if (ultimaVirgula > ultimoPonto) {
        texto = texto.replace(/\./g, "").replace(",", ".");
      } else {
        texto = texto.replace(/,/g, "");
      }
    } else if (temVirgula) {
      const partes = texto.split(",");
      if (partes.length > 2) {
        texto = partes.join("");
      } else {
        const parteDecimal = partes[1] || "";
        if (parteDecimal.length === 3 && partes[0].length >= 1) {
          texto = partes.join("");
        } else {
          texto = texto.replace(",", ".");
        }
      }
    } else if (temPonto) {
      const partes = texto.split(".");
      if (partes.length > 2) {
        texto = partes.join("");
      } else {
        const parteDecimal = partes[1] || "";
        if (parteDecimal.length === 3 && partes[0].length >= 1) {
          texto = partes.join("");
        }
      }
    }

    const numero = Number(texto);
    return Number.isFinite(numero) ? numero : 0;
  }

  function extrairNumeroDeTexto(texto) {
    if (!texto) return 0;
    const match = String(texto).match(/(?:R\$\s*)?(-?[\d.,]+)/);
    if (!match?.[1]) return 0;
    return numeroSeguro(match[1]);
  }

  function normalizarPercentual(valor) {
    const n = numeroSeguro(valor);
    if (n > 0 && n <= 1) return n * 100;
    return n;
  }

  function classeNumero(valor) {
    if (valor > 0) return "venforce-green-text";
    if (valor < 0) return "venforce-red-text";
    return "venforce-yellow-text";
  }

  function getCardColorClassByMc(mc) {
    if (mc <= 6) return "venforce-card-red";
    if (mc < 10) return "venforce-card-yellow";
    return "venforce-card-green";
  }

  function getStatusByMc(mc) {
    if (mc <= 6) return { texto: "Crítico", classe: "venforce-red-text" };
    if (mc < 10) return { texto: "Atenção", classe: "venforce-yellow-text" };
    return { texto: "Saudável", classe: "venforce-green-text" };
  }

  function getTextoLimpo(el) {
    return (el?.innerText || "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getLinhas(texto) {
    return String(texto || "")
      .replace(/\u00a0/g, " ")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function normalizarBusca(texto) {
    return String(texto || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function limparChaveBusca(valor) {
    return normalizarBusca(String(valor || ""))
      .replace(/\s+/g, "")
      .replace(/[^\w.-]/g, "");
  }

  function isShopee() {
    return /shopee\.com\.br/i.test(window.location.hostname);
  }

  function isMercadoLivre() {
    return /mercadolivre\.com(\.br)?$/i.test(window.location.hostname) ||
      /mercadolivre\.com\.br/i.test(window.location.hostname);
  }

  function isMercadoLivreDetailPage() {
    if (!isMercadoLivre() || isShopee()) return false;

    const path = String(window.location.pathname || "").toLowerCase();
    const textoPagina = getTextoLimpo(document.body).toLowerCase();

    return (
      path.includes("/publicacoes/") ||
      path.includes("/editar") ||
      textoPagina.includes("condições de venda") ||
      textoPagina.includes("condicoes de venda")
    ) && (
      textoPagina.includes("você recebe") ||
      textoPagina.includes("voce recebe") ||
      textoPagina.includes("tarifa de venda") ||
      textoPagina.includes("premium") ||
      textoPagina.includes("clássico") ||
      textoPagina.includes("classico")
    );
  }

  function detectarLayoutRow(row) {
    const t = getTextoLimpo(row).toLowerCase();

    const pareceTabela =
      row.matches("[role='row']") ||
      !!row.querySelector("[role='cell']") ||
      !!row.querySelector("td") ||
      t.includes("métricas últ. 7 dias") ||
      t.includes("metricas ult. 7 dias") ||
      t.includes("status e recomendações") ||
      t.includes("status e recomendacoes");

    return pareceTabela ? "novo" : "antigo";
  }

  function isMlLayout2Row(row) {
    return detectarLayoutRow(row) === "novo";
  }

  async function getSessao() {
    try {
      const storage = await chrome.storage.local.get([
        "baseAtiva",
        "baseSelecionada",
        "baseSelecionadaLabel",
        "venforce_email",
        "venforce_user",
        "email",
        "user",
        "token",
        "venforceToken",
        "venforceUser",
        "apiBaseUrl"
      ]);

      return {
        baseAtiva: storage.baseSelecionada || storage.baseAtiva || null,
        baseLabel: storage.baseSelecionadaLabel || null,
        email:
          storage.venforceUser?.email ||
          storage.venforce_user?.email ||
          storage.user?.email ||
          storage.venforce_email ||
          storage.email ||
          null,
        user:
          storage.venforceUser ||
          storage.venforce_user ||
          storage.user ||
          null,
        token: storage.venforceToken || storage.token || null,
        apiBaseUrl: storage.apiBaseUrl || null
      };
    } catch (error) {
      console.error("[VenForce GO] erro ao ler sessão:", error);
      return {
        baseAtiva: null,
        baseLabel: null,
        email: null,
        user: null,
        token: null,
        apiBaseUrl: null
      };
    }
  }

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, {
      cache: "no-store",
      ...options
    });

    const text = await response.text();

    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }

    return { response, json, text };
  }

  async function tryHealth(baseUrl) {
    try {
      const { response } = await fetchJson(`${baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async function resolveApiBase() {
    if (currentApiBase) return currentApiBase;

    const sessao = await getSessao();

    if (sessao.apiBaseUrl) {
      const ok = await tryHealth(sessao.apiBaseUrl);
      if (ok) {
        currentApiBase = sessao.apiBaseUrl;
        console.log("[VenForce GO] API detectada via storage:", currentApiBase);
        return currentApiBase;
      }
    }

    for (const base of API_CANDIDATES) {
      const ok = await tryHealth(base);
      if (ok) {
        currentApiBase = base;
        console.log("[VenForce GO] API detectada em:", base);
        return currentApiBase;
      }
    }

    currentApiBase = API_CANDIDATES[0];
    return currentApiBase;
  }

  function clearLoadedBase() {
    COST_DB = {};
    currentBaseId = null;
  }

  function clearAllBoxes() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;
    overlay.innerHTML = "";
  }

  async function loadCostsByToken(baseUrl, sessao) {
    if (!sessao.token || !sessao.baseAtiva) return false;

    try {
      const { response, json } = await fetchJson(
        `${baseUrl}/bases/${encodeURIComponent(sessao.baseAtiva)}`,
        {
          headers: {
            Authorization: `Bearer ${sessao.token}`
          }
        }
      );

      if (!response.ok || !json?.ok) {
        throw new Error(json?.erro || `HTTP ${response.status}`);
      }

      COST_DB = json.dados || {};
      currentBaseId =
        json.nomeExibicao ||
        json.baseId ||
        sessao.baseLabel ||
        sessao.baseAtiva;

      console.log(
        "[VenForce GO] base carregada via token:",
        currentBaseId,
        Object.keys(COST_DB).length
      );

      return true;
    } catch (error) {
      console.warn("[VenForce GO] falha no carregamento via token:", error.message);
      return false;
    }
  }

  async function loadCostsByLegacyEmail(baseUrl, sessao) {
    if (!sessao.email || !sessao.baseAtiva) return false;

    try {
      const { response, json } = await fetchJson(
        `${baseUrl}/api/custos/${encodeURIComponent(sessao.baseAtiva)}?email=${encodeURIComponent(sessao.email)}`
      );

      if (!response.ok || !json?.ok) {
        throw new Error(json?.erro || `HTTP ${response.status}`);
      }

      COST_DB = json.data || {};
      currentBaseId =
        json.nomeExibicao ||
        json.cliente ||
        sessao.baseLabel ||
        sessao.baseAtiva;

      console.log(
        "[VenForce GO] base carregada via email:",
        currentBaseId,
        Object.keys(COST_DB).length
      );

      return true;
    } catch (error) {
      console.warn("[VenForce GO] falha no carregamento legado:", error.message);
      return false;
    }
  }

  async function loadCostsFromApi() {
    const sessao = await getSessao();
    const baseUrl = await resolveApiBase();

    if (!sessao.baseAtiva) {
      console.warn("[VenForce GO] nenhuma base ativa selecionada");
      clearLoadedBase();
      return false;
    }

    if (!sessao.token && !sessao.email) {
      console.warn("[VenForce GO] usuário não logado");
      clearLoadedBase();
      return false;
    }

    const okToken = await loadCostsByToken(baseUrl, sessao);
    if (okToken) return true;

    const okLegacy = await loadCostsByLegacyEmail(baseUrl, sessao);
    if (okLegacy) return true;

    clearLoadedBase();
    return false;
  }

  async function loadCostsLocalFallback() {
    try {
      const url = chrome.runtime.getURL("custos.json");
      const response = await fetch(url, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`Fallback não encontrado (${response.status})`);
      }

      COST_DB = await response.json();
      currentBaseId = "fallback-local";
      console.log("[VenForce GO] fallback local carregado");
      return true;
    } catch (error) {
      console.warn("[VenForce GO] fallback local indisponível:", error.message);
      clearLoadedBase();
      return false;
    }
  }

  async function loadCosts() {
    const ok = await loadCostsFromApi();
    if (!ok) await loadCostsLocalFallback();
  }

  function ensureOverlay() {
    let overlay = document.getElementById(OVERLAY_ID);
    if (overlay) return overlay;

    overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    document.body.appendChild(overlay);

    return overlay;
  }

  function syncOverlaySize() {
    const overlay = ensureOverlay();
    const body = document.body;
    const html = document.documentElement;

    const width = Math.max(
      body.scrollWidth,
      body.offsetWidth,
      html.clientWidth,
      html.scrollWidth,
      html.offsetWidth
    );

    const height = Math.max(
      body.scrollHeight,
      body.offsetHeight,
      html.clientHeight,
      html.scrollHeight,
      html.offsetHeight
    );

    overlay.style.width = `${width}px`;
    overlay.style.height = `${height}px`;
  }

  function buscarCustoPorChaves(chaves = []) {
    if (!COST_DB || typeof COST_DB !== "object") return null;

    const mapaNormalizado = new Map();

    for (const [key, value] of Object.entries(COST_DB)) {
      const chaveNormalizada = limparChaveBusca(key);
      if (chaveNormalizada && !mapaNormalizado.has(chaveNormalizada)) {
        mapaNormalizado.set(chaveNormalizada, { key, value });
      }
    }

    for (const chave of chaves) {
      const chaveOriginal = String(chave || "").trim();
      const chaveNormalizada = limparChaveBusca(chaveOriginal);
      if (!chaveNormalizada) continue;

      if (Object.prototype.hasOwnProperty.call(COST_DB, chaveOriginal)) {
        return { key: chaveOriginal, value: COST_DB[chaveOriginal] };
      }

      if (mapaNormalizado.has(chaveNormalizada)) {
        return mapaNormalizado.get(chaveNormalizada);
      }
    }

    return null;
  }

  function buscarValorAposMarcadorNasLinhas(linhas, marcadores, lookahead = 5) {
    const linhasNormais = linhas.map((l) => normalizarBusca(l));
    const marcadoresNormalizados = marcadores.map((m) => normalizarBusca(m));

    for (let i = 0; i < linhasNormais.length; i++) {
      const atual = linhasNormais[i];
      const achouMarcador = marcadoresNormalizados.some((m) => atual.includes(m));
      if (!achouMarcador) continue;

      for (let j = i + 1; j <= Math.min(linhas.length - 1, i + lookahead); j++) {
        const linhaOriginal = linhas[j] || "";
        const linhaNormal = linhasNormais[j] || "";

        if (
          linhaNormal.includes("classico") ||
          linhaNormal.includes("clássico") ||
          linhaNormal.includes("premium") ||
          linhaNormal.includes("tarifa de venda") ||
          linhaNormal.includes("comissao") ||
          linhaNormal.includes("comissão")
        ) {
          break;
        }

        const match = linhaOriginal.match(/A pagar\s*R\$\s*(-?[\d.,]+)/i);
        if (match?.[1]) {
          return extrairNumeroDeTexto(match[1]);
        }
      }
    }

    return 0;
  }

  function isTextoPrecoBloqueado(texto) {
    const t = String(texto || "").toLowerCase();

    return (
      t.includes("você recebe") ||
      t.includes("voce recebe") ||
      t.includes("receberá") ||
      t.includes("recebera") ||
      t.includes("recebe r$") ||
      t.includes("você receberá") ||
      t.includes("voce recebera") ||
      t.includes("a pagar") ||
      t.includes("tarifa de venda") ||
      t.includes("tarifa") ||
      t.includes("comissão") ||
      t.includes("comissao") ||
      t.includes("frete grátis") ||
      t.includes("frete gratis") ||
      t.includes("frete") ||
      t.includes("envio por conta do comprador") ||
      t.includes("imposto") ||
      t.includes("parcelamento sem acréscimo") ||
      t.includes("parcelamento sem acrescimo") ||
      t.includes("oferecer") ||
      t.includes("modificar") ||
      t.includes("adicionar preços de atacado") ||
      t.includes("adicionar precos de atacado") ||
      t.includes("por usar o flex")
    );
  }

  function isLinhaPrecoPrincipal(linha) {
    const t = String(linha || "").trim();
    return /^R\$\s*-?[\d.,]+$/i.test(t);
  }

  function extrairTodosOsPrecosLinha(texto) {
    const matches = String(texto || "").match(/R\$\s*[\d.,]+/gi) || [];
    return matches
      .map((item) => extrairNumeroDeTexto(item))
      .filter((v) => v > 0);
  }

  function extrairPrecoPrincipalDasLinhas(linhas) {
    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i];
      if (!isLinhaPrecoPrincipal(linha)) continue;
      if (isTextoPrecoBloqueado(linha)) continue;

      const anterior1 = (linhas[i - 1] || "").toLowerCase();
      const anterior2 = (linhas[i - 2] || "").toLowerCase();
      const proxima1 = (linhas[i + 1] || "").toLowerCase();
      const proxima2 = (linhas[i + 2] || "").toLowerCase();
      const contexto = `${anterior2} ${anterior1} ${linha.toLowerCase()} ${proxima1} ${proxima2}`;

      if (isTextoPrecoBloqueado(contexto)) continue;

      return extrairNumeroDeTexto(linha);
    }

    return 0;
  }

  function extrairPromocaoDasLinhas(linhas, precoCheio) {
    for (let i = 0; i < linhas.length; i++) {
      const linhaAtual = String(linhas[i] || "").toLowerCase();

      if (
        linhaAtual.includes("promoção") ||
        linhaAtual.includes("promocao") ||
        linhaAtual.includes("na promoção") ||
        linhaAtual.includes("na promocao") ||
        linhaAtual.includes("em promoção") ||
        linhaAtual.includes("em promocao")
      ) {
        for (let j = Math.max(0, i - 2); j <= Math.min(linhas.length - 1, i + 2); j++) {
          const candidato = String(linhas[j] || "").trim();
          if (!isLinhaPrecoPrincipal(candidato)) continue;

          const contextoLocal = [
            linhas[j - 1] || "",
            linhas[j] || "",
            linhas[j + 1] || ""
          ].join(" ").toLowerCase();

          if (isTextoPrecoBloqueado(contextoLocal)) continue;

          const valor = extrairNumeroDeTexto(candidato);
          if (valor > 0 && (!precoCheio || valor !== precoCheio)) {
            return valor;
          }
        }
      }
    }

    return 0;
  }

  function extrairPrecoVendaPorMarcadores(textoBruto, linhas) {
    let precoCheio = 0;
    let precoPromocional = 0;

    const matchVendaPor = textoBruto.match(
      /Você vende por[\s\S]{0,50}?R\$\s*(-?[\d.,]+)/i
    );
    if (matchVendaPor?.[1]) {
      precoCheio = extrairNumeroDeTexto(matchVendaPor[1]);
    }

    for (let i = 0; i < linhas.length; i++) {
      const linhaAtual = String(linhas[i] || "").toLowerCase();

      if (
        linhaAtual.includes("promoção") ||
        linhaAtual.includes("promocao") ||
        linhaAtual.includes("na promoção") ||
        linhaAtual.includes("na promocao") ||
        linhaAtual.includes("em promoção") ||
        linhaAtual.includes("em promocao")
      ) {
        for (let j = Math.max(0, i - 2); j <= Math.min(linhas.length - 1, i + 2); j++) {
          const linha = String(linhas[j] || "").trim();
          if (!isLinhaPrecoPrincipal(linha)) continue;

          const contextoLocal = [
            linhas[j - 1] || "",
            linhas[j] || "",
            linhas[j + 1] || ""
          ].join(" ").toLowerCase();

          if (isTextoPrecoBloqueado(contextoLocal)) continue;

          const valor = extrairNumeroDeTexto(linha);
          if (valor > 0) {
            if (!precoCheio || valor < precoCheio) {
              precoPromocional = valor;
            }
          }
        }
      }
    }

    const matchCheioPromo = textoBruto.match(
      /R\$\s*(-?[\d.,]+)[\s\S]{0,80}?(?:em promoção|em promocao|na promoção|na promocao)[\s\S]{0,40}?(?:a\s*)?R\$\s*(-?[\d.,]+)/i
    );

    if (matchCheioPromo?.[1] && matchCheioPromo?.[2]) {
      const cheio = extrairNumeroDeTexto(matchCheioPromo[1]);
      const promo = extrairNumeroDeTexto(matchCheioPromo[2]);

      if (cheio > 0 && !precoCheio) precoCheio = cheio;
      if (promo > 0) precoPromocional = promo;
    }

    return { precoCheio, precoPromocional };
  }

  function getMercadoLivreDetailContainer() {
    const candidatos = Array.from(
      document.querySelectorAll("main, section, article, div")
    );

    const validos = candidatos.filter((el) => {
      if (!el || el.id === OVERLAY_ID || el.closest?.(`#${OVERLAY_ID}`)) return false;

      const texto = getTextoLimpo(el).toLowerCase();
      if (!texto) return false;

      const temCondicoes =
        texto.includes("condições de venda") ||
        texto.includes("condicoes de venda");

      const temFinanceiro =
        texto.includes("você recebe") ||
        texto.includes("voce recebe") ||
        texto.includes("tarifa de venda") ||
        texto.includes("premium") ||
        texto.includes("clássico") ||
        texto.includes("classico");

      if (!temCondicoes || !temFinanceiro) return false;

      const rect = el.getBoundingClientRect();
      if (rect.width < 500 || rect.height < 180) return false;

      return true;
    });

    if (!validos.length) return null;

    validos.sort((a, b) => {
      const areaA = a.getBoundingClientRect().width * a.getBoundingClientRect().height;
      const areaB = b.getBoundingClientRect().width * b.getBoundingClientRect().height;
      return areaA - areaB;
    });

    return validos[0];
  }

  function extrairIdDetalheML(container) {
    const path = String(window.location.pathname || "");
    const href = String(window.location.href || "");
    const texto = container?.innerText || document.body?.innerText || "";

    let match =
      path.match(/MLB[-_]?(\d{8,})/i) ||
      href.match(/MLB[-_]?(\d{8,})/i) ||
      path.match(/\/(\d{8,})(?:[/?-]|$)/) ||
      texto.match(/#\s*(\d{8,})/) ||
      texto.match(/\bID[:\s#-]*(\d{8,})\b/i);

    if (match?.[1]) return match[1];

    const numeros = texto
      .replace(/[^\d]/g, " ")
      .split(/\s+/)
      .filter((n) => /^\d{8,}$/.test(n));

    return numeros[0] || null;
  }

  function extrairPrecoVendaDetalheML(container) {
    const texto = container?.innerText || document.body?.innerText || "";
    const linhas = getLinhas(texto);

    let precoCheio = 0;
    let precoPromocional = 0;

    const matchCheioPromo = texto.match(
      /R\$\s*([\d.,]+)\s*Você vende por\s*R\$\s*([\d.,]+)\s*na promoção/i
    );
    if (matchCheioPromo?.[1] && matchCheioPromo?.[2]) {
      precoCheio = extrairNumeroDeTexto(matchCheioPromo[1]);
      precoPromocional = extrairNumeroDeTexto(matchCheioPromo[2]);
    }

    if (!precoPromocional) {
      const matchPromo = texto.match(
        /Você vende por\s*R\$\s*([\d.,]+)\s*na promoção/i
      );
      if (matchPromo?.[1]) {
        precoPromocional = extrairNumeroDeTexto(matchPromo[1]);
      }
    }

    if (!precoCheio) {
      const matchCheio = texto.match(
        /Preço[\s\S]{0,80}?R\$\s*([\d.,]+)/i
      );
      if (matchCheio?.[1]) {
        precoCheio = extrairNumeroDeTexto(matchCheio[1]);
      }
    }

    if (!precoCheio) {
      const matchVendaPor = texto.match(
        /Você vende por\s*R\$\s*([\d.,]+)/i
      );
      if (matchVendaPor?.[1]) {
        const valor = extrairNumeroDeTexto(matchVendaPor[1]);
        if (valor > 0) {
          if (!precoPromocional) {
            precoCheio = valor;
          } else {
            precoPromocional = precoPromocional || valor;
          }
        }
      }
    }

    if (!precoCheio) {
      const extraido = extrairPrecoVendaPorMarcadores(texto, linhas);
      precoCheio = extraido.precoCheio || 0;
      if (!precoPromocional) precoPromocional = extraido.precoPromocional || 0;
    }

    if (!precoCheio) precoCheio = extrairPrecoPrincipalDasLinhas(linhas);
    if (!precoPromocional) precoPromocional = extrairPromocaoDasLinhas(linhas, precoCheio);

    if (precoPromocional > 0 && precoPromocional > precoCheio && precoCheio > 0) {
      precoPromocional = 0;
    }

    const precoVenda = precoPromocional || precoCheio || 0;

    return {
      precoVenda,
      precoCheio: precoCheio || precoVenda || 0,
      precoPromocional: precoPromocional || 0
    };
  }
  function extrairIdPainel(row) {
    if (!row) return null;
  
    const texto = row.innerText || "";
    const html = row.innerHTML || "";
  
    let match =
      texto.match(/\bMLB[-\s_]?(\d{8,})\b/i) ||
      texto.match(/\bID[:\s#-]*(\d{8,})\b/i) ||
      texto.match(/#\s*(\d{8,})\b/i) ||
      html.match(/\bMLB[-_]?(\d{8,})\b/i);
  
    if (match?.[1]) return match[1];
  
    const links = Array.from(row.querySelectorAll("a[href]"));
    for (const a of links) {
      const href = a.getAttribute("href") || "";
      const m =
        href.match(/MLB[-_]?(\d{8,})/i) ||
        href.match(/\/p\/MLB(\d{8,})/i) ||
        href.match(/\/(\d{8,})(?:[/?#-]|$)/);
  
      if (m?.[1]) return m[1];
    }
  
    return null;
  }

  function getPainelRows() {
    const candidatos = Array.from(
      document.querySelectorAll(
        [
          "tr",
          "[role='row']",
          "main section",
          "main article",
          "main div"
        ].join(",")
      )
    ).filter((el) => {
      if (!el) return false;
      if (el.id === OVERLAY_ID) return false;
      if (el.closest?.(`#${OVERLAY_ID}`)) return false;
  
      const texto = getTextoLimpo(el);
      if (!texto) return false;
  
      const rect = el.getBoundingClientRect();
      if (rect.width < 420) return false;
      if (rect.height < 80) return false;
      if (rect.height > 1200) return false;
  
      const temPreco = /R\$\s*[\d.,]+/.test(texto);
  
      const temSinaisMl =
        /\bMLB[-\s_]?\d{8,}\b/i.test(texto) ||
        /\bID[:\s#-]*\d{8,}\b/i.test(texto) ||
        texto.toLowerCase().includes("você recebe") ||
        texto.toLowerCase().includes("voce recebe") ||
        texto.toLowerCase().includes("tarifa de venda") ||
        texto.toLowerCase().includes("clássico") ||
        texto.toLowerCase().includes("classico") ||
        texto.toLowerCase().includes("premium") ||
        !!el.querySelector("a[href*='MLB']") ||
        !!el.querySelector("a[href*='/p/MLB']");
  
      if (!temPreco || !temSinaisMl) return false;
  
      return true;
    });
  
    const rows = candidatos.filter((el) => {
      return !candidatos.some((other) => {
        if (other === el) return false;
        if (!el.contains(other)) return false;
  
        const otherRect = other.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
  
        const otherTemId = !!extrairIdPainel(other);
        const otherMenor =
          otherRect.height <= elRect.height &&
          otherRect.width <= elRect.width;
  
        return otherTemId && otherMenor;
      });
    });
  
    rows.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
  
    return rows;
  }

  function extrairPrecoVenda(row) {
    if (isMercadoLivreDetailPage()) {
      return extrairPrecoVendaDetalheML(row);
    }

    const textoBruto = row?.innerText || "";
    const linhas = getLinhas(textoBruto);

    let precoCheio = 0;
    let precoPromocional = 0;

    const matchCheioPromo = textoBruto.match(
      /R\$\s*([\d.,]+)[\s\S]{0,60}?(?:em promoção|em promocao|na promoção|na promocao)[\s\S]{0,40}?R\$\s*([\d.,]+)/i
    );
    if (matchCheioPromo?.[1] && matchCheioPromo?.[2]) {
      precoCheio = extrairNumeroDeTexto(matchCheioPromo[1]);
      precoPromocional = extrairNumeroDeTexto(matchCheioPromo[2]);
    }

    if (!precoCheio) {
      const extraido = extrairPrecoVendaPorMarcadores(textoBruto, linhas);
      precoCheio = extraido.precoCheio || 0;
      precoPromocional = extraido.precoPromocional || precoPromocional || 0;
    }

    if (!precoCheio) precoCheio = extrairPrecoPrincipalDasLinhas(linhas);
    if (!precoPromocional) precoPromocional = extrairPromocaoDasLinhas(linhas, precoCheio);

    if (precoPromocional > 0 && precoCheio > 0 && precoPromocional > precoCheio) {
      precoPromocional = 0;
    }

    const precoVenda = precoPromocional || precoCheio || 0;

    return {
      precoVenda,
      precoCheio: precoCheio || precoVenda || 0,
      precoPromocional: precoPromocional || 0
    };
  }

  function extrairComissaoInfo(row, precoVenda) {
    const textoBruto = row?.innerText || "";
    const linhas = getLinhas(textoBruto);

    const matchPercentual = textoBruto.match(
      /(tarifa de venda|comissão|comissao|clássico|classico|premium)[\s\S]{0,80}?(\d{1,2}(?:[.,]\d{1,2})?)\s*%/i
    );
    const percentualDetectado = matchPercentual?.[2]
      ? numeroSeguro(matchPercentual[2])
      : 0;

    const marcadores = [
      "Clássico",
      "Classico",
      "Premium",
      "Tarifa de venda",
      "Comissão",
      "Comissao"
    ];

    let valor = buscarValorAposMarcadorNasLinhas(linhas, marcadores, 6);

    if (!valor) {
      const matchBloco = textoBruto.match(
        /(Clássico|Classico|Premium|Tarifa de venda|Comissão|Comissao)[\s\S]{0,180}?A pagar\s*R\$\s*(-?[\d.,]+)/i
      );
      if (matchBloco?.[2]) {
        valor = extrairNumeroDeTexto(matchBloco[2]);
      }
    }

    if (!valor && percentualDetectado > 0 && precoVenda > 0) {
      valor = (precoVenda * percentualDetectado) / 100;
    }

    const percentual = precoVenda > 0
      ? (numeroSeguro(valor) / precoVenda) * 100
      : percentualDetectado;

    return {
      valor: numeroSeguro(valor),
      percentual: numeroSeguro(percentual)
    };
  }

  function extrairFreteLayoutAntigo(row) {
    const textoBruto = row?.innerText || "";
    const linhas = getLinhas(textoBruto);

    const elementosComTooltip = Array.from(
      row.querySelectorAll("[title], [aria-label], [data-title], [data-tooltip], [tooltip]")
    );

    for (const el of elementosComTooltip) {
      const textos = [
        el.getAttribute("title"),
        el.getAttribute("aria-label"),
        el.getAttribute("data-title"),
        el.getAttribute("data-tooltip"),
        el.getAttribute("tooltip"),
        el.innerText
      ].filter(Boolean);

      for (const texto of textos) {
        const matchPara = String(texto).match(/De:\s*R\$\s*([\d.,]+)\s*Para:\s*R\$\s*([\d.,]+)/i);
        if (matchPara?.[2]) return extrairNumeroDeTexto(matchPara[2]);

        const matchSoPara = String(texto).match(/Para:\s*R\$\s*([\d.,]+)/i);
        if (matchSoPara?.[1]) return extrairNumeroDeTexto(matchSoPara[1]);
      }
    }

    const matchParaNoTexto = textoBruto.match(/De:\s*R\$\s*([\d.,]+)\s*Para:\s*R\$\s*([\d.,]+)/i);
    if (matchParaNoTexto?.[2]) return extrairNumeroDeTexto(matchParaNoTexto[2]);

    const matchSoParaNoTexto = textoBruto.match(/Para:\s*R\$\s*([\d.,]+)/i);
    if (matchSoParaNoTexto?.[1]) return extrairNumeroDeTexto(matchSoParaNoTexto[1]);

    const porLinhas = buscarValorAposMarcadorNasLinhas(
      linhas,
      [
        "Envio por conta do comprador",
        "Você oferece frete grátis",
        "Voce oferece frete gratis",
        "Frete grátis",
        "Frete gratis",
        "Frete grátis Full",
        "Frete gratis Full"
      ],
      5
    );

    if (porLinhas) return porLinhas;

    const matchForte = textoBruto.match(
      /(Envio por conta do comprador|Você oferece frete grátis|Voce oferece frete gratis|Frete grátis|Frete gratis|Frete grátis Full|Frete gratis Full)[\s\S]{0,160}?A pagar\s*R\$\s*(-?[\d.,]+)/i
    );
    if (matchForte?.[2]) return extrairNumeroDeTexto(matchForte[2]);

    return 0;
  }

  function extrairFreteLayoutNovo(row) {
    const textoBruto = row?.innerText || "";
    const linhas = getLinhas(textoBruto);

    const porLinhas = buscarValorAposMarcadorNasLinhas(
      linhas,
      [
        "Envio por conta do comprador",
        "Você oferece frete grátis",
        "Voce oferece frete gratis",
        "Frete grátis",
        "Frete gratis",
        "Frete grátis Full",
        "Frete gratis Full"
      ],
      6
    );

    if (porLinhas) return porLinhas;

    const matchForte = textoBruto.match(
      /(Envio por conta do comprador|Você oferece frete grátis|Voce oferece frete gratis|Frete grátis|Frete gratis|Frete grátis Full|Frete gratis Full)[\s\S]{0,170}?A pagar\s*R\$\s*(-?[\d.,]+)/i
    );
    if (matchForte?.[2]) return extrairNumeroDeTexto(matchForte[2]);

    return 0;
  }

  function extrairFrete(row) {
    const layout = detectarLayoutRow(row);
    return layout === "novo"
      ? extrairFreteLayoutNovo(row)
      : extrairFreteLayoutAntigo(row);
  }

  function normalizarCustoInfo(custoInfo) {
    if (!custoInfo || typeof custoInfo !== "object") {
      return {
        custo_produto: 0,
        imposto_percentual: 0,
        taxa_fixa: 0
      };
    }

    const custoRaw =
      custoInfo.custo_produto ??
      custoInfo.custo ??
      custoInfo.custoProduto ??
      custoInfo.CUSTO ??
      custoInfo.Custo ??
      0;

    const impostoRaw =
      custoInfo.imposto_percentual ??
      custoInfo.imposto ??
      custoInfo.impostoPercentual ??
      custoInfo.IMPOSTO ??
      custoInfo.Imposto ??
      0;

    const taxaRaw =
      custoInfo.taxa_fixa ??
      custoInfo.taxa ??
      custoInfo.taxaFixa ??
      custoInfo.TAXA ??
      custoInfo.Taxa ??
      0;

    return {
      custo_produto: numeroSeguro(custoRaw),
      imposto_percentual: normalizarPercentual(impostoRaw),
      taxa_fixa: numeroSeguro(taxaRaw)
    };
  }

  function calcular(precoVenda, custoInfo, comissaoInfo, frete) {
    const custoNormalizado = normalizarCustoInfo(custoInfo);

    const custo = numeroSeguro(custoNormalizado.custo_produto);
    const impostoPct = normalizarPercentual(custoNormalizado.imposto_percentual);
    const taxaFixa = numeroSeguro(custoNormalizado.taxa_fixa);

    const comissaoValor = numeroSeguro(comissaoInfo?.valor);
    const comissaoPct = precoVenda > 0 ? (comissaoValor / precoVenda) * 100 : 0;
    const impostoValor = (precoVenda * impostoPct) / 100;

    const lc = precoVenda - comissaoValor - frete - impostoValor - custo - taxaFixa;
    const mc = precoVenda > 0 ? (lc / precoVenda) * 100 : 0;

    return {
      precoVenda,
      custo,
      impostoPct,
      impostoValor,
      comissaoPct,
      comissaoValor,
      frete,
      taxaFixa,
      lc,
      mc
    };
  }

  function extrairPrecoShopee(row) {
    const texto = row?.innerText || "";
    const linhas = getLinhas(texto);

    let valoresPreco = [];

    for (const linha of linhas) {
      const textoLinha = String(linha || "").trim();

      if (
        /^SKU\s*principal:/i.test(textoLinha) ||
        /^SKU\s*da\s*varia[cç][aã]o:/i.test(textoLinha) ||
        /^ID\s*do\s*Item:/i.test(textoLinha) ||
        /^Model\s*ID:/i.test(textoLinha) ||
        /^Editar$/i.test(textoLinha) ||
        /^Anunciar$/i.test(textoLinha) ||
        /^Mais$/i.test(textoLinha) ||
        /Content Qualified/i.test(textoLinha) ||
        /Dispon[ií]vel/i.test(textoLinha)
      ) {
        continue;
      }

      const precosDaLinha = extrairTodosOsPrecosLinha(textoLinha);
      if (precosDaLinha.length) {
        valoresPreco = valoresPreco.concat(precosDaLinha);
      }
    }

    valoresPreco = [...new Set(valoresPreco.filter((v) => v > 0))].sort((a, b) => a - b);

    if (!valoresPreco.length) {
      return {
        precoVenda: 0,
        precoCheio: 0,
        precoPromocional: 0,
        precoBaseComissao: 0
      };
    }

    const menorPreco = valoresPreco[0] || 0;
    const maiorPreco = valoresPreco[valoresPreco.length - 1] || menorPreco || 0;

    return {
      precoVenda: menorPreco,
      precoCheio: maiorPreco,
      precoPromocional: menorPreco < maiorPreco ? menorPreco : 0,
      precoBaseComissao: menorPreco
    };
  }

  function calcularComissaoShopee(precoBase) {
    const preco = numeroSeguro(precoBase);
    if (!preco) {
      return { valor: 0, percentual: 0 };
    }
  
    let percentual = 0;
    let adicional = 0;
  
    if (preco <= 79.99) {
      percentual = 0.20;
      adicional = 4;
    } else if (preco <= 99.99) {
      percentual = 0.14;
      adicional = 16;
    } else if (preco <= 199.99) {
      percentual = 0.14;
      adicional = 20;
    } else if (preco <= 499.99) {
      percentual = 0.14;
      adicional = 26;
    } else {
      percentual = 0.14;
      adicional = 26;
    }
  
    const valor = preco * percentual + adicional;
  
    return {
      valor,
      percentual: preco > 0 ? (valor / preco) * 100 : 0
    };
  }

  function extrairIdentificadoresShopee(row) {
    const texto = row?.innerText || "";
    const linhas = getLinhas(texto);

    let modelId = null;
    let itemId = null;
    let skuPrincipal = null;
    let skuVariacao = null;

    for (const linha of linhas) {
      const linhaLimpa = String(linha || "").trim();

      if (!skuPrincipal) {
        const m = linhaLimpa.match(/^SKU\s*principal:\s*(.+)$/i);
        if (m?.[1]) skuPrincipal = m[1].trim();
      }

      if (!skuVariacao) {
        const m = linhaLimpa.match(/^SKU\s*da\s*varia[cç][aã]o:\s*(.+)$/i);
        if (m?.[1]) skuVariacao = m[1].trim();
      }

      if (!itemId) {
        const m = linhaLimpa.match(/^ID\s*do\s*Item:\s*(\d{6,})$/i);
        if (m?.[1]) itemId = m[1].trim();
      }

      if (!modelId) {
        const m = linhaLimpa.match(/^Model\s*ID:\s*(\d{6,})$/i);
        if (m?.[1]) modelId = m[1].trim();
      }
    }

    return {
      skuPrincipal,
      skuVariacao,
      itemId,
      modelId
    };
  }

  function isShopeeRow(el) {
    if (!el || el.id === OVERLAY_ID || el.closest?.(`#${OVERLAY_ID}`)) return false;

    const texto = getTextoLimpo(el);
    if (!texto) return false;

    const temModelId = /Model\s*ID:\s*\d{6,}/i.test(texto);
    const temPreco = /R\$\s*[\d.,]+/.test(texto);

    if (!temModelId || !temPreco) return false;

    const rect = el.getBoundingClientRect();
    if (rect.width < 700) return false;
    if (rect.height < 60) return false;
    if (rect.height > 420) return false;

    return true;
  }

  function getShopeeRows() {
    const candidatos = Array.from(document.querySelectorAll("tr, div"))
      .filter(isShopeeRow);

    const rows = candidatos.filter((el) => {
      return !candidatos.some((other) => other !== el && el.contains(other) && isShopeeRow(other));
    });

    rows.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    return rows;
  }

  function getCurrentBoxWidth(row = null) {
    if (isShopee()) return getDynamicShopeeBoxWidth(row);
    if (row && isMlLayout2Row(row)) return BOX_WIDTH_ML_LAYOUT2;
    return BOX_WIDTH;
  }

  function contarModelIdsNaRowShopee(row) {
    const texto = row?.innerText || "";
    const matches = texto.match(/Model\s*ID:\s*\d{6,}/gi) || [];
    return Math.max(1, matches.length);
  }

  function getDynamicShopeeBoxWidth(row) {
    const qtd = contarModelIdsNaRowShopee(row);
    let width = BOX_WIDTH_SHOPEE;
    if (qtd >= 2) width = BOX_WIDTH_SHOPEE;

    return Math.max(
      SHOPEE_CARD_WIDTH_MIN,
      Math.min(width, SHOPEE_CARD_WIDTH_MAX)
    );
  }

  function getDesiredBoxHeight(row, box) {
    const natural = box?.scrollHeight || box?.offsetHeight || 0;

    if (isShopee()) {
      return SHOPEE_CARD_FIXED_HEIGHT;
    }

    return box?.offsetHeight || natural || 0;
  }

  function getRowAnchorTop(row, boxHeight) {
    const rect = row.getBoundingClientRect();
    const naturalTop = window.scrollY + rect.top;

    if (!isShopee()) {
      if (isMlLayout2Row(row)) {
        return window.scrollY + rect.top + 4;
      }
      return naturalTop;
    }

    const centeredTop = window.scrollY + rect.top + Math.max(0, (rect.height - boxHeight) / 2);
    return centeredTop;
  }

  function debugExtracaoShopee(row, contexto = {}) {
    try {
      const textoBruto = row?.innerText || "";
      const linhas = getLinhas(textoBruto);
      const precos = extrairTodosOsPrecosLinha(textoBruto);

      console.group("[VenForce GO][DEBUG SHOPEE]");
      console.log("Motivo:", contexto.motivo || "não informado");
      console.log("Model ID:", contexto.modelId || null);
      console.log("Item ID:", contexto.itemId || null);
      console.log("SKU principal:", contexto.skuPrincipal || null);
      console.log("SKU variação:", contexto.skuVariacao || null);
      console.log("Base ativa:", currentBaseId || null);
      console.log("Texto bruto:", textoBruto);
      console.log("Linhas:", linhas);
      console.log("Preços encontrados:", precos);
      console.log("HTML:", (row?.innerHTML || "").slice(0, 12000));
      console.groupEnd();

      window.__venforceLastShopeeDebug = {
        contexto,
        textoBruto,
        linhas,
        precos,
        html: row?.innerHTML || ""
      };
    } catch (error) {
      console.warn("[VenForce GO] erro ao gerar debug Shopee:", error);
    }
  }

  function getBoxKey(row, index) {
    if (isShopee()) {
      const ids = extrairIdentificadoresShopee(row);
      const chave = ids.modelId || ids.skuVariacao || ids.skuPrincipal || ids.itemId || index;
      return `venforcego-box-shopee-model-${limparChaveBusca(chave)}`;
    }

    if (isMercadoLivreDetailPage()) {
      const idDetalhe = extrairIdDetalheML(row) || extrairIdPainel(row) || index;
      return `venforcego-box-ml-detail-${limparChaveBusca(idDetalhe)}`;
    }

    const id = extrairIdPainel(row);
    if (id) return `venforcego-box-${limparChaveBusca(id)}`;
    return `venforcego-box-index-${index}`;
  }

  function ensureBox(key, row = null) {
    const overlay = ensureOverlay();

    let box = overlay.querySelector(`[data-venforce-key="${key}"]`);
    if (box) {
      box.style.width = `${getCurrentBoxWidth(row)}px`;
      return box;
    }

    box = document.createElement("div");
    box.className = `${BOX_CLASS} venforce-card-green`;
    box.style.width = `${getCurrentBoxWidth(row)}px`;
    box.setAttribute("data-venforce-key", key);
    overlay.appendChild(box);

    return box;
  }

  function renderSemCusto(box, id, row = null) {
    const ml2 = row && !isShopee() && isMlLayout2Row(row);

    box.className = `${BOX_CLASS} ${
      isShopee() ? "venforce-card-yellow venforce-shopee-compact" : `venforce-card-yellow${ml2 ? " venforce-ml-layout2" : ""}`
    }`;

    box.innerHTML = `
      <div class="venforce-head">
        <div class="venforce-brand">
          ${isShopee() ? "" : renderLogoHtml()}
          <div class="venforce-title-wrap">
            <div class="venforce-badge">VenForce GO</div>
            <div class="venforce-title">LC / MC</div>
            <div class="venforce-subid">ID: ${id || "não encontrado"}</div>
          </div>
        </div>
      </div>

      <div class="venforce-sep"></div>
      <div class="venforce-yellow-text">Sem custo cadastrado</div>
      <div class="venforce-base-name">Base ativa: ${currentBaseId || "nenhuma"}</div>
    `;
  }

  function renderErroExtracao(box, id, motivo = "", row = null) {
    const ml2 = row && !isShopee() && isMlLayout2Row(row);

    box.className = `${BOX_CLASS} ${
      isShopee() ? "venforce-card-red venforce-shopee-compact" : `venforce-card-red${ml2 ? " venforce-ml-layout2" : ""}`
    }`;

    box.innerHTML = `
      <div class="venforce-head">
        <div class="venforce-brand">
          ${isShopee() ? "" : renderLogoHtml()}
          <div class="venforce-title-wrap">
            <div class="venforce-badge">VenForce GO</div>
            <div class="venforce-title">LC / MC</div>
            <div class="venforce-subid">ID: ${id || "não encontrado"}</div>
          </div>
        </div>
      </div>

      <div class="venforce-sep"></div>
      <div class="venforce-red-text">Não foi possível extrair corretamente este anúncio</div>
      ${motivo ? `<div class="venforce-debug-reason">Motivo: ${motivo}</div>` : ""}
      <div class="venforce-base-name">Base ativa: ${currentBaseId || "nenhuma"}</div>
    `;
  }

  function renderShopeeBox(box, id, dados) {
    const lcClass = classeNumero(dados.lc);
    const mcClass = classeNumero(dados.mc);
    const cardColorClass = getCardColorClassByMc(dados.mc);

    box.className = `${BOX_CLASS} ${cardColorClass} venforce-shopee-compact`;

    box.innerHTML = `
      <div class="venforce-head">
        <div class="venforce-brand">
          <div class="venforce-title-wrap">
            <div class="venforce-badge">VenForce GO</div>
            <div class="venforce-subid">ID: ${id}</div>
          </div>
        </div>
      </div>

      <div class="venforce-shopee-line">
        Comissão + taxa: ${moeda(dados.comissaoValor)}
      </div>

      <div class="venforce-shopee-metrics-top">
        <div class="venforce-shopee-metric">
          <div class="venforce-shopee-metric-label">LC</div>
          <div class="venforce-shopee-metric-value ${lcClass}">${moeda(dados.lc)}</div>
        </div>

        <div class="venforce-shopee-metric">
          <div class="venforce-shopee-metric-label">MC</div>
          <div class="venforce-shopee-metric-value ${mcClass}">${porcentagem(dados.mc)}</div>
        </div>
      </div>

      <div class="venforce-shopee-base">Base ativa: ${currentBaseId || "nenhuma"}</div>
    `;
  }

  function renderBox(box, id, dados, extras = {}, row = null) {
    if (isShopee()) {
      renderShopeeBox(box, id, dados);
      return;
    }

    const lcClass = classeNumero(dados.lc);
    const mcClass = classeNumero(dados.mc);
    const cardColorClass = getCardColorClassByMc(dados.mc);
    const status = getStatusByMc(dados.mc);
    const ml2 = row && isMlLayout2Row(row);

    box.className = `${BOX_CLASS} ${cardColorClass}${ml2 ? " venforce-ml-layout2" : ""}`;

    const temPromo = extras.precoPromocional > 0;
    const promoTexto = temPromo ? moeda(extras.precoPromocional) : "—";

    box.innerHTML = `
      <div class="venforce-head">
        <div class="venforce-brand">
          ${renderLogoHtml()}
          <div class="venforce-title-wrap">
            <div class="venforce-badge">VenForce GO</div>
            <div class="venforce-title">LC / MC</div>
            <div class="venforce-subid">ID: ${id}</div>
          </div>
        </div>
      </div>

      <div class="venforce-grid">
        <div class="venforce-col">
          <div class="venforce-row">Venda: ${moeda(dados.precoVenda)}</div>
          <div class="venforce-row">Preço cheio: ${moeda(extras.precoCheio || dados.precoVenda)}</div>
          <div class="venforce-row">Promoção: ${promoTexto}</div>
          <div class="venforce-row">Custo: ${moeda(dados.custo)}</div>
          <div class="venforce-row">Imposto: ${porcentagem(dados.impostoPct)}</div>
          <div class="venforce-row">Imposto R$: ${moeda(dados.impostoValor)}</div>
        </div>

        <div class="venforce-col">
          <div class="venforce-row">Frete: ${moeda(dados.frete)}</div>
          <div class="venforce-row">Comissão R$: ${moeda(dados.comissaoValor)}</div>
          <div class="venforce-row">Comissão: ${porcentagem(dados.comissaoPct)}</div>
          <div class="venforce-row">Taxa fixa: ${moeda(dados.taxaFixa)}</div>
          <div class="venforce-row ${lcClass}">LC: ${moeda(dados.lc)}</div>
          <div class="venforce-row ${mcClass}">MC %: ${porcentagem(dados.mc)}</div>
        </div>
      </div>

      <div class="venforce-sep"></div>

      <div class="venforce-bottom">
        <div>
          <div class="venforce-status ${status.classe}">${status.texto}</div>
          <div class="venforce-base-name">Base ativa: ${currentBaseId || "nenhuma"}</div>
        </div>

        <div class="venforce-metrics">
          <div class="venforce-metric-main ${lcClass}">${moeda(dados.lc)}</div>
          <div class="venforce-metric-sub ${mcClass}">MC %: ${porcentagem(dados.mc)}</div>
        </div>
      </div>
    `;
  }

  function limparBoxesObsoletos(chavesAtivas) {
    const overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) return;

    const boxes = Array.from(overlay.querySelectorAll("[data-venforce-key]"));
    for (const box of boxes) {
      const key = box.getAttribute("data-venforce-key");
      if (!chavesAtivas.has(key)) {
        box.remove();
      }
    }
  }

  function posicionarBox(row, box, usedSlots = []) {
    const rowRect = row.getBoundingClientRect();
    const boxWidth = getCurrentBoxWidth(row);

    box.style.width = `${boxWidth}px`;

    const desiredHeight = getDesiredBoxHeight(row, box);
    box.style.height = `${desiredHeight}px`;
    box.style.minHeight = `${desiredHeight}px`;
    box.style.maxHeight = `${desiredHeight}px`;

    const gap = isShopee()
      ? CARD_GAP_FROM_ROW_SHOPEE
      : (isMlLayout2Row(row) ? CARD_GAP_FROM_ROW_ML_LAYOUT2 : CARD_GAP_FROM_ROW_ML);

    let left = window.scrollX + rowRect.right + gap;
    const maxLeft = window.scrollX + window.innerWidth - boxWidth - VIEWPORT_RIGHT_GAP;

    if (left > maxLeft) {
      left = Math.max(window.scrollX + VIEWPORT_RIGHT_GAP, maxLeft);
    }

    let top = getRowAnchorTop(row, desiredHeight);

    const minGap = isShopee()
      ? MIN_VERTICAL_GAP
      : (isMlLayout2Row(row) ? MIN_VERTICAL_GAP_ML_LAYOUT2 : MIN_VERTICAL_GAP);

    for (const slot of usedSlots) {
      const horizontalOverlap = !(left + boxWidth < slot.left || left > slot.left + slot.width);
      const verticalOverlap = !(top + desiredHeight < slot.top || top > slot.top + slot.height);

      if (horizontalOverlap && verticalOverlap) {
        top = slot.top + slot.height + minGap;
      }
    }

    box.style.left = `${left}px`;
    box.style.top = `${top}px`;

    usedSlots.push({
      left,
      top,
      width: boxWidth,
      height: desiredHeight
    });
  }

  function processarRowMercadoLivre(row, index, usedSlots, chavesAtivas) {
    const id = isMercadoLivreDetailPage()
      ? (extrairIdDetalheML(row) || extrairIdPainel(row))
      : extrairIdPainel(row);

    const key = getBoxKey(row, index);
    chavesAtivas.add(key);

    const box = ensureBox(key, row);

    if (!id) {
      renderErroExtracao(box, "não encontrado", "ID não localizado", row);
      posicionarBox(row, box, usedSlots);
      return;
    }

    const custoEncontrado = buscarCustoPorChaves([
      id,
      `MLB${id}`,
      `mlb${id}`
    ]);

    if (!custoEncontrado?.value) {
      renderSemCusto(box, id, row);
      posicionarBox(row, box, usedSlots);
      return;
    }

    const precoInfo = extrairPrecoVenda(row);
    if (!precoInfo?.precoVenda || precoInfo.precoVenda <= 0) {
      renderErroExtracao(box, id, "Preço de venda não identificado", row);
      posicionarBox(row, box, usedSlots);
      return;
    }

    const comissaoInfo = extrairComissaoInfo(row, precoInfo.precoVenda);
    const frete = extrairFrete(row);

    const dados = calcular(
      precoInfo.precoVenda,
      custoEncontrado.value,
      comissaoInfo,
      frete
    );

    renderBox(
      box,
      id,
      dados,
      {
        precoCheio: precoInfo.precoCheio || precoInfo.precoVenda || 0,
        precoPromocional: precoInfo.precoPromocional || 0
      },
      row
    );

    posicionarBox(row, box, usedSlots);
  }

  function processarRowShopee(row, index, usedSlots, chavesAtivas) {
    const ids = extrairIdentificadoresShopee(row);
    const idExibicao = ids.modelId || ids.skuVariacao || ids.skuPrincipal || ids.itemId || "não encontrado";
    const key = getBoxKey(row, index);

    chavesAtivas.add(key);

    const box = ensureBox(key, row);

    const custoEncontrado = buscarCustoPorChaves([
      ids.modelId,
      ids.itemId,
      ids.skuVariacao,
      ids.skuPrincipal
    ].filter(Boolean));

    if (!custoEncontrado?.value) {
      renderSemCusto(box, idExibicao, row);
      posicionarBox(row, box, usedSlots);
      return;
    }

    const precoInfo = extrairPrecoShopee(row);
    if (!precoInfo?.precoVenda || precoInfo.precoVenda <= 0) {
      debugExtracaoShopee(row, {
        motivo: "Preço Shopee não identificado",
        modelId: ids.modelId,
        itemId: ids.itemId,
        skuPrincipal: ids.skuPrincipal,
        skuVariacao: ids.skuVariacao
      });
      renderErroExtracao(box, idExibicao, "Preço Shopee não identificado", row);
      posicionarBox(row, box, usedSlots);
      return;
    }

    const comissaoInfo = calcularComissaoShopee(precoInfo.precoVenda);

    const dados = calcular(
      precoInfo.precoVenda,
      custoEncontrado.value,
      comissaoInfo,
      0
    );

    renderBox(
      box,
      idExibicao,
      dados,
      {
        precoCheio: precoInfo.precoCheio || precoInfo.precoVenda || 0,
        precoPromocional: precoInfo.precoPromocional || 0
      },
      row
    );

    posicionarBox(row, box, usedSlots);
  }

  function scanPage() {
    try {
      syncOverlaySize();
  
      const rows = isShopee()
        ? getShopeeRows()
        : (isMercadoLivreDetailPage()
            ? [getMercadoLivreDetailContainer()].filter(Boolean)
            : getPainelRows());
  
      console.log("[VenForce GO] scanPage", {
        host: location.hostname,
        isShopee: isShopee(),
        isMercadoLivre: isMercadoLivre(),
        isMercadoLivreDetailPage: isMercadoLivreDetailPage(),
        rowsEncontradas: rows.length
      });
  
      const usedSlots = [];
      const chavesAtivas = new Set();
  
      rows.forEach((row, index) => {
        if (!row) return;
  
        if (isShopee()) {
          processarRowShopee(row, index, usedSlots, chavesAtivas);
        } else {
          processarRowMercadoLivre(row, index, usedSlots, chavesAtivas);
        }
      });
  
      limparBoxesObsoletos(chavesAtivas);
    } catch (error) {
      console.error("[VenForce GO] erro ao escanear página:", error);
    }
  }

  function scheduleScan() {
    if (scheduled) return;
    scheduled = true;

    requestAnimationFrame(() => {
      scheduled = false;
      scanPage();
    });
  }

  async function boot() {
    injectStyles();
    ensureOverlay();
    syncOverlaySize();

    await loadCosts();
    scheduleScan();

    setTimeout(() => scheduleScan(), 500);
    setTimeout(() => scheduleScan(), 1500);
    setTimeout(() => scheduleScan(), 3000);

    const observer = new MutationObserver(() => {
      scheduleScan();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false
    });

    window.addEventListener("scroll", scheduleScan, { passive: true });
    window.addEventListener("resize", () => {
      syncOverlaySize();
      scheduleScan();
    });

    if (chrome?.storage?.onChanged) {
      chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName !== "local") return;

        const chavesRelevantes = [
          "baseAtiva",
          "baseSelecionada",
          "baseSelecionadaLabel",
          "venforce_email",
          "venforce_user",
          "email",
          "user",
          "token",
          "venforceToken",
          "venforceUser",
          "apiBaseUrl"
        ];

        const alterou = chavesRelevantes.some((chave) => Object.prototype.hasOwnProperty.call(changes, chave));
        if (!alterou) return;

        currentApiBase = null;

        loadCosts().then(() => {
          clearAllBoxes();
          scheduleScan();
        });
      });
    }
  }

  boot();
})();