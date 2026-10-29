const mongoose = require("mongoose");
const Reuniao = require("../models/Reuniao");
const Usuario = require("../models/Usuario");
const { emitirNovaReuniao } = require("../config/socket");

const ReuniaoController = {
  async listar(req, res) {
    try {
      const reunioes = await Reuniao.find({ participantes: req.usuario.id })
        .populate("criadoPor", "nome email")
        .populate("participantes", "nome email")
        .sort({ dataHora: 1 });
      res.json(reunioes);
    } catch (erro) {
      res.status(500).json({ erro: "Erro ao listar reuniões", detalhe: erro.message });
    }
  },

  async criar(req, res) {
    try {
      const { titulo, descricao = "", dataHora, participantes = [] } = req.body;
      const tituloLimpo = typeof titulo === "string" ? titulo.trim() : "";
      const descricaoLimpa = typeof descricao === "string" ? descricao.trim() : "";
      const dataReuniao = new Date(dataHora);

      if (!tituloLimpo || tituloLimpo.length > 160) {
        return res.status(400).json({ erro: "Informe um título de até 160 caracteres" });
      }
      if (descricaoLimpa.length > 2000) {
        return res.status(400).json({ erro: "A descrição não pode passar de 2000 caracteres" });
      }
      if (!dataHora || Number.isNaN(dataReuniao.getTime())) {
        return res.status(400).json({ erro: "Informe uma data e hora válidas para a reunião" });
      }
      if (dataReuniao.getTime() <= Date.now()) {
        return res.status(400).json({ erro: "Escolha uma data e hora futuras" });
      }
      if (
        !Array.isArray(participantes) ||
        participantes.length > 50 ||
        participantes.some((id) => typeof id !== "string")
      ) {
        return res.status(400).json({ erro: "A lista de participantes é inválida" });
      }

      const idsParticipantes = [...new Set([...participantes, String(req.usuario.id)])];
      if (idsParticipantes.some((id) => !mongoose.Types.ObjectId.isValid(id))) {
        return res.status(400).json({ erro: "Um dos participantes selecionados é inválido" });
      }

      const totalUsuarios = await Usuario.countDocuments({ _id: { $in: idsParticipantes } });
      if (totalUsuarios !== idsParticipantes.length) {
        return res.status(400).json({ erro: "Um dos participantes não possui cadastro no sistema" });
      }

      const reuniao = await Reuniao.create({
        titulo: tituloLimpo,
        descricao: descricaoLimpa,
        dataHora: dataReuniao,
        participantes: idsParticipantes,
        criadoPor: req.usuario.id,
      });
      const reuniaoCompleta = await Reuniao.findById(reuniao._id)
        .populate("criadoPor", "nome email")
        .populate("participantes", "nome email");
      emitirNovaReuniao(reuniaoCompleta);
      res.status(201).json(reuniaoCompleta);
    } catch (erro) {
      res.status(500).json({ erro: "Erro ao agendar reunião", detalhe: erro.message });
    }
  },

  async listarPendentesNotificacao(req, res) {
    try {
      const reunioes = await Reuniao.find({
        participantes: req.usuario.id,
        status: "agendada",
        dataHora: { $lte: new Date() },
        notificacoesEnviadas: { $ne: req.usuario.id },
      })
        .select("titulo descricao dataHora participantes criadoPor")
        .populate("criadoPor", "nome email")
        .sort({ dataHora: 1 });
      res.json(reunioes);
    } catch (erro) {
      res.status(500).json({ erro: "Erro ao consultar lembretes de reuniões", detalhe: erro.message });
    }
  },

  async marcarNotificada(req, res) {
    try {
      const reuniao = await Reuniao.findOneAndUpdate(
        {
          _id: req.params.id,
          participantes: req.usuario.id,
          status: "agendada",
          dataHora: { $lte: new Date() },
          notificacoesEnviadas: { $ne: req.usuario.id },
        },
        { $addToSet: { notificacoesEnviadas: req.usuario.id } },
        { new: true }
      );
      res.json({ notificada: Boolean(reuniao) });
    } catch (erro) {
      if (erro instanceof mongoose.Error.CastError) {
        return res.status(400).json({ erro: "Reunião inválida" });
      }
      res.status(500).json({ erro: "Erro ao registrar lembrete da reunião", detalhe: erro.message });
    }
  },

  async cancelar(req, res) {
    try {
      const reuniao = await Reuniao.findById(req.params.id);
      if (!reuniao) {
        return res.status(404).json({ erro: "Reunião não encontrada" });
      }

      const idUsuarioAtual = String(req.usuario.id);
      const criouReuniao = String(reuniao.criadoPor) === idUsuarioAtual;
      const equipeSuporte = ["admin", "tecnico"].includes(req.usuario.perfil);
      if (!criouReuniao && !equipeSuporte) {
        return res.status(403).json({ erro: "Somente quem agendou ou o suporte pode cancelar a reunião" });
      }

      if (reuniao.status !== "cancelada") {
        reuniao.status = "cancelada";
        await reuniao.save();
      }
      const reuniaoCompleta = await Reuniao.findById(reuniao._id)
        .populate("criadoPor", "nome email")
        .populate("participantes", "nome email");
      res.json(reuniaoCompleta);
    } catch (erro) {
      res.status(500).json({ erro: "Erro ao cancelar reunião", detalhe: erro.message });
    }
  },
  async listarConvitesPendentes(req, res) {
    try {
      const reunioes = await Reuniao.find({
        participantes: req.usuario.id,
        criadoPor: { $ne: req.usuario.id },
        status: "agendada",
        convitesNotificados: { $ne: req.usuario.id },
      })
        .select("titulo descricao dataHora participantes criadoPor")
        .populate("criadoPor", "nome email")
        .sort({ createdAt: 1 });
      res.json(reunioes);
    } catch (erro) {
      res.status(500).json({ erro: "Erro ao consultar convites de reuniões", detalhe: erro.message });
    }
  },

  async marcarConviteNotificado(req, res) {
    try {
      const reuniao = await Reuniao.findOneAndUpdate(
        {
          _id: req.params.id,
          participantes: req.usuario.id,
          criadoPor: { $ne: req.usuario.id },
          status: "agendada",
          convitesNotificados: { $ne: req.usuario.id },
        },
        { $addToSet: { convitesNotificados: req.usuario.id } },
        { new: true }
      );
      res.json({ notificada: Boolean(reuniao) });
    } catch (erro) {
      if (erro instanceof mongoose.Error.CastError) {
        return res.status(400).json({ erro: "Reunião inválida" });
      }
      res.status(500).json({ erro: "Erro ao registrar convite da reunião", detalhe: erro.message });
    }
  },

  async remover(req, res) {
    try {
      const reuniao = await Reuniao.findById(req.params.id);
      if (!reuniao) {
        return res.status(404).json({ erro: "Reunião não encontrada" });
      }

      const idUsuarioAtual = String(req.usuario.id);
      const criouReuniao = String(reuniao.criadoPor) === idUsuarioAtual;
      const equipeSuporte = ["admin", "tecnico"].includes(req.usuario.perfil);
      if (!criouReuniao && !equipeSuporte) {
        return res.status(403).json({ erro: "Somente quem agendou ou o suporte pode excluir a reunião" });
      }

      await reuniao.deleteOne();
      res.status(204).send();
    } catch (erro) {
      if (erro instanceof mongoose.Error.CastError) {
        return res.status(400).json({ erro: "Reunião inválida" });
      }
      res.status(500).json({ erro: "Erro ao excluir reunião", detalhe: erro.message });
    }
  },
  async listarPendentesAntecipados(req, res) {
    try {
      const agora = new Date();
      const limite = new Date(agora.getTime() + 15 * 60 * 1000);
      const reunioes = await Reuniao.find({
        participantes: req.usuario.id,
        status: "agendada",
        dataHora: { $gt: agora, $lte: limite },
        notificacoesAntecipadasEnviadas: { $ne: req.usuario.id },
      })
        .select("titulo descricao dataHora participantes criadoPor")
        .populate("criadoPor", "nome email")
        .sort({ dataHora: 1 });
      res.json(reunioes);
    } catch (erro) {
      res.status(500).json({ erro: "Erro ao consultar alertas antecipados", detalhe: erro.message });
    }
  },

  async marcarAntecipadaNotificada(req, res) {
    try {
      const agora = new Date();
      const limite = new Date(agora.getTime() + 15 * 60 * 1000);
      const reuniao = await Reuniao.findOneAndUpdate(
        {
          _id: req.params.id,
          participantes: req.usuario.id,
          status: "agendada",
          dataHora: { $gt: agora, $lte: limite },
          notificacoesAntecipadasEnviadas: { $ne: req.usuario.id },
        },
        { $addToSet: { notificacoesAntecipadasEnviadas: req.usuario.id } },
        { new: true }
      );
      res.json({ notificada: Boolean(reuniao) });
    } catch (erro) {
      if (erro instanceof mongoose.Error.CastError) {
        return res.status(400).json({ erro: "Reunião inválida" });
      }
      res.status(500).json({ erro: "Erro ao registrar alerta antecipado", detalhe: erro.message });
    }
  },
};

module.exports = ReuniaoController;
