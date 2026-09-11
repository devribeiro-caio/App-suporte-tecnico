const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

require("dotenv").config();

const http = require("http");
const app = require("./src/app");
const { setupSocket } = require("./src/config/socket");
const conectarBanco = require("./src/config/db");
const garantirAdminInicial = require("./src/config/seedAdmin");

const PORT = process.env.PORT || 3001;

// Criar servidor HTTP para integrar com Socket.io
const server = http.createServer(app);
setupSocket(server);

conectarBanco()
  .then(garantirAdminInicial)
  .then(() => {
    server.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
      console.log(`Socket.io inicializado e aguardando conexões`);
    });
  })
  .catch((err) => {
    console.error("Erro ao iniciar o servidor:", err);
    process.exit(1);
  });
