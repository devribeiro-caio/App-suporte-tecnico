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
  login(email, senha, manterConectado) {
    return request("/auth/login", {
      method: "POST",
      body: { email, senha, manterConectado },
    });
  },
  registrar(nome, email, senha, manterConectado) {
    return request("/auth/registrar", {
      method: "POST",
      body: { nome, email, senha, manterConectado },
    });
  },
};

export const UsuarioService = {
  listar(token) {
    return request("/auth/usuarios", { token });
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
  atualizarDestinatario(id, destinatario, token) {
    return request(`/chamados/${id}`, {
      method: "PUT",
      body: { destinatario },
      token,
    });
  },
  remover(id, token) {
    return request(`/chamados/${id}`, { method: "DELETE", token });
  },
};

export const ReuniaoService = {
  listar(token) {
    return request("/reunioes", { token });
  },
  criar(dados, token) {
    return request("/reunioes", { method: "POST", body: dados, token });
  },
  cancelar(id, token) {
    return request(`/reunioes/${id}/cancelar`, { method: "PATCH", token });
  },
  remover(id, token) {
    return request(`/reunioes/${id}`, { method: "DELETE", token });
  },
  listarConvitesPendentes(token) {
    return request("/reunioes/convites-pendentes", { token });
  },
  marcarConviteNotificado(id, token) {
    return request(`/reunioes/${id}/convite-notificado`, { method: "POST", token });
  },
  listarPendentes(token) {
    return request("/reunioes/pendentes-notificacao", { token });
  },
  marcarNotificada(id, token) {
    return request(`/reunioes/${id}/notificada`, { method: "POST", token });
  },
  listarPendentesAntecipados(token) {
    return request("/reunioes/pendentes-antecipados", { token });
  },
  marcarAntecipadaNotificada(id, token) {
    return request(`/reunioes/${id}/antecipada-notificada`, { method: "POST", token });
  },
};
