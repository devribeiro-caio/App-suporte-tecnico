// Uso: roleMiddleware("admin", "tecnico") -> só deixa passar esses perfis
function roleMiddleware(...perfisPermitidos) {
  return (req, res, next) => {
    if (!req.usuario || !perfisPermitidos.includes(req.usuario.perfil)) {
      return res
        .status(403)
        .json({ erro: "Você não tem permissão para acessar este recurso" });
    }
    next();
  };
}

module.exports = roleMiddleware;
