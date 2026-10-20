document.addEventListener("DOMContentLoaded", async function () {
    const params = new URLSearchParams(window.location.search);
    const id = Number(params.get("id"));

    const $ = seletor => document.getElementById(seletor);
    const conteudo = $("conteudo");
    const naoEncontrado = $("naoEncontrado");
    const breadcrumb = document.querySelector(".breadcrumb");

    const moeda = valor =>
        Number(valor || 0).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });

    function mostrarNaoEncontrado() {
        if (conteudo) conteudo.hidden = true;
        if (breadcrumb) breadcrumb.hidden = true;
        if (naoEncontrado) naoEncontrado.hidden = false;
        document.title = "Projeto não encontrado | Instituto Elo";
    }

    if (!Number.isInteger(id) || id < 1) {
        mostrarNaoEncontrado();
        return;
    }

    let projeto;

    try {
        const resposta = await fetch(
            `buscar_projeto.php?id=${encodeURIComponent(id)}`
        );

        if (!resposta.ok) {
            throw new Error("Não foi possível encontrar o projeto.");
        }

        projeto = await resposta.json();

        if (projeto.erro || !projeto.id) {
            throw new Error(projeto.erro || "Projeto não encontrado.");
        }
    } catch (erro) {
        console.error("Erro ao carregar o projeto:", erro);
        mostrarNaoEncontrado();
        return;
    }

    if (conteudo) conteudo.hidden = false;
    if (naoEncontrado) naoEncontrado.hidden = true;

    document.title = `${projeto.titulo} | Instituto Elo`;

    const arrecadado = Number(projeto.arrecadado || 0);
    const meta = Number(projeto.meta || 0);
    const porcentagem = meta > 0
        ? Math.min(100, Math.round((arrecadado / meta) * 100))
        : 0;

    const dias = Math.max(0, Number(projeto.dias || 0));

    if ($("bcCategoria")) $("bcCategoria").textContent = projeto.categoria;
    if ($("bcTitulo")) $("bcTitulo").textContent = projeto.titulo;

    if ($("titulo")) $("titulo").textContent = projeto.titulo;
    if ($("tag")) $("tag").textContent = projeto.categoria;
    if ($("descricao")) $("descricao").textContent = projeto.desc || "";
    if ($("local")) $("local").textContent = projeto.local || "Brasil";
    if ($("nivel")) $("nivel").textContent = projeto.nivel || "Instituição de ensino";

    if ($("arrecadado")) $("arrecadado").textContent = moeda(arrecadado);
    if ($("meta")) $("meta").textContent = moeda(meta);
    if ($("pct")) $("pct").textContent = `${porcentagem}%`;
    if ($("dias")) $("dias").textContent = dias;
    if ($("prazoMeta")) {
        $("prazoMeta").textContent = dias === 1
            ? "Falta 1 dia para o encerramento"
            : `Faltam ${dias} dias para o encerramento`;
    }

    if ($("apoiadores")) {
        $("apoiadores").textContent = Number(projeto.apoiadores || 0);
    }

    if ($("barra")) {
        $("barra").style.width = `${porcentagem}%`;
        $("barra").setAttribute("role", "progressbar");
        $("barra").setAttribute("aria-valuenow", porcentagem);
        $("barra").setAttribute("aria-valuemin", "0");
        $("barra").setAttribute("aria-valuemax", "100");
    }

    if ($("capa")) {
        const capa = $("capa");

        if (projeto.img) {
            capa.style.backgroundImage = `url("${projeto.img}")`;
            capa.style.backgroundSize = "cover";
            capa.style.backgroundPosition = "center";
        } else {
            capa.style.backgroundImage = "none";
        }

        capa.style.backgroundColor = projeto.cor || "#E8F1FF";
    }

    if ($("textoSobre")) {
        const sobre = Array.isArray(projeto.sobre)
            ? projeto.sobre
            : [projeto.desc || ""];

        $("textoSobre").replaceChildren();

        sobre.forEach(paragrafo => {
            const p = document.createElement("p");
            p.textContent = paragrafo;
            $("textoSobre").appendChild(p);
        });
    }

    if ($("destaques")) {
        $("destaques").replaceChildren();

        const destaques = Array.isArray(projeto.destaques)
            ? projeto.destaques
            : [];

        destaques.forEach(destaque => {
            const item = document.createElement("div");
            item.className = "destaque-item";
            item.textContent = typeof destaque === "string"
                ? destaque
                : destaque.titulo || destaque.descricao || "";

            $("destaques").appendChild(item);
        });
    }

    const atualizacoes = Array.isArray(projeto.atualizacoes)
        ? projeto.atualizacoes
        : [];

    if ($("contAtualizacoes")) {
        $("contAtualizacoes").textContent = atualizacoes.length;
    }

    if ($("listaAtualizacoes")) {
        $("listaAtualizacoes").replaceChildren();

        if (atualizacoes.length === 0) {
            const mensagem = document.createElement("p");
            mensagem.className = "sem-conteudo";
            mensagem.textContent = "Este projeto ainda não possui atualizações.";
            $("listaAtualizacoes").appendChild(mensagem);
        } else {
            atualizacoes.forEach(atualizacao => {
                const item = document.createElement("article");
                item.className = "atualizacao-item";

                const titulo = document.createElement("h3");
                titulo.textContent = typeof atualizacao === "string"
                    ? atualizacao
                    : atualizacao.titulo || "Atualização do projeto";

                item.appendChild(titulo);

                if (typeof atualizacao === "object") {
                    if (atualizacao.data) {
                        const data = document.createElement("small");
                        data.textContent = atualizacao.data;
                        item.appendChild(data);
                    }

                    if (atualizacao.texto || atualizacao.descricao) {
                        const texto = document.createElement("p");
                        texto.textContent = atualizacao.texto || atualizacao.descricao;
                        item.appendChild(texto);
                    }
                }

                $("listaAtualizacoes").appendChild(item);
            });
        }
    }

    if ($("atualizacaoRecente")) {
        $("atualizacaoRecente").textContent = atualizacoes.length
            ? (typeof atualizacoes[0] === "string"
                ? atualizacoes[0]
                : atualizacoes[0].titulo || atualizacoes[0].texto || "Nova atualização")
            : "Ainda não há atualizações para este projeto.";
    }

    if ($("listaApoiadores")) {
        $("listaApoiadores").replaceChildren();

        const mensagem = document.createElement("p");
        mensagem.className = "sem-conteudo";
        mensagem.textContent = "Os apoiadores aparecerão aqui quando houver doações registradas.";
        $("listaApoiadores").appendChild(mensagem);
    }

    if ($("contApoiadores")) {
        $("contApoiadores").textContent = Number(projeto.apoiadores || 0);
    }

    const botoesAbas = document.querySelectorAll("[data-aba]");
    const paineisAbas = document.querySelectorAll("[data-conteudo-aba]");

    botoesAbas.forEach(botao => {
        botao.addEventListener("click", function () {
            const abaSelecionada = botao.dataset.aba;

            botoesAbas.forEach(item => {
                item.classList.toggle("ativo", item === botao);
                item.setAttribute("aria-selected", item === botao ? "true" : "false");
            });

            paineisAbas.forEach(painel => {
                painel.hidden = painel.dataset.conteudoAba !== abaSelecionada;
            });
        });
    });

    const usuario = (() => {
        try {
            return JSON.parse(localStorage.getItem("eloSessao") || "null");
        } catch {
            return null;
        }
    })();

    const chaveFavoritos = "eloFavoritos";

    function obterFavoritos() {
        try {
            const favoritos = JSON.parse(localStorage.getItem(chaveFavoritos) || "[]");
            return Array.isArray(favoritos) ? favoritos : [];
        } catch {
            return [];
        }
    }

    function atualizarBotaoFavorito() {
        const botao = $("btnFavorito");
        if (!botao) return;

        const favoritos = obterFavoritos();
        const favoritado = favoritos.some(item => Number(item) === id);

        botao.classList.toggle("ativo", favoritado);
        botao.setAttribute("aria-pressed", favoritado ? "true" : "false");
        botao.setAttribute(
            "aria-label",
            favoritado ? "Remover dos favoritos" : "Adicionar aos favoritos"
        );

        const texto = botao.querySelector("[data-texto-favorito]");
        if (texto) {
            texto.textContent = favoritado
                ? "Adicionado aos favoritos"
                : "Adicionar aos favoritos";
        }
    }

    if ($("btnFavorito")) {
        atualizarBotaoFavorito();

        $("btnFavorito").addEventListener("click", function () {
            const favoritos = obterFavoritos();
            const jaFavoritado = favoritos.some(item => Number(item) === id);

            const novosFavoritos = jaFavoritado
                ? favoritos.filter(item => Number(item) !== id)
                : [...favoritos, id];

            localStorage.setItem(chaveFavoritos, JSON.stringify(novosFavoritos));
            atualizarBotaoFavorito();
        });
    }

    if ($("btnCompartilhar")) {
        $("btnCompartilhar").addEventListener("click", async function () {
            const dadosCompartilhamento = {
                title: projeto.titulo,
                text: `Conheça este projeto no Instituto Elo: ${projeto.titulo}`,
                url: window.location.href
            };

            try {
                if (navigator.share) {
                    await navigator.share(dadosCompartilhamento);
                } else if (navigator.clipboard && window.isSecureContext) {
                    await navigator.clipboard.writeText(window.location.href);
                    alert("Link do projeto copiado!");
                } else {
                    const campo = document.createElement("textarea");
                    campo.value = window.location.href;
                    campo.style.position = "fixed";
                    campo.style.opacity = "0";
                    document.body.appendChild(campo);
                    campo.select();

                    const copiado = document.execCommand("copy");
                    campo.remove();

                    alert(copiado
                        ? "Link do projeto copiado!"
                        : `Copie o link: ${window.location.href}`);
                }
            } catch (erro) {
                if (erro.name !== "AbortError") {
                    alert("Não foi possível compartilhar o projeto.");
                }
            }
        });
    }

    let valorSelecionado = 0;

    const botoesValores = document.querySelectorAll(
        "[data-valor], .valor-opcao, .valor-btn"
    );

    function selecionarValor(botao, valor) {
        if (!Number.isFinite(valor) || valor <= 0) return;

        valorSelecionado = valor;

        botoesValores.forEach(item => {
            item.classList.toggle("ativo", item === botao);
            item.setAttribute("aria-pressed", item === botao ? "true" : "false");
        });

        if ($("valorCustom")) {
            $("valorCustom").value = valor;
        }

        if ($("retorno")) {
            $("retorno").textContent = `Valor da contribuição: ${moeda(valor)}`;
        }
    }

    botoesValores.forEach(botao => {
        const valor = Number(
            botao.dataset.valor ||
            botao.value ||
            botao.textContent.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")
        );

        botao.addEventListener("click", function () {
            selecionarValor(botao, valor);
        });
    });

    if ($("valorCustom")) {
        $("valorCustom").addEventListener("input", function () {
            const valor = Number(
                $("valorCustom").value.replace(",", ".")
            );

            valorSelecionado = Number.isFinite(valor) ? valor : 0;

            botoesValores.forEach(botao => {
                const valorBotao = Number(
                    botao.dataset.valor ||
                    botao.value ||
                    botao.textContent.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".")
                );

                botao.classList.toggle(
                    "ativo",
                    valorSelecionado > 0 && valorBotao === valorSelecionado
                );
            });

            if ($("retorno")) {
                $("retorno").textContent = valorSelecionado > 0
                    ? `Valor da contribuição: ${moeda(valorSelecionado)}`
                    : "";
            }
        });
    }

    function obterMetodoPagamento() {
        const selecionado = document.querySelector(
            'input[name="metodo"]:checked, input[name="pagamento"]:checked, input[name="metodoPagamento"]:checked'
        );

        if (selecionado) {
            return selecionado.value.toLowerCase();
        }

        const ativo = document.querySelector(
            "[data-metodo].ativo, .metodo-pagamento.ativo"
        );

        return ativo
            ? (ativo.dataset.metodo || ativo.dataset.valor || ativo.textContent).toLowerCase()
            : "pix";
    }

    if ($("metodos")) {
        const opcoesMetodo = $("metodos").querySelectorAll(
            "[data-metodo], input[type='radio']"
        );

        opcoesMetodo.forEach(opcao => {
            opcao.addEventListener("change", function () {
                if (opcao.type === "radio") {
                    opcoesMetodo.forEach(item => {
                        if (item.type !== "radio") {
                            item.classList.remove("ativo");
                        }
                    });
                    return;
                }

                opcoesMetodo.forEach(item => item.classList.remove("ativo"));
                opcao.classList.add("ativo");
            });

            if (opcao.dataset.metodo) {
                opcao.addEventListener("click", function () {
                    opcoesMetodo.forEach(item => item.classList.remove("ativo"));
                    opcao.classList.add("ativo");
                });
            }
        });
    }

    if ($("btnDoar")) {
        $("btnDoar").addEventListener("click", function () {
            let valor = valorSelecionado;

            if ($("valorCustom")) {
                const valorDigitado = Number(
                    $("valorCustom").value.replace(",", ".")
                );

                if (valorDigitado > 0) {
                    valor = valorDigitado;
                }
            }

            if (!Number.isFinite(valor) || valor <= 0) {
                if ($("retorno")) {
                    $("retorno").textContent = "Escolha ou informe um valor válido para contribuir.";
                } else {
                    alert("Escolha ou informe um valor válido para contribuir.");
                }
                return;
            }

            if (!usuario) {
                const voltar = encodeURIComponent(
                    `projeto.html?id=${id}`
                );

                window.location.href = `login.html?voltar=${voltar}`;
                return;
            }

            const metodo = obterMetodoPagamento();
            let paginaPagamento = "pagamentoPix.html";

            if (
                metodo.includes("cart") ||
                metodo.includes("crédito") ||
                metodo.includes("credito")
            ) {
                paginaPagamento = "pagamentoCartao.html";
            } else if (metodo.includes("boleto")) {
                paginaPagamento = "pagamentoBoleto.html";
            } else if (
                metodo.includes("pix") ||
                metodo === ""
            ) {
                paginaPagamento = "pagamentoPix.html";
            }

            const destino = new URL(paginaPagamento, window.location.href);
            destino.searchParams.set("id", String(id));
            destino.searchParams.set("valor", valor.toFixed(2));

            window.location.href = destino.href;
        });
    }
});