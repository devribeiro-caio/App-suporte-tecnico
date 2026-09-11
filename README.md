# Sistema de Suporte Tecnico

Aplicativo desktop para abertura, acompanhamento e resolucao de chamados internos.

## Recursos

- Quadro Kanban com chamados abertos, em andamento e resolvidos.
- Criacao de chamados entre os usuarios autorizados.
- Registro do relato de resolucao.
- Visualizacao completa de cada chamado pelo botao "Ver mais".
- Relatorio por periodo com impressao ou exportacao em PDF.
- Atualizacoes em tempo real com Socket.IO.
- Aplicativo desktop empacotado com Electron.

## Tecnologias

- React e Vite
- Node.js e Express
- MongoDB e Mongoose
- Socket.IO
- Electron e electron-builder

## Requisitos

- Node.js 18 ou superior
- MongoDB local ou MongoDB Atlas
- npm

## Instalacao

Instale as dependencias da raiz e do frontend:

```bash
npm install
cd frontend
npm install
```

Crie o arquivo `backend/.env` com as variaveis do ambiente. Nao envie esse arquivo ao Git.

Exemplo de variaveis necessarias:

```env
PORT=3001
MONGODB_URI=sua_string_de_conexao
JWT_SECRET=uma_chave_secreta
JWT_EXPIRES_IN=8h
ADMIN_EMAIL=suporte@formis.com
ADMIN_SENHA=defina_uma_senha_segura
ADMIN_NOME=Suporte Tecnico
```

## Execucao

Para iniciar o aplicativo em desenvolvimento:

```bash
npm run dev
```

Para executar o backend separadamente:

```bash
cd backend
npm start
```

Para executar o frontend no navegador:

```bash
cd frontend
npm run dev
```

## Build e instalador

Para gerar os arquivos de producao:

```bash
npm run build
```

Para gerar o instalador Windows e a versao portatil:

```bash
node build-installer.js
```

Os arquivos gerados ficam na pasta `dist/`.

## Usuarios autorizados

O sistema foi configurado para os usuarios:

- `suporte@formis.com`
- `laboratorio@formis.com.br`

Ambos utilizam perfil de administrador e podem abrir chamados um para o outro.
