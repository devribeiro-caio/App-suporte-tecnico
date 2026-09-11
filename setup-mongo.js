// ═══════════════════════════════════════════════════════════════
// SCRIPT DE SETUP — Download e extração do MongoDB para Windows
// Execute: node setup-mongo.js
// ═══════════════════════════════════════════════════════════════

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ─────────────────────────────────────────────────────────────
// Configuração
// ─────────────────────────────────────────────────────────────
const MONGO_VERSION = '7.0.23';
const MONGO_ZIP_URL = `https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-${MONGO_VERSION}.zip`;

const PROJECT_ROOT = path.join(__dirname);
const MONGO_DIR = path.join(PROJECT_ROOT, 'mongodb-bin');
const MONGO_BIN_DIR = path.join(MONGO_DIR, 'bin');
const MONGOD_EXE = path.join(MONGO_BIN_DIR, 'mongod.exe');
const ZIP_FILE = path.join(PROJECT_ROOT, 'mongodb-windows-x86_64.zip');

// ─────────────────────────────────────────────────────────────
// Funções auxiliares
// ─────────────────────────────────────────────────────────────
function fileExists(filePath) {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const protocol = url.startsWith('https') ? https : http;

    protocol.get(url, { headers: { 'User-Agent': 'Node.js' } }, (response) => {
      // Seguir redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        fs.unlinkSync(destPath);
        return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
      }

      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode} ao baixar ${url}`));
        return;
      }

      const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
      let downloadedBytes = 0;

      response.on('data', (chunk) => {
        downloadedBytes += chunk.length;
        const percent = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : 0;
        process.stdout.write(`\r  Download: ${percent}% (${(downloadedBytes / 1024 / 1024).toFixed(1)} MB)`);
      });

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log('\n  Download concluído!');
        resolve();
      });
    }).on('error', (err) => {
      fs.unlinkSync(destPath);
      reject(err);
    });
  });
}

function extractZip(zipPath, destDir) {
  console.log('  Extraindo ZIP (pode demorar alguns minutos)...');
  try {
    execSync(
      `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${destDir}' -Force"`,
      { stdio: 'pipe' }
    );
    console.log('  Extração concluída!');
  } catch (err) {
    throw new Error(`Falha ao extrair: ${err.message}`);
  }
}

function findMongoBin(extractDir) {
  // Procurar o mongod.exe dentro da pasta extraída
  const entries = fs.readdirSync(extractDir);
  for (const entry of entries) {
    const fullPath = path.join(extractDir, entry, 'bin', 'mongod.exe');
    if (fileExists(fullPath)) {
      return { binDir: path.join(extractDir, entry, 'bin'), extractRoot: path.join(extractDir, entry) };
    }
  }
  throw new Error('mongod.exe não encontrado na extração');
}

// ─────────────────────────────────────────────────────────────
// Fluxo principal
// ─────────────────────────────────────────────────────────────
async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  Setup MongoDB — Sistema de Chamados TI              ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  // Verificar se já existe
  if (fileExists(MONGOD_EXE)) {
    console.log('[OK] mongod.exe já existe em:');
    console.log(`     ${MONGOD_EXE}`);
    console.log('');
    console.log('Nada a fazer. Você pode rodar: npm run dev');
    return;
  }

  // Criar diretório
  if (!fileExists(MONGO_BIN_DIR)) {
    fs.mkdirSync(MONGO_BIN_DIR, { recursive: true });
    console.log(`[OK] Diretório criado: ${MONGO_BIN_DIR}`);
  }

  // Baixar o ZIP
  console.log('');
  console.log('[1/3] Baixando MongoDB Community Server...');
  console.log(`      URL: ${MONGO_ZIP_URL}`);
  console.log('      Versão:', MONGO_VERSION);
  console.log('');

  try {
    await downloadFile(MONGO_ZIP_URL, ZIP_FILE);
  } catch (err) {
    console.error('');
    console.error('[ERRO] Falha no download:', err.message);
    console.error('');
    console.log('Tente baixar manualmente:');
    console.log('  1. Acesse: https://www.mongodb.com/try/download/community');
    console.log('  2. Selecione: Windows → 64-bit → ZIP');
    console.log(`  3. Extraia e copie mongod.exe para: ${MONGO_BIN_DIR}`);
    process.exit(1);
  }

  // Extrair
  console.log('');
  console.log('[2/3] Extraindo MongoDB...');
  const extractDir = path.join(PROJECT_ROOT, 'mongodb-extract-temp');
  if (!fileExists(extractDir)) {
    fs.mkdirSync(extractDir, { recursive: true });
  }

  extractZip(ZIP_FILE, extractDir);

  // Encontrar e copiar os binários
  console.log('');
  console.log('[3/3] Copiando binários...');
  const { binDir } = findMongoBin(extractDir);

  // Copiar toda a pasta bin
  const binEntries = fs.readdirSync(binDir);
  for (const entry of binEntries) {
    const src = path.join(binDir, entry);
    const dest = path.join(MONGO_BIN_DIR, entry);
    fs.copyFileSync(src, dest);
    console.log(`  Copiado: ${entry}`);
  }

  // Limpar arquivos temporários
  console.log('');
  console.log('[OK] Limpando arquivos temporários...');
  fs.rmSync(extractDir, { recursive: true, force: true });
  fs.unlinkSync(ZIP_FILE);

  // Verificação final
  if (!fileExists(MONGOD_EXE)) {
    console.error('[ERRO] mongod.exe não foi copiado corretamente!');
    process.exit(1);
  }

  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║  Setup concluído com sucesso!                        ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Próximos passos:');
  console.log('  1. npm install          (instala dependências do Electron)');
  console.log('  2. cd frontend && npm run build');
  console.log('  3. npm run build:electron');
  console.log('');
}

main().catch((err) => {
  console.error('Erro:', err.message);
  process.exit(1);
});
