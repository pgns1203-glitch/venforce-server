const STORAGE_KEY = "vf-token";
const API_BASE = "https://venforce-server.onrender.com";

function getToken() {
  const t = localStorage.getItem(STORAGE_KEY);
  if (!t) { window.location.replace("index.html"); return null; }
  return t;
}
const TOKEN = getToken();

const user = JSON.parse(localStorage.getItem("vf-user") || "{}");
if (user.role !== "admin") window.location.replace("dashboard.html");
initLayout();

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("vf-user");
  window.location.replace("index.html");
}

function escapeHTML(s) {
  const d = document.createElement("div");
  d.textContent = s == null ? "" : String(s);
  return d.innerHTML;
}

function maskToken(tok) {
  const s = String(tok || "");
  if (!s) return "—";
  return `${s.slice(0, 12)}••••••••`;
}

function expiryBadgeInfo(expiresAtRaw) {
  const expMs = new Date(expiresAtRaw).getTime();
  if (Number.isNaN(expMs)) {
    return { label: "—", html: `<span style="color:var(--vf-text-m);font-size:.8125rem;">—</span>` };
  }
  const now = Date.now();
  const fiveMin = 5 * 60 * 1000;
  if (expMs < now) {
    return {
      label: "Expirado",
      html: `<div style="display:flex;flex-direction:column;gap:4px;align-items:flex-start;">
        <span style="display:inline-flex;align-items:center;padding:.25rem .55rem;border-radius:999px;background:#fef0f0;color:#c62828;font-size:.75rem;font-weight:700;">Expirado</span>
        <span style="font-size:.8125rem;color:var(--vf-text-m);">${escapeHTML(new Date(expiresAtRaw).toLocaleString("pt-BR"))}</span>
      </div>`
    };
  }
  if (expMs - now < fiveMin) {
    return {
      label: "Expirando",
      html: `<div style="display:flex;flex-direction:column;gap:4px;align-items:flex-start;">
        <span style="display:inline-flex;align-items:center;padding:.25rem .55rem;border-radius:999px;background:#fffbea;color:#8a5c00;font-size:.75rem;font-weight:700;">Expirando</span>
        <span style="font-size:.8125rem;color:var(--vf-text-m);">${escapeHTML(new Date(expiresAtRaw).toLocaleString("pt-BR"))}</span>
      </div>`
    };
  }
  return {
    label: "Válido",
    html: `<div style="display:flex;flex-direction:column;gap:4px;align-items:flex-start;">
      <span style="display:inline-flex;align-items:center;padding:.25rem .55rem;border-radius:999px;background:#e8f8ee;color:#1a7a42;font-size:.75rem;font-weight:700;">Válido</span>
      <span style="font-size:.8125rem;color:var(--vf-text-m);">${escapeHTML(new Date(expiresAtRaw).toLocaleString("pt-BR"))}</span>
    </div>`
  };
}

const stateLoading = document.getElementById("state-loading");
const stateTable = document.getElementById("state-table");
const stateEmpty = document.getElementById("state-empty");
const stateError = document.getElementById("state-error");
const tokensCount = document.getElementById("tokens-count");
const tokensTbody = document.getElementById("tokens-tbody");

function showLoading() {
  stateLoading.style.display = "flex";
  stateTable.style.display = stateEmpty.style.display = stateError.style.display = "none";
}
function showTable() {
  stateTable.style.display = "block";
  stateLoading.style.display = stateEmpty.style.display = stateError.style.display = "none";
}
function showEmpty() {
  stateEmpty.style.display = "block";
  stateLoading.style.display = stateTable.style.display = stateError.style.display = "none";
  tokensCount.style.display = "none";
}
function showError(msg) {
  stateError.style.display = "block";
  stateLoading.style.display = stateTable.style.display = stateEmpty.style.display = "none";
  document.getElementById("error-message").textContent = msg;
  tokensCount.style.display = "none";
}

const copyBtnStyle =
  "display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:8px;border:1px solid var(--vf-border);background:var(--vf-bg);color:var(--vf-text-m);cursor:pointer;";

function bindCopyButtons(root) {
  root.querySelectorAll('button[data-action="copy-token"]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      const value = btn.getAttribute("data-token") || "";
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        const old = btn.innerHTML;
        btn.innerHTML = `<span style="font-size:.75rem;font-weight:600;color:var(--vf-success);">Copiado!</span>`;
        btn.style.borderColor = "rgba(4,120,87,.25)";
        btn.style.background = "#f0fdf4";
        setTimeout(() => {
          btn.innerHTML = old;
          btn.style.borderColor = "var(--vf-border)";
          btn.style.background = "var(--vf-bg)";
        }, 1000);
      } catch {
        alert("Não foi possível copiar.");
      }
    });
  });
}

function tokenCellHtml(masked, fullToken) {
  return `
    <div style="display:flex;align-items:center;gap:8px;justify-content:space-between;">
      <span style="font-family:var(--vf-mono);font-size:.75rem;color:var(--vf-text-m);word-break:break-all;">${escapeHTML(masked)}</span>
      <button type="button" data-action="copy-token" data-token="${escapeHTML(fullToken)}"
        title="Copiar token completo"
        style="${copyBtnStyle}">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      </button>
    </div>
  `;
}

async function loadMlTokens() {
  if (!TOKEN) return;
  showLoading();
  try {
    const res = await fetch(`${API_BASE}/admin/ml-tokens`, {
      headers: { Authorization: "Bearer " + TOKEN }
    });
    if (res.status === 401) { clearSession(); return; }
    if (res.status === 403) { window.location.replace("dashboard.html"); return; }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json().catch(() => ({}));
    const tokens = Array.isArray(data.tokens) ? data.tokens : [];
    renderTokens(tokens);
  } catch (err) {
    showError("Não foi possível carregar os tokens. Tente novamente.");
  }
}

function renderTokens(tokens) {
  tokensTbody.innerHTML = "";
  if (!tokens.length) { showEmpty(); return; }

  tokensCount.textContent = String(tokens.length);
  tokensCount.style.display = "inline-block";

  tokens.forEach((row, i) => {
    const access = row.access_token || "";
    const refresh = row.refresh_token || "";
    const expHtml = expiryBadgeInfo(row.expires_at).html;
    const updatedAt = row.updated_at ? new Date(row.updated_at).toLocaleString("pt-BR") : "—";

    const tr = document.createElement("tr");
    tr.classList.add("animate-fade-up");
    tr.style.animationDelay = `${i * 0.03}s`;
    tr.innerHTML = `
      <td style="color:var(--vf-text-l);font-family:var(--vf-mono);font-size:.8rem;">${String(i + 1).padStart(2, "0")}</td>
      <td><strong>${escapeHTML(row.cliente_nome || "—")}</strong></td>
      <td style="color:var(--vf-text-m);font-size:.875rem;font-family:var(--vf-mono);">${escapeHTML(row.cliente_slug || "—")}</td>
      <td style="font-family:var(--vf-mono);font-size:.8rem;color:var(--vf-text-m);">${escapeHTML(String(row.ml_user_id ?? "—"))}</td>
      <td>${tokenCellHtml(maskToken(access), access)}</td>
      <td>${tokenCellHtml(maskToken(refresh), refresh)}</td>
      <td>${expHtml}</td>
      <td style="color:var(--vf-text-m);font-size:.8125rem;">${escapeHTML(updatedAt)}</td>
    `;
    tokensTbody.appendChild(tr);
  });

  bindCopyButtons(tokensTbody);
  showTable();
}

document.getElementById("btn-recarregar").addEventListener("click", loadMlTokens);
document.getElementById("btn-retry").addEventListener("click", loadMlTokens);

if (TOKEN) loadMlTokens();
