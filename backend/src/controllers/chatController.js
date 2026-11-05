const mongoose = require("mongoose");
const Usuario = require("../models/Usuario");
const ConversaChat = require("../models/ConversaChat");
const MensagemChat = require("../models/MensagemChat");
const ArquivoChat = require("../models/ArquivoChat");
const { emitirMensagemChat } = require("../config/socket");

const MAX_TAMANHO_ARQUIVO = 10 * 1024 * 1024;
const TIPOS_POR_EXTENSAO = {
  ".pdf": ["application/pdf"],
  ".doc": ["application/msword"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ".xls": ["application/vnd.ms-excel"],
  ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ".ppt": ["application/vnd.ms-powerpoint"],
  ".pptx": ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  ".txt": ["text/plain"],
  ".csv": ["text/csv", "application/vnd.ms-excel"],
  ".rtf": ["application/rtf", "text/rtf"],
  ".odt": ["application/vnd.oasis.opendocument.text"],
  ".ods": ["application/vnd.oasis.opendocument.spreadsheet"],
  ".odp": ["application/vnd.oasis.opendocument.presentation"],
  ".zip": ["application/zip", "application/x-zip-compressed"],
  ".png": ["image/png"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".gif": ["image/gif"],
  ".webp": ["image/webp"],
  ".mp3": ["audio/mpeg", "audio/mp3"],
  ".wav": ["audio/wav", "audio/x-wav"],
  ".m4a": ["audio/mp4", "audio/x-m4a"],
  ".aac": ["audio/aac"],
  ".ogg": ["audio/ogg"],
  ".opus": ["audio/ogg", "audio/opus"],
  ".webm": ["audio/webm", "video/webm"],
  ".mp4": ["video/mp4", "audio/mp4"],
  ".mov": ["video/quicktime"],
};

function idValido(valor) {
  return mongoose.Types.ObjectId.isValid(String(valor || ""));
}

function erroDeValidacao(mensagem) {
  const erro = new Error(mensagem);
  erro.status = 400;
  return erro;
}

function prepararArquivo(arquivo) {
  if (!arquivo || typeof arquivo.nome !== "string" || typeof arquivo.dados !== "string") {
    throw erroDeValidacao("Selecione um arquivo válido para enviar");
  }

  const nome = arquivo.nome.replace(/[\\/]+/g, " ").replace(/[<>:\"|?*\x00-\x1f]/g, "_").trim().slice(0, 180);
  const extensao = nome.match(/\.[^.]+$/)?.[0]?.toLowerCase();
  const tiposAceitos = TIPOS_POR_EXTENSAO[extensao];
  if (!nome || !tiposAceitos) {
    throw erroDeValidacao("Tipo de arquivo não permitido. Use documentos, imagens, áudios ou vídeos compatíveis");
  }

  const correspondencia = /^data:[^,]*;base64,([A-Za-z0-9+/]*={0,2})$/.exec(arquivo.dados);
  if (!correspondencia) throw erroDeValidacao("Não foi possível ler o conteúdo do arquivo");
  const dados = Buffer.from(correspondencia[1], "base64");
  if (!dados.length) throw erroDeValidacao("O arquivo está vazio");
  if (dados.length > MAX_TAMANHO_ARQUIVO) throw erroDeValidacao("O anexo excede o limite de 10 MB");

  const mimeInformado = typeof arquivo.mimeType === "string" ? arquivo.mimeType.toLowerCase() : "";
  const mimeType = tiposAceitos.includes(mimeInformado) ? mimeInformado : tiposAceitos[0];
  return { nome, mimeType, dados };
}

function textoDePrevia(mensagem) {
  if (mensagem.texto) return mensagem.texto;
  if (mensagem.anexo?.mimeType?.startsWith("audio/")) return "Áudio";
  if (mensagem.anexo?.nome) return `📎 ${mensagem.anexo.nome}`;
  return "Nova mensagem";
}

function participanteDaConversa(conversa, usuarioId) {
  return conversa.participantes.some((id) => String(id?._id || id) === String(usuarioId));
}

const ChatController = {
  async listarConversas(req, res) {
    try {
      const conversas = await ConversaChat.find({ participantes: req.usuario.id })
        .sort({ ultimaMensagemEm: -1, updatedAt: -1 })
        .lean();

      const idsContatos = conversas
        .map((conversa) => conversa.participantes.find((id) => String(id) !== String(req.usuario.id)))
        .filter(Boolean);
      const contatos = await Usuario.find({ _id: { $in: idsContatos } })
        .select("nome email perfil")
        .lean();
      const contatosPorId = new Map(contatos.map((contato) => [String(contato._id), contato]));

      res.json(conversas.map((conversa) => {
        const contatoId = conversa.participantes.find((id) => String(id) !== String(req.usuario.id));
        return {
          _id: conversa._id,
          contato: contatosPorId.get(String(contatoId)) || null,
          ultimaMensagemTexto: conversa.ultimaMensagemTexto,
          ultimaMensagemEm: conversa.ultimaMensagemEm,
          ultimaMensagemId: conversa.ultimaMensagemId,
          ultimaMensagemRemetente: conversa.ultimaMensagemRemetente,
          updatedAt: conversa.updatedAt,
        };
      }));
    } catch (erro) {
      console.error("[Chat] Erro ao listar conversas:", erro);
      res.status(500).json({ erro: "Não foi possível carregar as conversas" });
    }
  },

  async obterOuCriarConversa(req, res) {
    try {
      const destinatarioId = String(req.body?.destinatarioId || "");
      const remetenteId = String(req.usuario.id);
      if (!idValido(destinatarioId)) {
        return res.status(400).json({ erro: "Selecione um usuário válido" });
      }
      if (destinatarioId === remetenteId) {
        return res.status(400).json({ erro: "Não é possível iniciar uma conversa consigo mesmo" });
      }

      const destinatario = await Usuario.findById(destinatarioId).select("_id nome email perfil").lean();
      if (!destinatario) {
        return res.status(404).json({ erro: "Usuário não encontrado" });
      }

      const participantesOrdenados = [remetenteId, destinatarioId].sort();
      const chaveParticipantes = participantesOrdenados.join(":");
      const conversa = await ConversaChat.findOneAndUpdate(
        { chaveParticipantes },
        {
          $setOnInsert: {
            chaveParticipantes,
            participantes: participantesOrdenados,
            ultimaMensagemTexto: "",
            ultimaMensagemEm: null,
            ultimaMensagemId: null,
            ultimaMensagemRemetente: null,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      res.json({
        _id: conversa._id,
        contato: destinatario,
        ultimaMensagemTexto: conversa.ultimaMensagemTexto,
        ultimaMensagemEm: conversa.ultimaMensagemEm,
        ultimaMensagemId: conversa.ultimaMensagemId,
        ultimaMensagemRemetente: conversa.ultimaMensagemRemetente,
        updatedAt: conversa.updatedAt,
      });
    } catch (erro) {
      console.error("[Chat] Erro ao abrir conversa:", erro);
      res.status(500).json({ erro: "Não foi possível abrir a conversa" });
    }
  },

  async listarMensagens(req, res) {
    try {
      if (!idValido(req.params.conversaId)) {
        return res.status(400).json({ erro: "Conversa inválida" });
      }
      const conversa = await ConversaChat.findById(req.params.conversaId).select("participantes");
      if (!conversa) return res.status(404).json({ erro: "Conversa não encontrada" });
      if (!participanteDaConversa(conversa, req.usuario.id)) {
        return res.status(403).json({ erro: "Você não participa desta conversa" });
      }

      const mensagens = await MensagemChat.find({ conversa: conversa._id })
        .sort({ createdAt: -1 })
        .limit(100)
        .populate("remetente", "nome email")
        .populate("destinatario", "nome email")
        .lean();
      res.json(mensagens.reverse());
    } catch (erro) {
      console.error("[Chat] Erro ao listar mensagens:", erro);
      res.status(500).json({ erro: "Não foi possível carregar as mensagens" });
    }
  },

  async enviarMensagem(req, res) {
    try {
      if (!idValido(req.params.conversaId)) {
        return res.status(400).json({ erro: "Conversa inválida" });
      }
      const texto = typeof req.body?.texto === "string" ? req.body.texto.trim() : "";
      const arquivoRecebido = req.body?.arquivo || null;
      if (!texto && !arquivoRecebido) return res.status(400).json({ erro: "Digite uma mensagem ou selecione um arquivo" });
      if (texto.length > 2000) return res.status(400).json({ erro: "A mensagem deve ter no máximo 2000 caracteres" });

      const conversa = await ConversaChat.findById(req.params.conversaId);
      if (!conversa) return res.status(404).json({ erro: "Conversa não encontrada" });
      if (!participanteDaConversa(conversa, req.usuario.id)) {
        return res.status(403).json({ erro: "Você não participa desta conversa" });
      }

      const destinatarioId = conversa.participantes.find((id) => String(id) !== String(req.usuario.id));
      let arquivoCriado = null;
      let mensagem;
      try {
        let anexo;
        if (arquivoRecebido) {
          const arquivo = prepararArquivo(arquivoRecebido);
          arquivoCriado = await ArquivoChat.create({
            nome: arquivo.nome,
            mimeType: arquivo.mimeType,
            tamanho: arquivo.dados.length,
            dados: arquivo.dados,
          });
          anexo = {
            arquivoId: arquivoCriado._id,
            nome: arquivo.nome,
            mimeType: arquivo.mimeType,
            tamanho: arquivo.dados.length,
          };
        }
        mensagem = await MensagemChat.create({
          conversa: conversa._id,
          remetente: req.usuario.id,
          destinatario: destinatarioId,
          texto,
          ...(anexo ? { anexo } : {}),
        });
      } catch (erro) {
        if (arquivoCriado) await ArquivoChat.deleteOne({ _id: arquivoCriado._id }).catch(() => {});
        throw erro;
      }
      conversa.ultimaMensagemTexto = textoDePrevia(mensagem);
      conversa.ultimaMensagemEm = mensagem.createdAt;
      conversa.ultimaMensagemId = mensagem._id;
      conversa.ultimaMensagemRemetente = req.usuario.id;
      await conversa.save();

      const mensagemCompleta = await MensagemChat.findById(mensagem._id)
        .populate("remetente", "nome email")
        .populate("destinatario", "nome email");
      const resultado = mensagemCompleta.toObject();
      emitirMensagemChat([req.usuario.id, destinatarioId], resultado);
      res.status(201).json(resultado);
    } catch (erro) {
      console.error("[Chat] Erro ao enviar mensagem:", erro);
      res.status(erro.status || 500).json({ erro: erro.status ? erro.message : "Não foi possível enviar a mensagem" });
    }
  },

  async obterArquivo(req, res) {
    try {
      const { conversaId, mensagemId } = req.params;
      if (!idValido(conversaId) || !idValido(mensagemId)) {
        return res.status(400).json({ erro: "Arquivo ou conversa inválidos" });
      }

      const conversa = await ConversaChat.findById(conversaId).select("participantes");
      if (!conversa) return res.status(404).json({ erro: "Conversa não encontrada" });
      if (!participanteDaConversa(conversa, req.usuario.id)) {
        return res.status(403).json({ erro: "Você não participa desta conversa" });
      }

      const mensagem = await MensagemChat.findOne({ _id: mensagemId, conversa: conversaId }).select("anexo");
      if (!mensagem?.anexo?.arquivoId) return res.status(404).json({ erro: "Anexo não encontrado" });
      const arquivo = await ArquivoChat.findById(mensagem.anexo.arquivoId).select("+dados");
      if (!arquivo) return res.status(404).json({ erro: "Arquivo não encontrado" });

      const nomeAscii = arquivo.nome.normalize("NFKD").replace(/[^\w.-]/g, "_") || "arquivo";
      res.set({
        "Content-Type": arquivo.mimeType,
        "Content-Disposition": `attachment; filename="${nomeAscii}"; filename*=UTF-8''${encodeURIComponent(arquivo.nome)}`,
        "Content-Length": String(arquivo.tamanho),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      });
      return res.send(Buffer.from(arquivo.dados));
    } catch (erro) {
      console.error("[Chat] Erro ao obter anexo:", erro);
      return res.status(500).json({ erro: "Não foi possível baixar o anexo" });
    }
  },

  async encaminharAudio(req, res) {
    try {
      const { conversaId, mensagemId } = req.params;
      const destinatarioId = String(req.body?.destinatarioId || "");
      const remetenteId = String(req.usuario.id);
      if (!idValido(conversaId) || !idValido(mensagemId)) {
        return res.status(400).json({ erro: "Mensagem ou conversa inválidas" });
      }
      if (!idValido(destinatarioId)) return res.status(400).json({ erro: "Selecione um destinatário válido" });
      if (destinatarioId === remetenteId) return res.status(400).json({ erro: "Não é possível encaminhar um áudio para si mesmo" });

      const conversaOrigem = await ConversaChat.findById(conversaId).select("participantes");
      if (!conversaOrigem) return res.status(404).json({ erro: "Conversa não encontrada" });
      if (!participanteDaConversa(conversaOrigem, remetenteId)) {
        return res.status(403).json({ erro: "Você não participa desta conversa" });
      }

      const mensagemOriginal = await MensagemChat.findOne({ _id: mensagemId, conversa: conversaId });
      if (!mensagemOriginal?.anexo?.mimeType?.startsWith("audio/")) {
        return res.status(400).json({ erro: "Somente mensagens de áudio podem ser encaminhadas" });
      }
      const destinatario = await Usuario.findById(destinatarioId).select("_id").lean();
      if (!destinatario) return res.status(404).json({ erro: "Destinatário não encontrado" });

      const participantes = [remetenteId, destinatarioId].sort();
      const conversaDestino = await ConversaChat.findOneAndUpdate(
        { chaveParticipantes: participantes.join(":") },
        {
          $setOnInsert: {
            chaveParticipantes: participantes.join(":"),
            participantes,
            ultimaMensagemTexto: "",
            ultimaMensagemEm: null,
            ultimaMensagemId: null,
            ultimaMensagemRemetente: null,
          },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );

      const mensagem = await MensagemChat.create({
        conversa: conversaDestino._id,
        remetente: remetenteId,
        destinatario: destinatarioId,
        texto: "Áudio encaminhado",
        anexo: mensagemOriginal.anexo,
        encaminhada: true,
      });
      conversaDestino.ultimaMensagemTexto = "Áudio encaminhado";
      conversaDestino.ultimaMensagemEm = mensagem.createdAt;
      conversaDestino.ultimaMensagemId = mensagem._id;
      conversaDestino.ultimaMensagemRemetente = remetenteId;
      await conversaDestino.save();

      const resultado = await MensagemChat.findById(mensagem._id)
        .populate("remetente", "nome email")
        .populate("destinatario", "nome email");
      const mensagemCompleta = resultado.toObject();
      emitirMensagemChat([remetenteId, destinatarioId], mensagemCompleta);
      return res.status(201).json(mensagemCompleta);
    } catch (erro) {
      console.error("[Chat] Erro ao encaminhar áudio:", erro);
      return res.status(500).json({ erro: "Não foi possível encaminhar o áudio" });
    }
  },
};

module.exports = ChatController;
