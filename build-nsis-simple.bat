@echo off
REM Script para gerar instalador NSIS do Electron
REM Requisitos: Node.js e npm instalados

setlocal enabledelayedexpansion

echo.
echo ╔══════════════════════════════════════════════════════╗
echo ║  GERADOR DE INSTALADOR NSIS                          ║
echo ║  Sistema de Chamados TI                              ║
echo ╚══════════════════════════════════════════════════════╝
echo.

REM Verificar se Node.js está instalado
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERRO] Node.js não encontrado!
    echo Baixe em: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js encontrado
echo.

REM Verificar MongoDB
if not exist "mongodb-bin\bin\mongod.exe" (
    echo [ERRO] MongoDB não encontrado em mongodb-bin\bin\mongod.exe
    echo Execute: node setup-mongo.js
    pause
    exit /b 1
)
echo [OK] MongoDB encontrado
echo.

REM Verificar frontend
if not exist "frontend\dist\index.html" (
    echo [AVISO] Frontend não foi buildado
    echo Buildando frontend...
    call npm run build:frontend
    if !ERRORLEVEL! NEQ 0 (
        echo [ERRO] Falha ao buildar frontend
        pause
        exit /b 1
    )
)
echo [OK] Frontend pronto
echo.

REM Instalar dependências se necessário
if not exist "node_modules" (
    echo [AVISO] Instalando dependências...
    call npm install
    if !ERRORLEVEL! NEQ 0 (
        echo [ERRO] Falha ao instalar dependências
        pause
        exit /b 1
    )
)
echo [OK] Dependências prontas
echo.

REM Executar build
echo [Build] Iniciando build do Electron...
echo.
call npx electron-builder --win --publish never

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ╔══════════════════════════════════════════════════════╗
    echo ║  BUILD CONCLUÍDO COM SUCESSO!                        ║
    echo ╚══════════════════════════════════════════════════════╝
    echo.
    echo Arquivos gerados em: dist\
    echo.
    dir /b dist\*.exe 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo Procurando em subpastas...
        dir /s /b dist\*.exe 2>nul
    )
) else (
    echo.
    echo [ERRO] Falha ao gerar instalador
    echo Verifique os erros acima
)

echo.
pause
