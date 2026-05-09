// ─── NexTerm App ──────────────────────────────────────────────────────────────
const App = (() => {
  let tabIdCounter = 0;
  const tabs = new Map(); // tabId -> { type, sessionId, label, paneEl }
  let activeTabId = null;

  // ─── Init ───────────────────────────────────────────────────────────────────
  async function init() {
    // Window controls
    document.getElementById('btn-minimize').addEventListener('click', () => window.api.window.minimize());
    document.getElementById('btn-maximize').addEventListener('click', () => window.api.window.maximize());
    document.getElementById('btn-close').addEventListener('click', () => window.api.window.close());

    // Sidebar nav
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.sidebar-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('panel-' + btn.dataset.panel).classList.add('active');
      });
    });

    // New session button
    document.getElementById('btn-new-session').addEventListener('click', () => showNewSessionModal());
    document.getElementById('qb-new-session').addEventListener('click', () => showNewSessionModal());
    document.getElementById('qb-new-sftp').addEventListener('click', () => showNewSessionModal('sftp'));
    document.getElementById('qb-new-tunnel').addEventListener('click', () => {
      document.querySelector('[data-panel="tunnels"]').click();
      Modals.showTunnelForm();
    });

    // New tunnel button
    document.getElementById('btn-new-tunnel').addEventListener('click', () => Modals.showTunnelForm());

    // Key vault add
    document.getElementById('btn-add-key').addEventListener('click', () => KeyVault.addKey());

    // Session search
    document.getElementById('session-search').addEventListener('input', () => Sessions.render());

    // Tab: add tab
    document.getElementById('btn-add-tab').addEventListener('click', () => showNewSessionModal());

    // Modal overlay click to close
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('modal-overlay')) Modals.close();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'n') { e.preventDefault(); showNewSessionModal(); }
        if (e.key === 'w') { e.preventDefault(); closeActiveTab(); }
        if (e.key === 't') { e.preventDefault(); showNewSessionModal(); }
        if (e.key === 'Tab') {
          e.preventDefault();
          cycleTab(e.shiftKey ? -1 : 1);
        }
      }
    });

    // Load sessions & key vault
    Sessions.setOnConnect(openSession);
    await Sessions.load();
    KeyVault.load();
    Tunnels.render();
  }

  // ─── Session Modal ──────────────────────────────────────────────────────────
  function showNewSessionModal(defaultType) {
    Modals.showSessionForm(defaultType ? { type: defaultType } : null, (sessionData) => {
      const id = Sessions.addSession(sessionData);
      openSession({ ...sessionData, id });
    });
  }

  // ─── Open Session ───────────────────────────────────────────────────────────
  async function openSession(session) {
    // Resolve private key from vault if needed
    let config = { ...session };

    if (config.authType === 'vault' && config.vaultKey) {
      const vaultKey = KeyVault.getByName(config.vaultKey);
      if (vaultKey) {
        config.authType = 'key';
        config.privateKey = vaultKey.content;
        config.passphrase = vaultKey.passphrase || '';
      }
    }

    const tabId = 'tab_' + (++tabIdCounter);
    const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    const type = config._forceSftp ? 'sftp' : (config.type || 'ssh');

    // Create pane
    const pane = document.createElement('div');
    pane.className = 'pane';
    pane.id = 'pane-' + tabId;
    document.getElementById('panes-container').appendChild(pane);

    const label = config.name || config.host;
    const icon = type === 'sftp'
      ? '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" class="tab-icon"><path d="M3 15v4h18v-4M12 3v12m-4-4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
      : '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" class="tab-icon"><rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M7 8l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';

    createTab(tabId, label, icon, type, sessionId, config._sessionSavedId || session.id);

    // Load the pane
    if (type === 'sftp') {
      const ok = await SFTPBrowser.create(pane, sessionId, config);
      if (!ok) Notify.show('SFTP connection failed', 'error');
    } else {
      const ok = await TerminalManager.create(pane, sessionId, {
        ...config,
        _sessionSavedId: session.id
      });
      if (!ok) Notify.show('SSH connection failed', 'error');
      else if (config.startupCommand) {
        setTimeout(() => TerminalManager.sendText(sessionId, config.startupCommand + '\n'), 500);
      }
    }

    hideWelcome();
    activateTab(tabId);
  }

  // ─── Tab Management ─────────────────────────────────────────────────────────
  function createTab(tabId, label, icon, type, sessionId, savedId) {
    const tab = document.createElement('div');
    tab.className = 'tab';
    tab.id = 'tab-' + tabId;
    tab.dataset.tabId = tabId;
    tab.innerHTML = `
      ${icon}
      <span class="tab-label" title="${label}">${label}</span>
      <button class="tab-close" onclick="event.stopPropagation();App.closeTab('${tabId}')">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </button>`;
    tab.addEventListener('click', () => activateTab(tabId));
    document.getElementById('tabs-container').appendChild(tab);

    tabs.set(tabId, { type, sessionId, label, savedId });
  }

  function activateTab(tabId) {
    // Deactivate all
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'));

    const tab = document.getElementById('tab-' + tabId);
    const pane = document.getElementById('pane-' + tabId);
    if (tab) tab.classList.add('active');
    if (pane) pane.classList.add('active');
    activeTabId = tabId;

    // Focus terminal if SSH
    const meta = tabs.get(tabId);
    if (meta && meta.type !== 'sftp') {
      setTimeout(() => TerminalManager.focus(meta.sessionId), 50);
    }
  }

  function closeTab(tabId) {
    const meta = tabs.get(tabId);
    if (meta) {
      if (meta.type === 'sftp') SFTPBrowser.destroy(meta.sessionId);
      else TerminalManager.destroy(meta.sessionId);
      if (meta.savedId) Sessions.setConnected(meta.savedId, false);
    }

    document.getElementById('tab-' + tabId)?.remove();
    document.getElementById('pane-' + tabId)?.remove();
    tabs.delete(tabId);

    // Activate next tab
    const remaining = Array.from(tabs.keys());
    if (remaining.length > 0) {
      activateTab(remaining[remaining.length - 1]);
    } else {
      activeTabId = null;
      showWelcome();
    }
  }

  function closeActiveTab() {
    if (activeTabId) closeTab(activeTabId);
  }

  function cycleTab(dir) {
    const ids = Array.from(tabs.keys());
    if (ids.length < 2) return;
    const idx = ids.indexOf(activeTabId);
    const next = ids[(idx + dir + ids.length) % ids.length];
    activateTab(next);
  }

  function hideWelcome() {
    const w = document.getElementById('welcome-screen');
    if (w) w.style.display = 'none';
  }

  function showWelcome() {
    const w = document.getElementById('welcome-screen');
    if (w) w.style.display = 'flex';
  }

  return { init, openSession, closeTab, activateTab };
})();

// ─── Boot ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => App.init());
