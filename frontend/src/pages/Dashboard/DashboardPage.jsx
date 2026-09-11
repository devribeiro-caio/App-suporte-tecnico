import { useEffect, useState, useCallback, useRef } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ChamadoService } from "../../services/api";
import {
  conectarSocket,
  onNovoChamado,
  onChamadoAtualizado,
  onChamadoRemovido,
  removerTodosListeners,
  desconectarSocket,
} from "../../services/socket";
import KanbanColumn from "./components/KanbanColumn";
import NovoChamadoModal from "./components/NovoChamadoModal";
import RelatoResolucaoModal from "./components/RelatoResolucaoModal";
import DetalhesChamadoModal from "./components/DetalhesChamadoModal";
import "./DashboardPage.css";

const COLUNAS = [
  { status: "aberto", titulo: "Aberto" },
  { status: "em_andamento", titulo: "Em andamento" },
  { status: "resolvido", titulo: "Resolvido" },
];

// Contexto de ÃƒÂ¡udio global para reutilizaÃƒÂ§ÃƒÂ£o
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

// Tom de notificaÃƒÂ§ÃƒÂ£o em Web Audio API
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

    // Som de notificaÃƒÂ§ÃƒÂ£o: Ding-dong alegre
    tocarTom(660, 0, 0.2, 0.4);
    tocarTom(880, 0.15, 0.4, 0.4);
  } catch (e) {
    console.warn("[Som] NÃƒÂ£o foi possÃƒÂ­vel tocar notificaÃƒÂ§ÃƒÂ£o:", e);
  }
}

// Som para atualizaÃƒÂ§ÃƒÂ£o (tom mais suave)
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
    console.warn("[Som] NÃƒÂ£o foi possÃƒÂ­vel tocar atualizaÃƒÂ§ÃƒÂ£o:", e);
  }
}

export default function DashboardPage() {
  const { usuario, token, sair } = useAuth();
  const [chamados, setChamados] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [modalAberto, setModalAberto] = useState(false);
  const [chamadoParaResolver, setChamadoParaResolver] = useState(null);
  const [chamadoEmDetalhes, setChamadoEmDetalhes] = useState(null);
  const [chamadoArrastado, setChamadoArrastado] = useState(null);
  const [novaNotificacao, setNovaNotificacao] = useState("");
  const [contadorNovos, setContadorNovos] = useState(0);
  const audioUnlocked = useRef(false);

  const podeMoverCard = usuario?.perfil === "tecnico" || usuario?.perfil === "admin";
  const isAdmin = usuario?.perfil === "admin" || usuario?.perfil === "tecnico";
  const eAdministrador = usuario?.perfil === "admin";

  const carregarChamados = useCallback(async () => {
    try {
      setErro("");
      const dados = await ChamadoService.listar(token);
      setChamados(dados);
    } catch (e) {
      setErro(e.message);
    } finally {
      setCarregando(false);
    }
  }, [token]);

  // Desbloquear ÃƒÂ¡udio na primeira interaÃƒÂ§ÃƒÂ£o do usuÃƒÂ¡rio
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
    // Desbloquear ÃƒÂ¡udio em qualquer clique ou toque
    window.addEventListener("click", desbloquearAudio, { once: true });
    window.addEventListener("keydown", desbloquearAudio, { once: true });
    return () => {
      window.removeEventListener("click", desbloquearAudio);
      window.removeEventListener("keydown", desbloquearAudio);
    };
  }, [desbloquearAudio]);

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

        if (isAdmin) {
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

        if (isAdmin) {
          tocarSomAtualizacao();
        }
      });

      // Escutar chamado removido
      onChamadoRemovido(({ id }) => {
        setChamados((atual) => atual.filter((c) => c._id !== id));
      });

      // Polling de seguranÃƒÂ§a a cada 4 segundos para garantir atualizaÃƒÂ§ÃƒÂ£o instantÃƒÂ¢nea sem F5
      const intervalo = setInterval(async () => {
        try {
          const dados = await ChamadoService.listar(token);
          setChamados((atual) => {
            if (dados.length > atual.length && isAdmin) {
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
  }, [token, carregarChamados, isAdmin]);

  if (!usuario) {
    return <Navigate to="/" replace />;
  }

  function gerarRelatorioPDF() {
    const printWindow = window.open('', '_blank');
    const abertos = chamados.filter(c => c.status === 'aberto').length;
    const emAndamento = chamados.filter(c => c.status === 'em_andamento').length;
    const resolvidos = chamados.filter(c => c.status === 'resolvido').length;
    const total = chamados.length;
    const dataAtual = new Date().toLocaleDateString('pt-BR');

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Relatorio de Chamados - Suporte Tecnico</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          h1 { color: #1e3a8a; margin-bottom: 5px; }
          .subtitle { color: #666; font-size: 14px; margin-bottom: 20px; }
          .stats { display: flex; gap: 20px; margin-bottom: 25px; }
          .stat-card { border: 1px solid #ccc; padding: 15px; border-radius: 6px; flex: 1; text-align: center; }
          .stat-card h3 { margin: 0 0 5px 0; font-size: 14px; color: #555; }
          .stat-card p { margin: 0; font-size: 22px; font-weight: bold; color: #1e3a8a; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
          th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
          th { background-color: #f3f4f6; color: #1f2937; }
          tr:nth-child(even) { background-color: #f9fafb; }
          .badge { padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
          .badge-aberto { background: #fee2e2; color: #991b1b; }
          .badge-andamento { background: #dbeafe; color: #1e40af; }
          .badge-resolvido { background: #dcfce7; color: #166534; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>Relatorio de Chamados</h1>
        <div class="subtitle">Sistema de Suporte Tecnico - Gerado em ${dataAtual} por ${usuario.nome}</div>
<div class="no-print" style="display:flex;gap:12px;align-items:end;margin:18px 0;padding:12px;background:#f3f4f6;"><label>Data inicial<br><input id="dataInicio" type="date"></label><label>Data final<br><input id="dataFim" type="date"></label><button type="button" onclick="limparFiltro()">Limpar</button><button type="button" onclick="window.print()">Imprimir / Salvar PDF</button></div>

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
          <thead><tr><th>Data</th><th>Titulo / Descricao</th><th>Solicitante</th><th>Prioridade</th><th>Status</th><th>Relato da resolucao</th></tr></thead>
          <tbody>
            ${chamados.map(c => `
              <tr data-data="${c.createdAt.slice(0, 10)}" data-status="${c.status}">
                <td>${new Date(c.createdAt).toLocaleDateString('pt-BR')}</td>
                <td><b>${c.titulo}</b><br><small style="color:#666">${c.descricao.substring(0, 60)}...</small></td>
                <td>${c.solicitante?.nome || 'N/D'}</td>
                <td>${c.prioridade || 'normal'}</td>
                <td><span class="badge badge-${c.status === 'aberto' ? 'aberto' : c.status === 'em_andamento' ? 'andamento' : 'resolvido'}">${c.status.toUpperCase()}</span></td>
                <td>${c.relatoResolucao || String.fromCharCode(8212)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="margin-top: 30px; text-align: center;" class="no-print">
          <button onclick="window.print()" style="background: #2563eb; color: white; border: none; padding: 10px 20px; font-size: 16px; border-radius: 6px; cursor: pointer;">Salvar como PDF / Imprimir</button>
        </div>

        <script>function atualizarFiltro(){const inicio=document.getElementById("dataInicio").value;const fim=document.getElementById("dataFim").value;let total=0,abertos=0,andamento=0,resolvidos=0;document.querySelectorAll("tbody tr").forEach((linha)=>{const data=linha.dataset.data;const visivel=(!inicio||data>=inicio)&&(!fim||data<=fim);linha.style.display=visivel?"":"none";if(!visivel)return;total++;if(linha.dataset.status==="aberto")abertos++;if(linha.dataset.status==="em_andamento")andamento++;if(linha.dataset.status==="resolvido")resolvidos++;});document.getElementById("total").textContent=total;document.getElementById("abertos").textContent=abertos;document.getElementById("andamento").textContent=andamento;document.getElementById("resolvidos").textContent=resolvidos;}function limparFiltro(){document.getElementById("dataInicio").value="";document.getElementById("dataFim").value="";atualizarFiltro();}document.getElementById("dataInicio").addEventListener("change",atualizarFiltro);document.getElementById("dataFim").addEventListener("change",atualizarFiltro);atualizarFiltro();</script>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
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
    }
  }

  function aoIniciarArrasto(e, chamado) {
    setChamadoArrastado(chamado);
    e.dataTransfer.effectAllowed = "move";
  }

  async function aoSoltarNaColuna(novoStatus) {
    if (!chamadoArrastado || chamadoArrastado.status === novoStatus) return;

    const chamadoMovido = chamadoArrastado;
    setChamadoArrastado(null);

    if (novoStatus === "resolvido") {
      if (!eAdministrador) {
        setErro("Apenas administradores podem concluir chamados.");
        return;
      }

      setChamadoParaResolver(chamadoMovido);
      return;
    }

    await atualizarStatus(chamadoMovido, novoStatus);
  }

  async function atualizarStatus(chamado, novoStatus, relatoResolucao) {
    const idMovido = chamado._id;

    // AtualizaÃƒÂ§ÃƒÂ£o otimista
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
      await ChamadoService.atualizarStatus(
        idMovido,
        novoStatus,
        token,
        relatoResolucao
      );
    } catch (e) {
      setErro(e.message);
      setChamados((atual) => atual.map((c) => (c._id === idMovido ? chamado : c)));
      throw e;
    }
  }

  async function aoConfirmarResolucao(relatoResolucao) {
    const chamado = chamadoParaResolver;
    if (!chamado) return;

    await atualizarStatus(chamado, "resolvido", relatoResolucao);
    setChamadoParaResolver(null);
  }

  async function aoExcluirChamado(chamado) {
    const confirmou = window.confirm(
      `Excluir definitivamente o chamado "${chamado.titulo}"?`
    );
    if (!confirmou) return;

    try {
      await ChamadoService.remover(chamado._id, token);
      setChamados((atual) => atual.filter((c) => c._id !== chamado._id));
    } catch (e) {
      setErro(e.message);
    }
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-topbar">
        <div>
          <span className="dashboard-eyebrow">FORMIS - CHAMADOS</span>
          <h1>Relatorio de Chamados</h1>
        </div>

        <div className="dashboard-topbar-actions">
          <span className="dashboard-perfil">{usuario.perfil}</span>
          {contadorNovos > 0 && isAdmin && (
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
          {true && (
            <button className="ticket-submit" onClick={gerarRelatorioPDF} style={{ background: "#059669" }} title="Gerar RelatÃƒÂ³rio em PDF">Relatorio PDF</button>
          )}
          <button className="ticket-submit" onClick={() => setModalAberto(true)}>
            + Novo chamado
          </button>
          <button className="modal-cancelar" onClick={sair}>
            Sair
          </button>
        </div>
      </header>

      {novaNotificacao && (
        <div className="notification-toast">
          <div className="notification-content">
            <span className="notification-icon">Ã°Å¸â€â€</span>
            {novaNotificacao}
          </div>
        </div>
      )}

      {erro && (
        <div className="error-banner">
          {erro}
          <button onClick={() => setErro("")}>Ã¢Å“â€¢</button>
        </div>
      )}


      {carregando ? (
        <div className="loading-container">Carregando chamadosÃ¢â‚¬Â¦</div>
      ) : (
        <div className="kanban-board">
          {COLUNAS.map((coluna) => (
            <KanbanColumn
              key={coluna.status}
              titulo={coluna.titulo}
              status={coluna.status}
              chamados={chamados.filter((c) => c.status === coluna.status)}
              podeArrastar={podeMoverCard}
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
          onCriar={aoCriarChamado}
        />
      )}

      {chamadoEmDetalhes && (
        <DetalhesChamadoModal
          chamado={chamadoEmDetalhes}
          onFechar={() => setChamadoEmDetalhes(null)}
        />
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
