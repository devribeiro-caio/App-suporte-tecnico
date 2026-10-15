const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('suporteDesktop', Object.freeze({
  salvarRelatorioPdf: (html) => ipcRenderer.invoke('relatorio:salvar-pdf', html),
  salvarCredenciaisLembradas: (credenciais) => ipcRenderer.invoke('auth:salvar-credenciais-lembradas', credenciais),
  obterCredenciaisLembradas: () => ipcRenderer.invoke('auth:obter-credenciais-lembradas'),
  removerCredenciaisLembradas: () => ipcRenderer.invoke('auth:remover-credenciais-lembradas'),
}));
