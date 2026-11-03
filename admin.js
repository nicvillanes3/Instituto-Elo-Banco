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
        feedback.textContent = message;
        feedback.className = `alert ${type}`;
        feedback.hidden = false;
    }

    function hideFeedback() {
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

        refreshButton.disabled = true;
        refreshButton.textContent = 'Carregando...';

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

            // Valores da legenda
            setText('legendElo', money(finance.total_elo));

            setText(
                'legendCampanhas',
                money(finance.total_campanhas)
            );

            // Resumo do sistema
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

            campaignTable.innerHTML = `
                <tr>
                    <td colspan="3" class="empty-cell">
                        Não foi possível carregar as campanhas.
                    </td>
                </tr>
            `;

        } finally {

            refreshButton.disabled = false;
            refreshButton.textContent = '↻ Atualizar dados';

        }
    }

    // Botão atualizar
    refreshButton.addEventListener('click', loadDashboard);

    // Menu para celular
    document.getElementById('mobileMenu').addEventListener('click', () => {

        document.getElementById('sidebar').classList.toggle('open');

    });

    // Navegação lateral
    document.querySelectorAll('.nav-item').forEach((link) => {

        link.addEventListener('click', () => {

            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });

            link.classList.add('active');

            document.getElementById('sidebar').classList.remove('open');

        });

    });

    // Sair da conta
    document.getElementById('logoutButton').addEventListener('click', () => {

        window.location.href = 'logout.php';

    });

    // Carrega os dados assim que a página abre
    loadDashboard();

});