// ═══════════════════════════════════════════════════════════════
// SCRIPT PARA GERAR INSTALADOR NSIS
// Funciona tanto com MongoDB Atlas quanto local
// ═══════════════════════════════════════════════════════════════

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = __dirname;

console.log('\n╔══════════════════════════════════════════════════════╗');
console.log('║  GERANDO INSTALADOR NSIS                             ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

// Verificar se o frontend foi buildado
const distPath = path.join(ROOT, 'frontend', 'dist', 'index.html');
if (!fs.existsSync(distPath)) {
  console.error('[ERRO] Frontend não foi buildado!');
  console.error('Execute primeiro: npm run build:frontend');
  process.exit(1);
}
console.log('[OK] Frontend encontrado.');

// Verificar MongoDB (Atlas ou local)
const mongodPath = path.join(ROOT, 'mongodb-bin', 'bin', 'mongod.exe');
const envPath = path.join(ROOT, 'backend', '.env');
let usingAtlas = false;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  usingAtlas = envContent.includes('mongodb+srv://');
}

if (fs.existsSync(mongodPath)) {
  console.log('[OK] MongoDB local pronto (fallback).');
} else if (usingAtlas) {
  console.log('[OK] MongoDB Atlas configurado — mongod local não necessário.');
} else {
  console.error('[ERRO] MongoDB não encontrado e Atlas não configurado!');
  console.error('Execute: node setup-mongo.js ou configure Atlas no backend/.env');
  process.exit(1);
}

// Executar o build do electron-builder apenas para Windows NSIS
console.log('\n[Build] Executando electron-builder...\n');
try {
  execSync('npx electron-builder --win --publish never', { 
    cwd: ROOT, 
    stdio: 'inherit',
    env: { ...process.env, DEBUG: 'electron-builder' }
  });
} catch (err) {
  console.error('\n[ERRO] Falha ao gerar instalador!');
  console.error(err.message);
  process.exit(1);
}

console.log('\n╔══════════════════════════════════════════════════════╗');
console.log('║  INSTALADOR GERADO COM SUCESSO!                     ║');
console.log('╚══════════════════════════════════════════════════════╝\n');
console.log('Procure pelos arquivos em: dist/\n');
