
document.addEventListener("DOMContentLoaded", () => {

    // =====================================================
    // CONFIGURAÇÕES
    // =====================================================

    const API_PROJETO = "buscar_projeto.php";
    const API_DOACAO = "processar_doacao.php";

    const paginasPagamento = {
        pix: "pagamentoPix.html",
        cartao: "pagamentoCartao.html",
        boleto: "pagamentoBoleto.html"
    };

    const parametros = new URLSearchParams(window.location.search);
    const projetoId = parametros.get("id");

    let projetoAtual = null;
    let valorSelecionado = 50;
    let metodoSelecionado = "pix";
    let enviandoDoacao = false;

    const btnDoar = document.getElementById("btnDoar");
    const valorCustom = document.getElementById("valorCustom");
    const retorno = document.getElementById("retorno");

    console.log("Projeto.js iniciado.");
    console.log("ID do projeto:", projetoId);

    // =====================================================
    // FUNÇÕES AUXILIARES
    // =====================================================

    function dinheiro(valor) {
        return Number(valor || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    function mostrarMensagem(mensagem, erro = false) {
        if (!retorno) {
            alert(mensagem);
            return;
        }

        retorno.textContent = mensagem;
        retorno.hidden = false;
        retorno.style.color = erro ? "#c62828" : "#167444";
    }

    function limparMensagem() {
        if (retorno) {
            retorno.textContent = "";
            retorno.hidden = true;
        }
    }

    function obterSessao() {
        try {
            return JSON.parse(localStorage.getItem("eloSessao")) || null;
        } catch {
            return null;
        }
    }

    function preencher(id, valor) {
        const elemento = document.getElementById(id);

        if (!elemento) {
            console.warn(`Elemento #${id} não encontrado no HTML.`);
            return;
        }

        elemento.textContent = valor ?? "";
    }

    // =====================================================
    // CARREGAR PROJETO
    // =====================================================

    async function carregarProjeto() {
        const conteudo = document.getElementById("conteudo");
        const naoEncontrado = document.getElementById("naoEncontrado");

        if (!projetoId) {
            console.error("Nenhum ID de projeto foi informado na URL.");

            if (conteudo) conteudo.hidden = true;
            if (naoEncontrado) naoEncontrado.hidden = false;

            return;
        }

        try {
            console.log("Buscando projeto no PHP...");

            const resposta = await fetch(
                `${API_PROJETO}?id=${encodeURIComponent(projetoId)}`,
                {
                    method: "GET",
                    credentials: "same-origin",
                    cache: "no-store"
                }
            );

            console.log("Status da resposta:", resposta.status);

            if (!resposta.ok) {
                throw new Error("Erro ao acessar buscar_projeto.php.");
            }

            const dados = await resposta.json();

            console.log("Dados recebidos:", dados);

            if (!dados.sucesso || !dados.projeto) {
                throw new Error(
                    dados.mensagem || dados.erro || "Projeto não encontrado."
                );
            }

            projetoAtual = dados.projeto;

            console.log("Projeto carregado:", projetoAtual);

            renderizarProjeto(projetoAtual);

            if (conteudo) conteudo.hidden = false;
            if (naoEncontrado) naoEncontrado.hidden = true;

            console.log("Projeto renderizado com sucesso.");

        } catch (erro) {
            console.error("Erro ao carregar projeto:", erro);

            if (conteudo) conteudo.hidden = true;
            if (naoEncontrado) naoEncontrado.hidden = false;
        }
    }

    // =====================================================
    // RENDERIZAR PROJETO
    // =====================================================

    function renderizarProjeto(projeto) {

        console.log("Executando renderizarProjeto:", projeto);

        // Dados principais
        preencher("titulo", projeto.titulo);
        preencher("tag", projeto.categoria);
        preencher("descricao", projeto.desc);
        preencher("local", projeto.local);
        preencher("nivel", projeto.nivel);

        // Arrecadação
        preencher("arrecadado", dinheiro(projeto.arrecadado));
        preencher("meta", dinheiro(projeto.meta));
        preencher("pct", `${projeto.pct || 0}%`);

        // Apoiadores e prazo
        preencher("apoiadores", projeto.apoiadores || 0);

        preencher(
            "dias",
            Number(projeto.dias) > 0
                ? projeto.dias
                : "Encerrado"
        );

        preencher(
            "prazoMeta",
            Number(projeto.dias) > 0
                ? "Meta do projeto"
                : "Prazo encerrado"
        );

        // Imagem da capa
        const capa = document.getElementById("capa");

        if (capa && projeto.img) {
            capa.style.backgroundImage = `url("${projeto.img}")`;
            capa.style.backgroundSize = "cover";
            capa.style.backgroundPosition = "center";
        }

        // Barra de progresso
        const barra = document.getElementById("barra");

        if (barra) {
            const porcentagem = Math.min(
                Math.max(Number(projeto.pct) || 0, 0),
                100
            );

            barra.style.width = `${porcentagem}%`;
        }

        // Breadcrumb
        preencher("bcTitulo", projeto.titulo);
        preencher("bcCategoria", projeto.categoria);

        // Sobre o projeto
        const textoSobre = document.getElementById("textoSobre");

        if (textoSobre) {
            const textos = Array.isArray(projeto.sobre)
                ? projeto.sobre
                : [projeto.desc || ""];

            textoSobre.textContent = textos.join("\n\n");
        }

        // Destaques
        const destaques = document.getElementById("destaques");

        if (destaques) {
            destaques.innerHTML = "";

            (Array.isArray(projeto.destaques) ? projeto.destaques : [])
                .forEach(item => {
                    const elemento = document.createElement("div");
                    elemento.className = "destaque";
                    elemento.textContent = item;
                    destaques.appendChild(elemento);
                });
        }

        // Atualizações
        const atualizacoes = Array.isArray(projeto.atualizacoes)
            ? projeto.atualizacoes
            : [];

        preencher("contAtualizacoes", atualizacoes.length);

        const listaAtualizacoes =
            document.getElementById("listaAtualizacoes");

        const atualizacaoRecente =
            document.getElementById("atualizacaoRecente");

        if (listaAtualizacoes) {
            listaAtualizacoes.innerHTML = "";

            if (atualizacoes.length === 0) {
                listaAtualizacoes.textContent =
                    "Ainda não há atualizações neste projeto.";
            } else {
                atualizacoes.forEach(item => {
                    const elemento = document.createElement("p");

                    elemento.textContent =
                        item.titulo ||
                        item.descricao ||
                        item.texto ||
                        "Atualização do projeto";

                    listaAtualizacoes.appendChild(elemento);
                });
            }
        }

        if (atualizacaoRecente) {
            if (atualizacoes.length > 0) {
                const primeira = atualizacoes[0];

                atualizacaoRecente.textContent =
                    primeira.titulo ||
                    primeira.descricao ||
                    primeira.texto ||
                    "Nova atualização";
            } else {
                atualizacaoRecente.textContent =
                    "Nenhuma atualização publicada ainda.";
            }
        }

        // Apoiadores
        preencher("contApoiadores", projeto.apoiadores || 0);

        const listaApoiadores =
            document.getElementById("listaApoiadores");

        if (listaApoiadores) {
            listaApoiadores.textContent =
                Number(projeto.apoiadores) > 0
                    ? `${projeto.apoiadores} pessoas já apoiaram este projeto.`
                    : "Este projeto ainda não possui apoiadores confirmados.";
        }

        // Título da aba do navegador
        document.title = `${projeto.titulo} | Instituto Elo`;
    }

    // =====================================================
    // ABAS DO PROJETO
    // =====================================================

    const botoesAbas = document.querySelectorAll("[data-aba]");
    const paineisAbas = document.querySelectorAll(".aba-conteudo");

    botoesAbas.forEach(botao => {
        botao.addEventListener("click", () => {
            const aba = botao.dataset.aba;

            botoesAbas.forEach(item => {
                item.classList.toggle("ativo", item === botao);
            });

            paineisAbas.forEach(painel => {
                painel.classList.toggle(
                    "ativo",
                    painel.id === `aba-${aba}`
                );
            });
        });
    });

    // =====================================================
    // FAVORITOS
    // =====================================================

    function obterFavoritos() {
        try {
            const dados = JSON.parse(
                localStorage.getItem("eloFavoritos")
            );

            return Array.isArray(dados) ? dados : [];

        } catch {
            return [];
        }
    }

    function atualizarBotoesFavoritos() {
        if (!projetoId) return;

        const favoritos = obterFavoritos().map(String);
        const salvo = favoritos.includes(String(projetoId));

        document.querySelectorAll(
            "#btnFavorito, .btn-favorito, [data-favorito]"
        ).forEach(botao => {
            botao.classList.toggle("ativo", salvo);
            botao.setAttribute("aria-pressed", String(salvo));
        });
    }

    document.querySelectorAll(
        "#btnFavorito, .btn-favorito, [data-favorito]"
    ).forEach(botao => {
        botao.addEventListener("click", () => {
            if (!projetoId) return;

            let favoritos = obterFavoritos().map(String);
            const id = String(projetoId);

            if (favoritos.includes(id)) {
                favoritos = favoritos.filter(item => item !== id);
            } else {
                favoritos.push(id);
            }

            localStorage.setItem(
                "eloFavoritos",
                JSON.stringify(favoritos)
            );

            atualizarBotoesFavoritos();
        });
    });

    atualizarBotoesFavoritos();

    // =====================================================
    // COMPARTILHAR PROJETO
    // =====================================================

    document.querySelectorAll(
        "#btnCompartilhar, .btn-compartilhar, [data-compartilhar]"
    ).forEach(botao => {
        botao.addEventListener("click", async () => {
            const dados = {
                title: projetoAtual?.titulo || document.title,
                text: "Conheça este projeto no Instituto Elo!",
                url: window.location.href
            };

            try {
                if (navigator.share) {
                    await navigator.share(dados);
                } else if (navigator.clipboard) {
                    await navigator.clipboard.writeText(dados.url);
                    mostrarMensagem("Link do projeto copiado!");
                } else {
                    window.prompt("Copie o link do projeto:", dados.url);
                }
            } catch (erro) {
                if (erro.name !== "AbortError") {
                    console.error("Erro ao compartilhar:", erro);
                }
            }
        });
    });

    // =====================================================
    // VALOR DA DOAÇÃO
    // =====================================================

    function lerValorDigitado() {
        if (!valorCustom) return 0;

        let texto = valorCustom.value.trim()
            .replace(/\s/g, "")
            .replace(/^R\$/i, "");

        if (!texto) return 0;

        if (texto.includes(",")) {
            texto = texto.replace(/\./g, "").replace(",", ".");
        }

        const valor = Number(texto);

        return Number.isFinite(valor) ? valor : 0;
    }

    function atualizarBotaoDoar() {
        if (!btnDoar) return;

        const nomes = {
            pix: "PIX",
            cartao: "cartão",
            boleto: "boleto"
        };

        btnDoar.textContent =
            `Doar agora com ${nomes[metodoSelecionado]}`;
    }

    function selecionarValor(botao) {
        document.querySelectorAll(".valor").forEach(item => {
            item.classList.toggle("ativo", item === botao);
        });

        if (botao.dataset.valor === "outro") {
            valorSelecionado = lerValorDigitado();

            if (valorCustom) valorCustom.focus();

        } else {
            valorSelecionado = Number(botao.dataset.valor);

            if (valorCustom) valorCustom.value = "";
        }

        limparMensagem();
    }

    document.querySelectorAll(".valor[data-valor]").forEach(botao => {
        botao.addEventListener("click", () => {
            selecionarValor(botao);
        });
    });

    if (valorCustom) {
        valorCustom.addEventListener("input", () => {
            document.querySelectorAll(".valor").forEach(botao => {
                botao.classList.toggle(
                    "ativo",
                    botao.dataset.valor === "outro"
                );
            });

            valorSelecionado = lerValorDigitado();
            limparMensagem();
        });
    }

    // =====================================================
    // MÉTODO DE PAGAMENTO
    // =====================================================

    document.querySelectorAll(".metodo[data-metodo]").forEach(botao => {
        botao.addEventListener("click", () => {
            const metodo = botao.dataset.metodo;

            if (!paginasPagamento[metodo]) return;

            metodoSelecionado = metodo;

            document.querySelectorAll(".metodo").forEach(item => {
                item.classList.toggle("ativo", item === botao);
            });

            atualizarBotaoDoar();
            limparMensagem();
        });
    });

    atualizarBotaoDoar();

    // =====================================================
    // REGISTRAR DOAÇÃO
    // =====================================================

    if (btnDoar) {
        btnDoar.addEventListener("click", async evento => {
            evento.preventDefault();

            if (enviandoDoacao) return;

            limparMensagem();

            const sessao = obterSessao();

            if (!sessao) {
                mostrarMensagem(
                    "Entre na sua conta para realizar uma doação.",
                    true
                );
                return;
            }

            if (!projetoId || !/^\d+$/.test(projetoId)) {
                mostrarMensagem("Projeto não identificado.", true);
                return;
            }

            const valor = valorCustom && valorCustom.value.trim()
                ? lerValorDigitado()
                : valorSelecionado;

            if (!Number.isFinite(valor) || valor <= 0) {
                mostrarMensagem(
                    "Selecione ou digite um valor válido para doar.",
                    true
                );
                return;
            }

            if (valor > 1000000) {
                mostrarMensagem(
                    "O valor máximo permitido é R$ 1.000.000,00.",
                    true
                );
                return;
            }

            if (!paginasPagamento[metodoSelecionado]) {
                mostrarMensagem(
                    "Selecione um método de pagamento.",
                    true
                );
                return;
            }

            enviandoDoacao = true;
            btnDoar.disabled = true;
            btnDoar.textContent = "Preparando doação...";

            try {
                const resposta = await fetch(API_DOACAO, {
                    method: "POST",
                    credentials: "same-origin",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify({
                        projeto_id: Number(projetoId),
                        valor: valor,
                        metodo_pagamento: metodoSelecionado
                    })
                });

                const resultado = await resposta.json();

                if (!resposta.ok || !resultado.sucesso) {
                    throw new Error(
                        resultado.mensagem ||
                        resultado.erro ||
                        "Não foi possível registrar a doação."
                    );
                }

                const doacaoId = resultado.doacao_id;

                if (!doacaoId || !/^\d+$/.test(String(doacaoId))) {
                    throw new Error(
                        "O servidor não retornou um ID de doação válido."
                    );
                }

                const destino = new URL(
                    paginasPagamento[metodoSelecionado],
                    window.location.href
                );

                destino.searchParams.set(
                    "doacao_id",
                    String(doacaoId)
                );

                window.location.assign(destino.href);

            } catch (erro) {
                console.error("Erro ao registrar doação:", erro);

                mostrarMensagem(
                    erro.message ||
                    "Erro ao iniciar a doação. Tente novamente.",
                    true
                );

                enviandoDoacao = false;
                btnDoar.disabled = false;
                atualizarBotaoDoar();
            }
        });
    }

    // =====================================================
    // INICIALIZAÇÃO
    // =====================================================

    carregarProjeto();

});
