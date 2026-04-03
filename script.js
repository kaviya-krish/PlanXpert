/* ═══════════════════════════════════════
   VOYARA — SCRIPT.JS
   ═══════════════════════════════════════ */

// ── STATE ──────────────────────────────
const state = {
  destinations: [],
  expenses: [],
  days: [],
  activeDay: null,
  activeVibe: '🏝 Beach',
  expType: 'planned',
};

// ── UTILS ──────────────────────────────
const uid = () => '_' + Math.random().toString(36).slice(2, 9);

function daysBetween(a, b) {
  if (!a || !b) return 0;
  return Math.max(0, Math.round((new Date(b) - new Date(a)) / 86400000));
}

function fmtDate(d) {
  if (!d) return '';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}

function fmtINR(n) {
  return '₹' + Number(n || 0).toLocaleString('en-IN');
}

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

// ── TAB SWITCHING ──────────────────────
function switchTab(tab) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(s => s.classList.remove('active'));
  document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
  document.getElementById(`tab-${tab}`).classList.add('active');
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ── VIBE CHIPS ─────────────────────────
document.querySelectorAll('.vchip').forEach(chip => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.vchip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    state.activeVibe = chip.dataset.vibe;
  });
});

// ── TYPE TOGGLE ────────────────────────
document.querySelectorAll('.tog').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tog').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.expType = btn.dataset.type;
  });
});

// ── DESTINATIONS ───────────────────────
document.getElementById('addDestBtn').addEventListener('click', addDestination);

function addDestination() {
  const city = document.getElementById('destCity').value.trim();
  if (!city) { toast('⚠ Please enter a city name'); return; }

  const arrival   = document.getElementById('destArrival').value;
  const departure = document.getElementById('destDeparture').value;
  const notes     = document.getElementById('destNotes').value.trim();

  const dest = {
    id: uid(), city, arrival, departure,
    vibe: state.activeVibe, notes,
    duration: daysBetween(arrival, departure),
  };

  state.destinations.push(dest);
  renderDestinations();
  syncDestDrop();
  generateDays();
  updateStats();
  toast('✦ Destination added!');

  document.getElementById('destCity').value = '';
  document.getElementById('destArrival').value = '';
  document.getElementById('destDeparture').value = '';
  document.getElementById('destNotes').value = '';
}

function renderDestinations() {
  const grid = document.getElementById('destinationsGrid');

  if (!state.destinations.length) {
    grid.innerHTML = `
      <div class="empty-hint" style="grid-column:1/-1;min-height:200px;justify-content:center;">
        <span>🌍</span><p>No destinations yet — add your first!</p>
      </div>`;
    return;
  }

  grid.innerHTML = state.destinations.map(d => `
    <div class="dcard" id="dc-${d.id}">
      <div class="dcard-vibe">${d.vibe.split(' ')[0]}</div>
      <div class="dcard-city">${d.city}</div>
      <div class="dcard-dates">📅 ${d.arrival ? fmtDate(d.arrival) + ' → ' + fmtDate(d.departure) : 'Dates not set'}</div>
      ${d.duration ? `<div class="dcard-badge">${d.duration} nights</div>` : ''}
      <div class="dcard-notes">${d.notes || 'No notes added.'}</div>
      <div class="dcard-actions">
        <button class="dcard-btn edit" onclick="editDest('${d.id}')">✏ Edit</button>
        <button class="dcard-btn" onclick="removeDest('${d.id}')">✕ Remove</button>
      </div>
    </div>
  `).join('');
}

function removeDest(id) {
  state.destinations = state.destinations.filter(d => d.id !== id);
  state.days = state.days.filter(d => d.destId !== id);
  renderDestinations();
  syncDestDrop();
  updateStats();
  renderDaySelector();
  renderItinerary();
  toast('Destination removed');
}

function editDest(id) {
  const d = state.destinations.find(x => x.id === id);
  if (!d) return;
  document.getElementById('destCity').value = d.city;
  document.getElementById('destArrival').value = d.arrival;
  document.getElementById('destDeparture').value = d.departure;
  document.getElementById('destNotes').value = d.notes;
  removeDest(id);
  switchTab('destinations');
  document.getElementById('destCity').focus();
}

function updateStats() {
  const dests  = state.destinations.length;
  const nights = state.destinations.reduce((s, d) => s + (d.duration || 0), 0);
  const budget = state.expenses
    .filter(e => e.type === 'planned')
    .reduce((s, e) => s + e.amount, 0);

  document.getElementById('statDests').textContent  = dests;
  document.getElementById('statDays').textContent   = nights || 0;
  document.getElementById('statBudget').textContent = fmtINR(budget);
}

// ── BUDGET ─────────────────────────────
document.getElementById('addExpenseBtn').addEventListener('click', addExpense);

function syncDestDrop() {
  const sel = document.getElementById('expDest');
  const cur = sel.value;
  sel.innerHTML = `<option value="General">General</option>` +
    state.destinations.map(d => `<option value="${d.id}">${d.city}</option>`).join('');
  if ([...sel.options].some(o => o.value === cur)) sel.value = cur;
}

function addExpense() {
  const desc   = document.getElementById('expDesc').value.trim();
  const amount = parseFloat(document.getElementById('expAmount').value);
  if (!desc)           { toast('⚠ Enter a description'); return; }
  if (!amount || amount <= 0) { toast('⚠ Enter a valid amount'); return; }

  state.expenses.push({
    id: uid(), desc, amount,
    category: document.getElementById('expCategory').value,
    destId: document.getElementById('expDest').value,
    type: state.expType,
  });

  renderExpenses();
  updateBudgetSummary();
  drawChart();
  updateStats();
  toast('💸 Expense added!');

  document.getElementById('expDesc').value = '';
  document.getElementById('expAmount').value = '';
}

function renderExpenses() {
  const list = document.getElementById('expensesList');
  if (!state.expenses.length) {
    list.innerHTML = `<div class="empty-hint"><span>💸</span><p>No expenses yet</p></div>`;
    return;
  }
  list.innerHTML = state.expenses.map(e => {
    const icon = e.category.split(' ')[0];
    const dest = state.destinations.find(d => d.id === e.destId);
    return `
      <div class="exp-row" id="er-${e.id}">
        <div class="exp-ico">${icon}</div>
        <div class="exp-info">
          <div class="exp-name">${e.desc}</div>
          <div class="exp-meta">
            <span>${e.category.replace(/^\S+\s/, '')}</span>
            ${dest ? `<span>· ${dest.city}</span>` : ''}
            <span class="exp-badge badge-${e.type}">${e.type}</span>
          </div>
        </div>
        <div class="exp-amt">${fmtINR(e.amount)}</div>
        <button class="exp-del" onclick="removeExpense('${e.id}')">✕</button>
      </div>`;
  }).join('');
}

function removeExpense(id) {
  state.expenses = state.expenses.filter(e => e.id !== id);
  renderExpenses();
  updateBudgetSummary();
  drawChart();
  updateStats();
  toast('Expense removed');
}

function updateBudgetSummary() {
  const planned = state.expenses.filter(e => e.type === 'planned').reduce((s,e)=>s+e.amount,0);
  const actual  = state.expenses.filter(e => e.type === 'actual').reduce((s,e)=>s+e.amount,0);
  const balance = planned - actual;

  document.getElementById('totalPlanned').textContent = fmtINR(planned);
  document.getElementById('totalActual').textContent  = fmtINR(actual);

  const balEl = document.getElementById('totalBalance');
  balEl.textContent = (balance >= 0 ? '+' : '') + fmtINR(balance);
  balEl.style.color = balance >= 0 ? 'var(--mint)' : 'var(--coral)';
}

// ── DONUT CHART ────────────────────────
const COLORS = ['#00d4c8','#7c8fff','#ff6b6b','#4ecca3','#ffbe5c','#a78bfa','#f472b6','#34d399'];

function drawChart() {
  const canvas = document.getElementById('budgetChart');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  const cats = {};
  state.expenses.forEach(e => { cats[e.category] = (cats[e.category] || 0) + e.amount; });
  const entries = Object.entries(cats);

  if (!entries.length) {
    ctx.beginPath();
    ctx.arc(W/2, H/2, W/2 - 14, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fill();
    ctx.fillStyle = '#2e3c5a';
    ctx.font = '13px Outfit';
    ctx.textAlign = 'center';
    ctx.fillText('No data', W/2, H/2 + 5);
    document.getElementById('chartLegend').innerHTML = '';
    return;
  }

  const total = entries.reduce((s,[,v])=>s+v,0);
  let angle = -Math.PI / 2;
  const cx = W/2, cy = H/2, R = W/2 - 14, inner = W/2 - 44;

  entries.forEach(([,val], i) => {
    const slice = (val / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, R, angle, angle + slice);
    ctx.closePath();
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.fill();
    angle += slice;
  });

  // Donut hole
  ctx.beginPath();
  ctx.arc(cx, cy, inner, 0, Math.PI*2);
  ctx.fillStyle = '#0d1425';
  ctx.fill();

  // Center label
  ctx.fillStyle = '#00d4c8';
  ctx.font = 'bold 14px Syne';
  ctx.textAlign = 'center';
  ctx.fillText(fmtINR(total), cx, cy - 4);
  ctx.fillStyle = '#6b7fa8';
  ctx.font = '10px Outfit';
  ctx.fillText('TOTAL', cx, cy + 13);

  // Legend
  document.getElementById('chartLegend').innerHTML = entries.map(([cat, val], i) => `
    <div class="leg-item">
      <div class="leg-dot" style="background:${COLORS[i % COLORS.length]}"></div>
      <span>${cat} — ${fmtINR(val)}</span>
    </div>
  `).join('');
}

// ── ITINERARY ──────────────────────────
function generateDays() {
  const existingIds = new Set(state.days.map(d => d.id));

  state.destinations.forEach(dest => {
    if (!dest.arrival || !dest.departure) return;
    let curr = new Date(dest.arrival + 'T00:00:00');
    const end = new Date(dest.departure + 'T00:00:00');
    let n = 1;

    while (curr < end) {
      const dateStr = curr.toISOString().slice(0,10);
      const dayId   = dest.id + '_' + dateStr;
      if (!existingIds.has(dayId)) {
        state.days.push({ id: dayId, destId: dest.id, date: dateStr, activities: [] });
        existingIds.add(dayId);
      }
      curr.setDate(curr.getDate() + 1);
      n++;
    }
  });

  state.days.sort((a,b) => a.date.localeCompare(b.date));
  if (!state.activeDay && state.days.length) state.activeDay = state.days[0].id;

  renderDaySelector();
  renderItinerary();
}

document.getElementById('addDayBtn').addEventListener('click', () => {
  const lastDay = state.days[state.days.length - 1];
  const destId  = lastDay?.destId || state.destinations[0]?.id;
  if (!destId) { toast('⚠ Add a destination first'); return; }

  const dayId = uid();
  state.days.push({ id: dayId, destId, date: '', activities: [] });
  state.activeDay = dayId;
  renderDaySelector();
  renderItinerary();
  toast('📅 Day added!');
});

function renderDaySelector() {
  const sel = document.getElementById('daySelector');
  if (!state.days.length) {
    sel.innerHTML = `<span style="color:var(--txt-dim);font-size:0.82rem;">No days yet</span>`;
    return;
  }
  sel.innerHTML = state.days.map((d, i) => `
    <button class="day-tab ${d.id === state.activeDay ? 'active' : ''}"
            onclick="setActiveDay('${d.id}')">Day ${i + 1}</button>
  `).join('');
}

function setActiveDay(id) {
  state.activeDay = id;
  renderDaySelector();
  renderItinerary();
}

function renderItinerary() {
  const body = document.getElementById('itineraryContent');
  const form = document.getElementById('activityForm');

  if (!state.days.length) {
    body.innerHTML = `
      <div class="big-empty">
        <span style="font-size:3rem">📍</span>
        <p>Add destinations with dates to auto-generate days</p>
        <button class="ghost-btn" onclick="switchTab('destinations')">Go to Destinations →</button>
      </div>`;
    form.style.display = 'none';
    return;
  }

  const day  = state.days.find(d => d.id === state.activeDay);
  if (!day) {
    body.innerHTML = `<div class="big-empty"><span>📌</span><p>Select a day</p></div>`;
    form.style.display = 'none';
    return;
  }

  const dest = state.destinations.find(d => d.id === day.destId);
  const idx  = state.days.indexOf(day);

  const activities = day.activities
    .slice()
    .sort((a, b) => a.time.localeCompare(b.time));

  const timelineHTML = activities.length
    ? `<div class="timeline">${activities.map(a => `
        <div class="tline-item">
          <div class="tline-dot"></div>
          <div class="act-card">
            <div class="act-time">${a.time}</div>
            <div class="act-type">${a.type.split(' ')[0]}</div>
            <div class="act-body">
              <div class="act-title">${a.title}</div>
              ${a.notes ? `<div class="act-notes">${a.notes}</div>` : ''}
            </div>
            ${a.duration ? `<div class="act-dur">${a.duration}h</div>` : ''}
            <button class="act-del" onclick="removeActivity('${day.id}','${a.id}')">✕</button>
          </div>
        </div>`).join('')}</div>`
    : `<div class="empty-hint" style="min-height:120px;justify-content:center;">
        <span>✨</span><p>No activities yet — add one below!</p>
      </div>`;

  body.innerHTML = `
    <div class="day-header-row">
      <div class="day-num-big">${String(idx + 1).padStart(2, '0')}</div>
      <div class="day-info">
        <h3>${dest ? dest.city : 'Custom Day'}</h3>
        <p>${day.date ? fmtDate(day.date) : 'No date set'}</p>
      </div>
    </div>
    ${timelineHTML}
  `;

  form.style.display = 'block';
}

document.getElementById('addActivityBtn').addEventListener('click', () => {
  const title    = document.getElementById('actTitle').value.trim();
  const time     = document.getElementById('actTime').value;
  const type     = document.getElementById('actType').value;
  const duration = parseFloat(document.getElementById('actDuration').value) || 0;
  const notes    = document.getElementById('actNotes').value.trim();

  if (!title) { toast('⚠ Enter an activity name'); return; }

  const day = state.days.find(d => d.id === state.activeDay);
  if (!day)  { toast('⚠ Select a day first'); return; }

  day.activities.push({ id: uid(), title, time, type, duration, notes });
  renderItinerary();
  toast('✦ Activity added!');

  document.getElementById('actTitle').value = '';
  document.getElementById('actNotes').value = '';
});

function removeActivity(dayId, actId) {
  const day = state.days.find(d => d.id === dayId);
  if (!day) return;
  day.activities = day.activities.filter(a => a.id !== actId);
  renderItinerary();
  toast('Activity removed');
}

// ── INIT ───────────────────────────────
renderDestinations();
syncDestDrop();
renderDaySelector();
renderItinerary();
updateBudgetSummary();
drawChart();
updateStats();