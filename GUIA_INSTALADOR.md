# Guia de Instalação - Sistema de Chamados TI

## 📦 Gerando o Instalador

### Pré-requisitos
- **Node.js** (v16 ou superior)
- **npm** (incluído com Node.js)
- **MongoDB binário** já incluído no projeto

### Passos para Gerar o Instalador

#### 1. **Primeira vez - Build Completo**
Se você nunca fez o build antes, execute:

```bash
node build-all.js
```

Este script irá:
- Instalar todas as dependências
- Buildar o frontend React
- Gerar o instalador Windows NSIS

#### 2. **Atualizações - Build Rápido**
Se apenas o frontend foi modificado:

```bash
npm run build:frontend
node build-installer.js
```

#### 3. **Apenas o Instalador**
Se o frontend já está buildado:

```bash
node build-installer.js
```

---

## 📁 Arquivos Gerados

Após o build, você encontrará na pasta `dist/`:

| Arquivo | Descrição |
|---------|-----------|
| `Sistema de Chamados TI Setup 1.0.0.exe` | **Instalador NSIS** (recomendado) - Cria atalhos, menu iniciar |
| `Sistema de Chamados TI 1.0.0.exe` | **Executável Portátil** - Pode ser executado sem instalação |
| `builder-effective-config.yaml` | Configuração usada no build |
| `builder-debug.yml` | Log de debug do build |

---

## 🚀 Instalando em Outras Máquinas

### Método 1: Usando o Instalador NSIS (Recomendado)

1. **Copie o arquivo** `Sistema de Chamados TI Setup 1.0.0.exe` para a máquina destino
2. **Execute o instalador** clicando duas vezes
3. **Siga o assistente de instalação:**
   - Escolha o diretório de instalação (padrão: `C:\Program Files\Sistema de Chamados TI`)
   - Opção de criar atalho na área de trabalho
   - Opção de criar entrada no menu iniciar
4. **Clique em "Instalar"**
5. **Pronto!** O aplicativo será instalado e um atalho será criado

### Método 2: Usando o Executável Portátil

1. **Copie o arquivo** `Sistema de Chamados TI 1.0.0.exe` para qualquer pasta
2. **Execute diretamente** - não requer instalação
3. **Vantagem:** Pode ser executado de um pendrive ou pasta compartilhada

---

## ⚙️ Requisitos do Sistema

### Mínimo
- **Windows 7** ou superior
- **2 GB de RAM**
- **500 MB de espaço em disco**

### Recomendado
- **Windows 10/11**
- **4 GB de RAM**
- **1 GB de espaço em disco**

---

## 🔧 Configuração do Instalador

O instalador foi configurado com as seguintes opções em `package.json`:

```json
{
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true,
    "shortcutName": "Sistema de Chamados TI"
  }
}
```

**Significado:**
- `oneClick: false` - Permite escolher diretório de instalação
- `allowToChangeInstallationDirectory: true` - Usuário pode mudar pasta
- `createDesktopShortcut: true` - Cria atalho na área de trabalho
- `createStartMenuShortcut: true` - Cria entrada no menu iniciar

---

## 📝 Customizações Possíveis

### Mudar Ícone do Instalador
1. Substitua o arquivo `electron/icon.ico` por seu ícone
2. Execute o build novamente

### Mudar Nome da Aplicação
Edite `package.json`:
```json
{
  "productName": "Seu Novo Nome",
  "name": "seu-novo-nome"
}
```

### Mudar Versão
Edite `package.json`:
```json
{
  "version": "1.1.0"
}
```

### Mudar Descrição
Edite `package.json`:
```json
{
  "description": "Nova descrição do aplicativo"
}
```

---

## 🐛 Troubleshooting

### Erro: "mongod.exe não encontrado"
**Solução:** Execute `node setup-mongo.js` para baixar o MongoDB binário

### Erro: "Frontend não foi buildado"
**Solução:** Execute `npm run build:frontend` antes do build do Electron

### Instalador não aparece em `dist/`
**Solução:** 
1. Verifique se o build completou sem erros
2. Procure por `*.exe` em `dist/`
3. Tente executar novamente: `node build-installer.js`

### Aplicativo não inicia após instalação
**Solução:**
1. Verifique se o MongoDB binário está em `mongodb-bin/bin/mongod.exe`
2. Verifique se o frontend foi buildado corretamente
3. Verifique os logs em `%APPDATA%\Sistema de Chamados TI\logs\`

---

## 📦 Distribuição

### Para Distribuir o Instalador:

1. **Copie apenas o arquivo `.exe` do instalador**
   ```
   Sistema de Chamados TI Setup 1.0.0.exe
   ```

2. **Não é necessário copiar:**
   - Pasta `node_modules`
   - Pasta `dist/win-unpacked`
   - Pasta `.git`
   - Arquivos de desenvolvimento

3. **Tamanho do instalador:** ~180 MB (inclui Electron + MongoDB + Frontend)

### Hospedagem Online:
Você pode hospedar o `.exe` em:
- Google Drive
- OneDrive
- Dropbox
- GitHub Releases
- Servidor próprio

---

## 🔐 Segurança

O instalador não requer:
- Docker
- Node.js instalado
- npm
- Qualquer software adicional

Tudo está empacotado no `.exe`, incluindo:
- Runtime do Electron
- MongoDB embarcado
- Frontend compilado
- Todas as dependências necessárias

---

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs em `%APPDATA%\Sistema de Chamados TI\`
2. Verifique se o Windows Defender não está bloqueando
3. Tente desinstalar e reinstalar
4. Verifique se você tem permissões de administrador

---

**Última atualização:** 04/08/2026
