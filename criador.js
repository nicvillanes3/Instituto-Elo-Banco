
document.addEventListener("DOMContentLoaded", function () {
    // ==========================================
    // CONFIGURAÇÕES
    // ==========================================

    const $ = seletor => document.querySelector(seletor);

    const dinheiro = valor =>
        Number(valor || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });

    const numero = valor =>
        Number(valor || 0).toLocaleString("pt-BR");

    const escapar = texto =>
        String(texto ?? "").replace(/[&<>"']/g, caractere => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[caractere]);

    const percentual = projeto => {
        const meta = Number(projeto.meta) || 0;
        const arrecadado = Number(projeto.arrecadado) || 0;

        return meta > 0
            ? Math.min(100, Math.round(arrecadado / meta * 100))
            : 0;
    };

    let todosProjetos = [];
    let meusProjetos = [];
    let projetoSelecionado = null;
    let projetosExpandidos = false;

    // ==========================================
    // USUÁRIO
    // ==========================================

    function carregarNomeCriador() {
        const elemento = $("#nomeCriador");
        if (!elemento) return;

        let nome = "";

        try {
            if (window.Auth &&
                typeof window.Auth.usuario === "function") {
                nome = window.Auth.usuario()?.nome || "";
            }
        } catch (erro) {
            console.warn("Não foi possível carregar o usuário.", erro);
        }

        elemento.textContent = nome
            ? nome.split(" ")[0]
            : "Criador";
    }

    // ==========================================
    // RESUMO GERAL
    // ==========================================

    function atualizarResumo() {
        const arrecadado = meusProjetos.reduce(
            (total, p) => total + Number(p.arrecadado || 0), 0
        );

        const meta = meusProjetos.reduce(
            (total, p) => total + Number(p.meta || 0), 0
        );

        const apoiadores = meusProjetos.reduce(
            (total, p) => total + Number(p.apoiadores || 0), 0
        );

        const progresso = meta > 0
            ? Math.min(100, Math.round(arrecadado / meta * 100))
            : 0;

        if ($("#arrecadado")) {
            $("#arrecadado").textContent = dinheiro(arrecadado);
        }

        if ($("#deMeta")) {
            $("#deMeta").textContent = `de ${dinheiro(meta)}`;
        }

        if ($("#miniBarra")) {
            $("#miniBarra").style.width = `${progresso}%`;
        }

        if ($("#miniPct")) {
            $("#miniPct").textContent = `${progresso}% da meta`;
        }

        if ($("#apoiadores")) {
            $("#apoiadores").textContent = numero(apoiadores);
        }

        if ($("#visualizacoes")) {
            $("#visualizacoes").textContent = "—";
        }

        const ativos = meusProjetos.filter(p =>
            Number(p.arrecadado) < Number(p.meta) &&
            Number(p.dias) > 0
        );

        const diasRestantes = ativos.length
            ? Math.min(...ativos.map(p => Number(p.dias)))
            : 0;

        if ($("#dias")) {
            $("#dias").textContent = numero(diasRestantes);
        }
    }

    // ==========================================
    // SELETOR DO GRÁFICO
    // ==========================================

    function preencherSeletor() {
        const seletor = $("#projetoGrafico");
        if (!seletor) return;

        seletor.replaceChildren();

        if (!meusProjetos.length) {
            seletor.add(new Option("Nenhuma campanha encontrada", ""));
            projetoSelecionado = null;
            atualizarLinkProjeto();
            atualizarDesempenho();
            return;
        }

        meusProjetos.forEach(projeto => {
            seletor.add(new Option(
                projeto.titulo,
                String(projeto.id)
            ));
        });

        const parametros = new URLSearchParams(location.search);
        const idURL = Number(parametros.get("id"));

        const idInicial = meusProjetos.some(p => p.id === idURL)
            ? idURL
            : projetoSelecionado?.id || meusProjetos[0].id;

        seletor.value = String(idInicial);

        projetoSelecionado = meusProjetos.find(
            p => p.id === Number(seletor.value)
        ) || meusProjetos[0];

        seletor.onchange = function () {
            projetoSelecionado = meusProjetos.find(
                p => p.id === Number(this.value)
            ) || null;

            atualizarDesempenho();
            atualizarLinkProjeto();
        };
    }

    // ==========================================
    // DESEMPENHO DA CAMPANHA
    // ==========================================

    function atualizarDesempenho() {
        const p = projetoSelecionado;

        if (!p) {
            limparDesempenho();
            return;
        }

        const arrecadado = Number(p.arrecadado) || 0;
        const meta = Number(p.meta) || 0;
        const progresso = meta > 0
            ? Math.min(100, arrecadado / meta * 100)
            : 0;
        const falta = Math.max(0, meta - arrecadado);

        if ($("#graficoArrecadado")) {
            $("#graficoArrecadado").textContent = dinheiro(arrecadado);
        }

        if ($("#graficoMeta")) {
            $("#graficoMeta").textContent = dinheiro(meta);
        }

        if ($("#graficoPercentual")) {
            $("#graficoPercentual").textContent =
                `${Math.round(meta > 0 ? arrecadado / meta * 100 : 0)}%`;
        }

        if ($("#graficoFalta")) {
            $("#graficoFalta").textContent = falta > 0
                ? `Faltam ${dinheiro(falta)}`
                : "Meta alcançada!";
        }

        if ($("#graficoBarra")) {
            $("#graficoBarra").style.width = `${progresso}%`;
            $("#graficoBarra").setAttribute(
                "aria-valuenow", String(Math.round(progresso))
            );
            $("#graficoBarra").setAttribute("role", "progressbar");
            $("#graficoBarra").setAttribute("aria-valuemin", "0");
            $("#graficoBarra").setAttribute("aria-valuemax", "100");
        }

        desenharGrafico(p);
    }

    function limparDesempenho() {
        ["graficoArrecadado", "graficoMeta"].forEach(id => {
            const elemento = document.getElementById(id);
            if (elemento) elemento.textContent = dinheiro(0);
        });

        if ($("#graficoPercentual")) {
            $("#graficoPercentual").textContent = "0%";
        }

        if ($("#graficoFalta")) {
            $("#graficoFalta").textContent = "Nenhuma campanha selecionada";
        }

        if ($("#graficoBarra")) {
            $("#graficoBarra").style.width = "0%";
        }

        if ($("#graficoSvg")) {
            $("#graficoSvg").replaceChildren();
        }
    }

    function desenharGrafico(p) {
        const svg = $("#graficoSvg");
        if (!svg) return;

        const arrecadado = Number(p.arrecadado) || 0;
        const meta = Number(p.meta) || 0;
        const progresso = meta > 0
            ? Math.min(100, arrecadado / meta * 100)
            : 0;

        const largura = 560;
        const x = 40;
        const y1 = 66;
        const y2 = 142;
        const altura = 24;
        const larguraBarra = largura * progresso / 100;

        svg.setAttribute(
            "aria-label",
            `Desempenho de ${p.titulo}: ${dinheiro(arrecadado)} arrecadados de ${dinheiro(meta)}`
        );

        svg.innerHTML = `
            <title>${escapar(p.titulo)}</title>

            <text x="${x}" y="28" fill="#172033"
                font-size="15" font-weight="600">
                Arrecadação atual
            </text>

            <text x="${x + largura}" y="28"
                text-anchor="end" fill="#075BE8"
                font-size="15" font-weight="600">
                ${escapar(dinheiro(arrecadado))}
            </text>

            <rect x="${x}" y="${y1}" width="${largura}"
                height="${altura}" rx="8" fill="#E8F1FF"/>

            <rect x="${x}" y="${y1}" width="${larguraBarra}"
                height="${altura}" rx="8" fill="#075BE8"/>

            <text x="${x}" y="119" fill="#172033"
                font-size="15" font-weight="600">
                Meta da campanha
            </text>

            <text x="${x + largura}" y="119"
                text-anchor="end" fill="#172033"
                font-size="15" font-weight="600">
                ${escapar(dinheiro(meta))}
            </text>

            <rect x="${x}" y="${y2}" width="${largura}"
                height="${altura}" rx="8" fill="#E8F1FF"/>

            <rect x="${x}" y="${y2}" width="${larguraBarra}"
                height="${altura}" rx="8" fill="#16A05D"/>

            <text x="${x}" y="199" fill="#68758A"
                font-size="13">
                ${Math.round(progresso)}% da meta atingida
            </text>
        `;
    }

    // ==========================================
    // LINK DA CAMPANHA SELECIONADA
    // ==========================================

    function atualizarLinkProjeto() {
        const link = $("#atalhoPagina");

        if (link) {
            link.href = projetoSelecionado
                ? `projeto.html?id=${Number(projetoSelecionado.id)}`
                : "projetos.html";

            link.setAttribute(
                "aria-disabled",
                projetoSelecionado ? "false" : "true"
            );
        }
    }

    // ==========================================
    // LISTA DE PROJETOS
    // ==========================================

    function renderizarProjetos() {
        const lista = $("#listaProjetos");
        if (!lista) return;

        if (!meusProjetos.length) {
            lista.innerHTML = `
                <p class="vazio">
                    Você ainda não possui projetos para exibir.
                </p>
            `;
            controlarBotaoVerMais();
            return;
        }

        const quantidadeInicial = 2;
        const visiveis = projetosExpandidos
            ? meusProjetos
            : meusProjetos.slice(0, quantidadeInicial);

        lista.innerHTML = visiveis.map(p => {
            const progresso = percentual(p);
            const imagem = p.img ||
                "https://placehold.co/600x400/E8F1FF/075BE8?text=Projeto+Elo";

            return `
                <article class="projeto-item"
                    data-projeto-id="${Number(p.id)}">

                    <a class="projeto-imagem"
                        href="projeto.html?id=${Number(p.id)}"
                        aria-label="Ver ${escapar(p.titulo)}">

                        <img src="${escapar(imagem)}"
                            alt="${escapar(p.titulo)}"
                            loading="lazy"
                            onerror="this.onerror=null;this.src='https://placehold.co/600x400/E8F1FF/075BE8?text=Projeto+Elo';">
                    </a>

                    <div class="projeto-conteudo">
                        <div class="projeto-cabecalho">
                            <span class="projeto-categoria">
                                ${escapar(p.categoria || "Projeto")}
                            </span>

                            <span class="projeto-status">
                                ${Number(p.arrecadado) >= Number(p.meta)
                                    ? "Meta alcançada"
                                    : "Em andamento"}
                            </span>
                        </div>

                        <h3>
                            <a href="projeto.html?id=${Number(p.id)}">
                                ${escapar(p.titulo)}
                            </a>
                        </h3>

                        <p class="projeto-descricao">
                            ${escapar(p.desc || "Conheça esta campanha do Instituto Elo.")}
                        </p>

                        <div class="projeto-valores">
                            <strong>${dinheiro(p.arrecadado)}</strong>
                            <span>de ${dinheiro(p.meta)}</span>
                        </div>

                        <div class="projeto-progresso">
                            <div class="projeto-progresso-trilho">
                                <div class="projeto-progresso-barra"
                                    style="width:${progresso}%"></div>
                            </div>
                            <span>${progresso}% da meta</span>
                        </div>

                        <div class="projeto-informacoes">
                            <span>
                                <i class="fa-solid fa-users"></i>
                                ${numero(p.apoiadores)} apoiadores
                            </span>

                            <span>
                                <i class="fa-regular fa-calendar"></i>
                                ${Number(p.dias) > 0
                                    ? `${numero(p.dias)} dias restantes`
                                    : "Prazo encerrado"}
                            </span>
                        </div>

                        <div class="projeto-acoes">
                            <button type="button"
                                class="btn-projeto-editar"
                                data-acao="editar"
                                data-id="${Number(p.id)}">
                                <i class="fa-solid fa-pencil"></i>
                                Editar
                            </button>

                            <a class="btn-projeto-ver"
                                href="projeto.html?id=${Number(p.id)}">
                                Ver campanha
                                <i class="fa-solid fa-arrow-right"></i>
                            </a>
                        </div>
                    </div>
                </article>
            `;
        }).join("");

        aplicarEstilosLista();
        controlarBotaoVerMais();
    }

    function controlarBotaoVerMais() {
        const lista = $("#listaProjetos");
        if (!lista) return;

        let botao = $("#botaoVerMaisProjetos");

        if (meusProjetos.length <= 2) {
            if (botao) botao.style.display = "none";
            return;
        }

        if (!botao) {
            botao = document.createElement("button");
            botao.type = "button";
            botao.id = "botaoVerMaisProjetos";
            botao.className = "botao-ver-mais-projetos";

            lista.insertAdjacentElement("afterend", botao);

            botao.addEventListener("click", function () {
                projetosExpandidos = !projetosExpandidos;
                renderizarProjetos();
            });
        }

        botao.textContent = projetosExpandidos
            ? "Ver menos projetos"
            : `Ver mais projetos (${meusProjetos.length - 2})`;

        botao.style.display = "block";
    }

    function aplicarEstilosLista() {
        if ($("#estilosListaProjetos")) return;

        const estilo = document.createElement("style");
        estilo.id = "estilosListaProjetos";

        estilo.textContent = `
            #listaProjetos {
                display:flex;
                flex-direction:column;
                gap:18px;
            }

            .projeto-item {
                display:grid;
                grid-template-columns:minmax(125px,180px) minmax(0,1fr);
                gap:18px;
                padding:15px;
                border:1px solid #e5ebf5;
                border-radius:14px;
                background:#fff;
                box-shadow:0 3px 12px rgba(23,32,51,.04);
                min-width:0;
            }

            .projeto-imagem {
                display:block;
                width:100%;
                height:155px;
                overflow:hidden;
                border-radius:10px;
                background:#e8f1ff;
            }

            .projeto-imagem img {
                display:block;
                width:100%;
                height:100%;
                object-fit:cover;
            }

            .projeto-conteudo { min-width:0; }

            .projeto-cabecalho,
            .projeto-valores,
            .projeto-informacoes,
            .projeto-acoes {
                display:flex;
                align-items:center;
                justify-content:space-between;
                gap:10px;
                flex-wrap:wrap;
            }

            .projeto-categoria,
            .projeto-status {
                font-size:12px;
                color:#68758a;
            }

            .projeto-item h3 {
                margin:9px 0;
                font-size:17px;
                color:#172033;
            }

            .projeto-item h3 a {
                color:inherit;
                text-decoration:none;
            }

            .projeto-descricao {
                margin:0 0 12px;
                color:#68758a;
                font-size:13px;
                line-height:1.6;
            }

            .projeto-valores strong {
                color:#075be8;
                font-size:15px;
            }

            .projeto-valores span,
            .projeto-progresso > span {
                color:#68758a;
                font-size:12px;
            }

            .projeto-progresso { margin:10px 0; }

            .projeto-progresso-trilho {
                width:100%;
                height:7px;
                overflow:hidden;
                border-radius:20px;
                background:#e8f1ff;
            }

            .projeto-progresso-barra {
                height:100%;
                border-radius:inherit;
                background:#075be8;
            }

            .projeto-progresso > span {
                display:block;
                margin-top:5px;
            }

            .projeto-informacoes {
                justify-content:flex-start;
                margin:12px 0;
                color:#68758a;
                font-size:12px;
            }

            .projeto-informacoes span {
                display:inline-flex;
                align-items:center;
                gap:6px;
            }

            .projeto-acoes {
                justify-content:flex-start;
                padding-top:10px;
                border-top:1px solid #edf1f7;
            }

            .btn-projeto-editar,
            .btn-projeto-ver,
            .botao-ver-mais-projetos {
                border:0;
                border-radius:8px;
                padding:9px 13px;
                font:inherit;
                font-size:13px;
                cursor:pointer;
                text-decoration:none;
            }

            .btn-projeto-editar {
                color:#075be8;
                background:#e8f1ff;
            }

            .btn-projeto-ver {
                color:#fff;
                background:#075be8;
            }

            .botao-ver-mais-projetos {
                width:100%;
                margin-top:16px;
                border:1px solid #c9ddff;
                background:#f8faff;
                color:#075be8;
                font-weight:600;
            }

            @media(max-width:600px) {
                .projeto-item { grid-template-columns:1fr; }
                .projeto-imagem { height:190px; }
            }
        `;

        document.head.appendChild(estilo);
    }

    // ==========================================
    // ATUALIZAÇÕES RECENTES
    // ==========================================

    function renderizarAtualizacoes() {
        const lista = $("#listaAtualizacoes");
        if (!lista) return;

        const atualizacoes = [];

        meusProjetos.forEach(p => {
            (p.atualizacoes || []).forEach(a => {
                atualizacoes.push({
                    id: p.id,
                    projeto: p.titulo,
                    titulo: a.titulo || "Atualização do projeto",
                    descricao: a.descricao || a.texto || "",
                    quando: a.data || "",
                    criadoEm: a.criado_em || ""
                });
            });
        });

        atualizacoes.sort((a, b) => {
            const dataA = a.criadoEm
                ? new Date(a.criadoEm).getTime()
                : 0;
            const dataB = b.criadoEm
                ? new Date(b.criadoEm).getTime()
                : 0;
            return dataB - dataA;
        });

        if (!atualizacoes.length) {
            lista.innerHTML = `
                <p class="vazio">
                    Nenhuma atualização disponível para seus projetos.
                </p>
            `;
            return;
        }

        lista.innerHTML = atualizacoes.slice(0, 4).map(a => `
            <div class="item-atualizacao">
                <span class="ponto-atualizacao"></span>
                <div>
                    <strong>${escapar(a.titulo)}</strong>
                    <p>${escapar(a.descricao)}</p>
                    <small>
                        <a href="projeto.html?id=${Number(a.id)}">
                            ${escapar(a.projeto)}
                        </a>
                        ${a.quando ? ` · ${escapar(a.quando)}` : ""}
                    </small>
                </div>
            </div>
        `).join("");
    }

    // ==========================================
    // AVISOS E MODAL
    // ==========================================

    function mostrarAviso(mensagem) {
        const aviso = $("#aviso");

        if (!aviso) {
            window.alert(mensagem);
            return;
        }

        aviso.textContent = mensagem;
        aviso.hidden = false;

        window.setTimeout(() => {
            aviso.hidden = true;
        }, 5000);
    }

    function abrirModal(titulo, conteudo) {
        const modal = $("#modal");
        const modalTitulo = $("#modalTitulo");
        const modalCorpo = $("#modalCorpo");

        if (!modal || !modalTitulo || !modalCorpo) {
            window.alert(titulo + "\n\n" + conteudo);
            return;
        }

        modalTitulo.textContent = titulo;
        modalCorpo.textContent = conteudo;
        modal.hidden = false;
    }

    function fecharModal() {
        const modal = $("#modal");
        if (modal) modal.hidden = true;
    }

    document.querySelectorAll("[data-fechar]").forEach(elemento => {
        elemento.addEventListener("click", fecharModal);
    });

    document.addEventListener("keydown", evento => {
        if (evento.key === "Escape") fecharModal();
    });

    // ==========================================
    // ENVIO DE FORMULÁRIOS PARA O PHP
    // ==========================================

    async function enviarFormulario(url, dados) {
        const resposta = await fetch(url, {
            method: "POST",
            credentials: "same-origin",
            body: dados
        });

        let resultado;

        try {
            resultado = await resposta.json();
        } catch {
            throw new Error(
                "O servidor retornou uma resposta inválida. Confira o PHP."
            );
        }

        if (!resposta.ok) {
            throw new Error(
                resultado.erro || "Não foi possível salvar as informações."
            );
        }

        return resultado;
    }

    // ==========================================
    // FORMULÁRIO DE EDIÇÃO
    // ==========================================

    function abrirFormularioEdicao(projeto) {
        const modal = $("#modal");
        const titulo = $("#modalTitulo");
        const corpo = $("#modalCorpo");

        if (!modal || !titulo || !corpo) {
            mostrarAviso("O modal de edição não foi encontrado.");
            return;
        }

        titulo.textContent = "Editar campanha";

        corpo.innerHTML = `
            <form id="formEditarCampanha">
                <label for="editarTitulo">Título da campanha</label>
                <input id="editarTitulo" name="titulo"
                    maxlength="80" required>

                <label for="editarDescricao">Descrição</label>
                <textarea id="editarDescricao" name="descricao"
                    maxlength="160" required></textarea>

                <label for="editarCategoria">Categoria</label>
                <select id="editarCategoria" name="categoria" required>
                    <option value="Educação">Educação</option>
                    <option value="Tecnologia">Tecnologia</option>
                    <option value="Meio ambiente">Meio ambiente</option>
                    <option value="Saúde">Saúde</option>
                    <option value="Arte e cultura">Arte e cultura</option>
                    <option value="Esporte">Esporte</option>
                </select>

                <label for="editarMeta">Meta da campanha (R$)</label>
                <input id="editarMeta" name="meta"
                    type="number" min="0.01" step="0.01" required>

                <p id="mensagemEditar" role="status"></p>

                <button type="submit">Salvar alterações</button>
            </form>
        `;

        $("#editarTitulo").value = projeto.titulo || "";
        $("#editarDescricao").value = projeto.desc || "";
        $("#editarCategoria").value = projeto.categoria || "Educação";
        $("#editarMeta").value = Number(projeto.meta || 0).toFixed(2);

        modal.hidden = false;

        $("#formEditarCampanha").addEventListener("submit", async evento => {
            evento.preventDefault();

            const formulario = evento.currentTarget;
            const mensagem = $("#mensagemEditar");
            const botao = formulario.querySelector('[type="submit"]');
            const dados = new FormData(formulario);

            dados.append("id", String(projeto.id));

            botao.disabled = true;
            mensagem.textContent = "Salvando alterações...";

            try {
                await enviarFormulario("editar_projeto.php", dados);

                fecharModal();
                await carregarProjetos();
                mostrarAviso("Campanha atualizada com sucesso!");
            } catch (erro) {
                mensagem.textContent = erro.message;
                botao.disabled = false;
            }
        });
    }

    // ==========================================
    // FORMULÁRIO DE NOVA ATUALIZAÇÃO
    // ==========================================

    function abrirFormularioAtualizacao(projeto) {
        const modal = $("#modal");
        const titulo = $("#modalTitulo");
        const corpo = $("#modalCorpo");

        if (!modal || !titulo || !corpo) {
            mostrarAviso("O modal de atualizações não foi encontrado.");
            return;
        }

        titulo.textContent = "Adicionar atualização";

        corpo.innerHTML = `
            <p>
                Campanha:
                <strong id="nomeCampanhaAtualizacao"></strong>
            </p>

            <form id="formNovaAtualizacao">
                <label for="novaAtualizacaoTitulo">
                    Título da novidade
                </label>

                <input id="novaAtualizacaoTitulo" name="titulo"
                    maxlength="150" required>

                <label for="novaAtualizacaoConteudo">
                    Conteúdo da atualização
                </label>

                <textarea id="novaAtualizacaoConteudo" name="conteudo"
                    rows="5" required></textarea>

                <p id="mensagemAtualizacao" role="status"></p>

                <button type="submit">Publicar atualização</button>
            </form>
        `;

        $("#nomeCampanhaAtualizacao").textContent = projeto.titulo;
        modal.hidden = false;

        $("#formNovaAtualizacao").addEventListener("submit", async evento => {
            evento.preventDefault();

            const formulario = evento.currentTarget;
            const mensagem = $("#mensagemAtualizacao");
            const botao = formulario.querySelector('[type="submit"]');
            const dados = new FormData(formulario);

            dados.append("projeto_id", String(projeto.id));

            botao.disabled = true;
            mensagem.textContent = "Publicando atualização...";

            try {
                await enviarFormulario("publicar_atualizacao.php", dados);

                fecharModal();
                await carregarProjetos();

                // Mantém selecionada a campanha que recebeu a novidade.
                selecionarProjeto(projeto.id);

                mostrarAviso("Atualização publicada com sucesso!");
            } catch (erro) {
                mensagem.textContent = erro.message;
                botao.disabled = false;
            }
        });
    }

    // ==========================================
    // AÇÕES DOS ATALHOS
    // ==========================================

    function tratarAcao(acao, id) {
        const projeto = meusProjetos.find(
            p => Number(p.id) === Number(id)
        ) || projetoSelecionado;

        if (!projeto) {
            mostrarAviso("Nenhuma campanha foi encontrada.");
            return;
        }

        switch (acao) {
            case "editar":
                abrirFormularioEdicao(projeto);
                break;

            case "atualizar":
                abrirFormularioAtualizacao(projeto);
                break;

            case "compartilhar": {
                const url = new URL(
                    `projeto.html?id=${Number(projeto.id)}`,
                    window.location.href
                ).href;

                if (navigator.share) {
                    navigator.share({
                        title: projeto.titulo,
                        text: projeto.desc ||
                            "Conheça esta campanha do Instituto Elo.",
                        url
                    }).catch(erro => {
                        if (erro.name !== "AbortError") {
                            abrirModal("Compartilhar projeto", url);
                        }
                    });
                } else if (navigator.clipboard?.writeText) {
                    navigator.clipboard.writeText(url)
                        .then(() => mostrarAviso("Link da campanha copiado!"))
                        .catch(() => abrirModal("Compartilhar projeto", url));
                } else {
                    abrirModal("Compartilhar projeto", url);
                }
                break;
            }

            case "relatorio":
                abrirModal(
                    "Relatório da campanha",
                    "Projeto: " + projeto.titulo +
                    "\nArrecadado: " + dinheiro(projeto.arrecadado) +
                    "\nMeta: " + dinheiro(projeto.meta) +
                    "\nProgresso: " + percentual(projeto) + "%" +
                    "\nApoiadores: " + numero(projeto.apoiadores)
                );
                break;

            default:
                mostrarAviso("Ação não reconhecida.");
        }
    }

    // Delegação de eventos: funciona também para os cards renderizados.
    document.addEventListener("click", function (evento) {
        const botao = evento.target.closest("[data-acao]");
        if (!botao) return;

        evento.preventDefault();

        tratarAcao(
            botao.dataset.acao,
            botao.dataset.id || projetoSelecionado?.id
        );
    });

    // ==========================================
    // SELECIONAR CAMPANHA PELO ID
    // ==========================================

    function selecionarProjeto(id) {
        const projeto = meusProjetos.find(
            p => Number(p.id) === Number(id)
        );

        if (!projeto) return;

        projetoSelecionado = projeto;

        const seletor = $("#projetoGrafico");
        if (seletor) seletor.value = String(projeto.id);

        atualizarDesempenho();
        atualizarLinkProjeto();
    }

    // ==========================================
    // BUSCA DA NAVBAR
    // ==========================================

    function configurarBusca() {
        const campo = $("#buscaProjetos");
        const botao = $("#botaoBuscar");

        function buscar() {
            const termo = campo?.value.trim() || "";

            window.location.href = termo
                ? `projetos.html?busca=${encodeURIComponent(termo)}`
                : "projetos.html";
        }

        if (botao) botao.addEventListener("click", buscar);

        if (campo) {
            campo.addEventListener("keydown", evento => {
                if (evento.key === "Enter") buscar();
            });
        }
    }

    // ==========================================
    // CARREGAR CAMPANHAS DO MYSQL
    // ==========================================

    async function carregarProjetos() {
        try {
            const resposta = await fetch(
                "listar_projetos_criador.php",
                { credentials: "same-origin" }
            );

            let dados;

            try {
                dados = await resposta.json();
            } catch {
                throw new Error(
                    "O servidor retornou uma resposta inválida. Confira listar_projetos_criador.php."
                );
            }

            if (!resposta.ok) {
                if (resposta.status === 401) {
                    window.location.href =
                        "login.html?voltar=criador.html";
                    return;
                }

                throw new Error(
                    dados.erro || "Não foi possível carregar as campanhas."
                );
            }

            todosProjetos = Array.isArray(dados.projetos)
                ? dados.projetos
                : [];

            meusProjetos = todosProjetos;

            // Normaliza os dados recebidos do PHP.
            meusProjetos = meusProjetos.map(p => ({
                ...p,
                id: Number(p.id),
                meta: Number(p.meta || 0),
                arrecadado: Number(p.arrecadado || 0),
                apoiadores: Number(p.apoiadores || 0),
                dias: Number(p.dias || 0),
                img: p.img || "",
                desc: p.desc || p.descricao || "",
                atualizacoes: Array.isArray(p.atualizacoes)
                    ? p.atualizacoes
                    : []
            }));

            const idAnterior = projetoSelecionado?.id;

            projetoSelecionado = meusProjetos.find(
                p => p.id === Number(idAnterior)
            ) || null;

            carregarNomeCriador();
            atualizarResumo();
            preencherSeletor();
            atualizarDesempenho();
            atualizarLinkProjeto();
            renderizarProjetos();
            renderizarAtualizacoes();

        } catch (erro) {
            console.error("Erro ao carregar painel:", erro);
            mostrarAviso(erro.message);
        }
    }

    // ==========================================
    // INICIALIZAÇÃO
    // ==========================================

    configurarBusca();
    carregarProjetos();
});
