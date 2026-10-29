
document.addEventListener("DOMContentLoaded", async function () {
    const POR_PAGINA = 6;

    const $ = id => document.getElementById(id);

    const esc = valor =>
        String(valor ?? "").replace(/[&<>"']/g, c => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[c]));

    const moeda = valor =>
        Number(valor || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });

    const dataBR = data => {
        if (!data) return "—";

        const partes = String(data).slice(0, 10).split("-");
        if (partes.length !== 3) return "—";

        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    };

    let doacoes = [];
    let filtro = "todas";
    let ordem = "recentes";
    let pagina = 1;

    function projetoConcluido(doacao) {
        const status = String(doacao.status_projeto || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();

        return status.includes("conclu");
    }

    function atualizarResumo() {
        // Somente doações confirmadas contam como apoio efetivo.
        const confirmadas = doacoes.filter(
            d => d.status_doacao === "confirmada"
        );

        const total = confirmadas.reduce(
            (soma, d) => soma + Number(d.valor || 0),
            0
        );

        const projetosDiferentes = new Set(
            confirmadas.map(d => d.projeto_id)
        ).size;

        const concluidos = new Set(
            confirmadas
                .filter(projetoConcluido)
                .map(d => d.projeto_id)
        ).size;

        $("resTotal").textContent = moeda(total);
        $("resTotalSub").textContent =
            `em ${confirmadas.length} ${
                confirmadas.length === 1 ? "doação confirmada" : "doações confirmadas"
            }`;

        $("resProjetos").textContent = projetosDiferentes;
        $("resDoacoes").textContent = doacoes.length;

        $("resConcluidos").textContent = concluidos;
        $("resConcluidosSub").textContent =
            concluidos === 1 ? "projeto concluído" : "projetos concluídos";
    }

    function filtradas() {
        const lista = doacoes.filter(d => {
            if (filtro === "andamento") {
                return !projetoConcluido(d);
            }

            if (filtro === "concluido") {
                return projetoConcluido(d);
            }

            return true;
        });

        lista.sort((a, b) => {
            if (ordem === "recentes") {
                return String(b.criado_em).localeCompare(String(a.criado_em));
            }

            if (ordem === "antigas") {
                return String(a.criado_em).localeCompare(String(b.criado_em));
            }

            return Number(b.valor) - Number(a.valor);
        });

        return lista;
    }

    function linha(d) {
        const titulo = esc(d.titulo || "Projeto sem título");
        const descricao = esc(d.descricao || "Sem descrição disponível");
        const imagem = esc(d.imagem || "");
        const valor = moeda(d.valor);
        const data = dataBR(d.criado_em);

        const reembolsada = [
            "reembolsada",
            "reembolsado"
        ].includes(String(d.status_doacao || "").toLowerCase());

        let status;

        if (reembolsada) {
            status = `
                <span class="status concluido">
                    Doação reembolsada
                </span>`;
        } else if (projetoConcluido(d)) {
            status = `
                <span class="status concluido">
                    Projeto concluído
                    <i class="fa-solid fa-award"></i>
                </span>`;
        } else {
            status = `
                <span class="status">
                    Doação confirmada
                </span>`;
        }

        return `
            <a href="projeto.html?id=${encodeURIComponent(d.projeto_id)}"
               class="doacao">

                <div class="doacao-foto"
                     ${imagem ? `style="background-image: url('${imagem}')"` : ""}
                     role="img"
                     aria-label="Imagem de ${titulo}">
                </div>

                <div class="doacao-projeto">
                    <strong>${titulo}</strong>
                    <small>${descricao}</small>
                </div>

                <span class="doacao-valor">${valor}</span>
                <span class="doacao-data">${data}</span>
                <span class="doacao-status">${status}</span>
                <i class="fa-solid fa-chevron-right seta"></i>
            </a>`;
    }

    function renderizar() {
        const lista = filtradas();
        const totalPaginas = Math.max(
            1,
            Math.ceil(lista.length / POR_PAGINA)
        );

        if (pagina > totalPaginas) pagina = totalPaginas;

        const inicio = (pagina - 1) * POR_PAGINA;
        const visiveis = lista.slice(inicio, inicio + POR_PAGINA);

        $("listaDoacoes").innerHTML = visiveis.length
            ? visiveis.map(linha).join("")
            : `
                <div class="vazio">
                    <p>
                        ${doacoes.length
                            ? "Nenhuma doação encontrada nesta categoria."
                            : "Você ainda não possui doações registradas."}
                    </p>
                    <a href="explorar.html" class="btn-azul">
                        Explorar projetos
                    </a>
                </div>`;

        const primeiro = lista.length ? inicio + 1 : 0;
        const ultimo = Math.min(inicio + POR_PAGINA, lista.length);

        $("textoPaginacao").textContent =
            `Mostrando ${primeiro} a ${ultimo} de ${lista.length} doações`;

        let botoes = `
            <button type="button" class="pag"
                data-pag="anterior"
                aria-label="Página anterior"
                ${pagina === 1 ? "disabled" : ""}>
                <i class="fa-solid fa-chevron-left"></i>
            </button>`;

        for (let i = 1; i <= totalPaginas; i++) {
            botoes += `
                <button type="button"
                    class="pag ${i === pagina ? "ativo" : ""}"
                    data-pag="${i}">
                    ${i}
                </button>`;
        }

        botoes += `
            <button type="button" class="pag"
                data-pag="proxima"
                aria-label="Próxima página"
                ${pagina === totalPaginas ? "disabled" : ""}>
                <i class="fa-solid fa-chevron-right"></i>
            </button>`;

        $("botoesPaginacao").innerHTML = botoes;
    }

    function mostrarErro(mensagem) {
        $("listaDoacoes").innerHTML = `
            <div class="vazio">
                <p>${esc(mensagem)}</p>
                <button type="button" class="btn-azul"
                    id="tentarNovamente">
                    Tentar novamente
                </button>
            </div>`;

        $("tentarNovamente").addEventListener("click", carregarDoacoes);
    }

    async function carregarDoacoes() {
        $("listaDoacoes").innerHTML = `
            <div class="vazio">
                <p>Carregando suas doações...</p>
            </div>`;

        try {
            const resposta = await fetch("minhas_doacoes.php", {
                method: "GET",
                credentials: "same-origin",
                headers: {
                    "Accept": "application/json"
                },
                cache: "no-store"
            });

            const dados = await resposta.json();

            if (resposta.status === 401) {
                window.location.href = "login.html";
                return;
            }

            if (!resposta.ok || !dados.sucesso) {
                throw new Error(
                    dados.mensagem || "Não foi possível carregar as doações."
                );
            }

            doacoes = (dados.doacoes || []).map(d => ({
                ...d,
                valor: Number(d.valor || 0),
                projeto_id: Number(d.projeto_id)
            }));

            atualizarResumo();
            renderizar();

        } catch (erro) {
            console.error("Erro ao carregar doações:", erro);
            mostrarErro(
                erro.message || "Erro ao carregar as doações. Tente novamente."
            );
        }
    }

    document.querySelectorAll(".aba").forEach(aba => {
        aba.addEventListener("click", () => {
            document.querySelectorAll(".aba").forEach(a =>
                a.classList.remove("ativo")
            );

            aba.classList.add("ativo");
            filtro = aba.dataset.filtro;
            pagina = 1;
            renderizar();
        });
    });

    $("ordenacao").addEventListener("change", evento => {
        ordem = evento.target.value;
        pagina = 1;
        renderizar();
    });

    $("botoesPaginacao").addEventListener("click", evento => {
        const botao = evento.target.closest(".pag");

        if (!botao || botao.disabled) return;

        const valor = botao.dataset.pag;

        if (valor === "anterior") pagina--;
        else if (valor === "proxima") pagina++;
        else pagina = Number(valor);

        renderizar();
    });

    await carregarDoacoes();
});
