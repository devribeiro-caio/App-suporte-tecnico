// ═══════════════════════════════════════════════════════════════
// SISTEMA DE CHAMADOS TI — Electron Main Process
// Gerencia: MongoDB (embarcado) → Express (backend) → Frontend
// ═══════════════════════════════════════════════════════════════

const { app, BrowserWindow, dialog, ipcMain, safeStorage } = require('electron');
const path = require('path');
const { fileURLToPath } = require('url');
const fs = require('fs');
const { spawn } = require('child_process');
const net = require('net');

// ─────────────────────────────────────────────────────────────
// Variáveis globais
// ─────────────────────────────────────────────────────────────
let mongoProcess = null;
let httpServer = null;
let mainWindow = null;

ipcMain.handle('relatorio:salvar-pdf', async (event, html) => {
  const urlSolicitante = event.senderFrame?.url || event.sender.getURL();
  const remetenteConfiavel = urlSolicitante.startsWith('file://') ||
    /^http:\/\/(127\.0\.0\.1|localhost):3001(?:\/|$)/.test(urlSolicitante);
  if (!remetenteConfiavel) {
    throw new Error('Origem não autorizada para gerar o relatório.');
  }
  if (typeof html !== 'string' || html.length > 25_000_000) {
    throw new Error('O conteúdo do relatório é inválido ou excede o limite permitido.');
  }

  const hoje = new Date();
  const dataArquivo = [hoje.getFullYear(), String(hoje.getMonth() + 1).padStart(2, '0'), String(hoje.getDate()).padStart(2, '0')].join('-');
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Salvar relatório em PDF',
    defaultPath: path.join(app.getPath('downloads'), `relatorio-chamados-${dataArquivo}.pdf`),
    filters: [{ name: 'Arquivo PDF', extensions: ['pdf'] }],
  });
  if (canceled || !filePath) return { cancelado: true };

  const caminhoPdf = path.extname(filePath).toLowerCase() === '.pdf' ? filePath : `${filePath}.pdf`;
  const janelaRelatorio = new BrowserWindow({
    show: false,
    width: 1200,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      javascript: false,
    },
  });

  try {
    await janelaRelatorio.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(html)}`);
    const pdf = await janelaRelatorio.webContents.printToPDF({
      pageSize: 'A4',
      landscape: true,
      printBackground: true,
      margins: { top: 0.35, bottom: 0.35, left: 0.35, right: 0.35 },
    });
    await fs.promises.writeFile(caminhoPdf, pdf);
    return { cancelado: false };
  } finally {
    if (!janelaRelatorio.isDestroyed()) janelaRelatorio.close();
  }
});

const TEMPO_CREDENCIAIS_MS = 30 * 24 * 60 * 60 * 1000;

function validarOrigemCredenciais(event) {
  const url = event.senderFrame?.url || event.sender.getURL();
  if (/^http:\/\/(127\.0\.0\.1|localhost):3001(?:\/|$)/.test(url)) return;

  try {
    const urlOrigem = new URL(url);
    const arquivoOrigem = urlOrigem.protocol === 'file:' ? path.resolve(fileURLToPath(urlOrigem)) : '';
    const arquivoFrontend = path.resolve(__dirname, '..', 'frontend', 'dist', 'index.html');
    const mesmoArquivo = process.platform === 'win32'
      ? arquivoOrigem.toLowerCase() === arquivoFrontend.toLowerCase()
      : arquivoOrigem === arquivoFrontend;
    if (arquivoOrigem && mesmoArquivo) return;
  } catch {}

  throw new Error('Origem não autorizada para acessar as credenciais salvas.');
}

function obterCaminhoCredenciaisLembradas() {
  return path.join(app.getPath('userData'), 'credenciais-lembradas.enc');
}

ipcMain.handle('auth:salvar-credenciais-lembradas', async (event, credenciais) => {
  validarOrigemCredenciais(event);
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('A criptografia segura do Windows não está disponível neste dispositivo.');
  }

  const email = typeof credenciais?.email === 'string' ? credenciais.email.trim().toLowerCase() : '';
  const senha = credenciais?.senha;
  if (!email || email.length > 320 || typeof senha !== 'string' || !senha || senha.length > 2048) {
    throw new Error('Informe um login e uma senha válidos para lembrar neste dispositivo.');
  }

  const caminho = obterCaminhoCredenciaisLembradas();
  await fs.promises.mkdir(path.dirname(caminho), { recursive: true });
  const conteudoCriptografado = safeStorage.encryptString(JSON.stringify({
    email,
    senha,
    salvoEm: Date.now(),
  }));
  await fs.promises.writeFile(caminho, conteudoCriptografado, { mode: 0o600 });
  return { salvo: true };
});

ipcMain.handle('auth:obter-credenciais-lembradas', async (event) => {
  validarOrigemCredenciais(event);
  if (!safeStorage.isEncryptionAvailable()) return null;

  const caminho = obterCaminhoCredenciaisLembradas();
  let conteudoCriptografado;
  try {
    conteudoCriptografado = await fs.promises.readFile(caminho);
  } catch (erro) {
    if (erro.code === 'ENOENT') return null;
    throw erro;
  }

  try {
    const credenciais = JSON.parse(safeStorage.decryptString(conteudoCriptografado));
    const idade = Date.now() - Number(credenciais.salvoEm);
    if (
      !credenciais.email ||
      !credenciais.senha ||
      !Number.isFinite(idade) ||
      idade < 0 ||
      idade >= TEMPO_CREDENCIAIS_MS
    ) {
      await fs.promises.unlink(caminho).catch(() => {});
      return null;
    }
    return { email: credenciais.email, senha: credenciais.senha };
  } catch {
    await fs.promises.unlink(caminho).catch(() => {});
    return null;
  }
});

ipcMain.handle('auth:remover-credenciais-lembradas', async (event) => {
  validarOrigemCredenciais(event);
  try {
    await fs.promises.unlink(obterCaminhoCredenciaisLembradas());
  } catch (erro) {
    if (erro.code !== 'ENOENT') throw erro;
  }
  return { removidas: true };
});

// ─────────────────────────────────────────────────────────────
// 1. ENCONTRAR O BINÁRIO DO MONGODB
// ─────────────────────────────────────────────────────────────
function getMongoBinPath() {
  // No app empacotado: process.resourcesPath aponta para a pasta resources/
  const packedPath = path.join(process.resourcesPath, 'mongodb-bin', 'bin', 'mongod.exe');
  // No modo desenvolvimento (node electron/main.js): usa caminho relativo ao projeto
  const devPath = path.join(__dirname, '..', 'mongodb-bin', 'bin', 'mongod.exe');

  if (fs.existsSync(packedPath)) {
    console.log(`[Bootstrap] Usando mongod empacotado: ${packedPath}`);
    return packedPath;
  }

  if (fs.existsSync(devPath)) {
    console.log(`[Bootstrap] Usando mongod em modo dev: ${devPath}`);
    return devPath;
  }

  throw new Error(
    'mongod.exe não encontrado!\n' +
    'Execute: node setup-mongo.js\n' +
    'Ou baixe manualmente o MongoDB para Windows e coloque mongod.exe em:\n' +
    `  - Empacotado: ${packedPath}\n` +
    `  - Dev:        ${devPath}`
  );
}

// ─────────────────────────────────────────────────────────────
// 2. INICIAR MONGODB VIA CHILD_PROCESS
// ─────────────────────────────────────────────────────────────
function iniciarMongoDB() {
  return new Promise((resolve, reject) => {
    const binPath = getMongoBinPath();
    const dbPath = path.join(app.getPath('userData'), 'mongodb-data');

    // Criar pasta de dados se não existir
    if (!fs.existsSync(dbPath)) {
      fs.mkdirSync(dbPath, { recursive: true });
      console.log(`[MongoDB] Pasta de dados criada: ${dbPath}`);
    }

    // Arquivo de log do MongoDB
    const logPath = path.join(dbPath, 'mongod.log');

    mongoProcess = spawn(binPath, [
      '--dbpath', dbPath,
      '--port', '27018',
      '--bind_ip', '127.0.0.1',
      '--logpath', logPath,
      '--logappend',
      '--quiet'
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    });

    mongoProcess.stdout.on('data', (data) => {
      console.log(`[MongoDB] ${data.toString().trim()}`);
    });

    mongoProcess.stderr.on('data', (data) => {
      console.error(`[MongoDB] ${data.toString().trim()}`);
    });

    mongoProcess.on('error', (err) => {
      console.error('[MongoDB] Erro fatal ao iniciar mongod.exe:', err.message);
      reject(err);
    });

    mongoProcess.on('exit', (code, signal) => {
      if (code !== null && code !== 0) {
        console.error(`[MongoDB] Processo encerrado inesperadamente (código: ${code})`);
      }
    });

    console.log('[MongoDB] Iniciando mongod.exe...');

    // Aguardar o MongoDB aceitar conexões
    aguardarMongoDBPronto(0)
      .then(resolve)
      .catch(reject);
  });
}

// ─────────────────────────────────────────────────────────────
// 3. AGUARDAR MONGODB FICAR PRONTO (polling TCP)
// ─────────────────────────────────────────────────────────────
function aguardarMongoDBPronto(tentativa = 0) {
  const MAX_TENTATIVAS = 60; // 60 segundos máximo
  const INTERVALO_MS = 1000;

  return new Promise((resolve, reject) => {
    if (tentativa >= MAX_TENTATIVAS) {
      reject(new Error(`MongoDB não ficou pronto após ${MAX_TENTATIVAS} segundos`));
      return;
    }

    const socket = new net.Socket();
    socket.setTimeout(2000);

    socket.on('connect', () => {
      socket.destroy();
      console.log(`[MongoDB] Pronto! (após ${tentativa + 1}s)`);
      resolve();
    });

    socket.on('timeout', () => {
      socket.destroy();
      setTimeout(() => aguardarMongoDBPronto(tentativa + 1), INTERVALO_MS);
    });

    socket.on('error', () => {
      socket.destroy();
      setTimeout(() => aguardarMongoDBPronto(tentativa + 1), INTERVALO_MS);
    });

    socket.connect(27018, '127.0.0.1');
  });
}

// ─────────────────────────────────────────────────────────────
// 4. INICIAR SERVIDOR EXPRESS (BACKEND)
// ─────────────────────────────────────────────────────────────
function iniciarServidorExpress() {
  return new Promise((resolve, reject) => {
    // Carregar variáveis de ambiente do .env do backend (se existir)
    const dotenv = require('dotenv');
    // Tentar múltiplos caminhos possíveis
    const envPaths = [
      // Modo empacotado (extraResources)
      path.join(process.resourcesPath || '', 'backend', '.env'),
      // Modo dev
      path.join(__dirname, '..', 'backend', '.env'),
      // Instalação no Windows (dentro da pasta do app.asar)
      path.join(__dirname, '..', 'resources', 'backend', '.env'),
      path.join(process.resourcesPath || '', 'app.asar.unpacked', 'backend', '.env'),
      path.join(__dirname, 'resources', 'backend', '.env'),
    ];

    let envLoaded = false;
    for (const envPath of envPaths) {
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        console.log(`[Bootstrap] .env carregado de: ${envPath}`);
        envLoaded = true;
        break;
      }
    }
    if (!envLoaded) {
      console.log('[Bootstrap] AVISO: .env não encontrado em nenhum caminho. Usando configuração padrão.');
    }

    // Determinar o MongoDB a usar:
    // - Se MONGO_URI do .env apontar para Atlas (mongodb+srv://), usa Atlas
    // - Caso contrário, usa o MongoDB local embarcado
    const mongoUriEnv = process.env.MONGO_URI || process.env.MONGODB_URI || '';
    if (mongoUriEnv) process.env.MONGO_URI = mongoUriEnv;
    const usarAtlas = mongoUriEnv.startsWith('mongodb+srv://');

    if (usarAtlas) {
      console.log('[Bootstrap] Usando MongoDB ATLAS (nuvem).');
      console.log(`[Bootstrap] URI: ${mongoUriEnv.replace(/\/\/[^@]+@/, '//***@')}`);
      // Mantém o MONGO_URI do .env (Atlas)
    } else {
      console.log('[Bootstrap] Usando MongoDB LOCAL (embarcado).');
      process.env.MONGO_URI = 'mongodb://127.0.0.1:27018/sistema-chamados';
    }

    process.env.PORT = '3001';
    process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'dev@caioribeiro.com';
    process.env.ADMIN_SENHA = process.env.ADMIN_SENHA || 'mudar123';

    console.log(`[Bootstrap] Admin email: ${process.env.ADMIN_EMAIL}`);
    if (!process.env.JWT_SECRET?.trim()) {
      throw new Error('JWT_SECRET não configurado no .env do backend.');
    }
    console.log('[Bootstrap] JWT_SECRET configurado.');

    // Importar o backend
    const app = require('../backend/src/app');
    const conectarBanco = require('../backend/src/config/db');
    const garantirAdminInicial = require('../backend/src/config/seedAdmin');

    // Iniciar o servidor HTTP
    httpServer = app.listen(3001, '0.0.0.0', async () => {
      try {
        console.log('[Express] Conectando ao MongoDB...');
        await conectarBanco();
        console.log('[Express] MongoDB conectado com sucesso.');
        await garantirAdminInicial();
        console.log('[Express] Admin inicial verificado.');
      } catch (err) {
        console.error('[Express] Erro ao conectar ao banco:', err.message);
        reject(err);
        httpServer.close();
        return;
      }

      console.log('[Express] Servidor rodando em http://0.0.0.0:3001');

      // Configurar Socket.io para real-time
      try {
        const { setupSocket } = require('../backend/src/config/socket');
        setupSocket(httpServer);
      } catch (err) {
        console.error('[Socket.io] Erro ao configurar:', err.message);
      }

      resolve();
    });

    httpServer.on('error', (err) => {
      console.error('[Express] Erro ao iniciar servidor:', err.message);
      reject(err);
    });
  });
}

// ─────────────────────────────────────────────────────────────
// 5. CRIAR JANELA DO ELECTRON
// ─────────────────────────────────────────────────────────────
function criarJanela() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Sistema de Chamados TI',
    icon: path.join(__dirname, 'icon.png'),
    show: false, // Mostrar só quando pronta
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true,

    },
  });

  // Caminho para o frontend buildado
  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist', 'index.html');

  if (fs.existsSync(frontendDist)) {
    mainWindow.loadFile(frontendDist);
    console.log('[Electron] Carregando frontend local.');
  } else {
    // Fallback: carregar do servidor Express (útil em dev)
    mainWindow.loadURL('http://127.0.0.1:3001');
    console.log('[Electron] Frontend dist não encontrado, carregando do servidor.');
  }

  // Mostrar a janela só quando estiver pronta (evita tela em branco)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─────────────────────────────────────────────────────────────
// 6. ENCERRAR TUDO GRACIOSAMENTE
// ─────────────────────────────────────────────────────────────
async function encerrarProcessos() {
  console.log('[Shutdown] Encerrando processos...');

  // Parar Express
  if (httpServer) {
    await new Promise((resolve) => {
      httpServer.close(() => {
        console.log('[Shutdown] Express encerrado.');
        resolve();
      });
      // Timeout de segurança
      setTimeout(resolve, 3000);
    });
    httpServer = null;
  }

  // Parar MongoDB (apenas se estiver rodando localmente)
  if (mongoProcess) {
    console.log('[Shutdown] Encerrando MongoDB local...');
    // Tentar encerramento gracioso
    mongoProcess.kill('SIGINT');

    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('[Shutdown] Forçando kill do MongoDB...');
        if (mongoProcess && !mongoProcess.killed) {
          mongoProcess.kill('SIGKILL');
        }
        resolve();
      }, 5000);

      mongoProcess.on('exit', () => {
        clearTimeout(timeout);
        console.log('[Shutdown] MongoDB encerrado.');
        resolve();
      });
    });

    mongoProcess = null;
  }

  console.log('[Shutdown] Todos os processos encerrados.');
}

// ─────────────────────────────────────────────────────────────
// 7. BOOTSTRAP PRINCIPAL
// ─────────────────────────────────────────────────────────────
app.on('ready', async () => {
  try {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║   Sistema de Chamados TI — Iniciando...         ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');

    // Determinar se usa MongoDB Atlas ou local
    const dotenv = require('dotenv');
    const envPaths = [
      path.join(process.resourcesPath || '', 'backend', '.env'),
      path.join(__dirname, '..', 'backend', '.env'),
      path.join(__dirname, '..', 'resources', 'backend', '.env'),
      path.join(process.resourcesPath || '', 'app.asar.unpacked', 'backend', '.env'),
      path.join(__dirname, 'resources', 'backend', '.env'),
    ];
    for (const envPath of envPaths) {
      if (fs.existsSync(envPath)) {
        dotenv.config({ path: envPath });
        break;
      }
    }
    const mongoUriEnv = process.env.MONGO_URI || process.env.MONGODB_URI || '';
    const usarAtlas = mongoUriEnv.startsWith('mongodb+srv://');

    if (usarAtlas) {
      // MongoDB Atlas: não precisa iniciar mongod local
      console.log('[Bootstrap] MongoDB Atlas detectado — pulando inicialização do mongod local.');
    } else {
      // MongoDB local: precisa iniciar mongod embarcado
      await iniciarMongoDB();
    }

    // Passo 2: Iniciar servidor Express
    await iniciarServidorExpress();

    // Passo 3: Criar janela
    criarJanela();

    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║   Sistema iniciado com sucesso!                  ║');
    console.log('╚══════════════════════════════════════════════════╝');

  } catch (err) {
    console.error('');
    console.error('╔══════════════════════════════════════════════════╗');
    console.error('║   ERRO FATAL NA INICIALIZAÇÃO                    ║');
    console.error('╚══════════════════════════════════════════════════╝');
    console.error(err.message);
    console.error('');

    // Mostrar erro na interface gráfica
    const { dialog } = require('electron');
    if (dialog.showErrorBox) {
      dialog.showErrorBox(
        'Erro na Inicialização',
        `Não foi possível iniciar o sistema:\n\n${err.message}\n\nVerifique se o MongoDB foi configurado corretamente.`
      );
    }

    app.quit();
  }
});

// Ao tentar fechar (X da janela)
app.on('before-quit', async (event) => {
  if (mongoProcess || httpServer) {
    event.preventDefault(); // Impede saída imediata

    await encerrarProcessos();

    app.exit(0); // Força saída após limpar processos
  }
});

// Se todas as janelas forem fechadas, encerrar o app
app.on('window-all-closed', () => {
  app.quit();
});

// macOS: recriar janela ao clicar no dock
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && mainWindow === null) {
    criarJanela();
  }
});

// Prevenir múltiplas instâncias
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[Electron] Outra instância já está rodando. Encerrando...');
  app.quit();
} else {
  app.on('second-instance', () => {
    // Se outra instância foi aberta, focar a janela existente
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
