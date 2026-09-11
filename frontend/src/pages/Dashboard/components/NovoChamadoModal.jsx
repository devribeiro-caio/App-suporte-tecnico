import { useMemo, useState } from "react";

const USUARIOS_SUPORTE = [
  { email: "suporte@formis.com", nome: "Suporte" },
  { email: "laboratorio@formis.com.br", nome: "Laboratorio" },
];

export default function NovoChamadoModal({ usuario, onFechar, onCriar }) {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [prioridade, setPrioridade] = useState("media");
  const [destinatarioEmail, setDestinatarioEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const destinatarios = useMemo(
    () => USUARIOS_SUPORTE.filter((item) => item.email !== usuario?.email?.toLowerCase()),
    [usuario?.email]
  );

  async function aoSubmeter(event) {
    event.preventDefault();
    setErro("");
    setEnviando(true);

    try {
      await onCriar({ titulo, descricao, prioridade, destinatarioEmail });
      onFechar();
    } catch (error) {
      setErro(error.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={onFechar}>
      <div className="modal-box" onMouseDown={(event) => event.stopPropagation()}>
        <h2>Abrir novo chamado</h2>

        <form onSubmit={aoSubmeter} className="modal-form">
          <label className="ticket-field">
            <span>Titulo</span>
            <input value={titulo} onChange={(event) => setTitulo(event.target.value)} required />
          </label>

          <label className="ticket-field">
            <span>Descricao</span>
            <textarea value={descricao} onChange={(event) => setDescricao(event.target.value)} rows={5} required />
          </label>

          <label className="ticket-field">
            <span>Destinatario</span>
            <select
              value={destinatarioEmail}
              onChange={(event) => setDestinatarioEmail(event.target.value)}
              required
            >
              <option value="">Selecione o destinatario</option>
              {destinatarios.map((destinatario) => (
                <option key={destinatario.email} value={destinatario.email}>
                  {destinatario.nome} - {destinatario.email}
                </option>
              ))}
            </select>
          </label>

          <label className="ticket-field">
            <span>Prioridade</span>
            <select value={prioridade} onChange={(event) => setPrioridade(event.target.value)}>
              <option value="baixa">Baixa</option>
              <option value="media">Media</option>
              <option value="alta">Alta</option>
              <option value="urgente">Urgente</option>
            </select>
          </label>

          {erro && <p className="ticket-error" role="alert">{erro}</p>}

          <div className="modal-actions">
            <button type="button" className="modal-cancelar" onClick={onFechar}>Cancelar</button>
            <button type="submit" className="ticket-submit" disabled={enviando}>
              {enviando ? "Enviando..." : "Abrir chamado"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
