const EMAIL_USUARIO_SOMENTE_DESTINATARIO = "suporte@formis.com";

const EMAILS_ADMIN = [
  "laboratorio@formis.com.br",
  "vendas@formis.com",
  "administrativo@formis.com.br",
  "sac@formis.com.br",
];

function normalizarEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function ehUsuarioSomenteDestinatario(email) {
  return normalizarEmail(email) === EMAIL_USUARIO_SOMENTE_DESTINATARIO;
}

function ehAdministradorPermitido(email) {
  return EMAILS_ADMIN.includes(normalizarEmail(email));
}

module.exports = {
  EMAILS_ADMIN,
  EMAIL_USUARIO_SOMENTE_DESTINATARIO,
  normalizarEmail,
  ehUsuarioSomenteDestinatario,
  ehAdministradorPermitido,
};
