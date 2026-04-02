// =============================
// FILA OFFLINE — offline-queue.js
// IndexedDB + reenvio automático
// =============================

const OQ_DB_NAME    = 'uniformes_offline';
const OQ_DB_VERSION = 1;
const OQ_STORE      = 'fila_envios';

// ── Abrir / criar banco ──────────────────────────────────────────────────────
function oq_abrirDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(OQ_DB_NAME, OQ_DB_VERSION);

        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(OQ_STORE)) {
                db.createObjectStore(OQ_STORE, { keyPath: 'id', autoIncrement: true });
            }
        };

        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror   = (e) => reject(e.target.error);
    });
}

// ── Salvar registros na fila ─────────────────────────────────────────────────
async function oq_salvarNaFila(registros) {
    const db = await oq_abrirDB();
    return new Promise((resolve, reject) => {
        const tx    = db.transaction(OQ_STORE, 'readwrite');
        const store = tx.objectStore(OQ_STORE);

        // Salva o lote inteiro como uma entrada (mantém a assinatura por pessoa)
        store.add({ registros, salvadoEm: new Date().toISOString() });

        tx.oncomplete = () => resolve();
        tx.onerror    = (e) => reject(e.target.error);
    });
}

// ── Ler todos os itens pendentes ─────────────────────────────────────────────
async function oq_lerFila() {
    const db = await oq_abrirDB();
    return new Promise((resolve, reject) => {
        const tx    = db.transaction(OQ_STORE, 'readonly');
        const store = tx.objectStore(OQ_STORE);
        const req   = store.getAll();

        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror   = (e) => reject(e.target.error);
    });
}

// ── Remover item enviado com sucesso ─────────────────────────────────────────
async function oq_removerDaFila(id) {
    const db = await oq_abrirDB();
    return new Promise((resolve, reject) => {
        const tx    = db.transaction(OQ_STORE, 'readwrite');
        const store = tx.objectStore(OQ_STORE);
        store.delete(id);

        tx.oncomplete = () => resolve();
        tx.onerror    = (e) => reject(e.target.error);
    });
}

// ── Contar pendentes ─────────────────────────────────────────────────────────
async function oq_contarPendentes() {
    const itens = await oq_lerFila();
    return itens.length;
}

// ── Toast discreto ───────────────────────────────────────────────────────────
function oq_mostrarToast(mensagem, tipo = 'info') {
    // Remove toast anterior se existir
    const anterior = document.getElementById('oq-toast');
    if (anterior) anterior.remove();

    const toast = document.createElement('div');
    toast.id = 'oq-toast';
    toast.className = `oq-toast oq-toast--${tipo}`;
    toast.textContent = mensagem;
    document.body.appendChild(toast);

    // Forçar reflow para a animação funcionar
    toast.getBoundingClientRect();
    toast.classList.add('oq-toast--visivel');

    // Auto-remover após 4s (ou 6s se for aviso de offline)
    const duracao = tipo === 'offline' ? 6000 : 4000;
    setTimeout(() => {
        toast.classList.remove('oq-toast--visivel');
        setTimeout(() => toast.remove(), 400);
    }, duracao);
}

// ── Atualizar badge de pendentes no header ───────────────────────────────────
async function oq_atualizarBadge() {
    const count = await oq_contarPendentes();
    let badge = document.getElementById('oq-badge');

    if (count === 0) {
        if (badge) badge.remove();
        return;
    }

    if (!badge) {
        badge = document.createElement('div');
        badge.id = 'oq-badge';
        badge.className = 'oq-badge';

        // Insere no header
        const header = document.querySelector('.header');
        if (header) header.appendChild(badge);
    }

    const label = count === 1 ? '1 pendente' : `${count} pendentes`;
    badge.textContent = `📤 ${label}`;
}

// ── Tentar enviar a fila ─────────────────────────────────────────────────────
async function oq_tentarEnviarFila(webAppUrl) {
    const itens = await oq_lerFila();
    if (itens.length === 0) return;

    let enviados = 0;

    for (const item of itens) {
        try {
            await fetch(webAppUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(item.registros)
            });

            // Com no-cors a resposta é opaca — se não lançou exceção, consideramos sucesso
            await oq_removerDaFila(item.id);
            enviados++;
        } catch (err) {
            // Ainda sem conexão — para por aqui, tenta de novo depois
            break;
        }
    }

    await oq_atualizarBadge();

    if (enviados > 0) {
        const label = enviados === 1
            ? '1 registro offline enviado com sucesso'
            : `${enviados} registros offline enviados`;
        oq_mostrarToast(`✓ ${label}`, 'sucesso');
    }
}

// ── Inicializar: registrar gatilhos de reenvio ───────────────────────────────
function oq_inicializar(webAppUrl) {
    // 1) Quando a conexão voltar enquanto o app está aberto
    window.addEventListener('online', () => {
        oq_tentarEnviarFila(webAppUrl);
    });

    // 2) Quando o usuário volta à aba/app (desbloqueia o celular, troca de app)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            oq_tentarEnviarFila(webAppUrl);
        }
    });

    // 3) Ao carregar a página — tenta enviar o que ficou de sessões anteriores
    oq_tentarEnviarFila(webAppUrl);

    // Exibe badge se houver pendentes ao abrir
    oq_atualizarBadge();
}