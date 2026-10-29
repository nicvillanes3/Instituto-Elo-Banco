
document.addEventListener("DOMContentLoaded", async function () {

    const POR_PAGINA = 3;
    const RASCUNHOS = [];

    const $ = id => document.getElementById(id);

    const esc = texto => String(texto ?? "").replace(/[&<>"']/g, caractere => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[caractere]));

    const num = valor => Number(valor || 0).toLocaleString("pt-BR", {
        maximumFractionDigits: 0
    });

    const moeda = valor => "R$ " + num(valor);

    function dataBR(data) {
        if (!data) return "—";

        const somenteData = String(data).substring(0, 10);
        const partes = somenteData.split("-");

        if (partes.length !== 3) return "—";

        return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    function aviso(texto) {
        const el = $("aviso");

        if (!el) return;

        el.textContent = texto;
        el.classList.add("visivel");

        setTimeout(() => el.classList.remove("visivel"), 2500);
    }

    // ===== Categorias e cores =====

    const coresCategorias = {
        "Educação": "#E8F1FF",
        "Tecnologia": "#EDE7FF",
        "Meio ambiente": "#DDF7E8",
        "Saúde": "#FFE8E8",
        "Arte e cultura": "#FFF0D9",
        "Esporte": "#E1F5FE"
    };

    // ===== Carregar projetos reais do banco =====

    let meus = [];

    try {
        const resposta = await fetch("meus_projetos.php", {
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

        if (!resposta.ok) {
            throw new Error(dados.erro || "Não foi possível carregar os projetos.");
        }

        if (!Array.isArray(dados)) {
            throw new Error(dados.erro || "O PHP não retornou uma lista de projetos.");
        }

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        meus = dados.map(p => {
            const meta = Number(p.meta ?? 0);
            const arrecadado = Number(p.arrecadado ?? 0);
            const percentual = meta > 0
                ? Math.round((arrecadado / meta) * 100)
                : 0;

            const dataFim = p.data_fim
                ? new Date(String(p.data_fim).substring(0, 10) + "T00:00:00")
                : null;

            const statusBanco = String(p.status || "").toLowerCase();

            const statusConcluido = [
                "concluido",
                "concluído",
                "encerrado",
                "finalizado"
            ].includes(statusBanco);

            const prazoEncerrado = dataFim &&
                !Number.isNaN(dataFim.getTime()) &&
                dataFim < hoje;

            const concluido = statusConcluido ||
                Boolean(prazoEncerrado) ||
                percentual >= 100;

            let dias = 0;

            if (dataFim && !Number.isNaN(dataFim.getTime())) {
                dias = Math.max(
                    0,
                    Math.ceil((dataFim - hoje) / (1000 * 60 * 60 * 24))
                );
            }

            return {
                id: Number(p.id),
                titulo: p.titulo || "Projeto sem título",
                desc: p.desc || p.descricao || "",
                categoria: p.categoria || "Outros",
                cor: coresCategorias[p.categoria] || "#F1F5F9",
                img: p.img || p.imagem || "",
                arrecadado,
                meta,
                pct: percentual,
                apoiadores: Number(p.apoiadores ?? 0),
                dias,
                concluido,
                criadoEm: p.criadoEm || p.criado_em || "",
                concluidoEm: p.concluidoEm || null,
                data_inicio: p.data_inicio || null,
                data_fim: p.data_fim || null,
                status: p.status || ""
            };
        });

    } catch (erro) {
        console.error("Erro ao carregar projetos:", erro);

        const lista = $("listaProjetos");

        if (lista) {
            lista.innerHTML = `
                <div class="vazio">
                    <p>Não foi possível carregar seus projetos.</p>
                    <p>Verifique sua conexão com o banco de dados e tente novamente.</p>
                    <button type="button" class="btn-azul" id="tentarNovamente">
                        Tentar novamente
                    </button>
                </div>
            `;

            $("tentarNovamente")?.addEventListener("click", () => {
                window.location.reload();
            });
        }

        return;
    }

    // ===== Resumo =====

    const ativos = meus.filter(p => !p.concluido);
    const concluidos = meus.filter(p => p.concluido);

    const somaMetas = meus.reduce((s, p) => s + p.meta, 0);
    const somaArrecadado = meus.reduce((s, p) => s + p.arrecadado, 0);

    $("resTotal").textContent = meus.length;
    $("resAtivos").textContent = ativos.length;
    $("resMetas").textContent = moeda(somaMetas);
    $("resArrecadado").textContent = moeda(somaArrecadado);

    $("resPct").textContent =
        (somaMetas
            ? Math.round((somaArrecadado / somaMetas) * 100)
            : 0) + "% do total das metas";

    $("contTodos").textContent = meus.length;
    $("contAndamento").textContent = ativos.length;
    $("contConcluidos").textContent = concluidos.length;
    $("contRascunhos").textContent = RASCUNHOS.length;

    // ===== Estado da lista =====

    let filtro = "todos";
    let ordem = "recentes";
    let pagina = 1;

    function filtrados() {
        let lista = meus.filter(p =>
            filtro === "todos" ||
            (filtro === "andamento" && !p.concluido) ||
            (filtro === "concluidos" && p.concluido)
        );

        if (filtro === "rascunhos") {
            lista = RASCUNHOS;
        }

        const copia = [...lista];

        if (ordem === "recentes") {
            copia.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
        } else if (ordem === "antigos") {
            copia.sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));
        } else if (ordem === "arrecadado") {
            copia.sort((a, b) => b.arrecadado - a.arrecadado);
        } else if (ordem === "progresso") {
            copia.sort((a, b) => b.pct - a.pct);
        }

        return copia;
    }

    // ===== Cartão de um projeto =====

    function cartao(p) {
        const largura = Math.max(0, Math.min(100, p.pct));

        const imagem = p.img
            ? `background-image:url('${esc(p.img).replace(/\\/g, "\\\\").replace(/'/g, "\\'")}')`
            : "background-color:#E8F1FF";

        const lateralDias = p.concluido
            ? `
                <div class="concluido-em">
                    <small>Concluído em</small>
                    <span>
                        <i class="fa-regular fa-calendar"></i>
                        ${p.concluidoEm ? dataBR(p.concluidoEm) : "—"}
                    </span>
                </div>
            `
            : `
                <div class="dias">
                    <strong>${p.dias}</strong>
                    <small>dias restantes</small>
                </div>
            `;

        return `
            <article class="projeto" data-id="${p.id}">

                <a href="projeto.html?id=${p.id}"
                   class="projeto-foto"
                   style="${imagem}"
                   aria-label="Abrir ${esc(p.titulo)}">
                </a>

                <div class="projeto-info">
                    <h2>${esc(p.titulo)}</h2>
                    <p>${esc(p.desc)}</p>
                    <span class="tag" style="background:${esc(p.cor)}">
                        ${esc(p.categoria)}
                    </span>
                </div>

                <div class="projeto-valores">
                    <div class="valores-topo">
                        <div>
                            <strong>${num(p.arrecadado)}</strong>
                            <small>arrecadados</small>
                        </div>
                        <div>
                            <strong>${p.pct}%</strong>
                            <small>da meta</small>
                        </div>
                    </div>

                    <div class="barra">
                        <div style="width:${largura}%"></div>
                    </div>

                    <small class="meta">Meta: ${moeda(p.meta)}</small>
                </div>

                <div class="projeto-apoio">
                    <div class="apoiadores">
                        <strong>
                            <i class="fa-solid fa-user-group"></i>
                            ${p.apoiadores}
                        </strong>
                        <small>apoiadores</small>
                    </div>

                    ${lateralDias}
                </div>

                <div class="projeto-acoes">
                    <span class="status ${p.concluido ? "concluido" : ""}">
                        ${p.concluido ? "Concluído" : "Em andamento"}
                    </span>

                    <small class="criado">
                        criado em ${dataBR(p.criadoEm)}
                    </small>

                    <div class="botoes">
                        <a href="projeto.html?id=${p.id}" class="btn-mini">
                            ver projeto
                        </a>

                        <a href="criador.html?id=${p.id}" class="btn-mini">
                            desempenho
                        </a>

                        <div class="menu-mais">
                            <button type="button"
                                    class="btn-mini btn-mais"
                                    aria-label="Mais opções"
                                    aria-haspopup="true">
                                …
                            </button>

                            <div class="menu-lista" hidden>
                                <a href="criarCampanha.html?id=${p.id}">
                                    <i class="fa-solid fa-pencil"></i>
                                    Editar campanha
                                </a>

                                <button type="button" data-copiar="${p.id}">
                                    <i class="fa-solid fa-link"></i>
                                    Copiar link
                                </button>

                                <a href="criador.html?id=${p.id}">
                                    <i class="fa-solid fa-chart-column"></i>
                                    Ver relatórios
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

            </article>
        `;
    }

    // ===== Renderização =====

    function renderizar() {
        const lista = filtrados();
        const totalPaginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));

        if (pagina > totalPaginas) {
            pagina = totalPaginas;
        }

        const inicio = (pagina - 1) * POR_PAGINA;
        const visiveis = lista.slice(inicio, inicio + POR_PAGINA);

        if (visiveis.length) {
            $("listaProjetos").innerHTML = visiveis.map(cartao).join("");
        } else {
            const mensagens = {
                rascunhos: "Você não tem nenhum rascunho no momento.",
                andamento: "Nenhum projeto em andamento.",
                concluidos: "Nenhum projeto concluído ainda.",
                todos: "Você ainda não criou nenhum projeto."
            };

            $("listaProjetos").innerHTML = `
                <div class="vazio">
                    <p>${mensagens[filtro]}</p>
                    <a href="criarCampanha.html" class="btn-azul">
                        Criar nova campanha
                    </a>
                </div>
            `;
        }

        const primeiro = lista.length ? inicio + 1 : 0;
        const ultimo = Math.min(inicio + POR_PAGINA, lista.length);

        $("textoPaginacao").textContent =
            `Mostrando ${primeiro} a ${ultimo} de ${lista.length} projetos`;

        let botoes = `
            <button type="button" class="pag"
                    data-pag="anterior"
                    aria-label="Página anterior"
                    ${pagina === 1 ? "disabled" : ""}>
                <i class="fa-solid fa-chevron-left"></i>
            </button>
        `;

        for (let i = 1; i <= totalPaginas; i++) {
            botoes += `
                <button type="button"
                        class="pag ${i === pagina ? "ativo" : ""}"
                        data-pag="${i}">
                    ${i}
                </button>
            `;
        }

        botoes += `
            <button type="button" class="pag"
                    data-pag="proxima"
                    aria-label="Próxima página"
                    ${pagina === totalPaginas ? "disabled" : ""}>
                <i class="fa-solid fa-chevron-right"></i>
            </button>
        `;

        $("botoesPaginacao").innerHTML = botoes;
    }

    // ===== Eventos dos filtros =====

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

    $("ordenacao").addEventListener("change", e => {
        ordem = e.target.value;
        pagina = 1;
        renderizar();
    });

    $("botoesPaginacao").addEventListener("click", e => {
        const botao = e.target.closest(".pag");

        if (!botao || botao.disabled) return;

        const valor = botao.dataset.pag;

        if (valor === "anterior") {
            pagina--;
        } else if (valor === "proxima") {
            pagina++;
        } else {
            pagina = Number(valor);
        }

        renderizar();
    });

    // ===== Menu de opções =====

    function fecharMenus() {
        document.querySelectorAll(".menu-lista").forEach(menu => {
            menu.hidden = true;
        });
    }

    $("listaProjetos").addEventListener("click", async e => {
        const botaoMais = e.target.closest(".btn-mais");

        if (botaoMais) {
            const menu = botaoMais.nextElementSibling;
            const abrir = menu.hidden;

            fecharMenus();
            menu.hidden = !abrir;

            return;
        }

        const copiar = e.target.closest("[data-copiar]");

        if (copiar) {
            const url = new URL(
                "projeto.html?id=" + copiar.dataset.copiar,
                window.location.href
            ).href;

            try {
                await navigator.clipboard.writeText(url);
                aviso("Link do projeto copiado!");
            } catch (erro) {
                aviso("Não foi possível copiar o link.");
            }

            fecharMenus();
        }
    });

    document.addEventListener("click", e => {
        if (!e.target.closest(".menu-mais")) {
            fecharMenus();
        }
    });

    document.addEventListener("keydown", e => {
        if (e.key === "Escape") {
            fecharMenus();
        }
    });

    // ===== Iniciar página =====

    renderizar();

});
