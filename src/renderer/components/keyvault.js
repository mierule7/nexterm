// ─── Key Vault ────────────────────────────────────────────────────────────────
const KeyVault = (() => {
  let keys = [];

  function load() {
    try {
      const raw = localStorage.getItem('nexterm_keys');
      keys = raw ? JSON.parse(raw) : [];
    } catch { keys = []; }
    render();
  }

  function save() {
    localStorage.setItem('nexterm_keys', JSON.stringify(keys));
  }

  function render() {
    const list = document.getElementById('key-list');
    if (keys.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M8 11V7a4 4 0 118 0v4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          <p>No saved keys.</p>
        </div>`;
      return;
    }

    list.innerHTML = keys.map((k, i) => `
      <div class="key-item" oncontextmenu="KeyVault.contextMenu(event,${i})">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span class="key-name">${k.name}</span>
        </div>
        <div class="key-path">${k.path}</div>
        ${k.passphrase ? '<div style="font-size:10px;color:var(--accent-yellow);margin-top:3px">🔒 Passphrase protected</div>' : ''}
      </div>
    `).join('');
  }

  async function addKey() {
    const result = await window.api.dialog.openKey();
    if (!result) return;

    const name = prompt('Name for this key:', result.path.split(/[\\/]/).pop());
    if (!name) return;

    const usePassphrase = confirm('Does this key have a passphrase?');
    let passphrase = '';
    if (usePassphrase) {
      passphrase = prompt('Enter passphrase (stored locally):') || '';
    }

    keys.push({ name, path: result.path, content: result.content, passphrase });
    save();
    render();
    Notify.show('Key added: ' + name, 'success');
  }

  function contextMenu(e, i) {
    e.preventDefault();
    ContextMenu.show(e, [
      { label: 'Remove', icon: '🗑', danger: true, action: () => {
        keys.splice(i, 1);
        save();
        render();
      }},
    ]);
  }

  function getAll() { return keys; }

  function getByName(name) { return keys.find(k => k.name === name); }

  return { load, render, addKey, contextMenu, getAll, getByName };
})();
