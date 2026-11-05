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
      const mensagem = dados?.detalhe
        ? `${dados.erro || "Erro na requisição"}: ${dados.detalhe}`
        : dados?.erro || "Erro inesperado na requisição";
      throw new Error(mensagem);
    }

    return dados;
  } catch (error) {
    console.error(`[API] Erro na requisição para ${API_URL}${path}:`, error.message);
    throw error;
  }
}

async function requestBlob(path, token) {
  const API_URL = getApiUrl();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const resposta = await fetch(`${API_URL}${path}`, { headers });
  if (!resposta.ok) {
    let dados = null;
    try {
      dados = await resposta.json();
    } catch {}
    throw new Error(dados?.erro || "Não foi possível baixar o arquivo");
  }
  return resposta.blob();
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
  aprovar(id, token, observacaoAprovacao) {
    return request(`/chamados/${id}/aprovar`, {
      method: "PATCH",
      body: { observacaoAprovacao },
      token,
    });
  },
  remover(id, token) {
    return request(`/chamados/${id}`, { method: "DELETE", token });
  },
};

export const AuditoriaChamadoService = {
  listarExclusoesFinalizados(token) {
    return request("/chamados/auditoria/exclusoes-finalizados", { token });
  },
};

export const ChatService = {
  listarConversas(token) {
    return request("/chat/conversas", { token });
  },
  abrirConversa(destinatarioId, token) {
    return request("/chat/conversas", {
      method: "POST",
      body: { destinatarioId },
      token,
    });
  },
  listarMensagens(conversaId, token) {
    return request(`/chat/conversas/${conversaId}/mensagens`, { token });
  },
  enviarMensagem(conversaId, dados, token) {
    return request(`/chat/conversas/${conversaId}/mensagens`, {
      method: "POST",
      body: typeof dados === "string" ? { texto: dados } : dados,
      token,
    });
  },
  baixarArquivo(conversaId, mensagemId, token) {
    return requestBlob(`/chat/conversas/${conversaId}/mensagens/${mensagemId}/arquivo`, token);
  },
  encaminharAudio(conversaId, mensagemId, destinatarioId, token) {
    return request(`/chat/conversas/${conversaId}/mensagens/${mensagemId}/encaminhar`, {
      method: "POST",
      body: { destinatarioId },
      token,
    });
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
