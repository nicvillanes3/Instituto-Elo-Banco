
(function () {
    "use strict";

    // =====================================================
    // CONFIGURAÇÕES
    // =====================================================

    const CHAVE_SESSAO = "eloSessao";
    const PAGINA_LOGIN = "login.html";
    const PAGINA_INICIAL = "index.html";
    const PAGINA_EXPLORAR = "explorar.html";
    const PAGINA_CRIAR_CAMPANHA = "criarCampanha1.html";

    const PAGINAS_PRIVADAS = [
        "perfil.html",
        "criador.html",
        "projetos.html",
        "doacoes.html",
        "favoritos.html",
        "notificacoes.html",
        "configuracoes.html",
        "criarcampanha.html",
        "criarcampanha1.html",
        "pagamentopix.html",
        "pagamentoboleto.html",
        "pagamentocartao.html",
        "doacaofi.html"
    ];

    const PAGINAS_VISITANTES = [
        "login.html",
        "cadastro.html",
        "criarconta.html",
        "esquecisenha.html"
    ];

    // =====================================================
    // SESSÃO DO USUÁRIO
    // =====================================================

    function lerSessao() {
        try {
            const dados = localStorage.getItem(CHAVE_SESSAO);

            if (!dados) {
                return null;
            }

            const usuario = JSON.parse(dados);

            return usuario && typeof usuario === "object"
                ? usuario
                : null;

        } catch (erro) {
            console.error("Erro ao ler a sessão:", erro);
            return null;
        }
    }

    const Auth = {

        // Verifica se existe um usuário conectado
        estaLogado() {
            const usuario = lerSessao();

            return Boolean(
                usuario &&
                (usuario.email || usuario.nome)
            );
        },

        // Retorna os dados do usuário conectado
        usuario() {
            return lerSessao();
        },

        // Salva os dados do usuário na sessão
        entrar(usuario) {
            if (!usuario || typeof usuario !== "object") {
                console.error("Dados de usuário inválidos.");
                return false;
            }

            try {
                const sessaoAnterior = lerSessao() || {};

                localStorage.setItem(
                    CHAVE_SESSAO,
                    JSON.stringify({
                        ...sessaoAnterior,
                        ...usuario,
                        entrouEm: Date.now()
                    })
                );

                return true;

            } catch (erro) {
                console.error("Erro ao salvar a sessão:", erro);
                return false;
            }
        },

        // Encerra a sessão e volta para a página inicial
        sair() {
            // Remove os dados que mantêm o usuário logado
            localStorage.removeItem(CHAVE_SESSAO);
            localStorage.removeItem("eloPerfil");
            localStorage.removeItem("eloFotoPerfil");

            // Avisa outras abas que a sessão foi encerrada
            window.dispatchEvent(
                new StorageEvent("storage", {
                    key: CHAVE_SESSAO,
                    oldValue: null,
                    newValue: null
                })
            );

            // Encerra também a sessão do servidor PHP
            window.location.replace("logout.php");
        },

        // Define para onde o usuário deve ir após o login
        destino() {
            const voltar = new URLSearchParams(
                window.location.search
            ).get("voltar");

            if (
                voltar &&
                /^[\w-]+\.html(?:\?[\w=&.%\-]*)?$/i.test(voltar)
            ) {
                return voltar;
            }

            return PAGINA_INICIAL;
        },

        // Redireciona para o destino definido
        irParaDestino() {
            window.location.href = this.destino();
        }
    };

    // Disponibiliza informações para outros scripts
    Auth.paginaInicial = PAGINA_INICIAL;
    Auth.paginaExplorar = PAGINA_EXPLORAR;

    // Disponibiliza o objeto Auth globalmente
    window.Auth = Auth;

    // =====================================================
    // IDENTIFICAR A PÁGINA ATUAL
    // =====================================================

    function obterNomePagina() {
        const caminho = window.location.pathname;
        const partes = caminho.split("/");

        return (partes.pop() || PAGINA_INICIAL).toLowerCase();
    }

    // =====================================================
    // PROTEÇÃO DE PÁGINAS
    // =====================================================

    function verificarAcesso() {
        const paginaAtual = obterNomePagina();

        // Login, cadastro e recuperação são páginas públicas
        if (PAGINAS_VISITANTES.includes(paginaAtual)) {
            return true;
        }

        const paginasPrivadas = PAGINAS_PRIVADAS.map(
            pagina => pagina.toLowerCase()
        );

        // Redireciona visitantes para o login
        if (
            paginasPrivadas.includes(paginaAtual) &&
            !Auth.estaLogado()
        ) {
            const destino =
                window.location.pathname.split("/").pop() +
                window.location.search;

            window.location.replace(
                PAGINA_LOGIN +
                "?voltar=" +
                encodeURIComponent(destino)
            );

            return false;
        }

        return true;
    }

    // =====================================================
    // HTML DA NAVBAR
    // =====================================================

    function htmlNavbar(logado) {
        const linkEntrar = !logado
            ? `
                <li>
                    <a href="login.html">Entrar</a>
                </li>
            `
            : "";

        const linkPerfil = logado
            ? `
                <li class="itemPerfil">
                    <a href="perfil.html" id="linkPerfil">
                        Perfil
                    </a>
                </li>

                <li class="itemIconePerfil">
                    <a
                        href="perfil.html"
                        class="iconePerfil"
                        aria-label="Abrir perfil"
                    >
                        <span class="material-symbols-outlined">
                            account_circle
                        </span>
                    </a>
                </li>
            `
            : "";

        return `
            <div class="nav-logo">
                <a href="index.html">
                    <img src="logoElo.jpeg" alt="Instituto Elo">
                </a>
            </div>

            <ul class="nav-links">
                <li>
                    <a href="explorar.html">Explorar</a>
                </li>

                <li>
                    <a href="explorar.html">Projetos</a>
                </li>

                <li>
                    <a href="index.html#como-funciona">
                        Como funciona
                    </a>
                </li>

                <li>
                    <a href="sobre.html">Sobre nós</a>
                </li>

                <li>
                    <div class="search-box">
                        <input
                            type="text"
                            id="buscaNavbar"
                            placeholder="Buscar projetos"
                            aria-label="Buscar projetos"
                        >

                        <button
                            type="button"
                            id="botaoBuscaNavbar"
                            aria-label="Pesquisar"
                        >
                            <span class="material-symbols-outlined">
                                search
                            </span>
                        </button>
                    </div>
                </li>

                ${linkEntrar}

                <li>
                    <input
                        type="button"
                        value="Criar Campanha"
                        id="botaoCampanha"
                    >
                </li>

                ${linkPerfil}
            </ul>
        `;
    }

    // =====================================================
    // BUSCA DA NAVBAR
    // =====================================================

    function ativarBusca(nav) {
        const campo = nav.querySelector("#buscaNavbar");
        const botao = nav.querySelector("#botaoBuscaNavbar");

        if (!campo || !botao) {
            return;
        }

        const parametros = new URLSearchParams(
            window.location.search
        );

        campo.value = parametros.get("busca") || "";

        function realizarBusca() {
            const termo = campo.value.trim();

            if (!termo) {
                campo.focus();
                return;
            }

            window.location.href =
                PAGINA_EXPLORAR +
                "?busca=" +
                encodeURIComponent(termo);
        }

        botao.addEventListener("click", realizarBusca);

        campo.addEventListener("keydown", function (evento) {
            if (evento.key === "Enter") {
                evento.preventDefault();
                realizarBusca();
            }
        });
    }

    // =====================================================
    // BOTÃO CRIAR CAMPANHA
    // =====================================================

    function ativarBotaoCampanha(nav) {
        const botao = nav.querySelector("#botaoCampanha");

        if (!botao) {
            return;
        }

        botao.addEventListener("click", function () {
            if (!Auth.estaLogado()) {
                window.location.href =
                    PAGINA_LOGIN +
                    "?voltar=" +
                    encodeURIComponent(PAGINA_CRIAR_CAMPANHA);

                return;
            }

            window.location.href = PAGINA_CRIAR_CAMPANHA;
        });
    }

    // =====================================================
    // RENDERIZAR NAVBAR
    // =====================================================

    function renderizarNavbar() {
        const marcador =
            document.getElementById("navbar") ||
            document.querySelector("nav.navbar");

        if (!marcador) {
            return;
        }

        // Evita renderizar a mesma navbar novamente
        if (marcador.dataset.authNavbar === "true") {
            return;
        }

        const nav = document.createElement("nav");

        nav.className = "navbar";
        nav.id = "navbar";
        nav.dataset.authNavbar = "true";

        const paginaAtual = obterNomePagina();

        // Nas páginas de visitante, mostra "Entrar"
        const estaNaPaginaVisitante =
            PAGINAS_VISITANTES.includes(paginaAtual);

        nav.innerHTML = htmlNavbar(
            estaNaPaginaVisitante ? false : Auth.estaLogado()
        );

        marcador.replaceWith(nav);

        ativarBusca(nav);
        ativarBotaoCampanha(nav);
    }

    // =====================================================
    // INICIALIZAÇÃO
    // =====================================================

    function iniciar() {
        verificarAcesso();
        renderizarNavbar();
    }

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            iniciar,
            { once: true }
        );
    } else {
        iniciar();
    }

    // =====================================================
    // ATUALIZAR NAVBAR QUANDO A SESSÃO MUDAR EM OUTRA ABA
    // =====================================================

    window.addEventListener("storage", function (evento) {
        if (evento.key !== CHAVE_SESSAO) {
            return;
        }

        const paginaAtual = obterNomePagina();

        if (PAGINAS_VISITANTES.includes(paginaAtual)) {
            return;
        }

        verificarAcesso();

        const navAtual =
            document.getElementById("navbar") ||
            document.querySelector("nav.navbar");

        if (!navAtual) {
            return;
        }

        const nav = document.createElement("nav");

        nav.className = "navbar";
        nav.id = "navbar";
        nav.dataset.authNavbar = "true";

        nav.innerHTML = htmlNavbar(Auth.estaLogado());

        navAtual.replaceWith(nav);

        ativarBusca(nav);
        ativarBotaoCampanha(nav);
    });

})();
