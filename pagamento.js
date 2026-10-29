
document.addEventListener("DOMContentLoaded", async function () {
    // ===== Elementos do resumo =====
    const campoProjeto = document.querySelector('[data-campo="projeto"]');
    const campoData = document.querySelector('[data-campo="data"]');
    const campoValor = document.querySelector('[data-campo="valor"]');

    // ===== Identifica a doação pela URL =====
    const parametros = new URLSearchParams(window.location.search);
    const doacaoId = parametros.get("doacao_id");

    // ===== Funções auxiliares =====
    function preencher(campo, valor) {
        if (campo) {
            campo.textContent = valor;
        }
    }

    function mostrarErro(mensagem) {
        preencher(campoProjeto, mensagem);
        preencher(campoData, "—");
        preencher(campoValor, "—");
    }

    function formatarValor(valor) {
        const numero = Number(valor);

        if (!Number.isFinite(numero)) {
            return "—";
        }

        return numero.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });
    }

    function formatarData(dataBanco) {
        if (!dataBanco) {
            return new Date().toLocaleDateString("pt-BR");
        }

        // Trata o formato de data do MySQL: YYYY-MM-DD HH:mm:ss
        const correspondencia = String(dataBanco).match(
            /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?$/
        );

        if (correspondencia) {
            return `${correspondencia[3]}/${correspondencia[2]}/${correspondencia[1]}`;
        }

        const data = new Date(dataBanco);

        if (Number.isNaN(data.getTime())) {
            return "—";
        }

        return data.toLocaleDateString("pt-BR");
    }

    // ===== Verifica se existe um ID na URL =====
    if (!doacaoId) {
        mostrarErro("Doação não identificada");
        console.error(
            "ID da doação ausente. Verifique se a URL contém ?doacao_id=..."
        );
        return;
    }

    try {
        // ===== Busca os dados no PHP =====
        const resposta = await fetch(
            "buscar_dados_doacao.php?doacao_id=" +
            encodeURIComponent(doacaoId),
            {
                method: "GET",
                credentials: "same-origin",
                headers: {
                    "Accept": "application/json"
                }
            }
        );

        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.sucesso) {
            throw new Error(
                resultado.mensagem ||
                "Não foi possível carregar os dados da doação."
            );
        }

        const doacao = resultado.doacao;

        if (!doacao) {
            throw new Error("Os dados da doação não foram encontrados.");
        }

        // ===== Confere a forma de pagamento da página =====
        const nomePagina = window.location.pathname
            .split("/")
            .pop()
            .toLowerCase();

        const metodosPorPagina = {
            "pagamentopix.html": "pix",
            "pagamentocartao.html": "cartao",
            "pagamentoboleto.html": "boleto"
        };

        const metodoEsperado = metodosPorPagina[nomePagina];

        if (
            metodoEsperado &&
            doacao.metodo_pagamento !== metodoEsperado
        ) {
            throw new Error(
                "A forma de pagamento desta doação não corresponde a esta página."
            );
        }

        // ===== Preenche o resumo da doação =====
        preencher(
            campoProjeto,
            doacao.projeto_titulo || "Projeto não informado"
        );

        preencher(
            campoData,
            formatarData(doacao.data_doacao)
        );

        preencher(
            campoValor,
            formatarValor(doacao.valor)
        );

        console.log("Resumo da doação carregado:", doacao);

    } catch (erro) {
        console.error("Erro ao carregar a doação:", erro);

        mostrarErro(
            erro.message || "Erro ao carregar os dados da doação."
        );
    }
});
