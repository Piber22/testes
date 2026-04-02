// =============================
// ABA CI — FORMULÁRIO E FLUXO
// uniformes-ci.js
// =============================

// ── Inicialização da aba CI ───────────────────────────────────────────────────
function inicializarAbaCI() {
    const inputNome       = document.getElementById('ciNomeColaborador');
    const inputEnfermeiro = document.getElementById('ciNomeEnfermeiro');
    const btnEntregar     = document.getElementById('ciEntregarBtn');

    function validarFormularioCI() {
        const nomeOk       = inputNome.value.trim().length >= 3;
        const enfermeiroOk = inputEnfermeiro.value.trim().length >= 3;
        btnEntregar.disabled = !(nomeOk && enfermeiroOk);
    }

    inputNome.addEventListener('input', validarFormularioCI);
    inputEnfermeiro.addEventListener('input', validarFormularioCI);

    btnEntregar.addEventListener('click', () => {
        const nomeColaborador = inputNome.value.trim();
        const nomeEnfermeiro  = inputEnfermeiro.value.trim();

        if (!nomeColaborador || !nomeEnfermeiro) return;

        // Guarda os dados do CI no estado global para o envio acessar
        dadosCI.colaborador = nomeColaborador;
        dadosCI.enfermeiro  = nomeEnfermeiro;

        // Dispara o fluxo compartilhado: tamanho → assinatura → envio
        iniciarOperacao([nomeColaborador], 'entrega');
    });
}

// ── Limpar formulário CI após envio ──────────────────────────────────────────
function limparFormularioCI() {
    const inputNome       = document.getElementById('ciNomeColaborador');
    const inputEnfermeiro = document.getElementById('ciNomeEnfermeiro');
    const btnEntregar     = document.getElementById('ciEntregarBtn');

    if (inputNome)       inputNome.value       = '';
    if (inputEnfermeiro) inputEnfermeiro.value = '';
    if (btnEntregar)     btnEntregar.disabled  = true;

    dadosCI.colaborador = '';
    dadosCI.enfermeiro  = '';
}