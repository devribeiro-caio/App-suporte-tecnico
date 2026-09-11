import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function DashboardPlaceholder() {
  const { usuario, sair } = useAuth();

  if (!usuario) {
    return <Navigate to="/" replace />;
  }

  return (
    <div style={{ padding: 40, fontFamily: "var(--font-body)" }}>
      <h1 style={{ fontFamily: "var(--font-display)" }}>
        Bem-vindo, {usuario.nome} 👋
      </h1>
      <p>Perfil: {usuario.perfil}</p>
      <p style={{ color: "var(--color-text-on-paper-dim)" }}>
        A listagem de chamados entra aqui no próximo passo.
      </p>
      <button
        onClick={sair}
        style={{
          marginTop: 16,
          padding: "10px 16px",
          borderRadius: 8,
          border: "none",
          background: "var(--color-accent)",
          color: "var(--color-accent-ink)",
          cursor: "pointer",
        }}
      >
        Sair
      </button>
    </div>
  );
}
