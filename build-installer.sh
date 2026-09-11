#!/bin/bash
# Script para gerar instalador NSIS no Git Bash
echo ""
echo "=========================================="
echo "  GERANDO INSTALADOR NSIS"
echo "=========================================="
echo ""

# ── Configurar npm para permitir scripts do esbuild ──
echo "allow-scripts=true" > .npmrc
echo "[OK] Configuração npm aplicada"

# ── Instalar dependências na raiz ──
echo ""
echo "[1/4] Instalando dependências da raiz..."
if [ ! -d "node_modules/socket.io" ]; then
    echo "       (pode demorar alguns minutos...)"
    npm install --ignore-scripts 2>&1 | tail -5
    npm install socket.io 2>&1 | tail -5
    echo "[OK] Dependências raiz prontas (incluindo socket.io)"
else
    echo "[OK] Dependências raiz já instaladas"
fi

# ── Instalar backend ──
echo ""
echo "[2/4] Verificando backend..."
if [ ! -d "backend/node_modules" ]; then
    cd backend && npm install 2>&1 | tail -5 && cd ..
    echo "[OK] Backend instalado"
else
    echo "[OK] Backend já instalado"
fi

# ── Rebuildar frontend ──
echo ""
echo "[3/4] Buildando frontend..."
cd frontend && npm install 2>&1 | tail -5
npm run build 2>&1 | tail -15
cd ..
echo "[OK] Frontend pronto"

# ── Verificar MongoDB ──
echo ""
echo "[4/4] Verificando MongoDB..."
if [ -f "mongodb-bin/bin/mongod.exe" ]; then
    echo "[OK] MongoDB local pronto (fallback)"
else
    if grep -q "mongodb+srv://" backend/.env 2>/dev/null; then
        echo "[OK] MongoDB Atlas configurado — mongod local não necessário"
    else
        echo "[AVISO] MongoDB não encontrado e Atlas não configurado"
    fi
fi

# ── Limpar dist anterior ──
echo ""
echo "[LIMPEZA] Removendo build anterior..."
for f in dist/win-unpacked/*.pak dist/win-unpacked/*.dll dist/win-unpacked/*.dat dist/win-unpacked/*.bin dist/win-unpacked/*.html dist/win-unpacked/*.json dist/win-unpacked/*.txt; do
    rm -f "$f" 2>/dev/null
done
rm -rf dist/win-unpacked 2>/dev/null
rm -f dist/builder-* 2>/dev/null
echo "[OK] Limpeza concluída"

echo ""
echo "Iniciando build do Electron..."
echo ""

npx electron-builder --win --publish never 2>&1 | tee build_output.log

if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "  BUILD CONCLUÍDO COM SUCESSO!"
    echo "=========================================="
    echo ""
    echo "Instaladores em dist/"
    find dist -name "*.exe" -not -path "*/win-unpacked/*" -exec ls -lh {} \; 2>/dev/null
else
    echo ""
    echo "[ERRO] Falha no build"
fi
