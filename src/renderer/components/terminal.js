// ─── Terminal Manager ─────────────────────────────────────────────────────────
const TerminalManager = (() => {
  const instances = new Map();

  async function create(paneEl, sessionId, config) {
    const container = document.createElement('div');
    container.style.cssText = 'width:100%;height:100%;padding:4px;';
    paneEl.appendChild(container);

    // Status bar
    const statusBar = document.createElement('div');
    statusBar.className = 'conn-indicator';
    statusBar.innerHTML = `
      <div class="conn-dot connecting"></div>
      <span id="conn-status-${sessionId}">Connecting to ${config.host}...</span>
      <span style="margin-left:auto;font-family:var(--font-mono);font-size:10px">${config.username}@${config.host}:${config.port || 22}</span>
    `;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;height:100%;';
    wrapper.appendChild(container);
    wrapper.appendChild(statusBar);
    paneEl.innerHTML = '';
    paneEl.appendChild(wrapper);
    container.style.cssText = 'flex:1;overflow:hidden;padding:4px;';

    // Init xterm
    const term = new Terminal({
      fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
      fontSize: 13,
      lineHeight: 1.35,
      theme: {
        background: '#0a0e14',
        foreground: '#e6edf3',
        cursor: '#00d4aa',
        cursorAccent: '#0a0e14',
        selectionBackground: 'rgba(0,212,170,0.2)',
        black: '#0a0e14', red: '#f85149', green: '#3fb950',
        yellow: '#d29922', blue: '#388bfd', magenta: '#a371f7',
        cyan: '#39c5cf', white: '#c9d1d9',
        brightBlack: '#484f58', brightRed: '#ff7b72', brightGreen: '#56d364',
        brightYellow: '#e3b341', brightBlue: '#79c0ff', brightMagenta: '#d2a8ff',
        brightCyan: '#56d4dd', brightWhite: '#e6edf3',
      },
      cursorBlink: true,
      cursorStyle: 'block',
      allowProposedApi: true,
      scrollback: 5000,
    });

    const fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);
    term.open(container);
    fitAddon.fit();

    // Connect SSH
    const result = await window.api.ssh.connect(sessionId, config);

    if (!result.success) {
      term.writeln(`\x1b[31mConnection failed: ${result.error}\x1b[0m`);
      statusBar.querySelector('.conn-dot').className = 'conn-dot disconnected';
      document.getElementById(`conn-status-${sessionId}`).textContent = 'Connection failed: ' + result.error;
      return false;
    }

    statusBar.querySelector('.conn-dot').className = 'conn-dot connected';
    document.getElementById(`conn-status-${sessionId}`).textContent = `Connected · ${config.username}@${config.host}`;

    // Data flow
    window.api.ssh.onData(sessionId, (data) => {
      term.write(data);
    });

    window.api.ssh.onClose(sessionId, () => {
      term.writeln('\r\n\x1b[33m[Session closed]\x1b[0m');
      statusBar.querySelector('.conn-dot').className = 'conn-dot disconnected';
      document.getElementById(`conn-status-${sessionId}`).textContent = 'Disconnected';
      Sessions.setConnected(config._sessionSavedId, false);
    });

    term.onData((data) => {
      window.api.ssh.input(sessionId, data);
    });

    // Resize
    const ro = new ResizeObserver(() => {
      try {
        fitAddon.fit();
        window.api.ssh.resize(sessionId, term.cols, term.rows);
      } catch (e) {}
    });
    ro.observe(container);

    term.focus();
    instances.set(sessionId, { term, fitAddon, ro });

    if (config._sessionSavedId) Sessions.setConnected(config._sessionSavedId, true);

    return true;
  }

  function focus(sessionId) {
    const inst = instances.get(sessionId);
    if (inst) inst.term.focus();
  }

  function destroy(sessionId) {
    const inst = instances.get(sessionId);
    if (!inst) return;
    inst.ro.disconnect();
    inst.term.dispose();
    window.api.ssh.disconnect(sessionId);
    instances.delete(sessionId);
  }

  function sendText(sessionId, text) {
    window.api.ssh.input(sessionId, text);
  }

  return { create, focus, destroy, sendText };
})();
