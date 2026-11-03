
document.addEventListener('DOMContentLoaded', () => {

    const feedback = document.getElementById('feedback');
    const refreshButton = document.getElementById('refreshButton');
    const campaignTable = document.getElementById('campaignTable');

    // Formata valores em reais
    const money = (value) => {
        const number = Number(value || 0);

        return number.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    };

    // Exibe mensagens na tela
    function showFeedback(message, type = 'error') {

        if (!feedback) return;

        feedback.textContent = message;
        feedback.className = `alert ${type}`;
        feedback.hidden = false;
    }

    // Esconde mensagens
    function hideFeedback() {

        if (!feedback) return;

        feedback.hidden = true;
        feedback.textContent = '';
    }

    // Atualiza textos do painel
    function setText(id, value) {

        const element = document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    }

    // Mostra as campanhas na tabela
    function renderCampaigns(projects) {

        if (!campaignTable) return;

        campaignTable.replaceChildren();

        if (!Array.isArray(projects) || projects.length === 0) {

            const row = document.createElement('tr');
            const cell = document.createElement('td');

            cell.colSpan = 3;
            cell.className = 'empty-cell';
            cell.textContent = 'Nenhuma campanha cadastrada.';

            row.appendChild(cell);
            campaignTable.appendChild(row);

            return;
        }

        projects.forEach((project) => {

            const row = document.createElement('tr');

            const title = document.createElement('td');
            const raised = document.createElement('td');
            const elo = document.createElement('td');

            title.textContent = project.titulo || `Projeto #${project.id}`;

            raised.textContent = money(project.total_arrecadado);

            elo.textContent = money(project.total_elo);

            row.append(title, raised, elo);

            campaignTable.appendChild(row);

        });
    }

    // Busca os dados no PHP
    async function loadDashboard() {

        hideFeedback();

        if (refreshButton) {
            refreshButton.disabled = true;
            refreshButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Carregando...';
        }

        try {

            const response = await fetch('dados_admin.php', {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    'Accept': 'application/json'
                },
                cache: 'no-store'
            });

            let data;

            try {
                data = await response.json();
            } catch {
                throw new Error(
                    'O servidor não retornou JSON válido. Confira o PHP.'
                );
            }

            if (!response.ok || !data.sucesso) {
                throw new Error(
                    data.mensagem || 'Não foi possível carregar os dados.'
                );
            }

            const finance = data.financeiro || {};

            // Indicadores financeiros
            setText('totalElo', money(finance.total_elo));

            setText(
                'totalArrecadado',
                money(finance.total_arrecadado)
            );

            setText(
                'totalCampanhas',
                money(finance.total_campanhas)
            );

            // Quantidade de projetos e usuários
            setText(
                'totalProjetos',
                Number(data.total_projetos || 0).toLocaleString('pt-BR')
            );

            setText(
                'totalUsuarios',
                Number(data.total_usuarios || 0).toLocaleString('pt-BR')
            );

            // Valores da legenda financeira
            setText('legendElo', money(finance.total_elo));

            setText(
                'legendCampanhas',
                money(finance.total_campanhas)
            );

            // Resumo de usuários e campanhas
            setText(
                'summaryUsers',
                Number(data.total_usuarios || 0).toLocaleString('pt-BR')
            );

            setText(
                'summaryProjects',
                Number(data.total_projetos || 0).toLocaleString('pt-BR')
            );

            setText(
                'summaryDonations',
                money(finance.total_arrecadado)
            );

            // Quantidade de campanhas
            const count = Array.isArray(data.projetos)
                ? data.projetos.length
                : 0;

            setText(
                'campaignCount',
                `${count} ${count === 1 ? 'campanha' : 'campanhas'}`
            );

            // Tabela de campanhas
            renderCampaigns(data.projetos || []);

            showFeedback(
                'Dados atualizados com sucesso.',
                'success'
            );

        } catch (error) {

            showFeedback(
                error.message || 'Erro ao carregar o painel.'
            );

            if (campaignTable) {

                campaignTable.innerHTML = `
                    <tr>
                        <td colspan="3" class="empty-cell">
                            Não foi possível carregar as campanhas.
                        </td>
                    </tr>
                `;

            }

        } finally {

            if (refreshButton) {
                refreshButton.disabled = false;
                refreshButton.innerHTML = '<i class="fa-solid fa-rotate"></i> Atualizar dados';
            }

        }
    }

    // Botão atualizar
    if (refreshButton) {
        refreshButton.addEventListener('click', loadDashboard);
    }

    // Menu para celular
    const mobileMenu = document.getElementById('mobileMenu');
    const sidebar = document.getElementById('sidebar');

    if (mobileMenu && sidebar) {

        mobileMenu.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

    }

    // Navegação lateral
    document.querySelectorAll('.barra-lateral a[data-secao]').forEach((link) => {

        link.addEventListener('click', () => {

            if (sidebar) {
                sidebar.classList.remove('open');
            }

        });

    });

    // Sair da conta
    const logoutButton = document.getElementById('logoutButton');

    if (logoutButton) {

        logoutButton.addEventListener('click', () => {

            if (window.Auth && typeof Auth.sair === 'function') {
                Auth.sair();
            } else {
                console.error('A função Auth.sair() não está disponível.');
            }

        });

    }

    // Carrega os dados assim que a página abre
    loadDashboard();

});
