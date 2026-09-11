import { useState } from "react";

export default function RelatoResolucaoModal({ chamado, onFechar, onConfirmar }) {
  const [relato, setRelato] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function aoSubmeter(e) {
    e.preventDefault();
    const relatoLimpo = relato.trim();

    if (!relatoLimpo) {
      setErro("Descreva o problema identificado e a solução aplicada.");
      return;
    }

    setErro("");
    setEnviando(true);

    try {
      await onConfirmar(relatoLimpo);
    } catch (erroDaRequisicao) {
      setErro(erroDaRequisicao.message);
      setEnviando(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={enviando ? undefined : onFechar}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <h2>Concluir chamado</h2>
        <p className="modal-description">
          Registre o problema identificado e a solução aplicada em "{chamado.titulo}".
        </p>

        <form onSubmit={aoSubmeter} className="modal-form">
          <label className="ticket-field">
            <span>Relato para o solicitante</span>
            <textarea
              value={relato}
              onChange={(e) => setRelato(e.target.value)}
              placeholder="Descreva o que causou o problema e como ele foi resolvido."
              rows={5}
              maxLength={2000}
              required
              autoFocus
            />
          </label>

          {erro && (
            <p className="ticket-error" role="alert">
              {erro}
            </p>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="modal-cancelar"
              onClick={onFechar}
              disabled={enviando}
            >
              Cancelar
            </button>
            <button type="submit" className="ticket-submit" disabled={enviando}>
              {enviando ? "Concluindo..." : "Concluir chamado"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
