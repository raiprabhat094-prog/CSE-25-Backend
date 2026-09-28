const form = document.querySelector('#request-form');
const requestList = document.querySelector('#request-list');
const requestCount = document.querySelector('#request-count');
const formMessage = document.querySelector('#form-message');
const submitButton = document.querySelector('#submit-button');
const cancelEditButton = document.querySelector('#cancel-edit');
let editingId = null;
let requests = [];

document.querySelector('#year').textContent = new Date().getFullYear();

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Request failed. Please try again.');
  return data;
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function renderRequests() {
  requestCount.textContent = String(requests.length);
  requestList.replaceChildren();
  if (requests.length === 0) {
    const empty = makeElement('div', 'empty-state');
    empty.append(makeElement('span', 'empty-icon', '✳'));
    empty.append(makeElement('strong', '', 'Nothing to report yet'));
    empty.append(makeElement('p', '', 'Your campus requests will show up here.'));
    requestList.append(empty);
    return;
  }

  for (const request of requests) {
    const card = makeElement('article', 'request-card');
    const top = makeElement('div', 'request-card-top');
    top.append(makeElement('span', 'category-label', request.category));
    top.append(makeElement('span', `priority priority-${request.priority.toLowerCase()}`, `${request.priority} priority`));
    card.append(top);
    card.append(makeElement('h3', '', request.studentName));
    card.append(makeElement('p', 'request-description', request.description));
    const meta = makeElement('div', 'request-meta');
    const details = makeElement('span');
    details.append(makeElement('strong', '', request.email));
    details.append(document.createTextNode(` · ${new Date(request.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`));
    meta.append(details);
    const actions = makeElement('div', 'card-actions');
    const edit = makeElement('button', 'text-button', 'Edit');
    edit.type = 'button';
    edit.setAttribute('aria-label', `Edit request from ${request.studentName}`);
    edit.addEventListener('click', () => startEditing(request));
    const remove = makeElement('button', 'text-button delete', 'Delete');
    remove.type = 'button';
    remove.setAttribute('aria-label', `Delete request from ${request.studentName}`);
    remove.addEventListener('click', () => deleteRequest(request.id));
    actions.append(edit, remove);
    meta.append(actions);
    card.append(meta);
    requestList.append(card);
  }
}

async function loadRequests() {
  try {
    requests = await api('/api/requests');
    renderRequests();
  } catch (error) {
    requestList.replaceChildren(makeElement('div', 'empty-state', error.message));
  }
}

function showMessage(message, success = false) {
  formMessage.textContent = message;
  formMessage.classList.toggle('success', success);
}

function resetForm() {
  form.reset();
  editingId = null;
  document.querySelector('#form-title').textContent = 'Send a request';
  submitButton.innerHTML = 'Send request <span aria-hidden="true">→</span>';
  cancelEditButton.classList.add('hidden');
  showMessage('');
}

function startEditing(request) {
  editingId = request.id;
  for (const field of ['studentName', 'email', 'category', 'priority', 'description']) {
    form.elements[field].value = request[field];
  }
  document.querySelector('#form-title').textContent = 'Update your request';
  submitButton.innerHTML = 'Save changes <span aria-hidden="true">→</span>';
  cancelEditButton.classList.remove('hidden');
  showMessage('Editing this request.');
  form.elements.studentName.focus();
  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

cancelEditButton.addEventListener('click', resetForm);

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const requestData = Object.fromEntries(new FormData(form).entries());
  const isEditing = editingId !== null;
  submitButton.disabled = true;
  showMessage('Saving your request…');
  try {
    await api(editingId ? `/api/requests/${editingId}` : '/api/requests', {
      method: editingId ? 'PUT' : 'POST',
      body: JSON.stringify(requestData),
    });
    resetForm();
    showMessage(isEditing ? 'Request updated.' : 'Request sent. Thanks for letting us know!', true);
    await loadRequests();
  } catch (error) {
    showMessage(error.message);
  } finally {
    submitButton.disabled = false;
  }
});

async function deleteRequest(id) {
  if (!window.confirm('Delete this campus request?')) return;
  try {
    await api(`/api/requests/${id}`, { method: 'DELETE' });
    if (editingId === id) resetForm();
    await loadRequests();
  } catch (error) {
    showMessage(error.message);
  }
}

loadRequests();
