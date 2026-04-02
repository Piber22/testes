// =============================
// UI — MODAIS
// uniformes-modais.js
// =============================

const TAMANHOS = ['P', 'M', 'G', 'GG', 'EG', 'EXG'];

// ── Modal de Confirmação de Pendência ────────────────────────────────────────
function verificarPendenciaAntesDaEntrega(nomes) {
    const comPendencia = nomes.filter(n => funcionariosComPendencia.has(n));

    if (comPendencia.length > 0) {
        const lista    = comPendencia.join(', ');
        const mensagem = comPendencia.length === 1
            ? `O(A) colaborador(a) ${lista} possui pendências de devolução. Deseja prosseguir mesmo assim?`
            : `Os colaboradores ${lista} possuem pendências de devolução. Deseja prosseguir mesmo assim?`;

        abrirModalConfirmacao(mensagem, () => iniciarOperacao(nomes, 'entrega'));
    } else {
        iniciarOperacao(nomes, 'entrega');
    }
}

function abrirModalConfirmacao(mensagem, callback) {
    const modal = document.getElementById('modalConfirmacao');
    document.getElementById('mensagemConfirmacao').textContent = mensagem;
    modal.style.display = 'block';
    document.body.classList.add('modal-open');

    // Substituir botões para remover listeners antigos
    ['cancelarConfirmacaoBtn', 'prosseguirConfirmacaoBtn'].forEach(id => {
        const el    = document.getElementById(id);
        const clone = el.cloneNode(true);
        el.parentNode.replaceChild(clone, el);
    });

    document.getElementById('cancelarConfirmacaoBtn').addEventListener('click', fecharModalConfirmacao);
    document.getElementById('prosseguirConfirmacaoBtn').addEventListener('click', () => {
        fecharModalConfirmacao();
        callback();
    });
}

function fecharModalConfirmacao() {
    document.getElementById('modalConfirmacao').style.display = 'none';
    document.body.classList.remove('modal-open');
}

// ── Iniciar Operação ─────────────────────────────────────────────────────────
async function iniciarOperacao(nomes, tipo) {
    tipoOperacao             = tipo;
    funcionariosSelecionados = [...nomes];
    tamanhosEscolhidos       = {};
    assinaturasColetadas     = [];
    indiceAssinaturaAtual    = 0;

    if (tipo === 'entrega') {
        abrirModalTamanho();
    } else {
        mostrarLoading();
        await buscarTamanhosHistorico(nomes);
        esconderLoading();
        abrirModalAssinatura();
    }
}

// ── Modal de Tamanho — Jaleco + Calça ────────────────────────────────────────
function abrirModalTamanho() {
    const modal     = document.getElementById('modalTamanho');
    const container = document.getElementById('listaTamanhosContainer');
    const btnAvancar = document.getElementById('avancarAssinaturaBtn');

    container.innerHTML = '';
    btnAvancar.disabled = true;

    document.getElementById('nomeFuncionarioTamanho').textContent =
        funcionariosSelecionados.length === 1
            ? funcionariosSelecionados[0]
            : `${funcionariosSelecionados.length} funcionários selecionados`;

    funcionariosSelecionados.forEach(nome => {
        const nomeExibicao = encurtarNome(nome);

        const item = document.createElement('div');
        item.className = 'tamanho-item';
        item.dataset.nome = nome;

        item.innerHTML = `
            <div class="tamanho-item-nome" title="${nome}">${nomeExibicao}</div>
            <div class="tamanho-pecas">

                <div class="tamanho-peca">
                    <span class="tamanho-peca-label">👔 Jaleco</span>
                    <div class="tamanho-buttons" data-nome="${nome}" data-peca="jaleco">
                        ${TAMANHOS.map(t => `
                            <button class="btn-tamanho"
                                    data-nome="${nome}"
                                    data-peca="jaleco"
                                    data-tamanho="${t}">${t}</button>
                        `).join('')}
                    </div>
                </div>

                <div class="tamanho-peca">
                    <span class="tamanho-peca-label">👖 Calça</span>
                    <div class="tamanho-buttons" data-nome="${nome}" data-peca="calca">
                        ${TAMANHOS.map(t => `
                            <button class="btn-tamanho"
                                    data-nome="${nome}"
                                    data-peca="calca"
                                    data-tamanho="${t}">${t}</button>
                        `).join('')}
                    </div>
                </div>

            </div>
        `;

        container.appendChild(item);
    });

    // Event listeners unificados
    container.querySelectorAll('.btn-tamanho').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const { nome, peca, tamanho } = e.target.dataset;

            // Desmarcar outros da mesma peça/funcionário
            container
                .querySelectorAll(`.btn-tamanho[data-nome="${nome}"][data-peca="${peca}"]`)
                .forEach(b => b.classList.remove('selecionado'));

            e.target.classList.add('selecionado');

            // Armazenar escolha
            if (!tamanhosEscolhidos[nome]) tamanhosEscolhidos[nome] = {};
            tamanhosEscolhidos[nome][peca] = tamanho;

            verificarSelecaoCompleta();
        });
    });

    modal.style.display = 'block';
    document.body.classList.add('modal-open');
}

function verificarSelecaoCompleta() {
    // Todos os funcionários precisam ter jaleco E calça escolhidos
    const completo = funcionariosSelecionados.every(nome => {
        const t = tamanhosEscolhidos[nome];
        return t && t.jaleco && t.calca;
    });
    document.getElementById('avancarAssinaturaBtn').disabled = !completo;
}

function fecharModalTamanho() {
    document.getElementById('modalTamanho').style.display = 'none';
    document.body.classList.remove('modal-open');
}

// ── Modal de Assinatura ──────────────────────────────────────────────────────
let canvas, ctx, desenhando = false, posX = 0, posY = 0;

function abrirModalAssinatura() {
    const modal = document.getElementById('modalAssinatura');
    canvas = document.getElementById('canvasAssinatura');
    ctx    = canvas.getContext('2d');

    canvas.width  = 600;
    canvas.height = 300;

    ctx.strokeStyle = '#000';
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';

    atualizarInfoAssinaturaMultipla();

    modal.style.display = 'block';
    document.body.classList.add('modal-open');

    canvas.addEventListener('mousedown',  iniciarDesenho);
    canvas.addEventListener('mousemove',  desenhar);
    canvas.addEventListener('mouseup',    pararDesenho);
    canvas.addEventListener('mouseleave', pararDesenho);

    canvas.addEventListener('touchstart', iniciarDesenhoTouch, { passive: false });
    canvas.addEventListener('touchmove',  desenharTouch,       { passive: false });
    canvas.addEventListener('touchend',   pararDesenho);
}

function atualizarInfoAssinaturaMultipla() {
    const nome        = funcionariosSelecionados[indiceAssinaturaAtual];
    const progressoDiv = document.getElementById('progressoAssinaturas');

    document.getElementById('infoAssinatura').textContent = `Assinatura de ${nome}`;

    if (funcionariosSelecionados.length === 1) {
        progressoDiv.style.display = 'none';
    } else {
        progressoDiv.style.display = 'block';
        document.getElementById('assinaturaAtual').textContent = indiceAssinaturaAtual + 1;
        document.getElementById('assinaturaTotal').textContent = funcionariosSelecionados.length;
    }
}

// ── Desenho do Canvas ────────────────────────────────────────────────────────
function _coordenadasMouse(e) {
    const rect   = canvas.getBoundingClientRect();
    return {
        x: (e.clientX - rect.left) * (canvas.width  / rect.width),
        y: (e.clientY - rect.top)  * (canvas.height / rect.height)
    };
}

function _coordenadasTouch(e) {
    const rect  = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    return {
        x: (touch.clientX - rect.left) * (canvas.width  / rect.width),
        y: (touch.clientY - rect.top)  * (canvas.height / rect.height)
    };
}

function iniciarDesenho(e) {
    desenhando = true;
    ({ x: posX, y: posY } = _coordenadasMouse(e));
}

function desenhar(e) {
    if (!desenhando) return;
    const { x, y } = _coordenadasMouse(e);
    ctx.beginPath();
    ctx.moveTo(posX, posY);
    ctx.lineTo(x, y);
    ctx.stroke();
    posX = x; posY = y;
}

function iniciarDesenhoTouch(e) {
    e.preventDefault();
    desenhando = true;
    ({ x: posX, y: posY } = _coordenadasTouch(e));
}

function desenharTouch(e) {
    e.preventDefault();
    if (!desenhando) return;
    const { x, y } = _coordenadasTouch(e);
    ctx.beginPath();
    ctx.moveTo(posX, posY);
    ctx.lineTo(x, y);
    ctx.stroke();
    posX = x; posY = y;
}

function pararDesenho() { desenhando = false; }

function limparAssinatura() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function fecharModalAssinatura() {
    document.getElementById('modalAssinatura').style.display = 'none';
    document.body.classList.remove('modal-open');
    limparAssinatura();
}

// ── Confirmar Assinatura ─────────────────────────────────────────────────────
async function confirmarAssinatura() {
    // Verificar se há traços no canvas
    const pixels    = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const temDesenho = Array.from(pixels).some((v, i) => i % 4 === 3 && v !== 0);

    if (!temDesenho) {
        alert('Por favor, colete a assinatura antes de confirmar.');
        return;
    }

    assinaturasColetadas.push(canvas.toDataURL('image/png'));

    if (indiceAssinaturaAtual < funcionariosSelecionados.length - 1) {
        indiceAssinaturaAtual++;
        limparAssinatura();
        atualizarInfoAssinaturaMultipla();
    } else {
        fecharModalAssinatura();
        await enviarDados();
    }
}
