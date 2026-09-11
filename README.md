# 🎫 Sistema de Chamados TI - Desktop

Sistema completo de gerenciamento de chamados técnicos desenvolvido em **Electron**, **React** e **Node.js**, com suporte a notificações em tempo real e banco de dados centralizado.

## 🚀 Sobre o Projeto

Este software foi desenvolvido para otimizar o fluxo de atendimento de TI interno. Ele permite que colaboradores abram chamados de forma rápida e que a equipe de TI (Admin) receba e gerencie essas solicitações em tempo real, sem a necessidade de recarregar a aplicação.

O sistema utiliza uma arquitetura onde o MongoDB pode rodar de forma **embarcada** (local) ou via **MongoDB Atlas** (nuvem), garantindo flexibilidade e segurança dos dados.

### Principais Funcionalidades

*   Tempo Real: Comunicação via Socket.IO para entrega instantânea de novos chamados entre diferentes máquinas.
*   Multi-Máquina: Arquitetura preparada para rodar em diferentes computadores na mesma rede, conectando-se a um    servidor central.
*   **Banco de Dados HíbridoIntegração com MongoDB Atlas (nuvem) para persistência global.
*   **Interface Moderna:** Frontend desenvolvido com React e Vite para uma experiência fluida e responsiva.
*   **Instalador Desktop:** Empacotado com Electron Builder para fácil distribuição no Windows via instalador NSIS.

## 🛠️ Tecnologias Utilizadas

| Camada | Tecnologia |
| :--- | :--- |
| **Frontend** | React 18, Vite, CSS3 (Modern UI) |
| **Backend** | Node.js, Express, Mongoose |
| **Desktop** | Electron, Electron Builder |
| **Banco de Dados** | MongoDB (Atlas / Embarcado) |
| **Comunicação** | Socket.IO (Real-time) |

## 📡 Configuração de Rede (Comunicação entre Máquinas)

Para que a comunicação em tempo real funcione entre os computadores dos usuários e o computador do Admin, o sistema utiliza uma conexão centralizada:

1.  **Servidor Admin:** O computador da TI atua como o servidor central de eventos.
2.  **Configuração de IP:** Na tela de login, utilize a opção **"Configurar Servidor (TI)"** para definir o IP do computador Admin (ex: `192.168.0.226`).
3.  **Firewall:** Certifique-se de que a porta `3000 TCP` está aberta no computador do Admin para receber as conexões dos usuários.

## 📦 Como Buildar o Projeto

1.  **Setup do MongoDB:**
    ```bash
    node setup-mongo.js
    ```
2.  **Instalar Dependências:**
    ```bash
    npm install
    cd frontend && npm install && cd ..
    ```
3.  **Gerar Instalador (.exe):**
    ```bash
    node build-all.js
    ```
    O instalador será gerado na pasta `dist/`.

## 📂 Estrutura do Projeto

*   `electron/`: Processo principal do Electron e gerenciamento de janelas.
*   `backend/`: API Express, modelos de dados e controladores.
*   `frontend/`: Interface do usuário em React.
*   `mongodb-bin/`: Binários do MongoDB para execução embarcada.

---
Desenvolvido por Caio Ribeiro 
