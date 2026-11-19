
document.addEventListener('DOMContentLoaded', () => {
    "use strict";

    const $ = id => document.getElementById(id);

    const campaignTable = $('campaignTable');
    const donationTable = $('donationTable');

    const refreshButton = $('refreshButton');
    const refreshDonationsButton = $('refreshDonationsButton');

    const feedback = $('feedback');
    const donationFeedback = $('donationFeedback');

    let carregandoDashboard = false;
    let carregandoDoacoes = false;

    // =========================================
    // FUNÇÕES AUXILIARES
    // =========================================

    function money(valor) {
        return Number(valor || 0).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    }

    function escapeHTML(texto) {
        return String(texto ?? '').replace(/[&<>"']/g, caractere => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[caractere]));
    }

    function dataBR(data) {
        if (!data) return '—';

        const valor = String(data);

        const partes = valor.match(/^(\d{4})-(\d{2})-(\d{2})/);

        if (partes) {
            return `${partes[3]}/${partes[2]}/${partes[1]}`;
        }

        const dataConvertida = new Date(valor);

        if (Number.isNaN(dataConvertida.getTime())) {
            return escapeHTML(valor);
        }

        return dataConvertida.toLocaleDateString('pt-BR');
    }

    function setText(id, valor) {
        const elemento = $(id);

        if (elemento) {
            elemento.textContent = valor ?? '0';
        }
    }

    function mostrarFeedback(elemento, mensagem, tipo = 'success') {
        if (!elemento) return;

        elemento.textContent = mensagem;
        elemento.hidden = false;

        elemento.classList.remove('success', 'error');
        elemento.classList.add(tipo);
    }

    function esconderFeedback(elemento) {
        if (!elemento) return;

        elemento.hidden = true;
        elemento.textContent = '';
        elemento.classList.remove('success', 'error');
    }

    async function buscarJSON(url, opcoes = {}) {
        const resposta = await fetch(url, {
            cache: 'no-store',
            ...opcoes
        });

        const texto = await resposta.text();

        let dados;

        try {
            dados = JSON.parse(texto);
        } catch {
            console.error('Resposta inválida do PHP:', url, texto);

            throw new Error('O servidor retornou uma resposta inválida.');
        }

        if (!resposta.ok || dados.sucesso === false) {
            throw new Error(
                dados.mensagem || `Erro HTTP ${resposta.status}`
            );
        }

        return dados;
    }

    // =========================================
    // VISÃO GERAL
    // =========================================

    async function carregarDashboard() {
        if (carregandoDashboard) return;

        carregandoDashboard = true;

        esconderFeedback(feedback);

        if (refreshButton) {
            refreshButton.disabled = true;
        }

        try {
            const dados = await buscarJSON('dados_admin.php');

            const financeiro = dados.financeiro || {};

            const arrecadado = Number(
                financeiro.total_arrecadado || 0
            );

            const totalElo = Number(
                financeiro.total_elo || 0
            );

            const totalCampanhas = Number(
                financeiro.total_campanhas || 0
            );

            const quantidadeProjetos = Number(
                dados.total_projetos || 0
            );

            const quantidadeUsuarios = Number(
                dados.total_usuarios || 0
            );

            setText('totalArrecadado', money(arrecadado));
            setText('totalElo', money(totalElo));
            setText('totalCampanhas', money(totalCampanhas));

            setText('totalProjetos', quantidadeProjetos);
            setText('totalUsuarios', quantidadeUsuarios);

            setText('summaryUsers', quantidadeUsuarios);
            setText('summaryProjects', quantidadeProjetos);
            setText('summaryDonations', money(arrecadado));

            atualizarGrafico(totalElo, totalCampanhas);

            renderCampaigns(dados.projetos || []);

            console.log('Dashboard atualizado:', dados);

        } catch (erro) {
            console.error('Erro ao carregar dashboard:', erro);

            mostrarFeedback(
                feedback,
                erro.message || 'Não foi possível carregar os dados.',
                'error'
            );

        } finally {
            carregandoDashboard = false;

            if (refreshButton) {
                refreshButton.disabled = false;
            }
        }
    }

    // =========================================
    // STATUS DAS CAMPANHAS
    // =========================================

    function formatarStatus(status) {
        const statusMap = {
            rascunho: 'Rascunho',
            em_analise: 'Em análise',
            publicado: 'Publicado',
            concluido: 'Concluído',
            cancelado: 'Cancelado',
            excluido: 'Excluído',
            arquivado: 'Arquivado'
        };

        return statusMap[status] || status || 'Não informado';
    }

    // =========================================
    // TABELA DE CAMPANHAS
    // =========================================

    function renderCampaigns(campanhas) {
        if (!campaignTable) return;

        if (!Array.isArray(campanhas) || campanhas.length === 0) {
            campaignTable.innerHTML = `
                <tr>
                    <td colspan="4" class="empty-cell">
                        Nenhuma campanha cadastrada.
                    </td>
                </tr>
            `;

            setText('campaignCount', '0 campanhas');

            return;
        }

        setText(
            'campaignCount',
            `${campanhas.length} ${
                campanhas.length === 1 ? 'campanha' : 'campanhas'
            }`
        );

        campaignTable.innerHTML = campanhas.map(campanha => {
            const id = Number(campanha.id);

            const titulo = escapeHTML(
                campanha.titulo || 'Projeto sem título'
            );

            const arrecadado = Number(
                campanha.total_arrecadado || 0
            );

            const parteElo = Number(
                campanha.total_elo || 0
            );

            const status = String(
                campanha.status || ''
            ).toLowerCase();

            let botoes = `
                <a
                    class="btn-visualizar-campanha"
                    href="projeto.html?id=${id}"
                    title="Visualizar campanha"
                >
                    <i class="fa-solid fa-eye"></i>
                    Visualizar
                </a>
            `;

            // Campanha publicada: permite arquivar
            if (status === 'publicado') {
                botoes += `
                    <button
                        type="button"
                        class="btn-arquivar-campanha"
                        data-id="${id}"
                        data-titulo="${escapeHTML(campanha.titulo || '')}"
                        title="Arquivar campanha"
                    >
                        <i class="fa-solid fa-box-archive"></i>
                        Arquivar
                    </button>
                `;
            }

            // Campanha arquivada: permite reativar
            else if (status === 'arquivado') {
                botoes += `
                    <button
                        type="button"
                        class="btn-reativar-campanha"
                        data-id="${id}"
                        data-titulo="${escapeHTML(campanha.titulo || '')}"
                        title="Reativar campanha"
                    >
                        <i class="fa-solid fa-rotate"></i>
                        Reativar
                    </button>
                `;
            }

            return `
                <tr>
                    <td>
                        <strong>${titulo}</strong>
                        <small class="status-campanha-admin">
                            ${escapeHTML(formatarStatus(status))}
                        </small>
                    </td>

                    <td>
                        ${money(arrecadado)}
                    </td>

                    <td>
                        ${money(parteElo)}
                    </td>

                    <td class="acoes-campanha">
                        ${botoes}
                    </td>
                </tr>
            `;
        }).join('');
    }

    // =========================================
    // ARQUIVAR CAMPANHA
    // =========================================

    async function arquivarCampanha(id, titulo, botao) {
        if (!id) return;

        const nome = titulo || 'esta campanha';

        const confirmar = confirm(
            `Deseja realmente arquivar "${nome}"?\n\n` +
            `Ela deixará de ficar publicada, mas seus dados, ` +
            `doações e metas serão preservados.`
        );

        if (!confirmar) return;

        const textoOriginal = botao.innerHTML;

        botao.disabled = true;

        botao.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Arquivando...
        `;

        esconderFeedback(feedback);

        try {
            const dados = await buscarJSON('gerenciar_campanha.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    projeto_id: Number(id),
                    acao: 'arquivar'
                })
            });

            mostrarFeedback(
                feedback,
                dados.mensagem || 'Campanha arquivada com sucesso!',
                'success'
            );

            await carregarDashboard();

        } catch (erro) {
            console.error('Erro ao arquivar campanha:', erro);

            mostrarFeedback(
                feedback,
                erro.message || 'Não foi possível arquivar a campanha.',
                'error'
            );

            botao.disabled = false;
            botao.innerHTML = textoOriginal;
        }
    }

    // =========================================
    // REATIVAR CAMPANHA
    // =========================================

    async function reativarCampanha(id, titulo, botao) {
        if (!id) return;

        const nome = titulo || 'esta campanha';

        const confirmar = confirm(
            `Deseja reativar "${nome}"?\n\n` +
            `Ela voltará ao status publicado.`
        );

        if (!confirmar) return;

        const textoOriginal = botao.innerHTML;

        botao.disabled = true;

        botao.innerHTML = `
            <i class="fa-solid fa-spinner fa-spin"></i>
            Reativando...
        `;

        esconderFeedback(feedback);

        try {
            const dados = await buscarJSON('gerenciar_campanha.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    projeto_id: Number(id),
                    acao: 'reativar'
                })
            });

            mostrarFeedback(
                feedback,
                dados.mensagem || 'Campanha reativada com sucesso!',
                'success'
            );

            await carregarDashboard();

        } catch (erro) {
            console.error('Erro ao reativar campanha:', erro);

            mostrarFeedback(
                feedback,
                erro.message || 'Não foi possível reativar a campanha.',
                'error'
            );

            botao.disabled = false;
            botao.innerHTML = textoOriginal;
        }
    }

    // =========================================
    // GRÁFICO FINANCEIRO
    // =========================================

    function atualizarGrafico(valorElo, valorCampanhas) {
        const donut = $('donutChart');

        const legendaElo = $('legendElo');
        const legendaCampanhas = $('legendCampanhas');

        if (legendaElo) {
            legendaElo.textContent = money(valorElo);
        }

        if (legendaCampanhas) {
            legendaCampanhas.textContent = money(valorCampanhas);
        }

        if (!donut) return;

        const total = valorElo + valorCampanhas;

        if (total <= 0) {
            donut.style.background = '#E8EDF5';
            return;
        }

        const porcentagemElo = (valorElo / total) * 100;

        donut.style.background = `
            conic-gradient(
                #FFD600 0% ${porcentagemElo}%,
                #075BE8 ${porcentagemElo}% 100%
            )
        `;
    }

    // =========================================
    // DOAÇÕES
    // =========================================

    function renderDonations(doacoes) {
        if (!donationTable) return;

        if (!Array.isArray(doacoes) || doacoes.length === 0) {
            donationTable.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-cell">
                        Nenhuma doação encontrada.
                    </td>
                </tr>
            `;

            return;
        }

        donationTable.innerHTML = doacoes.map(doacao => {
            const id = Number(doacao.id);

            const doador = doacao.anonimato == 1
                ? 'Doador anônimo'
                : escapeHTML(
                    doacao.nome_doador ||
                    doacao.nome ||
                    'Doador'
                );

            const campanha = escapeHTML(
                doacao.titulo_projeto ||
                doacao.titulo ||
                doacao.nome_projeto ||
                'Campanha'
            );

            const valor = money(doacao.valor);

            const metodo = escapeHTML(
                doacao.metodo_pagamento || '—'
            );

            const data = dataBR(
                doacao.data_doacao || doacao.data
            );

            const statusOriginal = String(
                doacao.status || ''
            ).toLowerCase();

            let statusTexto = statusOriginal;
            let statusClasse = '';

            if (statusOriginal === 'pendente') {
                statusTexto = 'Pendente';
                statusClasse = 'status-pendente';
            } else if (statusOriginal === 'confirmada') {
                statusTexto = 'Confirmada';
                statusClasse = 'status-confirmada';
            } else if (statusOriginal === 'cancelada') {
                statusTexto = 'Cancelada';
                statusClasse = 'status-cancelada';
            } else {
                statusTexto = escapeHTML(statusOriginal || '—');
            }

            const acao = statusOriginal === 'pendente'
                ? `
                    <button
                        type="button"
                        class="btn-confirmar-doacao"
                        data-id="${id}"
                    >
                        <i class="fa-solid fa-check"></i>
                        Confirmar
                    </button>
                `
                : '—';

            return `
                <tr>
                    <td>${doador}</td>

                    <td>${campanha}</td>

                    <td>${valor}</td>

                    <td>${metodo}</td>

                    <td>${data}</td>

                    <td>
                        <span class="status-doacao ${statusClasse}">
                            ${statusTexto}
                        </span>
                    </td>

                    <td>${acao}</td>
                </tr>
            `;
        }).join('');
    }

    async function carregarDoacoes() {
        if (carregandoDoacoes) return;

        carregandoDoacoes = true;

        esconderFeedback(donationFeedback);

        if (refreshDonationsButton) {
            refreshDonationsButton.disabled = true;
        }

        if (donationTable) {
            donationTable.innerHTML = `
                <tr>
                    <td colspan="7" class="empty-cell">
                        Carregando doações...
                    </td>
                </tr>
            `;
        }

        try {
            const dados = await buscarJSON('doacoes_admin.php');

            renderDonations(dados.doacoes || []);

            console.log('Doações carregadas:', dados.doacoes);

        } catch (erro) {
            console.error('Erro ao carregar doações:', erro);

            if (donationTable) {
                donationTable.innerHTML = `
                    <tr>
                        <td colspan="7" class="empty-cell">
                            Erro ao carregar doações.
                        </td>
                    </tr>
                `;
            }

            mostrarFeedback(
                donationFeedback,
                erro.message || 'Não foi possível carregar as doações.',
                'error'
            );

        } finally {
            carregandoDoacoes = false;

            if (refreshDonationsButton) {
                refreshDonationsButton.disabled = false;
            }
        }
    }

    // =========================================
    // CONFIRMAR DOAÇÃO
    // =========================================

    async function confirmarDoacao(id, botao) {
        if (!id) return;

        if (!confirm(
            'Confirma que o pagamento desta doação foi realmente recebido?'
        )) {
            return;
        }

        const textoOriginal = botao
            ? botao.innerHTML
            : '';

        if (botao) {
            botao.disabled = true;

            botao.innerHTML = `
                <i class="fa-solid fa-spinner fa-spin"></i>
                Confirmando...
            `;
        }

        esconderFeedback(donationFeedback);

        try {
            const dados = await buscarJSON('confirmar_doacao.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    doacao_id: Number(id)
                })
            });

            mostrarFeedback(
                donationFeedback,
                dados.mensagem || 'Doação confirmada com sucesso!',
                'success'
            );

            await Promise.all([
                carregarDoacoes(),
                carregarDashboard()
            ]);

        } catch (erro) {
            console.error('Erro ao confirmar doação:', erro);

            mostrarFeedback(
                donationFeedback,
                erro.message || 'Não foi possível confirmar a doação.',
                'error'
            );

            if (botao) {
                botao.disabled = false;
                botao.innerHTML = textoOriginal;
            }
        }
    }

    // =========================================
    // EVENTOS
    // =========================================

    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            carregarDashboard();
            carregarDoacoes();
        });
    }

    if (refreshDonationsButton) {
        refreshDonationsButton.addEventListener(
            'click',
            carregarDoacoes
        );
    }

    // Eventos da tabela de campanhas
    if (campaignTable) {
        campaignTable.addEventListener('click', evento => {

            const botaoArquivar = evento.target.closest(
                '.btn-arquivar-campanha'
            );

            if (botaoArquivar) {
                arquivarCampanha(
                    botaoArquivar.dataset.id,
                    botaoArquivar.dataset.titulo,
                    botaoArquivar
                );

                return;
            }

            const botaoReativar = evento.target.closest(
                '.btn-reativar-campanha'
            );

            if (botaoReativar) {
                reativarCampanha(
                    botaoReativar.dataset.id,
                    botaoReativar.dataset.titulo,
                    botaoReativar
                );
            }
        });
    }

    // Eventos da tabela de doações
    if (donationTable) {
        donationTable.addEventListener('click', evento => {
            const botao = evento.target.closest(
                '.btn-confirmar-doacao'
            );

            if (!botao) return;

            confirmarDoacao(
                botao.dataset.id,
                botao
            );
        });
    }

    // =========================================
    // MENU LATERAL / MOBILE
    // =========================================

    const mobileMenu = $('mobileMenu');
    const sidebar = $('sidebar');

    if (mobileMenu && sidebar) {
        mobileMenu.addEventListener('click', () => {
            sidebar.classList.toggle('active');
        });
    }

    // =========================================
    // LOGOUT
    // =========================================

    const logoutButton = $('logoutButton');

    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            if (!confirm('Deseja realmente sair da sua conta?')) {
                return;
            }

            try {
                if (window.Auth && typeof Auth.sair === 'function') {
                    Auth.sair();
                } else {
                    window.location.href = 'logout.php';
                }
            } catch (erro) {
                console.error('Erro ao sair:', erro);
                window.location.href = 'logout.php';
            }
        });
    }

    // =========================================
    // INICIALIZAÇÃO
    // =========================================

    carregarDashboard();
    carregarDoacoes();

});
