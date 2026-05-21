// admin_custom_routes.js — логика таба «Индивидуальные маршруты»
// Подключается в конце admin.html

// ─── Состояние ────────────────────────────────────────────────────
let _crEditId   = null;
let _crAssigned = [];  // массив логинов
let _crLevels   = [];  // [{title, tasks:[{name,xp}]}]

// ─── Заполняем select сотрудниками ────────────────────────────────
function populateCRAssignSelect() {
  const sel = document.getElementById('crAssignSelect');
  if (!sel) return;
  const users = Auth.getUsers();
  const EMPLOYEE_ROLES = ['producer','sales','marketing'];
  const employees = Object.entries(users)
    .filter(([,u]) => EMPLOYEE_ROLES.includes(u.role))
    .sort((a,b) => a[1].fio.localeCompare(b[1].fio));
  sel.innerHTML = '<option value="">— выбери сотрудника —</option>' +
    employees.map(([login,u]) =>
      `<option value="${login}">${u.fio} (${ROLE_NAMES[u.role]||u.role})</option>`
    ).join('');
}

function crAddAssignee() {
  const sel = document.getElementById('crAssignSelect');
  const login = sel.value;
  if (!login || _crAssigned.includes(login)) return;
  _crAssigned.push(login);
  renderCRAssigned();
  sel.value = '';
}

function crRemoveAssignee(login) {
  _crAssigned = _crAssigned.filter(l => l !== login);
  renderCRAssigned();
}

function renderCRAssigned() {
  const users = Auth.getUsers();
  document.getElementById('crAssignedList').innerHTML = _crAssigned.map(login => {
    const fio = users[login] ? users[login].fio : login;
    return `<span class="cr-assigned-badge">${fio}<button onclick="crRemoveAssignee('${login}')" title="Убрать">✕</button></span>`;
  }).join('');
}

// ─── Уровни и задачи ──────────────────────────────────────────────
function crAddLevel() {
  _crLevels.push({ title: 'Уровень ' + (_crLevels.length + 1), tasks: [{ name: '', xp: 10 }] });
  renderCRLevels();
}

function crAddTask(li) {
  _crLevels[li].tasks.push({ name: '', xp: 10 });
  renderCRLevels();
}

function crRemoveTask(li, ti) {
  _crLevels[li].tasks.splice(ti, 1);
  renderCRLevels();
}

function crRemoveLevel(li) {
  _crLevels.splice(li, 1);
  renderCRLevels();
}

function renderCRLevels() {
  const container = document.getElementById('crLevels');
  if (!container) return;
  if (!_crLevels.length) {
    container.innerHTML = '<div style="color:#aaa;font-size:.85rem;padding:8px 0">Нажми «+ Добавить уровень» чтобы начать</div>';
    return;
  }
  container.innerHTML = _crLevels.map((level, li) => `
    <div class="cr-level-block">
      <div class="cr-level-title">
        <input type="text" value="${escHtml(level.title)}" oninput="_crLevels[${li}].title=this.value"
          style="flex:1;padding:6px 10px;border:1.5px solid #c7d7f0;border-radius:8px;font-size:.85rem;font-family:inherit;font-weight:700;color:#0a4d8c;outline:none;background:#fff">
        <button class="btn btn-danger btn-sm" onclick="crRemoveLevel(${li})">✕ Убрать уровень</button>
      </div>
      ${level.tasks.map((task, ti) => `
        <div class="cr-task-row">
          <input type="text" placeholder="Название задачи *" value="${escHtml(task.name)}"
            oninput="_crLevels[${li}].tasks[${ti}].name=this.value">
          <input type="number" class="cr-task-xp" placeholder="XP" value="${task.xp}" min="1" max="999"
            oninput="_crLevels[${li}].tasks[${ti}].xp=Number(this.value)||0">
          <button class="btn btn-danger btn-sm" onclick="crRemoveTask(${li},${ti})" title="Удалить задачу">✕</button>
        </div>
      `).join('')}
      <button class="btn btn-sm" style="background:#e0f2fe;color:#0369a1;border:1px solid #7dd3fc;margin-top:4px" onclick="crAddTask(${li})">+ задача</button>
    </div>
  `).join('');
}

// ─── Сохранение ───────────────────────────────────────────────────
async function saveCR() {
  const title = document.getElementById('crTitle').value.trim();
  if (!title) { showAlert('⚠️ Укажи название маршрута', true); return; }
  if (!_crAssigned.length) { showAlert('⚠️ Назначь хотя бы одного сотрудника', true); return; }
  if (!_crLevels.length) { showAlert('⚠️ Добавь хотя бы один уровень', true); return; }
  const emptyTask = _crLevels.some(l => l.tasks.some(t => !t.name.trim()));
  if (emptyTask) { showAlert('⚠️ Заполни названия всех задач', true); return; }

  const obj = {
    id:        _crEditId || (Date.now().toString(36) + Math.random().toString(36).slice(2, 5)),
    title,
    icon:      document.getElementById('crIcon').value.trim() || '🎯',
    role:      document.getElementById('crRole').value,
    subtitle:  document.getElementById('crSubtitle').value.trim(),
    assignedTo: [..._crAssigned],
    levels:    JSON.parse(JSON.stringify(_crLevels)),
    updatedAt: Date.now()
  };

  const btn = document.getElementById('crSaveBtn');
  btn.textContent = '⏳ Сохраняю…'; btn.disabled = true;

  await loadTQ();
  if (!Array.isArray(_tqData.customRoutes)) _tqData.customRoutes = [];

  if (_crEditId) {
    const idx = _tqData.customRoutes.findIndex(r => r.id === _crEditId);
    if (idx !== -1) _tqData.customRoutes[idx] = { ..._tqData.customRoutes[idx], ...obj };
    else _tqData.customRoutes.push({ ...obj, createdAt: Date.now() });
  } else {
    _tqData.customRoutes.push({ ...obj, createdAt: Date.now() });
  }

  // Записываем customRouteId в ao_users для назначенных сотрудников
  const users = Auth.getUsers();
  _crAssigned.forEach(login => {
    if (users[login]) users[login].customRouteId = obj.id;
  });
  // Снимаем назначение если сотрудник был в старом маршруте, но убран из нового
  if (_crEditId) {
    const old = (_tqData.customRoutes.find(r => r.id === _crEditId) || {}).assignedTo || [];
    old.forEach(login => {
      if (!_crAssigned.includes(login) && users[login] && users[login].customRouteId === _crEditId) {
        delete users[login].customRouteId;
      }
    });
  }
  Auth.saveUsers(users);

  await saveTQ();
  await DB.syncNow();

  btn.textContent = '💾 Сохранить маршрут'; btn.disabled = false;
  showAlert('✅ Индивидуальный маршрут сохранён!');
  resetCRForm();
  renderCRTable();
}

// ─── Редактирование ───────────────────────────────────────────────
function editCR(id) {
  const r = (_tqData.customRoutes || []).find(x => x.id === id);
  if (!r) return;
  _crEditId = id;
  document.getElementById('crTitle').value    = r.title || '';
  document.getElementById('crIcon').value     = r.icon  || '';
  document.getElementById('crRole').value     = r.role  || 'producer';
  document.getElementById('crSubtitle').value = r.subtitle || '';
  _crAssigned = [...(r.assignedTo || [])];
  _crLevels   = JSON.parse(JSON.stringify(r.levels || []));
  renderCRAssigned();
  renderCRLevels();
  document.getElementById('crSaveBtn').textContent = '💾 Обновить маршрут';
  switchTab('custom');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Удаление ─────────────────────────────────────────────────────
async function deleteCR(id) {
  if (!confirm('Удалить индивидуальный маршрут?')) return;
  await loadTQ();
  const removed = (_tqData.customRoutes || []).find(r => r.id === id);
  _tqData.customRoutes = (_tqData.customRoutes || []).filter(r => r.id !== id);
  // Снимаем назначение у сотрудников
  if (removed && removed.assignedTo) {
    const users = Auth.getUsers();
    removed.assignedTo.forEach(login => {
      if (users[login] && users[login].customRouteId === id) delete users[login].customRouteId;
    });
    Auth.saveUsers(users);
  }
  await saveTQ();
  await DB.syncNow();
  showAlert('🗑️ Маршрут удалён');
  renderCRTable();
}

// ─── Сброс формы ──────────────────────────────────────────────────
function resetCRForm() {
  _crEditId = null;
  _crAssigned = [];
  _crLevels   = [];
  ['crTitle','crIcon','crSubtitle'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('crRole').value = 'producer';
  document.getElementById('crAssignSelect').value = '';
  renderCRAssigned();
  renderCRLevels();
  document.getElementById('crSaveBtn').textContent = '💾 Сохранить маршрут';
}

// ─── Таблица маршрутов ────────────────────────────────────────────
function renderCRTable() {
  const tbody  = document.getElementById('crTable');
  const routes = _tqData.customRoutes || [];
  const users  = Auth.getUsers();
  document.getElementById('crCount').textContent = `(${routes.length})`;
  if (!routes.length) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="5">Индивидуальных маршрутов пока нет</td></tr>';
    return;
  }
  tbody.innerHTML = [...routes].reverse().map(r => {
    const assignedNames = (r.assignedTo || []).map(login =>
      users[login] ? users[login].fio : login
    ).join(', ') || '—';
    const taskCount = (r.levels || []).reduce((s, l) => s + (l.tasks || []).length, 0);
    return `<tr>
      <td><div class="kb-article-title">${r.icon||'🎯'} ${escHtml(r.title)}</div>
          <div class="kb-article-sub">${escHtml(r.subtitle||'')}</div></td>
      <td><span class="kb-cat-badge">${ROLE_NAMES[r.role]||r.role||'—'}</span></td>
      <td style="font-size:.82rem;color:#555">${escHtml(assignedNames)}</td>
      <td style="font-size:.82rem;color:#555">${(r.levels||[]).length} ур. / ${taskCount} задач</td>
      <td style="display:flex;gap:6px">
        <button class="btn btn-sm" style="background:#e0f2fe;color:#0369a1;border:1px solid #7dd3fc" onclick="editCR('${r.id}')">✏️ Ред.</button>
        <button class="btn btn-danger btn-sm" onclick="deleteCR('${r.id}')">Удалить</button>
      </td>
    </tr>`;
  }).join('');
}
