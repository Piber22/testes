/* ============================================================
   ui.js — Renderização de listas, cards, estatísticas e modais
   ============================================================ */

let currentDate   = new Date();
let currentFilter = 'all';
let currentTeam   = 'all'; // 'all' ou nome exato da equipe

// ── Equipes disponíveis ───────────────────────────────────────

function getAvailableTeams() {
  const teams = new Set();
  allActivities.forEach(a => {
    const t = (a['Encarregada'] || a['ENCARREGADA'] || '').trim();
    if (t) teams.add(t);
  });
  return Array.from(teams).sort();
}

function renderTeamFilter() {
  const wrap = document.getElementById('teamFilterWrap');
  if (!wrap) return;

  const teams = getAvailableTeams();
  if (teams.length <= 1) {
    wrap.classList.add('hidden');
    return;
  }

  wrap.classList.remove('hidden');
  const select = document.getElementById('teamSelect');
  // Preservar seleção atual se ainda válida
  const prev = currentTeam;
  select.innerHTML = '<option value="all">Todas as equipes</option>'
    + teams.map(t => `<option value="${t}" ${t === prev ? 'selected' : ''}>${t}</option>`).join('');
  currentTeam = select.value;
}

// ── Loader ────────────────────────────────────────────────────

function showLoader(show) {
  document.getElementById('loader').classList.toggle('hidden', !show);
  document.getElementById('activityList').classList.toggle('hidden', show);
  if (show) document.getElementById('emptyState').classList.add('hidden');
}

// ── Header / Estatísticas ─────────────────────────────────────

function updateHeader(forDay) {
  const { weekday, full } = formatDateDisplay(currentDate);
  document.getElementById('dateWeekday').textContent = weekday;
  document.getElementById('dateFull').textContent    = full;

  const done    = forDay.filter(a => isCompleted(a)).length;
  const total   = forDay.length;
  const pending = total - done;
  const pct     = total ? ((done / total) * 100).toFixed(1) : 0;

  document.getElementById('statTotal').textContent   = total;
  document.getElementById('statDone').textContent    = done;
  document.getElementById('statPercent').textContent = pct + '%';
  document.getElementById('progressBar').style.width = pct + '%';

  // Botão "Hoje"
  document.getElementById('btnToday').classList.toggle('hidden', isToday(currentDate));
}

// ── Lista de Atividades ───────────────────────────────────────

function renderList() {
  const list  = document.getElementById('activityList');
  const empty = document.getElementById('emptyState');

  renderTeamFilter();

  const forDay = getActivitiesForDate(currentDate);
  updateHeader(forDay);

  let activities = forDay;
  // Filtro de equipe
  if (currentTeam !== 'all') {
    activities = activities.filter(a => {
      const t = (a['Encarregada'] || a['ENCARREGADA'] || '').trim();
      return t === currentTeam;
    });
  }
  if (currentFilter === 'done')    activities = activities.filter(a => isCompleted(a));
  if (currentFilter === 'pending') activities = activities.filter(a => !isCompleted(a));

  list.innerHTML = '';

  if (activities.length === 0) {
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  activities.forEach((a, i) => {
    const done       = isCompleted(a);
    const completion = getCompletion(a.rowIndex);
    const sheetData  = getSheetExecutionData(a);

    // Horário: local tem precedência, senão usa dado da planilha
    let execDate = '';
    if (done) {
      if (completion) {
        execDate = formatDatetime(completion.completedAt);
      } else if (sheetData.execucao || sheetData.horario) {
        execDate = [sheetData.execucao, sheetData.horario].filter(Boolean).join(' às ');
      }
    }
    const signer = completion?.signerName || sheetData.assinante || '';

    const li = document.createElement('li');
    li.className = 'activity-card' + (done ? ' is-done' : '');
    li.style.animationDelay = (i * 0.04) + 's';

    li.innerHTML = `
      <div class="card-inner">
        <div class="card-status-dot"></div>
        <div class="card-body">
          <div class="card-date">${a['DATA'] || ''}</div>
          <div class="card-name">${a['Terminal'] || a['TERMINAL'] || 'Atividade'}</div>
          ${(a['Encarregada'] || a['ENCARREGADA'])
            ? `<div class="card-team">${a['Encarregada'] || a['ENCARREGADA']}</div>` : ''}
        </div>
        <div class="card-action">
          <div class="toggle-container">
            <label class="toggle-switch">
              <input type="checkbox"
                     ${done ? 'checked' : ''}
                     data-row="${a.rowIndex}"
                     data-activity-id="${a['ID'] || i}"
                     ${done ? 'disabled' : ''} />
              <span class="slider"></span>
            </label>
            <div class="toggle-label ${done ? 'feito' : ''}">${done ? 'Feito' : 'Pendente'}</div>
          </div>
          ${done ? `<button class="btn-details-link" data-row="${a.rowIndex}">ver detalhes</button>` : ''}
        </div>
      </div>
      ${done && execDate ? `
        <div class="card-done-footer">
          <span class="done-date">⏱ ${execDate}</span>
          ${signer ? `<span class="done-signer">✍ ${signer}</span>` : ''}
        </div>` : ''}
    `;
    list.appendChild(li);
  });

  // Evento: toggle para marcar atividade
  list.querySelectorAll('.toggle-switch input').forEach(chk => {
    chk.addEventListener('change', () => {
      const rowIndex     = Number(chk.dataset.row);
      const activityData = activities.find(a => a.rowIndex === rowIndex);
      if (activityData) openValidationModal(activityData);
      else chk.checked = false; // segurança
    });
  });

  // Evento: ver detalhes
  list.querySelectorAll('.btn-details-link').forEach(btn => {
    btn.addEventListener('click', () => openDetailModal(Number(btn.dataset.row)));
  });
}

// ── Mudança de data ───────────────────────────────────────────

function changeDate(delta) {
  currentDate = new Date(currentDate);
  currentDate.setDate(currentDate.getDate() + delta);
  renderList();
}

// ── Modal de Detalhes ─────────────────────────────────────────

function openDetailModal(rowIndex) {
  const activity = allActivities.find(a => a.rowIndex === rowIndex);
  const comp     = getCompletion(rowIndex);
  if (!activity) return;

  const name      = activity['Terminal'] || activity['TERMINAL'] || 'Atividade';
  const team      = activity['Encarregada'] || activity['ENCARREGADA'] || '—';
  const date      = activity['DATA'] || '—';
  const done      = isCompleted(activity);
  const sheetData = getSheetExecutionData(activity);

  // Dados de execução: localStorage tem precedência, senão vem da planilha
  const execDisplay = comp
    ? formatDatetime(comp.completedAt)
    : [sheetData.execucao, sheetData.horario].filter(Boolean).join(' às ') || '—';
  const signerDisplay = comp?.signerName  || sheetData.assinante || '';
  const corenDisplay  = comp?.signerCoren || sheetData.coren     || '';

  const photosHTML = comp?.photos?.length
    ? `<div class="detail-row">
         <span class="detail-label">Fotos</span>
         <div class="detail-photos">${comp.photos.map(p => `<img src="${p}" />`).join('')}</div>
       </div>` : '';

  const sigHTML = comp?.signature
    ? `<div class="detail-row">
         <span class="detail-label">Assinatura</span>
         <img src="${comp.signature}" class="detail-sig-canvas" />
       </div>` : '';

  document.getElementById('detailContent').innerHTML = `
    <div class="detail-row">
      <span class="detail-label">Atividade</span>
      <span class="detail-value">${name}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Responsável</span>
      <span class="detail-value">${team}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Data programada</span>
      <span class="detail-value">${date}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Situação</span>
      <span class="status-badge ${done ? 'done' : 'pending'}">${done ? 'Feita' : 'Pendente'}</span>
    </div>
    ${done ? `
    <div class="detail-row">
      <span class="detail-label">Executada em</span>
      <span class="detail-value">${execDisplay}</span>
    </div>
    ${signerDisplay ? `
    <div class="detail-row">
      <span class="detail-label">Assinado por</span>
      <span class="detail-value">${signerDisplay}</span>
    </div>` : ''}
    ${corenDisplay ? `
    <div class="detail-row">
      <span class="detail-label">COREN</span>
      <span class="detail-value">${corenDisplay}</span>
    </div>` : ''}
    ${photosHTML}
    ${sigHTML}` : ''}
  `;

  document.getElementById('modalDetail').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeDetailModal() {
  document.getElementById('modalDetail').classList.add('hidden');
  document.body.style.overflow = '';
}

// ── Botões de link de detalhes (estilo) ───────────────────────
// Adicionado via CSS inline para não criar arquivo extra
(function injectBtnDetailsStyle() {
  const s = document.createElement('style');
  s.textContent = `
    .btn-details-link {
      background: none; border: none;
      color: var(--text-dim); font-family: var(--font);
      font-size: 10px; font-weight: 600; cursor: pointer;
      text-decoration: underline; text-underline-offset: 2px;
      padding: 0; letter-spacing: 0.3px;
    }
  `;
  document.head.appendChild(s);
})();