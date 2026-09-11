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

// Só técnico e admin podem atualizar status/responsável
router.put(
  "/:id",
  roleMiddleware("tecnico", "admin"),
  ChamadoController.atualizar
);

// Só admin pode excluir
router.delete("/:id", roleMiddleware("admin"), ChamadoController.remover);

module.exports = router;
