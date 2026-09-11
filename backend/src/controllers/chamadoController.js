const Chamado = require("../models/Chamado");
const Usuario = require("../models/Usuario");
const { ehAdministradorPermitido, normalizarEmail } = require("../config/usuariosPermitidos");
const { getIO } = require("../config/socket");

const ChamadoController = {
  // Usuário comum vê só os seus; técnico/admin veem todos
  async listar(req, res) {
    try {
      const filtro =
        req.usuario.perfil === "usuario"
          ? { solicitante: req.usuario.id }
          : {};

      const chamados = await Chamado.find(filtro)
        .populate("solicitante", "nome email")
        .populate("responsavel", "nome email")
        .populate("destinatario", "nome email")
        .sort({ createdAt: -1 });

      res.json(chamados);
    } catch (erro) {
      res.status(500).json({ erro: "Erro ao listar chamados", detalhe: erro.message });
    }
  },

  async buscarPorId(req, res) {
    try {
      const chamado = await Chamado.findById(req.params.id)
        .populate("solicitante", "nome email")
        .populate("responsavel", "nome email")
        .populate("destinatario", "nome email");

      if (!chamado) {
        return res.status(404).json({ erro: "Chamado não encontrado" });
      }

      // Usuário comum só pode ver o próprio chamado
      if (
        req.usuario.perfil === "usuario" &&
        chamado.solicitante._id.toString() !== req.usuario.id
      ) {
        return res.status(403).json({ erro: "Acesso negado a este chamado" });
      }

      res.json(chamado);
    } catch (erro) {
      res.status(500).json({ erro: "Erro ao buscar chamado", detalhe: erro.message });
    }
  },

  async criar(req, res) {
    try {
      const { titulo, descricao, prioridade, destinatarioEmail } = req.body;
      const solicitante = await Usuario.findById(req.usuario.id).select("email");

      if (!titulo || !descricao || !destinatarioEmail) {
        return res.status(400).json({
          erro: "Titulo, descricao e destinatario sao obrigatorios",
        });
      }

      if (!solicitante || !ehAdministradorPermitido(solicitante.email)) {
        return res.status(403).json({
          erro: "Apenas os usuarios de suporte autorizados podem abrir chamados",
        });
      }

      const emailDestino = normalizarEmail(destinatarioEmail);
      if (
        !ehAdministradorPermitido(emailDestino) ||
        emailDestino === normalizarEmail(solicitante.email)
      ) {
        return res.status(400).json({
          erro: "Selecione o outro usuario de suporte como destinatario",
        });
      }

      const destinatario = await Usuario.findOne({ email: emailDestino });
      if (!destinatario) {
        return res.status(400).json({
          erro: "O destinatario ainda nao possui cadastro no sistema",
        });
      }

      const chamado = await Chamado.create({
        titulo,
        descricao,
        prioridade,
        solicitante: solicitante._id,
        destinatario: destinatario._id,
      });

      const chamadoCompleto = await Chamado.findById(chamado._id)
        .populate("solicitante", "nome email")
        .populate("responsavel", "nome email")
        .populate("destinatario", "nome email");

      getIO().emit("novo-chamado", chamadoCompleto);
      res.status(201).json(chamadoCompleto);
    } catch (erro) {
      res.status(500).json({ erro: "Erro ao criar chamado", detalhe: erro.message });
    }
  },
  // Atualização de status/responsável: só técnico ou admin (ver rota)
  async atualizar(req, res) {
    try {
      const { status, prioridade, responsavel, relatoResolucao } = req.body;

      const chamado = await Chamado.findById(req.params.id);
      if (!chamado) {
        return res.status(404).json({ erro: "Chamado não encontrado" });
      }

      const mudandoParaResolvido =
        status === "resolvido" && chamado.status !== "resolvido";
      const atualizandoRelato = relatoResolucao !== undefined;

      if (mudandoParaResolvido || atualizandoRelato) {
        if (req.usuario.perfil !== "admin") {
          return res.status(403).json({
            erro: "Apenas administradores podem registrar o relato da resolução",
          });
        }

        if (!mudandoParaResolvido && chamado.status !== "resolvido") {
          return res.status(400).json({
            erro: "O relato só pode ser registrado em chamados resolvidos",
          });
        }

        if (
          typeof relatoResolucao !== "string" ||
          !relatoResolucao.trim()
        ) {
          return res.status(400).json({
            erro: "Informe o relato da resolução antes de concluir o chamado",
          });
        }

        chamado.relatoResolucao = relatoResolucao.trim();
      }

      const iniciandoAtendimento =
        status === "em_andamento" && chamado.status !== "em_andamento";
      const concluindoAtendimento =
        status === "resolvido" && chamado.status !== "resolvido";

      if (iniciandoAtendimento && !chamado.iniciadoEm) {
        chamado.iniciadoEm = new Date();
      }

      if (concluindoAtendimento) {
        if (!chamado.iniciadoEm) chamado.iniciadoEm = new Date();
        chamado.resolvidoEm = new Date();
      }

      if (status !== undefined) chamado.status = status;
      if (prioridade !== undefined) chamado.prioridade = prioridade;
      if (responsavel !== undefined) chamado.responsavel = responsavel;

      await chamado.save();

      // Popula os dados antes de emitir
      const chamadoAtualizado = await Chamado.findById(chamado._id)
        .populate("solicitante", "nome email")
        .populate("responsavel", "nome email")
        .populate("destinatario", "nome email");

      // Emitir evento: chamado atualizado
      const io = getIO();
      io.emit("chamado-atualizado", chamadoAtualizado);

      res.json(chamadoAtualizado);
    } catch (erro) {
      res.status(500).json({ erro: "Erro ao atualizar chamado", detalhe: erro.message });
    }
  },

  async remover(req, res) {
    try {
      const chamado = await Chamado.findById(req.params.id);
      if (!chamado) {
        return res.status(404).json({ erro: "Chamado não encontrado" });
      }

      if (chamado.status !== "resolvido") {
        return res.status(400).json({
          erro: "Apenas chamados resolvidos podem ser excluídos",
        });
      }

      await chamado.deleteOne();

      // Emitir evento: chamado removido
      const io = getIO();
      io.emit("chamado-removido", { id: req.params.id });

      res.status(204).send();
    } catch (erro) {
      res.status(500).json({ erro: "Erro ao remover chamado", detalhe: erro.message });
    }
  },
};

module.exports = ChamadoController;
