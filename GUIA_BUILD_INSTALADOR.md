# 🚀 Guia Completo - Gerar Instalador Windows NSIS

## 📋 Pré-requisitos

Antes de gerar o instalador, certifique-se de ter:

- **Node.js** v16+ ([Baixar aqui](https://nodejs.org/))
- **npm** (incluído com Node.js)
- **MongoDB binário** (já incluído no projeto)
- **Windows 7+**

### Verificar Instalação

```bash
node --version
npm --version
```

---

## 🔧 Passo 1: Preparar o Projeto

### 1.1 Verificar MongoDB

Certifique-se de que o MongoDB está em:
```
mongodb-bin/bin/mongod.exe
```

Se não estiver, execute:
```bash
node setup-mongo.js
```

### 1.2 Instalar Dependências

```bash
npm install
```

### 1.3 Buildar o Frontend (se não foi feito)

```bash
npm run build:frontend
```

Isso criará a pasta `frontend/dist/` com os arquivos compilados.

---

## 🛠️ Passo 2: Gerar o Instalador

### Opção A: Usar o Script Batch (Recomendado no Windows)

```bash
build-nsis-simple.bat
```

Ou clique duas vezes no arquivo `build-nsis-simple.bat`

### Opção B: Usar npm

```bash
npm run build:electron
```

### Opção C: Usar electron-builder diretamente

```bash
npx electron-builder --win --publish never
```

### Opção D: Build Completo (do zero)

```bash
node build-all.js
```

---

## ⏱️ Tempo de Espera

O build pode levar:
- **Primeira vez:** 10-20 minutos (baixa dependências)
- **Próximas vezes:** 5-10 minutos (reutiliza cache)

**Não feche o terminal durante o build!**

---

## 📦 Arquivos Gerados

Após o build, você encontrará em `dist/`:

| Arquivo | Tamanho | Descrição |
|---------|---------|-----------|
| `Sistema de Chamados TI Setup 1.0.0.exe` | ~180 MB | **Instalador NSIS** (recomendado) |
| `Sistema de Chamados TI 1.0.0.exe` | ~177 MB | Executável portátil |
| `win-unpacked/` | ~500 MB | Arquivos desempacotados |

---

## 🎯 Instalando em Outra Máquina

### Método 1: Instalador NSIS (Recomendado)

1. **Copie** `Sistema de Chamados TI Setup 1.0.0.exe`
2. **Execute** no computador destino
3. **Siga o assistente:**
   - Escolha pasta de instalação
   - Crie atalhos (desktop/menu iniciar)
   - Clique "Instalar"

### Método 2: Executável Portátil

1. **Copie** `Sistema de Chamados TI 1.0.0.exe`
2. **Cole** em qualquer pasta
3. **Execute** diretamente (sem instalação)

---

## 🔍 Troubleshooting

### Erro: "mongod.exe não encontrado"

```bash
node setup-mongo.js
```

### Erro: "Frontend não foi buildado"

```bash
npm run build:frontend
```

### Erro: "node_modules não encontrado"

```bash
npm install
```

### Build muito lento

- Feche outros programas
- Verifique espaço em disco (mínimo 2 GB)
- Tente novamente

### Instalador não aparece em `dist/`

1. Verifique se o build terminou sem erros
2. Procure em `dist/` por qualquer `.exe`
3. Tente limpar e fazer build novamente:

```bash
rm -r dist/win-unpacked
npx electron-builder --win --publish never
```

### Aplicativo não inicia após instalação

1. Verifique se MongoDB está em `mongodb-bin/bin/mongod.exe`
2. Verifique logs em: `%APPDATA%\Sistema de Chamados TI\logs\`
3. Tente desinstalar e reinstalar

---

## 📝 Customizações

### Mudar Nome da Aplicação

Edite `package.json`:
```json
{
  "productName": "Novo Nome",
  "name": "novo-nome"
}
```

### Mudar Versão

```json
{
  "version": "1.1.0"
}
```

### Mudar Ícone

Substitua `electron/icon.ico` por seu ícone e faça novo build.

### Mudar Diretório de Instalação Padrão

Edite `package.json`:
```json
{
  "nsis": {
    "installerIcon": "electron/icon.ico",
    "uninstallerIcon": "electron/icon.ico",
    "installerHeaderIcon": "electron/icon.ico",
    "installerSidebar": "electron/installer-sidebar.bmp"
  }
}
```

---

## 📊 Configuração Atual

Seu instalador está configurado com:

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
- ✅ Permite escolher pasta de instalação
- ✅ Cria atalho na área de trabalho
- ✅ Cria entrada no menu iniciar
- ✅ Instalação manual (não one-click)

---

## 🔐 Segurança

O instalador é **totalmente independente**:
- ✅ Sem Docker necessário
- ✅ Sem Node.js necessário
- ✅ Sem npm necessário
- ✅ Sem dependências externas

Tudo está empacotado:
- Electron runtime
- MongoDB embarcado
- Frontend compilado
- Todas as dependências

---

## 📤 Distribuição

### Hospedagem Online

Você pode compartilhar o `.exe` via:
- Google Drive
- OneDrive
- Dropbox
- GitHub Releases
- Servidor próprio

### Tamanho

- **Instalador:** ~180 MB
- **Instalado:** ~500 MB

### Requisitos do Sistema

- **Windows:** 7, 8, 10, 11
- **RAM:** 2 GB mínimo (4 GB recomendado)
- **Disco:** 500 MB disponível

---

## 🚀 Próximas Etapas

1. ✅ Gere o instalador usando um dos métodos acima
2. ✅ Teste em outra máquina
3. ✅ Distribua o `.exe` para seus usuários
4. ✅ Atualizações futuras: apenas repita o build

---

## 📞 Suporte

Se encontrar problemas:

1. **Verifique os logs:**
   - `%APPDATA%\Sistema de Chamados TI\logs\`

2. **Tente desinstalar e reinstalar**

3. **Verifique permissões de administrador**

4. **Desabilite antivírus temporariamente** (alguns bloqueiam)

---

**Última atualização:** 04/08/2026
