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
    tipoChamado: {
      type: String,
      enum: ["SAC", "SUPORTE", "OCORRÊNCIA INTERNA", "TI", "TREINAMENTO", "Atendimento ao cliente", "Pós Venda"],
      default: null,
    },
    skuEquipamento: {
      type: String,
      trim: true,
      default: null,
    },
    dataOcorrencia: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: ["aberto", "em_andamento", "aguardando_aprovacao", "resolvido", "finalizado", "fechado"],
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
    },    iniciadoEm: {
      type: Date,
      default: null,
    },
    resolvidoEm: {
      type: Date,
      default: null,
    },    relatoResolucao: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },
    aprovadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      default: null,
    },
    aprovadoEm: {
      type: Date,
      default: null,
    },
    observacaoAprovacao: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Chamado", chamadoSchema);
