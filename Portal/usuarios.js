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

const stateLoading = document.getElementById("state-loading");
const stateTable = document.getElementById("state-table");
const stateEmpty = document.getElementById("state-empty");
const stateError = document.getElementById("state-error");
const tbody = document.getElementById("usuarios-tbody");
const countBadge = document.getElementById("usuarios-count");

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
  countBadge.style.display = "none";
}
function showError(msg) {
  stateError.style.display = "block";
  stateLoading.style.display = stateTable.style.display = stateEmpty.style.display = "none";
  document.getElementById("error-message").textContent = msg;
  countBadge.style.display = "none";
}

async function loadUsuarios() {
  if (!TOKEN) return;
  showLoading();
  try {
    const res = await fetch(`${API_BASE}/usuarios`, {
      headers: { Authorization: "Bearer " + TOKEN }
    });
    if (res.status === 401) { clearSession(); return; }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json().catch(() => ({}));
    const lista = Array.isArray(data.usuarios) ? data.usuarios : (Array.isArray(data) ? data : []);
    renderUsuarios(lista);
  } catch (err) {
    showError("Não foi possível carregar os usuários. Tente novamente.");
  }
}

function roleBadge(role) {
  const isAdmin = role === "admin";
  const bg = isAdmin ? "#f4eef9" : "#f3f4f6";
  const color = isAdmin ? "#5a2a8f" : "var(--vf-text-m)";
  const label = isAdmin ? "admin" : "membro";
  return `<span style="display:inline-flex;align-items:center;padding:.25rem .6rem;border-radius:999px;border:1px solid var(--vf-border);background:${bg};color:${color};font-size:.75rem;font-weight:600;">${label}</span>`;
}

function statusBadge(ativo) {
  if (ativo) return `<span class="base-status--active">Ativo</span>`;
  return `<span style="display:inline-flex;align-items:center;gap:.4rem;font-size:.8125rem;font-weight:500;color:var(--vf-text-m);">
    <span style="width:6px;height:6px;border-radius:50%;background:#f59e0b;flex-shrink:0;"></span>
    Pendente
  </span>`;
}

function renderUsuarios(lista) {
  tbody.innerHTML = "";
  if (!lista.length) { showEmpty(); return; }

  countBadge.textContent = String(lista.length);
  countBadge.style.display = "inline-block";

  lista.forEach((u, i) => {
    const id = u.id ?? u._id ?? u.user_id ?? u.usuario_id;
    const nome = u.nome || "—";
    const email = u.email || "—";
    const role = u.role || "membro";
    const ativo = u.ativo === true;
    const createdAt = u.created_at || u.createdAt || u.criado_em || u.criadoEm;
    const createdTxt = createdAt ? new Date(createdAt).toLocaleDateString("pt-BR") : "—";

    const isSelf = (user && (user.id != null) && String(user.id) === String(id));

    const tr = document.createElement("tr");
    tr.classList.add("animate-fade-up");
    tr.style.animationDelay = `${i * 0.04}s`;

    const toggleLabel = ativo ? "Desativar" : "Ativar";
    const toggleStyle = ativo
      ? "background:var(--vf-bg);border:1px solid var(--vf-border);color:var(--vf-text-m);"
      : "background:#ecfdf5;border:1px solid rgba(4,120,87,.2);color:var(--vf-success);";

    tr.innerHTML = `
      <td style="color:var(--vf-text-l);font-family:var(--vf-mono);font-size:.8rem;">${String(i + 1).padStart(2, "0")}</td>
      <td><strong>${escapeHTML(nome)}</strong></td>
      <td style="color:var(--vf-text-m);">${escapeHTML(email)}</td>
      <td>${roleBadge(role)}</td>
      <td style="text-align:center;">${statusBadge(ativo)}</td>
      <td style="color:var(--vf-text-m);font-family:var(--vf-mono);font-size:.8rem;">${escapeHTML(createdTxt)}</td>
      <td style="text-align:center;">
        <div style="display:inline-flex;gap:8px;align-items:center;justify-content:center;flex-wrap:wrap;">
          <button type="button" data-action="toggle" data-id="${escapeHTML(id)}" data-ativo="${ativo ? "1" : "0"}"
            style="font-family:var(--vf-font);font-size:.8125rem;font-weight:600;border-radius:8px;padding:6px 10px;cursor:pointer;transition:all .15s;${toggleStyle}">
            ${toggleLabel}
          </button>
          <button type="button" class="vf-btn-danger-sm" data-action="delete" data-id="${escapeHTML(id)}" ${isSelf ? "disabled" : ""}>
            Remover
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('button[data-action="toggle"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const ativoAtual = btn.getAttribute("data-ativo") === "1";
      toggleAtivo(id, ativoAtual, btn);
    });
  });

  tbody.querySelectorAll('button[data-action="delete"]').forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      if (!id) return;
      if (user && user.id != null && String(user.id) === String(id)) return;
      if (confirm("Remover este usuário?")) deleteUsuario(id, btn);
    });
  });

  showTable();
}

async function toggleAtivo(id, ativoAtual, btn) {
  btn.disabled = true;
  const old = btn.textContent;
  btn.textContent = "Salvando…";
  try {
    const res = await fetch(`${API_BASE}/usuarios/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + TOKEN
      },
      body: JSON.stringify({ ativo: !ativoAtual })
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) { clearSession(); return; }
    if (!res.ok) throw new Error(data.erro || `HTTP ${res.status}`);
    loadUsuarios();
  } catch (err) {
    alert("Erro: " + err.message);
    btn.disabled = false;
    btn.textContent = old;
  }
}

async function deleteUsuario(id, btn) {
  if (user && user.id != null && String(user.id) === String(id)) return;
  btn.disabled = true;
  btn.textContent = "Removendo…";
  try {
    const res = await fetch(`${API_BASE}/usuarios/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer " + TOKEN }
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) { clearSession(); return; }
    if (!res.ok) throw new Error(data.erro || `HTTP ${res.status}`);
    loadUsuarios();
  } catch (err) {
    alert("Erro ao remover: " + err.message);
    btn.disabled = false;
    btn.textContent = "Remover";
  }
}

document.getElementById("btn-retry").addEventListener("click", loadUsuarios);

if (TOKEN) loadUsuarios();

