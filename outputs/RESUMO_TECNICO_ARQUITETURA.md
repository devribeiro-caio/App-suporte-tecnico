# Resumo técnico da arquitetura — Sistema de Chamados Formis

**Documento técnico do projeto**  
**Escopo:** arquitetura da aplicação desktop, interface, API, persistência, autenticação, comunicação em tempo real e regras de chamados.  
**Baseado na implementação do repositório em 30/10/2026.**

## 1. Visão geral

O sistema é uma aplicação desktop Windows distribuída com Electron. Sua interface é uma SPA feita com React e Vite; a lógica de negócio é exposta por uma API REST em Node.js/Express; os dados são persistidos no MongoDB por meio do Mongoose. O Socket.IO compartilha o mesmo servidor HTTP da API para notificar clientes conectados sobre mudanças nos chamados.

No modo desktop, o processo principal do Electron coordena a inicialização: carrega configuração, inicia o MongoDB local embarcado (quando não há uma URI do Atlas), aguarda o banco aceitar conexões, inicializa Express e Socket.IO, verifica o administrador inicial e abre a janela com o frontend compilado. O banco local usa uma pasta de dados sob o diretório `userData` do Electron, portanto os dados não ficam dentro da pasta de instalação do aplicativo.

```text
┌──────────────────────────────── Aplicativo desktop ───────────────────────────────┐
│                                                                                    │
│  Electron main process ── inicia/encerra ── MongoDB local (porta 27018)            │
│          │                                                                         │
│          ├── inicia ── Express + Socket.IO (porta 3001)                            │
│          │                    │                       │                            │
│          └── BrowserWindow    │ REST/JSON + JWT      │ eventos em tempo real       │
│                  │            ▼                       ▼                            │
│             React + Vite ─────────────── MongoDB / Mongoose                         │
│                                                                                    │
└────────────────────────────────────────────────────────────────────────────────────┘
```

## 2. Tecnologias e responsabilidades

| Camada | Tecnologias | Responsabilidade |
|---|---|---|
| Aplicativo desktop | Electron 30, electron-builder | Janela, ciclo de vida, processos locais, integração com APIs do sistema operacional e empacotamento Windows. |
| Interface | React 18, React DOM, React Router 6, Vite 5 | SPA, autenticação na interface, formulários, quadro Kanban, detalhes e relatórios. |
| API | Node.js, Express 4 | Rotas HTTP, validação de entrada, regras de negócio e respostas JSON. |
| Persistência | MongoDB, Mongoose 8 | Banco documental, modelos, validação de esquema, referências entre usuário e chamado. |
| Tempo real | Socket.IO 4 no servidor e `socket.io-client` na interface | Propagação de criação, atualização e remoção de chamados para sessões conectadas. |
| Autenticação | JWT, bcryptjs | Senhas armazenadas como hash e tokens Bearer nas requisições protegidas. |
| Configuração | dotenv | Leitura das variáveis definidas para cada ambiente. |

## 3. Organização lógica do código

### Processo desktop — `electron/`

- `main.js` cria e gerencia a `BrowserWindow`, localiza o executável do MongoDB embarcado, prepara a configuração e inicializa banco e backend.
- `preload.js` expõe uma superfície pequena por `contextBridge` em `window.suporteDesktop`. Atualmente há operações IPC para salvar relatórios PDF e gerenciar credenciais lembradas.
- A janela desabilita `nodeIntegration` e ativa `contextIsolation`; as operações privilegiadas são delegadas ao processo principal pelo preload.
- O ciclo de encerramento tenta parar o servidor HTTP e encerrar o processo MongoDB. O Electron também impede a abertura de múltiplas instâncias.
- Em desenvolvimento, a janela tenta carregar `frontend/dist/index.html` e possui um fallback para a URL local do servidor. Em distribuição, o `electron-builder` empacota o frontend compilado, os arquivos do backend e os recursos configurados.

### Interface — `frontend/src/`

- `App.jsx` e o React Router organizam as rotas da SPA.
- `AuthContext.jsx` mantém o usuário e o token na sessão da interface. A opção de manter conectado escolhe `localStorage`; sem ela, a sessão fica em `sessionStorage`. Na restauração, a interface verifica a validade temporal do JWT antes de reutilizar a sessão.
- `services/api.js` centraliza requisições HTTP, serialização JSON, cabeçalho `Authorization: Bearer ...` e serviços de autenticação, usuários e chamados.
- `services/socket.js` cria a conexão Socket.IO autenticada e registra listeners para eventos de novos chamados, atualizações, remoções e outros eventos usados pela aplicação.
- `pages/Dashboard/` contém o painel Kanban, modais, formulários e geração dos relatórios PDF/Excel. Os componentes de formulário e card são separados do componente principal do dashboard.
- A URL da API/Socket é formada a partir do endereço salvo em `localStorage` (`SERVER_IP`) ou usa `127.0.0.1`, sempre na porta `3001` para a instalação desktop padrão.

### Backend — `backend/src/`

- `app.js` registra CORS, parser JSON, endpoint de saúde `/` e os grupos `/api/auth` e `/api/chamados`.
- `routes/` associa verbos e caminhos HTTP a controladores e middlewares.
- `controllers/` implementa autenticação, consulta e manutenção de chamados, além das operações de aprovação existentes.
- `middlewares/authMiddleware.js` verifica o token JWT e preenche `req.usuario`; `roleMiddleware.js` aplica restrições baseadas em perfil onde usado.
- `models/` define os esquemas Mongoose de usuários e chamados.
- `config/db.js` conecta ao MongoDB usando `MONGO_URI` ou `MONGODB_URI`.
- `config/socket.js` autentica a conexão Socket.IO com JWT, coloca clientes em salas individuais e na sala de suporte e publica alterações aos participantes relevantes.
- `config/seedAdmin.js` garante a existência do administrador configurado durante a inicialização.

## 4. Inicialização e modos de banco

### Aplicativo Electron

1. O processo principal do Electron procura as variáveis de ambiente nos caminhos de configuração esperados.
2. Se a URI for MongoDB Atlas (`mongodb+srv://`), usa o serviço remoto configurado e não inicia um `mongod` local.
3. Caso contrário, inicia o binário MongoDB embarcado em `127.0.0.1:27018`, com dados em `app.getPath('userData')/mongodb-data`.
4. O Electron testa a porta até o banco aceitar conexões (limite configurado de 60 tentativas, com intervalo de um segundo).
5. Inicializa o Express na porta `3001`, conecta o Mongoose, verifica/cria o administrador inicial e monta o Socket.IO no servidor HTTP.
6. Abre a interface compilada na janela do Electron.

### Execução separada para desenvolvimento

O backend também possui `backend/server.js`, que carrega dotenv, estabelece conexão ao MongoDB, prepara o administrador e inicia o servidor HTTP com Socket.IO. A interface web pode ser iniciada com o Vite. Os comandos e pré-requisitos de operação estão descritos no `README.md` da raiz; o fluxo de empacotamento usa os scripts de build do projeto.

## 5. API e fluxo de autenticação

### Rotas principais

| Método | Rota | Acesso / finalidade |
|---|---|---|
| `POST` | `/api/auth/login` | Autenticar com email e senha e receber usuário e JWT. |
| `POST` | `/api/auth/registrar` | Registrar usuário, conforme regras de perfil do controlador. |
| `GET` | `/api/auth/usuarios` | Listar usuários com autenticação. |
| `POST` | `/api/auth/registrar-com-perfil` | Registrar com perfil mediante autenticação e validação de perfil. |
| `GET` | `/api/chamados` | Listar chamados visíveis ao usuário autenticado. |
| `GET` | `/api/chamados/:id` | Consultar um chamado individual sujeito às regras de acesso. |
| `POST` | `/api/chamados` | Criar chamado; tipo, data, participantes e outros campos são validados pelo servidor. |
| `PUT` | `/api/chamados/:id` | Atualizar status ou campos permitidos do chamado. |
| `DELETE` | `/api/chamados/:id` | Remover conforme as restrições de perfil e estado implementadas. |

### Login

1. A interface envia email, senha e a opção de manter conectado.
2. O servidor localiza o usuário e compara a senha por meio de bcryptjs; o hash não é retornado em consultas padrão.
3. Um JWT contém a identidade e o perfil. A expiração padrão configurável é de oito horas; a opção manter conectado gera token de 30 dias.
4. A interface envia o token em `Authorization: Bearer <token>` nas chamadas protegidas.
5. O middleware valida assinatura e expiração antes de delegar ao controlador.

## 6. Modelo de dados

### Usuário

- `nome`, `email`, `senha`, `perfil` (`usuario`, `tecnico` ou `admin`) e timestamps.
- Email é normalizado para minúsculas e único.
- Senha usa `bcryptjs` com salt antes de ser gravada; o campo é excluído das consultas Mongoose por padrão.

### Chamado

O documento de chamado contempla, entre outros campos:

- `titulo`, `descricao`, `tipoChamado`, `dataOcorrencia`, `status` e `prioridade`;
- referências a `solicitante`, `destinatario`, `responsavel` e `aprovadoPor`;
- `iniciadoEm`, `resolvidoEm`, `aprovadoEm` e `relatoResolucao`;
- `createdAt` e `updatedAt`, fornecidos por `timestamps`.

**Tipos oferecidos para novos chamados:** `SAC`, `SUPORTE`, `OCORRÊNCIA INTERNA` e `TI`. A API valida a lista no servidor além das opções do formulário. Valores históricos (`Atendimento ao cliente` e `Pós Venda`) continuam contemplados no esquema e em partes do fluxo de aprovação para manter compatibilidade com registros antigos; eles não são oferecidos para novas aberturas.

**Prioridades:** baixa, média (`media` no valor técnico), alta e urgente.

## 7. Estados, transições e autorização de finalização

Os estados operacionais solicitados são **ABERTO**, **EM ANDAMENTO**, **RESOLVIDO** e **FINALIZADO**. O valor técnico salvo no MongoDB usa identificadores em minúsculas: `aberto`, `em_andamento`, `resolvido` e `finalizado`.

O fluxo preserva também `aguardando_aprovacao`, um estado existente controlado pelo sistema para chamados de tipos sujeitos à aprovação. A interface não permite mover manualmente um card para esse estado: ele é criado pelo fluxo de registro de resolução e a conclusão é autorizada pelo processo de aprovação existente. Portanto, este estado interno de aprovação permanece além dos quatro estados operacionais descritos acima.

A transição para `finalizado` tem uma regra própria, aplicada no backend — não depende apenas de ocultar ou exibir controles na interface:

1. O chamado precisa estar no estado `resolvido`.
2. O email autenticado é normalizado (espaços removidos e convertido para minúsculas) e deve corresponder exatamente a um destes endereços: `formis@formis.com.br`, `administrativo@formis.com.br` ou `laboratorio@formis.com.br`.
3. Um usuário fora da lista recebe resposta de autorização negada, mesmo que possua outro perfil administrativo.
4. A chamada de finalização altera somente o status; não é aceita junto a mudanças de prioridade, responsável, relato ou destinatário.
5. Chamados já finalizados não podem retornar a outro status pela rota de atualização.

Para que a operação seja possível, esses três emails também recebem acesso de leitura aos chamados resolvidos, inclusive quando suas contas possuem perfil comum. Os demais usuários continuam sujeitos às regras existentes de participação e perfil. O quadro e os relatórios exibem `FINALIZADO`.

## 8. Atualizações em tempo real

O Socket.IO está acoplado ao mesmo servidor HTTP da API. Na conexão, o cliente envia o JWT no handshake; o servidor valida o token antes de aceitar a sessão. O socket entra na sala `usuario:<id>` e, para perfis de suporte, também em `equipe:suporte`.

As operações de criação, atualização e remoção emitem eventos como `novo-chamado`, `chamado-atualizado` e `chamado-removido`. Os participantes e a equipe recebem a atualização sem precisar recarregar manualmente a página. A interface também configura tentativas de reconexão.

## 9. Segurança, configuração e operação

- Manter `backend/.env` fora do controle de versão e nunca registrar `JWT_SECRET`, senhas ou URI completa do MongoDB em logs/documentos públicos.
- Definir segredo JWT forte e exclusivo no ambiente de produção; invalidar/rotacionar tokens se houver exposição da chave.
- Definir credenciais administrativas fortes na configuração. O bootstrap contém valores alternativos de desenvolvimento quando a configuração de administrador não está definida; eles devem ser sobrescritos por configuração explícita e não podem ser usados em produção.
- O processo Electron escuta em `0.0.0.0:3001` para permitir conexão por endereço/IP, enquanto o cliente desktop padrão usa loopback. Restringir a porta no firewall e na rede aos equipamentos autorizados.
- A configuração atual do Socket.IO permite origem ampla, necessária ao contexto Electron `file://` descrito no código; se a implantação passar a servir clientes web em rede, revisar a política CORS/origens e a exposição do servidor.
- A conexão MongoDB local é vinculada a `127.0.0.1`; para Atlas, aplicar usuário de banco dedicado, permissões mínimas e lista de IPs permitidos.
- O JWT é validado na API e também no handshake Socket.IO. A autorização de finalização é conferida novamente pelo backend em cada chamada.
- Credenciais lembradas e operações privilegiadas da interface atravessam o preload/IPC do Electron; manter essa API exposta pequena e revisada.

## 10. Build, distribuição e arquivos relevantes

- O Vite gera os arquivos estáticos do frontend em `frontend/dist`.
- O `electron-builder` empacota o processo Electron, backend e frontend compilado, além dos recursos listados no `package.json` (incluindo o binário local de MongoDB quando presente).
- As configurações do instalador incluem alvos Windows NSIS e portátil.
- A pasta `dist/` recebe os artefatos de distribuição conforme a configuração e os scripts existentes.
- `README.md` registra requisitos, variáveis de ambiente de exemplo, comandos de desenvolvimento e de build.

## 11. Verificações desta revisão

- A sintaxe dos arquivos JavaScript do backend foi verificada com `node --check`.
- Os arquivos JSX modificados foram analisados pelo parser do esbuild e passaram; `git diff --check` também passou.
- A tentativa de executar o build Vite não concluiu: o esbuild retornou `Acesso negado` ao ler o diretório pai (`../../..`) e falhou ao carregar `frontend/vite.config.js`. Não foi feita alteração de configuração para contornar a permissão. Recomenda-se repetir o build em um ambiente com acesso normal ao workspace e validar a aplicação no Electron antes de distribuir a nova versão.
- Não foram iniciados o backend nem o banco de dados e não foram executados testes de integração contra dados reais.
