import { useEffect, useState } from "react";
import { AuditoriaChamadoService } from "../../../services/api";
import "./AuditoriaExclusoesModal.css";

const ROTULOS_RESULTADO = {
  concluida: "Exclusão registrada",
  pendente: "Confirmação pendente",
  falhou: "Exclusão não concluída",
};

function formatarData(valor) {
  if (!valor) return "Não informada";
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? "Não informada" : data.toLocaleString("pt-BR");
}

export default function AuditoriaExclusoesModal({ token, onFechar }) {
  const [registros, setRegistros] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let ativo = true;
    AuditoriaChamadoService.listarExclusoesFinalizados(token)
      .then((dados) => {
        if (ativo) setRegistros(dados);
      })
      .catch((error) => {
        if (ativo) setErro(error.message || "Não foi possível carregar a auditoria.");
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [token]);

  return (
    <div className="modal-overlay" onMouseDown={onFechar}>
      <section
        className="modal-box auditoria-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auditoria-exclusoes-titulo"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="auditoria-modal-header">
          <div>
            <h2 id="auditoria-exclusoes-titulo">Auditoria de exclusões</h2>
            <p>Histórico das exclusões de chamados finalizados (até 200 registros).</p>
          </div>
          <button type="button" className="modal-cancelar" onClick={onFechar}>
            Fechar
          </button>
        </header>

        {carregando && <p role="status">Carregando auditoria...</p>}
        {!carregando && erro && <p className="ticket-error" role="alert">{erro}</p>}
        {!carregando && !erro && registros.length === 0 && (
          <p className="auditoria-vazia">Ainda não há exclusões de chamados finalizados registradas.</p>
        )}
        {!carregando && !erro && registros.length > 0 && (
          <ol className="auditoria-lista">
            {registros.map((registro) => {
              const idChamado = String(registro.chamadoId || "");
              return (
                <li className="auditoria-registro" key={registro._id}>
                  <div className="auditoria-registro-cabecalho">
                    <div>
                      <strong>Chamado #{idChamado.slice(-5)} — {registro.tituloChamado}</strong>
                      <span>{registro.tipoChamado || "Tipo não informado"}{registro.skuEquipamento ? ` · SKU ${registro.skuEquipamento}` : ""}</span>
                    </div>
                    <span className={`auditoria-resultado auditoria-resultado-${registro.resultado}`}>
                      {ROTULOS_RESULTADO[registro.resultado] || registro.resultado}
                    </span>
                  </div>
                  <dl className="auditoria-dados">
                    <div>
                      <dt>Administrador</dt>
                      <dd>{registro.administradorNome || registro.administradorEmail}</dd>
                    </div>
                    <div>
                      <dt>E-mail</dt>
                      <dd>{registro.administradorEmail}</dd>
                    </div>
                    <div>
                      <dt>{registro.resultado === "concluida" ? "Excluído em" : "Registro criado em"}</dt>
                      <dd>{formatarData(registro.excluidoEm || registro.createdAt)}</dd>
                    </div>
                    {registro.motivoFalha && (
                      <div>
                        <dt>Resultado</dt>
                        <dd>{registro.motivoFalha}</dd>
                      </div>
                    )}
                  </dl>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </div>
  );
}
