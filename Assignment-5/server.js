const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');

const app = express();
const PORT = process.env.PORT || 3001;
const FILES_DIR = path.join(__dirname, 'files');
const MAX_FILE_SIZE = 100 * 1024 * 1024;

// Allow browser clients hosted on another local development port to use the API.
app.use((req, res, next) => {
  const origin = req.get('Origin');
  if (origin && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

function safeName(value) {
  let name = value || '';
  name = path.basename(name.trim());
  if (!name || name === '.' || name === '..' || /[<>:"/\\|?*\x00-\x1f]/.test(name)) return null;
  return name;
}

async function listFiles() {
  await fs.mkdir(FILES_DIR, { recursive: true });
  const entries = await fs.readdir(FILES_DIR, { withFileTypes: true });
  const files = await Promise.all(entries.filter((entry) => entry.isFile()).map(async (entry) => {
    const info = await fs.stat(path.join(FILES_DIR, entry.name));
    return { name: entry.name, size: info.size, modified: info.mtime.toISOString() };
  }));
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

app.get('/api/files', async (req, res, next) => {
  try {
    const query = String(req.query.search || '').trim().toLocaleLowerCase();
    res.json((await listFiles()).filter((file) => file.name.toLocaleLowerCase().includes(query)));
  } catch (error) { next(error); }
});

app.put('/api/files/:name', express.raw({ type: 'application/octet-stream', limit: MAX_FILE_SIZE }), async (req, res, next) => {
  try {
    const name = safeName(req.params.name);
    if (!name) return res.status(400).json({ message: 'That filename is not allowed.' });
    if (!Buffer.isBuffer(req.body)) return res.status(400).json({ message: 'No file data was received.' });
    await fs.mkdir(FILES_DIR, { recursive: true });
    await fs.writeFile(path.join(FILES_DIR, name), req.body, { flag: 'wx' });
    res.status(201).json({ name, size: req.body.length });
  } catch (error) {
    if (error.code === 'EEXIST') return res.status(409).json({ message: 'A file with that name already exists.' });
    next(error);
  }
});

app.get('/api/files/:name/download', async (req, res, next) => {
  try {
    const name = safeName(req.params.name);
    if (!name) return res.status(400).json({ message: 'That filename is not allowed.' });
    const filePath = path.join(FILES_DIR, name);
    await fs.access(filePath);
    res.download(filePath, name);
  } catch (error) {
    if (error.code === 'ENOENT') return res.status(404).json({ message: 'File not found.' });
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  const status = error.status === 413 ? 413 : 500;
  res.status(status).json({ message: status === 413 ? 'Files must be 100 MB or smaller.' : 'The server could not complete that request.' });
});

app.listen(PORT, () => console.log(`Local File Library is running at http://localhost:${PORT}`));
