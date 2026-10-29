const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Usuario = require("../models/Usuario");
const { normalizarEmail } = require("./usuariosPermitidos");

let io = null;

function setupSocket(server) {
  if (io) {
    console.log("[Socket.io] Já inicializado, reutilizando.");
    return io;
  }

  io = new Server(server, {
    cors: {
      origin: "*", // Aceita qualquer origem (essencial para Electron com file://)
      methods: ["GET", "POST"],
      credentials: true,
    },
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      console.log("[Socket] Conexão rejeitada: token ausente");
      return next(new Error("Não autenticado"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      let email = normalizarEmail(decoded.email);
      let perfil = decoded.perfil;
      if (!email) {
        const usuarioAtual = await Usuario.findById(decoded.id).select("email").lean();
        email = normalizarEmail(usuarioAtual?.email);
      }
      if (ehUsuarioSomenteDestinatario(email)) {
        if (perfil !== "usuario") {
          await Usuario.updateOne({ _id: decoded.id }, { $set: { perfil: "usuario" } });
        }
        perfil = "usuario";
      }
      socket.usuario = {
        id: decoded.id,
        nome: decoded.nome,
        email,
        perfil,
      };
      console.log(`[Socket] Auth OK para: ${decoded.nome || decoded.id} (${perfil})`);
      next();
    } catch (err) {
      console.log("[Socket] Auth falhou:", err.message);
      next(new Error("Token inválido"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] Cliente conectado: ${socket.usuario.nome || socket.usuario.id} (${socket.usuario.perfil}) — Socket ID: ${socket.id}`);
    socket.join(`usuario:${socket.usuario.id}`);
    if (["admin", "tecnico"].includes(socket.usuario.perfil)) {
      socket.join("equipe:suporte");
    }

    socket.on("disconnect", () => {
      console.log(`[Socket] Cliente desconectado: ${socket.usuario.id}`);
    });

    socket.on("error", (err) => {
      console.error(`[Socket] Erro no cliente ${socket.usuario.id}:`, err.message);
    });
  });

  io.emit("debug:server-ready", { timestamp: Date.now() });

  console.log("[Socket.io] Configurado com sucesso.");
  return io;
}

function getIO() {
  if (!io) {
    throw new Error("Socket.io não inicializado. Chame setupSocket(server) primeiro.");
  }
  return io;
}

function emitirChamado(evento, chamado, dados = chamado) {
  const salas = new Set(["equipe:suporte"]);
  const idDe = (participante) => {
    if (!participante) return null;
    return String(participante._id || participante.id || participante);
  };

  for (const participante of [chamado?.solicitante, chamado?.destinatario]) {
    const id = idDe(participante);
    if (id) salas.add(`usuario:${id}`);
  }

  getIO().to([...salas]).emit(evento, dados);
}

function emitirNovaReuniao(reuniao) {
  if (!io || !reuniao) return;
  const idDoCriador = String(reuniao.criadoPor?._id || reuniao.criadoPor?.id || reuniao.criadoPor || "");
  const salas = new Set();
  for (const participante of reuniao.participantes || []) {
    const id = String(participante?._id || participante?.id || participante || "");
    if (id && id !== idDoCriador) salas.add(`usuario:${id}`);
  }
  if (salas.size) io.to([...salas]).emit("reuniao-criada", reuniao);
}

module.exports = { setupSocket, getIO, emitirChamado, emitirNovaReuniao };
