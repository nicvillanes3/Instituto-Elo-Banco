
document.addEventListener("DOMContentLoaded", () => {
    const formulario = document.getElementById("formEsqueciSenha");
    const campoEmail = document.getElementById("email");
    const botaoEnviar = document.getElementById("botaoEnviar");
    const mensagem = document.getElementById("mensagemSenha");

    if (!formulario) return;

    formulario.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = campoEmail.value.trim();

        mensagem.textContent = "";
        mensagem.className = "";

        if (!email) {
            mensagem.textContent = "Digite seu e-mail.";
            mensagem.classList.add("erro");
            return;
        }

        botaoEnviar.disabled = true;
        botaoEnviar.textContent = "Enviando...";

        try {
            const resposta = await fetch("solicitar_recuperacao.php", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email })
            });

            const dados = await resposta.json();

            mensagem.textContent = dados.mensagem;

            if (resposta.ok) {
                mensagem.classList.add("sucesso");
                formulario.reset();
            } else {
                mensagem.classList.add("erro");
            }

        } catch (erro) {
            mensagem.textContent = "Não foi possível conectar ao servidor. Tente novamente.";
            mensagem.classList.add("erro");
        } finally {
            botaoEnviar.disabled = false;
            botaoEnviar.textContent = "Enviar link de recuperação";
        }
    });
});
