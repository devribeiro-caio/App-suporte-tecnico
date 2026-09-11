const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

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

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      console.log("[Socket] Conexão rejeitada: token ausente");
      return next(new Error("Não autenticado"));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.usuario = {
        id: decoded.id,
        nome: decoded.nome,
        perfil: decoded.perfil,
      };
      console.log(`[Socket] Auth OK para: ${decoded.nome || decoded.id} (${decoded.perfil})`);
      next();
    } catch (err) {
      console.log("[Socket] Auth falhou:", err.message);
      next(new Error("Token inválido"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] Cliente conectado: ${socket.usuario.nome || socket.usuario.id} (${socket.usuario.perfil}) — Socket ID: ${socket.id}`);

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

module.exports = { setupSocket, getIO };

