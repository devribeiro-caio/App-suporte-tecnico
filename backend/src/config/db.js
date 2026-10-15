const mongoose = require("mongoose");

async function conectarBanco() {
  try {
    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGO_URI ou MONGODB_URI não configurada.");
    }

    await mongoose.connect(uri);
    console.log("MongoDB conectado com sucesso.");
  } catch (erro) {
    console.error("Erro ao conectar no MongoDB:", erro.message);
    throw erro;
  }
}

module.exports = conectarBanco;
