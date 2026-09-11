# Guia de Configuração de Rede - Sistema de Chamados TI

Para que os chamados cheguem em tempo real no seu computador (Admin), siga estas instruções:

## 1. Descubra o IP do seu Computador (Admin)
No seu computador (o de TI), abra o prompt de comando (CMD) e digite:
```cmd
ipconfig
```
Anote o endereço **IPv4** (exemplo: `192.168.1.50`).

## 2. Configure os Computadores dos Usuários
Nos computadores onde os usuários vão abrir chamados:
1. Abra o sistema.
2. Na tela de Login, clique em **"Configurar Servidor (TI)"** (link discreto abaixo do texto).
3. No campo **"IP do Servidor Admin"**, digite o IP que você anotou no passo 1.
4. Faça o login normalmente.

## 3. Como funciona agora
- **Sem Reload:** Agora, todos os computadores dos usuários enviam os avisos diretamente para o seu computador. O evento de "Novo Chamado" aparecerá instantaneamente na sua tela.
- **Banco de Dados:** Os dados continuam sendo salvos no MongoDB Atlas, garantindo que nada seja perdido mesmo se o seu computador estiver desligado.

## 4. Requisitos de Rede
- Os computadores devem estar na mesma rede (Wi-Fi ou Cabo).
- O **Firewall do Windows** no seu computador (Admin) deve permitir conexões na porta **3000**.
  - Se não funcionar, tente desativar o Firewall rapidamente para testar ou adicione uma regra de entrada para a porta 3000 TCP.

---
**Solução aplicada por Manus AI.**
