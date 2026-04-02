// =============================
// UI — LISTA DE FUNCIONÁRIOS E SELEÇÃO
// uniformes-lista.js
// =============================

// ── Renderização ─────────────────────────────────────────────────────────────
function renderizarFuncionarios(filtro = '') {
    const container = document.getElementById('funcionariosContainer');
    if (!container) return; // aba autorizados não está ativa
    container.innerHTML = '';

    const lista = funcionarios.filter(f =>
        f.nome.toLowerCase().includes(filtro.toLowerCase())
    );

    if (lista.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#777;">Nenhum funcionário encontrado.</p>';
        return;
    }

    lista.forEach(({ nome, permanente, diasRestantes }) => {
        const item = document.createElement('div');
        item.className = 'funcionario-item';

        if (funcionariosComPendencia.has(nome))      item.classList.add('com-pendencia');
        if (funcionariosSelecionados.includes(nome)) item.classList.add('selecionado');

        let validadeBadge = '';
        if (!permanente && diasRestantes !== null) {
            let label;
            if (diasRestantes === 0)      label = 'vence hoje';
            else if (diasRestantes === 1) label = '1 dia';
            else                          label = `${diasRestantes} dias`;
            validadeBadge = `<span class="validade-badge">${label}</span>`;
        }

        item.innerHTML = `
            <div class="funcionario-info">
                <div class="checkbox-custom"></div>
                <span class="funcionario-nome">${nome}${validadeBadge}</span>
            </div>
            <div class="funcionario-acoes">
                <button class="btn-acao btn-entrega"   data-nome="${nome}" title="Entregar Uniforme">📦</button>
                <button class="btn-acao btn-devolucao" data-nome="${nome}" title="Receber Devolução">✅</button>
            </div>
        `;

        item.querySelector('.funcionario-info').addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSelecao(nome);
        });

        item.querySelector('.btn-entrega').addEventListener('click', (e) => {
            e.stopPropagation();
            verificarPendenciaAntesDaEntrega([nome]);
        });

        item.querySelector('.btn-devolucao').addEventListener('click', (e) => {
            e.stopPropagation();
            iniciarOperacao([nome], 'devolucao');
        });

        container.appendChild(item);
    });
}

// ── Seleção múltipla ─────────────────────────────────────────────────────────
function toggleSelecao(nome) {
    const index = funcionariosSelecionados.indexOf(nome);
    if (index > -1) funcionariosSelecionados.splice(index, 1);
    else            funcionariosSelecionados.push(nome);
    atualizarInterfaceSelecao();
}

function atualizarInterfaceSelecao() {
    const contador       = funcionariosSelecionados.length;
    const btnLimpar      = document.getElementById('limparSelecaoBtn');
    const acoesMultiplas = document.getElementById('acoesMultiplas');

    // Esses elementos só existem na aba "autorizados"
    if (btnLimpar && acoesMultiplas) {
        if (contador > 0) {
            btnLimpar.style.display      = 'block';
            acoesMultiplas.style.display = 'flex';
            document.getElementById('contadorSelecao').textContent   = contador;
            document.getElementById('contadorEntrega').textContent   = contador;
            document.getElementById('contadorDevolucao').textContent = contador;
        } else {
            btnLimpar.style.display      = 'none';
            acoesMultiplas.style.display = 'none';
        }
    }

    const buscaInput = document.getElementById('buscaInput');
    renderizarFuncionarios(buscaInput ? buscaInput.value : '');
}

// ── Sistema de abas ──────────────────────────────────────────────────────────
function inicializarAbas() {
    document.querySelectorAll('.aba-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const alvo = btn.dataset.aba;
            if (alvo === abaAtiva) return;

            abaAtiva = alvo;

            document.querySelectorAll('.aba-btn').forEach(b => b.classList.remove('ativa'));
            btn.classList.add('ativa');

            document.querySelectorAll('.aba-conteudo').forEach(c => c.classList.remove('ativa'));
            document.getElementById(`aba-${alvo}`).classList.add('ativa');

            resetarSistema();
        });
    });
}