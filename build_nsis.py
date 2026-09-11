#!/usr/bin/env python3
"""
Script para gerar instalador NSIS do Electron
Executa: npm install → build frontend → build electron-builder
"""

import subprocess
import os
import sys
import time
from pathlib import Path

def run_command(cmd, label, cwd=None):
    """Executa um comando e retorna o status"""
    print(f"\n{'='*60}")
    print(f"  {label}")
    print(f"{'='*60}")
    print(f"  Comando: {cmd}\n")
    
    try:
        result = subprocess.run(
            cmd, 
            shell=True, 
            cwd=cwd or os.getcwd(),
            capture_output=False,
            text=True
        )
        
        if result.returncode != 0:
            print(f"\n[ERRO] Falha em: {label}")
            return False
        
        print(f"\n[OK] {label} concluído com sucesso!")
        return True
        
    except Exception as e:
        print(f"\n[ERRO] Exceção: {e}")
        return False

def main():
    root = os.path.dirname(os.path.abspath(__file__))
    
    print("\n╔══════════════════════════════════════════════════════╗")
    print("║  GERADOR DE INSTALADOR NSIS - Sistema de Chamados TI║")
    print("╚══════════════════════════════════════════════════════╝")
    
    # Verificar MongoDB
    mongod_path = Path(root) / "mongodb-bin" / "bin" / "mongod.exe"
    if not mongod_path.exists():
        print(f"\n[ERRO] MongoDB não encontrado em: {mongod_path}")
        print("Execute: python setup-mongo.py")
        sys.exit(1)
    print(f"\n[OK] MongoDB encontrado: {mongod_path}")
    
    # Verificar frontend
    frontend_dist = Path(root) / "frontend" / "dist" / "index.html"
    if not frontend_dist.exists():
        print(f"\n[AVISO] Frontend não foi buildado ainda")
        if not run_command("npm run build:frontend", "Buildando Frontend", root):
            sys.exit(1)
    else:
        print(f"\n[OK] Frontend já foi buildado: {frontend_dist}")
    
    # Instalar dependências da raiz se necessário
    node_modules = Path(root) / "node_modules"
    if not node_modules.exists():
        print(f"\n[AVISO] node_modules não encontrado")
        if not run_command("npm install", "Instalando dependências", root):
            sys.exit(1)
    else:
        print(f"\n[OK] node_modules encontrado")
    
    # Build do electron-builder
    print(f"\n[Build] Iniciando build do Electron...")
    time.sleep(2)
    
    if not run_command(
        "npx electron-builder --win --publish never",
        "Gerando Instalador NSIS",
        root
    ):
        sys.exit(1)
    
    # Verificar se o instalador foi gerado
    dist_dir = Path(root) / "dist"
    exe_files = list(dist_dir.glob("*.exe"))
    
    print(f"\n╔══════════════════════════════════════════════════════╗")
    print(f"║  BUILD CONCLUÍDO COM SUCESSO!                        ║")
    print(f"╚══════════════════════════════════════════════════════╝")
    
    if exe_files:
        print(f"\n✅ Arquivos gerados em: {dist_dir}\n")
        for exe in exe_files:
            size_mb = exe.stat().st_size / (1024 * 1024)
            print(f"   • {exe.name} ({size_mb:.2f} MB)")
    else:
        print(f"\n⚠️  Nenhum .exe encontrado em {dist_dir}")
        print("   Verifique se o build completou corretamente")
    
    print()

if __name__ == "__main__":
    main()
