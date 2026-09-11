# 🔍 Guia de Diagnóstico - Socket.io em Tempo Real

## Status Atual da Implementação

✅ **Socket.io está implementado e configurado**
✅ **Eventos de novo-chamado estão sendo emitidos**
✅ **Listeners no frontend estão configurados**
✅ **Notificações sonoras e visuais estão prontas**

---

## 📋 Checklist de Verificação

### 1. Backend - Verificar Configuração

#### ✓ Socket.io está ativo?
```bash
# No console do Electron, procure por:
[Socket.io] Configurado com sucesso.
[Socket] Cliente conectado: Admin Teste (admin) – Socket ID: xxxxx
```

#### ✓ Variáveis de Ambiente
```
PORT=3000
MONGO_URI=mongodb+srv://helpdeskformis:55Wformis3568@cluster0.yyf0tok.mongodb.net/?appName=Cluster0
JWT_SECRET=dev_ribeiro_0608
JWT_EXPIRES_IN=8h
```

#### ✓ Servidor Express está rodando?
- Deve estar em `http://127.0.0.1:3000`
- Verifique se a porta 3000 está disponível

---

### 2. Frontend - Verificar Conexão

#### Abrir DevTools (F12) e procurar por:

**Console - Logs esperados:**
```
[Socket] Tentando conectar em: http://127.0.0.1:3000
[Socket] Conectado com sucesso! ID: xxxxx
[Socket] Auth OK para: Admin Teste (admin)
```

**Network - WebSocket:**
- Procure por uma conexão WebSocket em `http://127.0.0.1:3000/socket.io/`
- Status: `101 Switching Protocols` (significa que WebSocket está ativo)

---

## 🧪 Teste Prático em Tempo Real

### Cenário 1: Novo Chamado Instantâneo

**Pré-requisitos:**
- App rodando em Electron
- Dois navegadores/abas abertas:
  - **Navegador 1**: Login como usuário comum
  - **Navegador 2**: Login como admin/técnico

**Passos:**
1. No **Navegador 1**, clique em "+ Novo chamado"
2. Preencha os dados e clique em "Criar"
3. **Esperado no Navegador 2 (Admin):**
   - ✅ Som de notificação toca (Ding-dong)
   - ✅ Badge mostra "1 NOVOS"
   - ✅ Toast aparece: "Novo chamado: [Título]"
   - ✅ Chamado aparece na coluna "Aberto" **SEM RELOAD**

**Se não funcionar:**
- Abra DevTools (F12) no Navegador 2
- Procure por erros no Console
- Verifique se a conexão WebSocket está ativa na aba Network

---

### Cenário 2: Atualização de Status em Tempo Real

**Pré-requisitos:**
- Dois navegadores com login de admin/técnico

**Passos:**
1. No **Navegador 1**, arraste um chamado para "Em andamento"
2. **Esperado no Navegador 2:**
   - ✅ Chamado se move para a mesma coluna **instantaneamente**
   - ✅ Som suave toca
   - ✅ Sem necessidade de reload

---

## 🐛 Troubleshooting

### Problema 1: Socket.io não conecta

**Sintomas:**
```
[Socket] Erro de conexão: Connection refused
```

**Soluções:**
1. Verifique se o backend está rodando
   ```bash
   # Procure por:
   [Express] Servidor rodando em http://0.0.0.0:3000
   ```

2. Verifique se a porta 3000 está disponível
   ```powershell
   netstat -ano | findstr :3000
   ```

3. Verifique CORS no backend (`backend/src/config/socket.js`)
   - Deve permitir todas as origens em desenvolvimento
   - Procure por: `cors: { origin: (origin, callback) => { callback(null, true); } }`

4. Tente conectar manualmente:
   ```javascript
   // No console do navegador (F12):
   const socket = io('http://127.0.0.1:3000', { 
     auth: { token: localStorage.getItem('token') } 
   });
   socket.on('connect', () => console.log('Conectado!'));
   socket.on('connect_error', (err) => console.error(err));
   ```

---

### Problema 2: Som não toca

**Sintomas:**
- Chamado chega, mas sem som

**Soluções:**
1. Clique em qualquer lugar da página para desbloquear áudio
   - Navegadores modernos exigem interação do usuário

2. Verifique volume do navegador/computador

3. Abra DevTools e procure por:
   ```
   [Áudio] Sistema de som desbloqueado.
   ```

4. Se vir erro:
   ```
   [Som] Não foi possível tocar notificação: NotSupportedError
   ```
   - Pode ser problema de contexto de áudio
   - Tente recarregar a página

---

### Problema 3: Chamados não chegam em tempo real

**Sintomas:**
- Precisa fazer reload para ver novos chamados

**Soluções:**
1. Verifique se o Socket.io está conectado (DevTools → Console)

2. Verifique se o evento está sendo emitido no backend
   - Procure por: `[Socket] Novo chamado recebido:`

3. Verifique se o listener está ativo no frontend
   ```javascript
   // No console do navegador:
   socket.listeners('novo-chamado')
   // Deve retornar um array com funções
   ```

4. Teste manualmente:
   ```javascript
   // No console do navegador:
   socket.on('novo-chamado', (data) => {
     console.log('Novo chamado recebido:', data);
   });
   ```

---

### Problema 4: Múltiplos eventos duplicados

**Sintomas:**
- Som toca 2-3 vezes para o mesmo chamado
- Toast aparece múltiplas vezes

**Soluções:**
1. Verifique se há múltiplas conexões Socket.io
   ```javascript
   // No console:
   io.sockets.length // Deve ser 1
   ```

2. Verifique se há listeners duplicados
   ```javascript
   // No console:
   socket.listeners('novo-chamado').length // Deve ser 1
   ```

3. Procure por múltiplas chamadas a `conectarSocket()`
   - Pode estar no useEffect sem dependências corretas

---

## 📊 Verificação de Logs

### Logs Esperados no Backend (Console do Electron)

```
[Socket.io] Configurado com sucesso.
[Socket] Cliente conectado: Admin Teste (admin) – Socket ID: abc123
[Socket] Auth OK para: Admin Teste (admin)
[Express] Chamado criado com sucesso
[Socket] Novo chamado recebido: { _id: '...', titulo: '...' }
```

### Logs Esperados no Frontend (DevTools → Console)

```
[Socket] Tentando conectar em: http://127.0.0.1:3000
[Socket] Conectado com sucesso! ID: xyz789
[Socket] Novo chamado recebido: { _id: '...', titulo: '...' }
[Áudio] Sistema de som desbloqueado.
```

---

## 🔧 Script de Teste Automático

Um script de teste foi criado em `test-socket.js`. Para usar:

```bash
# Certifique-se de que o backend está rodando
# Depois execute:
node test-socket.js
```

**O que o script testa:**
1. ✅ Conexão de dois clientes (admin e usuário)
2. ✅ Criação de novo chamado via API
3. ✅ Recebimento de evento "novo-chamado"
4. ✅ Atualização de chamado via API
5. ✅ Recebimento de evento "chamado-atualizado"

---

## 📱 Teste em Múltiplas Abas

Para testar se o Socket.io funciona em múltiplas abas:

1. Abra a primeira aba e faça login como admin
2. Abra a segunda aba e faça login como usuário comum
3. Na segunda aba, crie um novo chamado
4. **Esperado na primeira aba:**
   - Notificação instantânea (som + toast + badge)
   - Chamado aparece sem reload

---

## 🎯 Próximos Passos se Tudo Funcionar

Se todos os testes passarem, você pode implementar:

1. **Notificações do Navegador** (mesmo com aba inativa)
   - Usa Web Notifications API
   - Requer permissão do usuário

2. **Histórico de Notificações**
   - Salvar últimas 10 notificações
   - Exibir em um painel

3. **Indicador de Conexão**
   - Mostrar status do Socket.io (conectado/desconectado)
   - Reconectar automaticamente

4. **Som Customizável**
   - Permitir usuário escolher som de notificação
   - Salvar preferência

---

## 📞 Suporte

Se encontrar problemas:

1. **Verifique os logs** (Console do Electron e DevTools)
2. **Teste com o script** `node test-socket.js`
3. **Verifique a conectividade** com MongoDB Atlas
4. **Reinicie o app** (às vezes resolve problemas de conexão)

---

## ✅ Checklist Final

- [ ] Backend rodando em `http://127.0.0.1:3000`
- [ ] Socket.io conectando (DevTools → Console)
- [ ] Novo chamado chega instantaneamente
- [ ] Som de notificação toca
- [ ] Badge de contador funciona
- [ ] Toast aparece com título do chamado
- [ ] Atualização de status funciona em tempo real
- [ ] Múltiplas abas sincronizam corretamente

Se todos os itens estiverem ✅, o sistema de tempo real está **funcionando perfeitamente**!
