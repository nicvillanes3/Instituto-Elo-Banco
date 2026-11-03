
document.addEventListener("DOMContentLoaded", function () {

    const links = document.querySelectorAll(
        ".barra-lateral a[data-secao]"
    );

    const secoes = document.querySelectorAll(".secao-admin");

    function abrirSecao(nome) {

        let secaoAtiva = document.getElementById(nome);

        // Se a seção não existir, abre a visão geral.
        if (!secaoAtiva || !secaoAtiva.classList.contains("secao-admin")) {
            nome = "inicio";
            secaoAtiva = document.getElementById("inicio");
        }

        // Esconde todas as seções.
        secoes.forEach(secao => {
            secao.classList.remove("ativa");
        });

        // Remove a seleção de todos os links.
        links.forEach(link => {
            link.classList.remove("active");
        });

        // Mostra somente a seção escolhida.
        secaoAtiva.classList.add("ativa");

        // Destaca o link correspondente.
        const linkAtivo = document.querySelector(
            `.barra-lateral a[data-secao="${nome}"]`
        );

        if (linkAtivo) {
            linkAtivo.classList.add("active");
        }

        // Fecha o menu mobile após a seleção.
        const sidebar = document.getElementById("sidebar");

        if (sidebar) {
            sidebar.classList.remove("open");
        }
    }

    // Clique nos itens do menu.
    links.forEach(link => {

        link.addEventListener("click", function (evento) {

            evento.preventDefault();

            const nome = this.dataset.secao;

            // Atualiza o endereço e permite voltar/avançar no navegador.
            if (window.location.hash !== "#" + nome) {
                window.location.hash = nome;
            } else {
                abrirSecao(nome);
            }

        });

    });

    // Permite trocar de seção pelo endereço e pelos botões voltar/avançar.
    window.addEventListener("hashchange", function () {

        const nome = window.location.hash.replace("#", "");

        abrirSecao(nome || "inicio");

    });

    // Abre a seção indicada no endereço ao carregar a página.
    const secaoInicial = window.location.hash.replace("#", "");

    abrirSecao(secaoInicial || "inicio");

});
