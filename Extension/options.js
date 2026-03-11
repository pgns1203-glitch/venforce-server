const API = "http://localhost:4127";

async function carregarBases() {
  try {

    const storage = await chrome.storage.local.get([
      "token",
      "baseSelecionada"
    ]);

    if (!storage.token) {
      alert("Você precisa estar logado na extensão.");
      return;
    }

    const res = await fetch(`${API}/bases`, {
      headers: {
        Authorization: `Bearer ${storage.token}`
      }
    });

    const json = await res.json();

    if (!json.ok) {
      alert(json.erro || "Erro ao carregar bases");
      return;
    }

    const bases = json.bases || [];

    const select = document.getElementById("bases");
    select.innerHTML = "";

    bases.forEach(base => {
      const option = document.createElement("option");
      option.value = base.id;
      option.textContent = base.nome;
      select.appendChild(option);
    });

    if (storage.baseSelecionada) {
      select.value = storage.baseSelecionada;
    }

  } catch (error) {
    console.error("Erro ao carregar bases:", error);
    alert("Erro ao carregar bases do servidor");
  }
}

document.getElementById("salvar").onclick = async () => {

  const base = document.getElementById("bases").value;

  await chrome.storage.local.set({
    baseSelecionada: base,
    baseAtiva: base
  });

  alert("Base salva com sucesso");

};

carregarBases();