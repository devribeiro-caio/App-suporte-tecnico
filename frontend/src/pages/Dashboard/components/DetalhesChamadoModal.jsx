export default function DetalhesChamadoModal({ chamado, onFechar }) {
  if (!chamado) return null;

  const prioridade = {
    baixa: "Baixa",
    media: "Media",
    alta: "Alta",
    urgente: "Urgente",
  };

  const status = {
    aberto: "Aberto",
    em_andamento: "Em andamento",
    resolvido: "Resolvido",
  };

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
            <dt>Solicitante</dt>
            <dd>{chamado.solicitante?.nome || "Nao informado"}</dd>
          </div>
          <div>
            <dt>Responsavel</dt>
            <dd>{chamado.responsavel?.nome || "Nao atribuido"}</dd>
          </div>
        </dl>

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

        <div className="modal-actions">
          <button type="button" className="ticket-submit" onClick={onFechar}>
            Fechar
          </button>
        </div>
      </section>
    </div>
  );
}
