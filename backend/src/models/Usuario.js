const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const usuarioSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    senha: {
      type: String,
      required: true,
      select: false, // nunca retorna a senha nas consultas por padrão
    },
    perfil: {
      type: String,
      enum: ["usuario", "tecnico", "admin"],
      default: "usuario",
    },
  },
  { timestamps: true }
);

// Antes de salvar, criptografa a senha se ela foi alterada
usuarioSchema.pre("save", async function (next) {
  if (!this.isModified("senha")) return next();

  const salt = await bcrypt.genSalt(10);
  this.senha = await bcrypt.hash(this.senha, salt);
  next();
});

// Método de instância pra comparar senha digitada com o hash salvo
usuarioSchema.methods.compararSenha = function (senhaDigitada) {
  return bcrypt.compare(senhaDigitada, this.senha);
};

module.exports = mongoose.model("Usuario", usuarioSchema);
