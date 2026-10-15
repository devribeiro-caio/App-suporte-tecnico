const jwt = require("jsonwebtoken");
const Usuario = require("../models/Usuario");
const {
  EMAIL_USUARIO_SOMENTE_DESTINATARIO,
  ehUsuarioSomenteDestinatario,
  normalizarEmail,
} = require("../config/usuariosPermitidos");

let idUsuarioSuportePromise = null;
const perfisSuporteSincronizados = new Set();

function obterIdUsuarioSuporte() {
  if (!idUsuarioSuportePromise) {
    idUsuarioSuportePromise = Usuario.findOne({ email: EMAIL_USUARIO_SOMENTE_DESTINATARIO })
      .select("_id")
      .lean()
      .then((usuario) => String(usuario?._id || ""))
      .catch((erro) => {
        idUsuarioSuportePromise = null;
        throw erro;
      });
  }
  return idUsuarioSuportePromise;
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ erro: "Token não fornecido" });
  }

  const [, token] = authHeader.split(" "); // formato: "Bearer <token>"

  if (!token) {
    return res.status(401).json({ erro: "Token mal formatado" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    Promise.resolve().then(async () => {
      let email = normalizarEmail(payload.email);
      let ehSuporteRestrito = ehUsuarioSomenteDestinatario(email);

      // Tokens antigos não carregam email. Resolve uma única vez o ID da conta
      // para corrigir também sessões que ainda declaram perfil admin.
      if (!email) {
        ehSuporteRestrito = (await obterIdUsuarioSuporte()) === String(payload.id);
      }

      if (ehSuporteRestrito) {
        const idUsuario = String(payload.id);
        if (!perfisSuporteSincronizados.has(idUsuario)) {
          await Usuario.updateOne(
            { _id: payload.id, perfil: { $ne: "usuario" } },
            { $set: { perfil: "usuario" } }
          );
          perfisSuporteSincronizados.add(idUsuario);
        }
        payload.email = EMAIL_USUARIO_SOMENTE_DESTINATARIO;
        payload.perfil = "usuario";
      }

      req.usuario = payload;
      next();
    }).catch((erro) => {
      console.error("[Auth] Não foi possível validar o perfil do usuário:", erro.message);
      res.status(500).json({ erro: "Erro ao validar o perfil do usuário" });
    });
  } catch (erro) {
    return res.status(401).json({ erro: "Token inválido ou expirado" });
  }
}

module.exports = authMiddleware;
