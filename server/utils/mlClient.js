// server/utils/mlClient.js
const pool = require("../config/database");

// TODO: mover getValidMlTokenByCliente para server/utils/mlToken.js
// Por enquanto importa direto do index via referência circular —
// para evitar circular, copie a função getValidMlTokenByCliente aqui por enquanto
// e deixe um comentário DUPLICATE: remover após extrair mlToken.js

const ML_CLIENT_ID     = process.env.ML_CLIENT_ID     || "";
const ML_CLIENT_SECRET = process.env.ML_CLIENT_SECRET || "";

// DUPLICATE: remover após extrair mlToken.js
async function getValidMlTokenByCliente(clienteId) {
  const result = await pool.query("SELECT * FROM ml_tokens WHERE cliente_id = $1", [clienteId]);
  const row = result.rows[0];
  if (!row) throw new Error("Cliente não possui token ML");

  const now = Date.now();
  const expiresAt = new Date(row.expires_at).getTime();
  const msLeft = expiresAt - now;
  const fiveMin = 5 * 60 * 1000;

  if (msLeft < fiveMin) {
    const tokenRes = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: ML_CLIENT_ID,
        client_secret: ML_CLIENT_SECRET,
        refresh_token: row.refresh_token
      })
    });
    const data = await tokenRes.json();
    if (!tokenRes.ok) throw new Error(data?.message || JSON.stringify(data));
    const { access_token, refresh_token, expires_in } = data;
    const newExpires = new Date(Date.now() + (expires_in || 0) * 1000);
    const newRefresh = refresh_token || row.refresh_token;
    await pool.query(
      `UPDATE ml_tokens SET access_token = $1, refresh_token = $2, expires_at = $3, updated_at = NOW()
       WHERE cliente_id = $4`,
      [access_token, newRefresh, newExpires, clienteId]
    );
    return access_token;
  }

  return row.access_token;
}

async function mlFetch(clienteId, path, options = {}) {
  const ML_API = "https://api.mercadolibre.com";

  async function doRequest(token) {
    return fetch(`${ML_API}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        Authorization: "Bearer " + token,
      },
    });
  }

  try {
    const token = await getValidMlTokenByCliente(clienteId);
    let res = await doRequest(token);

    if (res.status === 401) {
      console.warn(`[mlFetch] 401 em ${path} para clienteId ${clienteId} — forçando refresh`);
      await pool.query(
        "UPDATE ml_tokens SET expires_at = NOW() WHERE cliente_id = $1",
        [clienteId]
      );
      const freshToken = await getValidMlTokenByCliente(clienteId);
      res = await doRequest(freshToken);
    }

    let data;
    try { data = await res.json(); } catch { data = null; }

    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    console.error(`[mlFetch] erro — path: ${path} clienteId: ${clienteId} —`, err.message);
    throw err;
  }
}

module.exports = { mlFetch, getValidMlTokenByCliente };

/*
  USO NAS ROTAS (importar assim):
  const { mlFetch } = require("./utils/mlClient");

  // GET
  const { ok, status, data } = await mlFetch(clienteId, "/users/me");

  // POST
  const { ok, data } = await mlFetch(clienteId, "/items", {
    method: "POST",
    body: JSON.stringify({ title: "..." })
  });
*/

