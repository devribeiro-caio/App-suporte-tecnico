const mongoose = require("mongoose");

const anexoChatSchema = new mongoose.Schema(
  {
    arquivoId: { type: mongoose.Schema.Types.ObjectId, ref: "ArquivoChat", required: true },
    nome: { type: String, required: true, maxlength: 180 },
    mimeType: { type: String, required: true, maxlength: 120 },
    tamanho: { type: Number, required: true, min: 1, max: 10 * 1024 * 1024 },
  },
  { _id: false }
);

const mensagemChatSchema = new mongoose.Schema(
  {
    conversa: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ConversaChat",
      required: true,
      index: true,
    },
    remetente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
    },
    destinatario: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Usuario",
      required: true,
    },
    texto: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    anexo: { type: anexoChatSchema, default: undefined },
    encaminhada: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

mensagemChatSchema.pre("validate", function validarConteudo() {
  if (!this.texto?.trim() && !this.anexo) {
    this.invalidate("texto", "A mensagem precisa ter texto ou um anexo");
  }
});

mensagemChatSchema.index({ conversa: 1, createdAt: -1 });

module.exports = mongoose.model("MensagemChat", mensagemChatSchema);
