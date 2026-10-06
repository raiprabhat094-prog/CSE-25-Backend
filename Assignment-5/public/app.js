const fileInput = document.querySelector('#file-input');
const dropZone = document.querySelector('#drop-zone');
const uploadMessage = document.querySelector('#upload-message');
const searchInput = document.querySelector('#search-input');
const fileList = document.querySelector('#file-list');
const fileCount = document.querySelector('#file-count');
let searchTimer;

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let size = bytes / 1024;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit += 1; }
  return `${size.toFixed(size < 10 ? 1 : 0)} ${units[unit]}`;
}

function iconFor(name) {
  const extension = name.split('.').pop().toLowerCase();
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(extension)) return ['▧', 'image'];
  if (['pdf'].includes(extension)) return ['▤', 'pdf'];
  if (['doc', 'docx', 'txt', 'md'].includes(extension)) return ['≡', 'text'];
  if (['zip', 'rar', '7z'].includes(extension)) return ['▦', 'archive'];
  return ['⌑', 'other'];
}

async function loadFiles() {
  fileList.innerHTML = '<div class="loading">Looking for your files...</div>';
  try {
    const response = await fetch(`/api/files?search=${encodeURIComponent(searchInput.value)}`);
    if (!response.ok) throw new Error('Could not reach the local server. Start it with npm start.');
    const files = await response.json();
    fileCount.textContent = files.length;
    if (!files.length) {
      fileList.innerHTML = `<div class="empty"><span class="empty-icon">⌕</span><strong>${searchInput.value ? 'No matches found' : 'Your library is waiting'}</strong><span>${searchInput.value ? 'Try another search.' : 'Add a file above to get started.'}</span></div>`;
      return;
    }
    fileList.replaceChildren(...files.map((file) => {
      const row = document.createElement('article');
      row.className = 'file-row';
      const [symbol, kind] = iconFor(file.name);
      const icon = document.createElement('span');
      icon.className = `file-icon ${kind}`;
      icon.textContent = symbol;
      const details = document.createElement('span');
      details.className = 'file-details';
      const name = document.createElement('strong');
      name.textContent = file.name;
      name.title = file.name;
      const meta = document.createElement('span');
      meta.textContent = `${formatSize(file.size)} · ${new Date(file.modified).toLocaleDateString()}`;
      details.append(name, meta);
      const link = document.createElement('a');
      link.className = 'download-button';
      link.href = `/api/files/${encodeURIComponent(file.name)}/download`;
      link.setAttribute('aria-label', `Download ${file.name}`);
      link.textContent = '↓';
      row.append(icon, details, link);
      return row;
    }));
  } catch (error) {
    fileCount.textContent = '—';
    fileList.innerHTML = '<div class="empty server-error"><strong>Server is offline</strong><span>Open a terminal in Assignment-5 and run <code>npm start</code>.</span></div>';
  }
}

async function uploadFiles(files) {
  if (!files.length) return;
  uploadMessage.textContent = `Uploading ${files.length} ${files.length === 1 ? 'file' : 'files'}…`;
  uploadMessage.className = 'message';
  const errors = [];
  for (const file of files) {
    try {
      const response = await fetch(`/api/files/${encodeURIComponent(file.name)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/octet-stream' }, body: file,
      });
      if (!response.ok) {
        const result = await response.json();
        errors.push(`${file.name}: ${result.message}`);
      }
    } catch { errors.push(`${file.name}: upload failed`); }
  }
  uploadMessage.textContent = errors.length ? errors.join(' · ') : `Added ${files.length} ${files.length === 1 ? 'file' : 'files'} to your library.`;
  uploadMessage.className = errors.length ? 'message error' : 'message success';
  fileInput.value = '';
  await loadFiles();
}

fileInput.addEventListener('change', () => uploadFiles([...fileInput.files]));
document.querySelector('#refresh-button').addEventListener('click', loadFiles);
searchInput.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadFiles, 160);
});
document.addEventListener('keydown', (event) => {
  if (event.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
    event.preventDefault();
    searchInput.focus();
  }
});
for (const eventName of ['dragenter', 'dragover']) dropZone.addEventListener(eventName, (event) => { event.preventDefault(); dropZone.classList.add('dragging'); });
for (const eventName of ['dragleave', 'drop']) dropZone.addEventListener(eventName, (event) => { event.preventDefault(); dropZone.classList.remove('dragging'); });
dropZone.addEventListener('drop', (event) => uploadFiles([...event.dataTransfer.files]));
loadFiles();
