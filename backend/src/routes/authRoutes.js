const express = require("express");
const AuthController = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();

router.post("/registrar", AuthController.registrar);
router.post("/login", AuthController.login);

// Rota protegida de exemplo pra registrar técnico/admin
// (só funciona se quem chamar já estiver logado como admin)
router.post("/registrar-com-perfil", authMiddleware, AuthController.registrar);

module.exports = router;
