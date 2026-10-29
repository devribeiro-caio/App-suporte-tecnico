const Chamado = require("../models/Chamado");
const Usuario = require("../models/Usuario");
const { normalizarEmail } = require("../config/usuariosPermitidos");
const { emitirChamado } = require("../config/socket");

const ChamadoController = {
  // Usuário comum vê só os seus; técnico/admin veem todos
  async listar(req, res) {
    try {
      const filtro = req.usuario.perfil === "usuario"
        ? {
            $or: [
              { solicitante: req.usuario.id },
              { destinatario: req.usuario.id },
            ],
          }
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

      const idUsuarioAtual = String(req.usuario.id);
      const participaDoChamado = [chamado.solicitante, chamado.destinatario].some(
        (participante) => String(participante?._id || participante) === idUsuarioAtual
      );
      const semPermissao = req.usuario.perfil === "usuario" && !participaDoChamado;
      if (semPermissao) {
        return res.status(403).json({ erro: "Acesso negado a este chamado" });
      }

      res.json(chamado);
    } catch (erro) {
      res.status(500).json({ erro: "Erro ao buscar chamado", detalhe: erro.message });
    }
  },

  async criar(req, res) {
    try {
      const { titulo, descricao, tipoChamado, dataOcorrencia, prioridade, destinatarioEmail } = req.body;
      const solicitante = await Usuario.findById(req.usuario.id).select("email");

      if (!titulo || !descricao || !destinatarioEmail) {
        return res.status(400).json({
          erro: "Titulo, descricao e destinatario sao obrigatorios",
        });
      }

      const tiposChamadoValidos = ["SAC", "Ocorrência Interna", "Atendimento ao cliente", "Pós Venda"];
      if (!tiposChamadoValidos.includes(tipoChamado)) {
        return res.status(400).json({ erro: "Selecione um tipo de chamado válido" });
      }

      const dataOcorrenciaDate = new Date(`${dataOcorrencia}T00:00:00.000Z`);
      const dataOcorrenciaValida =
        typeof dataOcorrencia === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(dataOcorrencia) &&
        !Number.isNaN(dataOcorrenciaDate.getTime()) &&
        dataOcorrenciaDate.toISOString().slice(0, 10) === dataOcorrencia;
      if (!dataOcorrenciaValida) {
        return res.status(400).json({ erro: "Informe uma data de ocorrência válida" });
      }

      if (!solicitante) {
        return res.status(403).json({
          erro: "Não foi possível identificar o usuário que abriu o chamado",
        });
      }

      const emailDestino = normalizarEmail(destinatarioEmail);
      if (
        emailDestino === normalizarEmail(solicitante.email)
      ) {
        return res.status(400).json({
          erro: "Selecione outro usuário como destinatário",
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
        tipoChamado,
        dataOcorrencia,
        prioridade,
        solicitante: solicitante._id,
        destinatario: destinatario._id,
      });

      const chamadoCompleto = await Chamado.findById(chamado._id)
        .populate("solicitante", "nome email")
        .populate("responsavel", "nome email")
        .populate("destinatario", "nome email");

      emitirChamado("novo-chamado", chamadoCompleto);
      res.status(201).json(chamadoCompleto);
    } catch (erro) {
      res.status(500).json({ erro: "Erro ao criar chamado", detalhe: erro.message });
    }
  },
  // Participantes podem mover seus chamados; suporte/admin mantém gestão global.
  async atualizar(req, res) {
    try {
      const { status, prioridade, responsavel, relatoResolucao, destinatario } = req.body;

      const chamado = await Chamado.findById(req.params.id);
      if (!chamado) {
        return res.status(404).json({ erro: "Chamado não encontrado" });
      }

      const idUsuarioAtual = String(req.usuario.id);
      const participanteDoChamado = [chamado.solicitante, chamado.destinatario].some(
        (participante) => String(participante?._id || participante) === idUsuarioAtual
      );
      const podeGerenciarTodos = ["admin", "tecnico"].includes(req.usuario.perfil);
      const podeRedirecionarDestinatario = podeGerenciarTodos ||
        String(chamado.destinatario?._id || chamado.destinatario || "") === idUsuarioAtual;
      const podeRegistrarRelato = req.usuario.perfil === "admin" || participanteDoChamado;

      if (!podeGerenciarTodos && !participanteDoChamado) {
        return res.status(403).json({ erro: "Somente participantes podem atualizar este chamado" });
      }

      if (!podeGerenciarTodos && (prioridade !== undefined || responsavel !== undefined)) {
        return res.status(403).json({ erro: "Somente suporte pode alterar prioridade ou responsável" });
      }
      if (destinatario !== undefined && !podeRedirecionarDestinatario) {
        return res.status(403).json({ erro: "Somente o destinatário atual ou suporte pode redirecionar este chamado" });
      }

      const statusValidos = ["aberto", "em_andamento", "resolvido", "fechado"];
      if (status !== undefined && !statusValidos.includes(status)) {
        return res.status(400).json({ erro: "Status inválido" });
      }

      if (!podeGerenciarTodos && status !== undefined) {
        if (!["em_andamento", "resolvido"].includes(status)) {
          return res.status(400).json({ erro: "Participantes podem mover o chamado para andamento ou resolvido" });
        }
        if (chamado.status === "resolvido" && status !== "resolvido") {
          return res.status(400).json({ erro: "Um chamado resolvido não pode ser reaberto por participantes" });
        }
      }

      const mudandoParaResolvido =
        status === "resolvido" && chamado.status !== "resolvido";
      const atualizandoRelato = relatoResolucao !== undefined;

      if (mudandoParaResolvido || atualizandoRelato) {
        if (!podeRegistrarRelato) {
          return res.status(403).json({
            erro: "Somente um administrador ou participante pode registrar a resolução",
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
      if (destinatario !== undefined) {
        const destinatarioId = String(destinatario);
        if (!/^[a-f\d]{24}$/i.test(destinatarioId)) {
          return res.status(400).json({ erro: "Selecione um destinatário válido" });
        }
        if (destinatarioId === String(chamado.solicitante)) {
          return res.status(400).json({ erro: "O solicitante não pode ser o destinatário do próprio chamado" });
        }
        const novoDestinatario = await Usuario.findById(destinatarioId).select("_id");
        if (!novoDestinatario) {
          return res.status(400).json({ erro: "O destinatário selecionado não possui cadastro no sistema" });
        }
        chamado.destinatario = novoDestinatario._id;
      }

      await chamado.save();

      // Popula os dados antes de emitir
      const chamadoAtualizado = await Chamado.findById(chamado._id)
        .populate("solicitante", "nome email")
        .populate("responsavel", "nome email")
        .populate("destinatario", "nome email");

      // Emitir evento: chamado atualizado
      emitirChamado("chamado-atualizado", chamadoAtualizado);

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

      await chamado.populate("solicitante", "nome email");
      await chamado.populate("destinatario", "nome email");
      await chamado.deleteOne();

      // Emitir evento: chamado removido
      emitirChamado("chamado-removido", chamado, { id: req.params.id });

      res.status(204).send();
    } catch (erro) {
      res.status(500).json({ erro: "Erro ao remover chamado", detalhe: erro.message });
    }
  },
};

module.exports = ChamadoController;
