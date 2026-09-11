// ═══════════════════════════════════════════════════════════════
// SCRIPT DE BUILD COMPLETO — Sistema de Chamados TI
// Executa: install deps → build frontend → build electron installer
// ═══════════════════════════════════════════════════════════════

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = __dirname;

function run(cmd, label) {
  console.log(`\n╔══════════════════════════════════════════════════════╗`);
  console.log(`║  ${label}`);
  console.log(`╚══════════════════════════════════════════════════════╝`);
  console.log(`  Comando: ${cmd}`);
  console.log('');
  try {
    execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
  } catch (err) {
    console.error(`\n[ERRO] Falha em: ${label}`);
    console.error(err.message);
    process.exit(1);
  }
}

// Passo 1: Verificar se o MongoDB binário existe
console.log('\n[Setup] Verificando MongoDB embarcado...');
const mongodPath = path.join(ROOT, 'mongodb-bin', 'bin', 'mongod.exe');
if (!fs.existsSync(mongodPath)) {
  console.error('');
  console.error('[ERRO] mongod.exe não encontrado!');
  console.error('Execute: node setup-mongo.js');
  console.error('Ou baixe manualmente e coloque em: mongodb-bin/bin/mongod.exe');
  process.exit(1);
}
console.log('[OK] mongod.exe encontrado.');

// Passo 2: Instalar dependências da raiz (Electron + backend deps)
run('npm install', 'Instalando dependências da raiz');

// Passo 3: Buildar o frontend
run('cd frontend && npm install && npm run build', 'Buildando frontend (React + Vite)');

// Passo 4: Verificar se o frontend foi buildado
const distPath = path.join(ROOT, 'frontend', 'dist', 'index.html');
if (!fs.existsSync(distPath)) {
  console.error('\n[ERRO] Frontend não foi buildado! Verifique os erros acima.');
  process.exit(1);
}
console.log('\n[OK] Frontend buildado com sucesso.');

// Passo 5: Buildar o Electron installer
run('npx electron-builder --win', 'Gerando instalador Electron (Windows)');

console.log('\n╔══════════════════════════════════════════════════════╗');
console.log('║  BUILD CONCLUÍDO COM SUCESSO!                        ║');
console.log('╚══════════════════════════════════════════════════════╝');
console.log('');
console.log('Instalador gerado em: dist/');
console.log('');
