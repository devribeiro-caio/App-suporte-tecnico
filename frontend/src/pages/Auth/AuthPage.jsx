import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import "./AuthPage.css";

const ABAS = { LOGIN: "login", CADASTRO: "cadastro" };

export default function AuthPage() {
  const [aba, setAba] = useState(ABAS.LOGIN);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [serverIp, setServerIp] = useState(localStorage.getItem("SERVER_IP") || "127.0.0.1");
  const [mostrarConfig, setMostrarConfig] = useState(false);

  const { entrar } = useAuth();
  const navigate = useNavigate();

  function trocarAba(novaAba) {
    setAba(novaAba);
    setErro("");
  }

  async function aoSubmeter(evento) {
    evento.preventDefault();
    setErro("");
    setEnviando(true);

    try {
      const resposta =
        aba === ABAS.LOGIN
          ? await AuthService.login(email, senha)
          : await AuthService.registrar(nome, email, senha);

      localStorage.setItem("SERVER_IP", serverIp);
      entrar(resposta.usuario, resposta.token);
      navigate("/dashboard");
    } catch (e) {
      setErro(e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="ticket-card">
        <aside className="ticket-stub">
          <span className="ticket-eyebrow">Sistema de Chamados</span>

          <div className="ticket-number">
            <span className="ticket-number-label">Nº</span>
            <span className="ticket-number-value">000&thinsp;/&thinsp;∞</span>
          </div>

          <p className="ticket-tagline">
            Abra, acompanhe e resolva chamados da sua equipe em um só lugar.
          </p>

          <div style={{ marginTop: '20px', fontSize: '12px', opacity: 0.8 }}>
            <button 
              type="button" 
              onClick={() => setMostrarConfig(!mostrarConfig)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {mostrarConfig ? "Ocultar Configurações" : "Configurar Servidor (TI)"}
            </button>
            
            {mostrarConfig && (
              <div style={{ marginTop: '10px', textAlign: 'left' }}>
                <label style={{ display: 'block', marginBottom: '5px' }}>IP do Servidor Admin:</label>
                <input 
                  type="text" 
                  value={serverIp} 
                  onChange={(e) => setServerIp(e.target.value)}
                  style={{ width: '100%', padding: '5px', borderRadius: '4px', border: '1px solid #ccc', color: '#333' }}
                  placeholder="Ex: 192.168.1.50"
                />
                <small style={{ display: 'block', marginTop: '5px' }}>Reinicie o app após alterar o IP.</small>
              </div>
            )}
          </div>

          <svg
            className="ticket-icon"
            width="56"
            height="56"
            viewBox="0 0 56 56"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M8 20a4 4 0 0 1 4-4h32a4 4 0 0 1 4 4v3a4 4 0 0 0 0 8v3a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4v-3a4 4 0 0 0 0-8v-3Z"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M22 16v24"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="3 4"
            />
          </svg>
        </aside>

        <div className="ticket-seam" aria-hidden="true">
          <span className="ticket-notch ticket-notch-start" />
          <span className="ticket-notch ticket-notch-end" />
        </div>

        <section className="ticket-form-side">
          <div className="ticket-tabs" role="tablist" aria-label="Acesso">
            <button
              type="button"
              role="tab"
              aria-selected={aba === ABAS.LOGIN}
              className={`ticket-tab ${aba === ABAS.LOGIN ? "is-active" : ""}`}
              onClick={() => trocarAba(ABAS.LOGIN)}
            >
              Entrar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={aba === ABAS.CADASTRO}
              className={`ticket-tab ${aba === ABAS.CADASTRO ? "is-active" : ""}`}
              onClick={() => trocarAba(ABAS.CADASTRO)}
            >
              Cadastrar
            </button>
          </div>

          <form className="ticket-form" onSubmit={aoSubmeter}>
            {aba === ABAS.CADASTRO && (
              <label className="ticket-field">
                <span>Nome</span>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Como podemos te chamar"
                  required
                />
              </label>
            )}

            <label className="ticket-field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="voce@empresa.com"
                required
              />
            </label>

            <label className="ticket-field">
              <span>Senha</span>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                minLength={6}
                required
              />
            </label>

            {erro && (
              <p className="ticket-error" role="alert">
                {erro}
              </p>
            )}

            <button type="submit" className="ticket-submit" disabled={enviando}>
              {enviando
                ? "Processando…"
                : aba === ABAS.LOGIN
                ? "Confirmar entrada"
                : "Emitir cadastro"}
            </button>
          </form>

          <p className="ticket-footnote">
            {aba === ABAS.LOGIN ? (
              <>
                Ainda não tem conta?{" "}
                <button
                  type="button"
                  className="ticket-link"
                  onClick={() => trocarAba(ABAS.CADASTRO)}
                >
                  Cadastre-se
                </button>
              </>
            ) : (
              <>
                Já tem conta?{" "}
                <button
                  type="button"
                  className="ticket-link"
                  onClick={() => trocarAba(ABAS.LOGIN)}
                >
                  Entrar
                </button>
              </>
            )}
          </p>
        </section>
      </div>
    </div>
  );
}
