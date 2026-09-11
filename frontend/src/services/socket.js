import { io } from "socket.io-client";

// Lógica para determinar o IP do servidor central
const getSocketUrl = () => {
  const savedIp = localStorage.getItem("SERVER_IP");
  
  if (savedIp && savedIp !== "127.0.0.1" && savedIp !== "localhost") {
    console.log("[Socket] Usando IP configurado:", savedIp);
    return `http://${savedIp}:3001`;
  }
  
  const DEFAULT_SERVER_IP = "127.0.0.1"; 
  console.log("[Socket] Nenhum IP salvo no localStorage. Usando padrão:", DEFAULT_SERVER_IP);
  return `http://${DEFAULT_SERVER_IP}:3001`;
};

let socket = null;

export function conectarSocket(token) {
  if (socket && socket.connected) {
    console.log("[Socket] Já conectado, reutilizando conexão.");
    return socket;
  }

  if (socket) {
    socket.disconnect();
  }

  const SOCKET_URL = getSocketUrl();
  console.log("[Socket] Tentando conectar em:", SOCKET_URL);

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
    forceNew: true,
  });

  socket.on("connect", () => {
    console.log("[Socket] Conectado com sucesso! ID:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("[Socket] Desconectado. Motivo:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("[Socket] Erro de conexão em " + SOCKET_URL + ":", err.message);
  });

  return socket;
}

export function desconectarSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    console.log("[Socket] Desconectado manualmente.");
  }
}

export function onNovoChamado(callback) {
  if (socket) {
    socket.on("novo-chamado", (data) => {
      console.log("[Socket] Novo chamado recebido:", data);
      callback(data);
    });
  }
}

export function onChamadoAtualizado(callback) {
  if (socket) {
    socket.on("chamado-atualizado", (data) => {
      console.log("[Socket] Chamado atualizado recebido:", data);
      callback(data);
    });
  }
}

export function onChamadoRemovido(callback) {
  if (socket) {
    socket.on("chamado-removido", (data) => {
      console.log("[Socket] Chamado removido recebido:", data);
      callback(data);
    });
  }
}

export function removerTodosListeners() {
  if (socket) {
    socket.off("novo-chamado");
    socket.off("chamado-atualizado");
    socket.off("chamado-removido");
    console.log("[Socket] Todos os listeners removidos.");
  }
}
