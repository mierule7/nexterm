const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Session storage file
const SESSION_FILE = path.join(app.getPath('userData'), 'sessions.json');
const SETTINGS_FILE = path.join(app.getPath('userData'), 'settings.json');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0d1117',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js')
    },
    icon: path.join(__dirname, '../../assets/icon.png')
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  // Custom menu
  Menu.setApplicationMenu(null);
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ─── IPC: Window Controls ─────────────────────────────────────────────────────
ipcMain.on('window-minimize', () => mainWindow.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on('window-close', () => mainWindow.close());

// ─── IPC: Sessions ────────────────────────────────────────────────────────────
ipcMain.handle('sessions:load', () => {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    }
  } catch (e) {}
  return { groups: [], sessions: [] };
});

ipcMain.handle('sessions:save', (_, data) => {
  try {
    fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
    fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (e) {
    return false;
  }
});

// ─── IPC: File Dialogs ────────────────────────────────────────────────────────
ipcMain.handle('dialog:openKey', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Private Key File',
    filters: [
      { name: 'Key Files', extensions: ['pem', 'ppk', 'key', 'rsa'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });
  if (!result.canceled && result.filePaths.length > 0) {
    const keyPath = result.filePaths[0];
    const keyContent = fs.readFileSync(keyPath, 'utf8');
    return { path: keyPath, content: keyContent };
  }
  return null;
});

ipcMain.handle('dialog:openFile', async (_, defaultPath) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select File to Upload',
    defaultPath: defaultPath || os.homedir(),
    properties: ['openFile', 'multiSelections']
  });
  if (!result.canceled) return result.filePaths;
  return [];
});

ipcMain.handle('dialog:saveFile', async (_, filename) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save File',
    defaultPath: path.join(os.homedir(), filename || 'download'),
    properties: ['createDirectory']
  });
  if (!result.canceled) return result.filePath;
  return null;
});

// ─── IPC: File System (local) ─────────────────────────────────────────────────
ipcMain.handle('fs:readFile', (_, filePath) => {
  try {
    return fs.readFileSync(filePath);
  } catch (e) {
    return null;
  }
});

ipcMain.handle('fs:writeFile', (_, filePath, data) => {
  try {
    fs.writeFileSync(filePath, Buffer.from(data));
    return true;
  } catch (e) {
    return false;
  }
});

ipcMain.handle('fs:homedir', () => os.homedir());
ipcMain.handle('fs:platform', () => process.platform);

// ─── IPC: SSH ─────────────────────────────────────────────────────────────────
const { Client } = require('ssh2');
const activeSessions = new Map();

ipcMain.handle('ssh:connect', async (event, sessionId, config) => {
  return new Promise((resolve) => {
    const conn = new Client();

    const authConfig = {
      host: config.host,
      port: config.port || 22,
      username: config.username,
      readyTimeout: 15000,
    };

    if (config.authType === 'key' && config.privateKey) {
      authConfig.privateKey = config.privateKey;
      if (config.passphrase) authConfig.passphrase = config.passphrase;
    } else {
      authConfig.password = config.password;
    }

    conn.on('ready', () => {
      conn.shell({ term: 'xterm-256color', cols: 220, rows: 50 }, (err, stream) => {
        if (err) {
          conn.end();
          return resolve({ success: false, error: err.message });
        }

        activeSessions.set(sessionId, { conn, stream });

        stream.on('data', (data) => {
          mainWindow.webContents.send(`ssh:data:${sessionId}`, data.toString('binary'));
        });

        stream.stderr.on('data', (data) => {
          mainWindow.webContents.send(`ssh:data:${sessionId}`, data.toString('binary'));
        });

        stream.on('close', () => {
          mainWindow.webContents.send(`ssh:closed:${sessionId}`);
          activeSessions.delete(sessionId);
        });

        resolve({ success: true });
      });
    });

    conn.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });

    conn.connect(authConfig);
  });
});

ipcMain.on('ssh:input', (_, sessionId, data) => {
  const session = activeSessions.get(sessionId);
  if (session) session.stream.write(data);
});

ipcMain.on('ssh:resize', (_, sessionId, cols, rows) => {
  const session = activeSessions.get(sessionId);
  if (session) session.stream.setWindow(rows, cols);
});

ipcMain.on('ssh:disconnect', (_, sessionId) => {
  const session = activeSessions.get(sessionId);
  if (session) {
    session.stream.end();
    session.conn.end();
    activeSessions.delete(sessionId);
  }
});

// ─── IPC: SFTP ────────────────────────────────────────────────────────────────
const activeSFTP = new Map();

ipcMain.handle('sftp:connect', async (event, sessionId, config) => {
  return new Promise((resolve) => {
    const conn = new Client();
    const authConfig = {
      host: config.host,
      port: config.port || 22,
      username: config.username,
      readyTimeout: 15000,
    };

    if (config.authType === 'key' && config.privateKey) {
      authConfig.privateKey = config.privateKey;
      if (config.passphrase) authConfig.passphrase = config.passphrase;
    } else {
      authConfig.password = config.password;
    }

    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) { conn.end(); return resolve({ success: false, error: err.message }); }
        activeSFTP.set(sessionId, { conn, sftp });
        resolve({ success: true });
      });
    });

    conn.on('error', (err) => resolve({ success: false, error: err.message }));
    conn.connect(authConfig);
  });
});

ipcMain.handle('sftp:list', async (_, sessionId, remotePath) => {
  return new Promise((resolve) => {
    const s = activeSFTP.get(sessionId);
    if (!s) return resolve({ success: false, error: 'Not connected' });
    s.sftp.readdir(remotePath, (err, list) => {
      if (err) return resolve({ success: false, error: err.message });
      const items = list.map(f => ({
        name: f.filename,
        size: f.attrs.size,
        modTime: f.attrs.mtime * 1000,
        isDir: (f.attrs.mode & 0o170000) === 0o040000,
        permissions: f.attrs.mode
      }));
      resolve({ success: true, items });
    });
  });
});

ipcMain.handle('sftp:download', async (_, sessionId, remotePath, localPath) => {
  return new Promise((resolve) => {
    const s = activeSFTP.get(sessionId);
    if (!s) return resolve({ success: false, error: 'Not connected' });
    s.sftp.fastGet(remotePath, localPath, (err) => {
      if (err) return resolve({ success: false, error: err.message });
      resolve({ success: true });
    });
  });
});

ipcMain.handle('sftp:upload', async (_, sessionId, localPath, remotePath) => {
  return new Promise((resolve) => {
    const s = activeSFTP.get(sessionId);
    if (!s) return resolve({ success: false, error: 'Not connected' });
    s.sftp.fastPut(localPath, remotePath, (err) => {
      if (err) return resolve({ success: false, error: err.message });
      resolve({ success: true });
    });
  });
});

ipcMain.handle('sftp:mkdir', async (_, sessionId, remotePath) => {
  return new Promise((resolve) => {
    const s = activeSFTP.get(sessionId);
    if (!s) return resolve({ success: false });
    s.sftp.mkdir(remotePath, (err) => resolve({ success: !err, error: err?.message }));
  });
});

ipcMain.handle('sftp:delete', async (_, sessionId, remotePath, isDir) => {
  return new Promise((resolve) => {
    const s = activeSFTP.get(sessionId);
    if (!s) return resolve({ success: false });
    const fn = isDir ? s.sftp.rmdir.bind(s.sftp) : s.sftp.unlink.bind(s.sftp);
    fn(remotePath, (err) => resolve({ success: !err, error: err?.message }));
  });
});

ipcMain.handle('sftp:rename', async (_, sessionId, oldPath, newPath) => {
  return new Promise((resolve) => {
    const s = activeSFTP.get(sessionId);
    if (!s) return resolve({ success: false });
    s.sftp.rename(oldPath, newPath, (err) => resolve({ success: !err, error: err?.message }));
  });
});

ipcMain.on('sftp:disconnect', (_, sessionId) => {
  const s = activeSFTP.get(sessionId);
  if (s) { s.conn.end(); activeSFTP.delete(sessionId); }
});

// ─── IPC: SSH Tunneling ───────────────────────────────────────────────────────
const net = require('net');
const activeTunnels = new Map();

ipcMain.handle('tunnel:create', async (event, tunnelId, config) => {
  return new Promise((resolve) => {
    const conn = new Client();
    const authConfig = {
      host: config.sshHost,
      port: config.sshPort || 22,
      username: config.sshUser,
    };
    if (config.authType === 'key' && config.privateKey) {
      authConfig.privateKey = config.privateKey;
      if (config.passphrase) authConfig.passphrase = config.passphrase;
    } else {
      authConfig.password = config.password;
    }

    conn.on('ready', () => {
      const server = net.createServer((sock) => {
        conn.forwardOut(
          '127.0.0.1', config.localPort,
          config.remoteHost, config.remotePort,
          (err, stream) => {
            if (err) { sock.end(); return; }
            sock.pipe(stream).pipe(sock);
          }
        );
      });

      server.listen(config.localPort, '127.0.0.1', () => {
        activeTunnels.set(tunnelId, { conn, server });
        mainWindow.webContents.send(`tunnel:status:${tunnelId}`, 'active');
        resolve({ success: true, port: config.localPort });
      });

      server.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
    });

    conn.on('error', (err) => resolve({ success: false, error: err.message }));
    conn.connect(authConfig);
  });
});

ipcMain.on('tunnel:stop', (_, tunnelId) => {
  const t = activeTunnels.get(tunnelId);
  if (t) {
    t.server.close();
    t.conn.end();
    activeTunnels.delete(tunnelId);
  }
});

ipcMain.handle('tunnel:list', () => {
  return Array.from(activeTunnels.keys());
});
