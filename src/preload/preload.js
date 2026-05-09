const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // Window controls
  window: {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
  },

  // Sessions
  sessions: {
    load: () => ipcRenderer.invoke('sessions:load'),
    save: (data) => ipcRenderer.invoke('sessions:save', data),
  },

  // Dialogs
  dialog: {
    openKey: () => ipcRenderer.invoke('dialog:openKey'),
    openFile: (path) => ipcRenderer.invoke('dialog:openFile', path),
    saveFile: (filename) => ipcRenderer.invoke('dialog:saveFile', filename),
  },

  // File system
  fs: {
    readFile: (path) => ipcRenderer.invoke('fs:readFile', path),
    writeFile: (path, data) => ipcRenderer.invoke('fs:writeFile', path, data),
    homedir: () => ipcRenderer.invoke('fs:homedir'),
    platform: () => ipcRenderer.invoke('fs:platform'),
  },

  // SSH
  ssh: {
    connect: (sessionId, config) => ipcRenderer.invoke('ssh:connect', sessionId, config),
    input: (sessionId, data) => ipcRenderer.send('ssh:input', sessionId, data),
    resize: (sessionId, cols, rows) => ipcRenderer.send('ssh:resize', sessionId, cols, rows),
    disconnect: (sessionId) => ipcRenderer.send('ssh:disconnect', sessionId),
    onData: (sessionId, callback) => {
      const ch = `ssh:data:${sessionId}`;
      ipcRenderer.on(ch, (_, data) => callback(data));
      return () => ipcRenderer.removeAllListeners(ch);
    },
    onClose: (sessionId, callback) => {
      const ch = `ssh:closed:${sessionId}`;
      ipcRenderer.once(ch, callback);
    },
  },

  // SFTP
  sftp: {
    connect: (sessionId, config) => ipcRenderer.invoke('sftp:connect', sessionId, config),
    list: (sessionId, path) => ipcRenderer.invoke('sftp:list', sessionId, path),
    download: (sessionId, remotePath, localPath) => ipcRenderer.invoke('sftp:download', sessionId, remotePath, localPath),
    upload: (sessionId, localPath, remotePath) => ipcRenderer.invoke('sftp:upload', sessionId, localPath, remotePath),
    mkdir: (sessionId, path) => ipcRenderer.invoke('sftp:mkdir', sessionId, path),
    delete: (sessionId, path, isDir) => ipcRenderer.invoke('sftp:delete', sessionId, path, isDir),
    rename: (sessionId, oldPath, newPath) => ipcRenderer.invoke('sftp:rename', sessionId, oldPath, newPath),
    disconnect: (sessionId) => ipcRenderer.send('sftp:disconnect', sessionId),
  },

  // Tunneling
  tunnel: {
    create: (tunnelId, config) => ipcRenderer.invoke('tunnel:create', tunnelId, config),
    stop: (tunnelId) => ipcRenderer.send('tunnel:stop', tunnelId),
    list: () => ipcRenderer.invoke('tunnel:list'),
    onStatus: (tunnelId, callback) => {
      const ch = `tunnel:status:${tunnelId}`;
      ipcRenderer.on(ch, (_, status) => callback(status));
    },
  },
});
