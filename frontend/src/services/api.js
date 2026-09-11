const getApiUrl = () => {
  const savedIp = localStorage.getItem("SERVER_IP");
  
  if (savedIp) {
    return `http://${savedIp}:3001/api`;
  }
  
  // Por padrão, usa localhost na porta 3001 para apps desktop locais
  return `http://127.0.0.1:3001/api`;
};

async function request(path, { method = "GET", body, token } = {}) {
  const API_URL = getApiUrl();
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const resposta = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const dados = resposta.status !== 204 ? await resposta.json() : null;

    if (!resposta.ok) {
      throw new Error(dados?.erro || "Erro inesperado na requisição");
    }

    return dados;
  } catch (error) {
    console.error(`[API] Erro na requisição para ${API_URL}${path}:`, error.message);
    throw error;
  }
}

export const AuthService = {
  login(email, senha) {
    return request("/auth/login", { method: "POST", body: { email, senha } });
  },
  registrar(nome, email, senha) {
    return request("/auth/registrar", {
      method: "POST",
      body: { nome, email, senha },
    });
  },
};

export const ChamadoService = {
  listar(token) {
    return request("/chamados", { token });
  },
  criar(dados, token) {
    return request("/chamados", { method: "POST", body: dados, token });
  },
  atualizarStatus(id, status, token, relatoResolucao) {
    return request(`/chamados/${id}`, {
      method: "PUT",
      body: {
        status,
        ...(relatoResolucao !== undefined ? { relatoResolucao } : {}),
      },
      token,
    });
  },
  remover(id, token) {
    return request(`/chamados/${id}`, { method: "DELETE", token });
  },
};
