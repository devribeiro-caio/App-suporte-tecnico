import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [token, setToken] = useState(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const salvo = localStorage.getItem("sessao-chamados");
    if (salvo) {
      const { usuario, token } = JSON.parse(salvo);
      setUsuario(usuario);
      setToken(token);
    }
    setCarregando(false);
  }, []);

  function entrar(usuario, token) {
    setUsuario(usuario);
    setToken(token);
    localStorage.setItem("sessao-chamados", JSON.stringify({ usuario, token }));
  }

  function sair() {
    setUsuario(null);
    setToken(null);
    localStorage.removeItem("sessao-chamados");
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
