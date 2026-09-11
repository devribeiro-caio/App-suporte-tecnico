/**
 * Script de Teste - Socket.io Real-Time
 * Testa a conexão e emissão de eventos em tempo real
 */

const { io } = require('socket.io-client');
const jwt = require('jsonwebtoken');

// Configuração
const API_URL = 'http://127.0.0.1:3000';
const JWT_SECRET = 'dev_ribeiro_0608';

// Dados de teste
const adminUser = {
  id: '507f1f77bcf86cd799439011', // ID fictício
  nome: 'Admin Teste',
  perfil: 'admin'
};

const usuarioComum = {
  id: '507f1f77bcf86cd799439012',
  nome: 'Usuário Teste',
  perfil: 'usuario'
};

// Função para gerar token JWT
function gerarToken(usuario) {
  return jwt.sign(usuario, JWT_SECRET, { expiresIn: '8h' });
}

// Função para conectar e testar Socket.io
async function testarSocket() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║        TESTE DE SOCKET.IO - SISTEMA DE CHAMADOS           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const tokenAdmin = gerarToken(adminUser);
  const tokenUsuario = gerarToken(usuarioComum);

  console.log('[1] Conectando como ADMIN...');
  const socketAdmin = io(API_URL, {
    auth: { token: tokenAdmin },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  console.log('[2] Conectando como USUÁRIO COMUM...');
  const socketUsuario = io(API_URL, {
    auth: { token: tokenUsuario },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  // Aguardar conexões
  await new Promise((resolve) => {
    let conectados = 0;
    socketAdmin.on('connect', () => {
      console.log('✅ ADMIN conectado! Socket ID:', socketAdmin.id);
      conectados++;
      if (conectados === 2) resolve();
    });
    socketUsuario.on('connect', () => {
      console.log('✅ USUÁRIO conectado! Socket ID:', socketUsuario.id);
      conectados++;
      if (conectados === 2) resolve();
    });
    socketAdmin.on('connect_error', (err) => {
      console.error('❌ Erro ao conectar ADMIN:', err.message);
    });
    socketUsuario.on('connect_error', (err) => {
      console.error('❌ Erro ao conectar USUÁRIO:', err.message);
    });
    setTimeout(() => {
      if (conectados < 2) {
        console.error('❌ Timeout: nem todos os clientes conectaram');
        resolve();
      }
    }, 10000);
  });

  console.log('\n[3] Testando emissão de evento "novo-chamado"...');

  // Admin escuta novo-chamado
  socketAdmin.on('novo-chamado', (data) => {
    console.log('✅ ADMIN recebeu novo-chamado:', {
      id: data._id,
      titulo: data.titulo,
      descricao: data.descricao,
      solicitante: data.solicitante?.nome,
    });
  });

  // Simular novo chamado via HTTP
  console.log('[4] Criando novo chamado via API...');
  try {
    const response = await fetch(`${API_URL}/api/chamados`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenUsuario}`,
      },
      body: JSON.stringify({
        titulo: 'Teste Socket.io - ' + new Date().toLocaleTimeString(),
        descricao: 'Este é um chamado de teste para verificar Socket.io',
        prioridade: 'media',
      }),
    });

    if (response.ok) {
      const chamado = await response.json();
      console.log('✅ Chamado criado com sucesso:', chamado._id);
      console.log('   Aguardando notificação em tempo real...');

      // Aguardar notificação
      await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.log('⚠️  Timeout: nenhuma notificação recebida em 5 segundos');
          resolve();
        }, 5000);

        const handler = (data) => {
          clearTimeout(timeout);
          console.log('✅ Notificação recebida em tempo real!');
          resolve();
        };

        socketAdmin.once('novo-chamado', handler);
      });
    } else {
      console.error('❌ Erro ao criar chamado:', response.statusText);
    }
  } catch (err) {
    console.error('❌ Erro na requisição:', err.message);
  }

  console.log('\n[5] Testando emissão de evento "chamado-atualizado"...');

  // Admin escuta chamado-atualizado
  socketAdmin.on('chamado-atualizado', (data) => {
    console.log('✅ ADMIN recebeu chamado-atualizado:', {
      id: data._id,
      status: data.status,
      prioridade: data.prioridade,
    });
  });

  // Listar chamados para pegar um ID
  try {
    const response = await fetch(`${API_URL}/api/chamados`, {
      headers: {
        'Authorization': `Bearer ${tokenAdmin}`,
      },
    });

    if (response.ok) {
      const chamados = await response.json();
      if (chamados.length > 0) {
        const chamado = chamados[0];
        console.log('[6] Atualizando chamado:', chamado._id);

        // Atualizar status
        const updateResponse = await fetch(`${API_URL}/api/chamados/${chamado._id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenAdmin}`,
          },
          body: JSON.stringify({
            status: 'em_andamento',
            prioridade: 'alta',
          }),
        });

        if (updateResponse.ok) {
          console.log('✅ Chamado atualizado via API');
          console.log('   Aguardando notificação em tempo real...');

          // Aguardar notificação
          await new Promise((resolve) => {
            const timeout = setTimeout(() => {
              console.log('⚠️  Timeout: nenhuma notificação de atualização recebida');
              resolve();
            }, 5000);

            const handler = (data) => {
              clearTimeout(timeout);
              console.log('✅ Notificação de atualização recebida em tempo real!');
              resolve();
            };

            socketAdmin.once('chamado-atualizado', handler);
          });
        }
      }
    }
  } catch (err) {
    console.error('❌ Erro ao listar/atualizar chamados:', err.message);
  }

  // Desconectar
  console.log('\n[7] Encerrando testes...');
  socketAdmin.disconnect();
  socketUsuario.disconnect();

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                    TESTES CONCLUÍDOS                       ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  process.exit(0);
}

// Executar testes
testarSocket().catch((err) => {
  console.error('Erro fatal:', err.message);
  process.exit(1);
});
