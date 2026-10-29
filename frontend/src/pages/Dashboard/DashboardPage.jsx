import { useEffect, useState, useCallback, useRef } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ChamadoService, ReuniaoService, UsuarioService } from "../../services/api";
import {
  conectarSocket,
  onNovoChamado,
  onChamadoAtualizado,
  onChamadoRemovido,
  onNovaReuniao,
  removerTodosListeners,
  desconectarSocket,
} from "../../services/socket";
import KanbanColumn from "./components/KanbanColumn";
import NovoChamadoModal from "./components/NovoChamadoModal";
import RelatoResolucaoModal from "./components/RelatoResolucaoModal";
import DetalhesChamadoModal from "./components/DetalhesChamadoModal";
import AgendaReunioesModal from "./components/AgendaReunioesModal";
import "./DashboardPage.css";

const COLUNAS = [
  { status: "aberto", titulo: "Aberto" },
  { status: "em_andamento", titulo: "Em andamento" },
  { status: "resolvido", titulo: "Resolvido" },
];

// Contexto de Àudio global para reutilização
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

// Tom de notificação em Web Audio API
function tocarSomNotificacao() {
  try {
    const ctx = getAudioContext();
    
    function tocarTom(frequencia, inicio, duracao, volume = 0.3) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.value = frequencia;
      
      gain.gain.setValueAtTime(0, ctx.currentTime + inicio);
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + inicio + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + inicio + duracao);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime + inicio + duracao);
    }

    // Som de notificação: Ding-dong alegre
    tocarTom(660, 0, 0.2, 0.4);
    tocarTom(880, 0.15, 0.4, 0.4);
  } catch (e) {
    console.warn("[Som] Não foi possível tocar notificação:", e);
  }
}

// Som para atualização (tom mais suave)
function tocarSomAtualizacao() {
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.value = 440;
    
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  } catch (e) {
    console.warn("[Som] Não foi possível tocar notificação:", e);
  }
}

function escaparXml(valor) {
  return String(valor ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function dataParaFiltroLocal(valor) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function dataParaTexto(valor) {
  if (!valor) return "";
  const [ano, mes, dia] = valor.split("-");
  return `${dia}/${mes}/${ano}`;
}

function exibirAlertaReuniao(titulo, mensagem, atualizarToast) {
  atualizarToast(mensagem);
  window.setTimeout(() => atualizarToast(""), 8000);
  try {
    if ("Notification" in window && window.Notification.permission !== "denied") {
      new window.Notification(titulo, { body: mensagem });
    }
  } catch {
    // O aviso no painel continua disponível se o Windows não permitir a notificação nativa.
  }
}

function calcularCrc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function criarArquivoXlsx(arquivos) {
  const encoder = new TextEncoder();
  const partesLocais = [];
  const partesCentrais = [];
  let deslocamentoLocal = 0;

  for (const [nome, conteudo] of arquivos) {
    const nomeBytes = encoder.encode(nome);
    const dados = encoder.encode(conteudo);
    const crc = calcularCrc32(dados);
    const cabecalhoLocal = new Uint8Array(30 + nomeBytes.length);
    const localView = new DataView(cabecalhoLocal.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, dados.length, true);
    localView.setUint32(22, dados.length, true);
    localView.setUint16(26, nomeBytes.length, true);
    cabecalhoLocal.set(nomeBytes, 30);
    partesLocais.push(cabecalhoLocal, dados);

    const cabecalhoCentral = new Uint8Array(46 + nomeBytes.length);
    const centralView = new DataView(cabecalhoCentral.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, dados.length, true);
    centralView.setUint32(24, dados.length, true);
    centralView.setUint16(28, nomeBytes.length, true);
    centralView.setUint32(42, deslocamentoLocal, true);
    cabecalhoCentral.set(nomeBytes, 46);
    partesCentrais.push(cabecalhoCentral);

    deslocamentoLocal += cabecalhoLocal.length + dados.length;
  }

  const tamanhoCentral = partesCentrais.reduce((total, parte) => total + parte.length, 0);
  const fimZip = new Uint8Array(22);
  const fimView = new DataView(fimZip.buffer);
  fimView.setUint32(0, 0x06054b50, true);
  fimView.setUint16(8, arquivos.length, true);
  fimView.setUint16(10, arquivos.length, true);
  fimView.setUint32(12, tamanhoCentral, true);
  fimView.setUint32(16, deslocamentoLocal, true);

  return new Blob([...partesLocais, ...partesCentrais, fimZip], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export default function DashboardPage() {
  const { usuario, token, sair, carregando: carregandoSessao } = useAuth();
  const [chamados, setChamados] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [relatorioUsuarioEmail, setRelatorioUsuarioEmail] = useState("");
  const [relatorioDataInicial, setRelatorioDataInicial] = useState("");
  const [relatorioDataFinal, setRelatorioDataFinal] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [agendaAberta, setAgendaAberta] = useState(false);
  const [chamadoParaResolver, setChamadoParaResolver] = useState(null);
  const [chamadoParaExcluir, setChamadoParaExcluir] = useState(null);
  const [excluindoChamado, setExcluindoChamado] = useState(false);
  const [chamadoEmDetalhes, setChamadoEmDetalhes] = useState(null);
  const [redirecionandoDestinatario, setRedirecionandoDestinatario] = useState(false);
  const [chamadoArrastado, setChamadoArrastado] = useState(null);
  const [novaNotificacao, setNovaNotificacao] = useState("");
  const [contadorNovos, setContadorNovos] = useState(0);
  const audioUnlocked = useRef(false);
  const chamadosCarregadosRef = useRef(false);
  const verificandoReunioesRef = useRef(false);

  const isAdmin = usuario?.perfil === "admin" || usuario?.perfil === "tecnico";
  const eAdministrador = usuario?.perfil === "admin";
  const emailUsuarioAtual = usuario?.email?.trim().toLowerCase();
  const idUsuarioAtual = String(usuario?.id || usuario?._id || "");
  const podeMoverChamado = (chamado) => {
    if (isAdmin) return true;
    if (!idUsuarioAtual || !chamado) return false;
    return [chamado.solicitante, chamado.destinatario].some((participante) => {
      const idParticipante = participante?._id || participante?.id || participante;
      return String(idParticipante ?? "") === idUsuarioAtual;
    });
  };
  const chamadosDoRelatorio = chamados.filter((chamado) => {
    const participaDoFiltroUsuario = !relatorioUsuarioEmail ||
      [chamado.solicitante?.email, chamado.destinatario?.email].some(
        (email) => email?.trim().toLowerCase() === relatorioUsuarioEmail
      );
    const dataChamado = dataParaFiltroLocal(chamado.createdAt);
    const dentroDoPeriodo = (!relatorioDataInicial || dataChamado >= relatorioDataInicial) &&
      (!relatorioDataFinal || dataChamado <= relatorioDataFinal);
    return participaDoFiltroUsuario && dentroDoPeriodo;
  });
  const usuarioFiltroRelatorio = usuarios.find(
    (item) => item.email?.trim().toLowerCase() === relatorioUsuarioEmail
  );
  const textoFiltroRelatorio = usuarioFiltroRelatorio
    ? `${usuarioFiltroRelatorio.nome} (${usuarioFiltroRelatorio.email})`
    : "Todos os usuários";
  const textoPeriodoRelatorio = relatorioDataInicial || relatorioDataFinal
    ? `${relatorioDataInicial ? dataParaTexto(relatorioDataInicial) : "início"} a ${relatorioDataFinal ? dataParaTexto(relatorioDataFinal) : "hoje"}`
    : "Todo o período";

  const carregarChamados = useCallback(async () => {
    try {
      setErro("");
      const dados = await ChamadoService.listar(token);
      setChamados(dados);
      chamadosCarregadosRef.current = true;
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, [token]);

  const verificarNotificacoesReunioes = useCallback(async () => {
    if (!token || verificandoReunioesRef.current) return;
    verificandoReunioesRef.current = true;
    try {
      const convites = await ReuniaoService.listarConvitesPendentes(token);
      for (const reuniao of convites) {
        const resultado = await ReuniaoService.marcarConviteNotificado(reuniao._id, token);
        if (!resultado.notificada) continue;
        const horario = new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
        }).format(new Date(reuniao.dataHora));
        const organizador = reuniao.criadoPor?.nome ? ` por ${reuniao.criadoPor.nome}` : "";
        exibirAlertaReuniao(
          "Novo convite para reunião",
          `Você foi convidado${organizador} para “${reuniao.titulo}” em ${horario}.`,
          setNovaNotificacao
        );
      }

      const antecipados = await ReuniaoService.listarPendentesAntecipados(token);
      for (const reuniao of antecipados) {
        const resultado = await ReuniaoService.marcarAntecipadaNotificada(reuniao._id, token);
        if (!resultado.notificada) continue;
        const horarioInicio = new Date(reuniao.dataHora);
        const minutosRestantes = Math.max(1, Math.ceil((horarioInicio.getTime() - Date.now()) / 60_000));
        const horario = new Intl.DateTimeFormat("pt-BR", { timeStyle: "short" }).format(horarioInicio);
        const unidade = minutosRestantes === 1 ? "minuto" : "minutos";
        exibirAlertaReuniao(
          "Reunião em breve",
          `A reunião “${reuniao.titulo}” começa em ${minutosRestantes} ${unidade} (às ${horario}).`,
          setNovaNotificacao
        );
      }

      const pendentes = await ReuniaoService.listarPendentes(token);
      for (const reuniao of pendentes) {
        const resultado = await ReuniaoService.marcarNotificada(reuniao._id, token);
        if (!resultado.notificada) continue;

        const horario = new Intl.DateTimeFormat("pt-BR", {
          dateStyle: "short",
          timeStyle: "short",
        }).format(new Date(reuniao.dataHora));
        exibirAlertaReuniao(
          "Lembrete de reunião",
          `Reunião: ${reuniao.titulo} — agendada para ${horario}.`,
          setNovaNotificacao
        );
      }
    } catch (error) {
      console.warn("Não foi possível verificar os lembretes de reunião:", error.message);
    } finally {
      verificandoReunioesRef.current = false;
    }
  }, [token]);

  useEffect(() => {
    if (!token) return undefined;
    verificarNotificacoesReunioes();
    const intervalo = window.setInterval(verificarNotificacoesReunioes, 10_000);
    return () => window.clearInterval(intervalo);
  }, [token, verificarNotificacoesReunioes]);

  // Desbloquear Àudio na primeira interação do usuário
  const desbloquearAudio = useCallback(() => {
    if (!audioUnlocked.current) {
      try {
        getAudioContext();
        audioUnlocked.current = true;
        console.log("[ÃƒÂudio] Sistema de som desbloqueado.");
      } catch (e) {
        console.error("[ÃƒÂudio] Falha ao desbloquear:", e);
      }
    }
  }, []);

  useEffect(() => {
    // Desbloquear Àudio em qualquer clique ou toque
    window.addEventListener("click", desbloquearAudio, { once: true });
    window.addEventListener("keydown", desbloquearAudio, { once: true });
    return () => {
      window.removeEventListener("click", desbloquearAudio);
      window.removeEventListener("keydown", desbloquearAudio);
    };
  }, [desbloquearAudio]);

  useEffect(() => {
    if (!token) return undefined;
    let ativo = true;
    UsuarioService.listar(token)
      .then((dados) => {
        if (ativo) setUsuarios(dados);
      })
      .catch((e) => {
        if (ativo) setErro(e.message);
      });
    return () => {
      ativo = false;
    };
  }, [token]);

  useEffect(() => {
    if (token) {
      carregarChamados();

      // Conectar ao Socket.io
      conectarSocket(token);

      // Escutar novo chamado
      onNovoChamado((novoChamado) => {
        setChamados((atual) => {
          if (atual.find((c) => c._id === novoChamado._id)) return atual;
          return [novoChamado, ...atual];
        });

        if (
          isAdmin ||
          novoChamado.solicitante?.email?.trim().toLowerCase() === emailUsuarioAtual ||
          novoChamado.destinatario?.email?.trim().toLowerCase() === emailUsuarioAtual
        ) {
          tocarSomNotificacao();
          setContadorNovos((prev) => prev + 1);
          setNovaNotificacao(`Novo chamado: ${novoChamado.titulo}`);
          setTimeout(() => setNovaNotificacao(""), 5000);
        }
      });

      // Escutar chamado atualizado
      onChamadoAtualizado((chamadoAtualizado) => {
        setChamados((atual) =>
          atual.map((c) => (c._id === chamadoAtualizado._id ? chamadoAtualizado : c))
        );

        const participanteAtualizado = [
          chamadoAtualizado.solicitante?.email,
          chamadoAtualizado.destinatario?.email,
        ].some((email) => email?.trim().toLowerCase() === emailUsuarioAtual);
        if (isAdmin || participanteAtualizado) {
          tocarSomAtualizacao();
        }
      });

      // Escutar chamado removido
      onChamadoRemovido(({ id }) => {
        setChamados((atual) => atual.filter((c) => c._id !== id));
      });

      onNovaReuniao((reuniao) => {
        ReuniaoService.marcarConviteNotificado(reuniao._id, token)
          .then((resultado) => {
            if (!resultado.notificada) return;
            const horario = new Intl.DateTimeFormat("pt-BR", {
              dateStyle: "short",
              timeStyle: "short",
            }).format(new Date(reuniao.dataHora));
            const organizador = reuniao.criadoPor?.nome ? ` por ${reuniao.criadoPor.nome}` : "";
            exibirAlertaReuniao(
              "Novo convite para reunião",
              `Você foi convidado${organizador} para “${reuniao.titulo}” em ${horario}.`,
              setNovaNotificacao
            );
          })
          .catch((error) => console.warn("Não foi possível confirmar o convite:", error.message));
      });

      // Polling de segurança a cada 4 segundos para garantir atualização instantanea sem F5
      const intervalo = setInterval(async () => {
        try {
          const dados = await ChamadoService.listar(token);
          const jaCarregados = chamadosCarregadosRef.current;
          chamadosCarregadosRef.current = true;
          setChamados((atual) => {
            if (jaCarregados && dados.length > atual.length) {
              tocarSomNotificacao();
              setContadorNovos((prev) => prev + (dados.length - atual.length));
              setNovaNotificacao(`Novo chamado recebido!`);
              setTimeout(() => setNovaNotificacao(""), 5000);
            }
            return dados;
          });
        } catch (e) {
          // Ignorar erros silenciosos no polling de fundo
        }
      }, 4000);

      return () => {
        clearInterval(intervalo);
        removerTodosListeners();
        desconectarSocket();
      };
    }
  }, [token, carregarChamados, isAdmin, emailUsuarioAtual]);

  if (carregandoSessao) {
    return (
      <main
        role="status"
        aria-live="polite"
        style={{ minHeight: "100vh", display: "grid", placeItems: "center", color: "#64748b" }}
      >
        Restaurando sua sessão…
      </main>
    );
  }

  if (!usuario) {
    return <Navigate to="/" replace />;
  }

  async function gerarRelatorioPDF() {
    const abertos = chamadosDoRelatorio.filter(c => c.status === 'aberto').length;
    const emAndamento = chamadosDoRelatorio.filter(c => c.status === 'em_andamento').length;
    const resolvidos = chamadosDoRelatorio.filter(c => c.status === 'resolvido').length;
    const total = chamadosDoRelatorio.length;
    const dataAtual = new Date().toLocaleDateString('pt-BR');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Relatório de Chamados - Formis Instrumentos de Medição</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          h1 { color: #155f9e; margin-bottom: 5px; }
          .subtitle { color: #666; font-size: 14px; margin-bottom: 20px; }
          .stats { display: flex; gap: 20px; margin-bottom: 25px; }
          .stat-card { border: 1px solid #ccc; padding: 15px; border-radius: 6px; flex: 1; text-align: center; }
          .stat-card h3 { margin: 0 0 5px 0; font-size: 14px; color: #555; }
          .stat-card p { margin: 0; font-size: 22px; font-weight: bold; color: #155f9e; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
          th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
          th { background-color: #e7eff6; color: #12385d; }
          tr:nth-child(even) { background-color: #f9fafb; }
          .badge { padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
          .badge-aberto { background: #fee2e2; color: #991b1b; }
          .badge-andamento { background: #dbeafe; color: #1e40af; }
          .badge-resolvido { background: #dcfce7; color: #166534; }
        </style>
      </head>
      <body>
        <h1>Relatório de Chamados — Formis</h1>
        <div class="subtitle">Sistema Formis de Chamados - Gerado em ${dataAtual} por ${escaparXml(usuario.nome)} - Usuário: ${escaparXml(textoFiltroRelatorio)} - Período: ${escaparXml(textoPeriodoRelatorio)}</div>

        <div class="stats">
          <div class="stat-card">
            <h3>Total de Chamados</h3>
            <p id="total">${total}</p>
          </div>
          <div class="stat-card">
            <h3>Abertos</h3>
            <p id="abertos">${abertos}</p>
          </div>
          <div class="stat-card">
            <h3>Em Andamento</h3>
            <p id="andamento">${emAndamento}</p>
          </div>
          <div class="stat-card">
            <h3>Resolvidos</h3>
            <p id="resolvidos">${resolvidos}</p>
          </div>
        </div>

        <h2>Detalhamento dos Chamados</h2>
        <table>
          <thead><tr><th>Data de abertura</th><th>Tipo</th><th>Data da ocorrencia</th><th>Titulo / Descricao</th><th>Solicitante</th><th>Destinatario</th><th>Prioridade</th><th>Status</th><th>Relato da resolucao</th></tr></thead>
          <tbody>
            ${chamadosDoRelatorio.map(c => `
              <tr>
                <td>${new Date(c.createdAt).toLocaleDateString('pt-BR')}</td>
                <td>${escaparXml(c.tipoChamado || 'N/D')}</td>
                <td>${escaparXml(c.dataOcorrencia ? dataParaTexto(c.dataOcorrencia) : 'N/D')}</td>
                <td><b>${escaparXml(c.titulo)}</b><br><small style="color:#666">${escaparXml(c.descricao.substring(0, 60))}...</small></td>
                <td>${escaparXml(c.solicitante?.nome || 'N/D')}</td>
                <td>${escaparXml(c.destinatario?.nome || 'N/D')}</td>
                <td>${escaparXml(c.prioridade || 'normal')}</td>
                <td><span class="badge badge-${c.status === 'aberto' ? 'aberto' : c.status === 'em_andamento' ? 'andamento' : 'resolvido'}">${c.status.toUpperCase()}</span></td>
                <td>${escaparXml(c.relatoResolucao || String.fromCharCode(8212))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

      </body>
      </html>
    `;
    if (!window.suporteDesktop?.salvarRelatorioPdf) {
      setErro('O download direto de PDF está disponível no aplicativo desktop.');
      return;
    }

    try {
      await window.suporteDesktop.salvarRelatorioPdf(html);
    } catch (e) {
      setErro(e.message || 'Não foi possível salvar o relatório em PDF.');
    }
  }

  function gerarRelatorioExcel() {
    const statusLabels = {
      aberto: "Aberto",
      em_andamento: "Em andamento",
      resolvido: "Resolvido",
    };
    const linhas = [
      ["Relatório de Chamados"],
      [`Gerado em ${new Date().toLocaleString("pt-BR")} por ${usuario.nome} — Usuário: ${textoFiltroRelatorio} — Período: ${textoPeriodoRelatorio}`],
      [],
      ["Data de abertura", "Tipo de chamado", "Data da ocorrência", "Título", "Descrição", "Solicitante", "Destinatário", "Prioridade", "Status", "Relato da resolução"],
      ...chamadosDoRelatorio.map((chamado) => [
        chamado.createdAt ? new Date(chamado.createdAt).toLocaleDateString("pt-BR") : "",
        chamado.tipoChamado || "N/D",
        chamado.dataOcorrencia ? dataParaTexto(chamado.dataOcorrencia) : "N/D",
        chamado.titulo || "",
        chamado.descricao || "",
        chamado.solicitante?.nome || "N/D",
        chamado.destinatario?.nome || "N/D",
        chamado.prioridade || "normal",
        statusLabels[chamado.status] || chamado.status || "",
        chamado.relatoResolucao || "—",
      ]),
    ];
    const ultimaLinha = Math.max(4, linhas.length);
    const linhasXml = linhas.map((linha, indice) => {
      const numeroLinha = indice + 1;
      const celulas = linha.map((valor, indiceColuna) => {
        const referencia = `${String.fromCharCode(65 + indiceColuna)}${numeroLinha}`;
        return `<c r="${referencia}" t="inlineStr"><is><t xml:space="preserve">${escaparXml(valor)}</t></is></c>`;
      }).join("");
      return `<row r="${numeroLinha}">${celulas}</row>`;
    }).join("");
    const planilhaXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:J${ultimaLinha}"/><sheetViews><sheetView workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols><col min="1" max="1" width="16" customWidth="1"/><col min="2" max="3" width="24" customWidth="1"/><col min="4" max="5" width="36" customWidth="1"/><col min="6" max="7" width="24" customWidth="1"/><col min="8" max="9" width="20" customWidth="1"/><col min="10" max="10" width="40" customWidth="1"/></cols><sheetData>${linhasXml}</sheetData><autoFilter ref="A4:J${ultimaLinha}"/></worksheet>`;
    const arquivos = [
      ["[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`],
      ["_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
      ["xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Chamados" sheetId="1" r:id="rId1"/></sheets></workbook>`],
      ["xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`],
      ["xl/worksheets/sheet1.xml", planilhaXml],
    ];
    const blob = criarArquivoXlsx(arquivos);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dataArquivo = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `relatorio-chamados-${dataArquivo}.xlsx`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function aoCriarChamado(dadosNovoChamado) {
    try {
      const novo = await ChamadoService.criar(dadosNovoChamado, token);
      // O socket vai atualizar para todos, mas podemos atualizar localmente para feedback imediato
      setChamados((atual) => {
        if (atual.find((c) => c._id === novo._id)) return atual;
        return [novo, ...atual];
      });
      setModalAberto(false);
    } catch (e) {
      setErro(e.message);
      throw e;
    }
  }

  function aoIniciarArrasto(e, chamado) {
    if (!podeMoverChamado(chamado)) {
      e.preventDefault();
      return;
    }
    setChamadoArrastado(chamado);
    e.dataTransfer.effectAllowed = "move";
  }

  async function aoSoltarNaColuna(novoStatus) {
    if (!chamadoArrastado || chamadoArrastado.status === novoStatus) return;

    const chamadoMovido = chamadoArrastado;
    setChamadoArrastado(null);

    if (!podeMoverChamado(chamadoMovido)) {
      setErro("Somente o solicitante ou o destinatário podem mover este chamado.");
      return;
    }

    if (!isAdmin && novoStatus === "aberto") {
      setErro("Participantes podem mover o chamado para andamento ou resolvido.");
      return;
    }

    if (!isAdmin && chamadoMovido.status === "resolvido") {
      setErro("Um chamado resolvido não pode ser reaberto por participantes.");
      return;
    }

    if (novoStatus === "resolvido") {
      setChamadoParaResolver(chamadoMovido);
      return;
    }

    try {
      await atualizarStatus(chamadoMovido, novoStatus);
    } catch {
      // atualizarStatus já apresenta o erro e restaura o estado anterior do card.
    }
  }

  async function atualizarStatus(chamado, novoStatus, relatoResolucao) {
    const idMovido = chamado._id;

    // atualização otimista
    setChamados((atual) =>
      atual.map((c) =>
        c._id === idMovido
          ? {
              ...c,
              status: novoStatus,
              ...(relatoResolucao ? { relatoResolucao } : {}),
            }
          : c
      )
    );

    try {
      const atualizado = await ChamadoService.atualizarStatus(
        idMovido,
        novoStatus,
        token,
        relatoResolucao
      );
      setChamados((atual) =>
        atual.map((item) => (item._id === idMovido ? atualizado : item))
      );
    } catch (e) {
      setErro(e.message);
      setChamados((atual) => atual.map((c) => (c._id === idMovido ? chamado : c)));
      throw e;
    }
  }

  async function aoRedirecionarDestinatario(chamadoId, destinatarioId) {
    if (redirecionandoDestinatario) return;

    setRedirecionandoDestinatario(true);
    try {
      const atualizado = await ChamadoService.atualizarDestinatario(
        chamadoId,
        destinatarioId,
        token
      );
      setChamados((atual) =>
        isAdmin
          ? atual.map((item) => (item._id === chamadoId ? atualizado : item))
          : atual.filter((item) => item._id !== chamadoId)
      );

      if (isAdmin) {
        setChamadoEmDetalhes(atualizado);
      } else {
        setChamadoEmDetalhes(null);
      }

      setNovaNotificacao(
        `Chamado redirecionado para ${atualizado.destinatario?.nome || "o novo destinatário"}.`
      );
      window.setTimeout(() => setNovaNotificacao(""), 5000);
      return atualizado;
    } catch (e) {
      setErro(e.message || "Não foi possível redirecionar o chamado.");
      throw e;
    } finally {
      setRedirecionandoDestinatario(false);
    }
  }

  async function aoConfirmarResolucao(relatoResolucao) {
    const chamado = chamadoParaResolver;
    if (!chamado) return;

    await atualizarStatus(chamado, "resolvido", relatoResolucao);
    setChamadoParaResolver(null);
  }

  async function aoExcluirChamado(chamado) {
    setChamadoParaExcluir(chamado);
  }

  async function confirmarExclusaoChamado() {
    const chamado = chamadoParaExcluir;
    if (!chamado || excluindoChamado) return;

    setExcluindoChamado(true);
    try {
      await ChamadoService.remover(chamado._id, token);
      setChamados((atual) => atual.filter((c) => c._id !== chamado._id));
      setChamadoParaExcluir(null);
    } catch (e) {
      setErro(e.message);
    } finally {
      setExcluindoChamado(false);
    }
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-topbar">
        <div>
          <span className="dashboard-eyebrow">FORMIS · INSTRUMENTOS DE MEDIÇÃO</span>
          <h1>Relatorio de Chamados</h1>
        </div>

        <div className="dashboard-topbar-actions">
          <span className="dashboard-perfil">{usuario.perfil}</span>
          {contadorNovos > 0 && (
            <span
              className="badge-novos"
              onClick={() => setContadorNovos(0)}
              title="Clique para limpar"
              style={{
                background: "#ef4444",
                color: "white",
                borderRadius: "12px",
                padding: "2px 10px",
                fontSize: "0.75rem",
                fontWeight: "bold",
                marginLeft: "8px",
                cursor: "pointer"
              }}
            >
              {contadorNovos} NOVOS
            </span>
          )}
          <button
            type="button"
            className="relatorio-download relatorio-download-pdf"
            onClick={gerarRelatorioPDF}
            title="Baixar relatório em PDF"
            aria-label="Baixar relatório em PDF"
          >
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#fff" d="M9 3h19l11 11v31H9z" />
              <path fill="#f7c8c4" d="M28 3v11h11z" />
              <path fill="#e2231a" d="M24 15 12 36h5l7-12 7 12h5z" />
              <text x="24" y="43" textAnchor="middle" fill="#e2231a" fontSize="7" fontWeight="700">PDF</text>
            </svg>
            <span>Baixar PDF</span>
          </button>
          <button
            type="button"
            className="relatorio-download relatorio-download-excel"
            onClick={gerarRelatorioExcel}
            title="Baixar relatório em Excel"
            aria-label="Baixar relatório em Excel"
          >
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <rect x="15" y="4" width="29" height="40" rx="3" fill="#217346" />
              <path d="M25 4h16v40H25z" fill="#33a852" />
              <path d="M4 12h25v24H4z" rx="3" fill="#185c37" />
              <path d="m10 17 4.5 6.8L10 31h4l2.7-4.4 2.8 4.4h4l-4.6-7.2 4.4-6.8h-3.9l-2.6 4.2-2.7-4.2z" fill="#fff" />
            </svg>
            <span>Baixar Excel</span>
          </button>
          <button className="ticket-submit" onClick={() => setModalAberto(true)}>
            + Novo chamado
          </button>
          <button
            type="button"
            className="agenda-abrir-botao"
            onClick={() => {
              if (
                "Notification" in window &&
                window.Notification.permission === "default"
              ) {
                window.Notification.requestPermission().catch(() => {});
              }
              setAgendaAberta(true);
            }}
          >
            Agenda de reuniões
          </button>
          <button className="modal-cancelar" onClick={sair}>
            Sair
          </button>
        </div>
      </header>

      <section className="relatorio-filtros" aria-label="Filtros do relatório">
        <label className="relatorio-usuario-filtro">
          <span>Usuário</span>
          <select
            value={relatorioUsuarioEmail}
            onChange={(evento) => setRelatorioUsuarioEmail(evento.target.value)}
            aria-label="Filtrar relatório por usuário"
          >
            <option value="">Todos os usuários</option>
            {usuarios.map((item) => (
              <option key={item._id} value={item.email.trim().toLowerCase()}>
                {item.nome} — {item.email}
              </option>
            ))}
          </select>
        </label>
        <label className="relatorio-data-filtro">
          <span>Data inicial</span>
          <input
            type="date"
            value={relatorioDataInicial}
            max={relatorioDataFinal || undefined}
            onChange={(evento) => setRelatorioDataInicial(evento.target.value)}
            aria-label="Data inicial do relatório"
          />
        </label>
        <label className="relatorio-data-filtro">
          <span>Data final</span>
          <input
            type="date"
            value={relatorioDataFinal}
            min={relatorioDataInicial || undefined}
            onChange={(evento) => setRelatorioDataFinal(evento.target.value)}
            aria-label="Data final do relatório"
          />
        </label>
        <button
          type="button"
          className="filtros-limpar"
          onClick={() => {
            setRelatorioUsuarioEmail("");
            setRelatorioDataInicial("");
            setRelatorioDataFinal("");
          }}
        >
          Limpar filtros
        </button>
        <span className="filtros-resultado" aria-live="polite">
          {chamadosDoRelatorio.length} chamado{chamadosDoRelatorio.length === 1 ? "" : "s"} no relatório
        </span>
      </section>

      {novaNotificacao && (
        <div className="notification-toast">
          <div className="notification-content">
            <span className="notification-icon">{"\u{1F514}"}</span>
            {novaNotificacao}
          </div>
        </div>
      )}

      {erro && (
        <div className="error-banner">
          {erro}
          <button onClick={() => setErro("")}>{"\u00D7"}</button>
        </div>
      )}


      {carregando ? (
        <div className="loading-container">Carregando chamados{"\u2026"}</div>
      ) : (
        <div className="kanban-board">
          {COLUNAS.map((coluna) => (
            <KanbanColumn
              key={coluna.status}
              titulo={coluna.titulo}
              status={coluna.status}
              chamados={chamados.filter((c) => c.status === coluna.status)}
              podeArrastar={podeMoverChamado}
              onDragStart={aoIniciarArrasto}
              onDrop={aoSoltarNaColuna}
              podeExcluir={eAdministrador}
              onExcluir={aoExcluirChamado}
              onVerDetalhes={setChamadoEmDetalhes}
            />
          ))}
        </div>
      )}

      {modalAberto && (
        <NovoChamadoModal
          onFechar={() => setModalAberto(false)}
          usuario={usuario}
          usuarios={usuarios}
          onCriar={aoCriarChamado}
        />
      )}

      {agendaAberta && (
        <AgendaReunioesModal
          usuario={usuario}
          usuarios={usuarios}
          token={token}
          onFechar={() => setAgendaAberta(false)}
        />
      )}

      {chamadoEmDetalhes && (
        <DetalhesChamadoModal
          chamado={chamadoEmDetalhes}
          usuarios={usuarios}
          podeRedirecionar={
            isAdmin ||
            String(
              chamadoEmDetalhes.destinatario?._id ||
                chamadoEmDetalhes.destinatario?.id ||
                chamadoEmDetalhes.destinatario ||
                ""
            ) === idUsuarioAtual
          }
          redirecionando={redirecionandoDestinatario}
          onRedirecionar={aoRedirecionarDestinatario}
          onFechar={() => setChamadoEmDetalhes(null)}
        />
      )}

      {chamadoParaExcluir && (
        <div
          className="modal-overlay"
          onMouseDown={excluindoChamado ? undefined : () => setChamadoParaExcluir(null)}
        >
          <section
            className="modal-box"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirmar-exclusao-titulo"
            onMouseDown={(evento) => evento.stopPropagation()}
          >
            <h2 id="confirmar-exclusao-titulo">Excluir chamado?</h2>
            <p className="modal-description">
              Esta ação excluirá definitivamente “{chamadoParaExcluir.titulo}”.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-cancelar"
                onClick={() => setChamadoParaExcluir(null)}
                disabled={excluindoChamado}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="chamado-excluir"
                onClick={confirmarExclusaoChamado}
                disabled={excluindoChamado}
              >
                {excluindoChamado ? "Excluindo..." : "Excluir definitivamente"}
              </button>
            </div>
          </section>
        </div>
      )}

      {chamadoParaResolver && (
        <RelatoResolucaoModal
          chamado={chamadoParaResolver}
          onFechar={() => setChamadoParaResolver(null)}
          onConfirmar={aoConfirmarResolucao}
        />
      )}

      <style>{`
        .notification-toast {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #1e293b;
          color: white;
          padding: 16px 24px;
          borderRadius: 12px;
          boxShadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          zIndex: 9999;
          animation: slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1);
          border-left: 4px solid #3b82f6;
        }
        .notification-content {
          display: flex;
          align-items: center;
          gap: 12px;
          font-weight: 500;
        }
        .error-banner {
          margin: 0 32px 20px;
          padding: 12px 20px;
          background: #fef2f2;
          border: 1px solid #fee2e2;
          color: #b91c1c;
          border-radius: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .loading-container {
          padding: 40px;
          text-align: center;
          color: #64748b;
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
