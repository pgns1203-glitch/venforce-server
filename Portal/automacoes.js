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

function setStatus(msg, color) {
  const el = document.getElementById("automacoes-status");
  if (!el) return;
  el.textContent = msg || "";
  el.style.color = color || "var(--vf-text-m)";
  el.style.display = msg ? "block" : "none";
}

function escapeHTML(s) {
  const d = document.createElement("div");
  d.textContent = s == null ? "" : String(s);
  return d.innerHTML;
}

function setClientesOptions(select, clientes) {
  if (!select) return;
  select.innerHTML = "";
  select.appendChild(new Option("Selecione um cliente…", ""));

  (Array.isArray(clientes) ? clientes : []).forEach((c) => {
    const slug = c.slug || "";
    const nome = c.nome || slug || "—";
    const opt = new Option(`${nome} (${slug})`, slug);
    select.appendChild(opt);
  });
}

async function loadClientes() {
  if (!TOKEN) return;

  const select = document.getElementById("automacoes-cliente");
  if (select) {
    select.disabled = true;
    select.innerHTML = `<option value="">Carregando...</option>`;
  }

  setStatus("", "");

  try {
    const res = await fetch(`${API_BASE}/clientes`, {
      headers: { Authorization: "Bearer " + TOKEN }
    });

    if (res.status === 401) { clearSession(); return; }
    if (res.status === 403) { window.location.replace("dashboard.html"); return; }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json().catch(() => ({}));
    const clientes = Array.isArray(data.clientes) ? data.clientes : (Array.isArray(data) ? data : []);

    setClientesOptions(select, clientes);
    if (select) select.disabled = false;

    if (!clientes.length) {
      setStatus("Nenhum cliente encontrado.", "var(--vf-text-m)");
    }
  } catch (err) {
    if (select) {
      select.disabled = true;
      select.innerHTML = `<option value="">Erro ao carregar clientes</option>`;
    }
    setStatus("Não foi possível carregar os clientes. Tente novamente.", "var(--vf-danger)");
  }
}

document.getElementById("automacoes-cliente")?.addEventListener("change", (e) => {
  const slug = e.target.value || "";
  if (!slug) {
    setStatus("Selecione um cliente para preparar o contexto.", "var(--vf-text-m)");
    return;
  }
  setStatus(`Cliente selecionado: ${escapeHTML(slug)} (ações: em breve)`, "var(--vf-success)");
});

if (TOKEN) loadClientes();

