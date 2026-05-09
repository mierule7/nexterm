// ─── Sessions Manager ─────────────────────────────────────────────────────────
const Sessions = (() => {
  let data = { groups: ['Default'], sessions: [] };
  let onConnect = null;

  async function load() {
    data = await window.api.sessions.load();
    if (!data.groups) data.groups = ['Default'];
    if (!data.sessions) data.sessions = [];
    render();
  }

  async function save() {
    await window.api.sessions.save(data);
  }

  function render() {
    const tree = document.getElementById('session-tree');
    const search = document.getElementById('session-search').value.toLowerCase();

    const filtered = search
      ? data.sessions.filter(s =>
          s.name.toLowerCase().includes(search) ||
          s.host.toLowerCase().includes(search)
        )
      : data.sessions;

    if (filtered.length === 0 && data.sessions.length === 0) {
      tree.innerHTML = `
        <div class="empty-state">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="8" height="5" rx="1.5" stroke="currentColor" stroke-width="1.5"/><rect x="3" y="11" width="8" height="5" rx="1.5" stroke="currentColor" stroke-width="1.5"/><rect x="13" y="3" width="8" height="13" rx="1.5" stroke="currentColor" stroke-width="1.5"/></svg>
          <p>No sessions yet.<br>Click + to add one.</p>
        </div>`;
      return;
    }

    // Group sessions
    const byGroup = {};
    data.groups.forEach(g => byGroup[g] = []);
    byGroup['Default'] = byGroup['Default'] || [];

    filtered.forEach(s => {
      const g = s.group || 'Default';
      if (!byGroup[g]) byGroup[g] = [];
      byGroup[g].push(s);
    });

    let html = '';
    Object.entries(byGroup).forEach(([group, sessions]) => {
      if (sessions.length === 0 && search) return;
      html += `
        <div class="session-group" data-group="${group}">
          <div class="session-group-header" onclick="Sessions.toggleGroup('${group}')">
            <svg class="chevron" width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            <span>${group}</span>
            <span style="color:var(--text-3);margin-left:auto;font-size:10px">${sessions.length}</span>
          </div>
          <div class="session-group-items">
            ${sessions.map(s => `
              <div class="session-item" data-id="${s.id}"
                onclick="Sessions.openSession('${s.id}')"
                oncontextmenu="Sessions.contextMenu(event, '${s.id}')">
                <div class="session-status ${s._connected ? 'connected' : ''}"></div>
                <svg class="session-icon" width="14" height="14" viewBox="0 0 24 24" fill="none">
                  ${s.type === 'sftp'
                    ? '<path d="M3 15v4h18v-4M12 3v12m-4-4l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
                    : '<rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M7 8l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'}
                </svg>
                <div style="flex:1;min-width:0">
                  <div class="session-name">${s.name}</div>
                  <div class="session-host">${s.username}@${s.host}:${s.port || 22}</div>
                </div>
                <div class="session-actions">
                  <button class="icon-btn" style="width:20px;height:20px" onclick="event.stopPropagation();Sessions.editSession('${s.id}')" title="Edit">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>`;
    });

    tree.innerHTML = html;
  }

  function toggleGroup(group) {
    const el = document.querySelector(`.session-group[data-group="${group}"]`);
    if (el) el.classList.toggle('collapsed');
  }

  function openSession(id) {
    const session = data.sessions.find(s => s.id === id);
    if (!session) return;
    if (onConnect) onConnect(session);
  }

  function contextMenu(e, id) {
    e.preventDefault();
    const session = data.sessions.find(s => s.id === id);
    if (!session) return;

    ContextMenu.show(e, [
      { label: 'Connect', icon: '⚡', action: () => openSession(id) },
      { label: 'Open SFTP', icon: '📁', action: () => {
        if (onConnect) onConnect({ ...session, type: 'sftp', _forceSftp: true });
      }},
      { separator: true },
      { label: 'Edit', icon: '✏️', action: () => editSession(id) },
      { label: 'Duplicate', icon: '⧉', action: () => duplicateSession(id) },
      { separator: true },
      { label: 'Delete', icon: '🗑', danger: true, action: () => deleteSession(id) },
    ]);
  }

  function addSession(sessionData) {
    const id = 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    data.sessions.push({ ...sessionData, id });
    save();
    render();
    return id;
  }

  function editSession(id) {
    const session = data.sessions.find(s => s.id === id);
    if (!session) return;
    Modals.showSessionForm(session, (updated) => {
      Object.assign(session, updated);
      save();
      render();
    });
  }

  function duplicateSession(id) {
    const session = data.sessions.find(s => s.id === id);
    if (!session) return;
    addSession({ ...session, name: session.name + ' (copy)' });
  }

  function deleteSession(id) {
    if (!confirm('Delete this session?')) return;
    data.sessions = data.sessions.filter(s => s.id !== id);
    save();
    render();
  }

  function setConnected(id, connected) {
    const s = data.sessions.find(s => s.id === id);
    if (s) { s._connected = connected; render(); }
  }

  function setOnConnect(fn) { onConnect = fn; }

  function getGroups() { return data.groups; }

  function addGroup(name) {
    if (!data.groups.includes(name)) {
      data.groups.push(name);
      save();
      render();
    }
  }

  return { load, render, toggleGroup, openSession, contextMenu, addSession, editSession, deleteSession, setConnected, setOnConnect, getGroups, addGroup };
})();
