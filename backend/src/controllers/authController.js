const jwt = require("jsonwebtoken");
const Usuario = require("../models/Usuario");
const { ehAdministradorPermitido, ehUsuarioSomenteDestinatario, normalizarEmail } = require("../config/usuariosPermitidos");

function gerarToken(usuario, manterConectado = false) {
  return jwt.sign(
    { id: usuario._id, email: normalizarEmail(usuario.email), perfil: usuario.perfil },
    process.env.JWT_SECRET,
    { expiresIn: manterConectado ? "30d" : process.env.JWT_EXPIRES_IN || "8h" }
  );
}

const AuthController = {
  async registrar(req, res) {
    try {
      const { nome, email, senha, perfil, manterConectado } = req.body;

      if (!nome || !email || !senha) {
        return res
          .status(400)
          .json({ erro: "Nome, email e senha são obrigatórios" });
      }

      const usuarioExistente = await Usuario.findOne({ email });
      if (usuarioExistente) {
        return res.status(409).json({ erro: "Este email já está cadastrado" });
      }

      // Por segurança, só permite criar admin/tecnico se quem estiver
      // chamando essa rota já for um admin autenticado (req.usuario).
      // EXCEÇÃO: se o email for o ADMIN_EMAIL configurado, define como admin.
      let perfilFinal = ehUsuarioSomenteDestinatario(email)
        ? "usuario"
        : ehAdministradorPermitido(email)
        ? "admin"
        : "usuario";

      if (
        !ehUsuarioSomenteDestinatario(email) &&
        !ehAdministradorPermitido(email) &&
        perfil &&
        ["tecnico", "admin"].includes(perfil) &&
        req.usuario &&
        req.usuario.perfil === "admin"
      ) {
        perfilFinal = perfil;
      }

      const usuario = await Usuario.create({
        nome,
        email,
        senha,
        perfil: perfilFinal,
      });

      if (ehUsuarioSomenteDestinatario(usuario.email) && usuario.perfil !== "usuario") {
        usuario.perfil = "usuario";
        await usuario.save();
      } else if (ehAdministradorPermitido(usuario.email) && usuario.perfil !== "admin") {
        usuario.perfil = "admin";
        await usuario.save();
      }

      const token = gerarToken(usuario, manterConectado === true);

      res.status(201).json({
        usuario: {
          id: usuario._id,
          nome: usuario.nome,
          email: usuario.email,
          perfil: usuario.perfil,
        },
        token,
      });
    } catch (erro) {
      res.status(500).json({ erro: "Erro ao registrar usuário", detalhe: erro.message });
    }
  },

  async listarUsuarios(req, res) {
    try {
      const usuarios = await Usuario.find()
        .select("nome email perfil")
        .sort({ nome: 1, email: 1 });
      res.json(usuarios);
    } catch (erro) {
      res.status(500).json({ erro: "Erro ao listar usuários", detalhe: erro.message });
    }
  },

  async login(req, res) {
    try {
      const { email, senha, manterConectado } = req.body;

      if (!email || !senha) {
        return res.status(400).json({ erro: "Email e senha são obrigatórios" });
      }

      const usuario = await Usuario.findOne({ email }).select("+senha");
      if (!usuario) {
        return res.status(401).json({ erro: "Email ou senha inválidos" });
      }

      const senhaValida = await usuario.compararSenha(senha);
      if (!senhaValida) {
        return res.status(401).json({ erro: "Email ou senha inválidos" });
      }

      if (ehUsuarioSomenteDestinatario(usuario.email) && usuario.perfil !== "usuario") {
        usuario.perfil = "usuario";
        await usuario.save();
      } else if (ehAdministradorPermitido(usuario.email) && usuario.perfil !== "admin") {
        usuario.perfil = "admin";
        await usuario.save();
      }

      const token = gerarToken(usuario, manterConectado === true);

      res.json({
        usuario: {
          id: usuario._id,
          nome: usuario.nome,
          email: usuario.email,
          perfil: usuario.perfil,
        },
        token,
      });
    } catch (erro) {
      res.status(500).json({ erro: "Erro ao fazer login", detalhe: erro.message });
    }
  },
};

module.exports = AuthController;
