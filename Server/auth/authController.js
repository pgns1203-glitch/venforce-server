const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const usersFile = path.join(__dirname, "..", "data", "users.json");

function readUsers() {
  try {
    if (!fs.existsSync(usersFile)) {
      return [];
    }

    const raw = fs.readFileSync(usersFile, "utf8");
    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Erro ao ler users.json:", error);
    return [];
  }
}

function generateToken(user) {
  const secret = process.env.JWT_SECRET || "venforce_secret_local";

  return jwt.sign(
    {
      id: user.id,
      nome: user.nome,
      email: user.email,
      role: user.role || "user",
      bases_permitidas: Array.isArray(user.bases_permitidas)
        ? user.bases_permitidas
        : []
    },
    secret,
    { expiresIn: "7d" }
  );
}

async function login(req, res) {
  try {
    const { email, senha, password } = req.body || {};
    const senhaRecebida = senha || password || "";

    if (!email || !senhaRecebida) {
      return res.status(400).json({
        ok: false,
        erro: "Email e senha são obrigatórios"
      });
    }

    const users = readUsers();

    const user = users.find(
      (item) =>
        String(item.email || "").trim().toLowerCase() ===
        String(email).trim().toLowerCase()
    );

    if (!user) {
      return res.status(401).json({
        ok: false,
        erro: "Usuário não encontrado"
      });
    }

    if (user.ativo === false) {
      return res.status(403).json({
        ok: false,
        erro: "Usuário inativo"
      });
    }

    let senhaValida = false;

    if (user.senha) {
      const senhaSalva = String(user.senha);

      if (
        senhaSalva.startsWith("$2a$") ||
        senhaSalva.startsWith("$2b$") ||
        senhaSalva.startsWith("$2y$")
      ) {
        senhaValida = await bcrypt.compare(String(senhaRecebida), senhaSalva);
      } else {
        senhaValida = senhaSalva === String(senhaRecebida);
      }
    }

    if (!senhaValida) {
      return res.status(401).json({
        ok: false,
        erro: "Senha inválida"
      });
    }

    const token = generateToken(user);

    return res.json({
      ok: true,
      token,
      usuario: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role || "user",
        bases_permitidas: Array.isArray(user.bases_permitidas)
          ? user.bases_permitidas
          : []
      }
    });
  } catch (error) {
    console.error("Erro no login:", error);
    return res.status(500).json({
      ok: false,
      erro: "Erro interno no login"
    });
  }
}

function me(req, res) {
  try {
    return res.json({
      ok: true,
      usuario: {
        id: req.user.id,
        nome: req.user.nome,
        email: req.user.email,
        role: req.user.role || "user",
        bases_permitidas: Array.isArray(req.user.bases_permitidas)
          ? req.user.bases_permitidas
          : []
      }
    });
  } catch (error) {
    console.error("Erro no /auth/me:", error);
    return res.status(500).json({
      ok: false,
      erro: "Erro ao validar sessão"
    });
  }
}

module.exports = {
  login,
  me
};