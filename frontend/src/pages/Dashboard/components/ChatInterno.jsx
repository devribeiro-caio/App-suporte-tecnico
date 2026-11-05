import { useEffect, useMemo, useRef, useState } from "react";
import { ChatService } from "../../../services/api";
import { onChatMensagem } from "../../../services/socket";
import "./ChatInterno.css";

function idUsuario(valor) {
  return String(valor?._id || valor?.id || valor || "");
}

function formatarHorario(valor) {
  if (!valor) return "";
  const data = new Date(valor);
  return Number.isNaN(data.getTime())
    ? ""
    : data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

const MAX_TAMANHO_ARQUIVO = 10 * 1024 * 1024;
const EXTENSOES_PERMITIDAS = new Set([
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv", ".rtf", ".odt", ".ods", ".odp", ".zip",
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".mp3", ".wav", ".m4a", ".aac", ".ogg", ".opus", ".webm", ".mp4", ".mov",
]);
const EMOJIS = ["😀", "😃", "😄", "😁", "😆", "🙂", "😉", "😊", "😍", "🥰", "😎", "🤔", "😂", "🤣", "😭", "😅", "😮", "😴", "🙌", "👏", "👍", "👎", "🙏", "💪", "❤️", "💙", "🎉", "✅", "⭐", "🔥", "📎", "💡"];

function textoPrevia(mensagem) {
  if (mensagem.texto) return mensagem.texto;
  if (mensagem.anexo?.mimeType?.startsWith("audio/")) return "Áudio";
  if (mensagem.anexo?.nome) return `📎 ${mensagem.anexo.nome}`;
  return "Nova mensagem";
}

function formatarTamanho(bytes) {
  if (!bytes) return "";
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function lerArquivoComoDataUrl(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result);
    leitor.onerror = () => reject(new Error("Não foi possível ler o arquivo selecionado."));
    leitor.readAsDataURL(arquivo);
  });
}

function AnexoMensagem({ anexo, conversaId, mensagemId, token }) {
  const [url, setUrl] = useState("");
  const [falha, setFalha] = useState(false);

  useEffect(() => {
    let ativo = true;
    let urlTemporaria = "";
    ChatService.baixarArquivo(conversaId, mensagemId, token)
      .then((arquivo) => {
        urlTemporaria = URL.createObjectURL(arquivo);
        if (ativo) setUrl(urlTemporaria);
        else URL.revokeObjectURL(urlTemporaria);
      })
      .catch(() => {
        if (ativo) setFalha(true);
      });
    return () => {
      ativo = false;
      if (urlTemporaria) URL.revokeObjectURL(urlTemporaria);
    };
  }, [conversaId, mensagemId, token]);

  if (falha) return <p className="chat-anexo-estado">Não foi possível carregar o anexo.</p>;
  if (!url) return <p className="chat-anexo-estado">Carregando anexo...</p>;

  const mimeType = anexo.mimeType || "application/octet-stream";
  const nome = anexo.nome || "arquivo";
  if (mimeType.startsWith("audio/")) {
    return <div className="chat-anexo"><audio controls preload="metadata" src={url}>Seu navegador não reproduz este áudio.</audio><a href={url} download={nome}>{nome}</a></div>;
  }
  if (mimeType.startsWith("video/")) {
    return <div className="chat-anexo"><video controls preload="metadata" src={url}>Seu navegador não reproduz este vídeo.</video><a href={url} download={nome}>{nome}</a></div>;
  }
  if (mimeType.startsWith("image/")) {
    return <div className="chat-anexo"><a href={url} download={nome}><img src={url} alt={nome} /></a><a href={url} download={nome}>{nome}</a></div>;
  }
  return (
    <a className="chat-anexo-arquivo" href={url} download={nome}>
      <span aria-hidden="true">📎</span>
      <span>{nome}</span>
      <small>{formatarTamanho(anexo.tamanho)}</small>
    </a>
  );
}

export default function ChatInterno({ usuario, usuarios = [], token }) {
  const [aberto, setAberto] = useState(false);
  const [conversas, setConversas] = useState([]);
  const [conversaAtual, setConversaAtual] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState("");
  const [carregandoConversas, setCarregandoConversas] = useState(false);
  const [carregandoMensagens, setCarregandoMensagens] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [naoLidas, setNaoLidas] = useState(0);
  const [avisoMensagem, setAvisoMensagem] = useState(null);
  const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
  const [emojiAberto, setEmojiAberto] = useState(false);
  const [audioParaEncaminhar, setAudioParaEncaminhar] = useState("");
  const [encaminhandoId, setEncaminhandoId] = useState("");
  const [avisoOperacao, setAvisoOperacao] = useState("");
  const fimMensagensRef = useRef(null);
  const inputArquivoRef = useRef(null);
  const ultimasMensagensRef = useRef(null);
  const mensagensNotificadasRef = useRef(new Set());
  const historicoInicializadoRef = useRef(new Set());
  const meuId = idUsuario(usuario);

  const contatos = useMemo(
    () => usuarios
      .filter((contato) => idUsuario(contato) && idUsuario(contato) !== meuId)
      .slice()
      .sort((a, b) => String(a.nome || a.email).localeCompare(String(b.nome || b.email), "pt-BR")),
    [usuarios, meuId]
  );

  function notificarMensagem(mensagem, contabilizarComoNaoLida = true) {
    const nomeRemetente = mensagem.remetente?.nome || mensagem.remetente?.email || "Um usuário";
    const avisoId = `${mensagem._id || Date.now()}`;
    setAvisoMensagem({
      id: avisoId,
      conversaId: idUsuario(mensagem.conversa || mensagem.conversaId),
      nome: nomeRemetente,
      texto: textoPrevia(mensagem),
    });
    window.setTimeout(() => {
      setAvisoMensagem((atual) => atual?.id === avisoId ? null : atual);
    }, 7000);
    if (contabilizarComoNaoLida) setNaoLidas((total) => total + 1);

    if ("Notification" in window && window.Notification.permission === "granted") {
      try {
        new window.Notification(`Mensagem de ${nomeRemetente}`, {
          body: textoPrevia(mensagem),
          tag: `chat-${mensagem.conversa || mensagem.conversaId || "mensagem"}`,
        });
      } catch (error) {
        console.warn("Não foi possível exibir a notificação do chat:", error.message);
      }
    }

    try {
      const AudioContextDisponivel = window.AudioContext || window.webkitAudioContext;
      if (AudioContextDisponivel) {
        const contexto = new AudioContextDisponivel();
        const oscilador = contexto.createOscillator();
        const volume = contexto.createGain();
        oscilador.frequency.value = 880;
        volume.gain.setValueAtTime(0.035, contexto.currentTime);
        volume.gain.exponentialRampToValueAtTime(0.001, contexto.currentTime + 0.16);
        oscilador.connect(volume);
        volume.connect(contexto.destination);
        oscilador.start();
        oscilador.stop(contexto.currentTime + 0.16);
        oscilador.onended = () => contexto.close();
      }
    } catch (error) {
      console.debug("Som de notificação indisponível:", error.message);
    }
  }

  useEffect(() => {
    if (!token) return undefined;
    let ativo = true;
    let sincronizando = false;

    async function sincronizar() {
      if (sincronizando) return;
      sincronizando = true;
      try {
        const dados = await ChatService.listarConversas(token);
        if (!ativo) return;

        if (ultimasMensagensRef.current === null) {
          ultimasMensagensRef.current = new Map(
            dados.map((item) => [item._id, String(item.ultimaMensagemId || "")])
          );
          dados.forEach((item) => {
            if (item.ultimaMensagemId) mensagensNotificadasRef.current.add(String(item.ultimaMensagemId));
          });
        } else {
          for (const item of dados) {
            const ultimaId = String(item.ultimaMensagemId || "");
            const anterior = ultimasMensagensRef.current.get(item._id);
            if (ultimaId && ultimaId !== anterior) {
              ultimasMensagensRef.current.set(item._id, ultimaId);
              if (!mensagensNotificadasRef.current.has(ultimaId) && idUsuario(item.ultimaMensagemRemetente) !== meuId) {
                mensagensNotificadasRef.current.add(ultimaId);
                notificarMensagem({
                  _id: ultimaId,
                  conversa: item._id,
                  remetente: item.contato,
                  texto: item.ultimaMensagemTexto,
                }, conversaAtual?._id !== item._id || !aberto);
              }
            }
          }
        }
        setConversas(dados);

        if (aberto && conversaAtual?._id) {
          const historico = await ChatService.listarMensagens(conversaAtual._id, token);
          if (!ativo) return;
          const historicoJaInicializado = historicoInicializadoRef.current.has(conversaAtual._id);
          for (const mensagem of historico) {
            const mensagemId = String(mensagem._id);
            if (!historicoJaInicializado) {
              mensagensNotificadasRef.current.add(mensagemId);
            } else if (!mensagensNotificadasRef.current.has(mensagemId)) {
              mensagensNotificadasRef.current.add(mensagemId);
              if (idUsuario(mensagem.remetente) !== meuId) notificarMensagem(mensagem, false);
            }
          }
          historicoInicializadoRef.current.add(conversaAtual._id);
          setMensagens((atuais) => {
            const porId = new Map(atuais.map((mensagem) => [mensagem._id, mensagem]));
            historico.forEach((mensagem) => {
              if (!porId.has(mensagem._id)) porId.set(mensagem._id, mensagem);
            });
            return [...porId.values()].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          });
        }
      } catch (error) {
        if (ativo) console.warn("Não foi possível sincronizar o chat:", error.message);
      } finally {
        sincronizando = false;
        if (ativo) setCarregandoConversas(false);
      }
    }

    setCarregandoConversas(ultimasMensagensRef.current === null);
    sincronizar();
    const intervalo = window.setInterval(sincronizar, 2500);
    return () => {
      ativo = false;
      window.clearInterval(intervalo);
    };
  }, [token, meuId, aberto, conversaAtual?._id]);

  useEffect(() => {
    if (!aberto || !conversaAtual?._id) return undefined;
    let ativo = true;
    setCarregandoMensagens(true);
    setErro("");
    ChatService.listarMensagens(conversaAtual._id, token)
      .then((dados) => {
        if (ativo) {
          dados.forEach((mensagem) => mensagensNotificadasRef.current.add(String(mensagem._id)));
          historicoInicializadoRef.current.add(conversaAtual._id);
          setMensagens((atuais) => {
            const porId = new Map(atuais.map((mensagem) => [mensagem._id, mensagem]));
            dados.forEach((mensagem) => {
              if (!porId.has(mensagem._id)) porId.set(mensagem._id, mensagem);
            });
            return [...porId.values()].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          });
        }
      })
      .catch((error) => {
        if (ativo) setErro(error.message || "Não foi possível carregar as mensagens.");
      })
      .finally(() => {
        if (ativo) setCarregandoMensagens(false);
      });
    return () => {
      ativo = false;
    };
  }, [aberto, conversaAtual?._id, token]);

  useEffect(() => {
    const removerListener = onChatMensagem((mensagem) => {
      const conversaId = idUsuario(mensagem.conversa);
      const mensagemMinha = idUsuario(mensagem.remetente) === meuId;
      const conversaVisivel = conversaAtual?._id === conversaId && aberto;
      const mensagemId = String(mensagem._id || "");
      const mensagemJaRecebida = mensagemId && mensagensNotificadasRef.current.has(mensagemId);

      if (mensagemId) {
        mensagensNotificadasRef.current.add(mensagemId);
        if (ultimasMensagensRef.current) ultimasMensagensRef.current.set(conversaId, mensagemId);
      }
      if (!mensagemMinha && !mensagemJaRecebida) {
        notificarMensagem(mensagem, !conversaVisivel);
      }

      setConversas((atuais) => {
        const existente = atuais.find((item) => item._id === conversaId);
        if (!existente) {
          ChatService.listarConversas(token)
            .then(setConversas)
            .catch(() => {});
          return atuais;
        }
        return atuais
          .map((item) => item._id === conversaId
            ? { ...item, ultimaMensagemTexto: textoPrevia(mensagem), ultimaMensagemEm: mensagem.createdAt }
            : item)
          .sort((a, b) => new Date(b.ultimaMensagemEm || b.updatedAt || 0) - new Date(a.ultimaMensagemEm || a.updatedAt || 0));
      });

      if (conversaAtual?._id === conversaId && aberto) {
        setMensagens((atuais) => atuais.some((item) => item._id === mensagem._id)
          ? atuais
          : [...atuais, mensagem]);
      }
    });
    return removerListener;
  }, [token, conversaAtual?._id, aberto, meuId]);

  useEffect(() => {
    fimMensagensRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensagens, aberto, conversaAtual?._id]);

  async function abrirConversa(contato) {
    setErro("");
    setAvisoOperacao("");
    setAudioParaEncaminhar("");
    try {
      const conversa = await ChatService.abrirConversa(idUsuario(contato), token);
      setConversaAtual(conversa);
      setMensagens([]);
      setNaoLidas(0);
      setConversas((atuais) => [conversa, ...atuais.filter((item) => item._id !== conversa._id)]);
    } catch (error) {
      setErro(error.message || "Não foi possível abrir a conversa.");
    }
  }

  function selecionarArquivo(event) {
    const arquivo = event.target.files?.[0];
    event.target.value = "";
    if (!arquivo) return;
    setArquivoSelecionado(null);
    const extensao = arquivo.name.toLowerCase().match(/\.[^.]+$/)?.[0];
    if (!EXTENSOES_PERMITIDAS.has(extensao)) {
      setErro("Formato não permitido. Você pode anexar documentos, imagens, áudios ou vídeos compatíveis.");
      return;
    }
    if (arquivo.size > MAX_TAMANHO_ARQUIVO) {
      setErro("O anexo deve ter no máximo 10 MB.");
      return;
    }
    setErro("");
    setArquivoSelecionado(arquivo);
  }

  function inserirEmoji(emoji) {
    setTexto((atual) => atual.length + emoji.length > 2000 ? atual : `${atual}${emoji}`);
    setEmojiAberto(false);
  }

  async function encaminharAudio(mensagem, contato) {
    if (encaminhandoId) return;
    setEncaminhandoId(String(mensagem._id));
    setErro("");
    try {
      await ChatService.encaminharAudio(conversaAtual._id, mensagem._id, idUsuario(contato), token);
      setAudioParaEncaminhar("");
      setAvisoOperacao(`Áudio encaminhado para ${contato.nome || contato.email}.`);
      ChatService.listarConversas(token).then(setConversas).catch(() => {});
    } catch (error) {
      setErro(error.message || "Não foi possível encaminhar o áudio.");
    } finally {
      setEncaminhandoId("");
    }
  }

  async function enviar(event) {
    event.preventDefault();
    const textoLimpo = texto.trim();
    if ((!textoLimpo && !arquivoSelecionado) || !conversaAtual || enviando) return;
    setEnviando(true);
    setErro("");
    try {
      const arquivo = arquivoSelecionado ? {
        nome: arquivoSelecionado.name,
        mimeType: arquivoSelecionado.type,
        dados: await lerArquivoComoDataUrl(arquivoSelecionado),
      } : null;
      const dadosMensagem = { texto: textoLimpo, ...(arquivo ? { arquivo } : {}) };
      const mensagem = await ChatService.enviarMensagem(conversaAtual._id, dadosMensagem, token);
      setMensagens((atuais) => atuais.some((item) => item._id === mensagem._id)
        ? atuais
        : [...atuais, mensagem]);
      setTexto("");
      setArquivoSelecionado(null);
      setEmojiAberto(false);
      setAvisoOperacao("");
      setConversas((atuais) => atuais
        .map((item) => item._id === conversaAtual._id
          ? { ...item, ultimaMensagemTexto: textoPrevia(mensagem), ultimaMensagemEm: mensagem.createdAt }
          : item)
        .sort((a, b) => new Date(b.ultimaMensagemEm || b.updatedAt || 0) - new Date(a.ultimaMensagemEm || a.updatedAt || 0)));
    } catch (error) {
      setErro(error.message || "Não foi possível enviar a mensagem.");
    } finally {
      setEnviando(false);
    }
  }

  function fecharConversa() {
    setConversaAtual(null);
    setMensagens([]);
    setArquivoSelecionado(null);
    setAudioParaEncaminhar("");
    setErro("");
  }

  const contatosIniciados = new Set(conversas.map((conversa) => idUsuario(conversa.contato)));

  return (
    <div className="chat-interno-widget">
      <button
        type="button"
        className="chat-interno-toggle"
        aria-expanded={aberto}
        aria-label={aberto ? "Fechar chat interno" : "Abrir chat interno"}
        onClick={() => {
          if (!aberto && "Notification" in window && window.Notification.permission === "default") {
            window.Notification.requestPermission().catch(() => {});
          }
          setAberto((valor) => !valor);
          setNaoLidas(0);
        }}
      >
        <span aria-hidden="true">✉</span>
        <span>Chat interno</span>
        {naoLidas > 0 && <strong className="chat-interno-badge">{naoLidas}</strong>}
      </button>

      {avisoMensagem && (
        <button
          type="button"
          className="chat-aviso-mensagem"
          aria-live="polite"
          onClick={() => {
            setAberto(true);
            const conversa = conversas.find((item) => item._id === avisoMensagem.conversaId);
            if (conversa) {
              setConversaAtual(conversa);
              setNaoLidas(0);
            }
          }}
        >
          <strong>Mensagem de {avisoMensagem.nome}</strong>
          <span>{avisoMensagem.texto}</span>
        </button>
      )}

      {aberto && (
        <section className="chat-interno-painel" aria-label="Chat interno">
          <header className="chat-interno-cabecalho">
            {conversaAtual ? (
              <>
                <button type="button" className="chat-voltar" onClick={fecharConversa} aria-label="Voltar às conversas">‹</button>
                <div className="chat-titulo-contato">
                  <strong>{conversaAtual.contato?.nome || conversaAtual.contato?.email || "Conversa"}</strong>
                  <span>{conversaAtual.contato?.email || "Usuário cadastrado"}</span>
                </div>
              </>
            ) : (
              <div className="chat-titulo-contato">
                <strong>Comunicação interna</strong>
                <span>Mensagens privadas entre usuários</span>
              </div>
            )}
            <button type="button" className="chat-fechar" onClick={() => setAberto(false)} aria-label="Fechar">×</button>
          </header>

          {erro && <p className="chat-erro" role="alert">{erro}</p>}

          {!conversaAtual ? (
            <div className="chat-contatos-conteudo">
              {conversas.length > 0 && (
                <>
                  <h3>Conversas</h3>
                  {conversas.map((conversa) => (
                    <button
                      type="button"
                      className="chat-contato"
                      key={conversa._id}
                      onClick={() => abrirConversa(conversa.contato)}
                    >
                      <span className="chat-avatar">{(conversa.contato?.nome || "?").slice(0, 1).toUpperCase()}</span>
                      <span className="chat-contato-info">
                        <strong>{conversa.contato?.nome || conversa.contato?.email || "Usuário"}</strong>
                        <small>{conversa.ultimaMensagemTexto || "Conversa iniciada"}</small>
                      </span>
                      <time>{formatarHorario(conversa.ultimaMensagemEm)}</time>
                    </button>
                  ))}
                </>
              )}
              <h3>Usuários cadastrados</h3>
              {carregandoConversas && <p className="chat-estado">Carregando conversas...</p>}
              {contatos.length === 0 && <p className="chat-estado">Nenhum outro usuário cadastrado.</p>}
              {contatos.map((contato) => (
                <button type="button" className="chat-contato" key={idUsuario(contato)} onClick={() => abrirConversa(contato)}>
                  <span className="chat-avatar">{(contato.nome || "?").slice(0, 1).toUpperCase()}</span>
                  <span className="chat-contato-info">
                    <strong>{contato.nome || contato.email}</strong>
                    <small>{contato.email}</small>
                  </span>
                  {contatosIniciados.has(idUsuario(contato)) && <span className="chat-ja-iniciada">Abrir</span>}
                </button>
              ))}
            </div>
          ) : (
            <>
              {avisoOperacao && <p className="chat-sucesso" role="status">{avisoOperacao}</p>}
              <div className="chat-mensagens" aria-live="polite">
                {carregandoMensagens && <p className="chat-estado">Carregando mensagens...</p>}
                {!carregandoMensagens && mensagens.length === 0 && <p className="chat-estado">Inicie a conversa enviando uma mensagem.</p>}
                {mensagens.map((mensagem) => {
                  const minha = idUsuario(mensagem.remetente) === meuId;
                  const mensagemId = String(mensagem._id);
                  const audio = mensagem.anexo?.mimeType?.startsWith("audio/");
                  return (
                    <article className={`chat-mensagem ${minha ? "chat-mensagem-minha" : "chat-mensagem-outra"}`} key={mensagem._id}>
                      {mensagem.encaminhada && <small className="chat-mensagem-encaminhada">↪ Áudio encaminhado</small>}
                      {mensagem.texto && <p>{mensagem.texto}</p>}
                      {mensagem.anexo && (
                        <AnexoMensagem
                          anexo={mensagem.anexo}
                          conversaId={conversaAtual._id}
                          mensagemId={mensagem._id}
                          token={token}
                        />
                      )}
                      {audio && (
                        <div className="chat-encaminhamento">
                          <button
                            type="button"
                            className="chat-encaminhar-botao"
                            onClick={() => setAudioParaEncaminhar((atual) => atual === mensagemId ? "" : mensagemId)}
                          >
                            Encaminhar áudio
                          </button>
                          {audioParaEncaminhar === mensagemId && (
                            <div className="chat-encaminhar-lista">
                              <strong>Enviar para:</strong>
                              {contatos.length === 0 && <span>Nenhum outro contato disponível.</span>}
                              {contatos.map((contato) => (
                                <button
                                  type="button"
                                  key={idUsuario(contato)}
                                  disabled={Boolean(encaminhandoId)}
                                  onClick={() => encaminharAudio(mensagem, contato)}
                                >
                                  {encaminhandoId === mensagemId ? "Encaminhando..." : (contato.nome || contato.email)}
                                </button>
                              ))}
                              <button type="button" className="chat-encaminhar-cancelar" onClick={() => setAudioParaEncaminhar("")}>Cancelar</button>
                            </div>
                          )}
                        </div>
                      )}
                      <time>{formatarHorario(mensagem.createdAt)}</time>
                    </article>
                  );
                })}
                <div ref={fimMensagensRef} />
              </div>
              <form className="chat-compositor" onSubmit={enviar}>
                {arquivoSelecionado && (
                  <div className="chat-arquivo-selecionado">
                    <span>📎 {arquivoSelecionado.name} · {formatarTamanho(arquivoSelecionado.size)}</span>
                    <button type="button" aria-label="Remover anexo" onClick={() => setArquivoSelecionado(null)}>×</button>
                  </div>
                )}
                <div className="chat-compositor-linha">
                  <div className="chat-compositor-acoes">
                    <button type="button" className="chat-compositor-icone" aria-label="Anexar documento, áudio ou vídeo" title="Anexar arquivo" onClick={() => inputArquivoRef.current?.click()}>📎</button>
                    <button type="button" className="chat-compositor-icone" aria-label="Abrir seletor de emojis" title="Emojis" aria-expanded={emojiAberto} onClick={() => setEmojiAberto((abertoAntes) => !abertoAntes)}>☺</button>
                  </div>
                  <textarea
                    value={texto}
                    onChange={(event) => setTexto(event.target.value)}
                    rows={2}
                    maxLength={2000}
                    aria-label="Mensagem"
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    placeholder="Escreva uma mensagem..."
                  />
                  <button type="submit" disabled={(!texto.trim() && !arquivoSelecionado) || enviando}>
                    {enviando ? "Enviando..." : "Enviar"}
                  </button>
                </div>
                {emojiAberto && (
                  <div className="chat-seletor-emoji" role="group" aria-label="Escolha um emoji">
                    {EMOJIS.map((emoji) => (
                      <button type="button" key={emoji} aria-label={`Inserir ${emoji}`} onClick={() => inserirEmoji(emoji)}>{emoji}</button>
                    ))}
                  </div>
                )}
                <input
                  ref={inputArquivoRef}
                  className="chat-entrada-arquivo"
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.rtf,.odt,.ods,.odp,.zip,.png,.jpg,.jpeg,.gif,.webp,.mp3,.wav,.m4a,.aac,.ogg,.opus,.webm,.mp4,.mov"
                  onChange={selecionarArquivo}
                  tabIndex={-1}
                  aria-hidden="true"
                />
              </form>
            </>
          )}
        </section>
      )}
    </div>
  );
}
