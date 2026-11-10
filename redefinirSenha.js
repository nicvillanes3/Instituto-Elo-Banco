
document.addEventListener("DOMContentLoaded", function () {

    const formulario = document.getElementById("formRedefinirSenha");
    const novaSenha = document.getElementById("novaSenha");
    const confirmarSenha = document.getElementById("confirmarSenha");
    const mensagem = document.getElementById("mensagem");
    const botao = document.getElementById("botaoRedefinir");

    // Recupera o token que veio no link do e-mail.
    const parametros = new URLSearchParams(window.location.search);
    const token = parametros.get("token");

    function mostrarMensagem(texto, tipo) {
        mensagem.textContent = texto;
        mensagem.className = tipo;
    }

    if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
        formulario.style.display = "none";
        mostrarMensagem(
            "Link inválido. Solicite uma nova recuperação de senha.",
            "erro"
        );
        return;
    }

    formulario.addEventListener("submit", async function (event) {

        event.preventDefault();

        const senha = novaSenha.value;
        const confirmacao = confirmarSenha.value;

        if (senha.length < 8) {
            mostrarMensagem(
                "Sua senha precisa ter pelo menos 8 caracteres.",
                "erro"
            );
            return;
        }

        if (senha !== confirmacao) {
            mostrarMensagem(
                "As senhas não coincidem. Confira os campos.",
                "erro"
            );
            return;
        }

        botao.disabled = true;
        botao.textContent = "Salvando nova senha...";

        try {

            const resposta = await fetch("processar_redefinicao.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    token: token,
                    senha: senha,
                    confirmar_senha: confirmacao
                })
            });

            const dados = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    dados.mensagem || "Não foi possível redefinir sua senha."
                );
            }

            formulario.reset();
            formulario.style.display = "none";

            mostrarMensagem(
                dados.mensagem,
                "sucesso"
            );

            setTimeout(function () {
                window.location.href = "login.html";
            }, 3000);

        } catch (erro) {

            mostrarMensagem(
                erro.message || "Erro ao processar sua solicitação.",
                "erro"
            );

        } finally {

            botao.disabled = false;
            botao.textContent = "Redefinir minha senha";

        }

    });

});
