document.addEventListener('DOMContentLoaded', () => {

    const feedback = document.getElementById('feedback');
    const refreshButton = document.getElementById('refreshButton');
    const campaignTable = document.getElementById('campaignTable');

    function money(value) {
        return Number(value || 0).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        });
    }

    function showFeedback(message, type = 'error') {
        if (!feedback) return;

        feedback.textContent = message;
        feedback.className = `alert ${type}`;
        feedback.hidden = false;
    }

    function hideFeedback() {
        if (!feedback) return;

        feedback.hidden = true;
        feedback.textContent = '';
    }

    function setText(id, value) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = value;
        }
    }

    // Renderiza as campanhas
    function renderCampaigns(projects) {
        if (!campaignTable) return;

        campaignTable.replaceChildren();

        if (!Array.isArray(projects) || projects.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');

            cell.colSpan = 4;
            cell.className = 'empty-cell';
            cell.textContent = 'Nenhuma campanha cadastrada.';

            row.appendChild(cell);
            campaignTable.appendChild(row);

            return;
        }

        projects.forEach(project => {
            const row = document.createElement('tr');

            const title = document.createElement('td');
            const raised = document.createElement('td');
            const elo = document.createElement('td');
            const actions = document.createElement('td');

            title.textContent = project.titulo || `Projeto #${project.id}`;
            raised.textContent = money(project.total_arrecadado);
            elo.textContent = money(project.total_elo);

            const deleteButton = document.createElement('button');

            deleteButton.type = 'button';
            deleteButton.className = 'btn-excluir-campanha';
            deleteButton.dataset.id = project.id;
            deleteButton.textContent = 'Excluir';

            actions.appendChild(deleteButton);

            row.append(title, raised, elo, actions);
            campaignTable.appendChild(row);
        });
    }

    // Carrega os dados do painel
    async function loadDashboard() {
        hideFeedback();

        if (refreshButton) {
            refreshButton.disabled = true;
            refreshButton.textContent = 'Carregando...';
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

            const data = await response.json();

            if (!response.ok || !data.sucesso) {
                throw new Error(
                    data.mensagem || 'Não foi possível carregar os dados.'
                );
            }

            const finance = data.financeiro || {};

            setText('totalElo', money(finance.total_elo));
            setText('totalArrecadado', money(finance.total_arrecadado));
            setText('totalCampanhas', money(finance.total_campanhas));

            setText(
                'totalProjetos',
                Number(data.total_projetos || 0).toLocaleString('pt-BR')
            );

            setText(
                'totalUsuarios',
                Number(data.total_usuarios || 0).toLocaleString('pt-BR')
            );

            setText('legendElo', money(finance.total_elo));
            setText('legendCampanhas', money(finance.total_campanhas));

            setText(
                'summaryUsers',
                Number(data.total_usuarios || 0).toLocaleString('pt-BR')
            );

            setText(
                'summaryProjects',
                Number(data.total_projetos || 0).toLocaleString('pt-BR')
            );

            setText('summaryDonations', money(finance.total_arrecadado));

            const count = Array.isArray(data.projetos)
                ? data.projetos.length
                : 0;

            setText(
                'campaignCount',
                `${count} ${count === 1 ? 'campanha' : 'campanhas'}`
            );

            renderCampaigns(data.projetos || []);

        } catch (error) {
            console.error(error);

            showFeedback(
                error.message || 'Erro ao carregar o painel.'
            );

            if (campaignTable) {
                campaignTable.innerHTML = `
                    <tr>
                        <td colspan="4" class="empty-cell">
                            Não foi possível carregar as campanhas.
                        </td>
                    </tr>
                `;
            }

        } finally {
            if (refreshButton) {
                refreshButton.disabled = false;
                refreshButton.innerHTML =
                    '<i class="fa-solid fa-rotate"></i> Atualizar dados';
            }
        }
    }

    // Exclui uma campanha
    async function excluirCampanha(id, button) {
        const confirmar = confirm(
            'Tem certeza de que deseja excluir esta campanha? Ela deixará de aparecer publicamente, mas os registros financeiros serão preservados.'
        );

        if (!confirmar) return;

        button.disabled = true;
        button.textContent = 'Excluindo...';

        try {
            const response = await fetch('excluir_campanha.php', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ id: id })
            });

            const data = await response.json();

            if (!response.ok || !data.sucesso) {
                throw new Error(
                    data.mensagem || 'Não foi possível excluir a campanha.'
                );
            }

            showFeedback(data.mensagem, 'success');

            await loadDashboard();

        } catch (error) {
            showFeedback(
                error.message || 'Erro ao excluir campanha.'
            );

            button.disabled = false;
            button.textContent = 'Excluir';
        }
    }

    // Evento dos botões de exclusão
    if (campaignTable) {
        campaignTable.addEventListener('click', event => {
            const button = event.target.closest('.btn-excluir-campanha');

            if (!button) return;

            excluirCampanha(button.dataset.id, button);
        });
    }

    // Atualizar painel
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
    document.querySelectorAll('.barra-lateral a[data-secao]').forEach(link => {
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

    // Carrega os dados ao abrir a página
    loadDashboard();

});