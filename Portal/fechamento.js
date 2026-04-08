const STORAGE_KEY = "vf-token";
const API_BASE = "https://venforce-server.onrender.com";
initLayout();

function getToken() {
  const t = localStorage.getItem(STORAGE_KEY);
  if (!t) { window.location.replace("index.html"); return null; }
  return t;
}
const TOKEN = getToken();

function setStatus(msg, color) {
  const el = document.getElementById("fechamento-status");
  el.textContent = msg || "";
  el.style.color = color || "var(--vf-text-m)";
  el.style.display = msg ? "block" : "none";
}

function setLoading(on) {
  const btn = document.getElementById("btn-processar");
  btn.disabled = !!on;
  btn.textContent = on ? "Processando..." : "Processar fechamento";
}

const inputArquivo = document.getElementById("fechamento-arquivo");
const btnProcessar = document.getElementById("btn-processar");
const resultadoEl = document.getElementById("fechamento-resultado");

// Label do arquivo (mesmo padrão do dashboard)
inputArquivo.addEventListener("change", (e) => {
  const f = e.target.files?.[0];
  const labelText = document.getElementById("file-label-fechamento-text");
  const label = document.getElementById("file-label-fechamento");
  if (labelText) labelText.textContent = f ? f.name : "Escolher arquivo…";
  if (label) label.classList.toggle("has-file", !!f);
});

function renderResultado(data) {
  const json = JSON.stringify(data ?? {}, null, 2);
  resultadoEl.innerHTML = `
    <div class="vf-card">
      <div class="vf-card-header">
        <h5>Resultado</h5>
      </div>
      <div style="padding:1.25rem 1.5rem;">
        <pre style="margin:0;white-space:pre-wrap;word-break:break-word;font-family:var(--vf-mono);font-size:.85rem;color:var(--vf-text-m);background:#0b1220;border:1px solid rgba(148,163,184,.2);border-radius:12px;padding:12px;">${json}</pre>
      </div>
    </div>
  `;
}

btnProcessar.addEventListener("click", async () => {
  if (!TOKEN) return;

  const arquivo = inputArquivo.files?.[0];
  setStatus("", "");
  resultadoEl.innerHTML = "";

  if (!arquivo) {
    setStatus("Selecione um arquivo .xlsx.", "var(--vf-danger)");
    return;
  }

  setLoading(true);
  setStatus("Processando...", "var(--vf-text-m)");

  try {
    const formData = new FormData();
    formData.append("file", arquivo);

    const res = await fetch(`${API_BASE}/fechamentos/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}` },
      body: formData
    });

    if (res.status === 401) { window.location.replace("index.html"); return; }

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.erro || data.message || `HTTP ${res.status}`);

    setStatus("✓ Processado com sucesso.", "var(--vf-success)");
    renderResultado(data);
  } catch (err) {
    setStatus("Erro: " + (err?.message || "Falha ao processar."), "var(--vf-danger)");
  } finally {
    setLoading(false);
  }
});

