// ─── SSH Tunnels Manager ──────────────────────────────────────────────────────
const Tunnels = (() => {
  const tunnels = new Map(); // tunnelId -> { config, status }

  function render() {
    const list = document.getElementById('tunnel-list');
    if (tunnels.size === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M3 12h18M3 12C3 7 7 4 12 4s9 3 9 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M3 12c0 5 4 8 9 8s9-3 9-8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          <p>No tunnels yet.</p>
        </div>`;
      return;
    }

    list.innerHTML = Array.from(tunnels.entries()).map(([id, t]) => `
      <div class="tunnel-item" data-id="${id}">
        <div class="tunnel-name">${t.config.name || 'Tunnel'}</div>
        <div class="tunnel-info">
          127.0.0.1:${t.config.localPort} → ${t.config.remoteHost}:${t.config.remotePort}<br>
          via ${t.config.sshUser}@${t.config.sshHost}:${t.config.sshPort || 22}
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px">
          <span class="tunnel-status-badge ${t.status}">${t.status}</span>
          <button class="btn ${t.status === 'active' ? 'btn-danger' : 'btn-secondary'}" 
            style="padding:3px 10px;font-size:10px"
            onclick="Tunnels.${t.status === 'active' ? 'stop' : 'start'}('${id}')">
            ${t.status === 'active' ? 'Stop' : 'Start'}
          </button>
        </div>
      </div>
    `).join('');
  }

  async function create(config) {
    const id = 'tun_' + Date.now();
    tunnels.set(id, { config, status: 'inactive' });
    render();
    await start(id);
  }

  async function start(id) {
    const t = tunnels.get(id);
    if (!t) return;

    Notify.show(`Starting tunnel on port ${t.config.localPort}...`, 'info');
    const result = await window.api.tunnel.create(id, t.config);

    if (result.success) {
      t.status = 'active';
      Notify.show(`Tunnel active: 127.0.0.1:${t.config.localPort}`, 'success');
    } else {
      t.status = 'inactive';
      Notify.show('Tunnel failed: ' + result.error, 'error');
    }
    render();
  }

  function stop(id) {
    const t = tunnels.get(id);
    if (!t) return;
    window.api.tunnel.stop(id);
    t.status = 'inactive';
    Notify.show('Tunnel stopped', 'info');
    render();
  }

  function remove(id) {
    stop(id);
    tunnels.delete(id);
    render();
  }

  return { create, start, stop, remove, render };
})();
