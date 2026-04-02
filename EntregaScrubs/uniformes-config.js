// =============================
// CONFIGURAÇÕES E ESTADO GLOBAL
// uniformes-config.js
// =============================

const sheetCSVUrl       = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRuKBJbLlblPErMtxcvB9FTwl3ev05N2IU42a_7PIdFzA4L4wFX-ViML99QG7Xq-WYGSzl-7Ibh2W4W/pub?output=csv";
const webAppUrl         = "https://script.google.com/macros/s/AKfycbx9ihzo2SyQnMK3Ii9cUURdeK8tK0lthOQSGk_J9mZ2Fj9XQKvqGzm9hMB3y2h0IrSR/exec";
const CSV_HISTORICO_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRUjsGsLK_m-wD1NLtaQ-BR9qHjwJW47TQYwR23tuQ7RCUKu--yRim0-ExuxYY-Lia4oerHYjKRN2_Z/pub?output=csv";

// ── Estado da aplicação ──────────────────────────────────────────────────────
let abaAtiva                  = 'autorizados'; // 'autorizados' | 'ci' | ...

let funcionarios              = []; // [{ nome, permanente, diasRestantes }]
let funcionariosSelecionados  = [];
let tipoOperacao              = ''; // 'entrega' | 'devolucao'

// Dados específicos da aba CI (zerados após cada envio)
let dadosCI = { colaborador: '', enfermeiro: '' };

// Tamanhos escolhidos no modal:
// { nomeFuncionario: { jaleco: 'M', calca: 'G' } }
let tamanhosEscolhidos        = {};

// Tamanhos vindos do histórico para devolução:
// { nomeFuncionario: { jaleco: 'M', calca: 'G' } | string (retrocompatibilidade) }
let tamanhosHistorico         = {};

let assinaturasColetadas      = [];
let indiceAssinaturaAtual     = 0;
let funcionariosComPendencia  = new Set();

// ── Utilitários ──────────────────────────────────────────────────────────────
function encurtarNome(nomeCompleto) {
    const partes = nomeCompleto.trim().split(' ');
    if (partes.length === 1) return partes[0];
    if (partes.length === 2) return `${partes[0]} ${partes[1].charAt(0)}.`;
    return `${partes[0]} ${partes[partes.length - 1].charAt(0)}.`;
}

function mostrarLoading() {
    document.getElementById('loadingOverlay').style.display = 'flex';
}

function esconderLoading() {
    document.getElementById('loadingOverlay').style.display = 'none';
}

function resetarSistema() {
    funcionariosSelecionados  = [];
    tamanhosEscolhidos        = {};
    tamanhosHistorico         = {};
    assinaturasColetadas      = [];
    indiceAssinaturaAtual     = 0;
    tipoOperacao              = '';
    atualizarInterfaceSelecao();

    // Se veio da aba CI, limpa o formulário
    if (abaAtiva === 'ci') limparFormularioCI();
}