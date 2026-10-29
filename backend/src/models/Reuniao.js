const mongoose = require("mongoose");

const reuniaoSchema = new mongoose.Schema(
  {
    titulo: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    descricao: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
    dataHora: {
      type: Date,
      required: true,
    },
    participantes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Usuario",
        required: true,
      },
    ],
    criadoPor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
    },
    status: {
      type: String,
      enum: ["agendada", "cancelada"],
      default: "agendada",
    },
    notificacoesEnviadas: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Usuario",
      },
    ],
    notificacoesAntecipadasEnviadas: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Usuario",
      },
    ],
    convitesNotificados: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Usuario",
      },
    ],
  },
  { timestamps: true }
);

reuniaoSchema.index({ participantes: 1, dataHora: 1, status: 1 });

module.exports = mongoose.model("Reuniao", reuniaoSchema);
