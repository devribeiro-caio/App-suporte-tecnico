const mongoose = require("mongoose");

const arquivoChatSchema = new mongoose.Schema(
  {
    nome: { type: String, required: true, maxlength: 180 },
    mimeType: { type: String, required: true, maxlength: 120 },
    tamanho: { type: Number, required: true, min: 1, max: 10 * 1024 * 1024 },
    dados: { type: Buffer, required: true, select: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ArquivoChat", arquivoChatSchema);
