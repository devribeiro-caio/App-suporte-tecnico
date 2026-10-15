const express = require("express");
const ChamadoController = require("../controllers/chamadoController");
const authMiddleware = require("../middlewares/authMiddleware");
const roleMiddleware = require("../middlewares/roleMiddleware");

const router = express.Router();

// Todas as rotas de chamado exigem estar logado
router.use(authMiddleware);

router.get("/", ChamadoController.listar);
router.get("/:id", ChamadoController.buscarPorId);
router.post("/", ChamadoController.criar); // qualquer perfil pode abrir chamado

// O controller permite participantes atualizarem o próprio status do chamado.
router.put("/:id", ChamadoController.atualizar);

// Só admin pode excluir
router.delete("/:id", roleMiddleware("admin"), ChamadoController.remover);

module.exports = router;
