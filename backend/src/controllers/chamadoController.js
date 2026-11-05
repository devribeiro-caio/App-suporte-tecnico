const Chamado = require("../models/Chamado");
const Usuario = require("../models/Usuario");
const AuditoriaExclusaoChamado = require("../models/AuditoriaExclusaoChamado");
const { normalizarEmail } = require("../config/usuariosPermitidos");
const { emitirChamado } = require("../config/socket");

const EMAIL_APROVADOR_CHAMADOS = "formis@formis.com.br";
const EMAILS_FINALIZADORES = new Set([
  "formis@formis.com.br",
  "administrativo@formis.com.br",
  "laboratorio@formis.com.br",
]);
const TIPOS_COM_APROVACAO = ["SAC", "SUPORTE", "Atendimento ao cliente", "Pós Venda"];

function tipoRequerAprovacao(chamado) {
  return TIPOS_COM_APROVACAO.includes(chamado?.tipoChamado);
}

async function usuarioEhAprovador(req) {
  const emailToken = normalizarEmail(req.usuario.email);
  if (emailToken) return emailToken === EMAIL_APROVADOR_CHAMADOS;
  const usuario = await Usuario.findById(req.usuario.id).select("email").lean();
  return normalizarEmail(usuario?.email) === EMAIL_APROVADOR_CHAMADOS;
}

async function usuarioPodeFinalizar(req) {
  const emailToken = normalizarEmail(req.usuario.email);
  if (emailToken) return EMAILS_FINALIZADORES.has(emailToken);
  const usuario = await Usuario.findById(req.usuario.id).select("email").lean();
  return EMAILS_FINALIZADORES.has(normalizarEmail(usuario?.email));
}

const ChamadoController = {
  // Usuário comum vê só os seus; técnico/admin veem todos
  async listar(req, res) {
    try {
      const filtro = {};
      if (req.usuario.perfil === "usuario") {
        const acessos = [
          { solicitante: req.usuario.id },
          { destinatario: req.usuario.id },
        ];
        if (await usuarioEhAprovador(req)) {
          acessos.push({
            status: "aguardando_aprovacao",
            tipoChamado: { $in: TIPOS_COM_APROVACAO },
          });
        }
        if (await usuarioPodeFinalizar(req)) {
          acessos.push({ status: "resolvido" });
        }
        filtro.$or = acessos;
      }

      const chamados = await Chamado.find(filtro)
        .populate("solicitante", "nome email")
        .populate("responsavel", "nome email")
        .populate("destinatario", "nome email")
        .populate("aprovadoPor", "nome email")
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
        .populate("destinatario", "nome email")
        .populate("aprovadoPor", "nome email");

      if (!chamado) {
        return res.status(404).json({ erro: "Chamado não encontrado" });
      }

      const idUsuarioAtual = String(req.usuario.id);
      const participaDoChamado = [chamado.solicitante, chamado.destinatario].some(
        (participante) => String(participante?._id || participante) === idUsuarioAtual
      );
      const podeRevisarPendencia =
        chamado.status === "aguardando_aprovacao" &&
        tipoRequerAprovacao(chamado) &&
        await usuarioEhAprovador(req);
      const podeFinalizarChamado =
        chamado.status === "resolvido" && await usuarioPodeFinalizar(req);
      const semPermissao =
        req.usuario.perfil === "usuario" && !participaDoChamado &&
        !podeRevisarPendencia && !podeFinalizarChamado;
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
      const { titulo, descricao, tipoChamado, skuEquipamento, dataOcorrencia, prioridade, destinatarioEmail } = req.body;
      const solicitante = await Usuario.findById(req.usuario.id).select("email");

      if (!titulo || !descricao || !destinatarioEmail) {
        return res.status(400).json({
          erro: "Titulo, descricao e destinatario sao obrigatorios",
        });
      }

      const tiposChamadoValidos = ["SAC", "SUPORTE", "OCORRÊNCIA INTERNA", "TI", "TREINAMENTO"];
      if (!tiposChamadoValidos.includes(tipoChamado)) {
        return res.status(400).json({ erro: "Selecione um tipo de chamado válido" });
      }
      const skuLimpo = typeof skuEquipamento === "string" ? skuEquipamento.trim() : "";
      if (tipoChamado === "TREINAMENTO" && !skuLimpo) {
        return res.status(400).json({ erro: "Informe o SKU do equipamento para solicitar treinamento" });
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
        skuEquipamento: tipoChamado === "TREINAMENTO" ? skuLimpo : null,
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
      const solicitandoFinalizacao = status === "finalizado";
      const podeFinalizarChamado = solicitandoFinalizacao && await usuarioPodeFinalizar(req);

      if (solicitandoFinalizacao && !podeFinalizarChamado) {
        return res.status(403).json({ erro: "Somente formis@formis.com.br, administrativo@formis.com.br e laboratorio@formis.com.br podem finalizar chamados" });
      }
      if (solicitandoFinalizacao && chamado.status !== "resolvido") {
        return res.status(400).json({ erro: "Somente chamados resolvidos podem ser finalizados" });
      }
      if (chamado.status === "finalizado" && status !== "finalizado") {
        return res.status(400).json({ erro: "Um chamado finalizado não pode ter o status alterado" });
      }
      if (solicitandoFinalizacao && (prioridade !== undefined || responsavel !== undefined || relatoResolucao !== undefined || destinatario !== undefined)) {
        return res.status(400).json({ erro: "A finalização altera somente o status do chamado" });
      }
      const podeRedirecionarDestinatario = podeGerenciarTodos ||
        String(chamado.destinatario?._id || chamado.destinatario || "") === idUsuarioAtual;
      const podeRegistrarRelato = podeGerenciarTodos || participanteDoChamado;

      if (!podeGerenciarTodos && !participanteDoChamado && !podeFinalizarChamado) {
        return res.status(403).json({ erro: "Somente participantes podem atualizar este chamado" });
      }

      if (!podeGerenciarTodos && (prioridade !== undefined || responsavel !== undefined)) {
        return res.status(403).json({ erro: "Somente suporte pode alterar prioridade ou responsável" });
      }
      if (destinatario !== undefined && !podeRedirecionarDestinatario) {
        return res.status(403).json({ erro: "Somente o destinatário atual ou suporte pode redirecionar este chamado" });
      }

      const statusValidos = ["aberto", "em_andamento", "aguardando_aprovacao", "resolvido", "finalizado"];
      if (status !== undefined && !statusValidos.includes(status)) {
        return res.status(400).json({ erro: "Status inválido" });
      }
      if (status === "aguardando_aprovacao") {
        return res.status(400).json({ erro: "O status de aprovação é controlado pelo sistema" });
      }

      const exigeAprovacao = tipoRequerAprovacao(chamado);
      if (
        exigeAprovacao &&
        chamado.status === "aguardando_aprovacao" &&
        status === "resolvido"
      ) {
        return res.status(403).json({ erro: "Este chamado só pode ser concluído pela conta aprovadora" });
      }
      if (
        exigeAprovacao &&
        status === "fechado" &&
        chamado.status !== "resolvido"
      ) {
        return res.status(400).json({ erro: "A aprovação é obrigatória antes de fechar este chamado" });
      }

      if (!podeGerenciarTodos && !podeFinalizarChamado && status !== undefined) {
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
            erro: "Somente suporte ou participante deste chamado pode registrar a resolução",
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
        status === "resolvido" &&
        !exigeAprovacao &&
        chamado.status !== "resolvido";

      if (iniciandoAtendimento && !chamado.iniciadoEm) {
        chamado.iniciadoEm = new Date();
      }

      if (concluindoAtendimento) {
        if (!chamado.iniciadoEm) chamado.iniciadoEm = new Date();
        chamado.resolvidoEm = new Date();
      }

      if (
        status === "resolvido" &&
        exigeAprovacao &&
        chamado.status !== "resolvido"
      ) {
        chamado.status = "aguardando_aprovacao";
        chamado.resolvidoEm = null;
        chamado.aprovadoPor = null;
        chamado.aprovadoEm = null;
      } else if (status !== undefined) {
        if (status === "em_andamento" && chamado.status === "aguardando_aprovacao") {
          chamado.relatoResolucao = null;
          chamado.aprovadoPor = null;
          chamado.aprovadoEm = null;
          chamado.resolvidoEm = null;
        }
        chamado.status = status;
      }
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
        .populate("destinatario", "nome email")
        .populate("aprovadoPor", "nome email");

      // Emitir evento: chamado atualizado
      emitirChamado("chamado-atualizado", chamadoAtualizado);

      res.json(chamadoAtualizado);
    } catch (erro) {
      console.error("[Chamados] Falha ao atualizar chamado:", erro);
      res.status(500).json({ erro: "Erro ao atualizar chamado", detalhe: erro.message });
    }
  },

  async remover(req, res) {
    let registroAuditoria = null;
    let exclusaoRealizada = false;
    try {
      const chamado = await Chamado.findById(req.params.id);
      if (!chamado) {
        return res.status(404).json({ erro: "Chamado não encontrado" });
      }

      if (!["resolvido", "finalizado"].includes(chamado.status)) {
        return res.status(400).json({
          erro: "Apenas chamados resolvidos ou finalizados podem ser excluídos",
        });
      }

      if (chamado.status === "finalizado") {
        const administrador = await Usuario.findById(req.usuario.id).select("nome email").lean();
        if (!administrador) {
          return res.status(403).json({ erro: "Não foi possível identificar o administrador" });
        }

        registroAuditoria = await AuditoriaExclusaoChamado.create({
          chamadoId: chamado._id,
          tituloChamado: chamado.titulo,
          tipoChamado: chamado.tipoChamado,
          skuEquipamento: chamado.skuEquipamento,
          administradorId: administrador._id,
          administradorNome: administrador.nome,
          administradorEmail: administrador.email,
          resultado: "pendente",
        });
      }

      await chamado.populate("solicitante", "nome email");
      await chamado.populate("destinatario", "nome email");

      if (chamado.status === "finalizado") {
        const removido = await Chamado.findOneAndDelete({
          _id: chamado._id,
          status: "finalizado",
        });
        if (!removido) {
          await AuditoriaExclusaoChamado.updateOne(
            { _id: registroAuditoria._id },
            { $set: { resultado: "falhou", motivoFalha: "O chamado foi alterado antes da exclusão." } }
          );
          return res.status(409).json({ erro: "O chamado foi alterado antes da exclusão; atualize a lista e tente novamente" });
        }
        exclusaoRealizada = true;
      } else {
        await chamado.deleteOne();
      }

      if (registroAuditoria) {
        try {
          await AuditoriaExclusaoChamado.updateOne(
            { _id: registroAuditoria._id },
            { $set: { resultado: "concluida", excluidoEm: new Date(), motivoFalha: null } }
          );
        } catch (erroAuditoria) {
          console.error("[Auditoria] Não foi possível concluir a atualização do registro de exclusão:", erroAuditoria.message);
        }
      }

      // Emitir evento: chamado removido
      emitirChamado("chamado-removido", chamado, { id: req.params.id });

      res.status(204).send();
    } catch (erro) {
      if (registroAuditoria && !exclusaoRealizada) {
        await AuditoriaExclusaoChamado.updateOne(
          { _id: registroAuditoria._id, resultado: "pendente" },
          { $set: { resultado: "falhou", motivoFalha: "A exclusão do chamado não foi concluída." } }
        ).catch((erroAuditoria) => {
          console.error("[Auditoria] Não foi possível registrar a falha de exclusão:", erroAuditoria.message);
        });
      }
      res.status(500).json({ erro: "Erro ao remover chamado", detalhe: erro.message });
    }
  },
  async listarAuditoriaExclusoesFinalizados(req, res) {
    try {
      const registros = await AuditoriaExclusaoChamado.find()
        .sort({ createdAt: -1 })
        .limit(200)
        .lean();
      res.json(registros);
    } catch (erro) {
      res.status(500).json({ erro: "Erro ao consultar o log de exclusões" });
    }
  },
  async aprovar(req, res) {
    try {
      if (!(await usuarioEhAprovador(req))) {
        return res.status(403).json({ erro: `Somente ${EMAIL_APROVADOR_CHAMADOS} pode aprovar este chamado` });
      }

      const observacaoAprovacao = typeof req.body?.observacaoAprovacao === "string"
        ? req.body.observacaoAprovacao.trim()
        : "";
      if (!observacaoAprovacao) {
        return res.status(400).json({ erro: "Informe o parecer do administrador antes de aprovar" });
      }
      if (observacaoAprovacao.length > 2000) {
        return res.status(400).json({ erro: "O parecer deve ter no máximo 2000 caracteres" });
      }

      const agora = new Date();
      const chamado = await Chamado.findOneAndUpdate(
        {
          _id: req.params.id,
          status: "aguardando_aprovacao",
          tipoChamado: { $in: TIPOS_COM_APROVACAO },
        },
        {
          $set: {
            status: "resolvido",
            resolvidoEm: agora,
            aprovadoPor: req.usuario.id,
            aprovadoEm: agora,
            observacaoAprovacao,
          },
        },
        { new: true, runValidators: true }
      );

      if (!chamado) {
        const existe = await Chamado.exists({ _id: req.params.id });
        if (!existe) return res.status(404).json({ erro: "Chamado não encontrado" });
        return res.status(409).json({ erro: "O chamado não está aguardando aprovação" });
      }

      const chamadoCompleto = await Chamado.findById(chamado._id)
        .populate("solicitante", "nome email")
        .populate("responsavel", "nome email")
        .populate("destinatario", "nome email")
        .populate("aprovadoPor", "nome email");
      emitirChamado("chamado-atualizado", chamadoCompleto);
      res.json(chamadoCompleto);
    } catch (erro) {
      if (erro.name === "CastError") {
        return res.status(400).json({ erro: "Chamado inválido" });
      }
      res.status(500).json({ erro: "Erro ao aprovar chamado", detalhe: erro.message });
    }
  },
};

module.exports = ChamadoController;
