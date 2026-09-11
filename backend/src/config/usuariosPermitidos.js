const EMAILS_ADMIN = [
  "suporte@formis.com",
  "laboratorio@formis.com.br",
];

function normalizarEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function ehAdministradorPermitido(email) {
  return EMAILS_ADMIN.includes(normalizarEmail(email));
}

module.exports = {
  EMAILS_ADMIN,
  normalizarEmail,
  ehAdministradorPermitido,
};
