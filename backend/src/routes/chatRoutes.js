const express = require("express");
const ChatController = require("../controllers/chatController");
const authMiddleware = require("../middlewares/authMiddleware");

const router = express.Router();
router.use(authMiddleware);

router.get("/conversas", ChatController.listarConversas);
router.post("/conversas", ChatController.obterOuCriarConversa);
router.get("/conversas/:conversaId/mensagens", ChatController.listarMensagens);
router.post("/conversas/:conversaId/mensagens", ChatController.enviarMensagem);
router.get("/conversas/:conversaId/mensagens/:mensagemId/arquivo", ChatController.obterArquivo);
router.post("/conversas/:conversaId/mensagens/:mensagemId/encaminhar", ChatController.encaminharAudio);

module.exports = router;
