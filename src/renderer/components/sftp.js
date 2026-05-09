// ─── SFTP Browser ─────────────────────────────────────────────────────────────
const SFTPBrowser = (() => {
  const instances = new Map();

  async function create(paneEl, sessionId, config) {
    paneEl.innerHTML = `
      <div class="sftp-pane">
        <div class="sftp-toolbar">
          <button class="btn btn-secondary" style="padding:5px 8px" onclick="SFTPBrowser.goUp('${sessionId}')" title="Go Up">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button class="btn btn-secondary" style="padding:5px 8px" onclick="SFTPBrowser.refresh('${sessionId}')" title="Refresh">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M4 4v5h5M20 20v-5h-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.06 9a8 8 0 0113.12-4.24M19.94 15A8 8 0 016.82 19.24" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
          <input class="sftp-path-input" id="sftp-path-${sessionId}" value="/" 
            onkeydown="if(event.key==='Enter')SFTPBrowser.navigate('${sessionId}',this.value)" />
          <button class="btn btn-secondary" style="padding:5px 8px" onclick="SFTPBrowser.newFolder('${sessionId}')" title="New Folder">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 11v6M9 14h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
          </button>
          <button class="btn btn-primary" style="padding:5px 10px;font-size:11px" onclick="SFTPBrowser.uploadFile('${sessionId}')">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Upload
          </button>
        </div>
        <div id="sftp-files-${sessionId}" class="sftp-files">
          <div class="empty-state" style="padding:60px 20px">
            <div class="spinner"></div>
            <p>Connecting...</p>
          </div>
        </div>
        <div class="sftp-status" id="sftp-status-${sessionId}">Ready</div>
      </div>`;

    const result = await window.api.sftp.connect(sessionId, config);
    if (!result.success) {
      document.getElementById(`sftp-files-${sessionId}`).innerHTML =
        `<div class="empty-state"><p style="color:var(--accent-red)">Failed: ${result.error}</p></div>`;
      return false;
    }

    instances.set(sessionId, { config, currentPath: '/', selected: new Set() });
    await navigate(sessionId, '/');
    return true;
  }

  async function navigate(sessionId, path) {
    const inst = instances.get(sessionId);
    if (!inst) return;

    setStatus(sessionId, 'Loading...');
    const pathInput = document.getElementById(`sftp-path-${sessionId}`);
    if (pathInput) pathInput.value = path;

    const result = await window.api.sftp.list(sessionId, path);
    if (!result.success) {
      setStatus(sessionId, 'Error: ' + result.error);
      return;
    }

    inst.currentPath = path;

    const items = result.items.sort((a, b) => {
      if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    const container = document.getElementById(`sftp-files-${sessionId}`);
    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = `<div class="empty-state"><p>Empty directory</p></div>`;
      setStatus(sessionId, `${path} · 0 items`);
      return;
    }

    container.innerHTML = `
      <div style="display:flex;padding:4px 12px;border-bottom:1px solid var(--border-subtle);font-size:10px;color:var(--text-3);text-transform:uppercase;letter-spacing:.06em">
        <span style="flex:1">Name</span>
        <span style="width:80px;text-align:right">Size</span>
        <span style="width:140px;text-align:right">Modified</span>
      </div>
      ${items.map(item => `
        <div class="sftp-file-item"
          data-name="${item.name}"
          data-isdir="${item.isDir}"
          ondblclick="SFTPBrowser.onDblClick('${sessionId}', '${item.name}', ${item.isDir})"
          oncontextmenu="SFTPBrowser.contextMenu(event, '${sessionId}', '${item.name}', ${item.isDir})">
          <svg class="sftp-file-icon ${item.isDir ? 'folder' : ''}" width="16" height="16" viewBox="0 0 24 24" fill="none">
            ${item.isDir
              ? '<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
              : '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 2v6h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'}
          </svg>
          <span class="sftp-file-name">${item.name}</span>
          <span class="sftp-file-size">${item.isDir ? '—' : formatSize(item.size)}</span>
          <span class="sftp-file-date">${formatDate(item.modTime)}</span>
        </div>
      `).join('')}`;

    const dirs = items.filter(i => i.isDir).length;
    const files = items.filter(i => !i.isDir).length;
    setStatus(sessionId, `${path} · ${dirs} folders, ${files} files`);
  }

  function onDblClick(sessionId, name, isDir) {
    const inst = instances.get(sessionId);
    if (!inst) return;
    if (isDir) {
      const newPath = inst.currentPath === '/'
        ? '/' + name
        : inst.currentPath + '/' + name;
      navigate(sessionId, newPath);
    } else {
      downloadFile(sessionId, name);
    }
  }

  function goUp(sessionId) {
    const inst = instances.get(sessionId);
    if (!inst || inst.currentPath === '/') return;
    const parts = inst.currentPath.split('/').filter(Boolean);
    parts.pop();
    navigate(sessionId, '/' + parts.join('/') || '/');
  }

  function refresh(sessionId) {
    const inst = instances.get(sessionId);
    if (inst) navigate(sessionId, inst.currentPath);
  }

  async function downloadFile(sessionId, name) {
    const inst = instances.get(sessionId);
    if (!inst) return;
    const remotePath = (inst.currentPath === '/' ? '' : inst.currentPath) + '/' + name;
    const localPath = await window.api.dialog.saveFile(name);
    if (!localPath) return;
    setStatus(sessionId, `Downloading ${name}...`);
    const result = await window.api.sftp.download(sessionId, remotePath, localPath);
    setStatus(sessionId, result.success ? `Downloaded ${name}` : `Error: ${result.error}`);
    if (result.success) Notify.show('Downloaded: ' + name, 'success');
    else Notify.show('Download failed: ' + result.error, 'error');
  }

  async function uploadFile(sessionId) {
    const inst = instances.get(sessionId);
    if (!inst) return;
    const files = await window.api.dialog.openFile();
    if (!files.length) return;
    for (const localPath of files) {
      const name = localPath.split(/[\\/]/).pop();
      const remotePath = (inst.currentPath === '/' ? '' : inst.currentPath) + '/' + name;
      setStatus(sessionId, `Uploading ${name}...`);
      const result = await window.api.sftp.upload(sessionId, localPath, remotePath);
      if (result.success) Notify.show('Uploaded: ' + name, 'success');
      else Notify.show('Upload failed: ' + result.error, 'error');
    }
    refresh(sessionId);
  }

  async function newFolder(sessionId) {
    const inst = instances.get(sessionId);
    if (!inst) return;
    const name = prompt('New folder name:');
    if (!name) return;
    const remotePath = (inst.currentPath === '/' ? '' : inst.currentPath) + '/' + name;
    const result = await window.api.sftp.mkdir(sessionId, remotePath);
    if (result.success) { Notify.show('Folder created', 'success'); refresh(sessionId); }
    else Notify.show('Failed: ' + result.error, 'error');
  }

  function contextMenu(e, sessionId, name, isDir) {
    e.preventDefault();
    const inst = instances.get(sessionId);
    if (!inst) return;
    const remotePath = (inst.currentPath === '/' ? '' : inst.currentPath) + '/' + name;

    const items = [
      ...(isDir ? [] : [{ label: 'Download', icon: '⬇', action: () => downloadFile(sessionId, name) }]),
      { label: 'Rename', icon: '✏️', action: async () => {
        const newName = prompt('New name:', name);
        if (!newName || newName === name) return;
        const newPath = (inst.currentPath === '/' ? '' : inst.currentPath) + '/' + newName;
        await window.api.sftp.rename(sessionId, remotePath, newPath);
        refresh(sessionId);
      }},
      { separator: true },
      { label: 'Delete', icon: '🗑', danger: true, action: async () => {
        if (!confirm(`Delete "${name}"?`)) return;
        const result = await window.api.sftp.delete(sessionId, remotePath, isDir);
        if (result.success) { Notify.show('Deleted', 'success'); refresh(sessionId); }
        else Notify.show('Failed: ' + result.error, 'error');
      }},
    ];

    ContextMenu.show(e, items);
  }

  function setStatus(sessionId, msg) {
    const el = document.getElementById(`sftp-status-${sessionId}`);
    if (el) el.textContent = msg;
  }

  function destroy(sessionId) {
    window.api.sftp.disconnect(sessionId);
    instances.delete(sessionId);
  }

  function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024, sizes = ['B','KB','MB','GB','TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function formatDate(ts) {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return { create, navigate, goUp, refresh, onDblClick, uploadFile, newFolder, contextMenu, destroy };
})();
