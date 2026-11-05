import { useState } from "react";

export default function DetalhesChamadoModal({
  chamado,
  usuarios = [],
  podeRedirecionar = false,
  redirecionando = false,
  podeAprovar = false,
  aprovando = false,
  onRedirecionar,
  onAprovar,
  onFechar,
}) {
  const [erroAprovacao, setErroAprovacao] = useState("");
  const [observacaoAprovacao, setObservacaoAprovacao] = useState("");
  if (!chamado) return null;

  const idDestinatarioAtual = String(
    chamado.destinatario?._id || chamado.destinatario?.id || chamado.destinatario || ""
  );
  const idSolicitante = String(
    chamado.solicitante?._id || chamado.solicitante?.id || chamado.solicitante || ""
  );
  const usuariosParaRedirecionar = usuarios.filter(
    (usuario) => String(usuario._id || usuario.id || "") !== idSolicitante
  );

  async function redirecionarChamado(event) {
    event.preventDefault();
    const formulario = event.currentTarget;
    const novoDestinatarioId = formulario.elements.destinatario.value;
    if (!novoDestinatarioId || novoDestinatarioId === idDestinatarioAtual) return;

    try {
      await onRedirecionar(chamado._id, novoDestinatarioId);
    } catch {
      // O painel exibe o erro da API no aviso global.
    }
  }

  async function aprovarResolucao() {
    setErroAprovacao("");
    const observacaoLimpa = observacaoAprovacao.trim();
    if (!observacaoLimpa) {
      setErroAprovacao("Preencha o parecer do administrador antes de aprovar.");
      return;
    }
    try {
      await onAprovar?.(chamado._id, observacaoLimpa);
    } catch (error) {
      setErroAprovacao(error.message || "Não foi possível aprovar o chamado.");
    }
  }

  const prioridade = {
    baixa: "Baixa",
    media: "Media",
    alta: "Alta",
    urgente: "Urgente",
  };

  const status = {
    aberto: "Aberto",
    em_andamento: "Em andamento",
    aguardando_aprovacao: "Aguardando aprovação",
    resolvido: "Resolvido",
    finalizado: "Finalizado",
  };
  const dataOcorrencia = chamado.dataOcorrencia
    ? chamado.dataOcorrencia.split("-").reverse().join("/")
    : "Não informada";

  return (
    <div className="modal-overlay" role="presentation" onMouseDown={onFechar}>
      <section
        className="modal-box detalhes-chamado-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detalhes-chamado-titulo"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="detalhes-chamado-header">
          <div>
            <span className="detalhes-chamado-id">Chamado #{chamado._id.slice(-5)}</span>
            <h2 id="detalhes-chamado-titulo">{chamado.titulo}</h2>
          </div>
          <button type="button" className="detalhes-fechar" onClick={onFechar} aria-label="Fechar detalhes">
            X
          </button>
        </header>

        <dl className="detalhes-chamado-meta">
          <div>
            <dt>Status</dt>
            <dd>{status[chamado.status] || chamado.status}</dd>
          </div>
          <div>
            <dt>Prioridade</dt>
            <dd>{prioridade[chamado.prioridade] || chamado.prioridade}</dd>
          </div>
          <div>
            <dt>Tipo de chamado</dt>
            <dd>{chamado.tipoChamado || "Não informado"}</dd>
          </div>
          {chamado.skuEquipamento && (
            <div>
              <dt>SKU do equipamento</dt>
              <dd>{chamado.skuEquipamento}</dd>
            </div>
          )}
          <div>
            <dt>Data da ocorrência</dt>
            <dd>{dataOcorrencia}</dd>
          </div>
          <div>
            <dt>Solicitante</dt>
            <dd>{chamado.solicitante?.nome || "Nao informado"}</dd>
          </div>
          <div>
            <dt>Destinatário</dt>
            <dd>{chamado.destinatario?.nome || "Nao informado"}</dd>
          </div>
          <div>
            <dt>Responsavel</dt>
            <dd>{chamado.responsavel?.nome || "Nao atribuido"}</dd>
          </div>
        </dl>

        {podeRedirecionar && (
          <form className="detalhes-redirecionamento" onSubmit={redirecionarChamado}>
            <h3>Redirecionar chamado</h3>
            <label htmlFor="novo-destinatario-chamado">Novo destinatário</label>
            <select
              id="novo-destinatario-chamado"
              name="destinatario"
              defaultValue={idDestinatarioAtual}
              disabled={redirecionando || usuariosParaRedirecionar.length === 0}
            >
              {usuariosParaRedirecionar.map((usuario) => {
                const idUsuario = String(usuario._id || usuario.id);
                return (
                  <option key={idUsuario} value={idUsuario}>
                    {usuario.nome} — {usuario.email}
                  </option>
                );
              })}
            </select>
            {usuariosParaRedirecionar.length === 0 && (
              <p className="detalhes-redirecionamento-ajuda">
                Não há outros usuários cadastrados para receber este chamado.
              </p>
            )}
            <div className="modal-actions">
              <button
                type="submit"
                className="ticket-submit"
                disabled={
                  redirecionando ||
                  usuariosParaRedirecionar.length === 0 ||
                  idDestinatarioAtual === idSolicitante
                }
              >
                {redirecionando ? "Redirecionando..." : "Confirmar destinatário"}
              </button>
            </div>
          </form>
        )}

        <section className="detalhes-chamado-conteudo">
          <h3>Descricao do chamado</h3>
          <p>{chamado.descricao}</p>
        </section>

        {chamado.relatoResolucao && (
          <section className="detalhes-chamado-conteudo detalhes-chamado-resolucao">
            <h3>Relato da resolucao</h3>
            <p>{chamado.relatoResolucao}</p>
          </section>
        )}

        {chamado.status === "aguardando_aprovacao" && (
          <section className="detalhes-aprovacao">
            <h3>Aprovação obrigatória</h3>
            <p>Este chamado só será concluído após aprovação de formis@formis.com.br.</p>
            {podeAprovar && (
              <>
                <label className="ticket-field">
                  <span>Parecer do administrador</span>
                  <textarea
                    value={observacaoAprovacao}
                    onChange={(event) => setObservacaoAprovacao(event.target.value)}
                    placeholder="Registre a análise e a decisão para mover o chamado para Resolvido."
                    rows={4}
                    maxLength={2000}
                    required
                  />
                </label>
                {erroAprovacao && <p className="ticket-error" role="alert">{erroAprovacao}</p>}
                <button
                  type="button"
                  className="ticket-submit"
                  onClick={aprovarResolucao}
                  disabled={aprovando || !observacaoAprovacao.trim()}
                >
                  {aprovando ? "Aprovando..." : "Aprovar e concluir chamado"}
                </button>
              </>
            )}
          </section>
        )}

        {chamado.aprovadoPor && (
          <section className="detalhes-chamado-conteudo">
            <h3>Aprovação registrada</h3>
            <p>{chamado.aprovadoPor.nome || chamado.aprovadoPor.email}</p>
            {chamado.aprovadoEm && <p>{new Date(chamado.aprovadoEm).toLocaleString("pt-BR")}</p>}
            {chamado.observacaoAprovacao && <p>Parecer: {chamado.observacaoAprovacao}</p>}
          </section>
        )}

        <div className="modal-actions">
          <button type="button" className="ticket-submit" onClick={onFechar}>
            Fechar
          </button>
        </div>
      </section>
    </div>
  );
}
