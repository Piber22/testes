// =============================
// ENVIO DE DADOS E INICIALIZAÇÃO
// uniformes-envio.js
// =============================

// ── Enviar Dados ─────────────────────────────────────────────────────────────
async function enviarDados() {
    mostrarLoading();

    const agora   = new Date();
    const data    = agora.toLocaleDateString('pt-BR');
    const horario = agora.toLocaleTimeString('pt-BR');

    const registros = funcionariosSelecionados.map((nome, index) => {
        let jaleco = '';
        let calca  = '';

        if (tipoOperacao === 'entrega') {
            const t = tamanhosEscolhidos[nome] || {};
            jaleco  = t.jaleco || '';
            calca   = t.calca  || '';
        } else {
            const t = tamanhosHistorico[nome];
            if (t && typeof t === 'object') {
                jaleco = t.jaleco || '';
                calca  = t.calca  || '';
            } else if (typeof t === 'string') {
                jaleco = t;
                calca  = t;
            }
        }

        return {
            data,
            horario,
            funcionario: nome,
            tipo:        tipoOperacao,
            origem:      abaAtiva,
            enfermeiro:  abaAtiva === 'ci' ? dadosCI.enfermeiro : '',
            jaleco,
            calca,
            assinatura:  assinaturasColetadas[index]
        };
    });

    try {
        await fetch(webAppUrl, {
            method:  'POST',
            mode:    'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(registros)
        });

        esconderLoading();
        await verificarPendencias();
        resetarSistema();

    } catch (error) {
        esconderLoading();
        console.warn('Salvando registro offline.', error);

        try {
            await oq_salvarNaFila(registros);
            await oq_atualizarBadge();
            oq_mostrarToast('Salvo localmente', 'offline');
            resetarSistema();
        } catch (dbError) {
            console.error('Falha ao salvar offline:', dbError);
            alert('❌ Sem conexão e não foi possível salvar localmente. Tente novamente.');
        }
    }
}

// ── Inicialização ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    if (typeof oq_inicializar === 'function') oq_inicializar(webAppUrl);

    carregarFuncionarios();
    inicializarAbas();
    inicializarAbaCI();

    document.getElementById('buscaInput').addEventListener('input', (e) => {
        renderizarFuncionarios(e.target.value);
    });

    document.getElementById('limparSelecaoBtn').addEventListener('click', () => {
        funcionariosSelecionados = [];
        atualizarInterfaceSelecao();
    });

    document.getElementById('entregaMultiplaBtn').addEventListener('click', () => {
        if (funcionariosSelecionados.length > 0)
            verificarPendenciaAntesDaEntrega(funcionariosSelecionados);
    });

    document.getElementById('devolucaoMultiplaBtn').addEventListener('click', () => {
        if (funcionariosSelecionados.length > 0)
            iniciarOperacao(funcionariosSelecionados, 'devolucao');
    });

    // Modal de tamanho
    document.getElementById('cancelarTamanhoBtn').addEventListener('click', () => {
        fecharModalTamanho();
        resetarSistema();
    });

    document.getElementById('avancarAssinaturaBtn').addEventListener('click', () => {
        fecharModalTamanho();
        abrirModalAssinatura();
    });

    // Modal de assinatura
    document.getElementById('limparAssinaturaBtn').addEventListener('click', limparAssinatura);

    document.getElementById('cancelarAssinaturaBtn').addEventListener('click', () => {
        fecharModalAssinatura();
        resetarSistema();
    });

    document.getElementById('confirmarAssinaturaBtn').addEventListener('click', confirmarAssinatura);
});