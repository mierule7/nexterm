# 🖥 NexTerm

**A free, open-source, cross-platform SSH/SFTP/Tunneling client** — built with Electron.  
Similar to MobaXterm but fully unlimited and open source.

---

## ✨ Features

| Feature | Status |
|---------|--------|
| SSH Terminal | ✅ Full xterm.js terminal with 256 colors |
| SFTP File Browser | ✅ Upload, download, rename, delete, mkdir |
| SSH Tunneling (port forwarding) | ✅ Local port forwarding |
| Session Manager | ✅ Groups, search, persistent storage |
| Private Key Auth (.pem, .ppk, .key) | ✅ With passphrase support |
| Password Auth | ✅ |
| Key Vault | ✅ Store & reuse SSH keys |
| Unlimited Sessions | ✅ No limits |
| Unlimited Tunnels | ✅ No limits |
| Tabbed Interface | ✅ Multiple sessions side-by-side |
| Startup Commands | ✅ Auto-run on connect |
| Cross-platform | ✅ Windows, macOS, Linux |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+** → https://nodejs.org
- **npm** (comes with Node.js)

### Install & Run

**Windows:**
```
Double-click start.bat
```
Or:
```cmd
npm install
npm start
```

**macOS / Linux:**
```bash
chmod +x start.sh
./start.sh
```
Or:
```bash
npm install
npm start
```

---

## 📖 How to Use

### Creating an SSH Session

1. Click **+** in the Sessions panel (left sidebar)
2. Fill in: **Host**, **Port**, **Username**
3. Choose auth: **Password** or **Private Key (.pem)**
4. Click **Create Session**
5. Double-click the session to connect

### Using SFTP Browser

1. Create a session with type **SFTP Browser**
2. Navigate folders by double-clicking
3. **Upload**: Click the Upload button or drag files
4. **Download**: Double-click a file
5. **Right-click** for more options (rename, delete)

### SSH Tunneling

1. Go to the **Tunnels** panel (sidebar)
2. Click **+** 
3. Fill in your SSH jump server details
4. Set **Local Port** (on your machine) and **Remote Port** (on the server)
5. Click **Create & Start Tunnel**
6. Connect your local app to `127.0.0.1:<local_port>`

**Example: Tunnel to a remote PostgreSQL database:**
- Local Port: `5433`
- Remote Host: `localhost`  
- Remote Port: `5432`
- Then connect your DB client to `localhost:5433`

### Key Vault

1. Go to the **Key Vault** panel (lock icon)
2. Click **+** to add a `.pem` / `.key` file
3. When creating sessions, choose **Key Vault** as auth method
4. Select the saved key — no need to browse every time

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New session |
| `Ctrl+W` | Close active tab |
| `Ctrl+Tab` | Next tab |
| `Ctrl+Shift+Tab` | Previous tab |

---

## 🔨 Building a Distributable

```bash
npm install
npm run build
```

Output will be in the `dist/` folder:
- Windows: `.exe` installer
- macOS: `.dmg`
- Linux: `.AppImage`

---

## 🗂 Project Structure

```
nexterm/
├── src/
│   ├── main/
│   │   └── main.js          # Electron main process (SSH, SFTP, Tunnel logic)
│   ├── preload/
│   │   └── preload.js       # Secure IPC bridge
│   └── renderer/
│       ├── index.html       # App UI
│       ├── app.js           # Tab/session orchestrator
│       ├── styles/          # CSS
│       └── components/
│           ├── sessions.js  # Session manager
│           ├── terminal.js  # SSH terminal (xterm.js)
│           ├── sftp.js      # SFTP browser
│           ├── tunnels.js   # SSH tunnels
│           ├── keyvault.js  # Key management
│           └── modals.js    # Forms & notifications
├── package.json
├── start.sh   (Mac/Linux)
└── start.bat  (Windows)
```

---

## 🔐 Security Notes

- Sessions and keys are stored **locally** on your device only
- No data is sent to any server
- Passwords are stored in plain text in the app's local data folder — use key-based auth for better security

---

## 📝 License

MIT License — free to use, modify, and distribute.
