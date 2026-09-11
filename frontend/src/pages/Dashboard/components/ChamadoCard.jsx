import { useEffect, useState } from "react";

const PRIORIDADE_LABEL = {
  baixa: "Baixa",
  media: "Media",
  alta: "Alta",
  urgente: "Urgente",
};

function formatarDuracao(milisegundos) {
  const totalSegundos = Math.max(0, Math.floor(milisegundos / 1000));
  const dias = Math.floor(totalSegundos / 86400);
  const horas = Math.floor((totalSegundos % 86400) / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;

  const horario = [horas, minutos, segundos]
    .map((valor) => String(valor).padStart(2, "0"))
    .join(":");

  return dias > 0 ? `${dias}d ${horario}` : horario;
}

export default function ChamadoCard({
  chamado,
  arrastavel,
  onDragStart,
  podeExcluir,
  onExcluir,
  onVerDetalhes,
}) {
  const [agora, setAgora] = useState(Date.now());

  useEffect(() => {
    if (chamado.status !== "em_andamento" || !chamado.iniciadoEm) return undefined;

    const intervalo = window.setInterval(() => setAgora(Date.now()), 1000);
    return () => window.clearInterval(intervalo);
  }, [chamado.status, chamado.iniciadoEm]);

  const inicio = chamado.iniciadoEm ? new Date(chamado.iniciadoEm).getTime() : null;
  const fim = chamado.resolvidoEm ? new Date(chamado.resolvidoEm).getTime() : agora;
  const duracao = inicio ? formatarDuracao(fim - inicio) : null;

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

      {duracao && (
        <div className={`chamado-tempo chamado-tempo-${chamado.status}`}>
          <span>{chamado.status === "em_andamento" ? "Em atendimento" : "Tempo de atendimento"}</span>
          <strong>{duracao}</strong>
        </div>
      )}

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
