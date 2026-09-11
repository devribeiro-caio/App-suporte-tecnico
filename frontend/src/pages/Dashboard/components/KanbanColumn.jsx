import ChamadoCard from "./ChamadoCard";

export default function KanbanColumn({
  titulo,
  status,
  chamados,
  podeArrastar,
  onDragStart,
  onDrop,
  podeExcluir,
  onExcluir,
  onVerDetalhes,
}) {
  function aoSoltarNaColuna(event) {
    event.preventDefault();
    onDrop?.(status);
  }

  return (
    <div
      className="kanban-column"
      onDragOver={(event) => event.preventDefault()}
      onDrop={aoSoltarNaColuna}
    >
      <div className="kanban-column-header">
        <span className={`kanban-dot dot-${status}`} />
        <h2>{titulo}</h2>
        <span className="kanban-count">{chamados.length}</span>
      </div>

      <div className="kanban-column-body">
        {chamados.length === 0 && <p className="kanban-empty">Nenhum chamado aqui.</p>}

        {chamados.map((chamado) => (
          <ChamadoCard
            key={chamado._id}
            chamado={chamado}
            arrastavel={podeArrastar}
            onDragStart={onDragStart}
            podeExcluir={podeExcluir}
            onExcluir={onExcluir}
            onVerDetalhes={onVerDetalhes}
          />
        ))}
      </div>
    </div>
  );
}
