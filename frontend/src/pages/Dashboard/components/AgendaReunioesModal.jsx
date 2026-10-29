import { useCallback, useEffect, useState } from "react";
import { ReuniaoService } from "../../../services/api";

function dataHoraLocalMinima() {
  const data = new Date(Date.now() + 5 * 60 * 1000);
  data.setSeconds(0, 0);
  const deslocamento = data.getTimezoneOffset() * 60_000;
  return new Date(data.getTime() - deslocamento).toISOString().slice(0, 16);
}

function idDe(valor) {
  return String(valor?._id || valor?.id || valor || "");
}

function dataHoraTexto(valor) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(valor));
}

export default function AgendaReunioesModal({ usuario, usuarios = [], token, onFechar }) {
  const [reunioes, setReunioes] = useState([]);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dataHora, setDataHora] = useState("");
  const [participantes, setParticipantes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [acaoEmAndamentoId, setAcaoEmAndamentoId] = useState("");
  const [erro, setErro] = useState("");

  const idUsuarioAtual = idDe(usuario);
  const suporte = ["admin", "tecnico"].includes(usuario?.perfil);

  const carregarReunioes = useCallback(async () => {
    try {
      const dados = await ReuniaoService.listar(token);
      setReunioes(dados);
      setErro("");
    } catch (error) {
      setErro(error.message || "Não foi possível carregar a agenda.");
    } finally {
      setCarregando(false);
    }
  }, [token]);

  useEffect(() => {
    carregarReunioes();
    const intervalo = window.setInterval(carregarReunioes, 30_000);
    return () => window.clearInterval(intervalo);
  }, [carregarReunioes]);

  function alternarParticipante(id) {
    setParticipantes((atuais) =>
      atuais.includes(id) ? atuais.filter((item) => item !== id) : [...atuais, id]
    );
  }

  async function agendar(event) {
    event.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      const novaReuniao = await ReuniaoService.criar(
        {
          titulo,
          descricao,
          dataHora: new Date(dataHora).toISOString(),
          participantes,
        },
        token
      );
      setReunioes((atuais) => [...atuais, novaReuniao].sort(
        (a, b) => new Date(a.dataHora) - new Date(b.dataHora)
      ));
      setTitulo("");
      setDescricao("");
      setDataHora("");
      setParticipantes([]);
    } catch (error) {
      setErro(error.message || "Não foi possível agendar a reunião.");
    } finally {
      setSalvando(false);
    }
  }

  async function cancelar(reuniao) {
    if (!window.confirm(`Cancelar a reunião “${reuniao.titulo}”?`)) return;
    setAcaoEmAndamentoId(reuniao._id);
    try {
      const atualizada = await ReuniaoService.cancelar(reuniao._id, token);
      setReunioes((atuais) => atuais.map((item) =>
        item._id === atualizada._id ? atualizada : item
      ));
    } catch (error) {
      setErro(error.message || "Não foi possível cancelar a reunião.");
    } finally {
      setAcaoEmAndamentoId("");
    }
  }

  async function excluir(reuniao) {
    if (!window.confirm(`Excluir permanentemente a reunião “${reuniao.titulo}”? Essa ação não pode ser desfeita.`)) return;
    setAcaoEmAndamentoId(reuniao._id);
    try {
      await ReuniaoService.remover(reuniao._id, token);
      setReunioes((atuais) => atuais.filter((item) => item._id !== reuniao._id));
    } catch (error) {
      setErro(error.message || "Não foi possível excluir a reunião.");
    } finally {
      setAcaoEmAndamentoId("");
    }
  }

  const agora = Date.now();
  const reunioesOrdenadas = [...reunioes].sort((a, b) => {
    const horarioA = new Date(a.dataHora).getTime();
    const horarioB = new Date(b.dataHora).getTime();
    const passadaA = horarioA < agora;
    const passadaB = horarioB < agora;
    if (passadaA !== passadaB) return passadaA ? 1 : -1;
    return horarioA - horarioB;
  });

  return (
    <div className="modal-overlay agenda-overlay" role="presentation" onMouseDown={onFechar}>
      <section
        className="modal-box agenda-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="agenda-titulo"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="agenda-header">
          <div>
            <span className="agenda-eyebrow">Organização da equipe</span>
            <h2 id="agenda-titulo">Agenda de reuniões</h2>
            <p>Agende um horário, convide participantes e acompanhe as reuniões.</p>
          </div>
          <button type="button" className="detalhes-fechar" onClick={onFechar} aria-label="Fechar agenda">
            X
          </button>
        </header>

        {erro && <p className="agenda-erro" role="alert">{erro}</p>}

        <form className="agenda-form" onSubmit={agendar}>
          <h3>Agendar reunião</h3>
          <label>
            <span>Assunto</span>
            <input
              value={titulo}
              onChange={(event) => setTitulo(event.target.value)}
              maxLength={160}
              required
              placeholder="Ex.: alinhamento do projeto"
            />
          </label>
          <label>
            <span>Data e horário</span>
            <input
              type="datetime-local"
              value={dataHora}
              min={dataHoraLocalMinima()}
              onChange={(event) => setDataHora(event.target.value)}
              required
            />
          </label>
          <label>
            <span>Descrição (opcional)</span>
            <textarea
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="Pauta ou informações para os participantes"
            />
          </label>
          <fieldset className="agenda-participantes">
            <legend>Convidar participantes</legend>
            {usuarios.filter((item) => idDe(item) !== idUsuarioAtual).length === 0 ? (
              <p>Nenhum outro usuário cadastrado.</p>
            ) : usuarios.filter((item) => idDe(item) !== idUsuarioAtual).map((item) => (
              <label key={idDe(item)} className="agenda-participante">
                <input
                  type="checkbox"
                  checked={participantes.includes(idDe(item))}
                  onChange={() => alternarParticipante(idDe(item))}
                />
                <span>{item.nome} <small>{item.email}</small></span>
              </label>
            ))}
          </fieldset>
          <p className="agenda-ajuda">Os participantes recebem um aviso ao serem convidados, 15 minutos antes e no horário marcado. Se o app estiver fechado, os avisos pendentes aparecem quando ele for aberto novamente.</p>
          <div className="modal-actions">
            <button type="submit" className="ticket-submit" disabled={salvando}>
              {salvando ? "Agendando..." : "Agendar reunião"}
            </button>
          </div>
        </form>

        <section className="agenda-lista" aria-labelledby="agenda-lista-titulo">
          <div className="agenda-lista-heading">
            <h3 id="agenda-lista-titulo">Reuniões</h3>
            <span>{reunioes.length}</span>
          </div>
          {carregando ? (
            <p className="agenda-vazio">Carregando agenda…</p>
          ) : reunioesOrdenadas.length === 0 ? (
            <p className="agenda-vazio">Você ainda não tem reuniões agendadas.</p>
          ) : (
            <div className="agenda-reunioes-lista">
              {reunioesOrdenadas.map((reuniao) => {
                const idCriador = idDe(reuniao.criadoPor);
                const podeGerenciar = suporte || idCriador === idUsuarioAtual;
                const horarioPassou = new Date(reuniao.dataHora).getTime() < Date.now();
                const textoStatus = reuniao.status === "cancelada"
                  ? "Cancelada"
                  : horarioPassou
                  ? "Horário passado"
                  : "Agendada";
                return (
                  <article className={`agenda-reuniao ${reuniao.status === "cancelada" ? "agenda-reuniao-cancelada" : ""}`} key={reuniao._id}>
                    <div className="agenda-reuniao-data">
                      <strong>{dataHoraTexto(reuniao.dataHora)}</strong>
                      <span className={`agenda-status agenda-status-${reuniao.status}`}>
                        {textoStatus}
                      </span>
                    </div>
                    <h4>{reuniao.titulo}</h4>
                    {reuniao.descricao && <p className="agenda-reuniao-descricao">{reuniao.descricao}</p>}
                    <p className="agenda-reuniao-participantes">
                      Participantes: {(reuniao.participantes || []).map((item) => item.nome).join(", ")}
                    </p>
                    {podeGerenciar && (
                      <div className="agenda-card-acoes">
                        {reuniao.status === "agendada" && (
                          <button
                            type="button"
                            className="agenda-cancelar"
                            disabled={acaoEmAndamentoId === reuniao._id}
                            onClick={() => cancelar(reuniao)}
                          >
                            {acaoEmAndamentoId === reuniao._id ? "Aguarde…" : "Cancelar reunião"}
                          </button>
                        )}
                        <button
                          type="button"
                          className="agenda-excluir"
                          disabled={acaoEmAndamentoId === reuniao._id}
                          onClick={() => excluir(reuniao)}
                        >
                          Excluir reunião
                        </button>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </div>
  );
}
