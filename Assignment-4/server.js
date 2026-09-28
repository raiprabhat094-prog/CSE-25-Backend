const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'requests.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

async function readRequests() {
  try {
    const contents = await fs.readFile(DATA_FILE, 'utf8');
    const requests = JSON.parse(contents);
    if (!Array.isArray(requests)) throw new Error('requests.json must contain an array');
    return requests;
  } catch (error) {
    if (error.code === 'ENOENT') {
      await fs.writeFile(DATA_FILE, '[]\n');
      return [];
    }
    throw error;
  }
}

async function writeRequests(requests) {
  await fs.writeFile(DATA_FILE, `${JSON.stringify(requests, null, 2)}\n`);
}

function validateRequest(body) {
  const fields = ['studentName', 'email', 'category', 'description', 'priority'];
  const request = Object.fromEntries(fields.map((field) => [
    field,
    typeof body[field] === 'string' ? body[field].trim() : '',
  ]));

  if (fields.some((field) => !request[field])) {
    return { error: 'Please complete every field.' };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.email)) {
    return { error: 'Enter a valid email address.' };
  }
  if (!['Low', 'Medium', 'High'].includes(request.priority)) {
    return { error: 'Priority must be Low, Medium, or High.' };
  }
  if (!['Facilities', 'IT Support', 'Campus Safety', 'Academics', 'Other'].includes(request.category)) {
    return { error: 'Choose a valid category.' };
  }
  return { request };
}

app.get('/api/requests', async (req, res, next) => {
  try {
    const requests = await readRequests();
    res.json(requests);
  } catch (error) {
    next(error);
  }
});

app.get('/api/requests/:id', async (req, res, next) => {
  try {
    const request = (await readRequests()).find((item) => item.id === Number(req.params.id));
    if (!request) return res.status(404).json({ message: 'Request not found.' });
    res.json(request);
  } catch (error) {
    next(error);
  }
});

app.post('/api/requests', async (req, res, next) => {
  try {
    const result = validateRequest(req.body || {});
    if (result.error) return res.status(400).json({ message: result.error });
    const requests = await readRequests();
    const newRequest = {
      id: requests.reduce((max, item) => Math.max(max, Number(item.id) || 0), 0) + 1,
      ...result.request,
      createdAt: new Date().toISOString(),
    };
    requests.unshift(newRequest);
    await writeRequests(requests);
    res.status(201).json(newRequest);
  } catch (error) {
    next(error);
  }
});

app.put('/api/requests/:id', async (req, res, next) => {
  try {
    const requests = await readRequests();
    const index = requests.findIndex((item) => item.id === Number(req.params.id));
    if (index === -1) return res.status(404).json({ message: 'Request not found.' });
    const result = validateRequest(req.body || {});
    if (result.error) return res.status(400).json({ message: result.error });
    requests[index] = { ...requests[index], ...result.request, updatedAt: new Date().toISOString() };
    await writeRequests(requests);
    res.json(requests[index]);
  } catch (error) {
    next(error);
  }
});

app.delete('/api/requests/:id', async (req, res, next) => {
  try {
    const requests = await readRequests();
    const index = requests.findIndex((item) => item.id === Number(req.params.id));
    if (index === -1) return res.status(404).json({ message: 'Request not found.' });
    const [deletedRequest] = requests.splice(index, 1);
    await writeRequests(requests);
    res.json({ message: 'Request deleted.', request: deletedRequest });
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ message: 'Something went wrong while saving requests.' });
});

app.listen(PORT, () => {
  console.log(`Campus Help Desk is running at http://localhost:${PORT}`);
});
