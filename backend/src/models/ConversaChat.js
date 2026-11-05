const mongoose = require("mongoose");

const conversaChatSchema = new mongoose.Schema(
  {
    chaveParticipantes: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    participantes: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
    }],
    ultimaMensagemTexto: {
      type: String,
      default: "",
      maxlength: 2000,
    },
    ultimaMensagemEm: {
      type: Date,
      default: null,
      index: true,
    },
    ultimaMensagemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MensagemChat",
      default: null,
    },
    ultimaMensagemRemetente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ConversaChat", conversaChatSchema);
