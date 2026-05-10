// ─── Modals ───────────────────────────────────────────────────────────────────
const Modals = (() => {
  function open(html) {
    document.getElementById('modal-container').innerHTML = html;
    document.getElementById('modal-overlay').classList.remove('hidden');
  }

  function close() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-container').innerHTML = '';
  }

  // ─── Session Form ───────────────────────────────────────────────────────────
  function showSessionForm(existing, onSave) {
    const s = existing || {};
    const groups = Sessions.getGroups();

    open(`
      <div class="modal-header">
        <span class="modal-title">${existing ? 'Edit Session' : 'New Session'}</span>
        <button class="icon-btn" onclick="Modals.close()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="modal-tabs">
          <div class="modal-tab active" onclick="Modals.switchTab(this,'tab-basic')">Basic</div>
          <div class="modal-tab" onclick="Modals.switchTab(this,'tab-auth')">Authentication</div>
          <div class="modal-tab" onclick="Modals.switchTab(this,'tab-advanced')">Advanced</div>
        </div>

        <div class="modal-tab-content active" id="tab-basic">
          <div class="form-group">
            <label class="form-label">Session Name</label>
            <input class="form-input" id="f-name" value="${s.name || ''}" placeholder="My Server" />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Host / IP</label>
              <input class="form-input" id="f-host" value="${s.host || ''}" placeholder="192.168.1.1" />
            </div>
            <div class="form-group">
              <label class="form-label">Port</label>
              <input class="form-input" id="f-port" type="number" value="${s.port || 22}" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Username</label>
            <input class="form-input" id="f-user" value="${s.username || ''}" placeholder="root" />
          </div>
          <div class="form-group">
            <label class="form-label">Session Type</label>
            <select class="form-select" id="f-type" onchange="Modals.updateTypeHint(this.value)">
              <option value="ssh" ${(!s.type || s.type==='ssh') ? 'selected' : ''}>SSH Terminal</option>
              <option value="sftp" ${s.type==='sftp' ? 'selected' : ''}>SFTP Browser</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Group</label>
            <select class="form-select" id="f-group">
              ${groups.map(g => `<option value="${g}" ${(s.group||'Default')===g?'selected':''}>${g}</option>`).join('')}
              <option value="__new__">+ New group...</option>
            </select>
          </div>
        </div>

        <div class="modal-tab-content" id="tab-auth">
          <div class="form-group">
            <label class="form-label">Authentication Method</label>
            <select class="form-select" id="f-auth-type" onchange="Modals.toggleAuthFields(this.value)">
              <option value="password" ${(!s.authType||s.authType==='password')?'selected':''}>Password</option>
              <option value="key" ${s.authType==='key'?'selected':''}>Private Key (.pem / .ppk)</option>
              <option value="vault" ${s.authType==='vault'?'selected':''}>Key Vault</option>
            </select>
          </div>

          <div id="auth-password-fields" style="${(!s.authType||s.authType==='password')?'':'display:none'}">
            <div class="form-group">
              <label class="form-label">Password</label>
              <input class="form-input" id="f-password" type="password" value="${s.password || ''}" placeholder="Enter password" />
              <div class="form-hint">Password is stored locally on your device.</div>
            </div>
          </div>

          <div id="auth-key-fields" style="${s.authType==='key'?'':'display:none'}">
            <div class="form-group">
              <label class="form-label">Private Key File</label>
              <div class="key-picker">
                <input class="form-input" id="f-key-path" value="${s.keyPath || ''}" placeholder="Path to .pem file" readonly />
                <button class="btn btn-secondary" onclick="Modals.pickKeyFile()">Browse...</button>
              </div>
              <div class="form-hint">Supports .pem, .key, .rsa, .ppk files</div>
            </div>
            <div class="form-group">
              <label class="form-label">Key Passphrase (if any)</label>
              <input class="form-input" id="f-passphrase" type="password" value="${s.passphrase || ''}" placeholder="Leave empty if none" />
            </div>
          </div>

          <div id="auth-vault-fields" style="${s.authType==='vault'?'':'display:none'}">
            <div class="form-group">
              <label class="form-label">Key from Vault</label>
              <select class="form-select" id="f-vault-key">
                ${KeyVault.getAll().map(k => `<option value="${k.name}" ${s.vaultKey===k.name?'selected':''}>${k.name}</option>`).join('')}
              </select>
              ${KeyVault.getAll().length === 0 ? '<div class="form-hint" style="color:var(--accent-yellow)">No keys in vault. Add keys via the Key Vault panel.</div>' : ''}
            </div>
          </div>
        </div>

        <div class="modal-tab-content" id="tab-advanced">
          <div class="form-group">
            <label class="form-label">Startup Command</label>
            <input class="form-input" id="f-cmd" value="${s.startupCommand || ''}" placeholder="e.g. cd /var/www && bash" />
            <div class="form-hint">Executed automatically after connecting.</div>
          </div>
          <div class="form-group">
            <label class="form-label">Keep-Alive Interval (seconds, 0 = disabled)</label>
            <input class="form-input" id="f-keepalive" type="number" value="${s.keepAlive || 30}" />
          </div>
          <div class="form-group">
            <label class="form-label">Notes</label>
            <textarea class="form-input" id="f-notes" rows="3" style="resize:vertical">${s.notes || ''}</textarea>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modals.close()">Cancel</button>
        <button class="btn btn-primary" onclick="Modals.saveSession()">
          ${existing ? 'Save Changes' : 'Create Session'}
        </button>
      </div>
    `);

    window._modalSaveCallback = onSave;
    window._modalExisting = existing;
  }

  async function pickKeyFile() {
    const result = await window.api.dialog.openKey();
    if (result) {
      document.getElementById('f-key-path').value = result.path;
      window._pendingKeyContent = result.content;
    }
  }

  function toggleAuthFields(type) {
    document.getElementById('auth-password-fields').style.display = type === 'password' ? '' : 'none';
    document.getElementById('auth-key-fields').style.display = type === 'key' ? '' : 'none';
    document.getElementById('auth-vault-fields').style.display = type === 'vault' ? '' : 'none';
  }

  function updateTypeHint(type) {}

  function switchTab(el, tabId) {
    document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.modal-tab-content').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    document.getElementById(tabId).classList.add('active');
  }

  function saveSession() {
    const name = document.getElementById('f-name').value.trim();
    const host = document.getElementById('f-host').value.trim();
    const user = document.getElementById('f-user').value.trim();
    const port = parseInt(document.getElementById('f-port').value) || 22;
    const type = document.getElementById('f-type').value;
    const authType = document.getElementById('f-auth-type').value;
    let group = document.getElementById('f-group').value;

    if (!host) { Notify.show('Host is required', 'error'); return; }
    if (!user) { Notify.show('Username is required', 'error'); return; }

    // if (group === '__new__') {
    //   group = prompt('New group name:') || 'Default';
    //   Sessions.addGroup(group);
    // }

if (group === '__new__') {
  group = 'Default';
}


    const sessionData = {
      name: name || host,
      host, port, username: user, type, group,
      authType,
      password: document.getElementById('f-password')?.value || '',
      keyPath: document.getElementById('f-key-path')?.value || '',
      privateKey: window._pendingKeyContent || window._modalExisting?.privateKey || '',
      passphrase: document.getElementById('f-passphrase')?.value || '',
      vaultKey: document.getElementById('f-vault-key')?.value || '',
      startupCommand: document.getElementById('f-cmd').value,
      keepAlive: parseInt(document.getElementById('f-keepalive').value) || 30,
      notes: document.getElementById('f-notes').value,
    };

    // If key auth but content not reloaded, keep existing
    if (authType === 'key' && !sessionData.privateKey && window._modalExisting?.privateKey) {
      sessionData.privateKey = window._modalExisting.privateKey;
    }

    close();
    if (window._modalSaveCallback) window._modalSaveCallback(sessionData);
    window._pendingKeyContent = null;
    window._modalSaveCallback = null;
    window._modalExisting = null;
  }

  // ─── Tunnel Form ────────────────────────────────────────────────────────────
  function showTunnelForm() {
    open(`
      <div class="modal-header">
        <span class="modal-title">New SSH Tunnel</span>
        <button class="icon-btn" onclick="Modals.close()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Tunnel Name</label>
          <input class="form-input" id="t-name" placeholder="e.g. DB Tunnel" />
        </div>
        <div class="form-group">
          <label class="form-label">SSH Jump Server</label>
          <div class="form-row-3">
            <div>
              <label class="form-label" style="font-size:9px">Host</label>
              <input class="form-input" id="t-ssh-host" placeholder="ssh.server.com" />
            </div>
            <div>
              <label class="form-label" style="font-size:9px">Port</label>
              <input class="form-input" id="t-ssh-port" type="number" value="22" />
            </div>
            <div>
              <label class="form-label" style="font-size:9px">Username</label>
              <input class="form-input" id="t-ssh-user" placeholder="admin" />
            </div>
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Authentication</label>
          <select class="form-select" id="t-auth-type" onchange="Modals.toggleTunnelAuth(this.value)">
            <option value="password">Password</option>
            <option value="key">Private Key</option>
          </select>
        </div>
        <div id="t-auth-password">
          <div class="form-group">
            <label class="form-label">Password</label>
            <input class="form-input" id="t-password" type="password" />
          </div>
        </div>
        <div id="t-auth-key" style="display:none">
          <div class="form-group">
            <label class="form-label">Private Key</label>
            <div class="key-picker">
              <input class="form-input" id="t-key-path" readonly placeholder="Select key file..." />
              <button class="btn btn-secondary" onclick="Modals.pickTunnelKey()">Browse...</button>
            </div>
          </div>
        </div>
        <div style="border-top:1px solid var(--border-subtle);padding-top:14px;margin-top:4px">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Local Port</label>
              <input class="form-input" id="t-local-port" type="number" value="8080" />
              <div class="form-hint">Port on your machine</div>
            </div>
            <div class="form-group">
              <label class="form-label">Remote Host</label>
              <input class="form-input" id="t-remote-host" value="localhost" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Remote Port</label>
            <input class="form-input" id="t-remote-port" type="number" value="5432" />
            <div class="form-hint">Port on the remote server (e.g. 5432 for PostgreSQL, 3306 for MySQL)</div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="Modals.close()">Cancel</button>
        <button class="btn btn-primary" onclick="Modals.saveTunnel()">Create & Start Tunnel</button>
      </div>
    `);
  }

  function toggleTunnelAuth(type) {
    document.getElementById('t-auth-password').style.display = type === 'password' ? '' : 'none';
    document.getElementById('t-auth-key').style.display = type === 'key' ? '' : 'none';
  }

  async function pickTunnelKey() {
    const result = await window.api.dialog.openKey();
    if (result) {
      document.getElementById('t-key-path').value = result.path;
      window._tunnelKeyContent = result.content;
    }
  }

  function saveTunnel() {
    const config = {
      name: document.getElementById('t-name').value || 'Tunnel',
      sshHost: document.getElementById('t-ssh-host').value.trim(),
      sshPort: parseInt(document.getElementById('t-ssh-port').value) || 22,
      sshUser: document.getElementById('t-ssh-user').value.trim(),
      authType: document.getElementById('t-auth-type').value,
      password: document.getElementById('t-password')?.value || '',
      privateKey: window._tunnelKeyContent || '',
      localPort: parseInt(document.getElementById('t-local-port').value) || 8080,
      remoteHost: document.getElementById('t-remote-host').value || 'localhost',
      remotePort: parseInt(document.getElementById('t-remote-port').value) || 80,
    };

    if (!config.sshHost) { Notify.show('SSH host is required', 'error'); return; }
    if (!config.sshUser) { Notify.show('SSH username is required', 'error'); return; }

    close();
    Tunnels.create(config);
    window._tunnelKeyContent = null;
  }

  return {
    open, close, showSessionForm, showTunnelForm,
    pickKeyFile, toggleAuthFields, updateTypeHint,
    switchTab, saveSession, toggleTunnelAuth, pickTunnelKey, saveTunnel
  };
})();

// ─── Context Menu ─────────────────────────────────────────────────────────────
const ContextMenu = (() => {
  let current = null;

  function show(e, items) {
    remove();
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = e.clientX + 'px';
    menu.style.top = e.clientY + 'px';

    items.forEach(item => {
      if (item.separator) {
        menu.innerHTML += '<div class="ctx-separator"></div>';
        return;
      }
      const div = document.createElement('div');
      div.className = 'ctx-item' + (item.danger ? ' danger' : '');
      div.innerHTML = `<span>${item.icon || ''}</span><span>${item.label}</span>`;
      div.addEventListener('click', () => { remove(); item.action(); });
      menu.appendChild(div);
    });

    document.body.appendChild(menu);
    current = menu;

    // Adjust if off-screen
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) menu.style.left = (e.clientX - rect.width) + 'px';
    if (rect.bottom > window.innerHeight) menu.style.top = (e.clientY - rect.height) + 'px';
  }

  function remove() {
    if (current) { current.remove(); current = null; }
  }

  document.addEventListener('click', remove);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') remove(); });

  return { show, remove };
})();

// ─── Notifications ─────────────────────────────────────────────────────────────
const Notify = (() => {
  function show(msg, type = 'info', duration = 3000) {
    const icons = {
      success: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      error: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="var(--accent-red)" stroke-width="1.5"/><path d="M12 8v4M12 16h.01" stroke="var(--accent-red)" stroke-width="1.5" stroke-linecap="round"/></svg>',
      info: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="var(--accent-blue)" stroke-width="1.5"/><path d="M12 8v4M12 16h.01" stroke="var(--accent-blue)" stroke-width="1.5" stroke-linecap="round"/></svg>',
    };

    const el = document.createElement('div');
    el.className = `notification ${type}`;
    el.innerHTML = `${icons[type] || ''}<span>${msg}</span>`;
    document.getElementById('notification-container').appendChild(el);

    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(20px)';
      el.style.transition = 'all 0.2s ease';
      setTimeout(() => el.remove(), 200);
    }, duration);
  }

  return { show };
})();
