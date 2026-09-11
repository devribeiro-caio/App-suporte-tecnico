const PRIORIDADE_LABEL = {
  baixa: "Baixa",
  media: "Media",
  alta: "Alta",
  urgente: "Urgente",
};

export default function ChamadoCard({
  chamado,
  arrastavel,
  onDragStart,
  podeExcluir,
  onExcluir,
  onVerDetalhes,
}) {
  return (
    <article
      className="chamado-card"
      draggable={arrastavel}
      onDragStart={(event) => onDragStart?.(event, chamado)}
    >
      <header className="chamado-card-header">
        <span className={`chamado-prioridade prioridade-${chamado.prioridade}`}>
          {PRIORIDADE_LABEL[chamado.prioridade] || chamado.prioridade}
        </span>
        <span className="chamado-id">#{chamado._id.slice(-5)}</span>
      </header>

      <h3 className="chamado-titulo">{chamado.titulo}</h3>
      <p className="chamado-descricao">{chamado.descricao}</p>

      <div className="chamado-card-actions chamado-card-acoes-principais">
        <button
          type="button"
          className="chamado-ver-mais"
          onClick={(event) => {
            event.stopPropagation();
            onVerDetalhes?.(chamado);
          }}
        >
          Ver mais
        </button>
      </div>

      {chamado.status === "resolvido" && chamado.relatoResolucao && (
        <section className="chamado-relato" aria-label="Relato da resolucao">
          <strong>Relato da resolucao</strong>
          <p>{chamado.relatoResolucao}</p>
        </section>
      )}

      {chamado.destinatario && <p className="chamado-destinatario">Para: {chamado.destinatario.nome}</p>}

      <footer className="chamado-card-footer">
        <span>{chamado.solicitante?.nome || "-"}</span>
        {chamado.responsavel && <span>Responsavel: {chamado.responsavel.nome}</span>}
      </footer>

      {podeExcluir && chamado.status === "resolvido" && (
        <div className="chamado-card-actions">
          <button type="button" className="chamado-excluir" onClick={() => onExcluir?.(chamado)}>
            Excluir
          </button>
        </div>
      )}
    </article>
  );
}
