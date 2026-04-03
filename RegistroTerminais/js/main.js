/* ============================================================
   main.js — Inicialização do app e registro de event listeners
   Ponto de entrada: carregado por último no HTML
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ── Inicialização ───────────────────────────────────────────
  loadCompletions();
  fetchActivities();
  initCamera();

  // Auto-refresh a cada 5 minutos
  setInterval(fetchActivities, CONFIG.autoRefreshInterval);

  // ── Navegação de data ───────────────────────────────────────
  document.getElementById('btnPrevDay').addEventListener('click', () => changeDate(-1));
  document.getElementById('btnNextDay').addEventListener('click', () => changeDate(1));
  document.getElementById('btnToday').addEventListener('click', () => {
    currentDate = new Date();
    renderList();
  });

  // ── Atualizar manualmente ───────────────────────────────────
  document.getElementById('btnRefresh').addEventListener('click', fetchActivities);

  // ── Filtro de equipe ────────────────────────────────────────
  const teamSelect = document.getElementById('teamSelect');
  if (teamSelect) {
    teamSelect.addEventListener('change', () => {
      currentTeam = teamSelect.value;
      renderList();
    });
  }

  // ── Filtros (aba) ───────────────────────────────────────────
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentFilter = tab.dataset.filter;
      renderList();
    });
  });

  // ── Modal de validação ──────────────────────────────────────
  document.getElementById('btnCloseModal').addEventListener('click', closeValidationModal);
  document.getElementById('modalValidation').addEventListener('click', e => {
    if (e.target === document.getElementById('modalValidation')) closeValidationModal();
  });

  document.querySelectorAll('.val-tab').forEach(tab => {
    tab.addEventListener('click', () => setValTab(tab.dataset.val));
  });

  document.getElementById('btnClearSig').addEventListener('click', clearSignature);
  document.getElementById('btnConfirm').addEventListener('click', confirmCompletion);

  // ── Modal de detalhes ───────────────────────────────────────
  document.getElementById('btnCloseDetail').addEventListener('click', closeDetailModal);
  document.getElementById('modalDetail').addEventListener('click', e => {
    if (e.target === document.getElementById('modalDetail')) closeDetailModal();
  });

  // ── Swipe para fechar modais ────────────────────────────────
  let touchStartY = 0;

  ['modalSheet', 'detailSheet'].forEach(id => {
    const el = document.getElementById(id);

    el.addEventListener('touchstart', e => {
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    el.addEventListener('touchend', e => {
      const delta = e.changedTouches[0].clientY - touchStartY;
      if (delta > 80) {
        if (id === 'modalSheet')  closeValidationModal();
        else                      closeDetailModal();
      }
    }, { passive: true });
  });

});