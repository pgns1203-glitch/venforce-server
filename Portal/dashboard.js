const STORAGE_KEY = "vf-token";
const API_BASE    = "https://venforce-server.onrender.com";
initLayout();

// ─── Sessão ───
function getToken() {
  const t = localStorage.getItem(STORAGE_KEY);
  if (!t) { window.location.replace("index.html"); return null; }
  return t;
}
const TOKEN = getToken();

function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem("vf-user");
  window.location.replace("index.html");
}

// ─── Helpers ───
function escapeHTML(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

function setImportStatus(msg, color) {
  const el = document.getElementById("import-status");
  el.textContent    = msg;
  el.style.color    = color || "var(--vf-text-m)";
  el.style.display  = msg ? "block" : "none";
}

function setImportLoading(on) {
  document.getElementById("btn-importar").disabled             = on;
  document.getElementById("btn-importar-text").textContent     = on ? "Processando…" : "Pré-visualizar";
  document.getElementById("btn-importar-spinner").style.display = on ? "inline-block" : "none";
}

// ─── Estados da tabela de bases ───
const stateLoading = document.getElementById("state-loading");
const stateTable   = document.getElementById("state-table");
const stateEmpty   = document.getElementById("state-empty");
const stateError   = document.getElementById("state-error");
const basesCount   = document.getElementById("bases-count");
const basesTbody   = document.getElementById("bases-tbody");

function showLoading() {
  stateLoading.style.display = "flex";
  stateTable.style.display   = stateEmpty.style.display = stateError.style.display = "none";
}
function showTable() {
  stateTable.style.display   = "block";
  stateLoading.style.display = stateEmpty.style.display = stateError.style.display = "none";
}
function showEmpty() {
  stateEmpty.style.display   = "block";
  stateLoading.style.display = stateTable.style.display = stateError.style.display = "none";
  basesCount.style.display   = "none";
}
function showError(msg) {
  stateError.style.display   = "block";
  stateLoading.style.display = stateTable.style.display = stateEmpty.style.display = "none";
  document.getElementById("error-message").textContent = msg;
}

// ─── Carregar bases ───
async function loadBases() {
  if (!TOKEN) return;
  showLoading();
  try {
    const res = await fetch(`${API_BASE}/bases`, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (res.status === 401) { clearSession(); return; }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { bases } = await res.json();
    renderBases(Array.isArray(bases) ? bases : []);
  } catch (err) {
    showError("Não foi possível carregar as bases. Tente novamente.");
  }
}

function renderBases(bases) {
  basesTbody.innerHTML = "";
  if (!bases.length) { showEmpty(); return; }

  basesCount.textContent   = String(bases.length);
  basesCount.style.display = "inline-block";

  bases.forEach((base, i) => {
    const ativo = base.ativo !== false;
    const tr    = document.createElement("tr");
    tr.classList.add("animate-fade-up");
    tr.style.animationDelay = `${i * 0.04}s`;
    tr.innerHTML = `
      <td style="color:var(--vf-text-l);font-family:var(--vf-mono);font-size:.8rem;">${String(i+1).padStart(2,"0")}</td>
      <td><strong>${escapeHTML(base.nome || "—")}</strong></td>
      <td style="color:var(--vf-text-m);font-size:.875rem;font-family:var(--vf-mono);">${escapeHTML(base.slug || "—")}</td>
      <td style="text-align:center;">
        <span class="${ativo ? "base-status--active" : "base-status--inactive"}">${ativo ? "Ativa" : "Inativa"}</span>
      </td>
      <td style="text-align:center;">
        <button class="vf-btn-danger-sm" data-slug="${escapeHTML(base.slug)}" data-nome="${escapeHTML(base.nome || base.slug)}">Excluir</button>
      </td>`;
    basesTbody.appendChild(tr);
  });

  basesTbody.querySelectorAll(".vf-btn-danger-sm").forEach(btn => {
    btn.addEventListener("click", () => {
      const { slug, nome } = btn.dataset;
      if (confirm(`Excluir permanentemente a base "${nome}"?\n\nEsta ação não pode ser desfeita.`)) {
        deleteBase(slug, btn);
      }
    });
  });

  showTable();
}

async function deleteBase(slug, btn) {
  btn.disabled = true;
  btn.textContent = "Excluindo…";
  try {
    const res  = await fetch(`${API_BASE}/bases/${encodeURIComponent(slug)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    if (res.status === 401) { clearSession(); return; }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.erro || `HTTP ${res.status}`);
    loadBases();
  } catch (err) {
    alert("Erro ao excluir: " + err.message);
    btn.disabled    = false;
    btn.textContent = "Excluir";
  }
}

// ─── File input label ───
document.getElementById("import-arquivo").addEventListener("change", (e) => {
  const f = e.target.files?.[0];
  document.getElementById("file-label-text").textContent = f ? f.name : "Escolher arquivo…";
  document.getElementById("file-label").classList.toggle("has-file", !!f);
});

// ─── Preview ───
let pendingPreviewData = null; // guarda payload para confirmar depois

function openPreview(payload) {
  pendingPreviewData = payload;

  document.getElementById("preview-meta").textContent =
    `${payload.total} linhas · ${payload.idsDetectados} IDs válidos`;

  const tbody = document.getElementById("preview-tbody");
  tbody.innerHTML = "";
  (payload.preview || []).forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-family:var(--vf-mono);font-size:.8rem;">${escapeHTML(String(r.id ?? ""))}</td>
      <td style="text-align:right;">${r.custo_produto ?? 0}</td>
      <td style="text-align:right;">${r.imposto_percentual ?? 0}</td>
      <td style="text-align:right;">${r.taxa_fixa ?? 0}</td>`;
    tbody.appendChild(tr);
  });

  const overlay = document.getElementById("preview-overlay");
  overlay.style.display = "flex";
}

function closePreview() {
  document.getElementById("preview-overlay").style.display = "none";
  pendingPreviewData = null;
}

document.getElementById("preview-close").addEventListener("click",  closePreview);
document.getElementById("preview-cancel").addEventListener("click", closePreview);

// Fechar clicando fora do modal
document.getElementById("preview-overlay").addEventListener("click", (e) => {
  if (e.target === document.getElementById("preview-overlay")) closePreview();
});

// ─── Confirmar importação ───
document.getElementById("preview-confirm").addEventListener("click", async () => {
  const arquivo = document.getElementById("import-arquivo").files?.[0];
  const nome    = document.getElementById("import-nome").value.trim();
  if (!arquivo || !nome) { closePreview(); return; }

  document.getElementById("preview-confirm").disabled                 = true;
  document.getElementById("preview-confirm-text").textContent        = "Importando…";
  document.getElementById("preview-confirm-spinner").style.display   = "inline-block";

  try {
    const fd = new FormData();
    fd.append("arquivo", arquivo);
    fd.append("nomeBase", nome);
    fd.append("confirmar", "true");

    const res  = await fetch(`${API_BASE}/importar-base`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}` },
      body: fd
    });
    const data = await res.json().catch(() => ({}));

    if (res.status === 401) { clearSession(); return; }
    if (!res.ok) throw new Error(data.erro || `HTTP ${res.status}`);

    closePreview();
    setImportStatus(`✓ ${data.mensagem || "Importado com sucesso!"} (${data.total ?? 0} produtos)`, "var(--vf-success)");
    document.getElementById("import-nome").value    = "";
    document.getElementById("import-arquivo").value = "";
    document.getElementById("file-label-text").textContent = "Escolher arquivo…";
    document.getElementById("file-label").classList.remove("has-file");
    loadBases();

  } catch (err) {
    closePreview();
    setImportStatus("Erro ao importar: " + err.message, "var(--vf-danger)");
  } finally {
    document.getElementById("preview-confirm").disabled                 = false;
    document.getElementById("preview-confirm-text").textContent        = "Confirmar importação";
    document.getElementById("preview-confirm-spinner").style.display   = "none";
  }
});

// ─── Botão importar (pré-visualizar) ───
document.getElementById("btn-importar").addEventListener("click", async () => {
  const arquivo = document.getElementById("import-arquivo").files?.[0];
  const nome    = document.getElementById("import-nome").value.trim();

  setImportStatus("", "");
  if (!nome)    { setImportStatus("Informe o nome da base.", "var(--vf-danger)"); return; }
  if (!arquivo) { setImportStatus("Selecione um arquivo .xlsx ou .csv.", "var(--vf-danger)"); return; }

  setImportLoading(true);

  try {
    const fd = new FormData();
    fd.append("arquivo", arquivo);
    fd.append("nomeBase", nome);
    // sem "confirmar" → preview

    const res  = await fetch(`${API_BASE}/importar-base`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}` },
      body: fd
    });
    const data = await res.json().catch(() => ({}));

    if (res.status === 401) { clearSession(); return; }
    if (!res.ok) throw new Error(data.erro || `HTTP ${res.status}`);

    openPreview(data);

  } catch (err) {
    setImportStatus("Erro: " + err.message, "var(--vf-danger)");
  } finally {
    setImportLoading(false);
  }
});

// ─── Logout + Retry ───
document.getElementById("btn-retry").addEventListener("click", loadBases);

// ─── Init ───
if (TOKEN) loadBases();
