const express = require("express");
const ReuniaoController = require("../controllers/reuniaoController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();
router.use(authMiddleware);

router.get("/convites-pendentes", ReuniaoController.listarConvitesPendentes);
router.get("/pendentes-notificacao", ReuniaoController.listarPendentesNotificacao);
router.get("/pendentes-antecipados", ReuniaoController.listarPendentesAntecipados);
router.get("/", ReuniaoController.listar);
router.post("/", ReuniaoController.criar);
router.post("/:id/convite-notificado", ReuniaoController.marcarConviteNotificado);
router.post("/:id/notificada", ReuniaoController.marcarNotificada);
router.post("/:id/antecipada-notificada", ReuniaoController.marcarAntecipadaNotificada);
router.patch("/:id/cancelar", ReuniaoController.cancelar);
router.delete("/:id", ReuniaoController.remover);

module.exports = router;
