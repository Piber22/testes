/* ============================================================
   validation.js — Modal de validação
   Gerencia: abertura/fechamento, câmera, canvas de assinatura
   e confirmação com envio ao Web App do Google Sheets.
   ============================================================ */

let activeActivity        = null;
let capturedPhotos        = [];
let currentValidationType = 'photo';

// Assinatura
let sigCanvas, sigCtx;
let isDrawing    = false;
let hasSignature = false;

// ── Abertura do modal ─────────────────────────────────────────

function openValidationModal(activity) {
  activeActivity        = activity;
  capturedPhotos        = [];
  hasSignature          = false;
  currentValidationType = 'photo';

  // Info da atividade
  const name = activity['Terminal'] || activity['TERMINAL'] || 'Atividade';
  const team = activity['Encarregada'] || activity['ENCARREGADA'] || '';
  document.getElementById('modalActivityInfo').innerHTML = `
    <div class="info-name">${name}</div>
    <div class="info-meta">${team ? '👤 ' + team : ''} · ${activity['DATA'] || ''}</div>
  `;

  // Reset
  document.getElementById('photoGrid').innerHTML = '';
  document.getElementById('signerName').value    = '';
  document.getElementById('signerCoren').value   = '';
  document.getElementById('syncStatus').classList.add('hidden');
  document.getElementById('btnConfirm').disabled = false;
  setValTab('photo');
  initSigCanvas();

  document.getElementById('modalValidation').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeValidationModal() {
  document.getElementById('modalValidation').classList.add('hidden');
  document.body.style.overflow = '';
  activeActivity = null;
}

// ── Abas de validação ─────────────────────────────────────────

function setValTab(type) {
  currentValidationType = type;
  document.querySelectorAll('.val-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.val === type)
  );
  document.getElementById('panelPhoto').classList.toggle('active', type === 'photo');
  document.getElementById('panelPhoto').classList.toggle('hidden', type !== 'photo');
  document.getElementById('panelSignature').classList.toggle('active', type === 'signature');
  document.getElementById('panelSignature').classList.toggle('hidden', type !== 'signature');
}

// ── Câmera ────────────────────────────────────────────────────

function initCamera() {
  const input = document.getElementById('cameraInput');
  document.getElementById('btnCapture').addEventListener('click', () => input.click());

  input.addEventListener('change', () => {
    Array.from(input.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => {
        capturedPhotos.push(e.target.result);
        renderPhotoGrid();
      };
      reader.readAsDataURL(file);
    });
    input.value = '';
  });
}

function renderPhotoGrid() {
  const grid = document.getElementById('photoGrid');
  grid.innerHTML = '';
  capturedPhotos.forEach((src, i) => {
    const div = document.createElement('div');
    div.className = 'photo-thumb';
    div.innerHTML = `
      <img src="${src}" alt="Foto ${i + 1}" />
      <button class="photo-remove" data-idx="${i}">✕</button>
    `;
    div.querySelector('.photo-remove').addEventListener('click', () => {
      capturedPhotos.splice(i, 1);
      renderPhotoGrid();
    });
    grid.appendChild(div);
  });
}

// ── Canvas de Assinatura ──────────────────────────────────────

function initSigCanvas() {
  const wrap = document.querySelector('.canvas-wrap');

  // Recriar canvas para zerar listeners anteriores
  const old = document.getElementById('sigCanvas');
  const newC = document.createElement('canvas');
  newC.id = 'sigCanvas';
  wrap.replaceChild(newC, old);

  sigCanvas = newC;
  sigCtx    = sigCanvas.getContext('2d');

  const rect = wrap.getBoundingClientRect();
  sigCanvas.width  = rect.width  || 320;
  sigCanvas.height = 150;

  sigCtx.strokeStyle = '#1a1a1a';
  sigCtx.lineWidth   = 2.5;
  sigCtx.lineCap     = 'round';
  sigCtx.lineJoin    = 'round';

  hasSignature = false;
  document.getElementById('canvasPlaceholder').style.opacity = '1';

  sigCanvas.addEventListener('mousedown',  startDraw);
  sigCanvas.addEventListener('mousemove',  draw);
  sigCanvas.addEventListener('mouseup',    endDraw);
  sigCanvas.addEventListener('mouseleave', endDraw);

  sigCanvas.addEventListener('touchstart', e => { e.preventDefault(); startDraw(e.touches[0]); }, { passive: false });
  sigCanvas.addEventListener('touchmove',  e => { e.preventDefault(); draw(e.touches[0]); },      { passive: false });
  sigCanvas.addEventListener('touchend',   endDraw, { passive: false });
}

function getSigPos(e) {
  const rect  = sigCanvas.getBoundingClientRect();
  const scaleX = sigCanvas.width  / rect.width;
  const scaleY = sigCanvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top)  * scaleY
  };
}

function startDraw(e) {
  isDrawing = true;
  const p = getSigPos(e);
  sigCtx.beginPath();
  sigCtx.moveTo(p.x, p.y);
  if (!hasSignature) {
    hasSignature = true;
    document.getElementById('canvasPlaceholder').style.opacity = '0';
  }
}

function draw(e) {
  if (!isDrawing) return;
  const p = getSigPos(e);
  sigCtx.lineTo(p.x, p.y);
  sigCtx.stroke();
}

function endDraw() {
  isDrawing = false;
  sigCtx.beginPath();
}

function clearSignature() {
  sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
  hasSignature = false;
  document.getElementById('canvasPlaceholder').style.opacity = '1';
}

// ── Confirmação ───────────────────────────────────────────────

async function confirmCompletion() {
  if (!activeActivity) return;

  // Validação dos dados de entrada
  if (currentValidationType === 'photo') {
    if (capturedPhotos.length === 0) {
      alert('Tire pelo menos uma foto para confirmar a atividade.');
      return;
    }
  } else {
    const name = document.getElementById('signerName').value.trim();
    if (!name) {
      alert('Preencha o nome de quem está assinando.');
      document.getElementById('signerName').focus();
      return;
    }
    const coren = document.getElementById('signerCoren').value.trim();
    if (!coren) {
      alert('Preencha o COREN de quem está assinando.');
      document.getElementById('signerCoren').focus();
      return;
    }
    if (!hasSignature) {
      alert('Por favor, assine no campo de assinatura.');
      return;
    }
  }

  // UI de loading
  const btnConfirm = document.getElementById('btnConfirm');
  const syncStatus = document.getElementById('syncStatus');
  btnConfirm.disabled = true;
  syncStatus.classList.remove('hidden');
  document.getElementById('syncMessage').textContent = 'Sincronizando com a planilha...';

  try {
    // 1. Atualizar Google Sheets via Web App
    const signerName = currentValidationType === 'signature'
      ? document.getElementById('signerName').value.trim()
      : null;
    const signerCoren = currentValidationType === 'signature'
      ? document.getElementById('signerCoren').value.trim()
      : null;

    await atualizarViaWebApp(activeActivity.rowIndex, true, signerName, signerCoren);

    // 2. Salvar validação local
    const signature = currentValidationType === 'signature'
      ? sigCanvas.toDataURL('image/png')
      : null;

    setCompletion(activeActivity.rowIndex, {
      completedAt: new Date().toISOString(),
      type:        currentValidationType,
      photos:      currentValidationType === 'photo' ? capturedPhotos.slice() : [],
      signerName,
      signerCoren,
      signature
    });

    // 3. Atualizar objeto local (reflete antes do próximo fetch CSV)
    const colKey = activeActivity['Situação'] !== undefined ? 'Situação' : 'SituaÃ§Ã£o';
    activeActivity[colKey]    = 'Feito';
    activeActivity['Execução'] = getDataAtual();

    document.getElementById('syncMessage').textContent = '✅ Salvo com sucesso!';
    await new Promise(r => setTimeout(r, 700));

    closeValidationModal();
    renderList();

  } catch (err) {
    console.error('Erro ao confirmar atividade:', err);
    let msg = 'Erro ao salvar. ';
    if (err.message?.includes('Failed to fetch')) {
      msg += 'Verifique sua conexão e se o Web App está publicado corretamente.';
    } else {
      msg += err.message;
    }
    document.getElementById('syncMessage').textContent = '❌ ' + msg;
    btnConfirm.disabled = false;
  }
}