const mongoose = require("mongoose");

const chamadoSchema = new mongoose.Schema(
  {
    titulo: {
      type: String,
      required: true,
      trim: true,
    },
    descricao: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["aberto", "em_andamento", "resolvido", "fechado"],
      default: "aberto",
    },
    prioridade: {
      type: String,
      enum: ["baixa", "media", "alta", "urgente"],
      default: "media",
    },
    solicitante: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
    },
    responsavel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      default: null, // técnico designado, se houver
    },
    destinatario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      default: null,
    },    relatoResolucao: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chamado", chamadoSchema);
