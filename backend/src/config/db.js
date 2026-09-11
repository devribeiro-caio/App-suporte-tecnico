const mongoose = require("mongoose");

async function conectarBanco() {
  try {
    // Força o banco de dados dedicado ao suporte técnico
    const uri = "mongodb+srv://helpdeskformis:55Wformis3568@cluster0.yyf0tok.mongodb.net/suporte_tecnico?appName=Cluster0";
    await mongoose.connect(uri);
    console.log("MongoDB conectado com sucesso ao banco: suporte_tecnico");
  } catch (erro) {
    console.error("Erro ao conectar no MongoDB:", erro.message);
    throw erro;
  }
}

module.exports = conectarBanco;
