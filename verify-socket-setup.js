#!/usr/bin/env node

/**
 * Script de Verificação - Socket.io Setup
 * Valida se tudo está configurado corretamente
 */

const fs = require('fs');
const path = require('path');

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║     VERIFICAÇÃO DE CONFIGURAÇÃO - SOCKET.IO               ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

let erros = [];
let avisos = [];
let sucessos = [];

// 1. Verificar backend/src/config/socket.js
console.log('📋 Verificando configuração do Socket.io...');
const socketConfigPath = path.join(__dirname, 'backend', 'src', 'config', 'socket.js');
if (fs.existsSync(socketConfigPath)) {
  const content = fs.readFileSync(socketConfigPath, 'utf8');
  
  if (content.includes('new Server(server')) {
    sucessos.push('✅ Socket.io Server inicializado corretamente');
  } else {
    erros.push('❌ Socket.io Server não encontrado em socket.js');
  }
  
  if (content.includes('cors:')) {
    sucessos.push('✅ CORS configurado');
  } else {
    erros.push('❌ CORS não configurado');
  }
  
  if (content.includes('io.use((socket, next)')) {
    sucessos.push('✅ Middleware de autenticação configurado');
  } else {
    erros.push('❌ Middleware de autenticação não encontrado');
  }
} else {
  erros.push('❌ Arquivo socket.js não encontrado');
}

// 2. Verificar backend/src/controllers/chamadoController.js
console.log('📋 Verificando emissão de eventos...');
const chamadoControllerPath = path.join(__dirname, 'backend', 'src', 'controllers', 'chamadoController.js');
if (fs.existsSync(chamadoControllerPath)) {
  const content = fs.readFileSync(chamadoControllerPath, 'utf8');
  
  if (content.includes('getIO()')) {
    sucessos.push('✅ getIO() importado no controlador');
  } else {
    erros.push('❌ getIO() não encontrado no controlador');
  }
  
  if (content.includes('io.emit("novo-chamado"')) {
    sucessos.push('✅ Evento "novo-chamado" sendo emitido');
  } else {
    erros.push('❌ Evento "novo-chamado" não está sendo emitido');
  }
  
  if (content.includes('io.emit("chamado-atualizado"')) {
    sucessos.push('✅ Evento "chamado-atualizado" sendo emitido');
  } else {
    erros.push('❌ Evento "chamado-atualizado" não está sendo emitido');
  }
} else {
  erros.push('❌ Arquivo chamadoController.js não encontrado');
}

// 3. Verificar frontend/src/services/socket.js
console.log('📋 Verificando cliente Socket.io...');
const socketClientPath = path.join(__dirname, 'frontend', 'src', 'services', 'socket.js');
if (fs.existsSync(socketClientPath)) {
  const content = fs.readFileSync(socketClientPath, 'utf8');
  
  if (content.includes('from "socket.io-client"')) {
    sucessos.push('✅ socket.io-client importado');
  } else {
    erros.push('❌ socket.io-client não importado');
  }
  
  if (content.includes('export function conectarSocket')) {
    sucessos.push('✅ Função conectarSocket exportada');
  } else {
    erros.push('❌ Função conectarSocket não encontrada');
  }
  
  if (content.includes('export function onNovoChamado')) {
    sucessos.push('✅ Listener onNovoChamado exportado');
  } else {
    erros.push('❌ Listener onNovoChamado não encontrado');
  }
} else {
  erros.push('❌ Arquivo socket.js do frontend não encontrado');
}

// 4. Verificar frontend/src/pages/Dashboard/DashboardPage.jsx
console.log('📋 Verificando integração no Dashboard...');
const dashboardPath = path.join(__dirname, 'frontend', 'src', 'pages', 'Dashboard', 'DashboardPage.jsx');
if (fs.existsSync(dashboardPath)) {
  const content = fs.readFileSync(dashboardPath, 'utf8');
  
  if (content.includes('conectarSocket')) {
    sucessos.push('✅ conectarSocket() chamado no Dashboard');
  } else {
    erros.push('❌ conectarSocket() não chamado no Dashboard');
  }
  
  if (content.includes('onNovoChamado')) {
    sucessos.push('✅ Listener onNovoChamado configurado');
  } else {
    erros.push('❌ Listener onNovoChamado não configurado');
  }
  
  if (content.includes('tocarSomNotificacao')) {
    sucessos.push('✅ Som de notificação configurado');
  } else {
    avisos.push('⚠️  Som de notificação não configurado');
  }
} else {
  erros.push('❌ Arquivo DashboardPage.jsx não encontrado');
}

// 5. Verificar backend/.env
console.log('📋 Verificando variáveis de ambiente...');
const envPath = path.join(__dirname, 'backend', '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  
  if (content.includes('PORT=')) {
    sucessos.push('✅ PORT configurado em .env');
  } else {
    erros.push('❌ PORT não configurado em .env');
  }
  
  if (content.includes('MONGO_URI=')) {
    sucessos.push('✅ MONGO_URI configurado em .env');
  } else {
    erros.push('❌ MONGO_URI não configurado em .env');
  }
  
  if (content.includes('JWT_SECRET=')) {
    sucessos.push('✅ JWT_SECRET configurado em .env');
  } else {
    erros.push('❌ JWT_SECRET não configurado em .env');
  }
} else {
  erros.push('❌ Arquivo .env não encontrado');
}

// 6. Verificar package.json (dependências)
console.log('📋 Verificando dependências...');
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const content = fs.readFileSync(packageJsonPath, 'utf8');
  const pkg = JSON.parse(content);
  
  if (pkg.dependencies && pkg.dependencies['socket.io']) {
    sucessos.push('✅ socket.io instalado no backend');
  } else {
    erros.push('❌ socket.io não instalado no backend');
  }
  
  if (pkg.dependencies && pkg.dependencies['socket.io-client']) {
    sucessos.push('✅ socket.io-client instalado');
  } else {
    erros.push('❌ socket.io-client não instalado');
  }
} else {
  erros.push('❌ package.json não encontrado');
}

// 7. Verificar electron/main.js
console.log('📋 Verificando integração com Electron...');
const electronMainPath = path.join(__dirname, 'electron', 'main.js');
if (fs.existsSync(electronMainPath)) {
  const content = fs.readFileSync(electronMainPath, 'utf8');
  
  if (content.includes('setupSocket')) {
    sucessos.push('✅ setupSocket() chamado no Electron');
  } else {
    erros.push('❌ setupSocket() não chamado no Electron');
  }
  
  if (content.includes('httpServer')) {
    sucessos.push('✅ HTTP Server criado para Socket.io');
  } else {
    erros.push('❌ HTTP Server não encontrado');
  }
} else {
  erros.push('❌ Arquivo electron/main.js não encontrado');
}

// Exibir resultados
console.log('\n' + '═'.repeat(60));
console.log('RESULTADOS:');
console.log('═'.repeat(60) + '\n');

if (sucessos.length > 0) {
  console.log('✅ SUCESSOS:');
  sucessos.forEach(s => console.log('   ' + s));
  console.log('');
}

if (avisos.length > 0) {
  console.log('⚠️  AVISOS:');
  avisos.forEach(a => console.log('   ' + a));
  console.log('');
}

if (erros.length > 0) {
  console.log('❌ ERROS:');
  erros.forEach(e => console.log('   ' + e));
  console.log('');
}

// Resumo
console.log('═'.repeat(60));
console.log(`Total: ${sucessos.length} sucessos, ${avisos.length} avisos, ${erros.length} erros`);
console.log('═'.repeat(60) + '\n');

if (erros.length === 0) {
  console.log('✅ Tudo está configurado corretamente!\n');
  console.log('Próximos passos:');
  console.log('1. Inicie o app: npm run dev');
  console.log('2. Abra DevTools (F12) e procure por "[Socket]" no console');
  console.log('3. Teste criando um novo chamado em duas abas diferentes\n');
  process.exit(0);
} else {
  console.log('❌ Existem problemas a corrigir.\n');
  console.log('Consulte DIAGNOSTICO_SOCKET.md para mais informações.\n');
  process.exit(1);
}
