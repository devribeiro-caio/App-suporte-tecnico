const jwt = require("jsonwebtoken");
const Usuario = require("../models/Usuario");
const { ehAdministradorPermitido } = require("../config/usuariosPermitidos");

function gerarToken(usuario) {
  return jwt.sign(
    { id: usuario._id, perfil: usuario.perfil },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" }
  );
}

const AuthController = {
  async registrar(req, res) {
    try {
      const { nome, email, senha, perfil } = req.body;

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
      let perfilFinal = ehAdministradorPermitido(email) ? "admin" : "usuario";

      if (
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

      if (ehAdministradorPermitido(usuario.email) && usuario.perfil !== "admin") {
        usuario.perfil = "admin";
        await usuario.save();
      }

      const token = gerarToken(usuario);

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

  async login(req, res) {
    try {
      const { email, senha } = req.body;

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

      if (ehAdministradorPermitido(usuario.email) && usuario.perfil !== "admin") {
        usuario.perfil = "admin";
        await usuario.save();
      }

      const token = gerarToken(usuario);

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
