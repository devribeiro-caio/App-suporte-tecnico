import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);
const CHAVE_SESSAO = "sessao-chamados";
const EMAIL_SUPORTE_USUARIO = "suporte@formis.com";

function normalizarPerfilUsuario(usuario) {
  if (usuario?.email?.trim().toLowerCase() === EMAIL_SUPORTE_USUARIO) {
    return { ...usuario, perfil: "usuario" };
  }
  return usuario;
}

function tokenAindaValido(token) {
  try {
    const partePayload = token.split(".")[1];
    const base64 = partePayload.replace(/-/g, "+").replace(/_/g, "/");
    const payload = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")));
    return Number(payload.exp) * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    try {
      const salvo = localStorage.getItem(CHAVE_SESSAO) || sessionStorage.getItem(CHAVE_SESSAO);
      if (salvo) {
        const sessao = JSON.parse(salvo);
        if (sessao.usuario && sessao.token && tokenAindaValido(sessao.token)) {
          setUsuario(normalizarPerfilUsuario(sessao.usuario));
          setToken(sessao.token);
        } else {
          localStorage.removeItem(CHAVE_SESSAO);
          sessionStorage.removeItem(CHAVE_SESSAO);
        }
      }
    } catch {
      localStorage.removeItem(CHAVE_SESSAO);
      sessionStorage.removeItem(CHAVE_SESSAO);
    } finally {
      setCarregando(false);
    }
  }, []);

  function entrar(usuario, token, manterConectado = false) {
    const usuarioAtualizado = normalizarPerfilUsuario(usuario);
    setUsuario(usuarioAtualizado);
    setToken(token);
    localStorage.removeItem(CHAVE_SESSAO);
    sessionStorage.removeItem(CHAVE_SESSAO);
    const armazenamento = manterConectado ? localStorage : sessionStorage;
    armazenamento.setItem(CHAVE_SESSAO, JSON.stringify({ usuario: usuarioAtualizado, token }));
  }

  function sair() {
    setUsuario(null);
    setToken(null);
    localStorage.removeItem(CHAVE_SESSAO);
    sessionStorage.removeItem(CHAVE_SESSAO);
  }

  return (
    <AuthContext.Provider value={{ usuario, token, carregando, entrar, sair }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error("useAuth precisa ser usado dentro de um AuthProvider");
  }
  return contexto;
}
