// =============================
// DADOS — CSV, HISTÓRICO, PENDÊNCIAS
// uniformes-dados.js
// =============================

// ── Parsers CSV ──────────────────────────────────────────────────────────────
function parseCSVLine(line) {
    const result = [];
    let current  = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function processarCSVHistorico(csvText) {
    const linhas = csvText.split('\n').map(l => l.trim()).filter(l => l);
    const dados  = [];

    for (let i = 1; i < linhas.length; i++) {
        const campos = parseCSVLine(linhas[i]);
        if (campos.length >= 4) {
            dados.push({
                data:        campos[0],
                horario:     campos[1],
                funcionario: campos[2],
                tipo:        campos[3].toLowerCase(),
                // Suporte ao formato antigo (coluna 4 = tamanho único) e
                // ao novo formato (coluna 4 = jaleco, coluna 5 = calça)
                jaleco:      campos[4] || '',
                calca:       campos[5] || campos[4] || '', // retrocompatibilidade
            });
        }
    }
    return dados;
}

// ── Pendências ───────────────────────────────────────────────────────────────
async function verificarPendencias() {
    try {
        const response = await fetch(CSV_HISTORICO_URL);
        const csvText  = await response.text();
        const dados    = processarCSVHistorico(csvText);

        const saldo = {};
        dados.forEach(item => {
            if (!saldo[item.funcionario]) saldo[item.funcionario] = 0;
            if (item.tipo === 'entrega')   saldo[item.funcionario]++;
            if (item.tipo === 'devolucao') saldo[item.funcionario]--;
        });

        funcionariosComPendencia.clear();
        Object.keys(saldo).forEach(nome => {
            if (saldo[nome] > 0) funcionariosComPendencia.add(nome);
        });
    } catch (error) {
        console.error('Erro ao verificar pendências:', error);
    }
}

// ── Tamanhos do histórico (para devolução) ───────────────────────────────────
async function buscarTamanhosHistorico(nomesFuncionarios) {
    const promises = nomesFuncionarios.map(async (nome) => {
        try {
            const url      = `${webAppUrl}?funcionario=${encodeURIComponent(nome)}`;
            const response = await fetch(url);
            const data     = await response.json();

            if (data.status === 'success') {
                // Novo formato: { jaleco, calca } — antigo: { tamanho }
                if (data.jaleco || data.calca) {
                    tamanhosHistorico[nome] = {
                        jaleco: data.jaleco || data.tamanho || '',
                        calca:  data.calca  || data.tamanho || ''
                    };
                } else if (data.tamanho) {
                    // Retrocompatibilidade com registros antigos (tamanho único)
                    tamanhosHistorico[nome] = { jaleco: data.tamanho, calca: data.tamanho };
                }
            }
        } catch (error) {
            console.error(`Erro ao buscar tamanho para ${nome}:`, error);
        }
    });

    await Promise.all(promises);
}

// ── Carregar lista de funcionários ───────────────────────────────────────────
async function carregarFuncionarios() {
    try {
        const response = await fetch(sheetCSVUrl);
        const csvText  = await response.text();
        const linhas   = csvText.split('\n').map(l => l.trim()).filter(l => l);

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        funcionarios = linhas.slice(1)
            .map(linha => {
                const campos      = parseCSVLine(linha);
                const nome        = (campos[0] || '').replace(/^"|"$/g, '').trim();
                const validadeRaw = (campos[1] || '').replace(/^"|"$/g, '').trim();

                if (!nome) return null;

                if (!validadeRaw || validadeRaw.toLowerCase() === 'permanente') {
                    return { nome, permanente: true, diasRestantes: null };
                }

                const partes = validadeRaw.split('/');
                let dataValidade = null;
                if (partes.length === 3) {
                    dataValidade = new Date(
                        parseInt(partes[2]),
                        parseInt(partes[1]) - 1,
                        parseInt(partes[0])
                    );
                    dataValidade.setHours(0, 0, 0, 0);
                }

                if (!dataValidade || isNaN(dataValidade)) {
                    return { nome, permanente: true, diasRestantes: null };
                }

                const diasRestantes = Math.ceil((dataValidade - hoje) / (1000 * 60 * 60 * 24));
                if (diasRestantes < 0) return null;

                return { nome, permanente: false, diasRestantes };
            })
            .filter(f => f !== null)
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

        await verificarPendencias();
        renderizarFuncionarios();
    } catch (error) {
        console.error('Erro ao carregar funcionários:', error);
        document.getElementById('funcionariosContainer').innerHTML =
            '<p style="text-align:center; color:#ff4444;">Erro ao carregar funcionários. Verifique a conexão.</p>';
    }
}
