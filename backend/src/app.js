const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const chamadoRoutes = require("./routes/chamadoRoutes");
const reuniaoRoutes = require("./routes/reuniaoRoutes");
const chatRoutes = require("./routes/chatRoutes");

const app = express();

app.use(cors());
app.use((req, res, next) => {
  const recebeAnexo = req.method === "POST" && /^\/api\/chat\/conversas\/[^/]+\/mensagens$/.test(req.path);
  return express.json({ limit: recebeAnexo ? "14mb" : "100kb" })(req, res, next);
});

app.get("/", (req, res) => {
  res.json({ mensagem: "API do sistema de chamados rodando 🚀" });
});

app.use("/api/auth", authRoutes);
app.use("/api/chamados", chamadoRoutes);
app.use("/api/reunioes", reuniaoRoutes);
app.use("/api/chat", chatRoutes);

app.use((erro, req, res, next) => {
  if (erro.type === "entity.too.large") {
    return res.status(413).json({ erro: "O anexo excede o limite de 10 MB" });
  }
  return next(erro);
});

module.exports = app;
