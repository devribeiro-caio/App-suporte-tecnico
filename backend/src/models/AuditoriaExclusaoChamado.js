const mongoose = require("mongoose");

const auditoriaExclusaoChamadoSchema = new mongoose.Schema(
  {
    chamadoId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    tituloChamado: {
      type: String,
      required: true,
      trim: true,
    },
    tipoChamado: {
      type: String,
      default: null,
    },
    skuEquipamento: {
      type: String,
      default: null,
    },
    administradorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
    },
    administradorNome: {
      type: String,
      default: "",
    },
    administradorEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    resultado: {
      type: String,
      enum: ["pendente", "concluida", "falhou"],
      default: "pendente",
      index: true,
    },
    excluidoEm: {
      type: Date,
      default: null,
    },
    motivoFalha: {
      type: String,
      maxlength: 500,
      default: null,
    },
  },
  { timestamps: true }
);

auditoriaExclusaoChamadoSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AuditoriaExclusaoChamado", auditoriaExclusaoChamadoSchema);
