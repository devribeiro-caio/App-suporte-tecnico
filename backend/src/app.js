const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const chamadoRoutes = require("./routes/chamadoRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ mensagem: "API do sistema de chamados rodando 🚀" });
});

app.use("/api/auth", authRoutes);
app.use("/api/chamados", chamadoRoutes);

module.exports = app;
