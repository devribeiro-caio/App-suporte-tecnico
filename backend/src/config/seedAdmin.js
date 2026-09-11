// Garante que sempre existe o usuário admin configurado no .env.
// É chamado uma vez ao subir o servidor (ver server.js).

const Usuario = require("../models/Usuario");

async function garantirAdminInicial() {
  const emailAdmin = (process.env.ADMIN_EMAIL || "suporte@formis.com").toLowerCase().trim();
  const senhaAdmin = process.env.ADMIN_SENHA || "01020304";
  const nomeAdmin = process.env.ADMIN_NOME || "Suporte Técnico";

  // Verifica se o admin do .env já existe
  let adminExistente = await Usuario.findOne({ email: emailAdmin });

  if (adminExistente) {
    if (adminExistente.perfil !== "admin") {
      adminExistente.perfil = "admin";
      await adminExistente.save();
      console.log(`[SeedAdmin] Perfil de "${emailAdmin}" corrigido para admin.`);
    } else {
      console.log(`[SeedAdmin] Admin "${emailAdmin}" já existe com perfil admin.`);
    }
    return;
  }

  // Cria o admin configurado no .env
  await Usuario.create({
    nome: nomeAdmin,
    email: emailAdmin,
    senha: senhaAdmin,
    perfil: "admin",
  });

  console.log(`[SeedAdmin] Admin criado com sucesso -> email: ${emailAdmin}`);
}

module.exports = garantirAdminInicial;
