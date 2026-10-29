
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

    function escaparHTML(texto) {
        return String(texto ?? "").replace(/[&<>"']/g, caractere => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[caractere]);
    }

    // =====================================================
    // CARREGAR PROJETO
    // =====================================================

    async function carregarProjeto() {
        if (!projetoId) {
            mostrarMensagem("Projeto não identificado.", true);
            return;
        }

        try {
            const resposta = await fetch(
                `${API_PROJETO}?id=${encodeURIComponent(projetoId)}`,
                { credentials: "same-origin" }
            );

            if (!resposta.ok) {
                throw new Error("Não foi possível carregar o projeto.");
            }

            const dados = await resposta.json();

            if (dados.sucesso === false || dados.erro) {
                throw new Error(dados.mensagem || dados.erro ||
                    "Projeto não encontrado.");
            }

            projetoAtual = dados.projeto || dados;

            renderizarProjeto(projetoAtual);
        } catch (erro) {
            console.error("Erro ao carregar projeto:", erro);
            mostrarMensagem(
                erro.message || "Erro ao carregar o projeto.",
                true
            );
        }
    }

    function renderizarProjeto(projeto) {
        // Atualiza os elementos que tenham estes IDs.
        const campos = {
            tituloProjeto: projeto.titulo,
            descricaoProjeto: projeto.descricao,
            categoriaProjeto: projeto.categoria,
            valorArrecadado: dinheiro(projeto.valor_arrecadado),
            metaProjeto: dinheiro(projeto.meta_valor),
            nomeCriador: projeto.nome_criador || projeto.criador_nome
        };

        Object.entries(campos).forEach(([id, valor]) => {
            const elemento = document.getElementById(id);

            if (elemento && valor !== undefined && valor !== null) {
                elemento.textContent = valor;
            }
        });

        const titulo = document.querySelector("[data-projeto-titulo]");
        if (titulo) titulo.textContent = projeto.titulo || "";

        const descricao = document.querySelector("[data-projeto-descricao]");
        if (descricao) descricao.textContent = projeto.descricao || "";

        const imagem = document.querySelector("[data-projeto-imagem]");
        if (imagem && projeto.imagem) {
            imagem.src = projeto.imagem;
            imagem.alt = projeto.titulo || "Imagem do projeto";
        }

        const arrecadado = Number(projeto.valor_arrecadado || 0);
        const meta = Number(projeto.meta_valor || 0);
        const porcentagem = meta > 0
            ? Math.min((arrecadado / meta) * 100, 100)
            : 0;

        document.querySelectorAll("[data-progresso]").forEach(elemento => {
            elemento.style.width = `${porcentagem}%`;
        });

        document.querySelectorAll("[data-progresso-texto]").forEach(elemento => {
            elemento.textContent = `${Math.round(porcentagem)}%`;
        });
    }

    // =====================================================
    // ABAS DO PROJETO
    // =====================================================

    const botoesAbas = document.querySelectorAll("[data-aba]");
    const paineisAbas = document.querySelectorAll("[data-conteudo-aba]");

    botoesAbas.forEach(botao => {
        botao.addEventListener("click", () => {
            const aba = botao.dataset.aba;

            botoesAbas.forEach(item => {
                item.classList.toggle("ativo", item === botao);
            });

            paineisAbas.forEach(painel => {
                painel.hidden = painel.dataset.conteudoAba !== aba;
            });
        });
    });

    // =====================================================
    // FAVORITOS
    // =====================================================

    function obterFavoritos() {
        try {
            const dados = JSON.parse(localStorage.getItem("eloFavoritos"));
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
    // SELEÇÃO DO VALOR DA DOAÇÃO
    // =====================================================

    function lerValorDigitado() {
        if (!valorCustom) return 0;

        // Aceita valores como 50, 50,00 ou 1.250,50.
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

        btnDoar.textContent = `Doar agora com ${nomes[metodoSelecionado]}`;
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
        botao.addEventListener("click", () => selecionarValor(botao));
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
    // SELEÇÃO DO MÉTODO DE PAGAMENTO
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
    // DOAÇÃO: UM ÚNICO EVENTO DE CLIQUE
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
                mostrarMensagem("Selecione um método de pagamento.", true);
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

                // O ID deve vir do PHP após salvar a doação.
                const doacaoId = resultado.doacao_id;

                if (!doacaoId || !/^\d+$/.test(String(doacaoId))) {
                    throw new Error(
                        "O servidor não retornou um ID de doação válido."
                    );
                }

                // Redireciona usando doacao_id, nunca id do projeto.
                const destino = new URL(
                    paginasPagamento[metodoSelecionado],
                    window.location.href
                );

                destino.searchParams.set("doacao_id", String(doacaoId));

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
